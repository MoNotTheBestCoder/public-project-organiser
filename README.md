# Project Planner

## Two-file Claude handoff

Download `project-planner-1.html` and `CLAUDE-HANDOFF.md` from the same revision of `main`. The HTML runs on its own; the Markdown contains the complete product, styling, data, and AI/host integration context for Claude. No other repository files are required. These are code/context only, not your saved planner data. Live Claude capabilities must be checked in the destination environment.

## Appearance

Use **Light** or **Dark** at the bottom of the sidebar to switch between the official Stone & Dusty Blue and Graphite & Dusty Blue palettes. The first visit follows your device preference; an explicit choice is remembered separately from tasks and also applies to the floating clock. Speak, Paste drafts, Edit, and export controls remain neutral. Palette references live in `graphics/assets/`; runtime colours are embedded in the HTML, with no new downloads or dependencies.

A personal client, project, and task planner built as a single HTML page.

## Run locally

Open `project-planner-1.html` in your browser. No build step or package installation is required.

Download or copy the HTML source file to use the app elsewhere. The file contains application code only: no clients, projects, tasks, focus history, session notes, or saved drafting preferences are embedded. Double-click it to run without a server or any companion files. CSS, JavaScript, icons, and default drafting instructions are embedded; the optional Google font falls back to system fonts offline. Browser-dependent features such as dictation and picture-in-picture retain their normal browser restrictions. The app has no Download HTML button.

The standalone app stores planner data in browser local storage. Git tracks the application source, not your browser's saved clients, projects, or tasks. Use the app's JSON export to back up that data separately.

Some integrations depend on the original host environment or provider configuration. Google Fonts requires an internet connection.

## Files

- `project-planner-1.html` — application UI and logic.
- `workbench-PRD.md` — product specification and original implementation notes; some details may differ from the current HTML.

Do not commit API keys or exported personal/client data.

## Drafting from a note

Type or dictate everything on your mind into Quick add, then turn it into editable task
proposals. Nothing is saved until you approve the batch.

**When a model is reachable** — the page is open in a Claude artifact that provides the
`sample` capability — Quick add's button reads **Draft tasks**. Pressing it drafts directly,
with a Stop control while it runs. Review, edit or remove the proposals, then **Save**.

**When one is not** — a standalone file, or an artifact without that capability — the same
button reads **Copy drafting request** and the manual path appears instead:

1. Choose **Copy drafting request**.
2. Paste the request into your own ChatGPT/Codex conversation.
3. Copy the returned JSON array into **Paste drafts**, then choose **Review drafts**.
4. Edit or remove proposals and press **Save** to approve the remaining batch.

The manual path is a fallback, not the normal flow. There is no API key, no direct API
request and no paid proxy anywhere in this file — by design. The page never reaches into a
ChatGPT conversation on its own; step 2 is you, moving text. Which of the two you get is
decided once at load by capability detection, and the button label and help text follow it.

`drafting-context.md` contains the drafting preferences. When served over HTTP, the planner reads this file; an embedded copy provides defaults when opened directly or used as an artifact. Previously saved browser context takes precedence. The context panel is hidden at the user's request.

## Local demo and checks

Run `python -m http.server 8765 --bind 127.0.0.1`, then open `http://127.0.0.1:8765/project-planner-1.html?demo=1` for an isolated sample workspace. Omit `?demo=1` for the real planner. Browser data does not migrate automatically between origins or file URLs.

Run `node --test planner.test.cjs dragdrop.test.cjs focus-popout.test.cjs standalone.test.cjs theme.test.cjs sidebar.test.cjs` for regression checks. Live Claude and microphone permissions must be checked in their actual environments.

## Managing tasks

- Search titles, general notes, waiting-on notes, client names, and project names. Results respect the selected client and sidebar filters, including hidden completed tasks.
- Add general **Notes** in the task editor. Notes appear on hover or keyboard focus on desktop; on phones and touch screens, tap **Notes** to open or close them.
- Click a task's title to rename it on the row, and its due date — or the **+ Due date** placeholder — to change it there too. Enter or clicking away saves; Escape abandons the edit. Everything else still opens the Edit dialog.
- Break a task into **steps** from its row menu. Steps are a checklist — text and a tick, nothing more — so they never become a second task list. A task with steps shows a small `2 of 5 steps` chip with an arrow that opens and closes the list and turns green when they are all done; a task without steps looks exactly as it did before. Typing Enter adds a step and keeps the field open, so a whole list goes in without reaching for the mouse. Finishing every step does not complete the task; that stays your call.
- Every task row carries one **…** menu holding its actions: set or change a due date, break it into steps, move it to another project or client, edit its details, read its notes, or delete it. Selecting tasks with their checkboxes reveals a compact toolbar for moving or deleting the whole selection. On desktop the checkbox and menu appear on hover or keyboard focus; on touch they stay visible.
- Drag a task row onto a project or client, or onto the Unassigned target shown during dragging. Dragging a selected task moves the whole selection. Drag a project card onto a client to transfer the project and its tasks together, and drag client cards to reorder them. A client's tasks with no project sit in a collapsible **No project** card after its projects; drag tasks into it, out of it, or up and down within it. Move/Edit dialogs remain available on touch and keyboard.
- Drop a task **onto another task row** to place it exactly there — a thin line shows whether it will land above or below. That manual order is what the list shows from then on, ahead of status and due date. New and moved tasks join the end of their list. Completed tasks drop to the bottom of the list, most recently finished first.
- **Export backup** writes every client, project, task and focus record to a JSON file; **Import backup** reads one back. Importing replaces the current planner and counts what it is about to add before it does, and a single **Undo** reverses the whole import. This is how a planner moves between a standalone file, a Claude artifact, and another browser — the two store records in different places and neither syncs to the other.
- A backup stays readable as the app changes. Fields added by a later version are carried through untouched rather than discarded, so exporting from a newer build and importing into an older one does not lose them; importing a file from a newer build says so first.
- **Undo** and **Redo** recover the last 20 changes during the current visit, including batch moves/deletions and client/project changes. Reloading or receiving a remote replacement clears this history. Undo is saved like any other change.
- Phone layouts use a collapsible sidebar drawer, stacked controls, larger tap targets, and scrollable edit dialogs. No horizontal page scrolling is required at tested 320px and 390px widths.

## Focus sessions and timesheets

- Set session length (including breaks), a focus-block length, and break length in minutes. For 75/25/5, the sequence is 25 focus + 5 break + 25 focus + 5 break + 15 focus, logging 65 minutes of work. Pauses and waiting between periods do not consume the budget. A final remainder too short for a break is used for focus. Start, pause, resume, or end a session early; each next block or break waits for you to start it. An already-running plan imported from an older backup retains its original end condition.
- Attach a client, project, or task directly, or browse further with the adjacent arrow. Search across all levels. The closed picker stays one line; its dropdown opens only on request. Client/project-only work leaves the task blank and requires no placeholder task or note. The weekly time log includes only active focus intervals; pauses and breaks are excluded. You can edit a recorded block's client/project/task assignment or note and copy a week's log for your timesheet.
- **+ Add session** logs focused work you did without running the timer: a date, how long you focused, an optional client/project/task and note. Time is set with the same stepper as the timer: arrows, keys or scrolling move it in five-minute steps, and clicking the number lets you type 90, 1:30 or 1h 30m. The client, project or task comes from the same searchable picker as the Focus page. The record it creates is identical to a timed one, so it exports and copies the same way.
- **Edit details** on any logged session can change its date, recorded time, assignment and note, or **Delete** it. Editing the time replaces the timer's measurement and updates your weekly total; the planner's Undo does not cover focus records, so the old figure is not recoverable. A deleted session can be brought back with **Undo** in the message that follows. The day's log lists the latest session first.
- Timer settings, the current session, and completed focus blocks are included in the version 2 JSON export and browser storage. Older planner JSON loads with focus defaults. Task Undo does not erase focus records.
- Reloading restores a timer using its saved timestamp. A closed or sleeping browser can finish the current block on return, but never invents additional focus blocks. Pause before stepping away if that time should not count.
- **Floating clock** opens a compact always-on-top Document Picture-in-Picture window when supported. It shares the same countdown and controls, with a circular remaining-time indicator and single-line task/note controls. Notes expand while typing; task browsing opens only when requested. Opening it leaves the main Focus panel expanded. Notes entered just after a block finishes annotate that block; selecting a different assignment prepares the current/next block without rewriting earlier assignments. Keep the planner tab open in the background; closing or reloading that tab closes the floating window. Closing just the floating window leaves the session running.
- **CSV** and **Markdown** in the time log export only the currently selected week's focus records, with task, project, client, notes, and measured duration. Week boundaries use your local timezone; exported start/end timestamps use UTC. Blocks crossing a week boundary contribute only their active time within the selected week. CSV text cells that resemble spreadsheet formulas are prefixed with an apostrophe for safe importing.
- Other browsers offer a normal mini window, which is not always on top. If picture-in-picture is rejected by the host, **Open mini window** provides that fallback. Popup blocking may require allowing popups for the planner. No extension or API key is needed.

## Quieter navigation

The sidebar lists clients with the most open work first and shows five at a time, with a **+ n more** expander for the rest, so a long client roster does not turn the sidebar into a scroll. Whichever client you have selected stays in the list even if it is one of the quiet ones.


The sidebar switches between **Project planner** and **Focus**. New task and client filters remain in the sidebar; New project and New client live on the planner page. The Focus page contains the timer and weekly time log. An active countdown remains visible beside its sidebar button, and switching pages does not stop the session.

Click client or project titles to expand or collapse their contents. Focus and Quick Add can also collapse; the focus header keeps its countdown and start/pause control. Page selection, disclosure, and Show more preferences survive reloads within the same workspace.

Research references and the reusable design brief are in `UI-DESIGN.md`.

Visual foundations and component rules are in `docs/design-system.md`. Before adding graphics or restyling controls, use the alignment prompt and review checklist in `docs/design-review.md`; `AGENTS.md` makes these part of the repository's contributor workflow.
