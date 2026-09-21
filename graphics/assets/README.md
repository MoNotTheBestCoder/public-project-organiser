# Official planner themes

Exactly two themes: **Stone & Dusty Blue** (light) and **Graphite & Dusty Blue** (dark). `palettes.json` records the user's reference backgrounds and status swatches, with the subsequently chosen dusty blue accents (#4C6385 light / #9BB4D8 dark). The matching runtime tokens are embedded in `project-planner-1.html` under `plannerThemeTokens`; there is no runtime fetch or stylesheet dependency.

Use ground for the canvas/sidebar and surface for content. Dusty blue is the primary action and selection accent. In Progress is blue, Waiting amber, Done green, and Overdue/Delete red. Derive soft backgrounds and borders from these values using the embedded semantic tokens. Use the darker `--wait-ink` token for small amber text on pale backgrounds to keep it legible; `--wait` retains the exact swatch.

Speak, Paste drafts, Edit, export controls, and ordinary secondary buttons use neutral surfaces, text, and outlines. They do not inherit a dusty blue fill. Add controls may use a faint dusty blue tint; primary actions such as Copy drafting request and Start focus use solid dusty blue. Delete retains a restrained red treatment. Do not colour every button.

Keep all existing icons, shapes, layout, and spacing. No new raster images, icon fonts, themes, animation libraries, or external dependencies. Theme choice changes CSS variables and is saved separately from planner records. Floating clocks use the same embedded tokens and update with the planner.

Automatic client accents come from the approved palette. Existing custom client brand colours remain user data and are not overwritten by changing a theme. The previous default teal value maps to the current brand token for display, so older default clients follow the new accent without rewriting saved records. Claude's separate brand lookup is documented in `docs/ai-integration.md`.

Scope: `main` and `feature/focus-sessions` only. Do not modify or merge the native Mac edition's branch unless explicitly requested.
