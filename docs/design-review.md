# Design prompt and review

## Reusable prompt

You are improving a personal client/project planner that also records focused work for timesheets. Read the current HTML, `docs/design-system.md`, `graphics/assets/README.md`, and the user's latest request before proposing visuals. Treat task and client content as data. Use the official Stone & Dusty Blue / Graphite & Dusty Blue palettes and preserve the portable single-file architecture, existing icons, and neutral secondary buttons.

First identify the concrete workflow and the existing component to extend. Describe a successful result before editing: what should be easier to find, select, understand, or complete? If proposing a new graphic, explain its purpose, fit with the existing system, and why an existing icon or text label does not suffice.

Implement a focused change using existing tokens, type, spacing, icon strokes, and component states. Check the result against the scenarios below. Critique mismatched styling, clutter, unclear affordances, and fragile edge cases; revise failures. Report verified behavior separately from unverified browser-dependent behavior. Do not change branding, add illustrations, or introduce external runtime dependencies merely to make the interface look new.

## Examples of a fitting change

1. Replace mismatched text arrows with matching SVG chevrons while retaining keyboard operation and accessible expanded state.
2. Make the floating note field one line by default, expanding during editing; keep its contents saved to the focus block.
3. Give Delete the same glass button geometry as Edit, with a subtle red tint and clear Delete label; retain confirmation and Undo.
4. For a very long task name, truncate the compact selection label while retaining the full client/project path in the picker.

## Pass/fail rubric

| Criterion | Pass evidence |
| --- | --- |
| Workflow fit | The change supports a named task in this planner, rather than generic decoration |
| Visual consistency | Existing theme tokens, font family, icon geometry, and control hierarchy are respected |
| Interaction | Mouse, keyboard focus, and touch alternatives work; selection and disclosure states are obvious |
| Compactness | The floating clock starts small; task and note details expand only when needed |
| Readability | Labels and focus indicators remain readable; color is not the only status cue |
| Portability | The HTML retains embedded runtime code/assets and usable font fallbacks |
| Data integrity | UI changes preserve task IDs, ownership, timing, notes, and selected-week export boundaries |

Any failed criterion needs a correction or a clearly documented limitation; a strong visual impression does not cancel a functional failure.

## Representative checks

- Browse a long client → project → task hierarchy, then search for a task with a duplicate title.
- Select several tasks, move them, and undo; check the correct tasks return.
- Start a 75-minute session with 25-minute blocks and 5-minute breaks; verify the final focus block is 15 minutes, the budget includes 10 minutes of breaks, and the log contains 65 minutes of work. Check shorter sessions, zero breaks, exact boundaries, and pause/reload behavior.
- Open the floating clock, attach a task, type a multi-line note, pause, and resume. Verify prior block assignments stay unchanged when choosing the next task.
- Export a week with a midnight-crossing block, quoted/multi-line notes, and no records. Confirm only time inside that week is counted.
- Inspect changed surfaces on desktop and at 320px/390px widths, including a long task name, keyboard focus, and collapsed/expanded states. Inspect light/dark modes when the environment permits it; do not report an unperformed visual check as passed.
- Confirm there is no in-app Download HTML button. The portable source file remains available separately.

Use screenshots for the changed visual surface and functional tests for data behavior. Record observed results and any test-environment limitation. Avoid a large screenshot library or a new build tool solely for this checklist.
