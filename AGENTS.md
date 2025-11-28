# Agent Guidelines for Raycast SnippetSurfer Extension

## Build/Lint/Test Commands

- **Build**: `npm run build` (ray build -e dist)
- **Lint**: `npm run lint` (ray lint)
- **Fix Lint**: `npm run fix-lint` (ray lint --fix)
- **Dev**: `npm run dev` (ray develop)
- **No test framework configured** - run lint after changes

## Code Style Guidelines

### TypeScript Configuration

- Strict mode enabled
- Target ES2021, CommonJS modules
- React JSX syntax
- Isolated modules, esModuleInterop enabled

### Linting & Formatting

- ESLint with TypeScript recommended rules + Prettier integration
- Prettier: 120 char width, double quotes
- Run `npm run fix-lint` before commits

### Import Organization

```typescript
// External libraries (@raycast/api first)
import { Icon, List } from "@raycast/api";
// React imports
import { useEffect, useState } from "react";
// Local types
import type { Snippet } from "./types";
// Components
import SnippetContent from "./components/SnippetContent";
// Utils
import { loadSnippets } from "./utils/SnippetsLoader";
```

### Naming Conventions

- **Variables/Functions**: camelCase (`handleAction`, `fetchData`)
- **Components**: PascalCase (`CustomActionPanel`, `SnippetContent`)
- **Types**: PascalCase (`Snippet`, `State`)
- **Files**: kebab-case for components/utils (`snippets-loader.tsx`)

### Error Handling

- Use try/catch with proper Error objects
- Convert unknown errors: `err instanceof Error ? err : new Error("message")`
- Show user-friendly error messages via Raycast Toast API

### Async Patterns

- Prefer async/await over Promises
- Use Promise.all() for concurrent operations
- Handle async operations in useEffect hooks

### React Patterns

- Functional components with hooks
- Props destructuring with TypeScript interfaces
- Conditional rendering with `&&` operator
- Key props for mapped elements</content>
  <parameter name="filePath">/Users/lamnt45/git/raycast-snippetsurfer/AGENTS.md
