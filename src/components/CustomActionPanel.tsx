import { spawn } from "child_process";
import { readSnippetContent, getPastableContent } from "../utils/SnippetsLoader";
import { expandTemplate, findTemplatePrompts } from "../utils/TemplateExpander";
import {
  Action,
  ActionPanel,
  Icon,
  closeMainWindow,
  showToast,
  Toast,
  Clipboard,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import type { Snippet, HeavyDutySnippet } from "../types";
import * as path from "path";
import TemplateArgumentForm from "./TemplateArgumentForm";

const CustomActionPanel = ({
  handleAction,
  snippet,
  primaryAction,
  reloadSnippets,
  paths,
}: {
  handleAction: (s: Snippet) => void;
  snippet: Snippet;
  primaryAction: string;
  reloadSnippets: () => void;
  paths: string[];
}) => {
  const actions = [
    <Action.CopyToClipboard
      content={getPastableContent(snippet.content?.content)}
      key="copy"
      onCopy={() => {
        handleAction(snippet);
      }}
    />,
    <Action.Paste
      content={getPastableContent(snippet.content?.content)}
      key="paste"
      onPaste={() => {
        handleAction(snippet);
      }}
    />,
  ];

  let reorderedActions = actions;
  if (primaryAction && primaryAction != "copyClipboard") {
    reorderedActions = reorderedActions.reverse();
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="Actions">{reorderedActions}</ActionPanel.Section>
      <ActionPanel.Section title="Others">
        <Action
          title="Reload Snippets"
          icon={Icon.RotateAntiClockwise}
          onAction={reloadSnippets}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        {paths && paths.length != 0 && (
          <>
            <Action.OpenWith
              title="Open Primary Snippets Folder"
              path={paths[0]}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            {paths.slice(1).map((p, index) => {
              const lastDir = path.basename(p);
              return <Action.OpenWith title={`Open Secondary Snippets Folder ${lastDir}`} path={p} key={index} />;
            })}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
};

// HeavyDutySnippet version with subprocess copy/paste
const HeavyDutyActionPanel = ({
  snippet,
  primaryAction,
  reloadSnippets,
  paths,
  locationType,
  enableTemplates = true,
}: {
  snippet: HeavyDutySnippet;
  primaryAction: string;
  reloadSnippets: () => void;
  paths: string[];
  locationType?: string;
  enableTemplates?: boolean;
}) => {
  const { push } = useNavigation();

  // Run an action against the snippet content after expanding dynamic tokens.
  // If the content contains {{ask:...}} placeholders, prompt for them first.
  const withContent = async (action: (content: string) => void | Promise<void>) => {
    const raw = await readSnippetContent(snippet.fullPath);

    if (!enableTemplates) {
      await action(raw);
      return;
    }

    const prompts = findTemplatePrompts(raw);
    if (prompts.length === 0) {
      await action(expandTemplate(raw));
      return;
    }

    push(
      <TemplateArgumentForm
        prompts={prompts}
        onSubmit={(values) => {
          action(expandTemplate(raw, { values }));
        }}
      />
    );
  };

  // Show a macOS auto-dismissing dialog, falling back to a Raycast toast.
  const notify = (dialogTitle: string, toastTitle: string, message: string) => {
    if (process.platform !== "darwin") {
      showToast({ style: Toast.Style.Success, title: toastTitle, message });
      return;
    }
    try {
      const escapedName = snippet.name.replace(/"/g, '\\"');
      const escapedPath = snippet.fullPath.replace(/"/g, '\\"');
      const dialogScript = `display dialog "${escapedName}" & return & "File: ${escapedPath}" with title "${dialogTitle}" buttons {"OK (auto close in 2s)"} default button "OK (auto close in 2s)" giving up after 2`;
      const dialogProcess = spawn("osascript", ["-e", dialogScript]);
      dialogProcess.on("error", () => {
        showToast({ style: Toast.Style.Success, title: toastTitle, message });
      });
    } catch {
      showToast({ style: Toast.Style.Success, title: toastTitle, message });
    }
  };

  const notifyError = (dialogTitle: string, toastTitle: string, message: string) => {
    if (process.platform !== "darwin") {
      showToast({ style: Toast.Style.Failure, title: toastTitle, message });
      return;
    }
    try {
      const escapedMessage = message.replace(/"/g, '\\"');
      const errorDialogScript = `display dialog "${escapedMessage}" with title "${dialogTitle}" buttons {"OK (auto close in 4s)"} default button "OK (auto close in 4s)" giving up after 4`;
      const errorDialogProcess = spawn("osascript", ["-e", errorDialogScript]);
      errorDialogProcess.on("error", () => {
        showToast({ style: Toast.Style.Failure, title: toastTitle, message });
      });
    } catch {
      showToast({ style: Toast.Style.Failure, title: toastTitle, message });
    }
  };

  const copyAndPaste = () =>
    withContent(async (content) => {
      try {
        await Clipboard.copy(content);
        notify("Snippet Copied!", "Snippet Copied!", `${snippet.name} - Press Cmd+V to paste`);

        // Brief pause to let notification appear
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Close Raycast window after notification
        closeMainWindow();
      } catch (error) {
        notifyError(
          "Snippet Copy Failed",
          "Failed to copy snippet",
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    });

  const copyRealFilePath = async () => {
    await Clipboard.copy(snippet.fullPath);
    notify("Path Copied!", "File path copied to clipboard", snippet.fullPath);
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  const pasteToActiveApp = () =>
    withContent(async (content) => {
      try {
        // Copy to clipboard first
        await Clipboard.copy(content);

        // Use AppleScript to paste - run in a background independent process
        if (process.platform === "darwin") {
          const pasteScript = `
          tell application "System Events"
            tell process "Raycast"
              keystroke "w" using {command down}
            end tell
            delay 0.5
            keystroke "v" using {command down}
            delay 0.1
          end tell
        `;
          spawn("osascript", ["-e", pasteScript]);
        }

        // Only show dialog for snippets in the primary folder
        const isPrimaryFolder = !locationType || locationType === "search" || locationType === "primary";
        if (process.platform === "darwin" && isPrimaryFolder) {
          notify("Snippet Pasted!", "Snippet Pasted!", `${snippet.name} - Content pasted automatically`);
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Snippet Pasted!",
            message: `${snippet.name} - Content pasted automatically`,
          });
        }

        // Close the window with a slight delay
        setTimeout(() => closeMainWindow(), 200);
      } catch (error) {
        // Fallback to just copying if paste fails
        try {
          await Clipboard.copy(content);
          notify(
            "Snippet Copied!",
            "Fallback: Snippet Copied!",
            `${snippet.name} - Press Cmd+V to paste (auto-paste failed)`
          );
        } catch (fallbackError) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to handle snippet",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    });

  const typeToActiveApp = () =>
    withContent(async (content) => {
      try {
        // Escape backslashes and quotes for the AppleScript string literal
        const escapedContent = content.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

        // Build a self-contained AppleScript that closes the window and types
        const typeScript = `
        tell application "System Events"
          tell process "Raycast"
            keystroke "w" using {command down}
          end tell
          delay 0.5
          keystroke "${escapedContent}"
          delay 0.1
        end tell
      `;
        spawn("osascript", ["-e", typeScript]);

        // Only show dialog for snippets in the primary folder
        const isPrimaryFolder = !locationType || locationType === "search" || locationType === "primary";
        if (process.platform === "darwin" && isPrimaryFolder) {
          notify("Snippet Typed!", "Snippet Typed!", `${snippet.name} - Content typed automatically`);
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "Snippet Typed!",
            message: `${snippet.name} - Content typed automatically`,
          });
        }

        setTimeout(() => closeMainWindow(), 100);
      } catch (error) {
        // Fallback to clipboard method if AppleScript fails
        await Clipboard.copy(content);
        notify(
          "Snippet Copied!",
          "Fallback: Snippet Copied!",
          `${snippet.name} - Press Cmd+V to paste (typing failed)`
        );
      }
    });

  const actions = [
    <Action title="Copy to Clipboard" icon={Icon.Clipboard} key="copyAndPaste" onAction={copyAndPaste} />,
    <Action title="Copy Real File Path" icon={Icon.Link} key="copyFilePath" onAction={copyRealFilePath} />,
    <Action title="Paste to Active App" icon={Icon.ArrowRight} key="paste" onAction={pasteToActiveApp} />,
    <Action title="Type to Active App" icon={Icon.Keyboard} key="type" onAction={typeToActiveApp} />,
  ];

  let reorderedActions = actions;
  if (primaryAction === "copyFilePath") {
    // Make Copy Real File Path first
    reorderedActions = [actions[1], actions[0], actions[2], actions[3]];
  } else if (primaryAction === "pasteToActiveApp") {
    // Make Paste to Active App first
    reorderedActions = [actions[2], actions[0], actions[1], actions[3]];
  } else if (primaryAction === "typeToActiveApp") {
    // Make Type to Active App first
    reorderedActions = [actions[3], actions[0], actions[1], actions[2]];
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="Actions">{reorderedActions}</ActionPanel.Section>
      <ActionPanel.Section title="Others">
        <Action
          title="Reload Snippets"
          icon={Icon.RotateAntiClockwise}
          onAction={reloadSnippets}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action.OpenWith title="Open File" path={snippet.fullPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
        {paths && paths.length !== 0 && (
          <>
            <Action.OpenWith
              title="Open Primary Snippets Folder"
              path={paths[0]}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
            {paths.slice(1).map((p, index) => {
              const lastDir = path.basename(p);
              return <Action.OpenWith title={`Open Secondary Snippets Folder ${lastDir}`} path={p} key={index} />;
            })}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default CustomActionPanel;
export { HeavyDutyActionPanel };
