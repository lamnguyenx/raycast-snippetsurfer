export interface SnippetContent {
  title: string?;
  description: string?;
  tags: string[];
  content: string;
  rawMetadata: string;
}

export interface Snippet {
  id: string;
  name: string;
  folder: string;
  content: SnippetContent;
}

// HeavyDutySnippet: Memory-efficient lazy-loading snippet structure
export interface HeavyDutySnippet {
  id: string; // MD5 hash of fullPath
  name: string; // filename without extension
  folder: string; // relative path from scan root
  fullPath: string; // absolute path for lazy loading
  fileSize: number; // bytes, for UI indicators and limits
  modifiedTime: Date; // for sorting and change detection
}

export interface State {
  snippets?: Snippet[];
  filteredSnippets?: Snippet[];
  folders?: string[];
  tags?: string[];
  errors?: Error[];
  isLoading: boolean;
  selectedFilter?: string;
  primaryAction?: string;
  paths?: string[];
  // HeavyDutySnippet support
  heavyDutySnippets?: HeavyDutySnippet[];
  filteredHeavyDutySnippets?: HeavyDutySnippet[];
}
