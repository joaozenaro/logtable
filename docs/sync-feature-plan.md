# Remote Sync Feature — Plan & Roadmap

## Context

The app is a local-first timetracker. Users fill in time logs in a Handsontable grid, which are persisted to IndexedDB via Dexie. There is a skeleton `POST /api/sync` endpoint ported from a CLI that:

1. Receives logs
2. Resolves Jira work-item keys → numeric IDs (via Jira JQL search API)
3. Creates worklogs one-by-one on 7pace (no bulk API available)

### Current limitations

- The sync route has `logs: Log[] = []` — it never receives actual data
- 7pace hardcodes `startedAt` to 9:00 AM of server-startup time (module-level `const`)
- Jira base URL and 7pace URL are hardcoded
- No feedback to the UI — fire into the void
- No tracking of what has/hasn't been synced
- No concept of a "sync target" abstraction — it's tightly coupled to 7pace+Jira

### What we want (eventually)

Click **Sync** → confirmation dialog with a preview table → logs sync one-by-one with live status updates (via SSE) → per-row status tracked in Dexie so the user sees what's synced, what failed, and what's pending.

---

## Architecture at a glance

```
┌─────────────┐         ┌───────────────┐       ┌──────────────┐
│  Browser UI │  POST   │  /api/sync    │       │  7pace API   │
│  (React)    │────────►│  (Next.js)    │──────►│  (external)  │
│             │◄────────│               │       └──────────────┘
│  Dexie      │   SSE   │  resolves via │       ┌──────────────┐
│  (IndexedDB)│         │  Jira first   │──────►│  Jira API    │
└─────────────┘         └───────────────┘       └──────────────┘
```

---

## Version plan

### V1 — Fire-and-forget POST (bare minimum)

> **Goal**: Click sync → logs are sent to the server → server does its thing → toast says "sent" or "failed". User checks 7pace manually to verify.

#### Tasks

- [ ] **V1.1** — Wire the Sync button into `Grid.tsx`
  - Add a "Sync" `<Button>` next to "Copy as CSV" in the grid toolbar.
  - On click, gather non-blank rows for the current date from Handsontable.
  - POST them as JSON to `/api/sync`.
  - Show a toast: ✅ "Sync request sent" or ❌ "Sync failed: {message}".

- [ ] **V1.2** — Fix the sync route to accept a request body
  - Change `POST()` to read `await request.json()` for `{ date: string, logs: Log[] }`.
  - Fix the `startedAt` bug: compute `startedAt` from the provided `date` (e.g., date + "T09:00:00"), not from server boot time.
  - Return a proper JSON response: `{ synced: number, failed: number, errors: string[] }`.

- [ ] **V1.3** — Make API URLs/config driven by env
  - Extract hardcoded domain URLs into env vars: `JIRA_BASE_URL`, `SEVENPACE_BASE_URL`.
  - Update `.env.example`.

#### Not in V1
- No per-row tracking. No SSE. No Dexie sync status.
- If it fails, the user manually retries or goes to 7pace.

---

### V2 — Per-row sync status in Dexie

> **Goal**: Each row tracks whether it's been synced to remote. The UI shows which rows need syncing. Clicking Sync only sends un-synced rows.

#### Schema change

Add a `syncStatus` field to the `TimeRow` interface in Dexie:

```typescript
export interface TimeRow {
  id?: number;
  workItem: string;
  timeSpent: string;
  description: string;
  order: number;
  date: string;
  syncStatus: 'pending' | 'synced' | 'failed' | 'modified'; // NEW
  remoteId?: string;  // 7pace worklog ID, if synced
  lastSyncError?: string; // last error message
}
```

Dexie migration to version 2:

```typescript
this.version(2).stores({
  rows: '++id, order, date, syncStatus',
});
```

#### Tasks

- [ ] **V2.1** — Schema migration & status management
  - Add `syncStatus` to `TimeRow`. Default to `'pending'` for new rows.
  - When a row is edited after being synced, mark it `'modified'`.
  - Display a visual indicator in the grid (e.g., colored dot in the row header) for each status.

- [ ] **V2.2** — Sync only what's needed
  - When Sync is clicked, query Dexie for rows where `syncStatus IN ('pending', 'modified', 'failed')` for the current date.
  - Show a confirmation dialog / preview table: "These N rows will be synced".
  - POST only those rows.

- [ ] **V2.3** — Update status on response
  - The server response should return per-log results: `{ results: [{ logIndex, status, remoteId?, error? }] }`.
  - On success → update row in Dexie: `syncStatus = 'synced'`, store `remoteId`.
  - On failure → update row: `syncStatus = 'failed'`, store `lastSyncError`.
  - The UI refreshes reactively (Dexie + `useLiveQuery` or the existing `useDayRows` pattern).

- [ ] **V2.4** — Remote sync status badge
  - Extend or complement `SyncStatusBadge` with a second indicator for remote sync:
    - 🟢 All rows synced to remote
    - 🟡 Some rows pending
    - 🔴 Some rows failed
  - Keep the existing IndexedDB sync badge separate (local save status ≠ remote sync status).

#### Design decision: confirmation dialog

```
┌─────────────────────────────────────────────┐
│  Sync 4 rows for 2026-07-20?                │
│                                             │
│  Work Item  │ Time  │ Description │ Status  │
│  PROJ-123   │ 2h    │ Code review │ pending │
│  PROJ-456   │ 1h30m │ Bug fix     │ failed  │
│  PROJ-789   │ 3h    │ Feature     │ pending │
│  PROJ-101   │ 30m   │ Meeting     │ modified│
│                                             │
│                    [Cancel]  [Sync]          │
└─────────────────────────────────────────────┘
```

---

### V3 — SSE for live per-row updates

> **Goal**: When syncing, the server streams progress back to the client in real-time via Server-Sent Events. The UI updates each row's status as it processes.

#### Why SSE?

7pace doesn't have a bulk API, so the server processes logs sequentially. Instead of waiting for the entire batch to finish, we stream back each result as it happens. This gives the user a satisfying real-time progress experience.

#### Architecture

```
Browser                          Server
  │                                │
  │  POST /api/sync (logs)         │
  │───────────────────────────────►│
  │                                │── resolve Jira keys (batch)
  │  SSE: { type: "jira_resolved" }│
  │◄───────────────────────────────│
  │                                │── create worklog #1
  │  SSE: { type: "row_synced",   }│
  │◄──────── row: 0, status: ok ──│
  │                                │── create worklog #2
  │  SSE: { type: "row_failed",   }│
  │◄──────── row: 1, error: "..." ─│
  │                                │── create worklog #3
  │  SSE: { type: "row_synced",   }│
  │◄──────── row: 2, status: ok ──│
  │                                │
  │  SSE: { type: "done" }         │
  │◄───────────────────────────────│
  │  (stream closes)               │
```

#### SSE event types

```typescript
type SyncEvent =
  | { type: 'started'; total: number }
  | { type: 'jira_resolved'; resolved: number; missing: string[] }
  | { type: 'row_synced'; index: number; remoteId: string }
  | { type: 'row_failed'; index: number; error: string }
  | { type: 'done'; synced: number; failed: number };
```

#### Tasks

- [ ] **V3.1** — SSE endpoint
  - Change `/api/sync` POST to return a `ReadableStream` with `Content-Type: text/event-stream`.
  - Process logs sequentially, emitting events after each step.
  - Next.js App Router supports streaming responses via `new Response(stream)`.

- [ ] **V3.2** — Client-side SSE consumer
  - Create a `useSyncStream` hook that:
    1. POSTs logs to `/api/sync` using `fetch`.
    2. Reads the response body as a `ReadableStream`.
    3. Parses SSE events.
    4. Updates Dexie row statuses in real-time.
    5. Exposes a `syncProgress` state: `{ total, completed, failed, currentIndex, events[] }`.

- [ ] **V3.3** — Live sync progress UI
  - Replace the simple toast with a sync progress panel/modal:
    - Progress bar: `3/7 synced`
    - Per-row status updating live (checkmark, spinner, X)
    - Animated transitions as each row completes
  - The grid row indicators also update live as Dexie changes.

- [ ] **V3.4** — Error recovery UX
  - For failed rows, show the error message and a "Retry" button.
  - "Retry failed" button to re-sync only `syncStatus = 'failed'` rows.
  - Individual row retry via context menu or icon button.

---

### V4 — Provider abstraction (modularity)

> **Goal**: Decouple from 7pace+Jira. Support different sync targets through a provider interface.

#### Provider interface

```typescript
interface SyncProvider {
  name: string;

  /** Resolve work-item keys to provider-specific IDs */
  resolveWorkItems(keys: string[]): Promise<Map<string, string>>;

  /** Create a single worklog entry */
  createWorklog(entry: {
    workItemId: string;
    date: string;
    durationSeconds: number;
    comment: string;
  }): Promise<{ remoteId: string }>;
}
```

#### Tasks

- [ ] **V4.1** — Define the `SyncProvider` interface
  - Create `lib/sync/types.ts` with the interface.
  - Refactor 7pace+Jira into a `SevenPaceJiraProvider` that implements it.

- [ ] **V4.2** — Provider registry
  - Create `lib/sync/providers/index.ts` with a registry.
  - The active provider is selected by env var (`SYNC_PROVIDER=sevenpace-jira`).
  - The sync route calls the provider through the interface, not directly.

- [ ] **V4.3** — (Future) Additional providers
  - Examples: Toggl, Clockify, plain CSV export, Tempo for Jira, etc.
  - Each provider lives in `lib/sync/providers/{name}.ts`.

---

### V5 — Server-side persistence (optional complexity)

> **Goal**: Persist sync jobs in a server-side DB so they survive browser closure and can be retried independently.

This version only makes sense if we need:
- Sync jobs that run after the browser closes
- An audit trail of all syncs
- Multi-device sync status visibility

#### Possible approach

- Use SQLite (via `better-sqlite3` or Turso/libsql) or Prisma with any DB.
- Store a `sync_jobs` table: `{ id, date, logs JSON, status, created_at, completed_at }`.
- Store a `sync_results` table: `{ id, job_id, row_index, status, remote_id, error }`.
- The POST creates a job, returns the job ID, then processes in background.
- SSE or polling for progress.

#### When to reach for this

- ❌ Skip if the app is single-user, single-browser (current case).
- ✅ Consider if you want background sync, audit logs, or multi-device.

> **Recommendation**: For the current use case (single user, personal tool), V1–V3 with Dexie is more than enough. V5 adds operational complexity (DB migrations, hosting) for marginal benefit.

---

## Recommended implementation order

```
V1 (fire-and-forget)      ~2-3 hours    ← Start here
 └► V1.1  Sync button
 └► V1.2  Fix route to accept body
 └► V1.3  Env-driven config

V2 (Dexie sync status)    ~3-4 hours
 └► V2.1  Schema + status tracking
 └► V2.2  Selective sync + confirmation
 └► V2.3  Response handling
 └► V2.4  Remote sync badge

V3 (SSE live updates)     ~3-4 hours    ← The fun one
 └► V3.1  SSE endpoint
 └► V3.2  Client SSE consumer
 └► V3.3  Progress UI
 └► V3.4  Error recovery

V4 (provider abstraction)  ~2 hours     ← When needed
 └► V4.1  Interface
 └► V4.2  Registry + refactor
 └► V4.3  Additional providers

V5 (server-side DB)        ~4-6 hours   ← Probably never
```

---

## Open questions

1. **`startedAt` semantics** — Currently hardcoded to 9:00 AM. Should we:
   - (a) Use the date from the request + a fixed time (e.g., 09:00)?
   - (b) Let the user set a start time per day?
   - (c) Auto-distribute start times across logs (9:00, then 9:00+duration₁, etc.)?

2. **Custom fields** — The 7pace client fetches custom fields on every `createWorklog` call. Should we cache them per sync batch?

3. **Rate limiting** — Should we add a delay between 7pace API calls to avoid rate limits? (e.g., 200ms between each)

4. **What counts as "modified"?** — If a synced row is edited, should we re-sync it? 7pace might create a duplicate. We might need PUT/PATCH support (if the API supports it) or warn the user.

5. **Multi-day sync** — Should we support syncing multiple days at once, or always one day at a time?

---

## Dexie: answering "can Dexie help?"

**Yes, absolutely.** Dexie is already the local persistence layer. Adding `syncStatus` to the existing schema is the natural way to track what's been synced. Specifically:

- `useLiveQuery` can reactively show sync status in the UI without manual state management.
- The existing `useDayRows` pattern already handles Dexie reads/writes with debounce — we just extend it.
- No need for a server-side DB for V1–V3. Dexie is the source of truth for "what needs syncing".
- The only thing Dexie _can't_ do is sync in the background when the browser is closed — but that's a V5 concern.
