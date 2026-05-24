# Flowboard — UI Design Brief

A flexible task management and calendar app designed for neurodivergent users who need structure without rigidity. The UI should feel calm, intentional, and uncluttered — a workspace that gives you control without overwhelming you.

---

## Design Principles

- **Flat and clean.** No gradients, no heavy drop shadows, no decorative noise. Borders and subtle background fills do the work.
- **Calm, not sterile.** The palette uses warm neutrals and purposeful color accents — not a sea of gray.
- **Color reinforces meaning, never replaces it.** Priority is always shown as both a color *and* a text label or icon.
- **Progressive disclosure.** Optional fields and secondary actions appear only when relevant.
- **Consistent density.** Task cards are compact on the board and in lists but have breathing room — not so dense that they feel stressful.

---

## Typography

System font stack throughout: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`

| Role | Size | Weight | Notes |
|---|---|---|---|
| App title / logo | 18px | 700 | "Flowboard" in nav |
| Page heading | 20px | 600 | Column headers, view titles |
| Section heading | 14px | 600 | Backlog group headers, stat labels — uppercase tracking optional |
| Body / task title | 14px | 400 | Default text size |
| Caption / meta | 12px | 400 | Dates, badges, counts |
| Monospace | system mono | 400 | Dates in exports only |

---

## Color System

### Light Mode Base Palette

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#FAFAF9` | App background |
| `bg-surface` | `#FFFFFF` | Cards, panels, modals |
| `bg-subtle` | `#F5F4F2` | Column backgrounds, input fills |
| `border` | `#E5E4E1` | All borders |
| `text-primary` | `#1A1917` | Main text |
| `text-secondary` | `#6B6963` | Meta, labels, placeholder |
| `text-disabled` | `#B0AFA9` | Disabled state text |
| `accent` | `#4F6EF7` | Focus rings, active nav items, primary buttons |

### Dark Mode Base Palette

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#18181B` | App background |
| `bg-surface` | `#222226` | Cards, panels, modals |
| `bg-subtle` | `#2C2C31` | Column backgrounds, input fills |
| `border` | `#35353B` | All borders |
| `text-primary` | `#F4F4F5` | Main text |
| `text-secondary` | `#9A9AA6` | Meta, labels, placeholder |
| `text-disabled` | `#52525B` | Disabled state text |
| `accent` | `#6B8AFF` | Focus rings, active nav items, primary buttons |

### Priority Color System

Priority is shown as a colored **left border** on task cards and as a **badge** in lists. The text label is always shown alongside the color.

| Priority | Label | Light mode | Dark mode |
|---|---|---|---|
| `must_do` | Must Do | Warm coral — `#E85C4A` | `#FF7B6B` |
| `can_wait` | Can Wait | Neutral gray — `#9E9D97` | `#6E6E78` |
| `fun` | Fun | Teal green — `#2BA88A` | `#3DC4A5` |

Priority left-border width: **3px**, flush with the card's left edge, full card height.

### Project Color Palette (24 fixed colors)

Users pick one of these for each project. Shown as small filled circles (10–12px diameter) on task cards, and as larger swatches in the color picker.

These 24 colors should work well in both light and dark mode as small dots/badges — rich but not garish:

`#E85C4A` `#F5874A` `#F5B942` `#A8C94A`  
`#4AB87A` `#2BA88A` `#42B8C4` `#4A8CF5`  
`#6B6BF5` `#9B6BF5` `#C46BF5` `#E85CB8`  
`#C4415A` `#D97A40` `#C4A840` `#7DA840`  
`#3D9E6B` `#3D8E7A` `#3D8EA8` `#3D6EC4`  
`#5B5BC4` `#8B5BC4` `#B05BB8` `#C45888`

---

## Screens to Design

### 1. Login Page (`/login`)

Full-page centered card on a neutral background.

- "Flowboard" heading
- Username field
- Password field
- "Sign in" primary button
- "Forgot password?" small link below the button
- Inline error state: "Invalid username or password." displayed below the form
- Rate-limited state: "Too many attempts. Try again in X minutes."

---

### 2. Forgot Password Page (`/forgot-password`)

Same centered-card layout as login.

- Heading: "Reset your password"
- Email field
- "Send reset link" button
- Success state: "If that email is on file, a reset link is on its way." (neutral, not confirming existence)
- Back to login link

---

### 3. Reset Password Page (`/reset-password`)

Same centered-card layout.

- Heading: "Choose a new password"
- New password field
- Confirm password field
- "Set password" button
- Error states: mismatched passwords; expired/invalid token (full-page error message with link back to forgot-password)

---

### 4. Board View (Primary View)

The most important screen. All the design energy should go here.

**Layout (desktop):**
```
┌─────────────────────────────────────────────────────────────┐
│  Nav bar (full width)                                       │
├─────────────────────────────────────────────────────────────┤
│  Today banner: "Friday, May 23 · 2 appointments"           │
│  Filter bar                                                  │
├──────────────────────────────────────┬──────────────────────┤
│  Board columns (4 cols when          │  Backlog panel       │
│  appointments exist, 3 when not)     │  (right side, ~280px)│
│                                      │                      │
│  [Appointments] [Up Next] [In Prog]  │  [Project filter]   │
│  [Done]                              │  [Grouped task list] │
└──────────────────────────────────────┴──────────────────────┘
```

**Board columns:**
- Column header: column name (bold) + task count badge + column-specific action ("Clear Done" on Done column)
- Column body: subtle background fill (`bg-subtle`), rounded, slight inset feel
- Columns have equal width; they can scroll vertically if content overflows

**Task card (board):**
- White surface, 1px border, 4px border-radius
- Left border 3px in priority color
- Title (14px, regular weight) — truncates at 2 lines
- Row below title: priority badge (text + color dot) · project color dot + project name · date (if set) · recurrence indicator (↻ + label, e.g., "Daily") · time (if timed event)
- Drag handle visible on hover (⠿ or ⋮⋮ grip icon, left side)
- Subtle hover state: slightly elevated shadow or border darkened
- "Today" chip on display-promoted backlog tasks in Up Next (small, muted, e.g., a light outline chip)

**Appointments column:**
- Only visible when today has appointments
- Each card shows time range prominently (e.g., "10:00 – 11:00") above the title
- No drag handle (not draggable)

**Done column:**
- Tasks appear slightly muted (lower opacity title, or a strikethrough on title — choose one, not both)
- Footer when >50 tasks: "and N more · Clear Done to archive" in small muted text

**Filter bar:**
- Sits between the today banner and the board columns
- Pill/chip buttons for each priority and each project
- Active chips: filled background in the relevant color (priority) or project color; inactive: outlined
- "Recurring only" toggle: a small switch or outline chip
- "Clear filters" text link, only visible when filters are active
- Compact, single-row on desktop; wraps gracefully on smaller screens

**Today banner:**
- Subtle, full-width strip above the filter bar
- Muted text: current day and date · appointment count (hidden when 0)

---

### 5. Backlog Panel

Attached to the right side of the board. Default open. Toggled by the ⊞ icon in the top nav.

- Panel width: ~280–300px, fixed, doesn't scroll with the board
- Header: "Backlog" label · "+ task" button · project dropdown filter
- Body: projects as collapsible sections
  - Section header: project color dot + project name + count, collapse arrow
  - Each task: title (truncated at 1 line) · priority left-border-dot · recurrence ↻ indicator · "→ board" button (appears on hover)
- Panel border: left border separating it from the board
- Empty state: "No backlog tasks" centered in the panel
- Collapsed state (panel hidden): just the ⊞ icon remains clickable in the nav

---

### 6. Task Detail Modal

Opens over any view. Centered, ~560px wide on desktop.

- **Backdrop:** semi-transparent dark overlay
- **Modal card:** white surface, 8px border-radius, subtle shadow
- **Header:** task title (large editable inline text, 18px), close (×) button top-right
- **Body (two-column on desktop, single-column on mobile):**
  - Left/main column: title (already in header), description field (progressive disclosure — collapsed "+ Add description" link until clicked or content exists)
  - Right/sidebar column: Project dropdown · Priority toggle (3 buttons) · Status toggle (4 buttons) · Date picker · Time pickers (start + end, indented under date) · Recurring dropdown (with custom rule builder when "Custom" selected)
- **Footer:** "Delete" button (destructive, left-aligned) · "Save" primary button (right-aligned)
- **Unsaved changes guard:** if dirty and user clicks backdrop, show inline confirmation: "Discard unsaved changes?" with "Keep editing" and "Discard" buttons — not a browser `confirm()` dialog

**Priority toggle (3 buttons):**  
Segmented control. Selected state: filled background with priority color. Unselected: outlined.

**Status toggle (4 buttons):**  
Segmented control. Backlog / Up Next / In Progress / Done.

**Recurring dropdown + custom rule builder:**  
When "Custom" is selected, an inline section expands below the dropdown showing: frequency selector, interval input ("every N ___"), optional days-of-week pill grid, optional day/week-of-month selectors, end condition (radio: Never / On date / After N occurrences).

---

### 7. New Task Form

Functionally identical to the Task Detail Modal but without the Delete button. Can be displayed as the same modal component with a different mode.

---

### 8. Weekly Calendar View (`/week`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Nav bar                                                    │
├─────────────────────────────────────────────────────────────┤
│  Week nav: ← May 18–24, 2026 → [Today]                     │
├──────┬──────┬──────┬──────┬──────┬──────┬──────────────────┤
│ Sun  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat              │
│  18  │  19  │  20  │  21  │  22  │  23  │  24              │
├──────┼──────┼──────┼──────┼──────┼──────┼──────────────────┤
│Timed │      │      │      │      │ 9am  │                  │
│      │      │      │      │      │[Mtg] │                  │
│ sec- │      │      │      │      │      │                  │
│ tion │      │      │      │      │      │                  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────────────────┤
│All-  │[task]│      │[task]│      │[task]│                  │
│day   │      │      │[task]│      │      │                  │
│sect. │      │      │      │      │      │                  │
└──────┴──────┴──────┴──────┴──────┴──────┴──────────────────┘
```

- Today's column: subtly highlighted background (slightly warmer/cooler than siblings)
- Column header: day name + date number; today's date number bold or circled
- **Timed section** (top, fixed ~180px height): task chips show time + truncated title; overlapping events are rendered side-by-side at reduced width; hover shows full title
- **All-day section** (bottom, scrollable): task chips show title only; priority left-border
- Task chips: compact pill/card shape with priority left-border color, project color dot
- Drag state: dragged chip becomes semi-transparent; target column highlighted

---

### 9. Monthly Calendar View (`/month`)

**Desktop layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← May 2026 → [Today]                                      │
├──────┬──────┬──────┬──────┬──────┬──────┬──────────────────┤
│ Sun  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat              │
├──────┼──────┼──────┼──────┼──────┼──────┼──────────────────┤
│  26  │  27  │  28  │  29  │  30  │   1  │   2              │
│      │      │      │      │      │      │                  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────────────────┤
│   3  │   4  │   5  │  ...                                  │
│[task]│      │[task]│                                       │
│[task]│      │+2more│                                       │
└──────┴──────┴──────┴──────┴──────┴──────┴──────────────────┘
```

- Task chips inside day cells: very compact — truncated title, priority left-border color, tiny project dot
- "+ N more" indicator: small muted link; clicking expands the cell (or shows a popover) with all tasks
- Today's cell: highlighted border or background
- Prev/next month: grayed-out dates from adjacent months visible in the grid
- Clicking anywhere on a day (not a chip) → **day detail popover**: floating panel listing all tasks for that day + "+ task" button
- Read-only — no drag-and-drop indicators needed

**Mobile layout:**
- Top half: compact dot-indicator grid (each day cell shows up to 3 colored dots; priority colors)
- Bottom half: scrollable agenda list for the selected day
- Tapping a day in the grid scrolls/jumps the agenda to that date
- Agenda items: full task title, priority left-border, time if timed event

---

### 10. All Tasks View (`/tasks`)

- Full-width list layout
- Filter bar (same component as Board view)
- Group headers: project name + color dot + count, or status name + count (depending on toggle)
- Collapsible groups (chevron arrow)
- Each row: priority left-border (3px) · title · status badge (outlined chip) · priority badge · date (if any) · ↻ if recurring
- "Show archived" toggle in view header, right-aligned; archived tasks shown with muted styling and an "Archived" badge
- Clicking a row opens Task Detail Modal
- Empty state per group: "No tasks" in muted text

---

### 11. Projects List View (`/projects`)

- Grid or list of project cards
- Each card: project color swatch (larger, e.g., 24px circle or left color bar) · project name · task count · description excerpt · edit / archive / delete actions (in a ··· menu or revealed on hover)
- "New project" button, prominent, top-right
- Archived projects: collapsed "Archived projects" section at the bottom, expandable

**Color picker (in new/edit project form):**
- 24 color swatches in a grid (4 columns × 6 rows or 6×4)
- Selected swatch: checkmark overlay or ring border
- No free-text input — swatches only

---

### 12. Project Detail View (`/projects/[id]`)

- Page header: project color dot + project name (editable inline) · archive / delete actions
- Description: editable inline below the header; "Add a description..." placeholder; saved on blur
- Stats bar: `N tasks total` · `N in progress` · `N in backlog` — small, muted
- **Backlog section:** vertical drag-to-reorder list; same card style as backlog panel but full width; drag handle visible on hover
- **Board section:** three grouped sub-lists (Up Next / In Progress / Done) — read-only order, no drag-to-reorder here

---

### 13. Settings Page (`/settings`)

- Simple vertical form, max ~640px wide, centered
- Section headings: "Preferences", "Data"
- **Week start day:** two-button toggle (Sunday / Monday)
- **Default view:** three-button toggle (Board / Week / Month)
- **Default project:** dropdown of active projects + "None" option
- **Export:** two buttons side-by-side — "Export as JSON" and "Export as CSV" — with a brief description of what's included
- **Clear completed tasks:** number input ("older than ___ days") + "Clear archived tasks" button (destructive); confirmation dialog before executing

---

## Components Inventory

These are the discrete reusable pieces the design needs to cover:

| Component | Key states |
|---|---|
| Task card (board) | Default, hover, dragging, priority variants (3), done/muted |
| Task card (calendar chip) | Timed, all-day, compact (monthly), priority variants |
| Task row (list views) | Default, hover, archived |
| Priority toggle | 3 states (must_do selected, can_wait selected, fun selected) |
| Status toggle | 4 states |
| Priority badge | 3 variants (text + color) |
| Project color dot | Small (12px, on cards), medium (20px, in lists) |
| Recurrence indicator | ↻ icon + frequency label |
| Filter chip | Active (filled), inactive (outlined), priority variants, project variants |
| Column (board) | With tasks, empty, Appointments variant, Done variant |
| Backlog panel | Open with tasks, open empty, collapsed |
| Task Detail Modal | Default, edit mode, recurring-edit prompt |
| Day detail popover (monthly) | With tasks, empty state |
| Recurring custom rule builder | All frequency types |
| Color picker (project) | 24 swatches, selected state |
| Confirmation dialog | Destructive action (delete), discard changes |
| Toast notification | Completion ("next due…"), auto-archive, success |
| Today banner | With appointment count, without (0 appointments) |
| Navigation bar | Desktop, mobile (bottom tab bar) |
| Backlog section header | Expanded, collapsed |
| Overflow indicator | "+ N more" in monthly calendar |
| Stats bar | Project detail |
| Empty state | Board columns, backlog panel, list views |

---

## Navigation

**Desktop top nav (full width bar):**
```
[Flowboard]  Board  Week  Month  All Tasks  Projects       [+]  [⊞]  [⚙]
```
- Left: logo + primary nav links
- Right: new task (+), backlog toggle (⊞, Board view only), settings (⚙)
- Active nav item: accent color underline or filled pill
- ⊞ icon: visually indicates open/closed state of the backlog panel

**Mobile bottom tab bar:**
```
[Board]  [Week]  [Month]  [All Tasks]  [Projects]
```
- Icon + label for each tab
- Active tab: accent color icon and label
- Floating "+" button (FAB) above the tab bar for new task, or include it as a sixth tab item

---

## Interaction Patterns

**Drag and drop:**
- Drag handle: appears on hover, left side of card
- Dragging card: semi-transparent ghost, slight rotation
- Drop target: highlighted with an accent-colored insertion line or column highlight
- Invalid drop zone (e.g., Appointments column): no highlight, cursor changes to "not-allowed"

**Progressive disclosure (description field):**
- State 1 (no description): "+ Add description" link in muted text
- State 2 (focus/writing): multiline textarea, auto-focus
- State 3 (content exists, not focused): rendered text, click to edit
- State 4 (content cleared, blurred): snaps back to State 1

**Unsaved changes guard:**
- Appears inline within the modal (not a browser dialog)
- "Discard unsaved changes?" + "Keep editing" + "Discard" buttons
- "Keep editing" is the default-focus button (prevents accidental discard)

**Recurring edit prompt:**
- Appears as an inline step within the modal when a recurring task is first edited
- Two clear options: "This occurrence only" / "All future occurrences"
- Cancel option returns to the unmodified task

**Toasts:**
- Non-blocking, bottom-right corner on desktop; bottom-center on mobile
- Auto-dismiss after ~4 seconds
- Types: neutral (info), success, warning
- Example: "Completed — next due Monday, May 26"

---

## Responsive Breakpoints

| Breakpoint | Width | Layout changes |
|---|---|---|
| Mobile | < 640px | Bottom tab bar; single-column board (horizontal scroll or stacked); backlog as full-screen overlay; monthly calendar switches to dot-indicator + agenda |
| Tablet | 640px–1024px | Top nav retained; backlog panel as side-drawer overlay; calendar grid compresses column widths |
| Desktop | > 1024px | Full multi-column board; backlog panel fixed right side; full calendar grid |

---

## Accessibility Notes for Design

- All icon-only buttons must have a visible tooltip or accessible label (⊞, +, ⚙, ←, →, ×)
- Focus rings must be visible and use the accent color — never removed
- Color is never the sole differentiator: priority always has text + color; status always has text
- Modals must visually trap focus (backdrop should be inert)
- Sufficient contrast: body text on all backgrounds must meet WCAG AA (4.5:1); large text / UI components 3:1

---

## Tone & Personality

Flowboard is a personal, calm tool. The UI should feel like a well-organized desk — not a command center, not a social feed. Think:
- Notion's restraint without Notion's complexity
- Linear's clarity without Linear's startup-company energy
- A tool that gets out of the way and lets you think

Avoid: bright call-to-action banners, gamification elements, celebratory animations (no confetti), aggressive onboarding flows.
