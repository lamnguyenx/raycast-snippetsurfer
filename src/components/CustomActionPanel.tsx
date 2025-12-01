import { spawn } from "child_process";
import { getPastableContent } from "../utils/SnippetsLoader";
import {
  Action,
  ActionPanel,
  Icon,
  popToRoot,
  closeMainWindow,
  showToast,
  Toast,
  Clipboard,
  openExtensionPreferences,
} from "@raycast/api";
import type { Snippet, HeavyDutySnippet } from "../types";
import * as path from "path";

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
}: {
  snippet: HeavyDutySnippet;
  primaryAction: string;
  reloadSnippets: () => void;
  paths: string[];
}) => {
  const copyToClipboard = async () => {
    const command = process.platform === "darwin" ? "pbcopy" : "xclip -selection clipboard";

    return new Promise<void>((resolve, reject) => {
      const child = spawn("sh", ["-c", `cat "${snippet.fullPath}" | ${command}`]);
      child.on("close", (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Copy failed with code ${code}`));
        }
      });
      child.on("error", reject);
    });
  };

  const copyAndPaste = async () => {
    const copyCommand = process.platform === "darwin" ? "pbcopy" : "xclip -selection clipboard";

    try {
      // Copy to clipboard
      await new Promise<void>((resolve, reject) => {
        const child = spawn("sh", ["-c", `cat "${snippet.fullPath}" | ${copyCommand}`]);
        child.on("close", (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`Copy failed with code ${code}`));
        });
        child.on("error", (error) => {
          reject(error);
        });
      });

      // Show macOS dialog notification (auto-dismiss after 1 second)
      if (process.platform === "darwin") {
        try {
          // Use macOS dialog that auto-dismisses after 2 seconds
          const dialogScript = `display dialog "📄 ${snippet.name}\\nFile: ${snippet.fullPath}" with title "Snippet Copied!" buttons {"OK (auto close in 2s)"} default button "OK (auto close in 2s)" giving up after 2`;

          const dialogProcess = spawn("osascript", ["-e", dialogScript]);

          // Don't wait for completion - let it run in background
          dialogProcess.on("error", (error) => {
            // Fallback to Raycast toast if dialog fails
            showToast({
              style: Toast.Style.Success,
              title: "Snippet Copied!",
              message: `${snippet.name} - Press Cmd+V to paste`,
            });
          });
        } catch (error) {
          // Fallback to Raycast toast
          showToast({
            style: Toast.Style.Success,
            title: "Snippet Copied!",
            message: `${snippet.name} - Press Cmd+V to paste`,
          });
        }
      } else {
        // Non-macOS platforms use Raycast toast
        showToast({
          style: Toast.Style.Success,
          title: "Snippet Copied!",
          message: `${snippet.name} - Press Cmd+V to paste`,
        });
      }

      // Brief pause to let notification appear
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Close Raycast window after notification
      closeMainWindow();
    } catch (error) {
      // Show error notification with fallback
      if (process.platform === "darwin") {
        try {
          // Use macOS dialog for error (auto-dismiss after 2 seconds)
          const errorDialogScript = `display dialog "${
            error instanceof Error ? error.message : "Unknown error"
          }" with title "Snippet Copy Failed" buttons {"OK (auto close in 4s)"} default button "OK (auto close in 4s)" giving up after 4`;

          const errorDialogProcess = spawn("osascript", ["-e", errorDialogScript]);

          errorDialogProcess.on("error", (dialogError) => {
            // Fallback to Raycast toast
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to copy snippet",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          });
        } catch (fallbackError) {
          // Fallback to Raycast toast
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to copy snippet",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        // Non-macOS platforms use Raycast toast
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to copy snippet",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const pasteToActiveApp = async () => {
    const command = process.platform === "darwin" ? "pbpaste" : "xclip -selection clipboard -o";

    return new Promise<void>((resolve, reject) => {
      // First copy to clipboard, then paste
      const copyChild = spawn("sh", [
        "-c",
        `cat "${snippet.fullPath}" | ${process.platform === "darwin" ? "pbcopy" : "xclip -selection clipboard"}`,
      ]);
      copyChild.on("close", (copyCode: number) => {
        if (copyCode === 0) {
          // Now paste (this would need OS-specific paste command)
          // For now, just copy - paste would need additional OS integration
          resolve();
        } else {
          reject(new Error(`Copy failed with code ${copyCode}`));
        }
      });
      copyChild.on("error", reject);
    });
  };

  const actions = [
    <Action title="Copy to Clipboard" icon={Icon.Clipboard} key="copyAndPaste" onAction={copyAndPaste} />,
    <Action
      title="Copy Real File Path"
      icon={Icon.Link}
      key="copyFilePath"
      onAction={async () => {
        await Clipboard.copy(snippet.fullPath);

        // Show macOS dialog notification (auto-dismiss after 2 seconds)
        if (process.platform === "darwin") {
          try {
            const dialogScript = `display dialog "📄 File Path Copied\\n${snippet.fullPath}" with title "Path Copied!" buttons {"OK (auto close in 2s)"} default button "OK (auto close in 2s)" giving up after 2`;

            const dialogProcess = spawn("osascript", ["-e", dialogScript]);

            // Don't wait for completion - let it run in background
            dialogProcess.on("error", (error) => {
              // Fallback to Raycast toast if dialog fails
              showToast({
                style: Toast.Style.Success,
                title: "File path copied to clipboard",
                message: snippet.fullPath,
              });
            });
          } catch (error) {
            // Fallback to Raycast toast
            showToast({
              style: Toast.Style.Success,
              title: "File path copied to clipboard",
              message: snippet.fullPath,
            });
          }
        } else {
          // Non-macOS platforms use Raycast toast
          showToast({
            style: Toast.Style.Success,
            title: "File path copied to clipboard",
            message: snippet.fullPath,
          });
        }

        // Brief pause to let notification appear
        await new Promise((resolve) => setTimeout(resolve, 100));
      }}
    />,
    <Action title="Paste to Active App" icon={Icon.ArrowRight} key="paste" onAction={pasteToActiveApp} />,
  ];

  let reorderedActions = actions;
  if (primaryAction === "copyFilePath") {
    // Make Copy Real File Path first
    reorderedActions = [actions[1], actions[0], actions[2]];
  } else if (primaryAction === "pasteToActiveApp") {
    // Make Paste to Active App first
    reorderedActions = [actions[2], actions[0], actions[1]];
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
