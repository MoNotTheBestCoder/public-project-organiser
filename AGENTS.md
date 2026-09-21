# Project Planner repository guidance

Before changing visuals, read `docs/design-system.md` and `docs/design-review.md`. Use `UI-DESIGN.md` for workflow context and earlier research. Current user instructions override these documents.

- Work on `main` and `feature/focus-sessions` only unless the user explicitly names another branch. Do not merge or change the separate native Mac edition's branch as part of browser work.
- Exactly two official themes: Stone & Dusty Blue (light) and Graphite & Dusty Blue (dark). Read `graphics/assets/README.md` and use `graphics/assets/palettes.json`. Keep embedded runtime tokens in sync; preserve neutral secondary controls and the existing icons.

- Keep `CLAUDE-HANDOFF.md` aligned with behavior, styling, and AI/host capabilities; it and the HTML must be sufficient for a two-file Claude handoff.
- Keep `project-planner-1.html` portable: embed runtime CSS, JavaScript, icons, and default context. Do not introduce a build step or required companion assets without a clear task need.
- Read `docs/ai-integration.md` before changing AI or Claude integration. Only `AIModel.draftTasks` and `AIModel.suggestClientBrand` may initiate model requests; host persistence/downloads and theme/default palette logic are not AI.
- Before adding a graphic, identify its purpose in this planner and the existing component or token it extends. Prefer the existing inline SVG vocabulary. Add decorative imagery only when it serves a concrete user need.
- Reuse semantic CSS variables and established control states. Keep light/dark styles, keyboard access, touch alternatives, and the compact floating timer coherent.
- Keep changes to browser-stored records separate from source changes. Test with an isolated `?demo=...` workspace.
- Preserve stable IDs, ownership, undo, focus timing, and export formats when changing UI.
- Do not add a Download HTML button. The source file is already the portable app. Keep weekly CSV/Markdown exports separate from the full data backup.
- Do not add `Co-Authored-By` or session-link trailers to commit messages or pull request descriptions. The owner does not want agent attribution in this project's history.
- Run relevant tests with `node --test planner.test.cjs dragdrop.test.cjs focus-popout.test.cjs standalone.test.cjs theme.test.cjs sidebar.test.cjs`. For visual work also inspect the changed UI at desktop and phone sizes; report browser checks that could not be performed.
