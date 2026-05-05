interface Snippet {
  label: string
  code: string
  description: string
}

interface SnippetGroup {
  group: string
  items: Snippet[]
}

const SNIPPET_GROUPS: SnippetGroup[] = [
  {
    group: 'Navigation',
    items: [
      { label: 'goto', description: 'Mở URL', code: "await goto('https://example.com')" },
      { label: 'waitForNav', description: 'Chờ trang load', code: 'await waitForNavigation(10000)' },
      { label: 'reload', description: 'Tải lại trang', code: "await evaluate(() => window.location.reload())" }
    ]
  },
  {
    group: 'Interaction',
    items: [
      { label: 'click', description: 'Click element', code: "await click('#submit-btn')" },
      { label: 'type', description: 'Nhập text', code: "await type('#email', 'user@example.com')" },
      { label: 'hover', description: 'Di chuột vào', code: "await hover('.menu-item')" },
      { label: 'select', description: 'Chọn dropdown', code: "await select('#country', 'VN')" },
      { label: 'scroll', description: 'Cuộn trang', code: "await scroll('window', 'down', 500)" }
    ]
  },
  {
    group: 'Keyboard',
    items: [
      { label: 'Enter', description: 'Nhấn Enter', code: "await keyboard.press('Enter')" },
      { label: 'Tab', description: 'Nhấn Tab', code: "await keyboard.press('Tab')" },
      { label: 'Escape', description: 'Nhấn Escape', code: "await keyboard.press('Escape')" },
      { label: 'typeKeys', description: 'Gõ chuỗi ký tự', code: "await keyboard.type('Hello world')" }
    ]
  },
  {
    group: 'Wait',
    items: [
      { label: 'waitFor', description: 'Chờ element xuất hiện', code: "await waitFor('.element', 10000)" },
      { label: 'sleep', description: 'Dừng N giây', code: 'await sleep(2000)' },
      { label: 'exists', description: 'Kiểm tra element tồn tại', code: "const ok = await exists('.btn')\nif (!ok) log('Không tìm thấy')" }
    ]
  },
  {
    group: 'Extract',
    items: [
      { label: 'getText', description: 'Lấy text element', code: "const text = await getText('h1')\nlog(text)" },
      { label: 'getAttribute', description: 'Lấy attribute', code: "const href = await getAttribute('a', 'href')\nlog(href)" },
      { label: 'evaluate', description: 'Chạy JS trong browser', code: "const title = await evaluate(() => document.title)\nlog(title)" }
    ]
  },
  {
    group: 'Screenshot & Vars',
    items: [
      { label: 'screenshot', description: 'Chụp ảnh màn hình', code: "const path = await screenshot('result.png')\nlog('Đã lưu:', path)" },
      { label: 'useVar', description: 'Dùng biến profile', code: "await type('#user', vars.username)\nawait type('#pass', vars.password)" },
      { label: 'logInfo', description: 'Ghi log', code: "log('Bước 1 xong!')" }
    ]
  }
]

interface Props {
  onInsert: (code: string) => void
}

export default function SnippetPanel({ onInsert }: Props) {
  return (
    <div className="rounded-xl border border-purple-500/15 bg-white/[0.02] overflow-hidden">
      <div className="px-3 py-2 border-b border-purple-500/10">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Snippets — click để chèn
        </h4>
      </div>
      <div className="max-h-52 overflow-y-auto p-2 space-y-3">
        {SNIPPET_GROUPS.map((group) => (
          <div key={group.group}>
            <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-purple-400/60">
              {group.group}
            </p>
            <div className="flex flex-wrap gap-1">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => onInsert(item.code)}
                  title={item.description}
                  className="rounded-md border border-purple-500/15 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-300 hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-white transition-all"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
