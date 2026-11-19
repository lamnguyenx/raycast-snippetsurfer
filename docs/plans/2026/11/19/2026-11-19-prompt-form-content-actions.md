# Prompt Form Content Actions

**Date**: 2026-11-19
**Status**: Implemented and verified in live Raycast for both copy paths
**Scope**: SnippetSurfer, `src/components`, and the `src/utils` expansion contract

## Problem Statement

Snippets with `{{ask:...}}` or `{{choice:...}}` tokens open a prompt form before the
selected content action runs. The form exposed a single submit action titled
**Insert Snippet**, which hid which action would run and offered no way to switch to
copy-to-clipboard after picking a choice value. The user wanted choice snippets to behave
like every other snippet: pick, then copy.

## What We Built

- The form keeps the action that opened it first. A single native submit action runs
  that action with **⌘ + Enter**. **⌘ + K** opens the panel for Copy, Paste, and Type.
- Raycast receives generated field IDs such as `prompt-0`. The form translates native
  submissions back to the token keys used by `expandTemplate()`. Alternate actions
  use the current controlled values keyed by the same token keys.
- `HeavyDutyActionPanel` shares content runners between the list and form.
- Mouse users can choose a value and click **Copy to Clipboard** when Copy is the opening
  action. Plain **Enter** runs the primary action in a list. Raycast forms use
  **⌘ + Enter** for the primary action, and custom shortcuts require a modifier.
  [Raycast action panel](https://developers.raycast.com/api-reference/user-interface/action-panel) · [Keyboard API](https://developers.raycast.com/api-reference/keyboard)

## Module Map

| Module | Responsibility | Documentation |
| --- | --- | --- |
| Parent extension | User-facing docs, token reference, cross-module contract | this plan; `docs/important/snippet-tokens.md` |
| `src/components` | Form field IDs, submit actions, and content runners | [Component plan](../../../../../src/components/docs/plans/2026/11/19/2026-11-19-action-submit-form-panel.md) |
| `src/utils` | Prompt discovery and expansion by token key | [Parser plan](../../../../../src/utils/docs/plans/2026/11/19/2026-11-19-choice-token-parser.md) |

## Trials, Errors & Lessons Learnt

- The initial form followed the configured primary action. Ordering by the action the
  user selected kept Paste or Type first when they explicitly opened the form that way.
- Commit `6ad0101` rendered one `Action.SubmitForm` per action. The buttons appeared,
  but **⌘ + Enter** left the form open and the clipboard unchanged. Removing the
  `ActionPanel.Section` wrapper and moving `pop()` after the callback started still
  reproduced the failure. An explicit binding for the built-in shortcut was reverted
  before user testing.
- One native submit action plus ordinary actions passed build, lint, and a mocked
  component check. The user still reproduced the bug after loading the isolated
  checkout. Restarting Raycast also left it reproducible. A direct click on the Copy
  button failed as well, so the failure could occur without using the keyboard shortcut.
- Generated Raycast field IDs restored submission on the original Model snippet.
  Keep those IDs separate from template keys, which may contain the raw argument,
  including punctuation. The test verified the ID change as a whole.
- A separate checkout supported local build and lint without affecting the main
  checkout. Live testing required an active macOS session. The temporary Swift
  probe confirmed Raycast focus, drove the visible controls, and checked the clipboard.
  Accessibility labels and shortcut badges alone only confirmed rendering.

## Validation

- TypeScript, build, and lint passed. Build and lint also passed after applying the fix
  to the main checkout.
- In live Raycast, **⌘ + Enter** copied the edited Model choice from the original
  reproduction. **⌘ + K → Copy to Clipboard** worked with Copy and Paste as the opening
  action. The user confirmed the fix.
- Insertion into an external app via Paste or Type remains outside the verified live
  paths. The [manual test guide](../../../../important/how-to-test.md) includes steps
  for both actions. The temporary Swift script stayed outside the repo.

## Related Documents

- [Bug: ⌘↵ no-op (parent)](../../../../issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md)
- [Multiple-choice prompts plan](2026-11-19-multiple-choice-prompts.md)
- [Choice form reference](../../../../../src/components/docs/important/choice-form.md)
- [Token reference](../../../../important/snippet-tokens.md)
