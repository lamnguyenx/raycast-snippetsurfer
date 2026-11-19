# How to Test SnippetSurfer

## Run the local checks

From the root of the checkout containing the change, run:

```bash
npm ci
npm run lint
npm run build
```

Raycast lint needs network access to validate the manifest schema, author, and
contributors. The build compiles all three commands into `dist/`. The project
has no configured automated test suite.

A separate checkout is enough for these checks. For keyboard and clipboard tests
that must avoid interrupting an active desktop, use a separate macOS login session
or a macOS VM with Raycast installed.

## Start Raycast development mode

In the macOS session where you intend to test, run `npm run dev` from the checkout
containing the change and leave it running. In the extension preferences, point
**Primary Snippet Folder** at a test folder and enable **Dynamic Tokens**. Set
**Primary Action** to **Copy to clipboard** for the first check.

In the test folder, save `prompt-form-check.md` with this content.

```text
Hello {{ask:Name}} from {{choice:Place=Earth|Mars}}.
```

To reproduce the original regression, also save `model-choice-check.md` with
the same token that appeared in the reported snippet.

```text
model: {{choice:Model=VAI 2/glm-5.3|opencode-go/deepseek-v4.1-flash}}
```

Save `plain-snippet-check.md` with the single line `Hello from Earth.`.

## Verify prompt actions

1. Open **Search Snippets**, select `prompt-form-check`, and press **Enter**.
   **Fill In Snippet Values** should open with an empty **Name** field and
   **Earth** selected.
2. Enter `Ada`, select **Mars**, and press **⌘ + Enter** after closing the
   dropdown menu. The form should close and the clipboard should contain
   `Hello Ada from Mars.`. Verify with `pbpaste` in Terminal or paste into a
   scratch document.
3. From a scratch editor, reopen **Search Snippets**. Open the same snippet via
   **Paste to Active App** in the list's **⌘ + K** action panel. Fill in the
   form and press **⌘ + Enter**. The expanded text should appear in the editor.
   Repeat with **Type to Active App** as the opening action.
4. Reopen the form and change both fields. Press **⌘ + K** in the form and
   select an action other than the one that opened it. Verify that copy puts
   the expanded text on the clipboard and that paste or type inserts it into
   the scratch editor. Repeat for each action and confirm the result reflects
   the edits you just made.
5. Open `plain-snippet-check` with **Enter** while copy is the primary action.
   It should copy `Hello from Earth.` immediately without opening a form.

## Verify the original regression

With Copy as the primary action, open `model-choice-check.md`, pick
`opencode-go/deepseek-v4.1-flash`, and press **⌘ + Enter**. Expect
`model: opencode-go/deepseek-v4.1-flash` on the clipboard. Repeat using
**⌘ + K → Copy to Clipboard**. For a mouse-only check, click **Copy to Clipboard**
in the form footer after picking a value.

The prompt-form fix was verified in live Raycast with the original Model
snippet. **⌘ + Enter** copied the edited choice. **⌘ + K → Copy to Clipboard**
worked with both Copy and Paste as the opening action.
See the [prompt-form regression report](../issues/bugs/2026/11/19/2026-11-19-prompt-form-cmd-enter-no-op.md).
