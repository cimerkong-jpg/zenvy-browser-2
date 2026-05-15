import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type { TaskHistoryRecord } from '../../shared/types'

const MAX_HISTORY = 500

function uuidv4(): string {
  return randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

function getHistoryPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'zenvy-history.json')
}

function readHistory(): TaskHistoryRecord[] {
  const path = getHistoryPath()
  if (!existsSync(path)) return []
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeHistory(records: TaskHistoryRecord[]): void {
  writeFileSync(getHistoryPath(), JSON.stringify(records, null, 2), 'utf-8')
}

function recordMatchesScope(
  record: TaskHistoryRecord,
  workspaceId?: string | null,
  allowedProfileIds?: ReadonlySet<string>
): boolean {
  if (workspaceId && record.workspaceId !== workspaceId) return false
  if (allowedProfileIds && !allowedProfileIds.has(record.profileId)) return false
  return true
}

export function addHistoryRecord(record: Omit<TaskHistoryRecord, 'id'>): TaskHistoryRecord {
  const records = readHistory()
  const entry: TaskHistoryRecord = { ...record, id: uuidv4() }
  records.unshift(entry)
  if (records.length > MAX_HISTORY) records.splice(MAX_HISTORY)
  writeHistory(records)
  return entry
}

export function getHistory(workspaceId?: string | null, allowedProfileIds?: ReadonlySet<string>): TaskHistoryRecord[] {
  return readHistory().filter((record) => recordMatchesScope(record, workspaceId, allowedProfileIds))
}

export function deleteHistoryRecord(id: string, workspaceId?: string | null, allowedProfileIds?: ReadonlySet<string>): boolean {
  const records = readHistory()
  const next = records.filter((record) => !(record.id === id && recordMatchesScope(record, workspaceId, allowedProfileIds)))
  writeHistory(next)
  return next.length !== records.length
}

export function clearHistory(workspaceId?: string | null, allowedProfileIds?: ReadonlySet<string>): number {
  const records = readHistory()
  const next = records.filter((record) => !recordMatchesScope(record, workspaceId, allowedProfileIds))
  writeHistory(next)
  return records.length - next.length
}
