# DESIGN.md — Zenvy Browser (AI-Optimized)

## 1. Design Philosophy

Zenvy Browser is a **premium browser management dashboard**.

Core principles:

* Dense, efficient, operator-first UI (not marketing UI)
* Modern, high-tech, slightly futuristic feel
* Strong visual hierarchy for fast scanning
* Consistency > creativity
* Compact > spacious

Avoid:

* Oversized cards
* Excessive whitespace
* Random styles

---

## 2. Layout System

### Overall Structure

* Left sidebar (fixed)
* Secondary panel (group list)
* Main content area
* Top toolbar (dense actions)

### Density Rules

* Table rows: compact
* Toolbar: single-line when possible
* Actions always visible (no deep nesting)

---

## 3. Color System

### Base

* Background: #0D0B1A
* Surface: #13111F
* Border: rgba(139, 92, 246, 0.15)

### Brand

* Primary Gradient: #7C3AED → #9333EA
* Accent: #8B5CF6
* Accent Soft: #A78BFA

### Text

* Heading: #F8FAFC
* Body: #CBD5F5
* Muted: #94A3B8

### States

* Success: #10B981
* Danger: #EF4444
* Warning: #F59E0B

### Rules

* Never use colors outside this palette
* Purple is the dominant visual identity

---

## 4. Spacing System (STRICT)

* xs: 4px
* sm: 8px
* md: 12px
* lg: 16px
* xl: 20px
* 2xl: 24px

Rules:

* Use ONLY these values
* Prefer md / lg for most layouts

---

## 5. Typography

* Font: Inter

### Hierarchy

* Title: text-lg font-semibold text-white
* Section: text-sm font-medium text-white
* Body: text-sm text-slate-300
* Meta: text-xs text-slate-400

Rules:

* Never mix font sizes randomly
* Always maintain hierarchy

---

## 6. Component System

### Cards

* Class: bg-surface/50 border border-purple-500/10 backdrop-blur-md rounded-xl
* Padding: p-4

### Buttons

Primary:

* bg-gradient-to-r from-violet-600 to-purple-600
* text-white text-sm font-medium
* px-4 py-2 rounded-lg
* hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]

Secondary:

* bg-white/5 border border-white/10
* text-slate-300

Danger:

* bg-red-500/10 text-red-400

Rules:

* All buttons same height
* No random padding

---

### Sidebar

* bg-[#0D0B1A]
* border-r border-purple-500/10
* width: fixed

Active item:

* bg-purple-500/10
* text-white

---

### Table

Rules:

* Compact rows
* Row hover: bg-white/5
* Border: subtle

Text hierarchy:

* Primary: white
* Secondary: muted

Actions:

* Always visible on right

---

### Badges

Open:

* bg-emerald-500/20 text-emerald-400

Closed:

* bg-red-500/20 text-red-400

---

## 7. Effects & Visual Style

### Glow

box-shadow: 0 0 40px rgba(139, 92, 246, 0.3)

### Glass

background: rgba(255,255,255,0.04)
backdrop-filter: blur(12px)

### Background

* Subtle purple radial gradients
* Optional noise overlay (low opacity)

Rules:

* Effects must be subtle
* Never overpower content

---

## 8. Interaction Rules

* Hover states required for all clickable elements
* Transitions: fast (150–200ms)
* No heavy animations

---

## 9. AI Rules (CRITICAL)

When generating UI:

* Always follow this DESIGN.md strictly
* Do NOT invent new colors
* Do NOT invent new spacing
* Do NOT change component structure
* Prefer compact layout
* Maintain consistency across all screens

---

## 10. Prompt Guide (for Claude)

Use this when working with AI:

"""
Use DESIGN.md as the single source of truth.

Refactor UI to match:

* color system
* spacing system
* typography
* components

Keep layout compact and consistent.
Do not change functionality.
"""

---

## 11. Design Intent Summary

Zenvy should feel like:

* A professional anti-detect browser tool
* Built for power users
* Fast, efficient, no distractions
* Premium but not flashy

Tone:

* Technical
* Precise
* Controlled


## Light Theme (SaaS Clean Mode)

### Core Philosophy
- Clean, neutral, low-noise
- High readability
- Minimal color usage
- No visual effects from dark mode

---

### Colors

Background: #F8FAFC
Surface: #FFFFFF
Surface Alt: #F1F5F9
Border: #E5E7EB

Primary: #7C3AED
Primary Hover: #6D28D9
Primary Soft: #F3F0FF

Text:
- Heading: #0F172A
- Body: #334155
- Muted: #94A3B8

States:
- Success: #10B981
- Danger: #EF4444
- Warning: #F59E0B

---

### STRICT RULES (VERY IMPORTANT)

- NO gradient backgrounds
- NO purple-tinted surfaces
- NO glow effects
- NO blur / glassmorphism
- Purple ONLY used for:
  - primary buttons
  - active states
  - highlights

---

## Components — Light Mode

### Sidebar
- bg-white
- border-r border-gray-200

Active item:
- bg-purple-50
- text-purple-600

Hover:
- bg-gray-50

---

### Cards
- bg-white
- border border-gray-200
- rounded-xl
- shadow-sm

Padding:
- p-4

---

### Table (CRITICAL)

Table container:
- bg-white
- border border-gray-200
- rounded-xl

Row:
- border-b border-gray-100

Hover:
- bg-gray-50

Text:
- Primary: text-gray-900
- Secondary: text-gray-500

---

### Buttons

Primary:
- bg-violet-600
- text-white
- px-4 py-2 rounded-lg text-sm font-medium

Hover:
- bg-violet-700

Secondary:
- bg-white
- border border-gray-300
- text-gray-700

Ghost:
- text-gray-600 hover:bg-gray-100

Danger:
- bg-red-50 text-red-600

---

### Inputs / Search

- bg-white
- border border-gray-300
- text-gray-800
- placeholder:text-gray-400

Focus:
- ring-2 ring-purple-500/20
- border-purple-500

---

### Badges

Open:
- bg-green-50 text-green-600

Closed:
- bg-red-50 text-red-600

---

### Toolbar

- bg-transparent
- gap-2
- keep single line if possible

---

## Effects (Light Mode)

Shadow only:
- shadow-sm
- shadow-md (rare)

NO:
- glow
- blur
- gradient overlays
- noise texture

---

## Visual Hierarchy

Priority:
1. Content
2. Actions
3. Metadata

Never:
- highlight everything
- use multiple strong colors

---

## AI Rules (Light Mode)

When rendering light UI:

- Convert all surfaces to white/neutral
- Remove ALL dark-mode effects
- Simplify visuals aggressively
- Increase readability and contrast
- Prefer clarity over style

If UI looks "fancy":
→ simplify it

If UI looks "boring but clean":
→ correct

