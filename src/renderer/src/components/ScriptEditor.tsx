import Editor, { OnMount } from '@monaco-editor/react'
import { useTheme } from '../store/useTheme'
import type * as Monaco from 'monaco-editor'

interface Props {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  height?: string
  onEditorMount?: (insertFn: (code: string) => void) => void
}

const SCRIPT_DOCS = `// API có thể dùng trong script:
// goto(url)                     - Điều hướng tới URL
// click(selector)               - Click element
// type(selector, text)          - Gõ văn bản
// waitFor(selector, timeout?)   - Chờ element
// sleep(ms)                     - Dừng n ms
// scroll(selector, dir, amount) - Cuộn trang
// hover(selector)               - Di chuột
// select(selector, value)       - Chọn dropdown
// screenshot(filename?)         - Chụp ảnh
// getAttribute(selector, attr)  - Lấy attribute
// getText(selector)             - Lấy text
// exists(selector)              - Kiểm tra tồn tại
// waitForNavigation(timeout?)   - Chờ trang load
// keyboard.press(key)           - Nhấn phím
// evaluate(fn, ...args)         - Chạy JS trong browser
// vars                          - Biến của profile
// log('message')                - Ghi log info
// console.warn/error            - Ghi log level khác
`

export default function ScriptEditor({ value, onChange, readOnly = false, height = '400px', onEditorMount }: Props) {
  const { resolvedTheme } = useTheme()

  const handleMount: OnMount = (editor) => {
    if (!onEditorMount) return

    const insertFn = (code: string) => {
      const selection = editor.getSelection()
      const model = editor.getModel()
      if (!model || !selection) return

      const op: Monaco.editor.IIdentifiedSingleEditOperation = {
        range: {
          startLineNumber: selection.endLineNumber,
          startColumn: selection.endColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn
        },
        text: '\n' + code
      }
      editor.executeEdits('snippet', [op])
      editor.focus()
    }

    onEditorMount(insertFn)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-purple-500/15" style={{ height }}>
      <Editor
        height={height}
        defaultLanguage="javascript"
        value={value || SCRIPT_DOCS}
        onChange={(v) => onChange(v ?? '')}
        theme={resolvedTheme === 'light' ? 'light' : 'vs-dark'}
        onMount={handleMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 20,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          padding: { top: 12, bottom: 12 },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          renderLineHighlight: 'line',
          smoothScrolling: true
        }}
        loading={
          <div className="flex h-full items-center justify-center bg-[#1E1E1E] text-slate-500 text-sm">
            Đang tải editor...
          </div>
        }
      />
    </div>
  )
}
