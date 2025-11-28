import { Icon, List, showToast, Toast, ActionPanel, Action, getPreferenceValues } from "@raycast/api";

import { useEffect, useState } from "react";
import { spawn } from "child_process";
import * as os from "os";
// Raycast API imports are now in the second import statement
import type { State, HeavyDutySnippet } from "./types";
import { HeavyDutyActionPanel } from "./components/CustomActionPanel";
import { expandHomeDirectory, discoverAllSnippets, loadSnippetPreview } from "./utils/SnippetsLoader";

export default function Command() {
  const [state, setState] = useState<State>({ heavyDutySnippets: [], isLoading: true });
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);

  // Lazy preview loading (uses LRU cache)
  const loadPreview = async (snippet: HeavyDutySnippet) => {
    try {
      const preview = await loadSnippetPreview(snippet);
      setCurrentPreview(preview);
    } catch (error) {
      const errorMessage = `Failed to load preview: ${error instanceof Error ? error.message : "Unknown error"}`;
      setCurrentPreview(errorMessage);
    }
  };

  // Initial data fetch
  const fetchData = async () => {
    try {
      const preferences = await getPreferenceValues();
      const path = preferences["folderPath"];
      const allPathsTmp = preferences["secondaryFolderPaths"]
        ? [path, ...preferences["secondaryFolderPaths"].split(",")]
        : [path];
      const allPaths = Array.from(new Set(allPathsTmp.map(expandHomeDirectory)));

      const snippetsPromises = allPaths.map(discoverAllSnippets);
      const snippetsArrays = await Promise.all(snippetsPromises);
      const heavyDutySnippets = snippetsArrays.flatMap(({ snippets }) => snippets);
      const errors = snippetsArrays.flatMap(({ errors }) => errors);

      // Extract folders from HeavyDutySnippet metadata
      const folders = Array.from(
        new Set(
          heavyDutySnippets.map((i) => {
            return i.folder;
          })
        )
      );

      // Sort by modification time (newest first)
      const orderedSnippets = heavyDutySnippets.sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime());

      setState((previous) => ({
        ...previous,
        heavyDutySnippets: orderedSnippets,
        filteredHeavyDutySnippets: orderedSnippets,
        folders: folders,
        paths: allPaths,
        errors: errors,
      }));
    } catch (err) {
      setState((previous) => ({
        ...previous,
        errors: [err instanceof Error ? err : new Error("Something went wrong")],
      }));
    }

    setState((previous) => ({ ...previous, isLoading: false }));
  };

  // Fetch primary action preference
  useEffect(() => {
    const fetch = async () => {
      const preferences = await getPreferenceValues();
      const primaryAction = preferences["primaryAction"];
      setState((previous) => ({ ...previous, primaryAction: primaryAction }));
    };
    fetch();
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Handle filter folder (HeavyDutySnippet version)
  useEffect(() => {
    if (state.selectedFilter && state.selectedFilter != "all") {
      if (state.heavyDutySnippets) {
        let filtered: HeavyDutySnippet[] = [];

        if (state.selectedFilter.startsWith("folder:")) {
          const filterValue = state.selectedFilter.substring("folder:".length);
          filtered = state.heavyDutySnippets.filter((snippet) => snippet.folder === filterValue);
        }
        // Note: Tag filtering not available in discovery mode
        // Tags would need to be loaded on-demand for full filtering

        setState((previous) => ({ ...previous, filteredHeavyDutySnippets: filtered }));
      }
    } else {
      setState((previous) => ({ ...previous, filteredHeavyDutySnippets: state.heavyDutySnippets }));
    }
  }, [state.selectedFilter, state.heavyDutySnippets]);

  if (state.errors && state.errors.length != 0) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Error loading snippets.",
      message: state.errors?.map((e) => e.message).join("\n"),
    };
    showToast(options);
  }

  const loadSnippetsView = state.filteredHeavyDutySnippets && state.filteredHeavyDutySnippets.length != 0;
  return (
    <List
      searchBarPlaceholder="Type to search snippets"
      isLoading={state.isLoading}
      isShowingDetail={loadSnippetsView}
      onSelectionChange={(id) => {
        if (id && state.filteredHeavyDutySnippets) {
          const snippet = state.filteredHeavyDutySnippets.find((s) => s.id === id);
          if (snippet) {
            loadPreview(snippet);
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
          {/* Tags not available in discovery mode - would need on-demand loading */}
        </List.Dropdown>
      }
    >
      {!loadSnippetsView && (
        <List.EmptyView
          icon={Icon.Snippets}
          title="No Snippets."
          description="Why not create a few?

            Visit https://www.raycast.com/astronight/snippetsurfer for examples."
          actions={
            <ActionPanel>
              <Action
                title="Reload Snippets"
                icon={Icon.RotateAntiClockwise}
                onAction={fetchData}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
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
              keywords={[i.folder, i.name]}
              icon={Icon.Document}
              detail={<SnippetPreview snippet={i} preview={currentPreview} />}
              actions={
                <HeavyDutyActionPanel
                  snippet={i}
                  primaryAction="copyAndPaste" // New primary action for copy+paste
                  reloadSnippets={fetchData}
                  paths={state.paths ?? []}
                />
              }
            ></List.Item>
          );
        })}
    </List>
  );
}

// Simple preview component for HeavyDutySnippet
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

  const content = preview || "Loading preview...";

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
