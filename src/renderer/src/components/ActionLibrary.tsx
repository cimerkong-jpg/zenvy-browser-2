import { useState } from 'react'

interface ActionItem {
  label: string
  desc: string
  code: string
  icon: string
}

interface ActionGroup {
  id: string
  label: string
  items: ActionItem[]
}

const GROUPS: ActionGroup[] = [
  {
    id: 'general',
    label: 'Chung',
    items: [
      { icon: '💤', label: 'Đợi', desc: 'Dừng N mili-giây', code: 'await sleep(2000)' },
      { icon: '⏱', label: 'Lấy thời gian', desc: 'Lấy thời gian hiện tại', code: "const now = new Date().toLocaleString('vi-VN')\nlog('Thời gian:', now)" },
      { icon: '📝', label: 'Log', desc: 'Ghi thông tin ra console', code: "log('Thông báo...')" },
      { icon: '⚠', label: 'Log cảnh báo', desc: 'Ghi cảnh báo', code: "console.warn('Cảnh báo...')" },
      { icon: '❌', label: 'Log lỗi', desc: 'Ghi lỗi', code: "console.error('Lỗi...')" },
      { icon: '$', label: 'Dùng biến', desc: 'Đọc biến từ profile', code: "const username = vars.username\nconst password = vars.password\nlog('User:', username)" },
      { icon: '</>', label: 'Code tùy chọn', desc: 'Chạy JS bất kỳ', code: "const result = await evaluate(() => {\n  return document.title\n})\nlog(result)" },
      { icon: '🔁', label: 'Lặp lại', desc: 'Vòng lặp N lần', code: "for (let i = 0; i < 5; i++) {\n  log('Lần', i + 1)\n  await sleep(1000)\n}" },
    ]
  },
  {
    id: 'browser',
    label: 'Trình duyệt',
    items: [
      { icon: '🌐', label: 'Mở URL', desc: 'Điều hướng tới địa chỉ', code: "await goto('https://example.com')" },
      { icon: '⌛', label: 'Chờ trang load', desc: 'Chờ navigation hoàn tất', code: 'await waitForNavigation(10000)' },
      { icon: '←', label: 'Quay lại', desc: 'Back trong lịch sử', code: "await evaluate(() => window.history.back())\nawait waitForNavigation(5000)" },
      { icon: '→', label: 'Tiến lên', desc: 'Forward trong lịch sử', code: "await evaluate(() => window.history.forward())\nawait waitForNavigation(5000)" },
      { icon: '↻', label: 'Tải lại trang', desc: 'Reload trang hiện tại', code: "await evaluate(() => location.reload())\nawait waitForNavigation(8000)" },
      { icon: '📸', label: 'Chụp màn hình', desc: 'Lưu screenshot thành file', code: "const path = await screenshot('capture.png')\nlog('Đã lưu:', path)" },
      { icon: '📋', label: 'Lấy URL hiện tại', desc: 'Đọc URL đang mở', code: "const url = await evaluate(() => location.href)\nlog('URL:', url)" },
      { icon: '📄', label: 'Lấy tiêu đề trang', desc: 'Đọc document.title', code: "const title = await evaluate(() => document.title)\nlog('Title:', title)" },
    ]
  },
  {
    id: 'interact',
    label: 'Tương tác',
    items: [
      { icon: '👆', label: 'Click', desc: 'Click vào element', code: "await click('#selector')" },
      { icon: '⌨', label: 'Gõ text', desc: 'Nhập văn bản vào input', code: "await type('#input', 'nội dung')" },
      { icon: '🖱', label: 'Di chuột', desc: 'Hover vào element', code: "await hover('#element')" },
      { icon: '🔽', label: 'Chọn dropdown', desc: 'Select option theo value', code: "await select('#dropdown', 'value')" },
      { icon: '↕', label: 'Cuộn xuống', desc: 'Scroll trang/element', code: "await scroll('window', 'down', 500)" },
      { icon: '↑', label: 'Cuộn lên', desc: 'Scroll ngược lên', code: "await scroll('window', 'up', 500)" },
    ]
  },
  {
    id: 'keyboard',
    label: 'Bàn phím',
    items: [
      { icon: '↵', label: 'Nhấn Enter', desc: 'Gửi form / xác nhận', code: "await keyboard.press('Enter')" },
      { icon: '⇥', label: 'Nhấn Tab', desc: 'Chuyển focus', code: "await keyboard.press('Tab')" },
      { icon: '⎋', label: 'Nhấn Escape', desc: 'Đóng popup / hủy', code: "await keyboard.press('Escape')" },
      { icon: '🔼', label: 'Mũi tên lên', desc: 'ArrowUp', code: "await keyboard.press('ArrowUp')" },
      { icon: '🔽', label: 'Mũi tên xuống', desc: 'ArrowDown', code: "await keyboard.press('ArrowDown')" },
      { icon: '✏', label: 'Gõ chuỗi ký tự', desc: 'Type text không qua input', code: "await keyboard.type('Hello World')" },
    ]
  },
  {
    id: 'wait',
    label: 'Chờ đợi',
    items: [
      { icon: '👁', label: 'Chờ element', desc: 'Chờ selector xuất hiện', code: "await waitFor('.selector', 10000)" },
      { icon: '❓', label: 'Kiểm tra tồn tại', desc: 'Element có hay không', code: "const found = await exists('.selector')\nif (found) {\n  log('Tìm thấy!')\n} else {\n  log('Không tìm thấy')\n}" },
    ]
  },
  {
    id: 'extract',
    label: 'Trích xuất',
    items: [
      { icon: 'T', label: 'Lấy text', desc: 'innerHTML / textContent', code: "const text = await getText('h1')\nlog('Text:', text)" },
      { icon: '@', label: 'Lấy attribute', desc: 'Đọc attribute DOM', code: "const href = await getAttribute('a.link', 'href')\nlog('Href:', href)" },
      { icon: '📊', label: 'Lấy nhiều phần tử', desc: 'querySelectorAll rồi map', code: "const items = await evaluate(() =>\n  [...document.querySelectorAll('li')].map(el => el.textContent)\n)\nlog(JSON.stringify(items))" },
    ]
  }
]

interface Props {
  onInsert: (code: string) => void
}

export default function ActionLibrary({ onInsert }: Props) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))

  const q = search.trim().toLowerCase()
  const filtered = q
    ? GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)) })).filter((g) => g.items.length > 0)
    : GROUPS

  return (
    <div className="flex h-full flex-col bg-[#0A0817]">
      {/* Search */}
      <div className="shrink-0 border-b border-white/[0.06] p-3">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.06]"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((group) => (
          <div key={group.id}>
            {/* Section header */}
            <button
              onClick={() => toggle(group.id)}
              className="flex w-full items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-[11px] font-semibold text-slate-400">{group.label}</span>
              <svg
                className={`w-3 h-3 text-slate-600 transition-transform ${collapsed[group.id] ? '-rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Items */}
            {!collapsed[group.id] && (
              <div className="pb-1">
                {group.items.map((item) => {
                  const key = `${group.id}-${item.label}`
                  return (
                    <button
                      key={key}
                      onClick={() => onInsert(item.code)}
                      onMouseEnter={() => setHoveredItem(key)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.05] group"
                    >
                      {/* Icon box */}
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04] text-[12px] text-slate-400 group-hover:border-purple-500/30 group-hover:bg-purple-500/10 group-hover:text-purple-300 transition-all">
                        {item.icon}
                      </div>
                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors truncate">{item.label}</p>
                        {hoveredItem === key && (
                          <p className="text-[10px] text-slate-600 truncate">{item.desc}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-slate-700">Không tìm thấy action</p>
        )}
      </div>

      {/* Footer hint */}
      <div className="shrink-0 border-t border-white/[0.05] px-3 py-2">
        <p className="text-[10px] text-slate-700">Click để chèn vào vị trí cursor</p>
      </div>
    </div>
  )
}
