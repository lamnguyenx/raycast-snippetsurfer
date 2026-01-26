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
- Streamlined workflow for developers and content creators

## Getting Started

After installing this extension, configure it by following these steps:

1. Open Raycast and go to the extension settings
2. Select a **Primary Snippet Folder** - this can be any folder on your machine
3. Optionally, choose a **Secondary Snippet Folder** to load snippets from another location
4. Create your snippets by adding Markdown or YAML files to the selected folder(s)

**Note**: SnippetSurfer does not support creating snippets directly in Raycast. Use your preferred text editor to create and manage snippets.

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
