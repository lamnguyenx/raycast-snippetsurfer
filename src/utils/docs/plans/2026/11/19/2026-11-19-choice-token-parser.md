# Choice Token Parsing & Expansion

**Date**: 2026-11-19
**Status**: Implemented
**Module**: `src/utils` (`TemplateExpander.ts`)

## Problem Statement

`TemplateExpander` only understood date/time tokens and `{{ask:Label}}` text prompts.
A snippet that needed to choose between fixed alternatives had no first-class token. The
engine needed to:

- parse a list of alternatives without adding a dependency;
- preserve existing escaping and unknown-token behavior;
- discover a choice prompt once per unique token;
- expand the chosen value at action time;
- fall back predictably when no form is shown.

## Implementation

### Prompt model

`TemplatePrompt` changed from `{ label, defaultValue }` to:

```ts
interface TemplatePrompt {
  id: string; // form field id and values-map key
  label: string; // human-readable field title
  kind: "text" | "choice";
  defaultValue: string; // text prefill or initially selected option
  options?: string[]; // choice options
}
```

### New helpers

- `choicePromptId(arg)` → `choice:${arg}`.
  The raw token argument is the stable identity shared by prompt discovery and expansion.
- `findUnescaped(input, separator)` → index of the first separator not preceded by a
  backslash.
- `splitChoiceOptions(input)` → splits on unescaped pipes, unescapes `\|`, `\=`, and `\\`,
  trims each option, drops empty entries, and collapses duplicates.
- `parseChoiceArg(arg)` → `{ label, options } | null`.
  - Empty input returns `null`.
  - An unescaped `=` before the first unescaped `|` is the optional title separator.
  - Empty option lists return `null`.

### Expansion

`HANDLERS.choice` resolves as follows:

```ts
const choice = parseChoiceArg(arg);
if (!choice) return "";
const id = choicePromptId(arg);
return Object.prototype.hasOwnProperty.call(values, id) ? values[id] : choice.options[0];
```

The first option is both the dropdown default and the no-form fallback.

### Prompt discovery

`findTemplatePrompts()` now scans both kinds:

- `ask`: de-duplicate by label, preserving the existing variable semantics.
- `choice`: de-duplicate by full token id, preserving separate prompts for different
  option lists.

The two kinds use separate `seen` sets (`seenLabels`, `seenChoiceTokens`) so they cannot
collide.

## Parsing Rules

- `{{choice:A|B}}` → label `Choose`, options `A`, `B`.
- `{{choice:Model=A|B}}` → label `Model`, options `A`, `B`.
- `{{choice: A | B }}` → options `A`, `B` (trimmed).
- `{{choice:A|A|B}}` → options `A`, `B` (duplicates dropped).
- `{{choice:A||B}}` → options `A`, `B` (empty entries dropped).
- `{{choice:a\|b|c}}` → options `a|b`, `c` (escaped pipe).
- `{{choice:a\=b|c}}` → options `a=b`, `c` (escaped equals, no title).
- `{{choice:Model=a\=b|c}}` → label `Model`, options `a=b`, `c`.
- `{{choice:}}` → no prompt; expands to empty.
- `{{choose:A|B}}` → unknown token; preserved verbatim.

## Contract With the Form Module

- `id` is the only value key; `label` is display text.
- `kind` selects the control (`text` → `TextField`, `choice` → `Dropdown`).
- `defaultValue` is the first option for choices.
- `options` is non-empty whenever `kind === "choice"` reaches the form.

`TemplateArgumentForm` must use `prompt.id` for keys and form ids, not `prompt.label`.

## Trials, Errors & Lessons Learnt

- **A single `seen` set was too coarse.** Ask labels and choice ids are different
  namespaces. Separate sets make the de-duplication rule obvious and prevent theoretical
  collisions.
- **Raw token argument is the right id.** It is deterministic across discovery and
  expansion, survives labels, and avoids maintaining an index map that could drift when
  prompts are reordered.
- **Escape handling belongs in the splitter.** The token regex only needs to capture the
  argument; unescaping `\|`, `\=`, and `\\` is a parsing concern. Keeping it in
  `splitChoiceOptions()` makes the behavior testable and avoids control-character
  sentinels.
- **The title separator needs an escape hatch.** `Label=` is consistent with `ask`, but
  the first option may legitimately contain `=`. Escaping `\=` is documented; this is the
  main sharp edge of the grammar.
- **Empty choices must disappear early.** Returning `null` from `parseChoiceArg()` keeps
  empty dropdowns out of the form and lets expansion produce an empty string.
- **Fallbacks must match defaults.** The dropdown default and the no-form expansion both
  use `options[0]`, so Mini mode behavior is predictable.
- **Source-level validation is not enough.** A temporary Node smoke test exercised the
  actual transpiled module; `tsc` and `lint` alone would not catch value-mapping mistakes
  between discovery and expansion.
- **Ambient types can break standalone compilation.** The smoke-test compile needed
  `--types node` because of a parent `@types/bun` package; the project build fixed this
  permanently in `tsconfig.json`.

## Validation

Temporary smoke test coverage:

- prompt kind, id, label, default, and option parsing;
- in-order discovery and de-duplication;
- exact selected-value expansion;
- first-option fallback;
- whitespace, empty-option, and duplicate-option handling;
- escaped pipes and equals;
- empty choice tokens;
- unknown-token preservation;
- existing ask and date token behavior.

Project gates: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Related Documents

- Parent plan: `docs/plans/2026/11/19/2026-11-19-multiple-choice-prompts.md`
- Canonical token reference: `docs/important/snippet-tokens.md`
- Module reference: `src/utils/docs/important/choice-token.md`
- Form module plan:
  `src/components/docs/plans/2026/11/19/2026-11-19-choice-dropdown-form.md`
