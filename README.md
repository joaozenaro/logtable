# Worklog Table

Work log management application built with a local-first, spreadsheet-like user experience.

## Constraints

- Total budget: $0
- Local-first design with fast, responsive UI
- Spreadsheet-like experience:
    - 90% of user interaction focused on fast editing, 10% on viewing
    - Moving individual or multiple rows together is seamless
- Keyboard-friendly navigation and custom shortcuts

## Tech Stack

- Core Framework: Next.js + React
- Authentication: Better Auth (with GitHub OAuth)
- Data Grid: Handsontable
- Local Database: Dexie (IndexedDB)
- UI Components: Material UI + MUI X Date Pickers

## Progress & Roadmap

- [x] Grid for time log management
- [x] Calendar day picker to filter time log entries
- [x] IndexedDB persistence with Dexie
- [x] Autocomplete suggestions for work item keys and descriptions
- [ ] Synced status checkbox
- [ ] Handsontable cell type for autocomplete
- [ ] Remote Sync:
    - [x] V1: Basic POST endpoint and manual sync trigger
    - [ ] V2: Per-row sync status tracking in Dexie and confirmation preview
    - [ ] V3: Server-Sent Events (SSE) for live, per-row synchronization feedback
- [ ] Support for multiple users
