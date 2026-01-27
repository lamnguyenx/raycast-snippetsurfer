import { spawn } from "child_process";
import * as fs from "fs";
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
  locationType,
}: {
  snippet: HeavyDutySnippet;
  primaryAction: string;
  reloadSnippets: () => void;
  paths: string[];
  locationType?: string;
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
      console.log(`[DEBUG] copyAndPaste - platform: ${process.platform}, attempting dialog`);
      if (process.platform === "darwin") {
        console.log(`[DEBUG] Spawning macOS dialog for copy`);
        try {
          // Use macOS dialog that auto-dismisses after 2 seconds
          // Escape newlines and quotes in file paths for AppleScript
          const escapedName = snippet.name.replace(/"/g, '\\"');
          const escapedPath = snippet.fullPath.replace(/"/g, '\\"');
          const dialogScript = `display dialog "${escapedName}" & return & "File: ${escapedPath}" with title "Snippet Copied!" buttons {"OK (auto close in 2s)"} default button "OK (auto close in 2s)" giving up after 2`;
          console.log(`[DEBUG] AppleScript: ${dialogScript}`);

          const dialogProcess = spawn("osascript", ["-e", dialogScript]);
          console.log(`[DEBUG] Dialog process spawned with PID: ${dialogProcess.pid || "unknown"}`);

          // Don't wait for completion - let it run in background
          dialogProcess.on("error", (error) => {
            console.log(`[DEBUG] Dialog process error: ${JSON.stringify(error)}`);
            // Fallback to Raycast toast if dialog fails
            showToast({
              style: Toast.Style.Success,
              title: "Snippet Copied!",
              message: `${snippet.name} - Press Cmd+V to paste`,
            });
          });
        } catch (error) {
          console.log(`[DEBUG] Exception spawning dialog: ${JSON.stringify(error)}`);
          // Fallback to Raycast toast
          showToast({
            style: Toast.Style.Success,
            title: "Snippet Copied!",
            message: `${snippet.name} - Press Cmd+V to paste`,
          });
        }
      } else {
        // Non-macOS platforms use Raycast toast
        console.log(`[DEBUG] Using Raycast toast (not darwin platform)`);
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
    try {
      console.log(`[DEBUG] pasteToActiveApp called for: ${snippet.name}`);
      console.log(`[DEBUG] locationType: ${locationType || "undefined"}`);
      console.log(`[DEBUG] fullPath: ${snippet.fullPath}`);
      console.log(`[DEBUG] fileSize: ${snippet.fileSize}`);
      console.log(`[DEBUG] platform: ${process.platform}`);

      // Read the snippet file content
      const content = await new Promise<string>((resolve, reject) => {
        console.log(`[DEBUG] Reading file: ${snippet.fullPath}`);
        const child = spawn("cat", [snippet.fullPath]);
        let data = "";
        child.stdout.on("data", (chunk) => {
          data += chunk.toString();
        });
        child.on("close", () => {
          console.log(`[DEBUG] File read complete, content length: ${data.length}`);
          resolve(data);
        });
        child.on("error", (err) => {
          console.log(`[DEBUG] Error reading file: ${err.message}`);
          reject(err);
        });
      });

      // Copy to clipboard first
      const copyCommand = process.platform === "darwin" ? "pbcopy" : "xclip -selection clipboard";
      await new Promise<void>((resolve, reject) => {
        const child = spawn("sh", ["-c", `echo "${content.replace('"', '"')}" | ${copyCommand}`]);
        child.on("close", (code: number) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Copy failed with code ${code}`));
          }
        });
        child.on("error", reject);
      });

      // Use AppleScript to paste - RUN IN BACKGROUND INDEPENDENT PROCESS
      if (process.platform === "darwin") {
        // Build a self-contained AppleScript that handles the delay and pasting
        // Use 'System Events' to quickly close frontend window
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

        // Run the script in background - it will continue after window closes
        spawn("osascript", ["-e", pasteScript]);
      }

      // Only show dialog for snippets in primary folder
      const isPrimaryFolder = !locationType || locationType === "search" || locationType === "primary";
      console.log(
        `[DEBUG] pasteToActiveApp - isPrimaryFolder: ${isPrimaryFolder}, platform: ${process.platform}, condition: ${
          process.platform === "darwin" && isPrimaryFolder
        }`
      );

      if (process.platform === "darwin" && isPrimaryFolder) {
        console.log(`[DEBUG] Attempting to show macOS dialog for pasted snippet`);
        try {
          // Escape newlines and quotes in file paths for AppleScript
          const escapedName = snippet.name.replace(/"/g, '\\"');
          const escapedPath = snippet.fullPath.replace(/"/g, '\\"');
          const dialogScript = `display dialog "${escapedName}" & return & "File: ${escapedPath}" with title "Snippet Pasted!" buttons {"OK (auto close in 2s)"} default button "OK (auto close in 2s)" giving up after 2`;
          console.log(`[DEBUG] AppleScript: ${dialogScript}`);

          // Run dialog in background, don't wait for completion
          const dialogProcess = spawn("osascript", ["-e", dialogScript]);
          console.log(`[DEBUG] Dialog process spawned with PID: ${dialogProcess.pid || "unknown"}`);
        } catch (error) {
          // Fallback to Raycast toast if dialog fails
          console.log(`[DEBUG] macOS dialog failed: ${JSON.stringify(error)}`);
          showToast({
            style: Toast.Style.Success,
            title: "Snippet Pasted!",
            message: `${snippet.name} - Content pasted automatically`,
          });
        }
      } else {
        console.log(`[DEBUG] Using Raycast toast (not meeting dialog conditions)`);
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
        await copyAndPaste();
        showToast({
          style: Toast.Style.Success,
          title: "Fallback: Snippet Copied!",
          message: `${snippet.name} - Press Cmd+V to paste (auto-paste failed)`,
        });
      } catch (fallbackError) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to handle snippet",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const typeToActiveApp = async () => {
    try {
      // Read the snippet file content
      const content = await new Promise<string>((resolve, reject) => {
        const child = spawn("cat", [snippet.fullPath]);
        let data = "";
        child.stdout.on("data", (chunk) => {
          data += chunk.toString();
        });
        child.on("close", () => {
          resolve(data);
        });
        child.on("error", reject);
      });

      // Use AppleScript to type - RUN IN BACKGROUND INDEPENDENT PROCESS
      try {
        // Escape quotes properly for AppleScript
        const escapedContent = content.replace(/"/g, "\\");

        // Build a self-contained AppleScript that closes window and types
        // Use 'System Events' to quickly close frontend window with Cmd+W
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

        // Run the script in background - it will continue after window closes
        spawn("osascript", ["-e", typeScript]);

        // Only show dialog for snippets in primary folder
        const isPrimaryFolder = !locationType || locationType === "search" || locationType === "primary";
        console.log(
          `[DEBUG] typeToActiveApp - isPrimaryFolder: ${isPrimaryFolder}, platform: ${process.platform}, condition: ${
            process.platform === "darwin" && isPrimaryFolder
          }`
        );

        if (process.platform === "darwin" && isPrimaryFolder) {
          console.log(`[DEBUG] Attempting to show macOS dialog for typed snippet`);
          try {
            // Escape newlines and quotes in file paths for AppleScript
            const escapedName = snippet.name.replace(/"/g, '\\"');
            const escapedPath = snippet.fullPath.replace(/"/g, '\\"');
            const dialogScript = `display dialog "${escapedName}" & return & "File: ${escapedPath}" with title "Snippet Typed!" buttons {"OK (auto close in 2s)"} default button "OK (auto close in 2s)" giving up after 2`;
            console.log(`[DEBUG] AppleScript: ${dialogScript}`);

            // Run dialog in background, don't wait for completion
            const dialogProcess = spawn("osascript", ["-e", dialogScript]);
            console.log(`[DEBUG] Dialog process spawned with PID: ${dialogProcess.pid || "unknown"}`);
          } catch (error) {
            console.log(`[DEBUG] macOS dialog failed in type: ${JSON.stringify(error)}`);
            // Fallback to Raycast toast if dialog fails
            showToast({
              style: Toast.Style.Success,
              title: "Snippet Typed!",
              message: `${snippet.name} - Content typed automatically`,
            });
          }
        } else {
          console.log(`[DEBUG] Using Raycast toast in type (not meeting conditions)`);
          showToast({
            style: Toast.Style.Success,
            title: "Snippet Typed!",
            message: `${snippet.name} - Content typed automatically`,
          });
        }

        // Schedule window close in background
        setTimeout(() => closeMainWindow(), 100);
      } catch (error) {
        // Fallback to clipboard method if AppleScript fails
        await copyAndPaste();
        showToast({
          style: Toast.Style.Success,
          title: "Fallback: Snippet Copied!",
          message: `${snippet.name} - Press Cmd+V to paste (typing failed)`,
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to type snippet",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
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
            const dialogScript = `display dialog "File Path Copied: ${snippet.fullPath}" with title "Path Copied!" buttons {"OK (auto close in 2s)"} default button "OK (auto close in 2s)" giving up after 2`;

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
