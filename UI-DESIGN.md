# Planner interaction brief

The visual foundations and contributor rules now live in `docs/design-system.md`; use `docs/design-review.md` for the reusable prompt and acceptance rubric. This file retains the workflow evidence and interaction research behind the app.

## Evidence and purpose

The planner organizes client work into projects and tasks, with deadlines, waiting-on notes, capture/review, and weekly time logging. The inspected browser workspace mostly contained sample tasks, including “Follow up on scope,” alongside a “Write report” task. This is enough to design for client delivery and follow-ups, but not enough to infer a particular industry or the user's full real workload.

## Reference patterns

- [Todoist: getting started](https://www.todoist.com/help/todoist/get-started/get-started-with-todoist-OgNNJR): predictable hierarchy and disclosure. Applied as clickable client/project titles with chevrons and retained counts.
- [Things: Slim Mode](https://culturedcode.com/things/support/articles/3238254/): reduce visible chrome while concentrating. Applied as collapsible capture and focus panels, with a live compact timer.
- [Linear: Peek](https://linear.app/docs/peek): inspect details while retaining list context. Existing task notes remain available on hover/focus or touch, and secondary row actions appear when relevant.
- [Things: Quick Find](https://culturedcode.com/things/blog/2019/12/the-quick-find-update/): focused search. Applied as a quiet icon-led field with conditional clear and result feedback.
- [Toggl: timesheet view](https://docs.toggl.com/using-the-timesheet-view): weekly review of tracked work. Focus blocks retain task/project/client snapshots and editable descriptions, with weekly totals and copy.
- [Chrome: Document Picture-in-Picture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture): a small always-on-top productivity surface, dependent on the originating page remaining open. Applied as the optional floating focus clock with a normal-window fallback.

These are interaction references, not a reproduction of the products' appearance or an assertion that every referenced feature is implemented.

## Reusable implementation prompt

Improve this single-file planner for a consultant managing work across clients and projects. Ground changes in its existing task model and observed workflows: capture rough instructions, review proposed tasks, find a follow-up, move work to another project, recover a mistaken change, focus on one task, and review recorded work for a weekly timesheet.

Use clear hierarchy, restrained borders, consistent spacing, and progressive disclosure. Keep client/project summaries readable when collapsed. Make selection actions appear after selection. Make desktop hover interactions equally usable with a keyboard and provide visible touch alternatives. Preserve stable IDs, task ownership, the existing JSON format's compatibility, undo behavior, and local records. Keep clients fixed; make task and project moves available through drag handles as well as explicit controls.

Before editing, state the expected behavior for three scenarios: finding a waiting-on task in a long list; moving a project and its tasks to another client then undoing; and pausing a focus block while using another application. Implement the smallest coherent change, evaluate those scenarios plus 320px mobile layout and reload persistence, then revise any failed behavior. Report verified results and any browser-dependent limitation separately from design intent.

## Acceptance criteria

- A quiet idle task list, with discoverable keyboard and touch controls.
- Expansion does not lose hierarchy, and its state survives reload.
- Moving work keeps task IDs and project ownership consistent and is undoable.
- Focus logging excludes breaks and pauses, avoids duplicate blocks, and survives JSON round trips.
- The floating clock uses the same timer state and accurately explains host limitations.
- No horizontal overflow at narrow phone widths; no accidental changes to the user's actual planner during demo testing.
