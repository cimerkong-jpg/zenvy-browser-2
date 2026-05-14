export type ProfileStatus = 'open' | 'closed'

export type ProxyType = 'none' | 'http' | 'socks5'

export interface Proxy {
  type: ProxyType
  host: string
  port: string
  username: string
  password: string
}

export interface Fingerprint {
  os: 'Windows' | 'macOS' | 'Linux'
  userAgent: string
  timezone: string
  language: string
  screenWidth: number
  screenHeight: number
  hardwareConcurrency: number
  deviceMemory: number
  webRTC: 'disabled' | 'real'
  canvas: 'noise' | 'real'
  webGL: 'noise' | 'real'
  deviceName: string
  macAddress: string
  fonts?: string[]
  audioContext?: {
    sampleRate: 44100 | 48000
    channelCount: 1 | 2
    maxChannelCount: 2 | 6 | 8
  }
  screen?: {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: 24 | 32
    pixelDepth: 24 | 32
  }
  geolocation?: {
    latitude: number
    longitude: number
    accuracy: number
  }
  battery?: {
    charging: boolean
    level: number
    chargingTime: number
    dischargingTime: number
  }
}

export interface Profile {
  id: string
  displayId?: string
  workspaceId?: string | null
  name: string
  groupId: string | null
  notes: string
  status: ProfileStatus
  proxy: Proxy
  fingerprint: Fingerprint
  cookies: string
  variables?: Record<string, string>
  createdAt: number
  updatedAt: number
}

export interface Group {
  id: string
  workspaceId?: string | null
  name: string
  createdAt: number
}


export interface ProfileExport {
  version: string
  exportDate: number
  profiles: Profile[]
}

export type ScriptStatus = 'idle' | 'running' | 'success' | 'error'

export interface AutomationScript {
  id: string
  workspaceId?: string | null
  name: string
  description: string
  code: string
  createdAt: number
  updatedAt: number
}

export interface ScriptLog {
  timestamp: number
  level: 'info' | 'warn' | 'error'
  message: string
}

export interface ScriptExecution {
  id: string
  scriptId: string
  scriptName: string
  profileId: string
  profileName: string
  status: ScriptStatus
  startedAt: number
  finishedAt?: number
  logs: ScriptLog[]
  error?: string
}

export interface StoreSchema {
  profiles: Profile[]
  groups: Group[]
  scripts: AutomationScript[]
  nextProfileDisplayId?: number
}

export type ScheduleType = 'once' | 'interval'

export interface ScheduledTask {
  id: string
  workspaceId?: string | null
  scriptId: string
  scriptName: string
  profileIds: string[]
  type: ScheduleType
  runAt?: number
  intervalMs?: number
  nextRunAt?: number
  lastRunAt?: number
  enabled: boolean
  createdAt: number
}

export interface TaskHistoryRecord {
  id: string
  scriptId: string
  scriptName: string
  profileId: string
  profileName: string
  status: 'success' | 'error'
  startedAt: number
  finishedAt: number
  error?: string
  logs: ScriptLog[]
}

export type IpcResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface UserProfile {
  displayName: string
  email: string
  avatarColor: string
  plan: string
  activatedAt: number
}

export interface UserStats {
  profileCount: number
  scriptCount: number
  historyCount: number
  activeSchedulerCount: number
  totalRuns: number
}

export interface AppSettings {
  chromePath: string
  autoCloseOnExit: boolean
  chromeRetries: number
}

export interface ExtensionInfo {
  id: string
  name: string
  version: string
  description: string
  enabled: boolean
}
