# Logtable

Local only, spreadsheet-like jira work log manager.

Next.js . Better Auth + Github OAuth . MUI . Dexie . Handsontable

## Constraints

Budget: $0

## Progress & Roadmap

- [x] Grid for time log management
- [x] Calendar day picker to filter time log entries
- [x] IndexedDB persistence with Dexie
- [x] Autocomplete suggestions for work item keys and descriptions
- [x] Synced status
- [x] Handsontable autocomplete
- [x] Support for multiple users
- [x] Remote Sync:
    - [x] V1: Basic POST endpoint and manual sync trigger
    - [x] V2: Per-row sync status tracking in Dexie
    - [x] V3: Server-Sent Events (SSE) for live feedback
    
## Jira + 7pace settings

| Setting        | Value                                 | Where to get it                                                    |
| -------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Jira Base URL  | https://\<companyname\>.atlassian.net | -                                                                  |
| Jira Token     | \<youremail\>:\<jiratoken\>           | Account settings > Security > API tokens                           |
| 7pace Base URL | https://timehubjra.7pace.com          | -                                                                  |
| 7pace Token    | \<token\>                             | (7Pace Settings > API Tokens)                                      |
| Assignee ID    | 000000:guid                           | (Open your jira profile and see the URL `...people/<thisid>?...`) |
