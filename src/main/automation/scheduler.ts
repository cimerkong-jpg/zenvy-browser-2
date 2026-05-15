import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type { ScheduledTask, Profile } from '../../shared/types'
import { getScript } from './scripts'
import { runScript } from './executor'
import { addHistoryRecord } from './history'

function uuidv4(): string {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

function getSchedulerPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'zenvy-scheduler.json')
}

function readTasks(): ScheduledTask[] {
  const path = getSchedulerPath()
  if (!existsSync(path)) return []
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeTasks(tasks: ScheduledTask[]): void {
  writeFileSync(getSchedulerPath(), JSON.stringify(tasks, null, 2), 'utf-8')
}

// In-memory timers: taskId → timeout/interval handle
const timers = new Map<string, NodeJS.Timeout>()

// Callback to get all profiles from db (injected at startup)
type SchedulerRuntime = {
  getProfiles: (workspaceId: string) => Profile[]
  authorizeProfileRun: (workspaceId: string, profile: Profile) => Promise<void>
}

let runtime: SchedulerRuntime | null = null

async function executeTask(task: ScheduledTask): Promise<void> {
  if (!runtime) return
  if (!task.workspaceId) {
    console.warn('[Scheduler] Skipping task without workspaceId:', task.id)
    return
  }

  const script = getScript(task.scriptId, task.workspaceId)
  if (!script) return
  const allProfiles = runtime.getProfiles(task.workspaceId)
  const profiles = task.profileIds
    .map((id) => allProfiles.find((p) => p.id === id))
    .filter((p): p is Profile => !!p)

  for (const profile of profiles) {
    try {
      await runtime.authorizeProfileRun(task.workspaceId, profile)
    } catch {
      addHistoryRecord({
        workspaceId: task.workspaceId,
        scriptId: task.scriptId,
        scriptName: task.scriptName,
        profileId: profile.id,
        profileName: profile.name,
        status: 'error',
        startedAt: Date.now(),
        finishedAt: Date.now(),
        error: 'Permission denied: scheduled task profile authorization',
        logs: []
      })
      continue
    }
    runScript(script, profile).catch(() => {})
  }

  // Update lastRunAt and nextRunAt
  const tasks = readTasks()
  const idx = tasks.findIndex((t) => t.id === task.id)
  if (idx !== -1) {
    tasks[idx].lastRunAt = Date.now()
    if (task.type === 'interval' && task.intervalMs) {
      tasks[idx].nextRunAt = Date.now() + task.intervalMs
    } else if (task.type === 'once') {
      tasks[idx].enabled = false
      tasks[idx].nextRunAt = undefined
    }
    writeTasks(tasks)
  }
}

function scheduleTask(task: ScheduledTask): void {
  clearTaskTimer(task.id)
  if (!task.enabled) return

  if (task.type === 'once' && task.runAt) {
    const delay = task.runAt - Date.now()
    if (delay <= 0) return
    const handle = setTimeout(() => {
      executeTask(task).catch((error) => console.warn('[Scheduler] Task execution failed:', error))
      timers.delete(task.id)
    }, delay)
    timers.set(task.id, handle)
  } else if (task.type === 'interval' && task.intervalMs && task.intervalMs > 0) {
    const firstDelay = task.nextRunAt ? Math.max(0, task.nextRunAt - Date.now()) : task.intervalMs
    const handle = setTimeout(() => {
      executeTask(task).catch((error) => console.warn('[Scheduler] Task execution failed:', error))
      const interval = setInterval(() => {
        const current = readTasks().find((t) => t.id === task.id)
        if (!current || !current.enabled) {
          clearInterval(interval)
          timers.delete(task.id)
          return
        }
        executeTask(current).catch((error) => console.warn('[Scheduler] Task execution failed:', error))
      }, task.intervalMs)
      timers.set(task.id, interval)
    }, firstDelay)
    timers.set(task.id, handle)
  }
}

function clearTaskTimer(taskId: string): void {
  const handle = timers.get(taskId)
  if (handle !== undefined) {
    clearTimeout(handle)
    clearInterval(handle)
    timers.delete(taskId)
  }
}

export function startScheduler(nextRuntime: SchedulerRuntime): void {
  runtime = nextRuntime
  const tasks = readTasks()
  for (const task of tasks) {
    if (task.enabled) scheduleTask(task)
  }
}

export function stopScheduler(): void {
  for (const [id] of timers) clearTaskTimer(id)
  runtime = null
}

export function getScheduledTasks(workspaceId?: string | null): ScheduledTask[] {
  const tasks = readTasks()
  return workspaceId ? tasks.filter((task) => task.workspaceId === workspaceId) : tasks
}

export function createScheduledTask(
  data: Pick<ScheduledTask, 'scriptId' | 'scriptName' | 'profileIds' | 'type' | 'runAt' | 'intervalMs'>,
  workspaceId?: string | null
): ScheduledTask {
  const tasks = readTasks()
  const task: ScheduledTask = {
    id: uuidv4(),
    workspaceId: workspaceId ?? null,
    scriptId: data.scriptId,
    scriptName: data.scriptName,
    profileIds: data.profileIds,
    type: data.type,
    runAt: data.runAt,
    intervalMs: data.intervalMs,
    nextRunAt: data.type === 'interval' && data.intervalMs
      ? Date.now() + data.intervalMs
      : data.runAt,
    enabled: true,
    createdAt: Date.now()
  }
  tasks.unshift(task)
  writeTasks(tasks)
  scheduleTask(task)
  return task
}

export function updateScheduledTask(
  id: string,
  data: Partial<Pick<ScheduledTask, 'scriptId' | 'scriptName' | 'profileIds' | 'type' | 'runAt' | 'intervalMs' | 'enabled'>>,
  workspaceId?: string | null
): ScheduledTask | null {
  const tasks = readTasks()
  const idx = tasks.findIndex((t) => t.id === id && (!workspaceId || t.workspaceId === workspaceId))
  if (idx === -1) return null
  tasks[idx] = {
    ...tasks[idx],
    ...data,
    nextRunAt: data.type === 'interval' && data.intervalMs
      ? Date.now() + data.intervalMs
      : data.runAt ?? tasks[idx].nextRunAt
  }
  writeTasks(tasks)
  scheduleTask(tasks[idx])
  return tasks[idx]
}

export function toggleScheduledTask(id: string, enabled: boolean, workspaceId?: string | null): ScheduledTask | null {
  return updateScheduledTask(id, { enabled }, workspaceId)
}

export function deleteScheduledTask(id: string, workspaceId?: string | null): ScheduledTask | null {
  const task = readTasks().find((t) => t.id === id && (!workspaceId || t.workspaceId === workspaceId)) ?? null
  if (!task) return null
  clearTaskTimer(id)
  writeTasks(readTasks().filter((t) => !(t.id === id && (!workspaceId || t.workspaceId === workspaceId))))
  return task
}
