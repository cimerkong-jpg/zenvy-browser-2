export const SCREEN_PRESETS = {
  '1920x1080': { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040 },
  '1366x768': { width: 1366, height: 768, availWidth: 1366, availHeight: 728 },
  '1440x900': { width: 1440, height: 900, availWidth: 1440, availHeight: 860 },
  '2560x1440': { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400 },
  '1536x864': { width: 1536, height: 864, availWidth: 1536, availHeight: 824 },
  '1280x720': { width: 1280, height: 720, availWidth: 1280, availHeight: 680 }
}

export type ScreenPreset = keyof typeof SCREEN_PRESETS
