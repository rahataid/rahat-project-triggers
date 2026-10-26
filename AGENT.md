# rahat-project-triggers

This is the **actual implementation of the anticipatory-action trigger/phase/forecast pipeline** — not `rahat-project-aa` (which only has unimplemented stubs for this — see its `docs/agent/trigger-pipeline.md`) and not `rahat-platform`/core (which only dispatches to this service — see its `docs/agent/action-dispatch.md`). If you're asked "how do triggers/phases/forecast actually work," the answer is here.

Stack: NestJS, Prisma/PostgreSQL, Redis. **Turborepo + pnpm workspaces** (not Nx, unlike the other three repos in this ecosystem) — package name is literally `triggers`.

## Three callers of this service, confirmed by tracing all three repos

1. **Frontend (rahat-ui)** → core (`rahat-platform`'s `POST /v1/projects/actions`) → `msTriggerActions` (`apps/rahat/src/projects/actions/ms.trigger.action.ts`) → this service, cmd strings `ms.jobs.*` with **no `uuid` routing** — scoped instead by an `appId` field inside the payload (each AA project registers as an "app" record here — see `phases.service.ts`'s `appId`/`appIds` handling).
2. **`rahat-project-aa` calls this service directly**, bypassing core — e.g. `payouts.service.ts` and `chain/chain-services/stellar-chain.service.ts` both do `this.client.send({cmd: 'ms.jobs.phases.getAll'}, {activeYear, riverBasin})` over the shared Redis.
3. **Core itself** also has a dead, parallel `aaActions.TRIGGERS.*` path pointed at `rahat-project-aa` instead of here (`aa.jobs.triggers.*` cmds) — that one has no listener anywhere and is legacy/unused. Don't confuse it with the real `ms.jobs.*` path into this repo.

## Repo structure (Turborepo)

```
apps/
  triggers/      # the Redis microservice — this is what the above 3 callers actually reach
  api/            # separate small HTTP app, its own `triggers/` module (public/dashboard-facing reads — distinct surface from the microservice, not yet deep-dived)
  forcast-api/    # separate HTTP app for forecast data ingestion (name has the repo's own "forcast" typo — keep it when referencing the app)
packages/
  database/       # @lib/database — Prisma schema (split: activity/phase/source/setting/trigger/application.prisma), seeds, PrismaModule
  core/           # @lib/core — shared core utilities
  contracts/      # trigger-related contracts package (check before assuming it duplicates rahat-platform's/rahat-project-aa's contracts)
  dhm-adapter/    # @lib/dhm-adapter — Nepal DHM (Dept. of Hydrology & Meteorology) forecast source adapter
  gfh-adapter/    # @lib/gfh-adapter — GFH (Global Flood Hub?) adapter
  glofas-adapter/ # @lib/glofas-adapter — GloFAS (Global Flood Awareness System) adapter
  eslint-config/, typescript-config/  # shared tooling config
```

### `apps/triggers/src` — module map (the microservice)

| Folder | Purpose |
|---|---|
| `trigger/` | Trigger CRUD — `MS_TRIGGERS_JOBS.TRIGGER.*` cmds |
| `trigger-history/` | Trigger activation history |
| `phases/` | Anticipatory-action phases (readiness/activation/response) — `MS_TRIGGERS_JOBS.PHASES.*`; `addTriggers`/`activatePhase`/`revertPhase`/`configureThreshold` live here. `appId` on payloads ties a phase/activity back to a specific AA project. |
| `source/` | Forecast data sources (DHM/GFH/GloFAS registration, health) |
| `sources-data/` | Forecast series data — river stations, water levels, rainfall, temperature, humidity, prob-flood/GloFAS |
| `activity/` | AA activities (plan/track) tied to phases |
| `category/` | Activity categories |
| `daily-monitoring/` | Daily gauge reading/forecast monitoring |
| `comms/` | Communication/notification triggering tied to activities |
| `library/` | Activity templates |
| `stats/` | Stats |
| `sse/` | Server-sent events |
| `auth/` | Auth wiring |
| `processors/` | Queue processors |
| `listeners/` | Event listeners |
| `common/` | `ability.constants.ts` (`ACTIONS`/`SUBJECTS`, same `@rumsan/user` ability pattern as the other repos) |
| `constant/` | `MS_TRIGGERS_JOBS` — the cmd-string catalog consumed (as a copy — see `libs/sdk`'s `ms.trigger.action.ts` in `rahat-platform`) by callers |

## Prisma / database

- Schema lives in `packages/database/prisma/schema/` split across **multiple files** (`activity.prisma`, `phase.prisma`, `source.prisma`, `setting.prisma`, `trigger.prisma`, `application.prisma`, `mock.prisma`), not one `schema.prisma`.
- Seeds in `packages/database/prisma/seeds/` — one per concern (`seed-nrcs-heatwave.ts`, `seed-datasource-config.ts`, `seed-gfh-config.ts`, `seed-nrcs-datasource.ts`, `seed-mock-datasource.ts`, etc).
- Same stale-migration risk as the other three repos: **pull latest default branch before any schema change.**

## A note on `.cursor/rules/`

This repo already has `.cursor/rules/*.mdc` files (naming conventions, module structure, etc). They're worth reading, but at least one (`nestjs-module-structure-guidelines.mdc`) references **MikroORM**, which this repo does not use — it's Prisma. Treat these rules as generic boilerplate that was added but not fully tailored to this codebase, not as verified fact. Prefer directly-observed patterns (Prisma, `@MessagePattern`, `MicroserviceAuthGuard` + `@RequireAbility`) documented here and in [coding-patterns.md](./docs/agent/coding-patterns.md) over the `.mdc` files where they conflict.

## Docs (`docs/agent/`)

| Doc | Covers |
|---|---|
| [coding-patterns.md](./docs/agent/coding-patterns.md) | Architecture intent + canonical examples for this repo |
| [integration.md](./docs/agent/integration.md) | Full cmd catalog (`MS_TRIGGERS_JOBS`) and all three confirmed callers, cross-referenced to the other repos |

## Keeping docs in sync

Same convention as the other three repos in this ecosystem: update the relevant `docs/agent/*.md` when the implementation changes, bump `_Last updated: YYYY-MM-DD_` for functional changes.
