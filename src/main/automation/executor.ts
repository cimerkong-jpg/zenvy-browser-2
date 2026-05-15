import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { existsSync, mkdirSync } from 'fs'
import puppeteer, { Browser, Page } from 'puppeteer-core'
import type { AutomationScript, ScriptExecution, ScriptLog, Profile } from '../../shared/types'
import { registerAutomationProfile, unregisterAutomationProfile } from '../browser'
import { addHistoryRecord } from './history'

function uuidv4(): string {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

function getChromePath(): string {
  switch (process.platform) {
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    default:
      return '/usr/bin/google-chrome'
  }
}

function notifyExecution(execution: ScriptExecution): void {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    windows[0].webContents.send('automation:execution-update', execution)
  }
}

const runningExecutions = new Map<string, boolean>()

export async function runScript(script: AutomationScript, profile: Profile): Promise<ScriptExecution> {
  const execution: ScriptExecution = {
    id: uuidv4(),
    scriptId: script.id,
    scriptName: script.name,
    profileId: profile.id,
    profileName: profile.name,
    status: 'running',
    startedAt: Date.now(),
    logs: []
  }

  runningExecutions.set(execution.id, true)
  notifyExecution(execution)

  let browser: Browser | null = null

  try {
    const userDataDir = join(app.getPath('userData'), 'profiles', profile.id)

    const args = [
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      `--user-agent=${profile.fingerprint.userAgent}`,
      `--lang=${profile.fingerprint.language}`,
      '--disable-dev-shm-usage'
    ]

    if (profile.proxy.type !== 'none' && profile.proxy.host) {
      const auth = profile.proxy.username
        ? `${profile.proxy.type}://${profile.proxy.username}:${profile.proxy.password}@${profile.proxy.host}:${profile.proxy.port}`
        : `${profile.proxy.type}://${profile.proxy.host}:${profile.proxy.port}`
      args.push(`--proxy-server=${auth}`)
    }

    browser = await puppeteer.launch({
      executablePath: getChromePath(),
      headless: false,
      args,
      defaultViewport: null
    })

    registerAutomationProfile(profile.id, browser)

    browser.on('disconnected', () => {
      unregisterAutomationProfile(profile.id)
    })

    const pages = await browser.pages()
    const page: Page = pages[0] ?? await browser.newPage()

    const logs: ScriptLog[] = []
    const makeLog = (level: ScriptLog['level']) => (...args: unknown[]) => {
      const message = args.map(String).join(' ')
      const entry: ScriptLog = { timestamp: Date.now(), level, message }
      logs.push(entry)
      execution.logs = [...logs]
      notifyExecution({ ...execution })
    }

    // ── RPA helpers ──────────────────────────────────────────────────────────
    const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
    const goto = (url: string) => page.goto(url, { waitUntil: 'domcontentloaded' })
    const click = (selector: string) => page.click(selector)
    const typeText = (selector: string, text: string) => page.type(selector, text)
    const waitFor = (selector: string, timeout = 10000) => page.waitForSelector(selector, { timeout })

    const scroll = (selector: string, direction: 'up' | 'down' = 'down', amount = 300) =>
      page.evaluate((sel, dir, amt) => {
        const el: any = sel === 'window' ? window : document.querySelector(sel)
        if (el) el.scrollBy(0, dir === 'down' ? amt : -amt)
      }, selector, direction, amount)

    const hover = (selector: string) => page.hover(selector)

    const selectOption = (selector: string, value: string) => page.select(selector, value)

    const screenshot = async (filename?: string): Promise<string> => {
      const dir = join(app.getPath('userData'), 'screenshots')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      const name = filename ?? `screenshot-${Date.now()}.png`
      const filePath = join(dir, name)
      await page.screenshot({ path: filePath })
      return filePath
    }

    const getAttribute = (selector: string, attr: string) =>
      page.$eval(selector, (el, a) => el.getAttribute(a), attr)

    const getText = (selector: string) =>
      page.$eval(selector, (el) => el.textContent ?? '')

    const exists = async (selector: string): Promise<boolean> =>
      !!(await page.$(selector))

    const waitForNavigation = (timeout = 10000) =>
      page.waitForNavigation({ timeout, waitUntil: 'domcontentloaded' })

    const keyboard = {
      press: (key: string) => page.keyboard.press(key as any),
      type: (text: string) => page.keyboard.type(text)
    }

    const evaluate = (fn: (...args: any[]) => any, ...fnArgs: any[]) =>
      page.evaluate(fn, ...fnArgs)

    // Profile variables available as `vars`
    const vars: Record<string, string> = profile.variables ?? {}

    // ── Build and run user function ──────────────────────────────────────────
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

    const fn = new AsyncFunction(
      'page',
      'log',
      'sleep',
      'goto',
      'click',
      'type',
      'waitFor',
      'console',
      'scroll',
      'hover',
      'select',
      'screenshot',
      'getAttribute',
      'getText',
      'exists',
      'waitForNavigation',
      'keyboard',
      'evaluate',
      'vars',
      script.code
    )

    await fn(
      page,
      makeLog('info'),
      sleep,
      goto,
      click,
      typeText,
      waitFor,
      { log: makeLog('info'), warn: makeLog('warn'), error: makeLog('error') },
      scroll,
      hover,
      selectOption,
      screenshot,
      getAttribute,
      getText,
      exists,
      waitForNavigation,
      keyboard,
      evaluate,
      vars
    )

    execution.status = 'success'
    execution.logs = [...logs]
    execution.finishedAt = Date.now()
  } catch (err) {
    execution.status = 'error'
    execution.error = String(err)
    execution.finishedAt = Date.now()
    execution.logs = [...(execution.logs ?? [])]
  } finally {
    runningExecutions.delete(execution.id)
    notifyExecution(execution)

    // Persist to history
    if (execution.finishedAt) {
      addHistoryRecord({
        workspaceId: script.workspaceId ?? profile.workspaceId ?? null,
        scriptId: execution.scriptId,
        scriptName: execution.scriptName,
        profileId: execution.profileId,
        profileName: execution.profileName,
        status: execution.status === 'success' ? 'success' : 'error',
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
        error: execution.error,
        logs: execution.logs
      })
    }
  }

  return execution
}

export function isRunning(executionId: string): boolean {
  return runningExecutions.has(executionId)
}
