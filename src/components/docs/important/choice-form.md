# Choice Prompt Form Reference

This is the module-level reference for rendering `{{choice:...}}` prompts in
`src/components/TemplateArgumentForm.tsx`. For the token grammar and expansion behavior,
see `src/utils/docs/important/choice-token.md`.

## Input

`TemplateArgumentForm` receives:

```ts
interface TemplateFormAction {
  title: string;
  icon?: Image.ImageLike;
  onSubmit: (values: { [id: string]: string }) => void | Promise<void>;
}

interface TemplateArgumentFormProps {
  prompts: TemplatePrompt[];
  actions: TemplateFormAction[];
}
```

`actions` is the ordered list of content actions (copy, paste, type). The action that
opened the form is first and uses Raycast’s native form submission. The remaining
actions are available in the action panel.

`TemplatePrompt` is defined in `src/utils/TemplateExpander.ts`:

```ts
interface TemplatePrompt {
  id: string;
  label: string;
  kind: "text" | "choice";
  defaultValue: string;
  options?: string[];
}
```

## Rendering Rules

### Action panel

The primary action is a direct `Action.SubmitForm` child of the action panel and
receives values from Raycast on submit. The alternate actions use `Action` and
read the current values from React state. Text and dropdown fields update that
state through `onChange`. The submit handler maps each generated Raycast field
ID back to its prompt ID before expansion.

### Text prompts (`kind: "text"`)

```tsx
<Form.TextField
  key={prompt.fieldId}
  id={prompt.fieldId}
  title={prompt.label}
  value={values[prompt.id]}
  onChange={(value) => updateValue(prompt.id, value)}
  placeholder={`Enter ${prompt.label}`}
/>
```

### Choice prompts (`kind: "choice"`)

```tsx
<Form.Dropdown
  key={prompt.fieldId}
  id={prompt.fieldId}
  title={prompt.label}
  value={values[prompt.id]}
  onChange={(value) => updateValue(prompt.id, value)}
>
  {prompt.options.map((option) => (
    <Form.Dropdown.Item key={option} value={option} title={option} />
  ))}
</Form.Dropdown>
```

## Invariants

- **Field IDs are generated.** Raycast uses `prompt-0`, `prompt-1`, and so on.
  Template expansion uses the original prompt IDs, which can contain token text.
  Multiple unlabeled choices are all labelled `Choose`.
- **Options are non-empty.** `parseChoiceArg()` returns `null` for an empty list, so no
  choice prompt with zero options reaches the form.
- **The default is a real option.** `defaultValue === options[0]` for every choice prompt.
- **Options are unique.** The parser collapses duplicates before rendering.
- **Values are strings.** Dropdown items use the option text as both `value` and `title`.
- **All actions use the current values.** The selected action receives a
  `{ [id]: value }` map, which the panel passes to `expandTemplate(raw, { values })`.
- **The opening action stays primary.** The action selected in the list is the first form
  action. Copy is always available even when the form was opened from paste or type.

## User Flow

1. The user triggers a content action (copy, paste, or type) from the list.
2. The panel reads the raw file and `findTemplatePrompts()` returns text and choice prompts.
3. `TemplateArgumentForm` renders fields in prompt order and the content actions with the
   opening action first.
4. The user selects one option per choice (the first is preselected).
5. The user presses **⌘ + Enter** or clicks the opening action in the form footer.
   **⌘ + K** opens the action panel for any of the three actions.
6. The form starts the selected action with the current values and then pops. The
   panel expands the snippet and copies, pastes, or types it.

The native form shortcut requires **⌘**. Plain **Enter** can act on the focused
field. Custom shortcuts require a modifier. [Raycast action panel](https://developers.raycast.com/api-reference/user-interface/action-panel) · [Keyboard API](https://developers.raycast.com/api-reference/keyboard)

## Edge Cases

- **Two unlabeled choices:** both fields are titled `Choose` but have different ids and
  independent dropdowns.
- **Same token twice:** discovered once, rendered once, and its value is reused in every
  occurrence during expansion.
- **No form (Mini Enter path):** the form is not shown; expansion falls back to the first
  option.
- **Empty choice token:** no prompt is created and expansion produces an empty string.
- **Escaped token:** `\{{choice:...}}` is ignored by discovery and emitted literally.

## Related

- [Manual Raycast test guide](../../../../docs/important/how-to-test.md)

- Module plan:
  `src/components/docs/plans/2026/11/19/2026-11-19-choice-dropdown-form.md`
- Module plan (action-aware submission):
  `src/components/docs/plans/2026/11/19/2026-11-19-action-submit-form-panel.md`
- Module bug doc:
  `src/components/docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`
- Token parser reference: `src/utils/docs/important/choice-token.md`
- Canonical token reference: `docs/important/snippet-tokens.md`
