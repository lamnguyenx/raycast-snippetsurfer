# Components Module

Raycast UI components shared by the snippet-search commands.

## Files

| File | Purpose |
| --- | --- |
| `CustomActionPanel.tsx` | Legacy action panel plus `HeavyDutyActionPanel`, which reads raw content, prompts, expands tokens, and runs copy/paste/type actions. |
| `SnippetContent.tsx` | Detail-pane Markdown for legacy snippets. |
| `TemplateArgumentForm.tsx` | Collects values for `{{ask:...}}` and `{{choice:...}}` prompts before an action runs. |

## TemplateArgumentForm

Added choice support on 2026-11-19:

- `kind: "text"` → `Form.TextField` (existing behavior).
- `kind: "choice"` → `Form.Dropdown` with one item per option.
- The first option is preselected.
- `prompt.id` is the form field id and React key; `prompt.label` is display only.
- `Action.SubmitForm` returns a `{ [id]: value }` map that `HeavyDutyActionPanel` passes
  to `expandTemplate(raw, { values })`.

See:

- [`docs/important/choice-form.md`](docs/important/choice-form.md) — rendering rules,
  invariants, and the cross-module contract.
- [`docs/plans/2026/11/19/2026-11-19-choice-dropdown-form.md`](docs/plans/2026/11/19/2026-11-19-choice-dropdown-form.md)
  — implementation plan, trials, errors, and lessons learnt.
- [`../../docs/important/snippet-tokens.md`](../../docs/important/snippet-tokens.md) —
  user-facing token reference.

## Validation

Run `npm run lint` and `npm run build`. Choice rendering was type-checked and built with
the rest of the extension; the expander smoke test covered the id/value mapping used by
the form.
