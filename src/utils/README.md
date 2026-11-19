# Utils Module

Shared, UI-independent helpers for SnippetSurfer: snippet discovery/loading, preview
caching, recent-copy ordering, and template expansion.

## Files

| File | Purpose |
| --- | --- |
| `SnippetsLoader.tsx` | Discovers snippets, loads previews, reads raw content, and extracts pastable content. |
| `TemplateExpander.ts` | Resolves date/time tokens, `{{ask:...}}` text prompts, and `{{choice:...}}` dropdown prompts. |
| `LRUCache.ts` | Small LRU cache used for preview content. |
| `LocalStorageHelper.tsx` | Tracks last-copied timestamps and orders snippets for search results. |
| `loaders/MarkdownLoader.tsx` | Parses Markdown snippets and frontmatter. |
| `loaders/YamlLoader.tsx` | Parses YAML snippets. |

## TemplateExpander

Public API:

```ts
expandTemplate(content, { now?, values? }): string
findTemplatePrompts(content): TemplatePrompt[]
formatDate(date, pattern): string
```

### Choice prompts

Added on 2026-11-19:

```text
{{choice:A|B}}
{{choice:Model=A|B}}
```

- The first option is the default and the no-form fallback.
- Options are split on unescaped `|`, trimmed, de-duplicated, and stripped of empties.
- `\|`, `\=`, and `\\` escape literal delimiters inside options.
- A choice prompt is identified by `choice:${rawArgument}`; that id is the form field id
  and the values-map key.
- `findTemplatePrompts()` returns `kind: "choice"` prompts with a non-empty `options`
  array; `TemplateArgumentForm` renders them as `Form.Dropdown`.

See:

- [`docs/important/choice-token.md`](docs/important/choice-token.md) — grammar, parsing,
  identity, and expansion contract.
- [`docs/plans/2026/11/19/2026-11-19-choice-token-parser.md`](docs/plans/2026/11/19/2026-11-19-choice-token-parser.md)
  — implementation plan, trials, errors, and lessons learnt.
- [`../../docs/important/snippet-tokens.md`](../../docs/important/snippet-tokens.md) —
  user-facing token reference.

## Validation

No test framework is configured. Run `npm run lint` and `npm run build`. The choice parser
was additionally checked with a temporary transpiled Node smoke test covering parsing,
de-duplication, escaping, fallback, and existing ask/date behavior.
