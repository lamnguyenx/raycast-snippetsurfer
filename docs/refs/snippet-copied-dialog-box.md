# Snippet Copied Dialog Box Implementation

## Overview

When a user copies a snippet using the HeavyDutyActionPanel, a native macOS dialog box is displayed to confirm the action. This provides better user feedback than the standard Raycast toast notification.

## Implementation Details

### Location

- File: `/src/components/CustomActionPanel.tsx`
- Function: `copyAndPaste()` (lines 108-199)
- Also used in `copyFilePath` action (lines 223-268)

### Technical Implementation

#### macOS Dialog (Primary)

```typescript
// Use macOS dialog that auto-dismisses after 2 seconds
const dialogScript = `display dialog "📄 ${snippet.name}\nFile: ${snippet.fullPath}" \
  with title "Snippet Copied!" \
  buttons {"OK (auto close in 2s)"} \
  default button "OK (auto close in 2s)" \
  giving up after 2`;

const dialogProcess = spawn("osascript", ["-e", dialogScript]);
```

**Key Features:**

- Uses `osascript` to execute AppleScript
- Displays snippet name and full file path
- Includes emoji (📄) for visual clarity
- Auto-closes after 2 seconds (specified by `giving up after 2`)
- Non-blocking execution (runs in background)

#### Error Handling

If the macOS dialog fails:

```typescript
dialogProcess.on("error", (error) => {
  // Fallback to Raycast toast if dialog fails
  showToast({
    style: Toast.Style.Success,
    title: "Snippet Copied!",
    message: `${snippet.name} - Press Cmd+V to paste`,
  });
});
```

#### Non-macOS Fallback

For other platforms:

```typescript
// Non-macOS platforms use Raycast toast
showToast({
  style: Toast.Style.Success,
  title: "Snippet Copied!",
  message: `${snippet.name} - Press Cmd+V to paste`,
});
```

#### Error Dialog

If copy operation fails:

```typescript
const errorDialogScript = `display dialog "${error instanceof Error ? error.message : "Unknown error"}" \
  with title "Snippet Copy Failed" \
  buttons {"OK (auto close in 4s)"} \
  default button "OK (auto close in 4s)" \
  giving up after 4`;
```

### Sequence Flow

1. Copy content to clipboard using shell commands
2. Show success notification:
   - Try macOS dialog (auto-close in 2s)
   - Fallback to Raycast toast if failed
3. Brief pause (100ms) to ensure notification appears
4. Close Raycast main window
5. If error occurs during copy:
   - Show error dialog (auto-close in 4s)
   - Fallback to Raycast error toast

### Commands Used

- **macOS**: `pbcopy` for copying to clipboard
- **Linux**: `xclip -selection clipboard` for copying to clipboard
- **AppleScript**: `osascript -e` for native dialogs

## Design Decisions

### Why Use macOS Dialog Instead of Toast?

- More native and visible than Raycast toast
- Auto-dismisses automatically
- Shows more detailed information (file path)
- Provides better user feedback for successful operations

### Why 2 Seconds Delay?

- Enough time for user to see the confirmation
- Not too long to be annoying
- Standard UX pattern for auto-closing dialogs

### Why Platform-Specific?

- macOS has built-in support for native dialogs via AppleScript
- Other platforms rely on clipboard commands and Raycast's built-in toast system
- Maintains consistency across platforms while using best available option

## Future Enhancements

- Add customization option in settings to toggle between dialog and toast
- Support for custom message templates
- Option to disable auto-close
- Better error messages with troubleshooting steps
