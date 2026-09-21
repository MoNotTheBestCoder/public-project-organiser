# Workbench — PRD (as built)

What this app actually is today, written against the current
`project-planner-1.html`. An earlier version of this file described a much smaller
build — clients, projects, tasks and one AI shortcut — and had drifted far enough from
the code to be misleading. This replaces it.

## Purpose

A personal, single-user workbench for consulting work: capturing tasks across several
concurrent client engagements, working on them in timed focus sessions, and turning that
into a weekly timesheet. One page, one person, private storage, no backend.

## User & JTBD

A consultant running several client engagements at once.

- When work arrives in conversation rather than in a ticket, I want to dump it somewhere
  fast and sort out where it belongs afterwards, so nothing is lost between a call and a
  to-do list.
- When I sit down to work, I want to start a timed block against a specific client or
  project, so that at the end of the week I know where my hours went without reconstructing
  them from memory.

## Core function

Tasks nested under projects nested under clients — but loosely, on purpose. A task may
live under a project, directly under a client, or nowhere yet. Around that sit four
things: capture (typed, dictated or AI-drafted), manual organisation, focus timing, and
weekly export.

## Two pages

| Page | Contains |
| --- | --- |
| **Project planner** | Quick add, search, the client/project/task board, undo/redo, selection batch actions |
| **Focus** | Timer with block/break schedule, assignment picker, the floating clock, the weekly log and its exports |

The sidebar switches between them, lists clients as a scope picker, holds the two filters
(hide done, show archived), the Light/Dark control and the backup export. It collapses to
an icon rail on desktop and becomes a dismissible drawer on phones and tablets.

## Features

**Built:**

- Manual add / edit / delete for clients, projects and tasks, with required-field
  validation and cascade-delete confirmations naming the counts being removed
- Closed status vocabularies as badge dropdowns — Client: Active/Archived; Project:
  Active/On Hold/Done; Task: To Do/In Progress/Waiting/Done
- Per task: due date (overdue flagged), a waiting-on blocker note, and free general notes
  that reveal on hover/focus, or through a touch control on phones
- Inline editing of a task's title and due date on the row; everything else via one
  overflow menu per row
- Steps: a task can hold a checklist of `{text, done}` items, entered in a run with
  Enter and searchable by their text. A step is deliberately not a task — no status,
  no date, no assignment — so the tree stays three levels deep
- Manual ordering. Tasks carry a numeric `order`, drag whole-row, and can be dropped onto
  another task row to insert above or below it. Completed tasks fall to the bottom of their
  list, most recently finished first, without a completion-date field
- Drag to re-own: a task onto a project, client, Unassigned or a sidebar client entry; a
  project onto a client, taking its tasks with it. Clients never move
- Search across task titles, notes, blockers, project and client names, respecting filters
- Multi-select with batch move and batch delete; undo/redo over the last 20 changes
- Quick add: free-text or dictated capture turned into reviewable, editable draft
  clients/projects/tasks. Nothing saves before explicit approval
- Focus sessions: a session budget split into focus blocks and breaks, pause/resume/end,
  assignment to a client, project or task, a per-session note, and an optional always-on-top
  floating clock
- Manual focus entries for work done without the timer, producing records identical to
  timed ones
- Weekly log with CSV and Markdown export of the selected week, plus a copy-to-clipboard
  form, and a full JSON backup separate from those
- Two themes (Stone & Dusty Blue, Graphite & Dusty Blue), chosen from the OS on first visit
  and then remembered separately from records

**Deliberately not built:** dashboards or reporting views, multi-user sharing, assignees,
notifications, AI summaries or suggested next actions, an in-app "download this HTML"
button, and any field beyond the data model below.

## Journey

Open the page → records load from private storage → capture into Quick add, or use
+ Client / + Project / + Task → drag things into the order and the owner you want →
switch to Focus, attach a client/project/task and start a block → at the end of the week,
open the time log and export CSV or Markdown.

## Data model

| Entity | Fields |
| --- | --- |
| Client | `id`, `name`, `status` (Active \| Archived), `accent?`, `accent2?`, `brandChecked` |
| Project | `id`, `clientId` → Client, `name`, `status` (Active \| On Hold \| Done) |
| Task | `id`, `projectId?` → Project, `clientId?` → Client, `title`, `status` (To Do \| In Progress \| Waiting \| Done), `dueDate?`, `note?` (waiting-on), `notes?` (general), `order`, `steps[]` |
| Step | `id`, `text`, `done` — held inside its task, never a record of its own |
| Focus settings | `totalMinutes`, `focusMinutes`, `breakMinutes`, `repeat`, `budgetMode` |
| Focus run | in-flight timer: `id`, `settings`, `status`, `phase`, timings, `assignment`, `note`, `intervals` |
| Focus session | `id`, `runId`, `assignment`, `note`, `intervals[]`, `startedAt`, `endedAt`, `durationMs`, `outcome` |

A task holds `clientId` even when it has a `projectId`; `normalize()` keeps the two
consistent from the project's owner. Orphan projects and tasks, illegal status values and
malformed dates are coerced or dropped on load rather than crashing. A task without a
usable `order` is given one on first load, in the order the old status/due-date sort would
have shown it, so migrating changes nothing visible.

Stored as one JSON document per viewer — `data/users/<id>/tracker` under the host `db`
capability, or `localStorage` under `project-planner-v1` standalone. The two are separate
stores holding the same document shape, and a backup moves records between them:
`exportBackup()` writes the file, `importBackup()` reads it back. That round trip is what
makes a planner portable between a standalone file, an artifact, and another browser.

### Format evolution

`SCHEMA_VERSION` records the document shape; `MIGRATIONS` gives each change a home. The
format is built to outlive the feature set, in both directions:

- **Older file, newer app.** `migrate()` runs any registered step, then `normalize()`
  supplies defaults for anything absent. Versions 2 and 3 needed no migration entry because
  their additions (focus records, task `order`) default themselves, and version 4
  (task `steps`) needs none either. A v1 file with no version field at all still loads.
- **Newer file, older app.** Fields this build does not recognise are carried through
  rather than dropped. `normalize()` collects them per record into a non-enumerated `x`
  carrier and `serialize()` puts them back, so exporting from a build with more features,
  importing into one with fewer, and exporting again does not destroy the extra fields.
  Known fields always win over carried ones, so a stale copy cannot shadow a real field,
  and each carrier is capped at `EXTRA_BUDGET` characters so an oversized or hostile file
  cannot grow the document without limit. Import warns explicitly before replacing a
  planner with a file whose version is ahead of this build.

Import validates everything before replacing anything, so a malformed file leaves the
planner untouched; it names the common mistake of picking a drafts file by hand; and the
swap routes through `commit()`, so a single Undo reverses an entire import.

## Technical approach

One self-contained HTML file: no framework, no CDN, no build step, no companion asset
required at runtime. CSS custom properties carry the two themes. The board is CSS
multi-column; layout inside a card is driven by container queries against the card's own
width, not the viewport's.

Host capabilities, each detected independently and each degrading on its own:

- `db` + `user` — per-viewer private persistence; debounced, serialised single-writer saves
- `sample` — reached only through the AI adapter below
- `downloads` — file export; falls back to a browser `Blob` download standalone

## The split: what can and cannot reach a model

This is the single most load-bearing thing about the app, and the thing most likely to be
misunderstood by anyone changing it.

There are two capture paths, and which one is live is decided **once, at load, by
capability detection** — not per feature and not per click:

1. **Direct drafting.** The page is running somewhere that provides
   `window.claude.use("sample")` with a callable `json`. Quick add's button reads **Draft
   tasks** and calls the model, with a Stop control. Results are proposals; nothing is saved
   until the user approves the batch.
2. **Manual handoff.** No such capability — a standalone file, or an artifact runtime
   without it. The button reads **Copy drafting request**, the help text appears, and the
   user moves the prompt into their own chat and pastes the JSON back into **Paste drafts**.

Path 2 is not a broken version of path 1. It exists because this app deliberately has **no
API key field, no direct API request and no hosted proxy**, and is not going to acquire
one. A published artifact's CSP would not permit a direct provider call anyway, but the
constraint is a product decision first and a platform fact second. "The fallback is clunky,
let's just add a key" is the wrong conclusion and would break the file's portability and
privacy story at once.

Only two entry points may ever initiate a model request:

| Method | Trigger | What happens with the result |
| --- | --- | --- |
| `AIModel.draftTasks(prompt, {signal})` | User presses Draft tasks | Locally validated into editable proposals; nothing saves before approval |
| `AIModel.suggestClientBrand(prompt)` | Background lookup after a client is created or its custom colour cleared | A recognised valid colour is applied and can be overridden in Edit client |

Everything else — edits, deletes, moves, ordering, search, selection, undo, focus timing,
logging, themes, exports — is ordinary local code. `window.claude`'s `db`, `user` and
`downloads` are host services, not AI, and must not be folded into the adapter.

## AI model adapter

Both entry points go through one internal module rather than touching a provider:

```
AIModel.init()               try each registered provider until one reports available
AIModel.isAvailable()        true once a provider is active
AIModel.draftTasks(p, opts)  → { ok: true, data } | { ok: false, code }
AIModel.suggestClientBrand(p)
AIModel.retire()             caller-driven: stand the AI features down after a terminal failure
```

There is no exported generic `json()`; callers cannot invent a third model feature without
adding it here deliberately. Each adapter normalises its own errors to five codes
(`cancelled`, `rate_limited`, `invalid_response`, `too_large`, `unavailable`) that
`aiErrorCopy()` turns into user-facing text, so no caller ever sees a provider's error
shape. One adapter ships, `claudeAdapter`, wrapping `window.claude.use("sample")`. A
different runtime is supported by writing an adapter of the same shape and listing it in
`PROVIDERS`; no other function changes.

## Graceful degradation

Every capability resolves to null when unavailable and is handled on its own: no
`db`/`user`/viewer id → an in-memory session with a plain in-UI warning that changes will
not be saved; no `sample` → the manual capture path above, with manual entry unaffected; no
`downloads` → a `Blob` download, or the copy-to-clipboard form for the weekly log. A
refused or revoked write drops to memory mode with a specific message rather than silently
losing edits.

## Success criteria

"I stopped trying to keep this in my head — I open one page, add or check off what
happened, start a timer when I sit down, and on Friday the timesheet is already written."

## Verification

128 headless checks across six Node test suites (`planner`, `dragdrop`, `focus-popout`,
`standalone`, `theme`, `sidebar`), run with:

```sh
node --test planner.test.cjs dragdrop.test.cjs focus-popout.test.cjs standalone.test.cjs theme.test.cjs sidebar.test.cjs
```

They cover normalisation and migration, CRUD and cascade deletes that preserve rather than
destroy child tasks, ordering and drag/drop including stale-drag rejection, search and
selection, undo/redo, the Quick add review flow (invented IDs blanked, invalid dates
dropped, atomic rejection of malformed JSON), steps and their limits, the AI boundary and
its error mapping, focus timing and log export, theming, the sidebar, and the standalone
path including corrupt local data.

What they cannot cover: these suites run in a plain VM with stub elements, so anything
depending on real layout is out of reach — container queries in particular are not
implemented by `jsdom` at all. Layout work needs a real browser at desktop, narrow-window
and phone sizes. Live capability behaviour — drafting, cancellation, brand lookup,
persistence and download permissions — has to be checked in the destination artifact.
