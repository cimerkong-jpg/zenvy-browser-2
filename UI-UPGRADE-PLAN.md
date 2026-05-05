# 🎨 UI UPGRADE PLAN - Zenvy Browser

**Mục tiêu:** Nâng cấp UI lên product-level quality (Linear/Notion style)

---

## 📋 PRIORITY ORDER

### 1. Profile Table (HIGHEST PRIORITY) ⭐⭐⭐
**File:** `src/renderer/src/components/ProfileRow.tsx`

**Cần làm:**
- [ ] Clean layout với spacing tốt hơn
- [ ] Keep ID column (quan trọng)
- [ ] Status badges color-coded (Đang mở / Đã đóng)
- [ ] Proxy format ngắn gọn (chỉ hiện host:port)
- [ ] Action buttons: [Open] + dropdown (...)
- [ ] Font size nhỏ hơn (12-13px)
- [ ] Easy to scan

**Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ ID    Name          Proxy           Status    Actions       │
├─────────────────────────────────────────────────────────────┤
│ 1001  FB Account 1  proxy.com:8080  🟢 Mở     [Open] [...]  │
│ 1002  FB Account 2  -               ⚫ Đóng    [Open] [...]  │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Create/Edit Profile Modal ⭐⭐
**File:** `src/renderer/src/components/ProfileModal.tsx`

**Cần làm:**
- [ ] Split thành tabs: Basic / Proxy / Advanced
- [ ] Add placeholders cho inputs
- [ ] Add helper text tiếng Việt
- [ ] Add profile templates (Facebook, Gmail, TikTok)

**Design:**
```
┌─────────────────────────────────────┐
│  Tạo Profile Mới                    │
├─────────────────────────────────────┤
│  [Basic] [Proxy] [Advanced]         │
│                                     │
│  Templates:                         │
│  [Facebook] [Gmail] [TikTok]        │
│                                     │
│  Tên profile:                       │
│  [________________]                 │
│  Ví dụ: FB Account 1                │
│                                     │
│  Ghi chú:                           │
│  [________________]                 │
│  Mô tả ngắn về profile này          │
│                                     │
│         [Hủy]  [Tạo Profile]        │
└─────────────────────────────────────┘
```

---

### 3. Empty State ⭐⭐
**File:** `src/renderer/src/pages/ProfilesPage.tsx`

**Cần làm:**
- [ ] Show message khi chưa có profiles
- [ ] Add button "Tạo profile đầu tiên"
- [ ] Icon + text friendly

**Design:**
```
┌─────────────────────────────────────┐
│                                     │
│           📁                        │
│                                     │
│     Chưa có profile nào             │
│                                     │
│  Tạo profile đầu tiên để bắt đầu   │
│                                     │
│     [+ Tạo Profile Đầu Tiên]        │
│                                     │
└─────────────────────────────────────┘
```

---

### 4. Error UI ⭐
**File:** Tạo `src/renderer/src/components/ErrorMessage.tsx`

**Cần làm:**
- [ ] Replace alert() với UI component
- [ ] Show actionable message
- [ ] Include "what to do next"

**Design:**
```
┌─────────────────────────────────────┐
│  ❌ Không thể mở profile            │
│                                     │
│  Chrome không tồn tại tại:          │
│  /Applications/Chrome.app           │
│                                     │
│  📍 Cách fix:                       │
│  1. Vào Settings                    │
│  2. Chọn Chrome                     │
│                                     │
│     [Đóng]  [Mở Settings]           │
└─────────────────────────────────────┘
```

---

### 5. Loading State ⭐
**File:** `src/renderer/src/components/ProfileRow.tsx`

**Cần làm:**
- [ ] Add spinner khi opening profile
- [ ] Disable button khi đang load
- [ ] Show feedback

**Design:**
```
[Opening...] ⏳  (disabled, with spinner)
```

---

## 🎨 DESIGN SYSTEM

### Colors:
```css
Background: #0B0B0F
Card: #111218
Border: #1F2230
Primary: #7C3AED (purple)
Success: #10B981 (green)
Error: #EF4444 (red)
Text: #E5E7EB
Text Secondary: #9CA3AF
```

### Typography:
```css
Heading: 16px, font-semibold
Body: 13px, font-normal
Small: 12px, font-normal
```

### Spacing:
```css
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 24px
```

### Components:
```css
Button: rounded-md, px-3, py-1.5, text-sm
Badge: rounded-full, px-2, py-0.5, text-xs
Input: rounded-md, px-3, py-2, text-sm
Card: rounded-lg, p-4
```

---

## 📝 IMPLEMENTATION PLAN

### Phase 1: Profile Table (1-2 hours)
1. Update ProfileRow component
2. Add status badges
3. Improve layout & spacing
4. Add loading state

### Phase 2: Empty State (30 min)
1. Add EmptyState component
2. Update ProfilesPage to show when empty

### Phase 3: Profile Modal (1-2 hours)
1. Add tabs (Basic/Proxy/Advanced)
2. Add templates
3. Add placeholders & helper text

### Phase 4: Error UI (30 min)
1. Create ErrorMessage component
2. Replace all alert() calls

### Phase 5: Loading State (30 min)
1. Add loading indicators
2. Disable buttons when loading

---

## ✅ SUCCESS CRITERIA

**Profile Table:**
- ✅ Easy to scan (clear hierarchy)
- ✅ Status visible at a glance
- ✅ Actions easy to find
- ✅ Professional look

**Modal:**
- ✅ Easy to understand
- ✅ Templates save time
- ✅ Helper text guides user

**Empty State:**
- ✅ Friendly, not intimidating
- ✅ Clear call-to-action

**Error UI:**
- ✅ User knows what went wrong
- ✅ User knows how to fix
- ✅ No confusion

**Loading:**
- ✅ User knows something is happening
- ✅ No accidental double-clicks

---

## 🚫 WHAT NOT TO DO

❌ Don't change backend logic  
❌ Don't break working features  
❌ Don't add new features  
❌ Don't overcomplicate  
❌ Don't use too many colors  
❌ Don't make it cluttered  

✅ Only improve UI/UX  
✅ Keep it simple  
✅ Make it professional  
✅ Easy for beginners  

---

**Ready to start implementation!** 🚀
