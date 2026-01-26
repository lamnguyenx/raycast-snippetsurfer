import { Icon, List, showToast, Toast, ActionPanel, Action, type KeyModifier, type KeyEquivalent } from "@raycast/api";

import { useEffect, useState } from "react";
import { expandHomeDirectory, discoverAllSnippets, loadSnippetPreview } from "../utils/SnippetsLoader";
import type { State, HeavyDutySnippet } from "../types";
import { HeavyDutyActionPanel } from "../components/CustomActionPanel";
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
  folderPath: string;
  primaryAction?: string;
  searchIndexLines?: number;
  supportedExtensions?: string;
  showReloadShortcut?: boolean;
}

export default function SnippetSearch({
  locationName,
  folderPath,
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

  // Initial data fetch
  const fetchData = async () => {
    try {
      // Handle empty folder path
      if (!folderPath || folderPath.trim() === "") {
        setState((previous) => ({ ...previous, errors: [new Error("No folder path specified")] }));
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      const expandedPath = expandHomeDirectory(folderPath);
      const extensions = supportedExtensions.split(",").map((ext: string) => "." + ext.trim());

      const { snippets, errors } = await discoverAllSnippets(expandedPath, searchIndexLines, extensions);

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

      // Show success toast if no errors
      if (errors.length === 0) {
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
  }, [folderPath, searchIndexLines, supportedExtensions]);

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
                  paths={[folderPath]}
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
