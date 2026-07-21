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

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
BETTER_AUTH_SECRET="your_secret_here"
BETTER_AUTH_URL="http://localhost:3000"
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
GITHUB_ALLOWED_USERNAME="your_github_username"
WORK_ITEM_URL="https://your-domain.atlassian.net/browse/{key}"
SEVENPACE_TOKEN="your_7pace_token"
JIRA_TOKEN="email:your_jira_token"
ASSIGNEE_ID="your_assignee_id"
JIRA_BASE_URL="https://your-domain.atlassian.net"
SEVENPACE_BASE_URL="https://your-domain.7pace.com"
```

## Progress & Roadmap

- [x] Grid for time log management
- [x] Calendar day picker to filter time log entries
- [x] IndexedDB persistence with Dexie
- [x] Autocomplete suggestions for work item keys and descriptions
- [ ] Remote Sync:
    - [x] V1: Basic POST endpoint and manual sync trigger
    - [ ] V2: Per-row sync status tracking in Dexie and confirmation preview
    - [ ] V3: Server-Sent Events (SSE) for live, per-row synchronization feedback
- [ ] Support for multiple users