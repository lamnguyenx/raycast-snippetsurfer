# Prompt Form Copy/Paste/Type Submit Actions (⌘↵ No-Op)

**Date**: 2026-11-19
**Status**: Fixed and verified in Raycast
**Scope**: Parent extension (`raycast-snippetsurfer`) + `src/components`
**Reported by**: User, 2026-11-19

## Fix

Using one native `Action.SubmitForm` still reproduced the failure with the
original Model snippet. Both Command+Enter and clicking the Copy button left
the clipboard unchanged. Giving each Raycast form field a generated ID
(`prompt-0`, `prompt-1`, etc.) restored submission. The form maps those IDs back
to the original prompt keys for snippet expansion.

The opening action remains the native submit action. The alternate actions
read the controlled field values. In live Raycast testing, Command+Enter
copied the edited choice. Copy from the action panel also worked with Copy
as the opening action and with Paste as the opening action. The sections
below record the original investigation.

## Summary

After selecting a value in the `{{choice:...}}` prompt form, pressing **⌘↵** does nothing.
The form stays open, the clipboard is unchanged, and no notification appears. The action
button itself renders with the `⌘↵` badge (verified via the macOS Accessibility tree), but
the shortcut is inert.

Two background notes that are **not** part of this bug:

- In a Raycast **List**, `↵` runs the primary action; in a **Form**, the submit shortcut is
  `⌘↵` and plain `↵` is consumed by the focused field/dropdown. So "Enter doesn't copy
  anymore" after the form opens is expected Raycast behavior — the bug is that `⌘↵` does
  not submit either.
- Snippets without prompt tokens are unaffected: `↵` in the list still runs the primary
  action directly.

## Environment

| Item | Value |
| --- | --- |
| Raycast | 1.104.32 (dev mode, `npm run dev` / `ray develop`) |
| `@raycast/api` (installed) | 1.67.1 (`package.json` declares `^1.44.0`) |
| macOS | 27.x, arm64 |
| Repro snippet | `~/.snippets/dot-claude/how-to-prompt/use-opencode-as-your-subagent.md` (contains `{{choice:Model=VAI 2/glm-5.3\|opencode-go/deepseek-v4.1-flash}}`) |

## Reproduction

1. Open **Search Snippets** in Raycast.
2. Select a snippet containing `{{choice:...}}` (or `{{ask:...}}`).
3. Press `↵` (Copy to Clipboard). The prompt form opens ("Fill In Snippet Values").
4. Press `⌘↵`.

Expected: the form submits, the chosen action runs (clipboard copy, toast/dialog).
Actual: no visible reaction; window stays on the form; clipboard unchanged.

## Root Cause

Not confirmed yet. All official Raycast examples place **exactly one**
`Action.SubmitForm` per `Form`; supporting multiple submit actions in one action panel is
the prime suspect (see Hypotheses below).

## Trials, Errors & Findings

### Attempt 1 — Submit actions inside `ActionPanel.Section`

First implementation rendered each content action as its own `Action.SubmitForm` wrapped in
`<ActionPanel.Section title="Use Snippet">`.

- ✅ Buttons rendered correctly.
- ✅ First button showed the `⌘↵` badge (Accessibility dump showed
  `AXButton "Copy to Clipboard ⌘↵"`).
- ❌ Pressing `⌘↵` did nothing. Verified by scripted reproduction: open the form with
  `↵`, send `keystroke return using command down` via System Events, then dump the window
  — still the form; `pbpaste` unchanged.

Lesson recorded: keep `Action.SubmitForm` elements as direct children of `ActionPanel`
inside a `Form`; a section wrapper at least *looks* wrong for submit actions.

### Attempt 2 — Direct `ActionPanel` children, reordered `pop()`

Removed the section wrapper and moved `pop()` to run **after** starting the action
callback (matching the ordering used across official examples).

- ❌ User re-tested: `⌘↵` still does nothing ("ah even Cmd + Enter is not copying to
  clipboard — the UI didnt react").

This rules out the section wrapper and the `pop()` ordering as the sole cause.

### Attempt 3 — Explicit `shortcut` on the first submit action (reverted)

Briefly set `shortcut={{ modifiers: ["cmd"], key: "enter" }}` on the first
`Action.SubmitForm`. Reverted before user testing: the default form shortcut already
claims `⌘↵`, and redefining it historically triggered render errors
(raycast/extensions#898). No evidence it would help.

### Baseline that worked

Before this session, the form had a **single** `Action.SubmitForm` titled
**Insert Snippet**, and `⌘↵` did run the opening action (user:
"i see cmd + enter to insert"). The regression appeared when the single submit action was
replaced with multiple submit actions.

## Hypotheses & Next Steps

Ordered by likelihood:

1. **Multiple `Action.SubmitForm` actions are not supported.** Official docs and every
   searched real-world extension use exactly one. The `⌘↵` binding may only attach to a
   lone submit action; with several present, the badge renders but no handler fires.
   *Test*: temporarily render a single `Action.SubmitForm` ("Copy to Clipboard") and
   confirm `⌘↵` works, then add the second and re-test to find the breaking point.
   *Likely fix*: keep one `SubmitForm`, and track field values in React state
   (`value`/`onChange` per prompt, or `useForm` from `@raycast/utils`) so the remaining
   copy/paste/type entries can be plain `Action`s that read the current values.
2. **Dropdown search field swallows `⌘↵`.** `Form.Dropdown` is a searchable control; a
   focused dropdown may consume the keystroke. *Test*: submit a form whose only prompt is
   `{{ask:...}}` (text field) vs a choice-only form; try `filtering={false}` on the
   dropdown; try tabbing focus off the dropdown before `⌘↵`.
3. **Dev-mode staleness.** *Test*: restart `npm run dev`, or run a production
   `npm run build` install, before retesting.
4. **Version mismatch** between Raycast 1.104 and the older pinned `@raycast/api`
   typings/runtime helpers (1.67.1). *Test*: bump `@raycast/api` and retest.

## Interim Mitigation (not applied)

If a quick fix is needed before the cause is confirmed: restore the single
`Action.SubmitForm` (titled after the opening action) as the only submit entry, which is
the last known-working configuration, and document the loss of in-form action switching.

## Testing Constraints (lessons learnt)

- Raycast's main window is an `AXSystemDialog` overlay tied to the active Space and the
  cursor's display; it disappears from the Accessibility tree when not visible, so
  automation must `AXRaise` it first and re-check focus (`key code` keystrokes go to
  whatever is frontmost, which repeatedly was the browser, not Raycast).
- `screencapture` was blocked for the agent (no Screen Recording permission), so
  verification relied on the Accessibility element dump plus `pbpaste`.
- Per the user's request, automation on their active desktop was stopped; a Raycast
  overlay cannot be pushed to a separate Space programmatically (macOS exposes no API to
  attach it to another Space), and hot-switching Spaces would have disturbed their work.
  Future UI verification should happen in a separate macOS user account or VM.

## Affected Modules

| Module | Involvement | Bug doc |
| --- | --- | --- |
| Parent extension | User-facing behavior, docs | this file |
| `src/components` | `TemplateArgumentForm` action panel, `HeavyDutyActionPanel` wiring | [`src/components/docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`](../../../../../../src/components/docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md) |

## Related Documents

- [Prompt form content actions plan](../../../../../plans/2026/11/19/2026-11-19-prompt-form-content-actions.md)
- [Multiple-choice prompts plan](../../../../../plans/2026/11/19/2026-11-19-multiple-choice-prompts.md)
- [Snippet tokens reference](../../../../../important/snippet-tokens.md)
