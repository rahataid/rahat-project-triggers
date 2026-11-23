# Integration — how the other 3 repos reach this one

Receiving-side counterpart to `rahat-platform`'s `docs/agent/action-dispatch.md` and `rahat-project-aa`'s `docs/agent/trigger-pipeline.md`. This doc is the one place that has all three callers confirmed in one spot.

## The three confirmed callers

1. **Frontend → core → here.** `rahat-ui`'s query hooks (`libs/query/src/lib/aa/trigger-statements/*.service.ts`) call `useProjectAction()` → `POST /v1/projects/actions` on `rahat-platform` → `ProjectService.handleProjectActions` → `msTriggerActions` map (`apps/rahat/src/projects/actions/ms.trigger.action.ts`) → `sendCommand({cmd: MS_TRIGGERS_JOBS.X.Y}, payload)` with `payload.appId` set from the project uuid, **no `uuid` on the cmd pattern itself**.
2. **`rahat-project-aa` directly**, bypassing core — confirmed in `payouts.service.ts` and `chain/chain-services/stellar-chain.service.ts`, both calling `this.client.send({cmd: 'ms.jobs.phases.getAll'}, {activeYear, riverBasin})` over the same shared Redis (via AA's `CORE_MODULE`-labeled client — the name is misleading, Redis `cmd` routing isn't service-scoped so it just reaches whichever process is listening).
3. **A dead/legacy path**: `rahat-platform` also has `aaActions.TRIGGERS.*` (`aa.action.ts`) pointed at `rahat-project-aa` with `aa.jobs.triggers.*` cmds — confirmed no listener exists for these anywhere in `rahat-project-aa`. Not a caller of this repo; mentioned only so it isn't mistaken for one.

## Cmd catalog (`MS_TRIGGERS_JOBS`, `apps/triggers/src/constant/index.ts`)

The full set this service's `@MessagePattern` handlers answer to (mirrors `rahat-platform`'s copy of the same constant in `ms.trigger.action.ts` — **if these two ever drift, that's a bug**, not a style choice; same "shared cmd string" risk documented in `rahat-platform`'s `coding-patterns.md`):

| Group | cmds |
|---|---|
| `TRIGGER` | `devOnly`, `getAll`, `getOne`, `add`, `update`, `updateTransaction`, `remove`, `activate`, `getByLocation` |
| `PHASES` | `create`, `getOne`, `getAll`, `getStats`, `addTriggers`, `revertPhase`, `getByLocation`, `activate`, `configureThreshold`, `configureExtendedLogic`, `getExtendedLogic`, `removeExtendedLogic`, `update`, `delete`, `getPhasePayoutStatus` |
| `REVERT_PHASE` | `create`, `getAll`, `getOne` |
| `RIVER_STATIONS` / `WATER_LEVELS` | `getDhm`, `getDhmSingleSeries`, `getGfh` (GLOFAS water-level variant currently commented out in the constant — check before assuming it's live) |
| `SOURCE` / `SOURCE_DATA` | `getAll`, `getHealth`, `getSeriesByDataSource` |
| `RAINFALL_LEVELS` / `TEMPERATURE` / `HUMIDITY` | `getDhm`, `getDhmSingleSeries`, `getGlofas` |
| `PROB_FLOOD` | `getAllGlofas`, `getOneGlofas` |
| `ACTIVITIES` | `getOne`, `getAll`, `listProjectSpecific`, `getHavingComms`, `add`, `bulkAdd`, `validateBulkAdd`, `remove`, `update`, `updateStatus`, plus `COMMUNICATION.*` sub-group |
| `LIBRARY` | `getActivityTemplates`, `getActivityTemplateById` |
| `CATEGORIES` | `getAll`, `add`, `remove` |
| `COMMUNICATIONS` | `create`, `getAll`, `getOne`, `update`, `remove`, `trigger` |
| `DAILY_MONITORING` | `add`, `getAll`, `getGaugeReading`, `getGaugeForecast`, `getOne`, `update`, `remove`, `delete` |
| `SETTINGS` / `VERSION` | `get` |

Each group's handlers live in the matching `apps/triggers/src/<group>/` module's controller (e.g. `PHASES.*` → `phases/phases.controller.ts`).

## `appId` — how multi-tenancy works here (different from the other 3 repos)

`rahat-project-aa` and `rahat-platform` scope by the Redis `cmd` pattern's `uuid` field (`PROJECT_ID`). This service does not — its `@MessagePattern`s have no `uuid` in the pattern at all. Instead, **`appId` is a payload field, and a real column/relation on this service's own data model** (`phases.service.ts`: `getAppIdByPhase`, `appId: activity?.app`). Each AA project is registered here as an "app" record; phases/activities/triggers link back to it via `appId`. When wiring a new caller, don't try to add `uuid` to the cmd pattern — pass the project's id as `appId` in the payload instead, matching every existing caller.

## Forecast source adapters

`packages/{dhm,gfh,glofas}-adapter` — one package per external forecast data provider (Nepal DHM, GFH, GLOFAS). `source/` and `sources-data/` modules in `apps/triggers` consume these; `apps/forcast-api` is a separate HTTP surface that may also consume them directly for ingestion (not yet deep-dived in this doc — check there if tracing a forecast-fetch issue that doesn't resolve inside `apps/triggers`).

_Last updated: 2026-10-26_
