# Flowboard — Requirements

A flexible task management and calendar app designed for neurodivergent users who need structure without rigidity. Think Jira's board + Apple Calendar's time awareness, combined with a backlog system, energy-sensitive filtering, and project-level visibility.

---

## Tech Stack

- **Framework:** Next.js + TypeScript
- **Rendering:** Standard Next.js (App Router) with server-side API routes / server actions
- **Storage:** Postgres — local instance for development, production instance for deployment
- **Auth:** Auth.js (credentials provider — username + password + email recovery via Resend)
- **Email:** Resend (password reset only)

---

## Core Philosophy

- **No forced time-boxing.** Most tasks are date-optional. Dates are for visibility, not enforcement.
- **Always have options.** Filtering surfaces tasks that match your current capacity — never hides everything.
- **Projects are first-class.** Every task belongs to a project. Projects have backlogs. Backlogs are browsable and pluckable.
- **The board is intentional.** Only tasks you've consciously pulled in show on the board. Everything else waits patiently in the backlog.
- **Calendar is additive.** Time-specific items (meetings, appointments) show up automatically in the right places, but don't pollute the backlog or general task flow.

---

## 1. Authentication

This is a single-user app. There is no public signup — the account is created once via a seed script or environment-configured setup step.

**Login:** username + password form. Session managed by Auth.js (credentials provider).

**Password recovery:** "Forgot password?" link on the login page sends a time-limited reset link to the account email via Resend. Link expires after 1 hour.

**Session:** persistent login (stays logged in across browser sessions until explicit logout). All routes except `/login` and `/reset-password` are protected — unauthenticated requests redirect to `/login`.

---

## 2. Data Model

### Task

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | Auto-generated |
| `title` | string | yes | |
| `project_id` | uuid | yes | Every task belongs to a project |
| `priority` | enum | yes | `must_do`, `can_wait`, `fun` |
| `status` | enum | yes | `backlog`, `up_next`, `in_progress`, `done` — `backlog` implies the task lives in the project backlog vs. the active board |
| `is_archived` | boolean | yes | When true, excluded from all active views; visible in All Tasks with a filter toggle |
| `date` | date | no | Optional. Surfaces the task on calendar views for that day |
| `time_start` | time | no | If set alongside `date`, task becomes a **time-specific event** |
| `time_end` | time | no | Optional end time for events |
| `is_recurring` | boolean | yes | Recurrence requires `date` to be set — the toggle is disabled without a date |
| `recurrence_rule` | object | no | See Recurrence section |
| `recurring_master_id` | uuid | no | Set on exception records only — references the master recurring task |
| `recurring_occurrence_date` | date | no | Set on exception records only — identifies which occurrence this overrides |
| `notes` | string | no | Free text |
| `created_at` | timestamp | yes | |
| `updated_at` | timestamp | yes | |

**Time-specific event:** a task where both `date` AND `time_start` are set. These render differently from date-only tasks throughout the app.

### Priority Values

| Value | Label | Intent |
|---|---|---|
| `must_do` | Must Do | Non-negotiable for today; deadlines, appointments, critical work |
| `can_wait` | Can Wait | Important but deferrable if energy is low |
| `fun` | Fun | Enjoyable, low-stakes; good for low-energy or reward moments |

### Project

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | |
| `color` | string (hex) | Used for tag badges throughout the app |
| `description` | string | Optional |
| `is_archived` | boolean | Archived projects hidden from active views |
| `created_at` | timestamp | |

### Recurrence Rule

Stored as a structured object on the task:

```json
{
  "frequency": "daily" | "weekly" | "monthly" | "custom",
  "interval": 1,
  "days_of_week": ["mon", "wed", "fri"],
  "day_of_month": 15,
  "ends": null | { "on_date": "2025-12-31" } | { "after_occurrences": 10 }
}
```

When a recurring task is marked `done`, it resets to `up_next` (or `backlog` if `status` was `backlog`) and advances its `date` to the next occurrence.

---

## 3. Views

### 3.1 Board View (default)

The active workspace. Shows only tasks where `status != backlog` and `is_archived = false`.

**Columns (left to right):**

1. **Appointments** — auto-populated with time-specific events (`date = today` AND `time_start` is set). Sorted by `time_start`. This column is always present when there are appointments today; hidden otherwise. Not manually editable from this column — managed via task detail.
2. **Up Next** — tasks ready to be worked on
3. **In Progress** — tasks actively being worked on
4. **Done** — all non-archived tasks with `status = done`. A "Clear Done" action in this column archives all done tasks (`is_archived = true`), removing them from active views.

**Behavior:**
- Tasks in the Appointments column also appear in whatever their current workflow status column is (In Progress, Up Next, etc.) **only if they are not time-specific events**. Time-specific events live exclusively in the Appointments column on the board.
- Drag-and-drop between workflow columns (Up Next ↔ In Progress ↔ Done) is supported.
- Tasks cannot be dragged into or out of the Appointments column manually.
- A "Today" date banner above the board shows the current date and a count of appointments.

**Filtering (always visible above the board):**

- **Priority filter:** `Must Do`, `Can Wait`, `Fun` — multi-select chips. Selecting one or more shows only matching tasks. Filtering applies to all columns except Appointments (appointments always show).
- **Project filter:** one chip per project — multi-select.
- **Recurring filter:** toggle to show only recurring tasks.
- Filters are additive (AND logic within a type, OR logic within multi-select of same type).
- A "Clear filters" control resets all active filters.
- Filter state persists within a session.

### 3.2 Backlog View (side panel, toggleable)

A persistent right-side panel visible alongside the Board view. Can be toggled open/closed.

**Contents:** all tasks where `status = backlog` and `is_archived = false`, regardless of `date`.

**Layout:**
- Grouped by project (collapsible sections per project).
- A project dropdown at the top of the panel filters to a single project's backlog.
- Each item shows: title, priority badge, project tag, recurrence indicator.
- A "→ board" action on each item sets status to `up_next`, moving it out of the backlog.
- A "+ task" button in the panel header opens the new task form pre-set to backlog mode.

### 3.3 All Tasks View

Accessed from the top navigation. A flat list of every task in the system.

**Features:**
- Grouped by project (collapsible).
- Each task shows: title, status, priority, date (if any), recurrence.
- Same filter bar as the Board view.
- Clicking a task opens its detail/edit modal.
- A secondary grouping toggle: by project (default) or by status.

### 3.4 Weekly Calendar View

Accessed from the top navigation. A 7-column grid, one column per day, spanning the current week (Mon–Sun or Sun–Sat, user-configurable).

**Each day column contains two sections:**

1. **Timed events** (top section, fixed height): tasks with `date` matching that day AND `time_start` set. Shown as time-block chips in chronological order. Overlapping events shown side by side.
2. **All-day / date tasks** (bottom section, scrollable): tasks with `date` matching that day but no `time_start`. Sorted by priority (`must_do` first, then `can_wait`, then `fun`).

**Navigation:** prev/next week arrows, a "Today" button to jump back to current week.

**Interaction:**
- Clicking a timed event or date task opens its detail modal.
- Clicking an empty slot in a day column opens the new task form with that date pre-filled (and `time_start` if clicking within the timed section).
- Tasks can be dragged between day columns to change their `date`. For timed events, `time_start` and `time_end` are preserved — only the date changes.

**Visual cues:**
- Today's column is subtly highlighted.
- Priority is shown via a colored left-border on each task chip (`must_do` = red-adjacent, `can_wait` = neutral, `fun` = teal-adjacent).
- Project color shown as a small dot or tag.

### 3.5 Monthly Calendar View

Accessed from the top navigation. A standard monthly grid.

**Each day cell shows:**
- Timed events as compact chips (time + truncated title), sorted by time.
- Date tasks as compact chips (title only, priority-colored left border).
- If a day has more items than fit, a "+ N more" overflow indicator expands on click to show all.

**Navigation:** prev/next month arrows, "Today" button.

**Interaction:**
- Clicking a day cell opens a day detail popover listing all tasks and events for that day, with links to each task's detail modal.
- Clicking an empty area of a day cell opens the new task form with that date pre-filled.

---

## 4. Task Detail Modal

Opened by clicking any task in any view. A modal overlay (not a full-page navigation).

**Fields:**

- **Title** — editable inline text field
- **Project** — dropdown
- **Priority** — three-button toggle: Must Do / Can Wait / Fun
- **Status** — four-button toggle: Backlog / Up Next / In Progress / Done. Setting to Backlog moves the task out of the active board; setting to any other status moves it onto the board.
- **Date** — optional date picker. Clearing the date removes calendar placement.
- **Time** — optional start + end time. Only available when a date is set. Setting a time makes this a time-specific event.
- **Recurring** — dropdown: One-time / Daily / Weekly / Monthly / Custom. Custom opens a simple rule builder (days of week, interval, end condition).
- **Notes** — multiline text area
- **Delete** — with confirmation ("Delete task?" / Confirm / Cancel)

**Save behavior:** changes are saved on explicit "Save" click. Modal can be dismissed without saving via Cancel or clicking outside.

---

## 5. New Task Form

Opened from:
- The `+` button in the top nav (defaults to board mode, today's date)
- The `+` button in the backlog panel header (defaults to backlog mode)
- Clicking an empty day slot in Weekly or Monthly view (pre-fills date/time)

**Fields:** same as Task Detail Modal, minus the delete control.

**Smart defaults:**
- `project` defaults to the last-used project (persisted in local storage)
- `priority` defaults to `can_wait`
- `status` defaults to `backlog` when entering from the backlog panel header, otherwise `up_next`
- `date` pre-filled when entering from a calendar view slot

---

## 6. Recurrence Behavior

- Recurrence requires `date` to be set. The recurrence toggle is disabled in the task form until a date is provided.
- Recurring tasks display a recurrence indicator (↻ icon + frequency label) on all task cards.
- When a recurring task is marked `done`:
  - Its `status` resets to `up_next` (or `backlog` if status was `backlog`).
  - Its `date` advances to the next occurrence date based on the recurrence rule.
  - A brief "Completed — next due [date]" confirmation is shown.
- Editing a recurring task prompts: "Edit this occurrence only" or "Edit all future occurrences."
  - **Edit this occurrence only:** creates an exception record with `recurring_master_id` pointing to the master task and `recurring_occurrence_date` identifying which occurrence is overridden. The exception stores only the overridden fields.
  - **Edit all future occurrences:** updates the master task record directly.

---

## 7. Projects

### Project Management

Accessed from a Projects section in the sidebar or settings.

- Create a project: name + color picker (a fixed palette of 24 curated colors, optimized for light and dark mode contrast).
- Edit a project's name or color.
- Archive a project: hides it from all active views. Archived project tasks are preserved.
- View an archived project's tasks (read-only).
- Delete a project: only allowed if the project has no tasks, or with explicit confirmation that all tasks will be deleted.

### Project Backlog View

A dedicated route at `/projects/[id]`. Accessible by clicking a project name anywhere it appears, or from the Projects list.

A focused view of a single project showing:
- All backlog tasks for that project, in a vertical list with drag-to-reorder (manual priority ordering within the backlog).
- All board tasks for that project grouped by status.
- A project description field (editable).
- Summary stats: total tasks, tasks in progress, tasks in backlog.

---

## 8. Navigation Structure

```
Top navigation bar
├── Flowboard (logo / home → Board view)
├── Board          (Board + Backlog panel)
├── Week           (Weekly Calendar view)
├── Month          (Monthly Calendar view)
├── All Tasks      (All Tasks view)
└── Projects       (Project list + management)

Top bar right side
├── + (new task)
├── ⊞ (toggle backlog panel, visible in Board view only)
└── ⚙ (settings)
```

---

## 9. Settings

- **Week start day:** Sunday or Monday
- **Default view on launch:** Board / Week / Month
- **Default project:** pre-select for new tasks
- **Data export:** export all tasks as JSON or CSV
- **Data import:** import from JSON (matching schema)
- **Clear completed tasks:** permanently delete all archived tasks older than N days (configurable, with confirmation). Use the "Clear Done" action on the board to archive tasks first; this setting handles permanent cleanup.

---

## 10. Persistence

- All data stored in Postgres. Local instance used for development; production instance for deployment.
- Session state (active filters, open panel, current view) persisted in localStorage.
- Data export/import (see Settings) as the backup/migration path.
- Future consideration: CalDAV integration with Apple Calendar.

---

## 11. Visual Design Principles

- Clean, flat UI. No gradients, heavy shadows, or decorative noise.
- Light and dark mode support (respects system preference).
- Priority color coding is consistent across all views:
  - `must_do` — warm red/coral left-border and badge
  - `can_wait` — neutral gray left-border and badge
  - `fun` — teal/green left-border and badge
- Project colors appear as small color dots or pill badges on task cards.
- Timed events visually distinct from all-day tasks in calendar views (time shown, slightly different card style).
- Recurring tasks always show the ↻ indicator.
- Typography: system font stack (San Francisco on macOS/iOS, Segoe UI on Windows, system-ui fallback).
- Responsive: full desktop-through-mobile support. Layouts adapt across breakpoints:
  - **Desktop:** multi-column board, side-by-side backlog panel, full calendar grid.
  - **Tablet:** multi-column board, backlog panel as overlay, calendar with reduced columns.
  - **Mobile:** single-column board (columns as horizontal scroll or stacked), bottom navigation bar, swipeable calendar week view.

---

## 12. Accessibility

- All interactive elements keyboard-accessible (Tab, Enter, Space, arrow keys for board navigation).
- ARIA labels on icon-only buttons.
- Focus management when modals open/close (focus trap in modal, return focus on close).
- Color is never the sole indicator of meaning — priority always also shown as a text label.
- Sufficient color contrast ratios (WCAG AA minimum).

---

## 13. Out of Scope for v1

- Collaborative/multi-user features (single-user only; no public signup)
- Native mobile app (responsive web app only)
- Notifications / reminders
- Apple Calendar / CalDAV sync (noted as future consideration)
- Subtask nesting beyond one level (tasks are flat within a project)
- Time tracking
- Attachments

---

## 14. Sample Data for Development

Pre-load the following on first launch (or provide a "Load sample data" option):

**Projects:** Home, Work, Creative, Health, Personal

**Sample tasks:**
- Wash laundry (Home, Must Do, weekly, backlog)
- Dry laundry (Home, Must Do, weekly, backlog — sequence after Wash)
- Fold laundry (Home, Can Wait, weekly, backlog)
- Clean the microwave (Home, Must Do, weekly, board/up-next, no time)
- Team standup (Work, Must Do, daily, board/up-next, today + 9:00–9:30am — time-specific event)
- Review project proposal (Work, Must Do, in-progress, board)
- Draft Q3 outline (Work, Can Wait, backlog)
- Morning walk (Health, Must Do, daily, board/up-next)
- Read 20 pages (Personal, Fun, daily, board/up-next)
- Work on novel chapter 3 (Creative, Fun, backlog, with note "Pick up from p.42")
- Outline chapter 4 (Creative, Fun, backlog)
- Sketch character refs (Creative, Fun, backlog)
- Monthly budget review (Personal, Must Do, monthly, board/up-next)
