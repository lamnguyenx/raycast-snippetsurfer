# Multiple-Choice Snippet Prompts

**Date**: 2026-11-19
**Status**: Implemented
**Scope**: Parent extension (`raycast-snippetsurfer`) + `src/utils` + `src/components`

## Problem Statement

Snippet content already supported date/time tokens and `{{ask:Label}}` text prompts. A
snippet often needs a **fixed set of alternatives** instead. The motivating example was a
model-selection snippet containing:

```
VAI 2/glm-5.3
opencode-go/deepseek-v4.1-flash
```

Before this change, using the snippet meant copying both lines and deleting one, or
maintaining one snippet per model. We wanted the existing action-time form to offer a
dropdown instead.

## What We Built

A new prompt token:

| Token | Result |
| --- | --- |
| `{{choice:A\|B}}` | Dropdown titled `Choose` with options `A` and `B`. |
| `{{choice:Model=A\|B}}` | Same, but the field is titled `Model`. |

Example:

```text
model: {{choice:VAI 2/glm-5.3|opencode-go/deepseek-v4.1-flash}}
```

Using the snippet opens the normal Raycast prompt form with a dropdown, then inserts the
selected value:

```text
model: opencode-go/deepseek-v4.1-flash
```

Behavior:

- The first option is selected by default and is the fallback when no form is shown.
- Options are separated by `|`, trimmed, and de-duplicated.
- Empty options are ignored.
- Escape delimiters inside an option with `\|` (pipe), `\=` (equals), and `\\`
  (backslash).
- Repeating the exact same choice token reuses one dropdown and one value.
- Choice prompts combine with `{{ask:...}}` and date/time tokens in the same form.
- The feature is covered by the **Dynamic Tokens** preference (`enableTemplates`).

## Module Map

| Module | Responsibility | Documentation |
| --- | --- | --- |
| Parent extension | Manifest preference, README, canonical token docs, build config | this plan; `docs/important/snippet-tokens.md` |
| `src/utils` | Choice grammar, prompt discovery, expansion | `src/utils/docs/plans/2026/11/19/2026-11-19-choice-token-parser.md`; `src/utils/docs/important/choice-token.md` |
| `src/components` | Dropdown rendering and form submission | `src/components/docs/plans/2026/11/19/2026-11-19-choice-dropdown-form.md`; `src/components/docs/important/choice-form.md` |

## Technical Architecture

### Token grammar

```text
{{choice:OPTION|OPTION|...}}
{{choice:LABEL=OPTION|OPTION|...}}
```

The optional label is recognized only when an unescaped `=` appears before the first
unescaped `|`. The label is presentation only; the value contract is the full raw token.

### Parsing and expansion

- `parseChoiceArg()` splits the optional title and the option list.
- `splitChoiceOptions()` splits on unescaped pipes, unescapes `\|`, `\=`, and `\\`, then
  trims, drops empty entries, and collapses duplicates.
- `choicePromptId()` returns `choice:${rawArgument}`. This is the form field id and the key
  used in the submitted values map.
- `findTemplatePrompts()` discovers both `ask` and `choice` prompts in source order.
  `ask` prompts de-duplicate by label; `choice` prompts de-duplicate by full token id.
- `expandTemplate()` resolves a choice to the submitted value, falling back to the first
  option when no value was collected.

### Form integration

`HeavyDutyActionPanel.withContent()` already implements the read → maybe-prompt → expand
flow. It now receives two prompt kinds:

- `kind: "text"` → `Form.TextField` (existing `{{ask:...}}`).
- `kind: "choice"` → `Form.Dropdown` with one `Form.Dropdown.Item` per option.

The Mini "press Enter" path in `src/shared/SnippetSearch.tsx` expands tokens without
showing the form. For choices this uses the first option, matching the existing fallback
behavior for `ask` defaults.

### Parent-level changes

- `package.json`: preference text now mentions `{{ask:...}}` and `{{choice:...}}` prompts.
- `tsconfig.json`: pinned ambient types to `["node", "react"]` so TypeScript does not
  auto-include unrelated global type packages from parent `node_modules`.
- `README.md`: added the Multiple Choice Parameters section.
- `docs/important/snippet-tokens.md`: added the choice token to the canonical reference.

## Trials, Errors & Lessons Learnt

### Delimiter escaping

Pipes are the option separator, so a literal pipe needs `\|`. An unescaped `=` before the
first pipe is the optional title separator, so a first option containing `=` must be
written as `\=`. This is documented, but it is the sharpest edge in the syntax: key=value
option lists and URLs with query strings must escape that first `=`.

Lesson: when a token carries both metadata (the title) and data (the options), the
metadata delimiter needs an explicit escape path and prominent documentation.

### Deterministic prompt ids

The form field id and the expansion lookup key must be identical. Using the option list
alone would break labeled and unlabeled variants; using the label would collide for two
unlabeled choices. We use the full raw token argument prefixed with `choice:`. This keeps
discovery and expansion in sync without maintaining an index map.

### Different de-duplication semantics

`ask` prompts act like variables: two `{{ask:Topic}}` tokens share one field by label.
Choices are identified by their full token, so `{{choice:A|B}}` and
`{{choice:Model=A|B}}` are deliberately separate prompts. The first implementation used a
single `seen` set for both kinds; it was split into `seenLabels` and `seenChoiceTokens` to
make the contract explicit and avoid theoretical cross-kind collisions.

### Form ids are not titles

`TemplateArgumentForm` originally used `prompt.label` as both the React key and the form
id. That was safe for `ask`, where labels are unique, but not for choices: two different
unlabeled option lists would both be titled `Choose`. The prompt model gained a separate
`id`, and the form now uses `prompt.id` while showing `prompt.label`.

### Empty dropdowns

Raycast's `Form.Dropdown` needs at least one item. `parseChoiceArg()` returns `null` for an
empty option list, `findTemplatePrompts()` skips it, and `expandTemplate()` resolves an
empty choice token to an empty string. This prevents the form from rendering a dropdown
with no choices.

### Build environment

`npx tsc --noEmit` and `npm run build` failed with TypeScript syntax errors inside
`node_modules/bun-types/bun.d.ts` and `sql.d.ts` (TS1139, TS1005, and related errors).
The project tsconfig had no `types` restriction, so TypeScript auto-included
`@types/bun` from the user's parent `node_modules`; that package requires a newer
TypeScript syntax than the project's TS 4.9. Pinning `types` to `["node", "react"]` made
the build reproducible.

The temporary standalone smoke-test compile hit the same issue and needed `--types node`.
A diagnostic run with `--typeRoots ./node_modules/@types` also confirmed the source code
itself was type-clean.

### Markdown formatting churn

Running Prettier over the Markdown docs reflowed every existing table and added blank
lines around fences. The files were restored and the feature text was reapplied manually,
keeping the documentation diff focused.

### Ray lint scans `src/`

Placing module-level `README.md` and `docs/` files under `src/` made `ray lint` try to
parse Markdown as TypeScript (`Parsing error: Invalid character`) and run Prettier over it.
Added `.eslintignore` and `.prettierignore` entries for `src/**/*.md`; source files remain
linted and formatted, while module documentation is excluded. Without those ignores, the
per-module docs would have to live outside their source module.

### Validation without a test framework

There is no test runner. Correctness was checked with a temporary transpiled Node smoke
test covering:

- prompt discovery order, kinds, labels, defaults, and de-duplication;
- the exact model strings from the motivating example;
- expansion with selected values and fallback to the first option;
- trimming, empty options, and duplicate options;
- escaped `\|`, `\=`, and `\\`;
- empty choice tokens;
- preserved unknown tokens;
- `ask` and date-token regressions.

The project gates were also run: `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## Follow-ups (not done)

- Multi-select checkboxes or tags (this work is single-select).
- Remembering the last selected value between uses.
- A more robust title syntax if `Label=` collisions become common (for example a
  bracketed label form).
- Making the Mini Enter-to-type path prompt-aware.
- Frontmatter-declared option lists.

## Related Documents

- Canonical token reference: `docs/important/snippet-tokens.md`
- Previous parameterized-snippet plan:
  `docs/plans/2026/10/11/2026-10-11-parameterized-clipboards.md`
- Token engine module: `src/utils/README.md`
- Prompt form module: `src/components/README.md`
