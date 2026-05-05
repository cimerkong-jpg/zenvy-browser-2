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

export function addHistoryRecord(record: Omit<TaskHistoryRecord, 'id'>): TaskHistoryRecord {
  const records = readHistory()
  const entry: TaskHistoryRecord = { ...record, id: uuidv4() }
  records.unshift(entry)
  if (records.length > MAX_HISTORY) records.splice(MAX_HISTORY)
  writeHistory(records)
  return entry
}

export function getHistory(): TaskHistoryRecord[] {
  return readHistory()
}

export function deleteHistoryRecord(id: string): void {
  writeHistory(readHistory().filter((r) => r.id !== id))
}

export function clearHistory(): void {
  writeHistory([])
}
