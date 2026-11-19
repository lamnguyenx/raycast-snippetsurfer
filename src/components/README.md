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
- `prompt.id` is the form field id and React key; `prompt.label` is display only.
- `Action.SubmitForm` returns a `{ [id]: value }` map that `HeavyDutyActionPanel` passes
  to `expandTemplate(raw, { values })`.
- The form exposes **Copy to Clipboard**, **Paste to Active App**, and **Type to Active
  App** as submit actions, so the user can choose how to use the snippet after filling it
  in. The action that opened the form is listed first, as a direct `ActionPanel` child
  (never wrapped in an `ActionPanel.Section`).

**Known issue (open, 2026-11-19):** with multiple submit actions, `⌘↵` renders on the
first button but does not fire any `onSubmit`; submission is a no-op. The single-submit
form was the last known-good shape. See
[`docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`](docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md).

See:

- [`docs/important/choice-form.md`](docs/important/choice-form.md) — rendering rules,
  invariants, and the cross-module contract.
- [`docs/plans/2026/11/19/2026-11-19-choice-dropdown-form.md`](docs/plans/2026/11/19/2026-11-19-choice-dropdown-form.md)
  — implementation plan, trials, errors, and lessons learnt.
- [`docs/plans/2026/11/19/2026-11-19-action-submit-form-panel.md`](docs/plans/2026/11/19/2026-11-19-action-submit-form-panel.md)
  — action-aware submit panel (this session's work).
- [`docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`](docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md)
  — open `⌘↵` submit bug.
- [`../../docs/important/snippet-tokens.md`](../../docs/important/snippet-tokens.md) —
  user-facing token reference.

## Validation

Run `npm run lint` and `npm run build`. Choice rendering was type-checked and built with
the rest of the extension; the expander smoke test covered the id/value mapping used by
the form.
