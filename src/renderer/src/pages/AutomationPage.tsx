import { useEffect, useState, useCallback, useRef } from 'react'
import type { AutomationScript, ScriptExecution, ScheduledTask, TaskHistoryRecord, Profile } from '../../../../shared/types'
import type { AutoSub } from '../App'
import { useStore } from '../store/useStore'
import { toast, dialog } from '../store/useToast'
import ScriptEditor from '../components/ScriptEditor'
import ActionLibrary from '../components/ActionLibrary'
import EditorEmptyState from '../components/EditorEmptyState'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import Select from '../components/ui/Select'

// ── Templates ─────────────────────────────────────────────────────────────────

interface ScriptTemplate {
  name: string
  icon: string
  group: string
  description: string
  code: string
}

const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  // ── Facebook ──
  {
    name: 'FB - Đăng nhập',
    icon: '🔐',
    group: 'facebook',
    description: 'Đăng nhập tài khoản Facebook tự động bằng biến profile',
    code: `await goto('https://www.facebook.com/')
await waitFor('#email', 8000)
await type('#email', vars.username || 'email@example.com')
await sleep(500)
await type('#pass', vars.password || 'password123')
await click('[name="login"]')
await waitForNavigation(12000)
log('Đăng nhập Facebook xong!')`,
  },
  {
    name: 'FB - Cuộn feed & Like',
    icon: '👍',
    group: 'facebook',
    description: 'Cuộn newsfeed và like bài viết ngẫu nhiên',
    code: `await goto('https://www.facebook.com/')
await waitFor('[role="feed"]', 8000)
for (let i = 0; i < 15; i++) {
  await scroll('window', 'down', 600)
  await sleep(2000 + Math.floor(Math.random() * 1500))
  const canLike = await exists('[aria-label="Like"][aria-pressed="false"]')
  if (canLike && Math.random() > 0.6) {
    await click('[aria-label="Like"][aria-pressed="false"]')
    log('Đã like bài viết lần', i + 1)
    await sleep(800)
  }
}
log('Hoàn thành cuộn feed!')`,
  },
  {
    name: 'FB - Đăng bài viết',
    icon: '✍️',
    group: 'facebook',
    description: 'Đăng status lên tường Facebook từ biến postContent',
    code: `await goto('https://www.facebook.com/')
await sleep(3000)
// Mở hộp đăng bài
const composer = await exists('[role="button"][aria-label*="Bạn đang nghĩ"]')
if (composer) {
  await click('[role="button"][aria-label*="Bạn đang nghĩ"]')
} else {
  await click('[placeholder*="nghĩ gì"]')
}
await sleep(1500)
await keyboard.type(vars.postContent || 'Nội dung bài đăng tự động...')
await sleep(1000)
const postBtn = await exists('[aria-label="Đăng"]')
if (postBtn) await click('[aria-label="Đăng"]')
log('Đã đăng bài lên Facebook!')`,
  },
  {
    name: 'FB - Gửi kết bạn',
    icon: '👥',
    group: 'facebook',
    description: 'Gửi lời mời kết bạn tới profile từ vars.targetUid',
    code: `const uid = vars.targetUid || 'zuck'
await goto(\`https://www.facebook.com/\${uid}\`)
await sleep(3000)
const addBtn = await exists('[aria-label="Thêm bạn bè"]')
if (addBtn) {
  await click('[aria-label="Thêm bạn bè"]')
  await sleep(1000)
  log('Đã gửi lời mời kết bạn tới', uid)
} else {
  log('Không tìm thấy nút kết bạn — có thể đã kết bạn rồi')
}`,
  },
  {
    name: 'FB - Tham gia nhóm',
    icon: '🏘️',
    group: 'facebook',
    description: 'Tìm và tham gia nhóm theo từ khóa vars.groupKeyword',
    code: `const kw = encodeURIComponent(vars.groupKeyword || 'marketing việt nam')
await goto(\`https://www.facebook.com/groups/search/?q=\${kw}\`)
await sleep(4000)
const joinBtn = await exists('[aria-label*="Tham gia nhóm"]')
if (joinBtn) {
  await click('[aria-label*="Tham gia nhóm"]')
  log('Đã gửi yêu cầu tham gia nhóm!')
} else {
  log('Không tìm thấy nút tham gia — thử lại với từ khóa khác')
}`,
  },
  {
    name: 'FB - Nhắn tin',
    icon: '💬',
    group: 'facebook',
    description: 'Gửi tin nhắn Facebook Messenger tới vars.targetUid',
    code: `const uid = vars.targetUid || ''
if (!uid) { log('Thiếu vars.targetUid'); }
await goto(\`https://www.facebook.com/messages/t/\${uid}\`)
await waitFor('[role="textbox"]', 10000)
await click('[role="textbox"]')
await sleep(500)
await keyboard.type(vars.messageContent || 'Xin chào! Tôi có thể giúp gì cho bạn?')
await sleep(300)
await keyboard.press('Enter')
log('Đã gửi tin nhắn!')`,
  },

  // ── Gmail ──
  {
    name: 'Gmail - Đăng nhập',
    icon: '📧',
    group: 'gmail',
    description: 'Đăng nhập tài khoản Google/Gmail tự động',
    code: `await goto('https://accounts.google.com/signin/v2/identifier')
await waitFor('#identifierId', 8000)
await type('#identifierId', vars.username || 'email@gmail.com')
await click('#identifierNext')
await waitFor('[name="Passwd"]', 8000)
await sleep(500)
await type('[name="Passwd"]', vars.password || 'password')
await click('#passwordNext')
await waitForNavigation(12000)
log('Đăng nhập Google xong!')`,
  },
  {
    name: 'Gmail - Soạn & gửi email',
    icon: '📤',
    group: 'gmail',
    description: 'Soạn và gửi email tới vars.recipient',
    code: `await goto('https://mail.google.com/mail/u/0/#inbox')
await waitFor('[gh="cm"]', 10000)
await click('[gh="cm"]')
await waitFor('[name="to"]', 5000)
await type('[name="to"]', vars.recipient || 'recipient@gmail.com')
await keyboard.press('Tab')
await type('[name="subjectbox"]', vars.subject || 'Tiêu đề email tự động')
await sleep(500)
// Click vào body
const body = await exists('[role="textbox"][g_editable="true"]')
if (body) await click('[role="textbox"][g_editable="true"]')
await keyboard.type(vars.emailBody || 'Nội dung email được gửi tự động.')
await sleep(500)
// Gửi
await click('[data-tooltip*="Gửi"], [aria-label*="Send"]')
log('Đã gửi email tới', vars.recipient)`,
  },
  {
    name: 'Gmail - Tìm kiếm email',
    icon: '🔍',
    group: 'gmail',
    description: 'Tìm email theo từ khóa và đếm kết quả',
    code: `await goto('https://mail.google.com/mail/u/0/#inbox')
await waitFor('input[name="q"]', 8000)
await type('input[name="q"]', vars.searchQuery || 'from:facebook.com')
await keyboard.press('Enter')
await sleep(3000)
const count = await evaluate(() =>
  document.querySelectorAll('[role="row"][jsmodel]').length
)
log('Tìm thấy', count, 'email với từ khóa:', vars.searchQuery)`,
  },
  {
    name: 'Gmail - Xóa email spam',
    icon: '🗑️',
    group: 'gmail',
    description: 'Chọn tất cả và xóa email trong tab Spam',
    code: `await goto('https://mail.google.com/mail/u/0/#spam')
await sleep(3000)
const hasEmail = await exists('[role="row"][jsmodel]')
if (!hasEmail) { log('Không có email spam'); }
// Chọn tất cả
await click('[data-tooltip*="Chọn tất cả"], [aria-label*="Select all"]')
await sleep(500)
// Xóa vĩnh viễn
await click('[data-tooltip*="Xóa mãi mãi"], [aria-label*="Delete forever"]')
await sleep(1000)
log('Đã xóa tất cả email spam!')`,
  },

  // ── Google ──
  {
    name: 'Google - Tìm kiếm',
    icon: '🌐',
    group: 'google',
    description: 'Tìm kiếm Google và lấy 5 kết quả đầu',
    code: `await goto('https://www.google.com/')
await waitFor('textarea[name="q"]', 5000)
await type('textarea[name="q"]', vars.keyword || 'zenvy browser antidetect')
await keyboard.press('Enter')
await waitForNavigation(8000)
const results = await evaluate(() =>
  [...document.querySelectorAll('h3')].slice(0, 5).map(el => el.textContent?.trim())
)
log('Top 5 kết quả:')
results.forEach((r, i) => log(i + 1, r))`,
  },
  {
    name: 'Google Maps - Tìm địa điểm',
    icon: '🗺️',
    group: 'google',
    description: 'Tìm kiếm địa điểm trên Google Maps',
    code: `const place = encodeURIComponent(vars.place || 'cà phê Hà Nội')
await goto(\`https://www.google.com/maps/search/\${place}\`)
await sleep(5000)
const results = await evaluate(() =>
  [...document.querySelectorAll('[role="article"] [jsan*="t-eSVAge"]')].slice(0, 5).map(el => el.textContent?.trim())
)
log('Địa điểm tìm được:', JSON.stringify(results.slice(0, 5)))`,
  },
  {
    name: 'Google Sheets - Đọc dữ liệu',
    icon: '📊',
    group: 'google',
    description: 'Mở Google Sheets và đọc dữ liệu từ biến sheetUrl',
    code: `await goto(vars.sheetUrl || 'https://docs.google.com/spreadsheets/d/...')
await sleep(5000)
const cells = await evaluate(() => {
  const inputs = document.querySelectorAll('.cell-input')
  return [...inputs].slice(0, 20).map(c => c.textContent || '')
})
log('Dữ liệu đọc được:', JSON.stringify(cells.filter(Boolean)))`,
  },

  // ── Shopee / Ecommerce ──
  {
    name: 'Shopee - Tìm sản phẩm',
    icon: '🛒',
    group: 'shopee',
    description: 'Tìm kiếm sản phẩm và lấy danh sách giá',
    code: `await goto('https://shopee.vn/')
await waitFor('[type="search"]', 8000)
await type('[type="search"]', vars.keyword || 'điện thoại samsung')
await keyboard.press('Enter')
await waitForNavigation(8000)
await sleep(2000)
const items = await evaluate(() =>
  [...document.querySelectorAll('[data-sqe="name"]')].slice(0, 8).map(el => el.textContent?.trim())
)
log('Sản phẩm tìm được:', JSON.stringify(items))`,
  },
  {
    name: 'Shopee - Xem livestream',
    icon: '📺',
    group: 'shopee',
    description: 'Truy cập và xem livestream trong N phút',
    code: `await goto(vars.livestreamUrl || 'https://shopee.vn/live')
await sleep(3000)
const minutes = Number(vars.watchMinutes) || 5
log('Bắt đầu xem livestream', minutes, 'phút...')
await sleep(minutes * 60 * 1000)
log('Hoàn thành xem livestream!')`,
  },
  {
    name: 'Shopee - Check giá sản phẩm',
    icon: '💰',
    group: 'shopee',
    description: 'Mở trang sản phẩm và lấy giá hiện tại',
    code: `await goto(vars.productUrl || 'https://shopee.vn/...')
await sleep(3000)
const price = await evaluate(() => {
  const el = document.querySelector('[class*="price"]')
  return el?.textContent?.trim() || 'Không tìm thấy giá'
})
const title = await evaluate(() => document.title)
log('Sản phẩm:', title)
log('Giá:', price)`,
  },

  // ── Twitter/X ──
  {
    name: 'Twitter/X - Đăng nhập',
    icon: '🐦',
    group: 'twitter',
    description: 'Đăng nhập Twitter/X tự động',
    code: `await goto('https://x.com/i/flow/login')
await waitFor('[autocomplete="username"]', 8000)
await type('[autocomplete="username"]', vars.username || 'username')
await sleep(500)
await click('[data-testid="LoginForm_Login_Button"]')
await waitFor('[name="password"]', 8000)
await type('[name="password"]', vars.password || 'password')
await sleep(300)
await click('[data-testid="LoginForm_Login_Button"]')
await waitForNavigation(12000)
log('Đăng nhập Twitter/X xong!')`,
  },
  {
    name: 'Twitter/X - Đăng tweet',
    icon: '📝',
    group: 'twitter',
    description: 'Đăng tweet từ biến tweetContent',
    code: `await goto('https://x.com/home')
await waitFor('[data-testid="tweetTextarea_0"]', 8000)
await click('[data-testid="tweetTextarea_0"]')
await sleep(300)
await keyboard.type(vars.tweetContent || 'Tweet tự động từ Zenvy Browser!')
await sleep(500)
await click('[data-testid="tweetButtonInline"]')
log('Đã đăng tweet thành công!')`,
  },

  // ── Tiện ích chung ──
  {
    name: 'Chụp ảnh nhiều URL',
    icon: '📸',
    group: 'utils',
    description: 'Screenshot từng URL trong danh sách vars.urls (ngăn cách bằng dấu phẩy)',
    code: `const urls = (vars.urls || 'https://facebook.com,https://google.com').split(',')
for (let i = 0; i < urls.length; i++) {
  const url = urls[i].trim()
  try {
    await goto(url)
    await sleep(2000)
    const path = await screenshot(\`capture_\${i + 1}.png\`)
    log(\`[\${i + 1}/\${urls.length}] Đã chụp: \${url} → \${path}\`)
  } catch (e) {
    console.error(\`[\${i + 1}] Lỗi chụp:\`, url)
  }
  await sleep(500)
}
log('Hoàn thành chụp', urls.length, 'URL!')`,
  },
  {
    name: 'Kiểm tra nhiều website',
    icon: '📡',
    group: 'utils',
    description: 'Ping danh sách URL và log title + trạng thái',
    code: `const urls = (vars.urls || 'https://facebook.com,https://google.com').split(',')
for (const rawUrl of urls) {
  const url = rawUrl.trim()
  try {
    await goto(url)
    await sleep(1500)
    const title = await evaluate(() => document.title)
    log('[OK]', url, '→', title)
  } catch (e) {
    console.error('[FAIL]', url)
  }
  await sleep(500)
}`,
  },
  {
    name: 'Thu thập SEO từ trang',
    icon: '🔎',
    group: 'utils',
    description: 'Lấy title, description, h1, h2 và đếm link',
    code: `await goto(vars.targetUrl || 'https://example.com')
await sleep(2000)
const data = await evaluate(() => ({
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '-',
  h1: [...document.querySelectorAll('h1')].map(h => h.textContent?.trim()),
  h2: [...document.querySelectorAll('h2')].slice(0, 5).map(h => h.textContent?.trim()),
  links: document.querySelectorAll('a[href]').length,
}))
log('Title:', data.title)
log('Description:', data.description)
log('H1:', JSON.stringify(data.h1))
log('H2:', JSON.stringify(data.h2))
log('Tổng link:', data.links)`,
  },
  {
    name: 'Điền form tự động',
    icon: '📋',
    group: 'utils',
    description: 'Điền form HTML đầy đủ từ biến profile',
    code: `await goto(vars.formUrl || 'https://example.com/form')
await waitFor('form', 8000)
if (vars.fullName) await type('[name="name"], #name', vars.fullName)
if (vars.username) await type('[name="email"], #email, [type="email"]', vars.username)
if (vars.phone) await type('[name="phone"], #phone, [type="tel"]', vars.phone)
if (vars.country) {
  const hasSel = await exists('[name="country"], #country')
  if (hasSel) await select('[name="country"], #country', vars.country)
}
await sleep(500)
await click('[type="submit"]')
await sleep(1500)
log('Đã gửi form thành công!')`,
  },
]

const TEMPLATE_GROUPS = [
  { key: 'facebook', label: 'Facebook', emoji: '📘' },
  { key: 'gmail', label: 'Gmail', emoji: '📧' },
  { key: 'google', label: 'Google', emoji: '🔍' },
  { key: 'shopee', label: 'Shopee', emoji: '🛒' },
  { key: 'twitter', label: 'Twitter/X', emoji: '🐦' },
  { key: 'utils', label: 'Tiện ích', emoji: '🔧' },
]

const INTERVAL_OPTIONS = [
  { label: '5 phút', ms: 5 * 60 * 1000 },
  { label: '15 phút', ms: 15 * 60 * 1000 },
  { label: '30 phút', ms: 30 * 60 * 1000 },
  { label: '1 giờ', ms: 60 * 60 * 1000 },
  { label: '2 giờ', ms: 2 * 60 * 60 * 1000 },
  { label: '6 giờ', ms: 6 * 60 * 60 * 1000 },
  { label: '12 giờ', ms: 12 * 60 * 60 * 1000 },
  { label: '24 giờ', ms: 24 * 60 * 60 * 1000 },
]

const DEFAULT_CODE = `// Script automation — Zenvy Browser
// Tất cả lệnh đều cần await. Click action ở bên trái để chèn code.

await goto('https://facebook.com')
await sleep(1000)
log('Trang đã tải xong!')
`

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDur(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`
}
function fmtDT(ts: number) {
  return new Date(ts).toLocaleString('vi-VN', { hour12: false, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function fmtT(ts: number) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour12: false })
}

// ── Mini components ───────────────────────────────────────────────────────────

function Dot({ status }: { status?: string }) {
  const cls = status === 'running' ? 'bg-blue-400 animate-pulse' : status === 'success' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-400' : 'bg-slate-700'
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: 'bg-blue-500/20 text-blue-400',
    success: 'bg-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/20 text-red-400',
    idle: 'bg-slate-500/20 text-slate-500',
  }
  const lbl: Record<string, string> = { running: 'Đang chạy', success: 'Thành công', error: 'Lỗi', idle: 'Chờ' }
  return <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${map[status] ?? map.idle}`}>{lbl[status] ?? status}</span>
}

function LogStream({ executions, activeIdx, onSelect }: {
  executions: ScriptExecution[]
  activeIdx: number
  onSelect: (i: number) => void
}) {
  const logContainerRef = useRef<HTMLDivElement>(null)
  const active = executions[activeIdx] ?? null
  const [logFilter, setLogFilter] = useState('')

  useEffect(() => {
    const el = logContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [active?.logs?.length])

  const exportLogs = () => {
    if (!active) return
    const text = active.logs.map(log => `[${fmtT(log.timestamp)}] ${log.message}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${active.profileName}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearLogs = () => {
    if (!active) return
    active.logs = []
    setLogFilter('')
  }

  if (!active) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-center text-[11px] text-slate-700">Nhật ký sẽ hiển thị<br />sau khi chạy script</p>
      </div>
    )
  }

  const filteredLogs = logFilter
    ? active.logs.filter(log => log.message.toLowerCase().includes(logFilter.toLowerCase()))
    : active.logs

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {executions.length > 1 && (
        <div className="flex shrink-0 overflow-x-auto border-b border-white/[0.05]">
          {executions.map((e, i) => (
            <button key={e.id} onClick={() => onSelect(i)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-1.5 text-[11px] transition-all ${
                activeIdx === i ? 'border-purple-500 text-white' : 'border-transparent text-slate-600 hover:text-slate-400'
              }`}
            >
              <Dot status={e.status} />
              <span className="max-w-[72px] truncate">{e.profileName}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/[0.05] bg-[#07060f]">
        <div className="relative flex-1">
          <input
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value)}
            placeholder="Lọc logs..."
            className="w-full rounded border border-white/[0.06] bg-black/30 py-1 pl-7 pr-2 text-[10px] text-white placeholder:text-slate-700 focus:outline-none focus:border-purple-500/30"
          />
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          onClick={clearLogs}
          title="Xóa logs"
          className="p-1 text-slate-700 hover:text-red-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
        <button
          onClick={exportLogs}
          title="Export logs"
          className="p-1 text-slate-700 hover:text-purple-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </button>
      </div>

      <div ref={logContainerRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-px bg-[#07060f]">
        {filteredLogs.map((log, i) => (
          <div key={i} className={`flex gap-2 leading-5 ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-slate-500'}`}>
            <span className="shrink-0 text-slate-700 select-none">{fmtT(log.timestamp)}</span>
            <span className="break-all">{log.message}</span>
          </div>
        ))}
        {filteredLogs.length === 0 && logFilter && (
          <span className="text-slate-700 italic">Không tìm thấy log nào</span>
        )}
        {active.logs.length === 0 && active.status === 'running' && (
          <span className="text-slate-700 italic animate-pulse">Đang khởi động...</span>
        )}
        {active.error && (
          <div className="mt-2 rounded bg-red-900/30 border border-red-500/20 p-2 text-red-400 break-all">{active.error}</div>
        )}
        {active.status === 'running' && (
          <div className="flex items-center gap-1 text-blue-400 animate-pulse mt-1 text-[10px]">
            <span>●</span><span>Đang thực thi...</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════════════════

export default function AutomationPage({ subPage }: { subPage: AutoSub }) {
  const profiles = useStore((s) => s.profiles)
  const groups = useStore((s) => s.groups)
  const refreshStore = useStore((s) => s.loadAll)

  // Scripts
  const [scripts, setScripts] = useState<AutomationScript[]>([])
  const [scriptSearch, setScriptSearch] = useState('')
  const [selected, setSelected] = useState<AutomationScript | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editorMode, setEditorMode] = useState(false)  // false = card grid, true = editor
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [draftCode, setDraftCode] = useState(DEFAULT_CODE)
  const [isDirty, setIsDirty] = useState(false)
  const insertRef = useRef<((code: string) => void) | null>(null)
  const [gridGroup, setGridGroup] = useState<string>('all')  // 'all' | 'mine' | group key for templates
  const [gridTemplateGroup, setGridTemplateGroup] = useState<string>('all')

  // Runner
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])
  const [filterGroup, setFilterGroup] = useState('all')
  const [profileSearch, setProfileSearch] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [executions, setExecutions] = useState<ScriptExecution[]>([])
  const [activeExec, setActiveExec] = useState(0)
  const [showVars, setShowVars] = useState(false)
  const [varsOverride, setVarsOverride] = useState<Record<string, string>>({})
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  // Scheduler
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [showSchedForm, setShowSchedForm] = useState(false)
  const [schedScriptId, setSchedScriptId] = useState('')
  const [schedProfileIds, setSchedProfileIds] = useState<string[]>([])
  const [schedType, setSchedType] = useState<'once' | 'interval'>('interval')
  const [schedRunAt, setSchedRunAt] = useState('')
  const [schedIntervalMs, setSchedIntervalMs] = useState(INTERVAL_OPTIONS[2].ms)

  // History
  const [history, setHistory] = useState<TaskHistoryRecord[]>([])
  const [histFilter, setHistFilter] = useState<'all' | 'success' | 'error'>('all')
  const [histSearch, setHistSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadScripts = useCallback(async () => setScripts(await window.api.scripts.getAll()), [])
  const loadTasks = useCallback(async () => setTasks(await window.api.scheduler.getAll()), [])
  const loadHistory = useCallback(async () => setHistory(await window.api.history.getAll()), [])

  useEffect(() => {
    loadScripts(); loadTasks(); loadHistory()
    const unsub = window.api.scripts.onExecutionUpdate((exec) => {
      setExecutions((prev) => {
        const i = prev.findIndex((e) => e.id === exec.id)
        if (i >= 0) { const n = [...prev]; n[i] = exec; return n }
        return [...prev, exec]
      })
      if (exec.status === 'success' || exec.status === 'error') {
        setIsRunning(false)
        // Load history without triggering re-render loop
        window.api.history.getAll().then(setHistory)
      }
    })
    return unsub
  }, [loadScripts, loadTasks, loadHistory])

  // Reset editor mode khi rời khỏi scripts tab
  useEffect(() => {
    if (subPage !== 'scripts') {
      setEditorMode(false)
    }
  }, [subPage])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => {
      if (subPage === 'scripts' && editorMode && (editMode || isNew)) {
        saveScript()
      }
    },
    onRun: () => {
      if (subPage === 'scripts' && editorMode && selected && !isNew && !editMode && selectedProfileIds.length > 0 && !isRunning) {
        run()
      }
    },
    onEscape: () => {
      if (subPage === 'scripts' && editorMode) {
        backToGrid()
      }
    }
  })

  // ── Script handlers ────────────────────────────────────────────────────────
  const openNew = (name = '', desc = '', code = DEFAULT_CODE) => {
    setSelected(null); setIsNew(true); setEditMode(true); setEditorMode(true)
    setDraftName(name); setDraftDesc(desc); setDraftCode(code); setIsDirty(false)
    setExecutions([])
  }

  const openScript = (s: AutomationScript) => {
    setSelected(s); setIsNew(false); setEditMode(false); setEditorMode(true)
    setDraftName(s.name); setDraftDesc(s.description); setDraftCode(s.code)
    setIsDirty(false); setExecutions([]); setVarsOverride({})
  }

  const backToGrid = () => {
    if (isDirty) {
      dialog.confirm('Bỏ thay đổi?', 'Bạn có thay đổi chưa lưu. Thoát editor không?', () => {
        setEditorMode(false); setSelected(null); setIsNew(false); setIsDirty(false); setEditMode(false)
      })
    } else {
      setEditorMode(false); setSelected(null); setIsNew(false); setEditMode(false)
    }
  }

  const saveScript = async () => {
    if (!draftName.trim()) { toast.error('Tên script không được để trống'); return }
    if (isNew) {
      const created = await window.api.scripts.create({ name: draftName.trim(), description: draftDesc.trim(), code: draftCode })
      toast.success('Đã tạo script'); await loadScripts()
      setSelected(created); setIsNew(false); setEditMode(false); setIsDirty(false)
    } else if (selected) {
      const updated = await window.api.scripts.update(selected.id, { name: draftName.trim(), description: draftDesc.trim(), code: draftCode })
      if (updated) { setSelected(updated); toast.success('Đã lưu'); await loadScripts(); setEditMode(false); setIsDirty(false) }
    }
  }

  const cancelEdit = () => {
    if (isNew) { backToGrid() }
    else if (selected) { setDraftName(selected.name); setDraftDesc(selected.description); setDraftCode(selected.code); setEditMode(false); setIsDirty(false) }
  }

  const deleteScript = (s: AutomationScript) => {
    dialog.confirm('Xóa script', `Xóa "${s.name}"?`, async () => {
      await window.api.scripts.delete(s.id); toast.success('Đã xóa'); await loadScripts()
      if (selected?.id === s.id) { backToGrid() }
    })
  }

  // ── Runner ─────────────────────────────────────────────────────────────────
  const toggleProfile = (id: string) =>
    setSelectedProfileIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])

  const run = async () => {
    if (!selected) { toast.error('Chưa chọn script'); return }
    if (!selectedProfileIds.length) { toast.error('Chưa chọn profile'); return }
    setIsRunning(true); setExecutions([]); setActiveExec(0)
    for (let i = 0; i < selectedProfileIds.length; i++) {
      const base = profiles.find((p) => p.id === selectedProfileIds[i])
      if (!base) continue
      const profile: Profile = Object.keys(varsOverride).length
        ? { ...base, variables: { ...(base.variables ?? {}), ...varsOverride } } : base
      const res = await window.api.scripts.run(selected.id, profile)
      if (!res.success) toast.error(`${base.name}: ${res.error ?? 'Lỗi'}`)
      setActiveExec(i)
    }
  }

  const saveVars = async (profileId: string) => {
    const p = profiles.find((x) => x.id === profileId)
    if (!p) return
    await window.api.profiles.setVariables(profileId, { ...(p.variables ?? {}), ...varsOverride })
    await refreshStore(); toast.success('Đã lưu biến vào profile')
  }

  // ── Scheduler ──────────────────────────────────────────────────────────────
  const createSchedule = async () => {
    if (!schedScriptId || !schedProfileIds.length) { toast.error('Chưa đủ thông tin'); return }
    const script = scripts.find((s) => s.id === schedScriptId)
    if (!script) return
    await window.api.scheduler.create({
      scriptId: script.id, scriptName: script.name, profileIds: schedProfileIds, type: schedType,
      runAt: schedType === 'once' && schedRunAt ? new Date(schedRunAt).getTime() : undefined,
      intervalMs: schedType === 'interval' ? schedIntervalMs : undefined,
    })
    toast.success('Đã tạo lịch'); await loadTasks()
    setShowSchedForm(false); setSchedScriptId(''); setSchedProfileIds([])
  }

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtScripts = scriptSearch.trim()
    ? scripts.filter((s) => s.name.toLowerCase().includes(scriptSearch.toLowerCase()) || s.description.toLowerCase().includes(scriptSearch.toLowerCase()))
    : scripts

  const filtProfiles = profiles.filter((p) => {
    const g = filterGroup === 'all' || (filterGroup === 'ungrouped' ? !p.groupId : p.groupId === filterGroup)
    const s = !profileSearch || p.name.toLowerCase().includes(profileSearch.toLowerCase())
    return g && s
  })

  const filtHistory = history.filter((r) => {
    const s = histFilter === 'all' || r.status === histFilter
    const q = !histSearch || r.scriptName.toLowerCase().includes(histSearch.toLowerCase()) || r.profileName.toLowerCase().includes(histSearch.toLowerCase())
    return s && q
  })

  const isEditing = editMode || isNew

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">


      {/* Page Header */}
      <div className="drag-region h-8 flex-shrink-0" />
      <div className="no-drag border-b border-[#1F2230] px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-[#E5E7EB]">Automation</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            Tạo và chạy quy trình tự động hóa
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SCRIPTS — Card grid view
      ══════════════════════════════════════════════════════════════════════ */}
      {subPage === 'scripts' && !editorMode && (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {/* Toolbar */}
          <div className="shrink-0 flex items-center gap-3 border-b border-white/[0.06] bg-[#0D0B1A] px-5 py-3">
            <h2 className="text-sm font-semibold text-white">Quy Trình Tự Động</h2>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <input
                  value={scriptSearch}
                  onChange={(e) => setScriptSearch(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-48 rounded-lg border border-white/[0.07] bg-white/[0.03] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/30"
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={() => openNew()}
                className="flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#8B5CF6] transition-colors"
              >
                <span>+</span> Thêm quy trình mới
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: category sidebar */}
            <div className="w-44 shrink-0 border-r border-white/[0.06] bg-[#0A0817] overflow-y-auto py-3 px-2 space-y-0.5">
              <SidebarItem label="Tất cả" active={gridGroup === 'all'} onClick={() => setGridGroup('all')} count={scripts.length} />
              <SidebarItem label="Script của tôi" active={gridGroup === 'mine'} onClick={() => setGridGroup('mine')} count={scripts.length} />

              <div className="pt-3 pb-1 px-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-700">Mẫu có sẵn</p>
              </div>
              {TEMPLATE_GROUPS.map((g) => (
                <SidebarItem
                  key={g.key}
                  label={`${g.emoji} ${g.label}`}
                  active={gridGroup === `tpl_${g.key}`}
                  onClick={() => setGridGroup(`tpl_${g.key}`)}
                  count={SCRIPT_TEMPLATES.filter((t) => t.group === g.key).length}
                />
              ))}
            </div>

            {/* Right: card grid */}
            <div className="flex-1 overflow-y-auto bg-[#0D0B1A] p-5">
              {/* Show template grid */}
              {gridGroup.startsWith('tpl_') && (() => {
                const tplKey = gridGroup.replace('tpl_', '')
                const tpls = SCRIPT_TEMPLATES.filter((t) => t.group === tplKey)
                return (
                  <div>
                    <p className="mb-4 text-xs text-slate-600">{tpls.length} mẫu — click để tạo script mới từ mẫu</p>
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                      {tpls.map((tpl) => (
                        <TemplateCard key={tpl.name} tpl={tpl} onClick={() => openNew(tpl.name, tpl.description, tpl.code)} />
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Show my scripts */}
              {(gridGroup === 'all' || gridGroup === 'mine') && (
                <div>
                  {filtScripts.length === 0 ? (
                    <EmptyState onNew={() => openNew()} />
                  ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                      {filtScripts.map((s) => {
                        const lastExec = executions.find((e) => e.scriptId === s.id)
                        return (
                          <ScriptCard
                            key={s.id}
                            script={s}
                            execStatus={lastExec?.status}
                            onOpen={() => openScript(s)}
                            onDelete={() => deleteScript(s)}
                          />
                        )
                      })}
                    </div>
                  )}

                  {/* Templates teaser below scripts */}
                  {gridGroup === 'all' && (
                    <div className="mt-8">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500">Mẫu có sẵn ({SCRIPT_TEMPLATES.length})</p>
                        <p className="text-[11px] text-slate-700">Click để tạo script từ mẫu</p>
                      </div>
                      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                        {SCRIPT_TEMPLATES.slice(0, 6).map((tpl) => (
                          <TemplateCard key={tpl.name} tpl={tpl} onClick={() => openNew(tpl.name, tpl.description, tpl.code)} />
                        ))}
                      </div>
                      {SCRIPT_TEMPLATES.length > 6 && (
                        <button
                          onClick={() => setGridGroup(`tpl_${TEMPLATE_GROUPS[0].key}`)}
                          className="mt-3 text-xs text-purple-400/60 hover:text-purple-400 transition-colors"
                        >
                          Xem thêm {SCRIPT_TEMPLATES.length - 6} mẫu khác →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SCRIPTS — Editor view (3 panels)
      ══════════════════════════════════════════════════════════════════════ */}
      {subPage === 'scripts' && editorMode && (
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Panel L: Action library */}
          <div className="flex w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0A0817] overflow-hidden">
            <div className="shrink-0 flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              <button
                onClick={backToGrid}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-white/[0.05] hover:text-white transition-all"
              >
                ← Danh sách
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ActionLibrary onInsert={(code) => {
                if (insertRef.current) {
                  insertRef.current(code)
                  if (!isEditing) setEditMode(true)
                } else {
                  setDraftCode((p) => p + '\n' + code)
                }
              }} />
            </div>
          </div>

          {/* Panel C: Editor */}
          <div className="flex flex-1 flex-col overflow-hidden bg-[#0D0B1A]">
            {/* Toolbar */}
            <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-4 py-2.5">
              {isEditing ? (
                <input
                  value={draftName}
                  onChange={(e) => { setDraftName(e.target.value); setIsDirty(true) }}
                  placeholder="Tên script..."
                  autoFocus
                  className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none border-b border-transparent focus:border-purple-500/40 pb-0.5"
                />
              ) : (
                <div className="flex flex-1 min-w-0 items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-white">{selected?.name}</h3>
                  {isDirty && <span className="shrink-0 text-[10px] text-amber-400">●</span>}
                  {selected?.description && <span className="ml-1 truncate text-xs text-slate-600">{selected.description}</span>}
                </div>
              )}

              <div className="flex shrink-0 items-center gap-1.5">
                {isEditing ? (
                  <>
                    <button
                      onClick={saveScript}
                      title="Lưu (Ctrl+S)"
                      className="rounded-lg bg-[#7C3AED] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#8B5CF6] transition-colors"
                    >
                      Lưu
                    </button>
                    <button onClick={cancelEdit} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.05] transition-colors">Hủy</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditMode(true)} className="rounded-lg border border-white/[0.08] px-3.5 py-1.5 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-white transition-colors">Chỉnh sửa</button>
                    <button onClick={() => deleteScript(selected!)} className="rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-slate-600 hover:border-red-500/20 hover:text-red-400 transition-colors">Xóa</button>
                  </>
                )}
              </div>
            </div>

            {/* Description (edit mode) */}
            {isEditing && (
              <div className="shrink-0 border-b border-white/[0.04] px-4 py-1.5">
                <input
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  placeholder="Mô tả ngắn về script này..."
                  className="w-full bg-transparent text-xs text-slate-600 placeholder:text-slate-700 focus:outline-none focus:text-slate-400"
                />
              </div>
            )}

            {/* Monaco fills remaining space */}
            <div className="flex-1 min-h-0">
              {!selected && !isNew ? (
                <EditorEmptyState onSelectTemplate={() => setGridGroup('tpl_facebook')} />
              ) : (
                <ScriptEditor
                  value={draftCode}
                  onChange={(c) => { setDraftCode(c); setIsDirty(true) }}
                  readOnly={!isEditing}
                  height="100%"
                  onEditorMount={(fn) => { insertRef.current = fn }}
                />
              )}
            </div>
          </div>

          {/* Panel R: Run & log */}
          <div className="flex w-[420px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0A0817] overflow-hidden">

            {/* Profile selector */}
            <div className="shrink-0 border-b border-white/[0.06] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Hồ sơ</span>
                <span className="text-[11px] font-semibold text-purple-400">{selectedProfileIds.length} đã chọn</span>
              </div>

              <select
                value={filterGroup}
                onChange={(e) => {
                  const v = e.target.value; setFilterGroup(v)
                  if (v === 'all') setSelectedProfileIds(profiles.map((p) => p.id))
                  else if (v === 'ungrouped') setSelectedProfileIds(profiles.filter((p) => !p.groupId).map((p) => p.id))
                  else setSelectedProfileIds(profiles.filter((p) => p.groupId === v).map((p) => p.id))
                }}
                className="w-full rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-[11px] text-slate-400 focus:outline-none focus:border-purple-500/30"
              >
                <option value="all" className="bg-[#13111F]">Tất cả nhóm</option>
                <option value="ungrouped" className="bg-[#13111F]">Chưa phân nhóm</option>
                {groups.map((g) => <option key={g.id} value={g.id} className="bg-[#13111F]">{g.name}</option>)}
              </select>

              <div className="relative">
                <input
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  placeholder="Tìm profile..."
                  className="w-full rounded-md border border-white/[0.06] bg-white/[0.03] py-1.5 pl-7 pr-2 text-[11px] text-slate-400 placeholder:text-slate-700 focus:outline-none focus:border-purple-500/30"
                />
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="max-h-[140px] overflow-y-auto rounded-md border border-white/[0.05] bg-black/20 divide-y divide-white/[0.03]">
                <div className="flex items-center justify-between px-2.5 py-1">
                  <button onClick={() => setSelectedProfileIds(filtProfiles.map((p) => p.id))} className="text-[10px] text-purple-400/70 hover:text-purple-400">Tất cả</button>
                  <button onClick={() => setSelectedProfileIds([])} className="text-[10px] text-slate-700 hover:text-slate-500">Bỏ chọn</button>
                </div>
                {filtProfiles.length === 0 && <p className="px-3 py-2 text-[11px] text-slate-700">Không có profile</p>}
                {filtProfiles.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 hover:bg-white/[0.03] transition-colors">
                    <input type="checkbox" checked={selectedProfileIds.includes(p.id)} onChange={() => toggleProfile(p.id)} className="accent-purple-500 shrink-0" />
                    <span className="flex-1 truncate text-[11px] text-slate-400">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Variables */}
            <div className="shrink-0 border-b border-white/[0.06]">
              <button onClick={() => setShowVars((v) => !v)} className="flex w-full items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Biến (vars)
                  </span>
                  {Object.keys(varsOverride).length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-500/20 text-purple-400">
                      {Object.keys(varsOverride).length}
                    </span>
                  )}
                  <span
                    className="text-slate-700 hover:text-slate-500 cursor-help transition-colors"
                    title="Biến để lưu username, password, URL... Truy cập bằng vars.key trong script"
                  >
                    ℹ️
                  </span>
                </div>
                <svg className={`w-3 h-3 text-slate-700 transition-transform ${showVars ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showVars && (
                <div className="px-3 pb-3 space-y-1.5">
                  {(() => {
                    const p = profiles.find((x) => x.id === selectedProfileIds[0])
                    const allVars = { ...(p?.variables ?? {}), ...varsOverride }
                    const hasVars = Object.keys(allVars).length > 0

                    if (!hasVars) {
                      return (
                        <div className="py-3 px-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                          <p className="text-[10px] text-slate-600 mb-2">Chưa có biến nào</p>
                          <p className="text-[9px] text-slate-700 mb-2">Ví dụ:</p>
                          <code className="block text-[9px] text-purple-400 font-mono mb-1">username: "user@example.com"</code>
                          <code className="block text-[9px] text-purple-400 font-mono">password: "pass123"</code>
                        </div>
                      )
                    }

                    return Object.entries(allVars).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1.5">
                        <span className="w-16 shrink-0 truncate text-[10px] text-slate-600">{k}</span>
                        <input value={v} onChange={(e) => setVarsOverride((prev) => ({ ...prev, [k]: e.target.value }))}
                          className="flex-1 rounded border border-white/[0.05] bg-black/30 px-2 py-1 text-[10px] text-white focus:outline-none focus:border-purple-500/30" />
                        <button onClick={() => setVarsOverride((prev) => { const n = { ...prev }; delete n[k]; return n })}
                          className="text-[10px] text-slate-700 hover:text-red-400 px-0.5">✕</button>
                      </div>
                    ))
                  })()}
                  <div className="flex gap-1">
                    <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key"
                      className="w-16 rounded border border-white/[0.05] bg-black/30 px-2 py-1 text-[10px] text-white placeholder:text-slate-700 focus:outline-none" />
                    <input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="value"
                      onKeyDown={(e) => { if (e.key === 'Enter') { if (newKey.trim()) { setVarsOverride((v) => ({ ...v, [newKey.trim()]: newVal })); setNewKey(''); setNewVal('') } } }}
                      className="flex-1 rounded border border-white/[0.05] bg-black/30 px-2 py-1 text-[10px] text-white placeholder:text-slate-700 focus:outline-none" />
                    <button onClick={() => { if (newKey.trim()) { setVarsOverride((v) => ({ ...v, [newKey.trim()]: newVal })); setNewKey(''); setNewVal('') } }}
                      className="rounded bg-[#7C3AED]/50 px-2 py-1 text-[10px] text-white hover:bg-[#7C3AED]/70">+</button>
                  </div>
                  {selectedProfileIds.length === 1 && Object.keys(varsOverride).length > 0 && (
                    <button
                      onClick={() => saveVars(selectedProfileIds[0])}
                      className="w-full mt-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-[#8B5CF6]/20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Lưu vào profile
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Run button */}
            <div className="shrink-0 p-3 border-b border-white/[0.06]">
              <button
                onClick={run}
                disabled={isRunning || !selected || !selectedProfileIds.length}
                title="Chạy script (Ctrl+Enter)"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed "
              >
                {isRunning
                  ? <><span className="animate-spin">↻</span> Đang chạy...</>
                  : <>▶&nbsp;Chạy{selectedProfileIds.length > 1 ? ` (${selectedProfileIds.length})` : ''}</>
                }
              </button>
              {executions.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={executions[activeExec]?.status ?? 'idle'} />
                  {executions[activeExec]?.finishedAt && (
                    <span className="text-[10px] text-slate-700">{fmtDur(executions[activeExec].finishedAt! - executions[activeExec].startedAt)}</span>
                  )}
                  <button onClick={() => { setExecutions([]); setIsRunning(false) }} className="ml-auto text-[10px] text-slate-700 hover:text-slate-500 transition-colors">Xóa log</button>
                </div>
              )}
            </div>

            {/* Log output */}
            <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Output</span>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <LogStream executions={executions} activeIdx={activeExec} onSelect={setActiveExec} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SCHEDULER
      ══════════════════════════════════════════════════════════════════════ */}
      {subPage === 'scheduler' && (
        <div className="flex-1 overflow-y-auto bg-[#0D0B1A]">
          <div className="mx-auto max-w-3xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Lịch chạy tự động</h2>
                <p className="mt-0.5 text-xs text-slate-600">Script sẽ chạy kể cả khi không mở trang Automation</p>
              </div>
              <button onClick={() => setShowSchedForm((v) => !v)}
                className="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#8B5CF6] transition-colors"
              >+ Tạo lịch</button>
            </div>

            {showSchedForm && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cấu hình lịch mới</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] text-slate-600">Script</label>
                    <Select
                      value={schedScriptId}
                      onChange={setSchedScriptId}
                      options={[
                        { value: '', label: '-- Chọn script --' },
                        ...scripts.map(s => ({ value: s.id, label: s.name }))
                      ]}
                      placeholder="-- Chọn script --"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] text-slate-600">Loại lịch</label>
                    <Select
                      value={schedType}
                      onChange={(value) => setSchedType(value as 'once' | 'interval')}
                      options={[
                        { value: 'interval', label: 'Lặp lại' },
                        { value: 'once', label: 'Một lần' }
                      ]}
                    />
                  </div>
                </div>

                {schedType === 'interval' ? (
                  <div>
                    <label className="mb-2 block text-[11px] text-slate-600">Chu kỳ</label>
                    <div className="flex flex-wrap gap-2">
                      {INTERVAL_OPTIONS.map((o) => (
                        <button key={o.ms} onClick={() => setSchedIntervalMs(o.ms)}
                          className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                            schedIntervalMs === o.ms ? 'border-purple-500/50 bg-purple-500/15 text-purple-300' : 'border-white/[0.07] text-slate-600 hover:text-slate-400 hover:border-white/[0.12]'
                          }`}
                        >{o.label}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-[11px] text-slate-600">Thời điểm chạy</label>
                    <input type="datetime-local" value={schedRunAt} onChange={(e) => setSchedRunAt(e.target.value)}
                      className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/30" />
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-[11px] text-slate-600">Profiles ({schedProfileIds.length} đã chọn)</label>
                  <div className="grid grid-cols-3 gap-1 max-h-28 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/20 p-2">
                    {profiles.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.04] transition-colors">
                        <input type="checkbox" className="accent-purple-500 shrink-0"
                          checked={schedProfileIds.includes(p.id)}
                          onChange={() => setSchedProfileIds((prev) => prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id])} />
                        <span className="truncate text-xs text-slate-400">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={createSchedule} className="rounded-lg bg-[#7C3AED] px-5 py-2 text-xs font-semibold text-white hover:bg-[#8B5CF6] transition-colors">Tạo lịch</button>
                  <button onClick={() => setShowSchedForm(false)} className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs text-slate-500 hover:bg-white/[0.04] transition-colors">Hủy</button>
                </div>
              </div>
            )}

            {tasks.length === 0 && !showSchedForm && (
              <div className="flex flex-col items-center gap-3 py-16">
                <span className="text-4xl">⏱</span>
                <p className="text-sm text-slate-600">Chưa có lịch nào</p>
              </div>
            )}

            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all ${task.enabled ? 'border-white/[0.08] bg-white/[0.025]' : 'border-white/[0.04] bg-white/[0.01] opacity-50'}`}>
                  <div className={`shrink-0 rounded-lg p-2 text-base ${task.enabled ? 'bg-purple-500/15 text-purple-400' : 'bg-white/[0.04] text-slate-600'}`}>⏱</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{task.scriptName}</span>
                      <span className={`rounded-full px-2 py-px text-[10px] font-semibold ${task.enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/10 text-slate-600'}`}>
                        {task.enabled ? 'Hoạt động' : 'Tắt'}
                      </span>
                      <span className="rounded-full border border-purple-500/20 px-2 py-px text-[10px] text-purple-400">
                        {task.type === 'interval' ? (INTERVAL_OPTIONS.find(o => o.ms === task.intervalMs)?.label ?? '?') : 'Một lần'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-700">
                      {task.profileIds.length} profile
                      {task.lastRunAt && <> · Lần cuối: {fmtDT(task.lastRunAt)}</>}
                      {task.nextRunAt && task.enabled && <span className="text-purple-400/50"> · Tiếp: {fmtDT(task.nextRunAt)}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={async () => { await window.api.scheduler.toggle(task.id, !task.enabled); loadTasks() }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${task.enabled ? 'border border-white/[0.08] text-slate-500 hover:bg-white/[0.04]' : 'bg-[#7C3AED]/70 text-white hover:bg-[#7C3AED]'}`}
                    >{task.enabled ? 'Tắt' : 'Bật'}</button>
                    <button onClick={() => dialog.confirm('Xóa lịch', `Xóa lịch chạy "${task.scriptName}"?`, async () => { await window.api.scheduler.delete(task.id); loadTasks() })}
                      className="rounded-lg border border-white/[0.06] p-1.5 text-slate-700 hover:border-red-500/20 hover:text-red-400 transition-colors"
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HISTORY
      ══════════════════════════════════════════════════════════════════════ */}
      {subPage === 'history' && (
        <div className="flex-1 overflow-y-auto bg-[#0D0B1A]">
          <div className="mx-auto max-w-4xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Lịch sử chạy</h2>
                <p className="mt-0.5 text-xs text-slate-600">{history.length} bản ghi · tối đa 500</p>
              </div>
              {history.length > 0 && (
                <button onClick={() => dialog.confirm('Xóa lịch sử', 'Xóa toàn bộ?', async () => { await window.api.history.clear(); toast.success('Đã xóa'); loadHistory() })}
                  className="rounded-lg border border-white/[0.07] px-3 py-2 text-xs text-slate-500 hover:border-red-500/20 hover:text-red-400 transition-colors"
                >Xóa tất cả</button>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
                {(['all', 'success', 'error'] as const).map((f) => (
                  <button key={f} onClick={() => setHistFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      histFilter === f
                        ? f === 'success' ? 'bg-emerald-500/20 text-emerald-400' : f === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-300'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >{f === 'all' ? 'Tất cả' : f === 'success' ? '✓ OK' : '✕ Lỗi'}</button>
                ))}
              </div>
              <input value={histSearch} onChange={(e) => setHistSearch(e.target.value)}
                placeholder="Tìm script, profile..."
                className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-700 focus:outline-none" />
              <span className="shrink-0 text-[11px] text-slate-700">{filtHistory.length}</span>
            </div>

            {filtHistory.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16">
                <span className="text-4xl">📋</span>
                <p className="text-sm text-slate-600">{histSearch || histFilter !== 'all' ? 'Không tìm thấy' : 'Chưa có lịch sử'}</p>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-white/[0.06]">
              {filtHistory.length > 0 && (
                <div className="grid grid-cols-[8px_1fr_1fr_64px_80px_88px_24px] gap-4 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2">
                  {['', 'Script', 'Profile', 'Thời gian', 'Kết quả', 'Bắt đầu', ''].map((h, i) => (
                    <span key={i} className="text-[10px] font-bold uppercase tracking-widest text-slate-700">{h}</span>
                  ))}
                </div>
              )}
              <div className="divide-y divide-white/[0.04]">
                {filtHistory.map((rec) => (
                  <div key={rec.id}>
                    <div
                      className="grid grid-cols-[8px_1fr_1fr_64px_80px_88px_24px] gap-4 items-center cursor-pointer px-4 py-3 hover:bg-white/[0.02] transition-colors"
                      onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                    >
                      <div className={`w-2 h-2 rounded-full ${rec.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="truncate text-xs font-medium text-slate-300">{rec.scriptName}</span>
                      <span className="truncate text-xs text-slate-600">{rec.profileName}</span>
                      <span className="font-mono text-xs text-slate-600">{fmtDur(rec.finishedAt - rec.startedAt)}</span>
                      <StatusBadge status={rec.status} />
                      <span className="text-[11px] text-slate-700">{fmtDT(rec.startedAt)}</span>
                      <button onClick={(e) => { e.stopPropagation(); dialog.confirm('Xóa', 'Xóa bản ghi này?', async () => { await window.api.history.delete(rec.id); loadHistory() }) }}
                        className="text-[11px] text-slate-700 hover:text-red-400 transition-colors text-right">✕</button>
                    </div>
                    {expandedId === rec.id && (
                      <div className="border-t border-white/[0.04] bg-black/20">
                        {rec.error && <div className="mx-4 my-2 rounded-lg border border-red-500/20 bg-red-900/20 p-3 font-mono text-xs text-red-400 break-all">{rec.error}</div>}
                        <div className="max-h-44 overflow-y-auto px-4 py-3 font-mono text-[11px] space-y-px">
                          {rec.logs.length === 0 && <p className="text-slate-700">Không có log</p>}
                          {rec.logs.map((log, i) => (
                            <div key={i} className={`flex gap-3 ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-slate-600'}`}>
                              <span className="shrink-0 text-slate-700">{fmtT(log.timestamp)}</span>
                              <span className="break-all">{log.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card sub-components ────────────────────────────────────────────────────────

function SidebarItem({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all ${
        active ? 'bg-purple-500/10 text-white font-medium' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
      }`}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className={`ml-1 shrink-0 text-[10px] ${active ? 'text-purple-400' : 'text-slate-700'}`}>{count}</span>
      )}
    </button>
  )
}

function ScriptCard({ script, execStatus, onOpen, onDelete }: {
  script: AutomationScript
  execStatus?: string
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 hover:border-purple-500/25 hover:bg-white/[0.04] transition-all cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/15 text-xl">
          ⌨
        </div>
        <div className="flex items-center gap-1.5">
          {execStatus && execStatus !== 'idle' && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              execStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              execStatus === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>{execStatus === 'success' ? 'OK' : execStatus === 'error' ? 'Lỗi' : '●'}</span>
          )}
          <span className="rounded-full border border-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400">Mã JS</span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-white mb-1 truncate">{script.name}</h3>
      <p className="text-xs text-slate-600 mb-3 line-clamp-2 min-h-[2rem]">{script.description || 'Không có mô tả'}</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-700">{fmtDT(script.updatedAt)}</span>
        <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="rounded-md border border-white/[0.07] px-2 py-1 text-[10px] text-slate-600 hover:border-red-500/20 hover:text-red-400 transition-colors"
          >Xóa</button>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen() }}
            className="rounded-md bg-[#7C3AED]/70 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#7C3AED] transition-colors"
          >Mở →</button>
        </div>
      </div>
    </div>
  )
}

function TemplateCard({ tpl, onClick }: { tpl: ScriptTemplate; onClick: () => void }) {
  return (
    <div
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 hover:border-purple-500/20 hover:bg-white/[0.035] transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] text-xl group-hover:bg-[#8B5CF6]/10 group-hover:border-purple-500/15 transition-all">
          {tpl.icon}
        </div>
        <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-slate-600 group-hover:border-purple-500/20 group-hover:text-purple-400 transition-colors">Mẫu</span>
      </div>
      <h3 className="text-sm font-medium text-slate-300 mb-1 truncate group-hover:text-white transition-colors">{tpl.name}</h3>
      <p className="text-xs text-slate-600 line-clamp-2 min-h-[2rem] mb-3">{tpl.description}</p>
      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-purple-400 font-medium">+ Tạo từ mẫu này →</span>
      </div>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-24 text-slate-700">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-purple-500/10 bg-purple-500/[0.05] text-4xl">⌨</div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-slate-500">Chưa có quy trình nào</p>
        <p className="text-xs text-slate-700">Tạo script mới hoặc chọn mẫu bên trái</p>
      </div>
      <button onClick={onNew} className="rounded-lg bg-[#7C3AED] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#8B5CF6] transition-colors">+ Thêm quy trình mới</button>
    </div>
  )
}
