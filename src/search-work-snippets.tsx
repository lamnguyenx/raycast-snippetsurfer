import SnippetSearch from "./shared/SnippetSearch";
import { getPreferenceValues } from "@raycast/api";

export default function Command() {
  const preferences = getPreferenceValues<{
    workFolderPath?: string;
    folderPath?: string;
    primaryAction?: string;
    searchIndexLines?: string;
    supportedExtensions: string;
  }>();

  // Fallback to primary folder if work folder not set
  const folderPath = preferences.workFolderPath || preferences.folderPath || "~";

  return (
    <SnippetSearch
      locationName="Work"
      folderPath={folderPath}
      primaryAction={preferences.primaryAction}
      searchIndexLines={parseInt(preferences.searchIndexLines || "3")}
      supportedExtensions={preferences.supportedExtensions}
    />
  );
}
