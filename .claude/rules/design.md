# Design System — Zenvy Browser

## Brand Assets
- App icon source: `resources/icons/faticon-logo.png` copied from `assets/faticon logo.png`.
- Renderer app icon source: `src/renderer/src/assets/brand/faticon-logo.png`.
- Sidebar full logo source: `src/renderer/src/assets/brand/logo.png` copied from `assets/logo.png`.
- Sidebar logo sits on a purple brand panel and should be large enough to be a first-viewport brand signal.

## UI Direction
- Keep the Zenvy purple/orange brand mood in both dark and light themes.
- Profile management should feel like an operational desktop dashboard:
  - left module sidebar.
  - separate profile group panel.
  - dense toolbar with search, filters and bulk actions.
  - compact data table with direct open/close actions.
- MKTLogin is a layout reference for density and workflow efficiency, not a visual theme to copy exactly. Light theme must stay bright, readable and purple-accented.
- Prefer compact controls and clear data hierarchy over large decorative cards.

## Màu sắc
```
Background:  #0D0B1A  (đen tím đậm)
Surface:     #13111F  (card/sidebar)
Border:      rgba(139, 92, 246, 0.15)
Primary:     #7C3AED → #9333EA  (gradient tím)
Accent:      #8B5CF6 / #A78BFA
Text:        #F8FAFC  (heading)
Text muted:  #94A3B8  (body)
Success:     #10B981
Danger:      #EF4444
```

## Effects
- **Glow**: `box-shadow: 0 0 40px rgba(139, 92, 246, 0.3)`
- **Glass card**: `background: rgba(255,255,255,0.04); backdrop-filter: blur(12px)`
- **Mesh background**: radial-gradient tím loang ở góc/trung tâm
- **Grain texture**: noise overlay opacity 0.03

## Tailwind classes hay dùng
- Card: `bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl`
- Button primary: `bg-gradient-to-r from-violet-600 to-purple-600 hover:shadow-purple`
- Sidebar: `bg-[#0D0B1A] border-r border-purple-500/10`
- Badge open: `bg-emerald-500/20 text-emerald-400`
- Badge closed: `bg-red-500/20 text-red-400`

## Typography
- Font: Inter (Google Fonts)
- Heading: font-semibold text-white
- Body: text-slate-300 text-sm
