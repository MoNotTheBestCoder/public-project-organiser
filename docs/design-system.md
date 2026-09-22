# Visual system

## Product fit

This is a personal workbench for client/project tasks, rough task capture, focused work, and weekly timesheets. The visual direction is calm, compact, readable, and useful. Use exactly two official themes: Stone & Dusty Blue (light) and Graphite & Dusty Blue (dark), defined in `graphics/assets/palettes.json`. Preserve quiet hierarchy, rounded controls, restrained glass, and the existing icons. The app name is still being discussed; do not rename it or create a new logo without a chosen name.

`graphics/assets/palettes.json` is the approved palette reference. The HTML embeds matching CSS variables under `plannerThemeTokens` so the file works by itself. Supporting surfaces and borders derive from those variables. Read `graphics/assets/README.md` before adding colours; do not introduce a third theme or fetch the palette at runtime.

## Repository structure

| Location | Responsibility |
| --- | --- |
| `project-planner-1.html` | Embedded theme tokens, component styles, inline SVGs, UI markup, and behavior; the portable deliverable |
| `graphics/assets/` | The two approved palettes and their usage rules; reference assets only |
| `docs/design-system.md` | Visual foundations, component roles, and rules for new graphics |
| `docs/design-review.md` | Reusable design prompt and practical acceptance checks |
| `UI-DESIGN.md` | Workflow evidence and interaction references |
| `AGENTS.md` | Contributor entry point that directs visual work to these guidelines |

Keep new CSS near the related component and update its existing rule instead of accumulating conflicting override blocks. No external design-system dependency or new asset library is required. If a future image is justified, retain its editable source and provenance under `graphics/assets/`, and embed the required runtime asset in the shipped HTML.

## Foundations

| Role | Existing implementation | Rule |
| --- | --- | --- |
| Page and cards | `--canvas`, `--panel`, `--panel-2` | Quiet backgrounds; avoid textured task-list surfaces |
| Text | `--ink`, `--ink-2`, `--ink-3` | Primary content, supporting copy, then subdued metadata; essential labels must remain readable |
| Brand and selection | `--brand`, `--brand-soft`, `--brand-ink` | Dusty blue signals the primary action or selected state |
| Danger | `--danger`, `--danger-bg` | Delete uses a restrained red border and tint plus an explicit label; no shadow |
| Borders and elevation | `--line`, `--line-soft`, `--lift` | Use elevation to show containment or overlays, not on every row |
| Corners | `--r-sm` 9px, `--r-md` 12px, `--r-lg` 16px | Follow the existing scale; a timer ring is circular by function |
| Typography | Plus Jakarta Sans with system fallbacks | One body family; tabular numerals for countdowns and durations |
| Spacing | Existing component spacing | Prefer a 4px rhythm for new layouts; compact optical adjustments are allowed when needed |

Preserve light and dark theme variants. Glass must retain a readable base tint and visible boundary without `backdrop-filter`; blur is an enhancement. Keep regular text legible against the actual composited background. Do not depend on color alone for status or selection.

## Components

- **Buttons:** Start/Resume and Copy drafting request are dusty blue primary actions. Add Task/Project/Client and Add session use a faint dusty blue tint and nothing else. Speak, Paste drafts, Edit, Move, export, and other secondary controls stay neutral. Delete uses the palette's red treatment. All of them keep the base padding, radius and interaction states — see Prohibitions before giving one its own treatment. Touch targets remain generous even when icons are visually small.
- **Theme choice:** A compact Light/Dark control in the sidebar remembers the user's choice separately from task data. On the first visit, choose one of those two themes based on the OS preference. Changing it also updates an open floating clock. No new libraries, images, or runtime asset requests are needed.
- **Disclosure and navigation:** Use inline SVG chevrons with a consistent rounded stroke, not font characters. Current convention: 16-unit viewBox, about 1.6-unit stroke, 12–16px rendered size. Use `currentColor`. Point right/down for collapsed/expanded hierarchy; use a clear down/up pair for a picker. Preserve accessible names and expanded state. Clients, projects and Unassigned all disclose the same way: the circular `.twist` button first, then the name, wrapped in `.disclosure` (`disclosureTitle()`). A container with nothing in it offers no toggle at all.
- **Task list:** Keep titles and status prominent. Secondary actions — Move, Edit, Delete and the `+ Due date` placeholder — appear on desktop hover/focus and remain usable on touch. Batch controls appear after selection. Clients remain fixed; tasks and projects can move. Rows drag whole, with no handle; a drop on another row shows a thin insertion line rather than the container outline. The title and due date are editable in place on the row; everything else goes through the Edit dialog. Display order is the user's manual `order`, not status or due date.
- **Client list:** The sidebar lists clients busiest first, alphabetically within a tie so the order does not reshuffle when two clients swap a task, and caps at five with the same `+ n more` expander the capped task lists use. A dropdown was considered and rejected: it hides the counts and colour dots, which are the reason the list is worth glancing at, and costs a click every time. The selected client is always in the list even when it falls outside the cap.
- **Sidebar:** *Project planner* is the way home: it always lands on All work, every client, rather than on whichever client was last picked. Picking one client is what the client list is for. *Focus* leaves the client choice alone. Desktop navigation collapses to an icon rail with Planner, Focus, New task, and an entry to expand Clients and filters. Keep accessible names and hover titles when labels are hidden. Remember the desktop choice separately from records. At phone and tablet widths, use a dismissible drawer opened from the compact header, with Escape, focus containment, and focus return to its trigger; selecting a workspace or client closes it.
- **Focus assignment picker:** Select a client, project, or task directly; adjacent browse arrows drill into children without selecting. Search across all three levels, including empty clients/projects. Keep the closed control to one line on both pages and floating windows, truncating long paths with a full title. The dropdown overlays content only after an explicit click; close/Escape returns focus to its summary. Use the existing chevrons, neutral surfaces, and a subtle selected tint.
- **Focus:** Session length includes focus and breaks, excluding pauses. Block length and break length belong on the main page. A 75-minute session with 25/5 periods is 25 focus + 5 break + 25 focus + 5 break + 15 focus; only the 65 focus minutes enter the log. If the final remainder cannot fit a full break plus more focus, use it for a short final focus block without a trailing break. Existing saved timers retain their original budget semantics. Both clock rings show time remaining. The floating clock keeps compact task selection, a one-line note that expands for editing, and pause/end controls; reduce outer whitespace rather than shrinking these fields. Opening it does not collapse the main panel. Request a small window; browser chrome and sizing may vary.
- **Search results:** The board's nesting is gone, so each result states where it lives directly under its title: the client's own colour dot, the client name in medium weight, then the project. Results are not reorder targets, because they span several lists and "put this above that" would have no single meaning. While a search is running, Quick add folds away and returns when the search is cleared; that is a temporary state and never overwrites the saved preference.
- **Steps:** A task can hold a checklist. A step is text and a tick and nothing else — giving one a status, a date or an assignment would make it a task and add a fourth level to the tree, which is the thing this feature exists to avoid. A task with no steps shows nothing at all: no chip, no placeholder, no affordance. One appears only once steps exist, reading `2 of 5 steps` and turning green at completion, and clicking it discloses the list. Entry is through the row menu (`Break into steps`, then `Add a step`); typing Enter commits one and keeps the field open so a list goes in without a click per line. Ticking the last step never completes the task — a silent state change the user did not ask for is worse than an extra click.
- **Overflow menus:** A row or header that cannot hold its controls on one line folds the secondary ones into a single overflow button (three dots, 16-unit viewBox, `currentColor`) that opens an action sheet. The one primary action stays inline — Add task on a card header, the status and due date on a task row. Destructive entries carry the danger palette and sit last. On touch the button gets a visible border, because there is no hover state to suggest it is there. Task rows and card headers use the same button and the same sheet; do not invent a second pattern for one of them.
- **Durations:** A length is entered as hours and minutes side by side, each a number input backed by a datalist — the arrow offers whole hours and five-minute steps to pick from, and the same box accepts a typed number for anything in between. The step drives the spinner only; it must never decide what is allowed, or a typed 37 against a five-minute step is silently refused. Modal forms carry `novalidate` and run their own required-field checks, so native validation cannot block a value the field is meant to accept.
- **Weekly log:** Prioritize readable task/context, exact active time, and notes. CSV/Markdown export only the selected week's records. Export controls are secondary actions.

## Prohibitions

Each of these is named because this codebase drifted into it and had to be pulled back out.
They are not general design theory; they are the specific mistakes this file has already made.

- **One glass recipe, not one per control.** Add, Edit and Delete each grew their own
  `box-shadow` + `linear-gradient` + `backdrop-filter` with different numbers, so three
  controls on the same row looked unrelated. The fault was the divergence, not the glass:
  removing it entirely was an overcorrection. Glass now comes from shared theme tokens
  (`--glass-sheen`, `--glass-edge`, `--glass-drop`, each set per theme) applied in a single
  rule to the controls that carry it — create actions, primary actions, and delete. Colour
  still says what a control does; the glass is identical on all of them. Secondary controls
  (Edit, Move, Speak, Paste drafts, exports) stay neutral with no glass at all. Never give
  one button its own gradient, shadow or blur values.
- **No radius override without a size reason.** A control that overrides `--r-sm` to 10px or
  11px only breaks the corner rhythm of the row it sits in. Change the radius when the control
  changes size, not to make it look distinct.
- **No per-list-type drag convention.** Tasks and projects once had their own six-dot handle;
  now both drag by the whole row. Whatever the affordance is, every draggable list uses the
  same one, and the keyboard/touch alternative (Move, Edit) stays.
- **One helper for a repeated phrase.** Task counts were rendered four different ways in four
  places. Shared wording lives in one function — `taskSummary()` — and call sites use it rather
  than composing the sentence again.
- **Status colour and client brand colour are two systems.** Status uses the palette's semantic
  tokens; a client's `accent`/`accent2` are record data. Never let one supply the other, and
  never let either stand in for the interface theme.
- **Prefer reusing `order` over adding a date field for pure ordering.** Done tasks sort
  newest-first by bumping the existing `order`, not by recording a `completedAt` nobody reads.
  Add a field when something needs the value itself, not when it needs a sequence.
- **A column has to earn its place.** The board takes a second column only when each would still hold a task row on one line, and a project column has a minimum width for the same reason. A board that splits whenever it physically can buys a column and charges every row inside it: at a half-screen window that turned 47px rows into 140px ones.
- **Hidden is not gone.** `opacity: 0` and `visibility: hidden` still occupy layout. Hover-revealed controls that wrap reserve a line under every row forever, whether or not anything is visible in it. Either keep them on the row or fold them into the overflow menu; never leave them wrapping invisibly.
- **Every card that lays out its own rows is its own container.** `.client` and `.project` both set `container-type: inline-size`. A project card inside a client card is far narrower than it, and rows inside the project must be measured against the project. Adding a card that holds rows without making it a container means those rows are told they have room they do not have.
- **Never re-enter `render()`.** Replacing the board's innerHTML detaches whatever had focus, and the browser fires blur and focusout synchronously during that teardown. A handler that commits and redraws from one of those events restarts a render that is still running, which throws and silently abandons the save. `render()` drops nested calls for this reason; keep it that way, and do not commit from a handler without checking what fired it.
- **Card-width layout belongs in a container query, not a viewport query.** A card in a
  two-column board is far narrower than the viewport. Rules about how a row inside a card
  wraps key off `@container`; rules about the device — page padding, touch target size, the
  16px font that stops iOS zooming — stay in `@media`.
- **Touch targets key off the pointer, not the width.** The 44px minimums used to live inside
  `max-width` breakpoints, so a tablet, or a phone held sideways at 844px, was wider than the
  breakpoint and got desktop-sized buttons under a finger: *Edit details* measured 64×27 on a
  768px touch screen. Size for a finger under `@media (pointer: coarse)`; keep width breakpoints
  for layout.

## Before adding a graphic

Write a short alignment note covering: the user action it helps, where it appears, what existing style it extends, and why an existing text label/icon is insufficient. Reuse an existing icon first. Charts belong here only if they clarify the user's time or workload. A decorative hero illustration, stock photo, new mascot, or elaborate logo does not currently help the core workflow.

Review the proposal against both pages, the compact timer, light/dark backgrounds, and phone layouts. This is a contributor self-check, not an additional user approval step. Keep useful changes moving within the user's authorized request.

## Research rationale

Microsoft's [design-token guidance](https://fluent2.microsoft.design/design-tokens) distinguishes raw values from semantic aliases. For this small app, CSS custom properties provide that structure without adding a framework. Its [material guidance](https://fluent2.microsoft.design/material) also supports choosing surfaces according to purpose and technical limits; here, solid content surfaces and restrained glass controls preserve readability.

Atlassian's [iconography guidance](https://atlassian.design/foundations/iconography) emphasizes recognizable symbols and a consistent family. We adopt those principles while keeping this app's existing rounded SVG style, rather than importing another product's exact icon treatment.
