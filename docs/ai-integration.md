# AI boundary and Claude artifact integration

The portable HTML contains an isolated `AIModel` module, not a required external JavaScript file. Its provider adapter returns data; it does not access planner records, manipulate the UI, or save changes. Keep this boundary when moving the file into an artifact.

## Model call allowlist

| Entry point | Trigger and input | What happens with the result |
| --- | --- | --- |
| `AIModel.draftTasks(prompt, {signal})` | User presses Draft tasks in a supported Claude runtime. Includes the capture text, saved drafting preferences, and current client/project/task snapshot. | Local validation loads editable proposals. Nothing saves until the user approves. |
| `AIModel.suggestClientBrand(prompt)` | Background lookup after creating a client manually or through approved drafts, or clearing a client's custom colour. Sends the client name and colour instructions. | A recognised, valid brand colour is applied automatically; it can be overridden in Edit client. This is not the task approval flow. |

The brand lookup asks the model to recall a colour; it does not browse or verify the company's branding. The normal client palette assignment (`nextAccent` / `backfillAccents`) is deterministic local code and does not call AI. Changing light/dark mode does not call AI or rewrite client records. Custom client brand colours are separate from the app's interface palette.

All other planner operations are local or persistence operations: task edits, deletes, moves, sorting, search, selections, undo, focus timing, logs, and exports must not call a model. Copy drafting request and Paste drafts are a manual handoff, with no automatic access to a ChatGPT conversation.

## Host services are not AI

The preserved Claude adapter discovers `window.claude.use("sample")` and requires a callable `json` method. Only the adapter calls that method. It normalizes provider errors and supports cancellation for drafting. There are no API keys, direct model HTTP requests, or paid API fallbacks in this file.

Other uses of `window.claude` are separate host integrations: `db` / `user` for persistence and `downloads` for file export. Do not move those into the model adapter or treat every Claude host call as an AI request.

If the sample capability is absent or incompatible, drafting uses copy/paste and clients use the local palette. A different artifact API should be implemented inside the provider adapter; do not spread provider calls across UI handlers. Capability detection establishes availability, not universal compatibility with every Claude artifact environment.

## Verification when returning to Claude

Node tests simulate the existing sample capability, error mapping, unavailable runtimes, and draft review without saving. Live Claude verification still requires the destination environment: check capability discovery, draft cancellation/review/approval, client-brand lookup, and persistence/download permissions separately.
