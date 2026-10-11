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

## Date pattern symbols

`yyyy` `yy` `MM` `M` `MMM` `MMMM` `dd` `d` `HH` `H` `mm` `m` `ss` `s` `EEE` `EEEE` `a`

Longest symbols win (`MMMM` beats `MM`, `EEEE` beats `EEE`). Anything that is not a known
symbol is emitted literally, so `{{datetime:yyyy-MM-dd'T'HH:mm}}` is valid.

## Rules

- **Action-time resolution.** All tokens in one use share a single timestamp.
- **Unknown tokens are preserved.** `{{foo}}` stays `{{foo}}`.
- **Escaping.** Prefix with a backslash to emit a token literally: `\{{date}}` → `{{date}}`.
- **Prompts are unique.** One field per distinct label; a label used twice shares one value.
- **Single-line text only.** Prompt values are not stored between uses.

## Examples

Dated output path:

```
write down what we have done into docs/plans/{{date:yyyy/MM/dd}}/{{date:yyyy-MM-dd}}-...md
```

Prompts combined with auto tokens:

```
Deploy {{ask:Service}} to {{ask:Environment=staging}} on {{date:yyyy-MM-dd}}
```

## Implementation map

- Expansion & prompt parsing: `src/utils/TemplateExpander.ts`
- Prompt form UI: `src/components/TemplateArgumentForm.tsx`
- Action wiring: `src/components/CustomActionPanel.tsx` (`HeavyDutyActionPanel`)
- Preference: `package.json` → `enableTemplates`

See `docs/plans/2026/10/11/2026-10-11-parameterized-clipboards.md` for the design and
lessons learnt.
