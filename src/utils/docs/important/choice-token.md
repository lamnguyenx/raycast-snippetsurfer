# Choice Token Reference (`TemplateExpander`)

This is the module-level reference for the `{{choice:...}}` token implemented in
`src/utils/TemplateExpander.ts`. For user-facing token documentation, see
`docs/important/snippet-tokens.md`.

## Grammar

```text
{{choice:OPTION|OPTION|...}}
{{choice:LABEL=OPTION|OPTION|...}}
```

- `OPTION` is any text except an unescaped `|` or `}`.
- The optional `LABEL` is recognized only when an unescaped `=` appears before the first
  unescaped `|`.
- The first option is the default selection and the no-form fallback.
- Unknown tokens are preserved. Escaped tokens (`\{{choice:...}}`) are ignored and later
  emitted literally.

## Parsing

### Option splitting

`splitChoiceOptions()`:

1. Splits on unescaped `|`.
2. Unescapes `\|` → `|`, `\=` → `=`, and `\\` → `\`.
3. Trims surrounding whitespace from each option.
4. Drops empty options.
5. Collapses duplicate options while preserving first-appearance order.

An empty option list makes `parseChoiceArg()` return `null`; no prompt is created and
expansion produces an empty string.

### Title parsing

An unescaped `=` before the first unescaped `|` is the title separator:

```text
{{choice:Model=A|B}}   → label "Model", options ["A", "B"]
{{choice:a=b|c}}       → label "a",     options ["b", "c"]
{{choice:a\=b|c}}      → label "Choose", options ["a=b", "c"]
```

This is the main ambiguous case in the grammar. Escape the first `=` when it is part of
the first option.

## Identity and De-duplication

`choicePromptId(arg)` returns:

```text
choice:${rawArgument}
```

The raw argument is the text between `choice:` and `}}`. The resulting ID identifies
the prompt during discovery and keys the values passed to `expandTemplate()`.

Consequences:

- Repeating the exact same token reuses one dropdown and one value.
- `{{choice:A|B}}` and `{{choice:Model=A|B}}` are separate prompts.
- Discovery and expansion cannot drift, because both derive the id from the same raw
  argument.

`findTemplatePrompts()` de-duplicates `ask` prompts by label and `choice` prompts by this
id, using separate `seen` sets.

## Expansion

`HANDLERS.choice`:

```ts
const choice = parseChoiceArg(arg);
if (!choice) return "";
const id = choicePromptId(arg);
return Object.prototype.hasOwnProperty.call(values, id) ? values[id] : choice.options[0];
```

If the form was not shown (for example the Mini Enter-to-type path), the first option is
inserted.

## Examples

```text
model: {{choice:VAI 2/glm-5.3|opencode-go/deepseek-v4.1-flash}}
```

Dropdown title: `Choose`; options: `VAI 2/glm-5.3`,
`opencode-go/deepseek-v4.1-flash`; default: `VAI 2/glm-5.3`.

```text
model: {{choice:Model=VAI 2/glm-5.3|opencode-go/deepseek-v4.1-flash}}
```

Dropdown title: `Model`.

```text
{{choice:a\|b|c}}
```

Options: `a|b`, `c`.

## Contract With `src/components`

`TemplateArgumentForm` receives `TemplatePrompt[]` and must:

- assign generated Raycast field IDs such as `prompt-0` and translate the submitted
  values back to `prompt.id` before expansion;
- render `Form.Dropdown` when `kind === "choice"`;
- use `prompt.options` as items;
- use `prompt.defaultValue` as the initial selection.

`options` is guaranteed to be non-empty for every choice prompt that reaches the form.

Choice keys may contain the label, delimiters, and punctuation from the raw argument.
Passing those keys directly as field IDs reproduced the submit failure with the
Model snippet. The generated IDs let Raycast submit while the expander keeps the
same token identity. [Form reference](../../../components/docs/important/choice-form.md)

## Validation

The parser and expander were exercised with a temporary Node smoke test covering prompt
discovery, labels, defaults, de-duplication, exact-value expansion, first-option fallback,
whitespace/empty/duplicate options, escaped pipes and equals, empty tokens, unknown
tokens, and ask/date regressions.

Project gates: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Related

- Parent plan: `docs/plans/2026/11/19/2026-11-19-multiple-choice-prompts.md`
- Module plan: `src/utils/docs/plans/2026/11/19/2026-11-19-choice-token-parser.md`
- User-facing reference: `docs/important/snippet-tokens.md`
