# Choice Prompt Form Reference

This is the module-level reference for rendering `{{choice:...}}` prompts in
`src/components/TemplateArgumentForm.tsx`. For the token grammar and expansion behavior,
see `src/utils/docs/important/choice-token.md`.

## Input

`TemplateArgumentForm` receives:

```ts
interface TemplateArgumentFormProps {
  prompts: TemplatePrompt[];
  onSubmit: (values: { [label: string]: string }) => void;
}
```

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
- **Submission is unchanged.** `Action.SubmitForm` returns one value per prompt id; the
  panel passes that map to `expandTemplate(raw, { values })`.

## User Flow

1. A snippet action reads the raw file.
2. `findTemplatePrompts()` returns text and choice prompts.
3. `TemplateArgumentForm` renders fields in prompt order.
4. The user selects one option per choice (the first is preselected).
5. `Action.SubmitForm` calls `pop()` and then `onSubmit(values)`.
6. The panel expands the raw content with those values and runs the original action
   (copy, paste, or type).

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
- Token parser reference: `src/utils/docs/important/choice-token.md`
- Canonical token reference: `docs/important/snippet-tokens.md`
