import SnippetSearch from "./shared/SnippetSearch";
import { getPreferenceValues } from "@raycast/api";

export default function Command() {
  const preferences = getPreferenceValues<{
    mainFolderPath: string;
    primaryAction?: string;
    searchIndexLines?: string;
    supportedExtensions: string;
  }>();

  return (
    <SnippetSearch
      locationName="Primary"
      mainFolderPath={preferences.mainFolderPath}
      primaryAction={preferences.primaryAction}
      searchIndexLines={parseInt(preferences.searchIndexLines || "3")}
      supportedExtensions={preferences.supportedExtensions}
    />
  );
}
