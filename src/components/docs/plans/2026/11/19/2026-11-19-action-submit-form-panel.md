# Action-Aware Submit Panel in the Prompt Form

**Date**: 2026-11-19
**Status**: Implemented and verified in live Raycast for both copy paths
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

- Receives an ordered `actions: TemplateFormAction[]`. The first action uses
  `Action.SubmitForm`. The two remaining entries use plain `Action` callbacks.
- Uses one generated Raycast field ID per prompt. On native submit, the form translates
  those field IDs back to the prompt IDs expected by `expandTemplate()`.
- Initializes React state with each prompt's default. Text and dropdown changes update
  that state, which alternate actions use when invoked.
- Starts the chosen action and then calls `pop()`.

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

- Grouped and direct multi-submit panels both reproduced the no-op. Moving `pop()`
  did not restore the callback, and a shortcut override was reverted before testing.
- Switching to one native submit passed a mocked component test. The live form still
  failed both keyboard submission and a click on Copy. A mocked `onSubmit` bypasses
  the Raycast bridge, so it could only confirm action order and value handling.
- The original choice used a prompt ID derived from the raw Model token. Keeping the
  UI fields on generated IDs restored the real submit callback. The controlled fields
  let the plain alternate actions read the selected option independently.
- The native form keeps **⌘ + Enter**. Plain **Enter** remains available to the focused
  control. The form footer offers a mouse path to the primary action.
- The live probe used macOS Accessibility to locate controls. Action menu selection
  needed a targeted mouse click in the tested overlay. Clipboard change plus the
  expected expanded value confirmed the action ran.

## Validation

- Mocked component check covered all primary action orderings, default and edited
  alternate values, and navigation after invocation.
- Live Raycast copied the non-default Model value with **⌘ + Enter**. Copy in the
  action panel worked as both the primary action and an alternate to Paste.
- TypeScript, build, and lint passed. Use the [manual test guide](../../../../../../../docs/important/how-to-test.md)
  to reproduce the UI checks.

## Related Documents

- Parent plan: `docs/plans/2026/11/19/2026-11-19-prompt-form-content-actions.md`
- Bug (module): `src/components/docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`
- Bug (parent): `docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`
- Module reference: [`../../../../important/choice-form.md`](../../../../important/choice-form.md)
