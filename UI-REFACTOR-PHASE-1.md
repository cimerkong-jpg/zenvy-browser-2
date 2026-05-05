# UI Refactor Phase 1: Sidebar + Group Panel

## 🎯 Goals:
- Clean, modern SaaS 1.0 style (Linear/Notion/Arc)
- Keep all auth/profile logic intact
- Only update visual design

---

## 📋 Changes:

### Sidebar:
- ✅ Cleaner navigation items
- ✅ Better active state (bg-white/10)
- ✅ Brighter icons when active
- ✅ Compact account section
- ✅ Smaller logout button (not too red)
- ✅ Compact theme switcher

### Group Panel:
- ✅ Folder-style list
- ✅ Show count on right
- ✅ Clear active state
- ✅ "..." menu on hover only
- ✅ "+ Mới" button in header
- ✅ Less purple, more clean

---

## 🎨 Design System:

### Colors:
```css
Background: #0B0B0F
Card: #111218
Border: #1F2230
Primary: #7C3AED
Hover: #8B5CF6
Text main: #E5E7EB
Text secondary: #9CA3AF
```

### Rules:
- NO purple backgrounds
- Purple only for buttons/active/highlight
- Clean, minimal borders
- 8px spacing system

---

## 📁 Files to Update:

1. `src/renderer/src/components/Sidebar.tsx`
2. `src/renderer/src/pages/ProfilesPage.tsx` (group panel section)
3. `src/renderer/src/assets/globals.css` (if needed)

---

## ✅ Testing:

After changes:
1. Run `npm start`
2. Check no errors
3. Verify auth still works
4. Verify navigation works
5. Verify group panel works

---

**Status:** Starting implementation...
