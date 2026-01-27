import {
  Icon,
  List,
  showToast,
  Toast,
  ActionPanel,
  Action,
  type KeyModifier,
  type KeyEquivalent,
  closeMainWindow,
} from "@raycast/api";

import { useEffect, useState } from "react";
import { expandHomeDirectory, discoverAllSnippets, loadSnippetPreview } from "../utils/SnippetsLoader";
import type { State, HeavyDutySnippet } from "../types";
import { HeavyDutyActionPanel } from "../components/CustomActionPanel";
import * as fs from "fs";
import * as pathMod from "path";
import * as os from "os";

// Custom search filtering component
const formatShortcut = (shortcut: { modifiers: KeyModifier[]; key: KeyEquivalent }): string => {
  const modifierStr = shortcut.modifiers
    .map((mod) => (mod === "cmd" ? "Cmd" : mod.charAt(0).toUpperCase() + mod.slice(1)))
    .join("+");
  return modifierStr ? `${modifierStr}+${String(shortcut.key).toUpperCase()}` : String(shortcut.key).toUpperCase();
};

const filterSnippets = (snippets: HeavyDutySnippet[], query: string): HeavyDutySnippet[] => {
  if (!query.trim()) return snippets;

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((word) => word.length > 0);

  return snippets.filter((snippet) => {
    // Check filename and folder
    const nameMatch = snippet.name.toLowerCase().includes(queryLower);
    const folderMatch = snippet.folder.toLowerCase().includes(queryLower);

    // Check search content with partial matching
    const contentMatch = queryWords.every((word) => {
      return snippet.searchContent.includes(word);
    });
    return nameMatch || folderMatch || contentMatch;
  });
};

// Lazy preview loading (uses LRU cache)
const loadPreview = async (snippet: HeavyDutySnippet, setCurrentPreview: (preview: string) => void) => {
  try {
    const preview = await loadSnippetPreview(snippet);
    setCurrentPreview(preview);
  } catch (error) {
    const errorMessage = `Failed to load preview: ${error instanceof Error ? error.message : "Unknown error"}`;
    setCurrentPreview(errorMessage);
  }
};

// SnippetPreview component
const SnippetPreview = ({ snippet, preview }: { snippet: HeavyDutySnippet; preview: string | null }) => {
  const title = snippet.name;
  const folder = snippet.folder && snippet.folder !== "." ? snippet.folder : "";
  const fileSize =
    snippet.fileSize < 1024
      ? `${snippet.fileSize}B`
      : snippet.fileSize < 1024 * 1024
      ? `${(snippet.fileSize / 1024).toFixed(1)}KB`
      : `${(snippet.fileSize / (1024 * 1024)).toFixed(1)}MB`;

  // Format file path with ~ instead of $HOME
  const homeDir = os.homedir();
  const displayPath = snippet.fullPath.replace(homeDir, "~");

  const content = preview || "⏳ Loading preview...";

  // Calculate line count for preview
  const previewLines = content === "Loading preview..." ? 0 : content.split("\n").length;

  return (
    <List.Item.Detail
      markdown={`### ${title}${folder ? ` - ${folder}` : ""}
**Path:** \`${displayPath}\`

**Size:** ${fileSize} **Lines:** ${previewLines}

\`(showing first 50 lines)\`

\`\`\`
${content}
\`\`\`
`}
    />
  );
};

// Main reusable SnippetSearch component
interface SnippetSearchProps {
  locationName: string;
  mainFolderPath: string;
  primaryAction?: string;
  searchIndexLines?: number;
  supportedExtensions?: string;
  showReloadShortcut?: boolean;
}

export default function SnippetSearch({
  locationName,
  mainFolderPath,
  primaryAction = "copyAndPaste",
  searchIndexLines = 3,
  supportedExtensions = "md,txt,yaml,yml,json,sh",
  showReloadShortcut = true,
}: SnippetSearchProps) {
  const [state, setState] = useState<State>({ heavyDutySnippets: [], isLoading: true });
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");

  // Reload shortcut
  const reloadShortcut = { modifiers: ["cmd" as KeyModifier], key: "r" as KeyEquivalent };

  // Auto-select first action on Enter for Mini mode
  const handleQuickAction = async (snippet: HeavyDutySnippet) => {
    if (locationName.toLowerCase() === "mini") {
      // Simulate typing behavior on Enter
      const { spawn } = await import("child_process");

      try {
        const content = await new Promise<string>((resolve, reject) => {
          const child = spawn("cat", [snippet.fullPath]);
          let data = "";
          child.stdout.on("data", (chunk: Buffer) => {
            data += chunk.toString();
          });
          child.on("close", () => {
            resolve(data);
          });
          child.on("error", reject);
        });

        // Escape quotes properly for AppleScript
        const escapedContent = content.replace(/"/g, '"');

        // Build a self-contained AppleScript for typing only
        // Window will close via closeMainWindow() API
        // This runs independently and continues after window closes
        const appleScript = `
          tell application "System Events"
            delay 0.5
            keystroke "${escapedContent}"
            delay 0.1
          end tell
        `;

        // Run typing script in background - will continue after window closes
        spawn("osascript", ["-e", appleScript]);

        // Show macOS dialog notification (auto-dismiss after 2 seconds)
        console.log(`[DEBUG] handleQuickAction - platform: ${process.platform}, attempting dialog`);
        if (process.platform === "darwin") {
          console.log(`[DEBUG] Spawning macOS dialog for typing`);
          try {
            // Use macOS dialog that auto-dismisses after 2 seconds
            // Escape newlines and quotes in file paths for AppleScript
            const escapedName = snippet.name.replace(/"/g, '"');
            const escapedPath = snippet.fullPath.replace(/"/g, '"');
            const dialogScript = `display dialog "${escapedName}" & return & "File: ${escapedPath}" with title "Snippet Typed!" buttons {"OK (auto close in 2s)"} default button "OK (auto close in 2s)" giving up after 2`;
            console.log(`[DEBUG] AppleScript: ${dialogScript}`);

            const dialogProcess = spawn("osascript", ["-e", dialogScript]);
            console.log(`[DEBUG] Dialog process spawned with PID: ${dialogProcess.pid || "unknown"}`);

            // Don't wait for completion - let it run in background
            dialogProcess.on("error", (error) => {
              console.log(`[DEBUG] Dialog process error: ${JSON.stringify(error)}`);
              // Fallback to Raycast toast if dialog fails
              showToast({
                style: Toast.Style.Success,
                title: "Snippet Typed!",
                message: `${snippet.name} - Content typed automatically`,
              });
            });
          } catch (error) {
            console.log(`[DEBUG] Exception spawning dialog: ${JSON.stringify(error)}`);
            // Fallback to Raycast toast
            showToast({
              style: Toast.Style.Success,
              title: "Snippet Typed!",
              message: `${snippet.name} - Content typed automatically`,
            });
          }
        } else {
          // Non-macOS platforms use Raycast toast
          console.log(`[DEBUG] Using Raycast toast (not darwin platform)`);
          showToast({
            style: Toast.Style.Success,
            title: "Snippet Typed!",
            message: `${snippet.name} - Content typed automatically`,
          });
        }

        // Brief pause to let notification appear
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Schedule window close in background
        closeMainWindow();
      } catch (error) {
        console.error("Error typing snippet:", error);

        // Show error notification with fallback
        if (process.platform === "darwin") {
          try {
            // Use macOS dialog for error (auto-dismiss after 2 seconds)
            const errorDialogScript = `display dialog "${
              error instanceof Error ? error.message : "Unknown error"
            }" with title "Snippet Typing Failed" buttons {"OK (auto close in 2s)"} default button "OK (auto close in 2s)" giving up after 2`;

            const errorDialogProcess = spawn("osascript", ["-e", errorDialogScript]);

            errorDialogProcess.on("error", (dialogError) => {
              // Fallback to Raycast toast
              showToast({
                style: Toast.Style.Failure,
                title: "Failed to type snippet",
                message: error instanceof Error ? error.message : "Unknown error",
              });
            });
          } catch (fallbackError) {
            // Fallback to Raycast toast
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to type snippet",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        } else {
          // Non-macOS platforms use Raycast toast
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to type snippet",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }
  };

  // Modified to handle quick action on Enter for Mini mode
  const onQuickAction = (snippet: HeavyDutySnippet) => {
    loadPreview(snippet, setCurrentPreview);
    if (locationName.toLowerCase() === "mini") {
      handleQuickAction(snippet);
    }
  };

  // Initial data fetch
  const fetchData = async () => {
    try {
      // Handle empty folder path
      if (!mainFolderPath || mainFolderPath.trim() === "") {
        setState((previous) => ({ ...previous, errors: [new Error("No folder path specified")] }));
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      const expandedPath = expandHomeDirectory(mainFolderPath);

      // Check if folder exists
      try {
        await fs.promises.access(expandedPath);
      } catch (accessError) {
        const errorMsg = expandedPath.endsWith("/")
          ? `Folder does not exist: ${expandedPath}`
          : `Default ${locationName} folder does not exist at ${expandedPath}`;
        setState((previous) => ({ ...previous, errors: [new Error(errorMsg)] }));
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      const extensions = supportedExtensions.split(",").map((ext: string) => "." + ext.trim());

      const { snippets, errors } = await discoverAllSnippets(expandedPath, searchIndexLines, extensions);

      // Handle empty folder
      if (snippets.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: `No snippets found`,
          message: `The ${locationName} folder is empty or contains no supported files`,
        });
      }

      const folders = Array.from(new Set(snippets.map((i) => i.folder)));

      // Create priority map for extensions
      const extensionPriority: { [key: string]: number } = {};
      extensions.forEach((ext: string, index: number) => {
        extensionPriority[ext] = index;
      });

      // Sort by extension priority (lower number first), then by modification time (newest first)
      const orderedSnippets = snippets.sort((a, b) => {
        const extA = pathMod.extname(a.fullPath);
        const extB = pathMod.extname(b.fullPath);
        const priA = extensionPriority[extA] ?? 999;
        const priB = extensionPriority[extB] ?? 999;
        if (priA !== priB) return priA - priB;
        return b.modifiedTime.getTime() - a.modifiedTime.getTime();
      });

      setState((previous) => ({
        ...previous,
        heavyDutySnippets: orderedSnippets,
        filteredHeavyDutySnippets: orderedSnippets,
        folders: folders,
        errors: errors,
      }));

      // Show success toast if no errors and snippets exist
      if (errors.length === 0 && snippets.length > 0) {
        showToast({
          style: Toast.Style.Success,
          title: `Snippets reloaded in ${locationName}`,
          message: `Loaded ${snippets.length} snippets`,
        });
      }
    } catch (err) {
      setState((previous) => ({
        ...previous,
        errors: [err instanceof Error ? err : new Error("Something went wrong")],
      }));
    }

    setState((previous) => ({ ...previous, isLoading: false }));
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [mainFolderPath, searchIndexLines, supportedExtensions]);

  // Handle filter folder and search
  useEffect(() => {
    if (state.heavyDutySnippets) {
      let filtered: HeavyDutySnippet[] = state.heavyDutySnippets;

      // Apply folder filter
      if (state.selectedFilter && state.selectedFilter != "all") {
        if (state.selectedFilter.startsWith("folder:")) {
          const filterValue = state.selectedFilter.substring("folder:".length);
          filtered = filtered.filter((snippet) => snippet.folder === filterValue);
        }
      }

      // Apply custom search filter
      filtered = filterSnippets(filtered, searchText);

      setState((previous) => ({ ...previous, filteredHeavyDutySnippets: filtered }));
    }
  }, [state.selectedFilter, state.heavyDutySnippets, searchText]);

  // Show error toast if errors exist
  useEffect(() => {
    if (state.errors && state.errors.length != 0) {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Error loading snippets.",
        message: state.errors?.map((e) => e.message).join("\n"),
      };
      showToast(options);
    }
  }, [state.errors]);

  const loadSnippetsView = state.filteredHeavyDutySnippets && state.filteredHeavyDutySnippets.length != 0;

  return (
    <List
      searchBarPlaceholder={`Type to search ${locationName} snippets`}
      isLoading={state.isLoading}
      isShowingDetail={loadSnippetsView}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => {
        if (id && state.filteredHeavyDutySnippets) {
          const snippet = state.filteredHeavyDutySnippets.find((s) => s.id === id);
          if (snippet) {
            loadPreview(snippet, setCurrentPreview);
          }
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter on folder"
          storeValue={true}
          onChange={(newValue) => {
            setState((previous) => ({ ...previous, selectedFilter: newValue }));
          }}
        >
          <List.Dropdown.Item title="All" value="all" />
          {state.folders && state.folders.length != 1 && (
            <List.Dropdown.Section title="Folders">
              {state.folders.map((i) => {
                return <List.Dropdown.Item title={i} value={`folder:${i}`} key={i} />;
              })}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {!loadSnippetsView && (
        <List.EmptyView
          icon={Icon.Snippets}
          title="No Snippets"
          description={`Try Enter or open Actions then hit ${
            showReloadShortcut ? formatShortcut(reloadShortcut) : "Reload"
          } to load snippets from ${locationName} folder`}
          actions={
            <>
              {showReloadShortcut && (
                <ActionPanel>
                  <Action
                    title="Reload Snippets"
                    icon={Icon.RotateAntiClockwise}
                    onAction={fetchData}
                    shortcut={reloadShortcut}
                  />
                </ActionPanel>
              )}
            </>
          }
        />
      )}
      {loadSnippetsView &&
        state.filteredHeavyDutySnippets?.map((i) => {
          // Format file size for display
          const formatFileSize = (bytes: number): string => {
            if (bytes < 1024) return `${bytes}B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
          };

          return (
            <List.Item
              id={i.id}
              key={i.id}
              title={i.name}
              accessories={[
                { icon: Icon.Folder, text: i.folder && i.folder !== "." ? i.folder : "" },
                { text: formatFileSize(i.fileSize) },
              ]}
              icon={Icon.Document}
              detail={<SnippetPreview snippet={i} preview={currentPreview} />}
              actions={
                <HeavyDutyActionPanel
                  snippet={i}
                  primaryAction={primaryAction}
                  reloadSnippets={fetchData}
                  paths={[mainFolderPath]}
                  locationType={locationName.toLowerCase()}
                />
              }
            ></List.Item>
          );
        })}
    </List>
  );
}

// Re-export types for compatibility
export { type SnippetSearchProps };
