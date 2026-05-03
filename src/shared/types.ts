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
  name: string
  groupId: string | null
  notes: string
  status: ProfileStatus
  proxy: Proxy
  fingerprint: Fingerprint
  cookies: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface Group {
  id: string
  name: string
  createdAt: number
}

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: number
}

export interface ProfileExport {
  version: string
  exportDate: number
  profiles: Profile[]
}

export interface StoreSchema {
  profiles: Profile[]
  groups: Group[]
  tags: Tag[]
}

export type IpcResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
