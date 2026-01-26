import SnippetSearch from "./shared/SnippetSearch";
import { getPreferenceValues } from "@raycast/api";

export default function Command() {
  const preferences = getPreferenceValues<{
    personalFolderPath?: string;
    folderPath?: string;
    primaryAction?: string;
    searchIndexLines?: string;
    supportedExtensions: string;
  }>();

  // Fallback to primary folder if personal folder not set
  const folderPath = preferences.personalFolderPath || preferences.folderPath || "~";

  return (
    <SnippetSearch
      locationName="Personal"
      folderPath={folderPath}
      primaryAction={preferences.primaryAction}
      searchIndexLines={parseInt(preferences.searchIndexLines || "3")}
      supportedExtensions={preferences.supportedExtensions}
    />
  );
}
