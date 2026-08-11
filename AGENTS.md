<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Use Material UI as intended

Before implementing UI or application behavior:

1. Read the relevant documentation from:
    - `https://mui.com/material-ui/llms.txt`
2. Prefer existing Material UI components, hooks, utilities, providers, and patterns.
3. Configure and compose existing features instead of building custom implementations.
4. Follow Material UI's recommended APIs and conventions.

# General Engineering Guidelines

## Documentation first

Before implementing any feature or changing existing code:

- Read the relevant framework or library documentation.
- Prefer documented solutions over assumptions.
- If the documentation recommends a pattern, follow it.

## Make the smallest change possible

- Prefer minimal, targeted changes.
- Avoid unrelated refactors.
- Preserve existing architecture unless a change is necessary.
- Do not rename or reorganize files without a clear reason.

## Prefer features over custom code

Always ask:

> "Does the framework or library already provide this?"

Prefer:

- configuration over implementation
- composition over duplication
- built-in APIs over custom abstractions
- official extensions over third-party utilities
- existing project utilities over creating new ones

Avoid implementing functionality from scratch when an official solution already exists.

## Match the existing codebase

- Follow the project's existing patterns and conventions.
- Reuse existing components and utilities whenever possible.
- Keep changes consistent with surrounding code.

## When uncertain

If the documentation is ambiguous or multiple valid approaches exist:

- Choose the documented, idiomatic approach.
- Do not invent new patterns.
- Keep the implementation simple.
