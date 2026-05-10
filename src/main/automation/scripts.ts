import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type { AutomationScript } from '../../shared/types'

function uuidv4(): string {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

function getScriptsPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'zenvy-scripts.json')
}

function readScripts(): AutomationScript[] {
  const path = getScriptsPath()
  if (!existsSync(path)) return []
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeScripts(scripts: AutomationScript[]): void {
  writeFileSync(getScriptsPath(), JSON.stringify(scripts, null, 2), 'utf-8')
}

export function getScripts(workspaceId?: string | null): AutomationScript[] {
  const scripts = readScripts()
  return workspaceId ? scripts.filter((script) => script.workspaceId === workspaceId) : scripts
}

export function createScript(data: Pick<AutomationScript, 'name' | 'description' | 'code'>, workspaceId?: string | null): AutomationScript {
  const scripts = readScripts()
  const script: AutomationScript = {
    id: uuidv4(),
    workspaceId: workspaceId ?? null,
    name: data.name,
    description: data.description,
    code: data.code,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  scripts.unshift(script)
  writeScripts(scripts)
  return script
}

export function updateScript(id: string, data: Partial<Pick<AutomationScript, 'name' | 'description' | 'code'>>, workspaceId?: string | null): AutomationScript | null {
  const scripts = readScripts()
  const idx = scripts.findIndex((s) => s.id === id && (!workspaceId || s.workspaceId === workspaceId))
  if (idx === -1) return null
  scripts[idx] = { ...scripts[idx], ...data, updatedAt: Date.now() }
  writeScripts(scripts)
  return scripts[idx]
}

export function deleteScript(id: string, workspaceId?: string | null): void {
  const scripts = readScripts()
  writeScripts(scripts.filter((s) => !(s.id === id && (!workspaceId || s.workspaceId === workspaceId))))
}

export function getScript(id: string, workspaceId?: string | null): AutomationScript | null {
  return readScripts().find((s) => s.id === id && (!workspaceId || s.workspaceId === workspaceId)) ?? null
}
