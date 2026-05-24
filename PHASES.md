# Flowboard — Build Phases

Each phase ships a vertical slice of working, tested functionality. Phases are ordered by dependency; later phases build on earlier ones. Complete phases in order.

**Testing stack:** Vitest + React Testing Library for unit/integration tests; Playwright for E2E tests.

**Design reference:** The Claude Design output (extracted to `/tmp/flowboard/project/`) is authoritative for all visual decisions. Key files: `styles.css` (CSS tokens), `flowboard-components.jsx` (atomic components), `flowboard-board.jsx`, `flowboard-modals.jsx`, `flowboard-calendars.jsx`, `flowboard-lists.jsx`, `flowboard-extras.jsx`. All token values, spacing, and component markup in SPEC.md §13 were derived from this output. When in doubt, refer to those files.

---

## Phase 1 — Project Scaffolding

Set up the repo with all tooling configured and a passing "hello world" baseline.

**Deliverables:**
- `create-next-app` with App Router, TypeScript strict mode, Tailwind CSS
- ESLint + Prettier configured
- Vitest + React Testing Library configured (`vitest.config.ts`, test setup file)
- Playwright configured (`playwright.config.ts`, one smoke test)
- `src/` directory structure: `app/`, `components/`, `lib/`, `db/`, `types/`
- Environment variable schema (`src/lib/env.ts`) validated with `zod` — fails fast on missing vars
- `README.md` with local setup instructions
- **Global CSS (`src/app/globals.css`):** import Newsreader from Google Fonts; define all CSS custom properties from SPEC.md §13 on `:root` and `[data-theme="dark"]`; define the three density variants on `[data-density]`; paper-grain texture class `.fb-grain`; base `body` styles (font family, color, background, `-webkit-font-smoothing: antialiased`, `font-feature-settings: "ss01" "cv11"`)
- **`src/lib/design.ts`:** export typed constants for priority colors, project palette array, and density values — single source of truth for any JS that needs these values

**Tests:**
- Unit: `env.ts` throws when required vars are missing; passes when all present
- E2E (smoke): app loads at `/`, redirects to `/login` (unauthenticated)

---

## Phase 2 — Database Schema & Migrations

Define all tables, indexes, and constraints. No application logic yet.

**Deliverables:**
- `drizzle-orm` + `drizzle-kit` configured against local PostgreSQL
- Migration files for all tables: `users`, `password_reset_tokens`, `settings`, `projects`, `tasks`
- `settings` table includes `density` enum (`compact`, `default`, `roomy`) and `quiet_evenings` boolean per SPEC.md §4.9
- Full schema matching §4 of the spec:
  - All column types, nullability, defaults
  - All FK constraints (with cascade rules per §4.6 and §9.1)
  - `tasks.recurring_master_id` FK self-references `tasks.id` ON DELETE CASCADE
  - Indexes: `tasks(project_id)`, `tasks(status)`, `tasks(date)`, `tasks(recurring_master_id)`, `password_reset_tokens(token_hash)`, `password_reset_tokens(user_id)`
- `src/db/schema.ts` exporting all Drizzle table definitions
- `src/types/index.ts` exporting inferred TypeScript types from schema
- Seed script (`scripts/seed.ts`) that creates the single user account from env vars

**Tests:**
- Unit: TypeScript compilation passes — inferred types match expected shapes
- Integration: run migrations against a test database; verify all tables exist with correct columns; verify FK cascade on project delete removes associated tasks

---

## Phase 3 — Authentication: Login & Session

Implement the login flow, session management, and route protection.

**Deliverables:**
- Auth.js v5 configured with credentials provider (`src/auth.ts`)
- `/login` page: username + password form, error states ("Invalid credentials")
- Session cookie: `httpOnly`, `Secure`, `SameSite=Lax` (Auth.js defaults)
- Persistent session (`strategy: "database"` or JWT with long expiry — match spec §3)
- Middleware (`src/middleware.ts`): redirects unauthenticated requests to `/login`; redirects authenticated requests away from `/login`
- Logout action: clears session, redirects to `/login`
- `⚙` settings icon in top nav links to `/settings` (placeholder page at this stage)

**Tests:**
- Unit: middleware redirect logic (mock `auth()`)
- Integration: POST `/api/auth/callback/credentials` with valid credentials returns session cookie; with invalid credentials returns 401
- E2E: visiting `/` unauthenticated redirects to `/login`; logging in redirects to the default view; logout clears session and redirects to `/login`

---

## Phase 4 — Password Reset Flow

Implement token generation, email delivery, and the reset form.

**Deliverables:**
- "Forgot password?" link on `/login` → `/forgot-password` form (email field)
- Server action: generates a cryptographically random token (`crypto.randomBytes(32)`), stores `SHA-256(token)` in `password_reset_tokens`, sends raw token in reset link via Resend
- Reset link format: `/reset-password?token=<raw>`
- `/reset-password` page: new password + confirm fields
- Server action: looks up `SHA-256(token)`, validates not expired (`expires_at > now`) and not used (`used_at IS NULL`), updates `password_hash`, sets `used_at`
- Toast / inline success and error messages throughout

**Tests:**
- Unit: `SHA-256` hashing produces correct output; token expiry validation logic; "already used" rejection logic
- Integration: full reset flow against test DB — token written, redeemed, `used_at` set, second redemption rejected; expired token rejected
- E2E: request reset → receive link (mock Resend in test env) → visit link → set new password → log in with new password

---

## Phase 5 — Rate Limiting

Add rate limiting to the login and password-reset-request endpoints.

**Deliverables:**
- Upstash Redis client configured (`src/lib/redis.ts`)
- `@upstash/ratelimit` applied to:
  - Login: 10 failed attempts / 15-min window per IP → HTTP 429 with `Retry-After` header
  - Password reset request: 5 requests / 1-hour window per IP → HTTP 429
- Login form shows a user-friendly message when rate-limited ("Too many attempts. Try again in X minutes.")
- Forgot-password form shows equivalent message

**Tests:**
- Unit: rate-limit helper returns correct `{ success, reset }` shape; `Retry-After` header value is calculated correctly
- Integration: mock Upstash Redis; simulate 11 login failures from the same IP; verify 429 on the 11th attempt with `Retry-After` header; verify counter resets after window (mock clock)

---

## Phase 6 — Project CRUD

Full project management: create, edit, archive, delete.

**Deliverables:**
- `/projects` page: list of all projects (name, color dot, task count, archive/delete controls)
- "New project" form: name (max 100 chars) + color picker (24 fixed colors shown as swatches)
- Edit project: inline or modal — name and color editable
- Archive project: sets `is_archived = true`; archived projects shown in a collapsed "Archived" section with restore option
- Delete project with confirmation dialog:
  - Has tasks: "This will permanently delete [N] tasks. This cannot be undone."
  - No tasks: simple confirmation
  - Cascades to all tasks (DB constraint handles this)
- Server actions for all mutations

**Tests:**
- Unit: project name validation (empty, too long); color must be from the fixed palette
- Integration: create → read → update → archive → delete round-trip; cascaded task deletion; archived project excluded from active project queries
- E2E: create a project, assign a color, rename it, archive it, restore it, delete it (with task count warning)

---

## Phase 7 — Task CRUD (Core Fields, No Recurrence)

Create, read, update, and delete non-recurring tasks. Covers all fields except `is_recurring` and `recurrence_rule`.

**Deliverables:**
- Shared atomic components (`src/components/ui/`): `PriorityBadge`, `ProjectDot`, `RecurringTag`, `TodayChip`, `StatusChip`, `FilterChip`, `Segmented`, `Toggle`, `EmptyIllustration` (flower/vase SVG), `Toast` — implement exactly per SPEC.md §13 component details
- Task Detail Modal component (`src/components/TaskModal.tsx`) — all fields per §6:
  - Title (inline editable, max 255 chars)
  - Project dropdown (active projects only)
  - Priority toggle (Must Do / Can Wait / Fun)
  - Status selector: vertical list of radio-style buttons (not a segmented control) in the modal sidebar — active item: `--accent-tint` bg, `--accent-ink` text, checkmark icon; labels: "Later" / "What's next" / "In progress" / "Done"
  - Date picker (optional; clearing clears `start_at`/`end_at`)
  - Start/end time pickers (only available when date is set)
  - Description field with progressive disclosure (collapsed → "+ Add description" → textarea; collapses on blur if empty)
- Unsaved changes guard: confirm dialog on backdrop click or nav-away if any field modified
- New Task Form (§7) with smart defaults:
  - Last-used project from `localStorage` (`flowboard:lastProject`), with fallback chain
  - Default priority `can_wait`
  - Status and date per entry-point
- Delete button with "Delete task?" confirmation
- Server actions: `createTask`, `updateTask`, `deleteTask`
- Priority color constants in `src/lib/priority.ts`

**Tests:**
- Unit: smart default resolution (last-used project fallback chain); description field collapse logic; unsaved-changes detection (dirty state)
- Integration: `createTask` / `updateTask` / `deleteTask` server actions; verify `updated_at` is set on update; verify clearing date also clears `start_at`/`end_at`
- E2E: open new task form → fill fields → save → task appears in board; open task → edit title → click backdrop → confirm discard → modal closes without saving; delete task

---

## Phase 8 — Board View

The main workspace: columns, drag-and-drop, filter bar.

**Design notes:** Column UI labels are "Appointments" / "What's next" / "In progress" / "Done" — internal `status` enum values unchanged. Backlog panel is labelled "Later". Column headers use Newsreader serif (17px weight 500). Empty column state uses the flower/vase `EmptyIllustration` with an italic serif caption. Today banner includes a gentle italic right-aligned message (e.g., "Take it gently today.") with a leaf icon. Dragging cards rotate -1.5deg and drop to 50% opacity.

**Deliverables:**
- `/board` (default route `/`) with four columns per §5.1:
  - Appointments: today's timed events, sorted by `start_at`; hidden when empty
  - Up Next: `status = 'up_next'` + display-promoted backlog tasks with `date = today` (styled with a "Today" chip; `status` not changed in DB)
  - In Progress: `status = 'in_progress'`
  - Done: 50 most-recent by `completed_at desc`; footer "and N more — Clear Done to archive" when >50
- Drag-and-drop (`@dnd-kit`): Up Next ↔ In Progress ↔ Done; Appointments not draggable
- Dragging to Done sets `status = 'done'`, `completed_at = now`
- Optimistic updates on drag with server sync
- "Clear Done" button in Done column header — archives non-recurring tasks; advances recurring tasks (see Phase 11 for recurring advancement)
- "Today" date banner above the board showing current date + appointment count
- Filter bar (always visible):
  - Priority chips (Must Do / Can Wait / Fun) — multi-select
  - Project chips — one per active project, multi-select
  - Recurring toggle
  - AND logic across filter types, OR within same type
  - "Clear filters" control
  - Filter state persisted in `localStorage` (`flowboard:filters`)
- Task cards showing: title, priority badge (colored + text label), project color dot, date (if any), recurrence indicator (Phase 11)

**Tests:**
- Unit: board task query logic (display-promotion rule for `date = today` backlog tasks); Done column capped at 50; filter AND/OR logic; `localStorage` filter persistence/restore
- Integration: `getBoardTasks` query returns correct tasks per column; `updateTaskStatus` server action; `clearDone` archives non-recurring tasks (recurring task advancement tested in Phase 11)
- E2E: drag task from Up Next to In Progress; drag to Done; verify status updates; apply priority filter; verify filtered results; clear filters; "Clear Done" archives non-recurring tasks

---

## Phase 9 — Backlog Panel

**Design notes:** The panel is labelled "Later" throughout the UI (header title, "+ Add" button). Width: 300px. Project section headers: chevron + 9px project dot + name + count, collapsible. Backlog rows: 3px color bar (w:3px h:18px radius:2px) + title (12.5px nowrap ellipsis) + optional ↻ icon. Hover state: `--bg-subtle` background. "→ board" action appears on hover only.

The persistent right-side panel alongside the board.

**Deliverables:**
- Backlog panel component (`src/components/BacklogPanel.tsx`): right-side, default open
- Toggle via ⊞ icon in top nav (Board view only); state persisted in `localStorage` (`flowboard:backlogOpen`)
- Contents: all `status = 'backlog'` AND `is_archived = false` tasks
- Grouped by project (collapsible sections)
- Project dropdown at panel top to filter to a single project's backlog
- Each item shows: title, priority badge, project tag, recurrence indicator (↻)
- "→ board" action: sets `status = 'up_next'`, moves task to board
- "+ task" button in panel header: opens new task form in backlog mode (`status = 'backlog'`, no date)

**Tests:**
- Unit: panel toggle state read/write from `localStorage`; project grouping logic
- Integration: `getBacklogTasks` query (excludes archived tasks, includes all statuses = backlog); `promoteToBoard` server action sets `status = 'up_next'`
- E2E: toggle panel open/close (state survives reload); create a backlog task from panel; promote task to board; verify it appears in Up Next; filter panel to single project

---

## Phase 10 — Project Detail View

**Design notes:** Backlog section labelled "Later" (matches panel). Stats bar: 4 segments — Total / In progress / Later / Done this month; stat value in Newsreader 22px weight 500; label in `fb-section-h` style. Project cards on the list page use a 4px left color bar (not a dot). Color picker: 6-column circular swatch grid; selected state: double-ring `box-shadow` + white checkmark.

The per-project view with draggable backlog ordering.

**Deliverables:**
- Route `/projects/[id]`
- Backlog section: all backlog tasks for the project in vertical list with drag-to-reorder
- `fractional-indexing` package: `backlog_order` field updated on drag; rebalancing triggered when precision degrades
- Board section: board tasks grouped by status (Up Next / In Progress / Done)
- Project description: editable inline, saved on blur
- Stats bar: total tasks / in progress / in backlog
- Clicking project name anywhere in app navigates to `/projects/[id]`

**Tests:**
- Unit: fractional index generation and rebalancing logic; stats calculation
- Integration: `reorderBacklogTask` server action updates only the moved task's `backlog_order`; query returns tasks in correct fractional order; rebalancing updates all affected rows correctly
- E2E: navigate to project detail; drag backlog task to new position; reload page; verify order persisted; edit project description; verify saved on blur

---

## Phase 11 — Recurrence Engine

Recurring task creation, display, completion flow, and advancement.

**Deliverables:**
- Recurrence UI in Task Modal / New Task Form:
  - Frequency dropdown: One-time / Daily / Weekly / Monthly / Yearly / Custom
  - Disabled until `date` is set
  - Custom opens full rule builder (§4.5): interval, days-of-week picker, day/week-of-month, end condition (never / on date / after N occurrences)
- Recurrence rule stored as JSONB per §4.5
- `src/lib/recurrence.ts`: pure functions
  - `getNextOccurrence(rule, fromDate): Date` — compute next occurrence from a rule and base date
  - `getFrequencyLabel(rule): string` — e.g., "Daily", "Weekly", "Mon/Wed/Fri"
  - `isRecurrenceComplete(rule, completionCount, nextDate): boolean`
- Completion flow (§8):
  - Marking done sets `status = 'done'`, `completed_at = now`
  - Toast: "Completed — next due [next occurrence date]"
- Advancement on "Clear Done" and next-day auto-advance:
  - Increment `completion_count`
  - Check end condition → auto-archive + toast if complete
  - Otherwise: advance `date`, reset `status = 'backlog'`, clear `completed_at`
- Next-day auto-advance: on app load, compare `today` to `localStorage:last_opened_date`; if new day, advance all recurring done tasks with `completed_at < today`; update `localStorage:last_opened_date`
- Exception records: "Edit this occurrence only" creates exception row; "Edit all future" updates master and deletes future exceptions
- Recurrence indicator (↻ + label) on all task cards

**Tests:**
- Unit (recurrence.ts — comprehensive):
  - Daily, weekly (specific days), monthly (by date, by week-of-month), yearly next-occurrence calculations
  - `getNextOccurrence` handles month-end edge cases (e.g., Jan 31 + 1 month)
  - `getFrequencyLabel` returns correct labels for all rule shapes
  - End condition: `after_occurrences` reached → `isRecurrenceComplete` returns true; `on_date` exceeded → true; `ends: null` → always false
- Integration: `advanceRecurringTask` server action (increments count, advances date, resets status, clears `completed_at`); auto-archive when end condition met; exception record creation; "edit all future" deletes correct exception records (on/after boundary) and preserves past ones
- E2E: create a daily recurring task → mark done → verify toast → clear done → verify task advances to next date in backlog; create "after 2 occurrences" task → complete twice → verify auto-archived

---

## Phase 12 — Weekly Calendar View

**Design notes:** Timed events use `--p-*-tint` as their background (lightly priority-tinted) rather than `--bg-surface`. Hourly gridlines via `repeating-linear-gradient` at 50% opacity. Today column header: `--accent-tint` background; date number in Newsreader, `--accent-ink` color. An "All day" uppercase label separates the timed and all-day sections. Day column headers use `gridTemplateColumns: repeat(7, 1fr)` with a 1px `--border` gap between cells.

7-column drag-and-drop calendar.

**Deliverables:**
- `/week` route with 7-column grid per §5.4
- Configurable week start (Sunday/Monday) from settings
- Each day column:
  - Timed events section (top, fixed height): tasks with `date = that day` AND `start_at` set; sorted by `start_at`; overlapping events shown side by side
  - All-day section (bottom, scrollable): tasks with `date = that day` and no `start_at`; sorted by priority
- Today's column subtly highlighted
- Task chips: priority left-border color, project color dot
- Navigation: prev/next week arrows, "Today" button
- Click timed event or date task → opens Task Detail Modal
- Click empty all-day slot → opens New Task Form with `date` pre-filled
- Click empty timed slot → opens New Task Form with `date` + `start_at` pre-filled to nearest 30-min increment
- Drag-and-drop between day columns (non-recurring): updates `date`; for timed events shifts `start_at`/`end_at` date while preserving times
- Drag-and-drop for recurring tasks: prompt "Move this occurrence only or all future occurrences?" before committing; cancelling snaps back

**Tests:**
- Unit: nearest-30-min-increment calculation; timed-event overlap layout algorithm; week boundary calculation (Sunday vs Monday start); `start_at`/`end_at` date-shift logic (preserves time-of-day)
- Integration: `getWeekTasks` query (returns tasks for the 7-day window); `moveTaskToDate` server action
- E2E: navigate to weekly view; click empty all-day slot → new task form pre-filled; drag task to adjacent day → verify date updated; drag recurring task → prompt appears → "this occurrence only" → exception created; "all future" → master updated

---

## Phase 13 — Monthly Calendar View

**Design notes:** Today's date number: 22px circle with `--accent` background, `#FFF8F4` text, weight 600. Task chips in day cells: `--p-*-tint` background, `2.5px` priority left border, `border-radius: 4px`, 10.5px text with project dot. Mobile dot-indicator: 3.5px dots in priority colors; selected day cell: `--accent` background, dots in `#FFF8F4`.

Read-only monthly grid with day detail popover.

**Deliverables:**
- `/month` route per §5.5
- Standard monthly grid (5–6 week rows)
- Each day cell:
  - Timed event chips: time + truncated title, sorted by time
  - Date task chips: title only, priority left-border color
  - "+ N more" overflow indicator → expands to show all for that day
- Today's cell highlighted
- Navigation: prev/next month, "Today" button
- Clicking a task chip → opens Task Detail Modal
- Clicking anywhere else on a day cell → opens **day detail popover** listing all tasks + "+ task" button (pre-fills `date`)
- Mobile layout: dot-indicator grid (colored dots, max 3 per day with overflow) + agenda list below grid; tapping a day scrolls agenda to that date; agenda's "+ task" button pre-fills `date`

**Tests:**
- Unit: month grid date generation (correct number of cells, correct week alignment for both Sunday/Monday starts); overflow threshold logic; mobile dot-color assignment from task priorities
- Integration: `getMonthTasks` query; tasks appear in correct day cells
- E2E: navigate to monthly view; verify today highlighted; click overflow indicator → all tasks shown; click day cell → popover opens; click "+ task" in popover → new task form with date pre-filled; verify mobile dot-indicator layout at mobile viewport

---

## Phase 14 — All Tasks View

**Design notes:** Grouping toggle has three options: By project / By status / By date. Filter row includes a search field ("Search tasks…") alongside the priority chips. Group headers use Newsreader 16px weight 500. List rows: 3px priority color bar (h:24px) + title + optional RecurringTag + date + PriorityBadge + StatusChip. Done rows: line-through title. Archived rows: 55% opacity + "Archived" badge (10.5px, uppercase, `--border`-outlined pill).

Flat list of every task with grouping, filters, and archived toggle.

**Deliverables:**
- `/tasks` route per §5.3
- Default grouping: by project (collapsible sections)
- Secondary grouping toggle: by status
- Reuses the same filter bar component from the Board (priority, project, recurring)
- Each task row: title, status badge, priority badge, date (if any), recurrence indicator (↻)
- Clicking a task opens Task Detail Modal
- "Show archived" toggle: hidden by default; toggle reveals archived tasks (styled distinctly)
- Correct task counts per group header

**Tests:**
- Unit: grouping logic (by project, by status); archived filter; task count calculation per group
- Integration: `getAllTasks` query with filters and archived toggle; filter combinations return correct subsets
- E2E: navigate to All Tasks; verify default grouping by project; toggle to group by status; apply project filter; enable "show archived"; click task → modal opens; edit task in modal → changes reflected in list

---

## Phase 15 — Settings

**Design notes:** Settings page is max 640px wide, centered. Each setting uses a `SettingRow` pattern: label (13.5px weight 500) + hint (12px `--text-secondary`) on the left; control on the right; separated by a `--border` bottom border with 14px vertical padding. Density setting uses a 3-option segmented control (Compact / Default / Roomy) and writes `data-density` to `<body>`. Quiet evenings uses a `Toggle` component. Data section: two separate `--bg-surface` cards with `border-radius: 12px`. Export default days field default is **90** (not 30). Footer: italic Newsreader "Made gently · v1.x.x" centered in `--text-tertiary`.

User preferences and data management.

**Deliverables:**
- `/settings` route per §11
- Settings form (auto-save on change or explicit save):
  - Week start day: Sunday / Monday
  - Default view on launch: Board / Week / Month
  - Default project (dropdown of active projects; "None" option)
- Data export section:
  - "Export as JSON" and "Export as CSV" buttons
  - JSON: all tasks + projects, full field set
  - CSV: flat tasks table with all columns
- Clear completed tasks section:
  - Input for "older than N days" (default 30)
  - "Clear" button with confirmation: "Permanently delete all archived tasks older than [N] days? This cannot be undone."
  - Runs DELETE query on `tasks` where `is_archived = true` AND `updated_at < now - N days`
- Settings saved to `settings` table (one row per user)
- Week start day propagates to Weekly and Monthly calendar views

**Tests:**
- Unit: JSON export serialization (all fields present, `timestamptz` as ISO-8601 strings); CSV export row/column format; age-threshold calculation for clear-completed
- Integration: `updateSettings` server action persists to DB; `exportData` returns correct JSON shape; `clearOldArchived` deletes only tasks matching the age threshold and `is_archived = true`
- E2E: change week start day → navigate to weekly view → verify grid starts on correct day; export JSON → parse returned file → verify task count matches; run "clear completed" → archived tasks older than threshold deleted; newer archived tasks preserved

---

## Phase 16 — Responsive Design & Mobile Navigation

**Design notes:** Mobile tab bar: 5 items (Board / Week / + FAB / Tasks / Projects). The center FAB is a 44×44px filled circle (`--accent` bg, `border-radius: 50%`, `box-shadow: 0 4px 10px rgba(184,106,110,0.4)`) that floats 10px above the bar baseline. Mobile board: segmented column picker (Appt / Next / Doing / Done with counts) replaces horizontal scroll — shows one column at a time. Mobile task detail: single-column scrollable form, Save button pinned in a bottom footer strip.

Polish all layouts for tablet and mobile breakpoints.

**Deliverables:**
- Desktop: multi-column board, side-by-side backlog panel, full calendar grid (already built in previous phases with `lg:` / `xl:` Tailwind classes)
- Tablet (`md:`): board stays multi-column; backlog panel becomes an overlay (full-height drawer); calendar grid with reduced column width
- Mobile (`sm:` and below):
  - Bottom tab bar replacing top nav: Board / Week / Month / All Tasks / Projects
  - Single-column board (horizontal scroll or stacked columns)
  - Swipeable week view (swipe left/right = prev/next week)
  - Mobile monthly calendar: dot-indicator format (from Phase 13) is active at this breakpoint
  - Backlog panel: full-screen overlay on mobile
- All interactive elements keyboard-accessible: Tab, Enter, Space, arrow keys for board column navigation
- ARIA labels on all icon-only buttons (⊞, +, ⚙, nav arrows)
- Focus trap in modals; focus returns to triggering element on close
- WCAG AA color contrast validated in both light and dark mode

**Tests:**
- Unit: none (layout is visual)
- Accessibility unit tests with `jest-axe` / `@axe-core/playwright`: no violations on Board, Task Modal, Weekly view, Monthly view, Settings page
- E2E (mobile viewport 390×844): bottom tab bar visible; navigate between views; open task modal; verify focus trap; Tab through modal fields; press Escape to close; swipe week view (Playwright touch events); backlog panel opens as full-screen overlay

---

## Phase 17 — Subtasks

Inline checklist items on tasks, with a per-task setting to expose them directly on the board card.

**Design notes:** Subtask rows in the modal use the same `--bg-subtle` hover pattern as backlog rows: a leading checkbox, title (inline-editable on click), and a ✕ delete button that appears on hover. The inline-on-board setting is a compact toggle in the Task Modal sidebar labelled "Show on card". When enabled on a board card, the card body expands below the title with a compact checklist: 13px text, `--text-secondary` for completed items (line-through + muted), 18×18px checkbox targets. The progress indicator — "N / M" in 11px `--text-secondary` — appears in the card footer alongside the project dot whenever the task has at least one subtask, regardless of the inline setting. Completed subtask count resets to zero when a recurring task advances to its next occurrence (the subtasks themselves are preserved but their `is_completed` state is cleared).

**Data model:**
- New `subtasks` table: `id` (uuid PK), `task_id` (FK → `tasks.id` ON DELETE CASCADE), `title` (varchar 255), `is_completed` (boolean, default false), `sort_order` (real, for fractional-index reordering), `created_at` (timestamptz)
- New column on `tasks`: `show_subtasks_inline` (boolean, default false) — stored on the task row itself; for recurring tasks this is shared state (editing it writes to the master record and all future occurrences via the same "edit all future" mechanism already in place)
- Index: `subtasks(task_id)`

**Deliverables:**
- Migration adding the `subtasks` table and `tasks.show_subtasks_inline` column
- Task Modal subtask section (below description, above footer):
  - List of existing subtasks with inline-editable titles; checkbox to toggle `is_completed`; ✕ button to delete (with no confirmation — non-destructive for a checklist item)
  - "+ Add subtask" row at the bottom: pressing Enter or Tab commits the item and focuses a new empty row; pressing Escape cancels
  - Drag-to-reorder subtasks (fractional indexing via `sort_order`)
  - Progress summary at the section header: "Subtasks · N / M complete"
- "Show on card" toggle in Task Modal sidebar (boolean, auto-saves on change)
- Board card changes:
  - When `subtasks` exist: compact "N / M" counter in card footer
  - When `show_subtasks_inline = true`: expanded card body shows full checklist; checking/unchecking an item fires an optimistic server action without opening the modal; the card collapses back to normal height when all subtasks are complete (to keep the board tidy)
- Server actions: `createSubtask`, `updateSubtask` (title or `is_completed`), `deleteSubtask`, `reorderSubtasks`, `updateShowSubtasksInline`
- Recurring advancement hook: when `advanceRecurringTask` runs, reset all `is_completed = false` for that task's subtasks (title and order preserved)
- Export (Phase 15 JSON/CSV): include subtasks array on each task in JSON; add `subtask_titles` and `subtask_completed_count` columns to CSV

**Tests:**
- Unit: subtask sort-order rebalancing logic; `advanceRecurringTask` resets `is_completed` but preserves titles and order; `show_subtasks_inline` toggle propagates to master + future occurrences (same path as other "edit all future" fields)
- Integration: `createSubtask` inserts with correct `task_id`; `deleteSubtask` cascades correctly; `reorderSubtasks` updates only affected rows; completing all subtasks does not auto-complete the parent task; `advanceRecurringTask` resets completion state
- E2E: open task modal → add three subtasks → check one → verify "1 / 3" counter on board card; enable "Show on card" → verify checklist visible on card; check item directly on card → verify optimistic update + server sync; drag subtask to reorder → reload → verify order persists; recurring task: advance → verify subtask checkboxes reset

---

## Phase 18 — Dark Mode, Visual Polish & Final QA

**Design notes:** Dark mode is set via `data-theme="dark"` on `<html>` (not a CSS class or `prefers-color-scheme` media query directly — set it in JS on load based on `window.matchMedia('(prefers-color-scheme: dark)')`). Paper-grain texture: on `--bg-base` elements via the `.fb-grain` class — SVG `feTurbulence` with `baseFrequency: 0.85`, `numOctaves: 2`, `stitchTiles: stitch`; `blend-mode: multiply` (light) / `screen` (dark). Scrollbars: `width: 8px`, `--border` thumb, `border-radius: 8px`, transparent track.

Ship-ready visual quality and end-to-end quality gate.

**Deliverables:**
- Dark mode via `prefers-color-scheme` media query — Tailwind `dark:` variants throughout
- All priority colors pass WCAG AA contrast in both modes (warm red/coral, neutral gray, teal/green)
- System font stack applied: `font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
- Consistent visual language: flat UI, no gradients, no heavy shadows; priority left-borders uniform across all views
- Project color dots consistent across Board, Backlog Panel, Calendar, All Tasks
- Toast component (for recurring completion messages, auto-archive notices, export success) — non-blocking, auto-dismisses
- Loading states and skeleton screens for initial data fetches
- Error boundary for unhandled server action failures
- Password reset token cleanup: on login, delete `password_reset_tokens` where `expires_at < now` OR `used_at IS NOT NULL`
- Final review pass: all `TODO` / `FIXME` resolved; no `console.log` in production paths

**Tests:**
- Unit: token cleanup query selects correct rows (expired + used)
- E2E (full regression suite, both light and dark mode forced via `prefers-color-scheme` override):
  - Auth flow (login → board → logout)
  - Create project → create task → drag to Done → Clear Done
  - Recurring task completion × 2 → auto-archive
  - Weekly calendar: create via slot click, drag between days
  - Monthly calendar: overflow, day popover, mobile dot view
  - Settings: export JSON, change week start day, clear old archived tasks
  - All filter combinations on Board and All Tasks views
  - Keyboard-only navigation through the board and task modal
