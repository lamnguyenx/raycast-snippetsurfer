# Snippet Tokens & Parameters

This is the canonical reference for dynamic snippet content in SnippetSurfer. Tokens are
resolved when a snippet is used (**Copy to Clipboard**, **Paste to Active App**,
**Type to Active App**), not when it is loaded, so they always reflect the moment of use.

`Copy Real File Path` never expands tokens. The whole feature can be turned off in the
extension settings via the **Dynamic Tokens** preference (on by default).

## Quick reference

| Token | Resolves to |
| --- | --- |
| `{{date}}` | current date, `yyyy-MM-dd` |
| `{{date:yyyy/MM/dd}}` | current date, custom pattern |
| `{{time}}` | current time, `HH:mm:ss` |
| `{{time:HH:mm}}` | current time, custom pattern |
| `{{datetime}}` | current date + time, `yyyy-MM-dd HH:mm:ss` |
| `{{date:iso}}` | ISO 8601 UTC, e.g. `2026-10-11T14:07:03.000Z` |
| `{{date:unix}}` | Unix seconds |
| `{{date:timestamp}}` | Unix milliseconds |
| `{{ask:Label}}` | prompts for a single-line text value |
| `{{ask:Label=Default}}` | prompts, prefilled with `Default` |
| `{{choice:A\|B}}` | dropdown with options `A` and `B`, first selected |
| `{{choice:Label=A\|B}}` | dropdown titled `Label`, first option selected |

## Date pattern symbols

`yyyy` `yy` `MM` `M` `MMM` `MMMM` `dd` `d` `HH` `H` `mm` `m` `ss` `s` `EEE` `EEEE` `a`

Longest symbols win (`MMMM` beats `MM`, `EEEE` beats `EEE`). Anything that is not a known
symbol is emitted literally, so `{{datetime:yyyy-MM-dd'T'HH:mm}}` is valid.

## Multiple-choice prompts

`{{choice:...}}` renders a dropdown instead of a text field. Separate the options with
`|`:

```
model: {{choice:VAI 2/glm-5.3|opencode-go/deepseek-v4.1-flash}}
```

The first option is selected by default and is also the fallback when no form is shown.
Options are trimmed, empty entries are ignored, and duplicate entries are collapsed.

An optional title goes before the first `=`:

```
model: {{choice:Model=VAI 2/glm-5.3|opencode-go/deepseek-v4.1-flash}}
```

Without a title, the field is labelled `Choose`. A choice prompt is identified by its
full token, so repeating the exact same `{{choice:...}}` reuses one value, while two
different option lists get separate dropdowns.

Use `\|` for a literal pipe, `\=` for a literal equals sign, and `\\` for a literal
backslash. An unescaped `=` before the first `|` is treated as the title separator, so
escape it when the first option itself contains `=` (e.g. `{{choice:a\=b|c}}`).

## Rules

- **Action-time resolution.** All tokens in one use share a single timestamp.
- **Unknown tokens are preserved.** `{{foo}}` stays `{{foo}}`.
- **Escaping.** Prefix with a backslash to emit a token literally: `\{{date}}` → `{{date}}`.
- **Prompts are unique.** One text field per distinct `ask` label; one dropdown per
  distinct `choice` token. Repeated prompts share the selected value.
- **All content actions are available.** After filling the prompt form, choose **Copy to
  Clipboard**, **Paste to Active App**, or **Type to Active App**. The action you chose is
  listed first, and copy is always available. (Known issue, open 2026-11-19: `⌘↵`
  currently does not submit this form — see
  [the bug doc](../issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md).)
- **Values are not stored.** Prompt values are not remembered between uses.

## Examples

Dated output path:

```
write down what we have done into docs/plans/{{date:yyyy/MM/dd}}/{{date:yyyy-MM-dd}}-...md
```

Prompts combined with auto tokens:

```
Deploy {{ask:Service}} to {{ask:Environment=staging}} on {{date:yyyy-MM-dd}}
```

Pick one of a fixed set of values:

```
model: {{choice:Model=VAI 2/glm-5.3|opencode-go/deepseek-v4.1-flash}}
```

## Implementation map

- Expansion, prompt parsing & choice parsing:
  [`src/utils/TemplateExpander.ts`](../../src/utils/TemplateExpander.ts) —
  [module reference](../../src/utils/docs/important/choice-token.md)
- Prompt form UI (text fields, dropdowns & submit actions):
  [`src/components/TemplateArgumentForm.tsx`](../../src/components/TemplateArgumentForm.tsx) —
  [module reference](../../src/components/docs/important/choice-form.md)
- Action wiring: `src/components/CustomActionPanel.tsx` (`HeavyDutyActionPanel`)
- Preference: `package.json` → `enableTemplates`

Open issues:

- [Prompt form `⌘↵` no-op](../issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md)

Design and lessons learnt:

- [Multiple-choice prompts plan](../plans/2026/11/19/2026-11-19-multiple-choice-prompts.md)
- [Prompt form content actions plan](../plans/2026/11/19/2026-11-19-prompt-form-content-actions.md)
- [Parameterized snippets plan](../plans/2026/10/11/2026-10-11-parameterized-clipboards.md)
