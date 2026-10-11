# Parameterized Snippets: Dynamic Tokens & Interactive Parameters

**Date**: 2026-10-11
**Status**: Implemented
**Scope**: `raycast-snippetsurfer`

## Problem Statement

Snippet content frequently needs to carry values that only exist at the moment the snippet
is used — most obviously the current date. A motivating example, stored verbatim in a
snippet:

> nice, write down what we have done into `docs/plans/2026/10/09/2026-10-09-...md` including
> trials, errors and lessons learnt

Before this work, adding the date meant manually editing the text after pasting. We also
wanted to ask the user for values (a commit hash, a topic, a port) before inserting the
snippet — "parameterized clipboards".

## What We Built

Two complementary token families, resolved at action time (copy / paste / type), operated
on the raw snippet file:

1. **Auto tokens** — derived from the current date/time, no prompt:
   - `{{date}}` → `2026-10-11`; `{{date:yyyy/MM/dd}}` → `2026/10/11`
   - `{{time}}`, `{{time:HH:mm}}`, `{{datetime}}`
   - specials: `{{date:iso}}`, `{{date:unix}}`, `{{date:timestamp}}`
   - pattern symbols: `yyyy yy MM M MMM MMMM dd d HH H mm m ss s EEE EEEE a`

2. **Prompt tokens** — collected through a small Raycast form before use:
   - `{{ask:Label}}` → single-line text field titled `Label`
   - `{{ask:Label=Default}}` → field prefilled with `Default`
   - repeated labels collapse to one field and share a value

Behavioural rules:

- Resolved at action time; all tokens in one use share a single timestamp.
- Unknown tokens are left untouched; `\{{...}}` escapes to a literal token.
- Applies to Copy to Clipboard, Paste to Active App, and Type to Active App.
  `Copy Real File Path` never expands.
- Toggleable via the **Dynamic Tokens** preference.

## Technical Architecture

- **`src/utils/TemplateExpander.ts`** (new)
  - `expandTemplate(content, { now, values })` — token substitution.
  - `findTemplatePrompts(content)` — unique `{{ask:...}}` labels in order.
  - `formatDate(date, pattern)` — dependency-free formatter.
  - Regex: `/(?<!\\)\{\{\s*([a-zA-Z]+)\s*(?::\s*([^}]*?)\s*)?\}\}/g`
    (negative lookbehind skips escaped tokens) + a final `\{{` → `{{` pass.
- **`src/utils/SnippetsLoader.tsx`** — added `readSnippetContent(fullPath)` (fs utf8 read)
  to replace ad-hoc `cat` subprocess reads.
- **`src/components/TemplateArgumentForm.tsx`** (new) — one `Form.TextField` per prompt,
  submitted with `Action.SubmitForm`.
- **`src/components/CustomActionPanel.tsx`** — `HeavyDutyActionPanel` gained an
  `enableTemplates` prop and a `withContent()` helper: read → if prompts exist push the
  form → expand with the submitted values → run the action. Copy paths switched to
  `Clipboard.copy`. Repetitive dialog/error handling extracted into `notify`/`notifyError`.
- **`src/search-*.tsx`** — read the `enableTemplates` preference and pass it down.
- **`package.json`** — new checkbox preference **Dynamic Tokens** (`enableTemplates`,
  default `true`).
- **`README.md`** — "Dynamic Tokens" and "Interactive Parameters" sections.

## Application To Real Snippets

Two Mini snippets were parameterized:

- `auto-pilot-review.md` — `{{ask:Commit}}`, `{{ask:Max rounds=10}}`,
  `{{ask:CDP port 1=9022}}`, `{{ask:CDP port 2=9023}}`, and a dated output path.
- `write-all-we-have-done-into.md` — dated output path
  `docs/plans/{{date:yyyy/MM/dd}}/{{date:yyyy-MM-dd}}-...md`.

## Trials, Errors & Lessons Learnt

- **Control-character regex lint error.** The first escape-protection approach used
  `\u0000` sentinels, which tripped ESLint's `no-control-regex`. Reworked to a
  negative-lookbehind regex plus a `\{{` → `{{` post-pass — no sentinels, and the same
  regex could then power prompt detection.
- **Longest-symbol-first ordering.** Date formatting must prefer `MMMM` over `MM` and
  `EEEE` over `EEE`; zero-padded tokens (`MM`, `dd`, `HH`, `mm`, `ss`) must precede their
  single-character forms, or e.g. `MM` would be split.
- **Shell/quoting fragility (pre-existing).** The old `echo "${content}" | pbcopy` and a
  broken AppleScript escape (`content.replace(/"/g, "\\")`) corrupted arbitrary content.
  Reading in JS and using `Clipboard.copy` removed this class of bug; the AppleScript
  paths now escape `\` → `\\` and `"` → `\"`.
- **Prompting across navigation.** Raycast actions are fire-and-forget, so "read once,
  then act" didn't fit. Prompting had to be modelled as "read → maybe push a form → run on
  submit". The `withContent()` helper keeps every action on that single path, and clipboard
  fallbacks operate on already-expanded content so the form is never shown twice.
- **Tokens are interpreted at use time, not load time.** This keeps previews faithful to
  the file (you still see `{{ask:...}}` while browsing) and guarantees the date is "now".
- **Formatting is a gate.** `ray lint` enforces Prettier; new/edited files must be run
  through `prettier --write` before lint passes.
- **Verification without a test framework.** There is no test runner, so correctness was
  checked with a transpiled smoke test (`tsc` a single file, then `node` it) covering date
  defaults/patterns/specials, prompt detection (dedupe, ordering, default parsing, escaped
  tokens), and expansion with/without values — plus `npx tsc --noEmit`, `npm run lint`, and
  `npm run build`.

## Follow-ups (not done)

- `{{git:HEAD}}` auto-token to self-fill the latest commit hash (declined for now).
- `{{uuid}}`, `{{random:N}}`, `{{clipboard}}`, `{{cursor}}`.
- Multiline and dropdown prompt fields; remembering previous values.
- Frontmatter-declared parameter types/defaults.
- Reviving and making prompt-aware the (currently unwired) Mini "Enter to type" path.
