# Components Module

Raycast UI components shared by the snippet-search commands.

## Files

| File | Purpose |
| --- | --- |
| `CustomActionPanel.tsx` | Legacy action panel plus `HeavyDutyActionPanel`, which reads raw content, prompts, expands tokens, and runs copy/paste/type actions. |
| `SnippetContent.tsx` | Detail-pane Markdown for legacy snippets. |
| `TemplateArgumentForm.tsx` | Collects values for `{{ask:...}}` and `{{choice:...}}` prompts, then offers copy, paste, or type actions. |

## TemplateArgumentForm

Added choice support on 2026-11-19:

- `kind: "text"` → `Form.TextField` (existing behavior).
- `kind: "choice"` → `Form.Dropdown` with one item per option.
- The first option is preselected.
- Raycast uses generated form field IDs. The expander still receives values keyed by
  `prompt.id`, and `prompt.label` is display text.
- The opening action is the sole `Action.SubmitForm` and uses Raycast’s native `⌘↵`
  shortcut. The two alternate actions read the current values from the controlled fields.
- Each action passes its values to `HeavyDutyActionPanel` for snippet expansion.

See:

- [`docs/important/choice-form.md`](docs/important/choice-form.md) — rendering rules,
  invariants, and the cross-module contract.
- [`docs/plans/2026/11/19/2026-11-19-choice-dropdown-form.md`](docs/plans/2026/11/19/2026-11-19-choice-dropdown-form.md)
  — implementation plan, trials, errors, and lessons learnt.
- [`docs/plans/2026/11/19/2026-11-19-action-submit-form-panel.md`](docs/plans/2026/11/19/2026-11-19-action-submit-form-panel.md)
  — action wiring, the submit regression, and live verification.
- [`docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`](docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md)
  — `⌘↵` regression history and verification status.
- [`../../docs/important/snippet-tokens.md`](../../docs/important/snippet-tokens.md) —
  user-facing token reference.

## Validation

Run `npm run lint` and `npm run build`. Live Raycast verified native submit and Copy
from the action panel. The manual guide includes the original reproduction token.
[How to test](../../docs/important/how-to-test.md)
