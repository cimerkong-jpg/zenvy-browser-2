/// <reference types="vite/client" />

import type { ZenvyAPI } from '../../preload/index'

declare global {
  interface Window {
    api: ZenvyAPI
  }
}
