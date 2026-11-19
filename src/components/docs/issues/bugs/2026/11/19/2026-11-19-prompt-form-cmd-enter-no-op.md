# Prompt Form Copy/Paste/Type Submit Actions (⌘↵ No-Op)

**Date**: 2026-11-19
**Status**: Fixed and verified in Raycast
**Module**: `src/components` (`TemplateArgumentForm.tsx`, `CustomActionPanel.tsx`)
**Parent bug doc**: [`docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md`](../../../../../../../../docs/issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md)

## Fix

Using one native `Action.SubmitForm` still reproduced the failure with the
original Model snippet. Both Command+Enter and clicking the Copy button left
the clipboard unchanged. Giving each Raycast form field a generated ID
(`prompt-0`, `prompt-1`, etc.) restored submission. The form maps those IDs back
to the original prompt keys for snippet expansion.

The opening action remains the native submit action. The alternate actions
read the controlled field values. In live Raycast testing, Command+Enter
copied the edited choice. Copy from the action panel also worked with Copy
as the opening action and with Paste as the opening action. The sections
below record the original investigation.

## Symptom (module view)

`TemplateArgumentForm` originally rendered one `Action.SubmitForm` per content action
(copy, paste, type — opening action first). The buttons render with icons and the first
shows the `⌘↵` badge, but pressing `⌘↵` never fires any `onSubmit`. The single-submit
variant that shipped with the choice-token work (`Action.SubmitForm` titled
**Insert Snippet**) did submit via `⌘↵`.

## Regressed Code Shape

```tsx
<Form
  navigationTitle="Fill In Snippet Values"
  actions={
    <ActionPanel>
      {actions.map((action) => (
        <Action.SubmitForm
          key={action.title}
          title={action.title}
          icon={action.icon}
          onSubmit={(values: Form.Values) => {
            const result = action.onSubmit(values as { [id: string]: string });
            pop();
            return result;
          }}
        />
      ))}
    </ActionPanel>
  }
>
  {/* one Form.Dropdown per choice prompt, one Form.TextField per ask prompt */}
</Form>
```

`HeavyDutyActionPanel.withContent()` pushes this form with
`[openingAction, ...otherContentActions]` and each `onSubmit` runs
`candidate.run(expandTemplate(raw, { values }))`.

## What Was Tried In This Module

1. **Submit actions in an `ActionPanel.Section`** — rendered fine, `⌘↵` inert. Removed.
2. **Direct `ActionPanel` children + `pop()` after the action callback starts** — still
   inert per user retest.
3. **Explicit `⌘↵` shortcut on the first submit action** — reverted immediately
   (duplicate-default-shortcut territory, raycast/extensions#898).

## Prime Suspect

Multiple `Action.SubmitForm` actions in one `Form`. Every official Raycast example and
every extension found in the wild uses exactly one submit action per form. Retaining the
action-picker UI likely requires the opposite architecture:

- Keep **one** `Action.SubmitForm` for the primary (opening) action.
- Track prompt values in state (`Form.Dropdown`/`Form.TextField` with `value` + `onChange`,
  or `useForm` from `@raycast/utils`).
- Render the alternate actions as plain `Action`s that read the tracked values and run
  themselves, since a plain `Action` never receives form values but state is always
  current.

## Verification Attempted From This Module

- Scripted macOS Accessibility run (see parent bug doc): window dump confirmed the form
  contents and the `⌘↵` badge; `pbpaste` confirmed no copy happened; keyboard focus kept
  landing on the browser rather than Raycast despite `set frontmost to true`, so the
  scripted keystroke result is not authoritative — the user's manual retest is.
- `dev.log` was empty during attempts; no console errors surfaced from the extension.

## Follow-ups

- Confirm or refute the multi-submit hypothesis with a single-submit scratch build.
- If confirmed, refactor to one `SubmitForm` + state-tracked alternate actions and update
  `TemplateFormAction` accordingly.
- Consider `filtering={false}` on choice dropdowns as a secondary mitigation if focus
  swallowing is involved.

## Related Documents

- Module plan: [`../../../../../plans/2026/11/19/2026-11-19-choice-dropdown-form.md`](../../../../../plans/2026/11/19/2026-11-19-choice-dropdown-form.md)
- Module plan (this session's action work):
  [`../../../../../plans/2026/11/19/2026-11-19-action-submit-form-panel.md`](../../../../../plans/2026/11/19/2026-11-19-action-submit-form-panel.md)
- Module reference: [`../../../../../important/choice-form.md`](../../../../../important/choice-form.md)
