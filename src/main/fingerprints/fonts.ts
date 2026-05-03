export const WINDOWS_FONTS = [
  'Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia',
  'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact', 'Tahoma',
  'Calibri', 'Cambria', 'Consolas', 'Segoe UI', 'Palatino Linotype'
]

export const MACOS_FONTS = [
  'Helvetica', 'Times', 'Courier', 'Arial', 'Verdana', 'Georgia',
  'Helvetica Neue', 'Lucida Grande', 'Monaco', 'Menlo', 'San Francisco',
  'Apple Symbols', 'Avenir', 'Baskerville', 'Didot'
]

export const LINUX_FONTS = [
  'DejaVu Sans', 'Liberation Sans', 'Ubuntu', 'Noto Sans', 'FreeSans',
  'DejaVu Serif', 'Liberation Serif', 'Noto Serif', 'FreeSerif',
  'DejaVu Sans Mono', 'Liberation Mono', 'Ubuntu Mono'
]

export function getFontsByOS(os: 'Windows' | 'macOS' | 'Linux'): string[] {
  switch (os) {
    case 'Windows': return WINDOWS_FONTS
    case 'macOS': return MACOS_FONTS
    case 'Linux': return LINUX_FONTS
  }
}
