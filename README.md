# SnippetSurfer

> **Summary**: SnippetSurfer is a Raycast extension for navigating text excerpts and code snippets from Markdown or YAML files, allowing quick copying to clipboard.

**Note**: This extension does not work with built-in [Raycast snippets](https://manual.raycast.com/snippets). It uses its own snippets that you have to set up and maintain.

## Features

- Quick navigation of text excerpts and code snippets through Raycast
- Filter snippets by folders, subfolders, and tags
- Support for both YAML and Markdown formats for easy organization
- YAML frontmatter support in Markdown files for adding titles and descriptions
- Automatic clipboard copying with smart content extraction
- Automatically copies only the content inside code blocks for code snippets
- Dynamic date/time tokens (e.g. `{{date:yyyy/MM/dd}}`) resolved at copy/paste/type time
- Interactive `{{ask:Label}}` parameters that prompt for values before a snippet is used
- Streamlined workflow for developers and content creators

## Getting Started

After installing this extension, configure it by following these steps:

1. Open Raycast and go to the extension settings
2. Select a **Primary Snippet Folder** - this can be any folder on your machine
3. Optionally, choose a **Secondary Snippet Folder** to load snippets from another location
4. Create your snippets by adding Markdown or YAML files to the selected folder(s)

**Note**: SnippetSurfer does not support creating snippets directly in Raycast. Use your preferred text editor to create and manage snippets.

## Dynamic Tokens (Dates & Times)

Snippet content can contain placeholders that are replaced with the **current date/time** when you copy, paste, or type the snippet. This is handy for dated notes, log entries, and paths:

```
nice, document what we have done into docs/plans/{{date:yyyy/MM/dd}}/{{date:yyyy-MM-dd}}-...md
```

would be inserted as:

```
nice, document what we have done into docs/plans/2026/10/11/2026-10-11-...md
```

### Tokens

| Token | Default output | Example |
| --- | --- | --- |
| `{{date}}` | `yyyy-MM-dd` | `2026-10-11` |
| `{{date:PATTERN}}` | — | `{{date:yyyy/MM/dd}}` → `2026/10/11` |
| `{{time}}` | `HH:mm:ss` | `14:07:03` |
| `{{time:PATTERN}}` | — | `{{time:HH:mm}}` → `14:07` |
| `{{datetime}}` | `yyyy-MM-dd HH:mm:ss` | `2026-10-11 14:07:03` |
| `{{datetime:PATTERN}}` | — | `{{datetime:yyyy-MM-dd'T'HH:mm}}` |
| `{{date:iso}}` | ISO 8601 (UTC) | `2026-10-11T14:07:03.000Z` |
| `{{date:unix}}` | Unix seconds | `1791529623` |
| `{{date:timestamp}}` | Unix milliseconds | `1791529623000` |

**Pattern symbols** (local time): `yyyy`, `yy`, `MM`, `M`, `MMM`, `MMMM`, `dd`, `d`, `HH`, `H`, `mm`, `m`, `ss`, `s`, `EEE`, `EEEE`, `a`.

### Behavior

- Tokens are resolved at the moment of the action, so they always reflect "now".
- All tokens within a single use share one timestamp, so a `date` and `datetime` never disagree.
- Unknown tokens (e.g. `{{foo}}`) are left untouched.
- Escape a token with a leading backslash to output it literally: `\{{date}}` → `{{date}}`.
- Works for **Copy to Clipboard**, **Paste to Active App**, and **Type to Active App** (`Copy Real File Path` does not expand).
- Can be disabled in the extension settings via the **Dynamic Tokens** preference.

📖 Full reference: [`docs/important/snippet-tokens.md`](docs/important/snippet-tokens.md).

## Interactive Parameters

Snippets can also ask for input when you use them. Add an `{{ask:Label}}` token, and selecting the snippet (with any content action) opens a small form with one field per unique label before the snippet is expanded:

```
Deploy {{ask:Service}} to {{ask:Environment=staging}} on {{date:yyyy-MM-dd}}
```

would prompt for `Service` and `Environment`, then insert e.g.:

```
Deploy checkout to staging on 2026-10-11
```

### Tokens

| Token | Behavior |
| --- | --- |
| `{{ask:Label}}` | Prompt for a single-line text value; the field is titled `Label`. |
| `{{ask:Label=Default}}` | Same, but the field is prefilled with `Default`. |

### Behavior

- One field per **unique** label; a label used multiple times reuses the same value (acts like a variable).
- Prompt values are combined with date/time tokens in the same single expansion.
- Fields are single-line text. Values are not remembered between uses.
- Escape with a leading backslash to output a token literally: `\{{ask:X}}` → `{{ask:X}}`.

## Documentation

- [Snippet Tokens & Parameters](docs/important/snippet-tokens.md) — full token reference.
- [Parameterized Snippets plan](docs/plans/2026/10/11/2026-10-11-parameterized-clipboards.md) — design and lessons learnt.

## Development Setup

### Prerequisites

- Node.js (v16 or later)
- npm
- Raycast app installed

### Installation Steps

1. **Clone the repository** (or download the source code)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```
   This creates a `dist/` folder with the compiled extension.

4. **Install permanently in Raycast**

   There are two methods to install the extension locally:

   **Method 1: Using Raycast CLI (Recommended)**
   ```bash
   # Install Raycast CLI globally (if not already installed)
   npm install -g @raycast/api

   # Navigate to your extension directory
   cd /path/to/snippetsurfer

   # Link the extension to Raycast for development
   npx ray develop
   ```

   **Method 2: Manual Import**
   1. Open Raycast (⌘ + Space)
   2. Go to Extensions (⌘ + ,)
   3. Click the "+" button or search for "Import Extension"
   4. Select your project's **root directory** (not the `dist/` folder)
   5. Raycast will automatically detect and install the extension

   **Important**: For permanent installation with automatic reloading, always point Raycast to the project root directory. Raycast will watch for changes and reload when you rebuild.

### Development Workflow

**Development Mode with Hot Reloading**
```bash
npm run dev
```

This enables automatic reloading when you make changes to the code.

### Available Commands

- `npm run build` - Build the extension for production
- `npm run dev` - Start development mode with hot reloading
- `npm run lint` - Check code style and potential errors
- `npm run fix-lint` - Automatically fix linting issues

## Troubleshooting

- **Extension not appearing in Raycast**: Ensure you've pointed Raycast to the project root directory, not the `dist/` folder
- **Changes not reflecting**: Run `npm run build` and restart Raycast
- **Snippets not loading**: Verify that your snippet folder paths are correctly configured in the extension settings
- **Build errors**: Make sure all dependencies are installed with `npm install`

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
