# Prompt Form Content Actions

**Date**: 2026-11-19
**Status**: Implemented — blocked by an open bug (`⌘↵` does not submit; see bug docs)
**Scope**: Parent extension (`raycast-snippetsurfer`) + `src/components`

## Problem Statement

Snippets with `{{ask:...}}` or `{{choice:...}}` tokens open a prompt form before the
selected content action runs. The form exposed a single submit action titled
**Insert Snippet**, which hid which action would run and offered no way to switch to
copy-to-clipboard after picking a choice value. The user wanted choice snippets to behave
like every other snippet: pick, then copy.

## What We Built

- `TemplateArgumentForm` now receives an ordered `actions` array instead of one `onSubmit`
  callback; each entry renders as its own `Action.SubmitForm`:
  - **Copy to Clipboard**
  - **Paste to Active App**
  - **Type to Active App**
- The action that opened the form stays first; copy is always available.
- `HeavyDutyActionPanel` extracts the copy, paste, and type bodies into content runners
  (`ContentAction { title, icon, run }`) shared by the list action panel and the form.
- Submit actions are direct `ActionPanel` children (no `ActionPanel.Section` wrapper).

## Known Issue (open)

`⌘↵` renders on the primary submit button but does not fire any `onSubmit`. Submission
is a no-op in the current build. Details, attempted fixes, and the follow-up plan:

- [`docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`](../../../../issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md)

Clarity note (not a bug): in a Raycast **List**, `↵` runs the primary action; in a
**Form**, the submit shortcut is `⌘↵`, so plain `↵` after the form opens is expected to
be consumed by the dropdown/field.

## Module Map

| Module | Responsibility | Documentation |
| --- | --- | --- |
| Parent extension | User-facing docs, token reference, cross-module contract | this plan; `docs/important/snippet-tokens.md` |
| `src/components` | Submit-action rendering, content runners, form wiring | `src/components/docs/plans/2026/11/19/2026-11-19-action-submit-form-panel.md`; `src/components/docs/important/choice-form.md` |

## Trials, Errors & Lessons Learnt

- **"Opening action first" beat "preference first".** Ordering the form's actions by the
  `primaryAction` preference was the first draft; it was replaced because the action the
  user just chose from the list is the stronger signal in a secondary view.
- **`ActionPanel.Section` around submit actions broke `⌘↵`.** The action panel rendered
  fine with actions grouped in a section, but the form submit shortcut went inert. Direct
  `ActionPanel` children are the documented-looking shape for forms.
- **`pop()` after the action starts.** Matches official form examples: run the submit
  work, then navigate back.
- **Explicit `shortcut` on `SubmitForm` was reverted.** Redefining the default `⌘↵` has a
  history of render errors (raycast/extensions#898) and duplicated the binding the form
  already assigns.
- **The single-submit form worked.** The multi-action change is what correlates with the
  regression; that is the leading hypothesis in the bug doc (multiple
  `Action.SubmitForm` per form may be unsupported). The likely long-term shape is one
  `SubmitForm` plus state-tracked plain actions.
- **Scripted verification is fragile against Raycast.** The Raycast window is an
  `AXSystemDialog` bound to the active Space; keystroke automation repeatedly targeted
  the frontmost browser instead, and `screencapture` was permission-blocked. The
  Accessibility tree plus `pbpaste` were the reliable probes. Desktop automation on the
  user's active workspace was stopped at their request; future UI tests belong in a
  separate user account or VM.

## Validation

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Related Documents

- [Bug: ⌘↵ no-op (parent)](../../../../issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md)
- [Multiple-choice prompts plan](2026-11-19-multiple-choice-prompts.md)
- [Choice form reference](../../../../../src/components/docs/important/choice-form.md)
- [Token reference](../../../../important/snippet-tokens.md)
