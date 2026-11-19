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
opened the form is first; the remaining actions follow. Each action becomes its own
`Action.SubmitForm`, so submitting the form always runs the action the user picked.

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

```tsx
<ActionPanel>
  {actions.map((action) => (
    <Action.SubmitForm
      key={action.title}
      title={action.title}
      icon={action.icon}
      onSubmit={(values) => {
        const result = action.onSubmit(values);
        pop();
        return result;
      }}
    />
  ))}
</ActionPanel>
```

All content actions submit the same form values. The form does not decide whether the
snippet is copied, pasted, or typed; each action callback owns that behavior.

Keep the `Action.SubmitForm` elements as direct children of `ActionPanel`. Wrapping them in
an `ActionPanel.Section` can stop Raycast's form submit shortcut (`⌘↵`) from firing.

**Known issue (open, 2026-11-19):** even as direct children, the multi-submit panel does
not react to `⌘↵` — the badge renders but no `onSubmit` fires. All official Raycast
examples use exactly one `Action.SubmitForm` per form; multiple submit actions are the
prime suspect. Until resolved, treat the single-submit shape as the last known-good
configuration and see
[`docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`](../issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md).

### Text prompts (`kind: "text"`)

```tsx
<Form.TextField
  key={prompt.id}
  id={prompt.id}
  title={prompt.label}
  defaultValue={prompt.defaultValue}
  placeholder={`Enter ${prompt.label}`}
/>
```

### Choice prompts (`kind: "choice"`)

```tsx
<Form.Dropdown
  key={prompt.id}
  id={prompt.id}
  title={prompt.label}
  defaultValue={prompt.defaultValue}
>
  {prompt.options.map((option) => (
    <Form.Dropdown.Item key={option} value={option} title={option} />
  ))}
</Form.Dropdown>
```

## Invariants

- **Identity is `id`.** Never use `label` as a form id or React key. Multiple unlabeled
  choices are all labelled `Choose`.
- **Options are non-empty.** `parseChoiceArg()` returns `null` for an empty list, so no
  choice prompt with zero options reaches the form.
- **The default is a real option.** `defaultValue === options[0]` for every choice prompt.
- **Options are unique.** The parser collapses duplicates before rendering.
- **Values are strings.** Dropdown items use the option text as both `value` and `title`.
- **Every action submits.** Copy, paste, and type are all `Action.SubmitForm` entries; the
  selected action receives the same `{ [id]: value }` map, which the panel passes to
  `expandTemplate(raw, { values })`. (Multi-submit currently blocked by the `⌘↵` no-op
  bug — see Known issue above.)
- **The opening action stays primary.** The action selected in the list is the first form
  action. Copy is always available even when the form was opened from paste or type.

## User Flow

1. The user triggers a content action (copy, paste, or type) from the list.
2. The panel reads the raw file and `findTemplatePrompts()` returns text and choice prompts.
3. `TemplateArgumentForm` renders fields in prompt order and the content actions with the
   opening action first.
4. The user selects one option per choice (the first is preselected).
5. `Action.SubmitForm` starts the chosen action's `onSubmit(values)`, then `pop()` runs.
6. The panel expands the raw content with those values and runs the action (copy, paste,
   or type).

Step 5 is currently blocked by the open `⌘↵` no-op bug — see the Known issue under
Rendering Rules.

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

- Module plan:
  `src/components/docs/plans/2026/11/19/2026-11-19-choice-dropdown-form.md`
- Module plan (action-aware submission):
  `src/components/docs/plans/2026/11/19/2026-11-19-action-submit-form-panel.md`
- Module bug doc:
  `src/components/docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`
- Token parser reference: `src/utils/docs/important/choice-token.md`
- Canonical token reference: `docs/important/snippet-tokens.md`
