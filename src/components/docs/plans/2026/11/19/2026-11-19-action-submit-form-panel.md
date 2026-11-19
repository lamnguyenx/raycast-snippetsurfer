# Action-Aware Submit Panel in the Prompt Form

**Date**: 2026-11-19
**Status**: Implemented — blocked by an open bug (⌘↵ does not submit; see bug docs)
**Module**: `src/components` (`TemplateArgumentForm.tsx`, `CustomActionPanel.tsx`)
**Parent plan**: [`docs/plans/2026/11/19/2026-11-19-prompt-form-content-actions.md`](../../../../../../../docs/plans/2026/11/19/2026-11-19-prompt-form-content-actions.md)

## Problem Statement

The prompt form (added with `{{ask:...}}`, extended with `{{choice:...}}`) had a single
submit action titled **Insert Snippet**. That label hid which action would run, and there
was no way to switch to copy after opening the form from paste or type. The user's ask:
after picking a choice value, be able to copy the snippet to the clipboard like any other
snippet.

## Implementation

### `TemplateArgumentForm`

- Props changed from `onSubmit` to `actions: TemplateFormAction[]`
  (`{ title, icon?, onSubmit(values) }`).
- Each action renders as an `Action.SubmitForm`; submitting calls the action's
  `onSubmit(values)` and then `pop()`.
- Prompt rendering (dropdown vs text field) is unchanged.

### `CustomActionPanel` (`HeavyDutyActionPanel`)

- The copy/paste/type bodies were extracted from `withContent`-wrapped closures into
  `copyContent`, `pasteContent`, `typeContent` content runners.
- Runners are gathered into `ContentAction` objects (`{ title, icon, run }`) and reused by
  both the list action panel and the prompt form.
- `withContent(action)` keeps the **opening action first** in the form:
  `[action, ...contentActions.filter((a) => a !== action)]`.

```tsx
const formActions = [action, ...contentActions.filter((candidate) => candidate !== action)].map((candidate) => ({
  title: candidate.title,
  icon: candidate.icon,
  onSubmit: (values: { [id: string]: string }) => candidate.run(expandTemplate(raw, { values })),
}));

push(<TemplateArgumentForm prompts={prompts} actions={formActions} />);
```

## Trials, Errors & Lessons Learnt

- **Design iteration — who is "primary" in the form?** The first draft ordered the form
  actions by the `primaryAction` preference (mirroring the list panel). That ignores what
  the user just clicked, so it was replaced by "opening action first". Explicit intent at
  click time beats a global preference for a secondary view.
- **Section wrapper broke the submit shortcut.** Wrapping the submit actions in
  `<ActionPanel.Section title="Use Snippet">` looked tidy and rendered correctly, but
  `⌘↵` stopped triggering anything. Submit actions now sit as direct `ActionPanel`
  children. Removing the section was necessary but not sufficient — see the bug.
- **`pop()` ordering.** `pop()` was moved after the action callback starts, matching the
  ordering pattern of official Raycast form examples (do the work, then navigate back).
- **Extraction over duplication.** The notification dialogs, AppleScript paste/type
  scripts, and fallbacks already lived in the panel; extracting them into runners let the
  form reuse them without a second copy of that behavior.
- **Multi-submit remains a suspect.** Even after the section removal the user reports
  `⌘↵` is inert. All official examples use exactly one `Action.SubmitForm` per form;
  this is the leading hypothesis in the bug doc. Track
  [`../../../../issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`](../../../../issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md)
  before extending this pattern.

## Validation

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Scripted Accessibility check confirmed rendering (buttons, icons, `⌘↵` badge) but could
  not confirm submission — manual retest says `⌘↵` does not submit
  (see bug doc).

## Related Documents

- Parent plan: `docs/plans/2026/11/19/2026-11-19-prompt-form-content-actions.md`
- Bug (module): `src/components/docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`
- Bug (parent): `docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`
- Module reference: [`../../../../important/choice-form.md`](../../../../important/choice-form.md)
