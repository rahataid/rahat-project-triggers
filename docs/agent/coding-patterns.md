# Coding patterns & architecture intent

Same purpose as the equivalent doc in the other 3 repos in this ecosystem: copy the referenced real file, don't improvise.

## 1. Pure Redis microservice (`apps/triggers`) — no HTTP here

Like `rahat-project-aa`, `apps/triggers` is `NestFactory.createMicroservice` only (`Transport.REDIS`), not a hybrid like `rahat-platform`. Every controller handler is `@MessagePattern({cmd: MS_TRIGGERS_JOBS.X.Y})` — cmd strings always come from the `MS_TRIGGERS_JOBS` constant (`src/constant/index.ts`), never an inline string literal. **Unlike `rahat-project-aa`, there's no `uuid` on the pattern** — see AGENT.md's `appId` section; don't add one by habit.

## 2. Authorization: `MicroserviceAuthGuard` + `@RequireAbility`

```ts
@Controller('phases')
@UseGuards(MicroserviceAuthGuard)
export class PhasesController {
  @MessagePattern({ cmd: MS_TRIGGERS_JOBS.PHASES.CREATE })
  @RequireAbility(ACTIONS.CREATE, SUBJECTS.PHASE)
  async create(payload: CreatePhaseDto) { ... }
}
```

Same `@rumsan/user` ability pattern as `rahat-project-aa` and `rahat-platform` — `ACTIONS`/`SUBJECTS` from `src/common/ability.constants.ts`. Not every handler carries `@RequireAbility` (e.g. plain `getAll`/`getOne` reads often don't) — follow the existing per-handler pattern in the controller you're editing rather than adding it everywhere uniformly.

## 3. DTOs per module, `class-validator`

`phases/dto/` — `CreatePhaseDto`, `UpdatePhaseDto`, `RevertPhaseDto`, `ConfigureThresholdPhaseDto`, `SetExtendedTriggerLogicDto`, `GetPhaseByLocationDto`, `GetPhaseByDetailDto`, etc — one DTO class per distinct operation shape, not one shared "generic payload" type. Mirror this granularity for new operations.

## 4. Environment-gated dev-only behavior, explicit not implicit

```ts
const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
if (isDevelopment) { ... }
throw new RpcException('Not allowed in production environment');
```

(`phases.controller.ts: activatePhase`.) When adding a dev-only shortcut (manual activation, test triggers, etc), gate it exactly this way — check `NODE_ENV` via `ConfigService`, throw `RpcException` in the else branch — rather than silently no-op'ing or relying on a feature flag.

## 5. Error shape

`RpcException` — same as the other repos. `AllExceptionsFilter` + `PrismaClientExceptionFilter` (`@lib/database`) are registered globally in every app's `main.ts` (`apps/triggers`, `apps/api`, `apps/forcast-api`) — don't catch-and-swallow Prisma errors locally when the global filter already normalizes them.

## 6. Multi-file Prisma schema

`packages/database/prisma/schema/*.prisma`, one file per domain concept (`activity.prisma`, `phase.prisma`, `source.prisma`, `trigger.prisma`, `setting.prisma`, `application.prisma`). A new concept gets its own file, not appended to an existing one. Same stale-migration risk as every other repo here — pull before schema changes.

## 7. Shared cmd strings — this repo is the *source*, not a consumer

Unlike `libs/sdk` in `rahat-platform` (which is the source of truth other repos import), **this repo's `MS_TRIGGERS_JOBS` constant is duplicated by hand** in `rahat-platform`'s `ms.trigger.action.ts` rather than imported from a shared package. If you rename or add a cmd here, grep `rahat-platform` for the matching constant and update it too — nothing enforces the pairing, same risk pattern as `action-dispatch.md` documents from the other side.

## Ignore `.cursor/rules/*.mdc` where it conflicts with observed reality

See AGENT.md's note — at least one `.mdc` file references MikroORM, which isn't used here (it's Prisma). Treat the `.mdc` files as unverified generic templates, not authoritative, when they contradict what's actually in the code.

## Related

- [AGENT.md](../../AGENT.md) — repo structure, module map.
- [integration.md](./integration.md) — full cmd catalog + all confirmed callers.

_Last updated: 2026-10-26_
