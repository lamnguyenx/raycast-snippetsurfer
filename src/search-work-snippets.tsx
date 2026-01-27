import SnippetSearch from "./shared/SnippetSearch";
import { getPreferenceValues } from "@raycast/api";

export default function Command() {
  const preferences = getPreferenceValues<{
    miniFolderPath?: string;
    mainFolderPath?: string;
    primaryAction?: string;
    searchIndexLines?: string;
    supportedExtensions: string;
  }>();

  // Set default path for mini snippets if not configured
  const mainFolderPath = preferences.miniFolderPath || "~/.snippets-mini";

  return (
    <SnippetSearch
      locationName="Mini"
      mainFolderPath={mainFolderPath}
      primaryAction={preferences.primaryAction}
      searchIndexLines={parseInt(preferences.searchIndexLines || "3")}
      supportedExtensions={preferences.supportedExtensions}
    />
  );
}
