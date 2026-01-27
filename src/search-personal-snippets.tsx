import SnippetSearch from "./shared/SnippetSearch";
import { getPreferenceValues } from "@raycast/api";

export default function Command() {
  const preferences = getPreferenceValues<{
    otherFolderPath?: string;
    mainFolderPath?: string;
    primaryAction?: string;
    searchIndexLines?: string;
    supportedExtensions: string;
  }>();

  // Set default path for other snippets if not configured
  const mainFolderPath = preferences.otherFolderPath || "~/.snippets-other";

  return (
    <SnippetSearch
      locationName="Personal"
      mainFolderPath={mainFolderPath}
      primaryAction={preferences.primaryAction}
      searchIndexLines={parseInt(preferences.searchIndexLines || "3")}
      supportedExtensions={preferences.supportedExtensions}
    />
  );
}
