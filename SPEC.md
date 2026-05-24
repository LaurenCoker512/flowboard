# Flowboard — Technical Specification

A flexible task management and calendar app designed for neurodivergent users who need structure without rigidity.

---

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Rendering | Server components + server actions / API routes |
| Database | PostgreSQL — local instance for development, production instance for deployment |
| Auth | Auth.js (credentials provider) |
| Email | Resend — password reset only |
| Styling | Tailwind CSS |
| Rate limiting | Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`) — required for serverless deployment |

---

## 2. Core Philosophy

- **No forced time-boxing.** Dates are for visibility, not enforcement.
- **Always have options.** Filtering surfaces tasks that match current capacity — never hides everything.
- **Projects are first-class.** Every task belongs to a project. Projects have backlogs. Backlogs are browsable and pluckable.
- **The board is intentional.** Only tasks consciously pulled in (or surfaced by date) appear on the board. Everything else waits in the backlog.
- **Calendar is additive.** Time-specific events show automatically in the right places and do not pollute the backlog or task flow.

---

## 3. Authentication

**Single-user app.** No public signup. The account is created once via a seed script or environment-configured setup step.

### Login
- Username + password form.
- Session managed by Auth.js credentials provider.
- Persistent login — stays logged in across browser sessions until explicit logout.
- Session cookies: `httpOnly`, `Secure`, `SameSite=Lax` (Auth.js defaults).

### Route protection
- All routes except `/login` and `/reset-password` are protected.
- Unauthenticated requests redirect to `/login`.

### Password recovery
- "Forgot password?" link on `/login` sends a time-limited reset link via Resend to the account email.
- Reset tokens expire after 1 hour.
- A cryptographically random token is generated and sent raw in the email link. Only `SHA-256(token)` is stored in the database — a DB breach does not expose a valid reset link.
- Reset tokens are single-use: `used_at` is set on redemption; subsequent uses of the same token are rejected.

### Rate limiting
- **Login endpoint:** maximum 10 failed attempts per IP per 15-minute window. On limit, return HTTP 429 with a retry-after header.
- **Password reset request endpoint:** maximum 5 requests per IP per hour. On limit, return HTTP 429.
- Implementation: `@upstash/ratelimit` with Upstash Redis (required — serverless deployment means in-memory state does not persist across requests).

---

## 4. Data Model

### 4.1 Timezones

- All `timestamp` / `timestamptz` columns stored in UTC.
- `start_at` / `end_at` are full `timestamptz` values (date + time in UTC) — not bare time columns.
- All date/time values are converted to the user's browser local timezone for display.
- All date/time values entered by the user are interpreted as local time and stored as UTC.
- The `date` column is a calendar date in local time — stored as a date string (`YYYY-MM-DD`), interpreted relative to the user's local timezone.

### 4.2 Task

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | Auto-generated |
| `title` | string | yes | Max 255 characters |
| `project_id` | uuid | yes | FK → Project. Every task belongs to a project |
| `priority` | enum | yes | `must_do`, `can_wait`, `fun` |
| `status` | enum | yes | `backlog`, `up_next`, `in_progress`, `done` |
| `is_archived` | boolean | yes | Default false. Archived tasks excluded from all active views |
| `date` | date | no | `YYYY-MM-DD` in user local time. Surfaces the task on calendar views |
| `start_at` | timestamptz | no | Full UTC datetime. Requires `date`. Makes the task a time-specific event |
| `end_at` | timestamptz | no | Full UTC datetime. Optional end time. Only valid when `start_at` is set |
| `is_recurring` | boolean | yes | Default false. Requires `date` to be set — UI disables toggle without a date |
| `recurrence_rule` | jsonb | no | Null unless `is_recurring = true`. See §4.5 |
| `completion_count` | integer | yes | Default 0. Incremented each time a recurring task's completion is processed (used to enforce `ends.after_occurrences`) |
| `completed_at` | timestamptz | no | Set when task is marked done. Null when status is not `done`. Used to defer recurring advancement until Clear Done or next-day auto-advance |
| `recurring_master_id` | uuid | no | Set on exception records only. FK → Task (the master recurring task) |
| `recurring_occurrence_date` | date | no | Set on exception records only. Identifies which occurrence this overrides |
| `backlog_order` | string | no | Fractional index string for manual ordering within a project's backlog. Null for non-backlog tasks. See §9.2 |
| `description` | text | no | Rich-ish free text. Replaces the earlier "notes" concept |
| `created_at` | timestamptz | yes | UTC |
| `updated_at` | timestamptz | yes | UTC |

**Derived concept — time-specific event:** a task where both `date` AND `start_at` are set. Renders differently from date-only tasks throughout the app.

**Derived concept — board task:** a task where `status != 'backlog'` OR (`status = 'backlog'` AND `date = today`). See §5.1 for board display rules.

### 4.3 Priority Values

| Value | Label | Color |
|---|---|---|
| `must_do` | Must Do | Warm red / coral |
| `can_wait` | Can Wait | Neutral gray |
| `fun` | Fun | Teal / green |

### 4.4 Project

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | Auto-generated |
| `name` | string | yes | Max 100 characters |
| `color` | string | yes | Hex value from a fixed palette of 24 curated colors |
| `description` | text | no | |
| `is_archived` | boolean | yes | Default false |
| `created_at` | timestamptz | yes | UTC |

### 4.5 Recurrence Rule (JSONB)

```jsonc
{
  // Required
  "frequency": "daily" | "weekly" | "monthly" | "yearly" | "custom",
  "interval": 1,               // Every N frequency units

  // Optional — weekly / custom
  "days_of_week": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],

  // Optional — monthly / custom
  "day_of_month": 15,          // e.g. 15th of each month
  "week_of_month": 2,          // e.g. 2nd week (used with days_of_week)

  // End condition — exactly one of:
  "ends": null                              // Never ends
         | { "on_date": "YYYY-MM-DD" }      // Ends on or before a specific date
         | { "after_occurrences": 10 }      // Ends after N completions (tracked via completion_count)
}
```

**Custom frequency** exposes a full iCal-style rule builder in the task form:
- Frequency selector (daily / weekly / monthly / yearly)
- Interval ("every N days/weeks/months/years")
- Days-of-week picker (for weekly/custom-weekly patterns)
- Day-of-month picker (for monthly/yearly patterns)
- Week-of-month picker (for "second Tuesday" type patterns)
- End condition (never / on date / after N occurrences)

### 4.6 Recurrence Exception Records

Exception records live in the same `tasks` table as regular tasks. An exception is identified by having `recurring_master_id` set.

- `recurring_master_id` → UUID of the master task
- `recurring_occurrence_date` → which scheduled occurrence this overrides
- All fields **except `recurrence_rule`** can be overridden on an exception record. `recurrence_rule` is master-only.
- Fields not overridden on the exception inherit from the master task at read time.

**Cascade rules:**
- Deleting a master task cascades to delete all its exception records.
- Choosing "Edit all future occurrences" deletes all exception records whose `recurring_occurrence_date` is on or after the occurrence being edited, then updates the master task. Past exception records are untouched.

### 4.7 User

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | Auto-generated |
| `username` | string | yes | Unique. Used for login |
| `email` | string | yes | Used for password reset emails |
| `password_hash` | string | yes | bcrypt hash |
| `created_at` | timestamptz | yes | UTC |

### 4.8 Password Reset Token

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | Auto-generated |
| `user_id` | uuid | yes | FK → User |
| `token_hash` | string | yes | SHA-256 of the raw token sent in the reset link |
| `expires_at` | timestamptz | yes | 1 hour after creation |
| `used_at` | timestamptz | no | Set on first use; subsequent uses rejected |

Expired and used tokens should be purged periodically (e.g., a cleanup job or on-demand at login time).

### 4.9 Settings

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | Auto-generated |
| `user_id` | uuid | yes | FK → User. One row per user |
| `week_start_day` | enum | yes | `sunday` \| `monday`. Default `sunday` |
| `default_view` | enum | yes | `board` \| `week` \| `month`. Default `board` |
| `default_project_id` | uuid | no | FK → Project. Overrides localStorage last-used project when set |
| `density` | enum | yes | `compact` \| `default` \| `roomy`. Controls card padding/gap density. Default `default` |
| `quiet_evenings` | boolean | yes | Default false. When enabled, hides tomorrow's tasks after 8pm so the user can wind down |
| `created_at` | timestamptz | yes | UTC |
| `updated_at` | timestamptz | yes | UTC |

---

## 5. Views

### 5.1 Board View (default)

The active workspace. Accessed via "Board" in the top nav.

**What the board shows:**
- All tasks where `status != 'backlog'` AND `is_archived = false`
- Plus: backlog tasks where `date = today` (display-only promotion — `status` field is not changed)

**Columns (left to right):**

Note: database `status` enum values are unchanged (`up_next`, `in_progress`, etc.). The UI labels below are the user-facing display names used in the design.

| Column | UI Label | Contents |
|---|---|---|
| **Appointments** | Appointments | Tasks where `date = today` AND `start_at` is set. Sorted by `start_at`. Hidden when empty |
| **Up Next** | What's next | Tasks with `status = 'up_next'` + display-promoted backlog tasks dated today |
| **In Progress** | In progress | Tasks with `status = 'in_progress'` |
| **Done** | Done | Tasks with `status = 'done'` and `is_archived = false` |

**Column behavior details:**

- **Appointments column:** Time-specific events for today only. Not draggable in/out. Always present when appointments exist; hidden otherwise. A "Today" date banner above the board shows the current date and appointment count.
- **Up Next column:** Includes display-promoted backlog tasks dated today. These appear visually distinct (e.g., a subtle "Today" chip) to indicate their backlog status. Dragging one to In Progress or Done *does* update their real `status`.
- **Done column:** Shows the 50 most recently completed non-archived `done` tasks, sorted by `completed_at` descending. If more than 50 exist, a footer reads "and N more — Clear Done to archive." A "Clear Done" action in the column header processes **all** done non-archived tasks — not just the 50 visible — so the column empties completely in one action. Recurring tasks have their date advanced and `status` reset to `backlog` (see §8); non-recurring tasks are archived (`is_archived = true`).

**Drag-and-drop:**
- Supported between Up Next ↔ In Progress ↔ Done.
- Tasks cannot be dragged into or out of the Appointments column.
- Dragging a task to Done triggers the recurring completion flow (see §8) if applicable.
- Status is updated immediately on drop (optimistic update with server sync).

**Filtering (always visible above the board):**
- **Priority filter:** `Must Do` / `Can Wait` / `Fun` — multi-select chips. Selecting one or more shows only matching tasks.
- **Project filter:** one chip per active project — multi-select.
- **Recurring filter:** toggle to show only recurring tasks.
- Filters use AND logic across types; OR logic within multi-select of the same type.
- Appointments column is never filtered — appointments always show.
- A "Clear filters" control resets all active filters.
- Filter state persists in `localStorage` (survives page reload within the same browser).

### 5.2 Backlog Panel

A persistent right-side panel toggled open/closed alongside the Board view. Default state: open. UI label for this panel and its contents is **"Later"** (not "Backlog") — the internal `status` value remains `backlog`.

**Contents:** all tasks where `status = 'backlog'` AND `is_archived = false`, regardless of date.

**Layout:**
- Grouped by project (collapsible sections per project).
- A project dropdown at the panel top filters to a single project's backlog.
- Each item shows: title, priority badge, project tag, recurrence indicator.
- A "→ board" action on each item sets `status = 'up_next'`, moving it out of the backlog.
- A "+ task" button in the panel header opens the new task form in backlog mode.

**Toggle control:** the ⊞ icon in the top bar right side. Only visible in Board view.

### 5.3 All Tasks View

Accessed from the top nav. A flat list of every task in the system.

**Features:**
- Default grouping: by project (collapsible).
- Grouping toggle: by project / by status / by date.
- Priority filter chips (same as Board view) plus a **search field** ("Search tasks…") inline in the filter row.
- Each task row shows: priority left-border (3px), title, recurrence indicator (↻ + label), date + time if set, priority badge, status chip.
- Done tasks shown with line-through on title; archived tasks at 55% opacity with an "Archived" badge.
- Clicking a task opens its detail modal.
- Archived tasks hidden by default; a "Show archived" toggle (with a Toggle switch) reveals them.

### 5.4 Weekly Calendar View

Accessed from the top nav. A 7-column grid, one column per day.

**Week start day:** configurable in Settings (Sunday or Monday).

**Each day column has two sections:**

1. **Timed events** (top section, fixed height): tasks with `date` matching that day AND `start_at` set. Shown as time-block chips in chronological order. Overlapping events shown side by side.
2. **All-day / date tasks** (bottom section, scrollable): tasks with `date` matching that day and no `start_at`. Sorted by priority (`must_do` first, then `can_wait`, then `fun`).

**Navigation:** prev/next week arrows, a "Today" button to jump to the current week.

**Interaction:**
- Clicking a timed event or date task opens its detail modal.
- Clicking an empty slot in a day column opens the new task form with that date pre-filled. If clicking within the timed section, `start_at` is pre-filled to the nearest 30-minute increment.
- **Drag-and-drop between day columns:** updates `date` only.
  - For non-recurring timed events: `start_at` and `end_at` dates shift to the new day; times of day are preserved.
  - For non-recurring date-only tasks: only `date` changes.
  - For **recurring tasks** (timed or date-only): dropping on a new day triggers a prompt — "Move this occurrence only or all future occurrences?" — before the move is committed. Choosing "this occurrence" creates an exception record with the new date. Choosing "all future" updates the master task's date and deletes future exception records (same boundary rule as §6). Cancelling snaps the task back to its original position.

**Visual cues:**
- Today's column subtly highlighted.
- Priority shown via a colored left-border: `must_do` = red/coral, `can_wait` = gray, `fun` = teal/green.
- Project color shown as a small dot or pill on each task chip.

### 5.5 Monthly Calendar View

Accessed from the top nav. A standard monthly grid. **Read-only** — no drag-and-drop.

**Each day cell shows:**
- Timed events as compact chips (time + truncated title), sorted by time.
- Date tasks as compact chips (title only, priority-colored left border).
- If a day has more items than fit, a "+ N more" overflow indicator expands on click to show all.

**Navigation:** prev/next month arrows, "Today" button.

**Interaction:**
- Clicking a task chip opens its detail modal.
- Clicking anywhere else on a day cell (including empty areas and the date number) opens a **day detail popover** listing all tasks and events for that day. The popover includes a "+ task" button that opens the new task form with that date pre-filled.

---

## 6. Task Detail Modal

Opened by clicking any task in any view. A modal overlay (not a full-page navigation).

**Fields:**

| Field | Notes |
|---|---|
| Title | Editable inline text field |
| Project | Dropdown of active projects |
| Priority | Three-button toggle: Must Do / Can Wait / Fun |
| Status | Four-button toggle: Backlog / Up Next / In Progress / Done. Setting to Backlog moves the task out of the active board |
| Date | Optional date picker. Clearing the date also clears `start_at`, `end_at`, and disables recurrence |
| Time | Optional start + end time pickers. Only available when a date is set. Setting `start_at` makes this a time-specific event |
| Recurring | Dropdown: One-time / Daily / Weekly / Monthly / Yearly / Custom. Disabled until a date is set. Custom opens the full iCal-style rule builder (see §4.5) |
| Description | Progressive disclosure field (see below) |
| Delete | Button with confirmation: "Delete task?" / Confirm / Cancel |

**Description field behavior (progressive disclosure):**
- If the task has no description: show a low-emphasis "+ Add description" text button in place of an input.
- Clicking "+ Add description" reveals a multiline textarea and focuses it immediately.
- If the task already has a description: the textarea is shown directly, pre-populated.
- If the user clears all content and moves focus away (blur), the field collapses back to the "+ Add description" button state.
- This pattern applies to all future detail fields added to the task (e.g., attachments, links) — each is hidden until the user opts in or content already exists.

**Save behavior:** changes saved on explicit "Save" click.

**Unsaved changes guard:** if any field has been modified since the modal opened, clicking the backdrop or navigating away shows a confirmation: "Discard unsaved changes?" / Keep editing / Discard. No prompt is shown if nothing was changed.

**Editing a recurring task:** prompts "Edit this occurrence only" or "Edit all future occurrences."
- **This occurrence only:** creates an exception record (`recurring_master_id` + `recurring_occurrence_date`). All fields except `recurrence_rule` can be set on the exception.
- **All future occurrences:** all fields (including `recurrence_rule` and `date`) are updated on the master task. All exception records whose `recurring_occurrence_date` is on or after the edited occurrence's date are deleted. Past exception records are untouched. "Future" is defined as: on or after the date of the occurrence being edited.

---

## 7. New Task Form

Opened from:
- The `+` button in the top nav — defaults to `status = 'up_next'`, `date = today`
- The `+` button in the backlog panel header — defaults to `status = 'backlog'`
- Clicking an empty day slot in Weekly view — pre-fills `date` (and `start_at` to nearest 30-min increment if in the timed section)
- Clicking the "+ task" button in a Monthly view day detail popover — pre-fills `date`

**Fields:** same as Task Detail Modal, minus the Delete control. The description field follows the same progressive disclosure behavior — collapsed to "+ Add description" by default.

**Smart defaults:**

| Field | Default |
|---|---|
| Project | Last-used project (localStorage). Falls back to `settings.default_project_id` if set, then to the first active project if last-used is archived or deleted |
| Priority | `can_wait` |
| Status | `backlog` (from backlog panel) / `up_next` (all other entry points) |
| Date | Today (from top nav `+`) / pre-filled from calendar slot / empty (from backlog panel) |

**Unsaved changes guard:** if any field has been modified and the user navigates away or dismisses the form without saving, a confirmation is shown: "Discard unsaved changes?" / Keep editing / Discard.

---

## 8. Recurrence Behavior

### Completion flow

When a recurring task is marked `done` (via drag-to-Done, status toggle, or Done button):

1. The task's `status` is set to `done` and `completed_at` is set to now.
2. The task appears in the Done column for the remainder of the day (or until Clear Done is triggered).
3. A brief non-blocking toast is shown: "Completed — next due [next occurrence date]." The next occurrence date is calculated immediately for display purposes but not yet written to the task.

Advancement is **deferred** — it happens at one of two triggers:
- **"Clear Done" is clicked** on the board.
- **App load on a new day** — any recurring task with `status = 'done'` and `completed_at` before today is auto-advanced on load.

### Advancement logic (on Clear Done or next-day auto-advance)

For each recurring done task:

1. Increment `completion_count` by 1.
2. Check the end condition:
   - `ends: null` — continue.
   - `ends.after_occurrences: N` — if `completion_count >= N`, auto-archive the task (`is_archived = true`), show toast "All done — this recurring task is complete." Stop here.
   - `ends.on_date` — calculate the next occurrence date. If it is after `ends.on_date`, auto-archive and show the same toast. Stop here.
3. Advance `date` to the next occurrence date calculated from the recurrence rule.
4. Reset `status` to `backlog`. Recurring tasks always return to the backlog after completion — the next occurrence must be consciously pulled onto the board. This aligns with the "board is intentional" philosophy and avoids the need to store pre-completion status.
5. Clear `completed_at`.

For **non-recurring** done tasks, "Clear Done" sets `is_archived = true`.

### Completion for exception records

Marking an exception occurrence done sets `completed_at` on the exception record and shows it in Done. On advancement (Clear Done or next-day):

1. The **master task's** `date` is advanced to the next occurrence after the exception's `recurring_occurrence_date`.
2. The master task's `completion_count` is incremented.
3. The exception record is deleted.
4. End-condition checks (step 2 above) are applied to the master task.

### Recurrence indicators

All recurring task cards show a ↻ icon plus a frequency label (e.g., "Daily", "Weekly", "Mon/Wed/Fri").

---

## 9. Projects

### 9.1 Project Management

Accessed from the "Projects" entry in the top nav.

**Create:** name + color picker (fixed palette of 24 curated colors, optimized for light and dark mode contrast).

**Edit:** name and color editable at any time.

**Archive:** sets `is_archived = true`. Hides the project from all active views, project filters, and new task dropdowns. Archived project tasks are preserved and viewable in a read-only mode.

**Delete:** allowed at any time.
- If the project has tasks, a confirmation dialog explicitly states: "This will permanently delete [N] tasks. This cannot be undone." Confirming cascades deletion to all tasks in the project (including exception records for any recurring tasks).
- If the project has no tasks, deletion proceeds with a simple confirmation.

### 9.2 Project Backlog View

Route: `/projects/[id]`. Accessible by clicking a project name anywhere in the app, or from the Projects list.

A focused view of a single project showing:
- **Backlog section:** all backlog tasks for this project in a vertical list with drag-to-reorder. Order is stored in the `backlog_order` field using **fractional indexing** (lexicographic string — e.g., the `fractional-indexing` npm package). Reordering updates only the moved task's `backlog_order` value. Rebalancing is triggered automatically when precision degrades.
- **Board section:** all board tasks for this project grouped by status (Up Next, In Progress, Done).
- **Description field:** editable inline. Saved on blur.
- **Stats bar:** total tasks / tasks in progress / tasks in backlog.

---

## 10. Navigation Structure

```
Top navigation bar (left)
├── Flowboard logo → Board view
├── Board
├── Week
├── Month
├── All Tasks
└── Projects

Top navigation bar (right)
├── + (new task)
├── ⊞ (toggle backlog panel — Board view only)
└── ⚙ (settings)

Mobile: top nav collapses to a bottom tab bar
```

---

## 11. Settings

| Setting | Options / Notes |
|---|---|
| Week start day | Sunday / Monday |
| Default view on launch | Board / Week / Month |
| Default project | Pre-select for new tasks (overrides localStorage last-used) |
| Density | Compact / Default / Roomy — adjusts card padding and gap via CSS variables on `<body>` |
| Quiet evenings | Toggle — when on, hides tomorrow's tasks after 8pm |
| Data export | Export all tasks and projects as JSON or CSV. Description: "Includes all tasks, projects, completion history, and recurring rules." |
| Clear archived tasks | Permanently delete archived tasks older than N days (N configurable, default 90). Requires confirmation. Label: "There's no undo for this." |

**Data import is not supported in v1.** Export only.

---

## 12. Persistence

- All task and project data stored in PostgreSQL.
- Session/UI state (active filters, backlog panel open, current view) persisted in `localStorage`.
- `localStorage` keys are namespaced (e.g., `flowboard:filters`, `flowboard:lastProject`).

---

## 13. Visual Design

**Principles:**
- Warm linen aesthetic. Flat UI with no gradients. Borders and muted background fills provide structure.
- Light and dark mode via `data-theme="dark"` on `<html>` (set from `prefers-color-scheme`; no manual toggle in v1).
- Subtle paper-grain texture on the app background (`bg-base`) via an SVG `feTurbulence` filter applied with `background-blend-mode: multiply` (light) / `screen` (dark).
- Color is **never** the sole indicator of meaning — priority is always shown as both a color and a text label.

### Typography

Two font families:

| Role | Family | Notes |
|---|---|---|
| Headings, column headers, page titles, modal titles, calendar date numbers | **Newsreader** (Google Fonts, `opsz` 6–72, weights 400/500/600/700) | Serif — loaded via `@import` in global CSS |
| Body, labels, badges, buttons, inputs | System sans-serif: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` | |
| Monospace (export only) | `ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace` | |

Type scale tokens:

| Token | Family | Size | Weight | Usage |
|---|---|---|---|---|
| `fb-h1` | Newsreader | 28px | 500 | Page headings (All Tasks, Projects, Settings) |
| `fb-h2` | Newsreader | 22px | 500 | Calendar nav (month/week labels) |
| `fb-h3` | Newsreader | 18px | 500 | Column headers, section headings |
| `fb-page-h` | Newsreader | 20px | 500 | Sub-page headers |
| `fb-section-h` | Sans | 11px | 600 | Uppercase section labels (letter-spacing 0.08em, `text-secondary`) |
| `fb-body` | Sans | 14px | 400 | Default body text |
| `fb-meta` | Sans | 12px | 400 | Meta, badges, captions (`text-secondary`) |

### CSS Design Tokens

Implement as CSS custom properties on `:root` (light) and `[data-theme="dark"]`:

**Light mode:**
```css
--bg-base:       #F0EEEA;   /* canvas / app bg */
--bg-surface:    #F8F6F2;   /* cards, panels, modals */
--bg-subtle:     #E9E6E0;   /* column bg, input fill */
--bg-sunken:     #DFDBD3;   /* count badges, deeper recess */
--border:        #D6D1C9;
--border-strong: #BFB9AF;
--text-primary:  #34302C;
--text-secondary:#7C7770;
--text-tertiary: #A8A29A;
--text-disabled: #C9C4BC;

--accent:        #C99098;   /* blush rose — focus rings, active nav, primary buttons */
--accent-soft:   #EBD4D8;
--accent-tint:   #F4E5E8;
--accent-ink:    #7E5158;   /* dark accent text on tinted bg */

--p-must:        #C68077;   /* soft terracotta */
--p-must-soft:   #ECD2CC;
--p-must-tint:   #F4E4E0;
--p-wait:        #9CA0A6;   /* cool dove gray */
--p-wait-soft:   #D6D8DC;
--p-wait-tint:   #E6E7EA;
--p-fun:         #88B5A4;   /* soft sage */
--p-fun-soft:    #CFDFD8;
--p-fun-tint:    #E0EAE5;
```

**Dark mode (`[data-theme="dark"]`):**
```css
--bg-base:       #1C1B1A;
--bg-surface:    #25231F;
--bg-subtle:     #2D2B27;
--bg-sunken:     #161513;
--border:        #3A3833;
--border-strong: #504D47;
--text-primary:  #EEEAE2;
--text-secondary:#A8A39A;
--text-tertiary: #7C7770;
--text-disabled: #555049;

--accent:        #E0AEB5;
--accent-soft:   #5A4244;
--accent-tint:   #3A2D2F;
--accent-ink:    #F2D8DC;

--p-must:        #DBA098;
--p-must-soft:   #5A3D38;
--p-must-tint:   #382925;
--p-wait:        #B6B9BD;
--p-wait-soft:   #46474A;
--p-wait-tint:   #2C2D2F;
--p-fun:         #A6CFC1;
--p-fun-soft:    #34504A;
--p-fun-tint:    #233330;
```

**Density tokens** — applied via `data-density` attribute on `<body>` (driven by `settings.density`):
```css
/* default */
--card-pad-y: 10px;  --card-pad-x: 12px;  --card-gap: 8px;  --card-radius: 10px;  --row-h: 36px;
/* compact */
--card-pad-y: 7px;   --card-pad-x: 10px;  --card-gap: 6px;  --row-h: 32px;
/* roomy */
--card-pad-y: 12px;  --card-pad-x: 14px;  --card-gap: 10px; --row-h: 40px;
```

### Project Color Palette (24 fixed colors)

Soft pastels — harmonious in both light and dark mode:
```
#D49B92  #E0B190  #E0CC92  #C5D198
#A6CFB0  #90C5B4  #92BCC2  #9AB4D6
#A8A8D6  #B5A4D2  #C8A4D2  #D49AC2
#C28290  #C29982  #C2B582  #A3B582
#82AE94  #82A89C  #82A0B0  #8298BC
#9A9ABC  #A492BC  #B292BC  #BC92A8
```

### Priority Color System

| Priority | UI Label | Color token | Usage |
|---|---|---|---|
| `must_do` | Must do | `--p-must` (`#C68077`) | 3px left border on cards; badge background `--p-must-tint` with `--p-must` text |
| `can_wait` | Can wait | `--p-wait` (`#9CA0A6`) | Same pattern |
| `fun` | Fun | `--p-fun` (`#88B5A4`) | Same pattern |

Priority badge shape: rounded pill, `border: 1px solid var(--p-*-soft)`, background `--p-*-tint`, text `--p-*` color; includes a 6px filled circle dot to the left of the label text.

### Component Details

**Task card (board):**
- Background `--bg-surface`, border `1px solid --border`, `border-radius: --card-radius`
- Left border: `width: 3px`, priority color, flush left, full card height
- Padding: `--card-pad-y` top/bottom, `--card-pad-x` right, `calc(--card-pad-x + 3px)` left (to clear the color bar)
- Title: 13.5px, weight 450, line-clamp 2 lines; done tasks use `line-through` with `text-decoration-thickness: 1px`
- Meta row below title (gap 8px, flex-wrap): Today chip (if promoted) → priority badge → project dot + name → date with calendar icon → recurrence tag
- Dragging state: `opacity: 0.5`, `rotate(-1.5deg)`
- Focused state (keyboard): `box-shadow: 0 0 0 2px --accent, 0 0 0 5px --accent-tint`

**Board columns:**
- Header: Newsreader 17px weight 500; count badge uses `--bg-sunken` bg
- Column body: `bg-subtle`, `border: 1px solid --border`, `border-radius: 12px`, `padding: 10px`, `gap: --card-gap`
- Empty state: custom flower/vase SVG illustration (`stroke: --text-tertiary`) + italic Newsreader caption (e.g., "Nothing here yet")

**Today banner (above board filter bar):**
- Background `--bg-surface`, `border-bottom: 1px solid --border`, `padding: 12px 22px`
- Date in Newsreader 20px weight 500; appointment count in `--p-must` color
- Right side: italic Newsreader 12px in `--text-tertiary` with a leaf icon — a gentle contextual message (e.g., "Take it gently today.")

**Backlog panel:**
- Width: 300px; `border-left: 1px solid --border`; header title "Later" in Newsreader 17px weight 500
- Project section headers: chevron + project dot (9px) + name + count; collapsible
- Backlog row: 3px priority color bar (width 3px, height 18px, borderRadius 2px) + title (12.5px, nowrap ellipsis) + ↻ icon if recurring

**Nav bar:**
- Height 56px; `bg-surface`; `border-bottom: 1px solid --border`; padding `0 22px`
- Logo: `FlowboardLogo` SVG (22px) + "Flowboard" in Newsreader 19px weight 600
- Active nav item: `bg: --accent-tint`, `color: --accent-ink`, weight 600, `border-radius: 8px`, `padding: 7px 12px`
- Inactive nav: `color: --text-secondary`, weight 450

**Task Detail Modal:**
- Width 580px; `border-radius: 16px`; `box-shadow: 0 12px 40px rgba(40,30,20,0.18), 0 2px 6px rgba(40,30,20,0.08)`
- Header: project breadcrumb (11.5px, uppercase, `--text-tertiary`) above title; title in Newsreader 22px weight 500
- Two-column body: main column (flex 1) + sidebar (width 230px, `bg-base` background)
- Sidebar status selector: vertical list of buttons, not a segmented control; active item has `--accent-tint` bg, `--accent-ink` text, checkmark icon
- Footer: `bg-base`, `border-top: 1px solid --border`

**Segmented control:**
- Container: `bg-subtle`, `border: 1px solid --border`, `border-radius: 8px`, `padding: 3px`, `gap: 2px`
- Active segment: `bg-surface`, `box-shadow: 0 1px 2px rgba(0,0,0,0.04)`, `border-radius: 6px`

**Filter chips (board/all tasks):**
- Inactive: transparent bg, `border: 1px solid --border`, `color: --text-secondary`
- Active: filled with the color value (priority color or project color), text `#FFF8F4`, no border

**Buttons:**
- Default: `bg-surface`, `border: 1px solid --border`, `padding: 8px 12px`, `border-radius: 8px`, 13px weight 500
- Primary: `bg: --accent`, `color: #FFF8F4`, no border; hover: `bg: --accent-ink`
- Ghost: transparent bg, no border; hover: `bg: --bg-subtle`
- Danger: `color: --p-must`; hover: `bg: --p-must-tint`, `border: --p-must-soft`

**Inputs:**
- `bg-surface`, `border: 1px solid --border`, `border-radius: 8px`, `padding: 9px 11px`
- Focus: `border-color: --accent`, `box-shadow: 0 0 0 3px --accent-tint`

**Color picker (project):**
- 6-column × 4-row grid of circular swatches
- Selected: double-ring (`box-shadow: 0 0 0 2px --bg-surface, 0 0 0 4px --accent`) with a checkmark icon in `#FFF8F4`

**Toast notifications:**
- `border-radius: 10px`, `padding: 10px 14px`, `box-shadow: 0 4px 14px rgba(40,30,20,0.08)`
- Success (teal): `bg: --p-fun-tint`, `border: --p-fun-soft`
- Info: `bg: --bg-surface`, `border: --border`
- Warning (terracotta): `bg: --p-must-tint`, `border: --p-must-soft`

**Weekly calendar timed events:**
- Use `--p-*-tint` as background (not `--bg-surface`) so each event is lightly priority-tinted
- Hourly gridlines via `repeating-linear-gradient` at 50% opacity

**Monthly calendar today cell:**
- Date number shown in a 22px circle: `bg: --accent`, `color: #FFF8F4`, weight 600

**Project cards (Projects list):**
- `border-radius: 12px`; `padding: 14px 16px`; 4px solid color bar on absolute left edge
- 3-column grid on desktop; title in Newsreader 17px weight 500

**Project detail stats bar:**
- Horizontal bar, `bg-surface`, `border-radius: 10px`, 4 stats: Total / In progress / Later / Done this month
- Stat value in Newsreader 22px weight 500; label in `fb-section-h` style (11px, uppercase)

**Decorative divider:** dotted-scallop pattern via `radial-gradient` at 8px height — use sparingly to separate major sections.

**Scrollbars:** 8px width, `--border` thumb color, `border-radius: 8px`, transparent track.

### Mobile Layout

**Bottom tab bar (5 items):**
- Board · Week · [+ FAB] · Tasks · Projects
- Center item is a circular FAB (44×44px, `bg: --accent`, `border-radius: 50%`, `box-shadow: 0 4px 10px rgba(184,106,110,0.4)`) floated 10px above the bar
- Active tab: icon + label in `--accent` color; inactive: `--text-tertiary`

**Mobile board column navigation:**
- Instead of horizontal scroll, a segmented control below the date header lets users switch between columns: Appt / Next / Doing / Done (with task counts shown below each label)
- Shows one column's task list at a time

**Mobile monthly calendar layout:** Compact dot-indicator grid (top half) + scrollable agenda list (bottom half). Each day cell shows up to 3 colored dots (priority colors); tapping a day scrolls the agenda. Selected day cell: `bg: --accent`, white text and dots.

**Mobile task detail:** Single-column scrollable form (no sidebar split); "Save" button pinned to bottom in a footer strip.

**Responsive breakpoints:**

| Breakpoint | Layout |
|---|---|
| Desktop (`> 1024px`) | Multi-column board; backlog panel fixed right (300px); full calendar grid |
| Tablet (`640px–1024px`) | Board stays multi-column; backlog panel as side-drawer overlay; calendar compresses |
| Mobile (`< 640px`) | Bottom tab bar; segmented column picker on board; dot-indicator monthly calendar; full-screen backlog overlay |

---

## 14. Accessibility

- All interactive elements keyboard-accessible (Tab, Enter, Space, arrow keys for board navigation).
- ARIA labels on all icon-only buttons.
- Focus trap in modals; focus returns to the triggering element on modal close.
- Sufficient color contrast ratios (WCAG AA minimum) in both light and dark modes.
- Color is never the sole indicator — all priority colors accompanied by text labels.
- Alt text on any non-decorative images or icons is descriptive and purposeful.

---

## 15. Out of Scope for v1

- Collaborative / multi-user features
- Native mobile app (responsive web app only)
- Notifications / reminders
- Apple Calendar / CalDAV sync (future consideration)
- Subtask nesting (tasks are flat within a project)
- Time tracking
- Attachments
- Data import (export only)
- Sample / seed data

---

## 16. Open Questions / Future Considerations

- CalDAV integration with Apple Calendar (noted in requirements as a future consideration).
- Password reset token cleanup strategy: expired and used tokens should be purged periodically (e.g., a scheduled job or lazy cleanup on login).
- Next-day auto-advance for recurring done tasks requires detecting "new day" on app load — implementation should compare the current date against a `last_opened_date` stored in `localStorage` to avoid redundant processing within the same day.
