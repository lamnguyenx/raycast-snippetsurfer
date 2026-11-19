# Choice Dropdown in the Prompt Form

**Date**: 2026-11-19
**Status**: Implemented
**Module**: `src/components` (`TemplateArgumentForm.tsx`)

## Problem Statement

`TemplateArgumentForm` rendered one `Form.TextField` per discovered prompt. That worked
for `{{ask:Label}}` tokens but gave no way to present a fixed set of alternatives. The
`{{choice:...}}` token needed a dropdown while keeping the existing text prompt and submit
flow unchanged.

## Implementation

The original dropdown implementation branched on `TemplatePrompt.kind`. This example records its first version.

```tsx
prompts.map((prompt) =>
  prompt.kind === "choice" ? (
    <Form.Dropdown key={prompt.id} id={prompt.id} title={prompt.label} defaultValue={prompt.defaultValue}>
      {(prompt.options ?? []).map((option) => (
        <Form.Dropdown.Item key={option} value={option} title={option} />
      ))}
    </Form.Dropdown>
  ) : (
    <Form.TextField
      key={prompt.id}
      id={prompt.id}
      title={prompt.label}
      defaultValue={prompt.defaultValue}
      placeholder={`Enter ${prompt.label}`}
    />
  )
);
```

Original rendering details

- `prompt.id` is used for the React key and the form field id.
- `prompt.label` is display-only.
- `prompt.options` becomes one `Form.Dropdown.Item` per option.
- `prompt.defaultValue` is the first option for choices.
- `Action.SubmitForm` still returns a `{ [id: string]: string }` map, which
  `HeavyDutyActionPanel` passes to `expandTemplate(raw, { values })`.

## Contract With `src/utils`

`TemplateArgumentForm` assumes:

- `kind === "text"` has a `defaultValue` (possibly empty) and no meaningful `options`.
- `kind === "choice"` has a non-empty `options` array and a `defaultValue` equal to one
  of those options.
- `id` is the stable key used by expansion. The form translates from generated field IDs.
- `label` may repeat in theory (two unlabeled choices are both titled `Choose`), so it
  must never be used as the identity.

The parser enforces non-empty options before creating a prompt, so the form never renders
an empty dropdown.

## Trials, Errors & Lessons Learnt

- **Label as identity was the first bug.** The original text-field mapping used
  `prompt.label` for both `key` and `id`. Choices can share the default `Choose` label, so
  two different option lists would collide in React and in the submitted values map.
  Introducing `prompt.id` separated identity from presentation.
- **Dropdowns need at least one item.** Raycast requires a selectable value. The form does
  not defensively render an empty dropdown because the parser already filters empty option
  lists; the invariant is documented in the module reference.
- **Defaults must be real option values.** `defaultValue` is set to `options[0]` by the
  parser. The form does not invent a default or an empty placeholder, which could submit a
  value that expansion does not know about.
- **The original single action could use Raycast's submitted values directly.**
  Supporting alternate actions later required controlled values so every action
  could read the current selections.
- **The component stays token-agnostic.** It only knows `text` and `choice` prompt kinds,
  not the `{{ask:...}}` or `{{choice:...}}` syntax. Future prompt kinds can be added in the
  prompt model and a new branch here without changing the action wiring.
- **Duplicate option keys are possible in principle.** React would warn on duplicate
  `Form.Dropdown.Item` keys, so the option splitter collapses duplicates before the form
  sees them.
- **Text prompts must not regress.** The existing `TextFields` path keeps its prefill and
  placeholder behavior; only the identity source changed from `label` to `id`.

## Validation

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

The temporary expander smoke test covered the id/value mapping that the form relies on
(selecting a non-default option and expanding it through the same key).

## Follow-up: Action-Aware Submission

The first action-aware version replaced **Insert Snippet** with three submit
actions. The live regression persisted after restoring a single native submit.
Generated Raycast field IDs resolved it. The final form uses one native submit
for the opening action and two plain actions with controlled values.

- [Current component plan](2026-11-19-action-submit-form-panel.md)

- [`Prompt Form Content Actions`](../../../../../../../docs/plans/2026/11/19/2026-11-19-prompt-form-content-actions.md)
- [`⌘↵ no-op bug (module)`](../../../../issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md)
- [`⌘↵ no-op bug (parent)`](../../../../../../../docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md)

## Related Documents

- Parent plan: `docs/plans/2026/11/19/2026-11-19-multiple-choice-prompts.md`
- Token engine plan:
  `src/utils/docs/plans/2026/11/19/2026-11-19-choice-token-parser.md`
- Module reference: `src/components/docs/important/choice-form.md`
- User-facing reference: `docs/important/snippet-tokens.md`
