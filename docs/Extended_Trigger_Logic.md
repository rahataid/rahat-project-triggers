# Extended Trigger Logic

## Overview

The **Extended Trigger Logic** feature adds flexible AND/OR grouped evaluation to phase activation. Previously, phases used a simple counter-based model (N-of-M mandatory triggers + N-of-M optional triggers). With Extended Trigger Logic, phases can define arbitrary grouped boolean expressions over their triggers.

**Phase Activation Formula:**

```
Phase Activation = Mandatory Triggers (all TRUE) AND Extended Trigger Logic (if configured)
```

When `extendedTriggerLogic` is **not configured** (null), the system falls back to the legacy counter-based evaluation — no existing behavior changes.

---

## Key Concepts

### Logic Key

Each trigger can now carry a **`logicKey`** — a stable string identifier (e.g., `"dhm_water_level"`, `"glofas_flood_prob"`) used to reference the trigger inside the extended logic configuration. Unlike UUIDs, logic keys remain the same across phase reverts.

### Trigger Groups

Triggers are organized into **groups**. Each group has:
- An **operator** (`AND` or `OR`) applied to the triggers within the group
- A list of **trigger references** (by `logicKey`)

### Join Operator

Groups are combined using a top-level **`joinOperator`** (`AND` or `OR`).

### Evaluation Flow

```
┌─────────────────────────────────────────────────────┐
│                  Phase Evaluation                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Evaluate Mandatory Triggers (ALL must be TRUE)  │
│     └─ If any mandatory trigger is FALSE → STOP     │
│        Phase does NOT activate.                     │
│                                                     │
│  2. Evaluate Extended Logic (if configured)         │
│     ├─ Evaluate each Group with its operator        │
│     │   Group 1: (A AND B)  → true/false            │
│     │   Group 2: (C OR D)   → true/false            │
│     └─ Join group results with joinOperator         │
│        (Group 1) AND (Group 2) → final result       │
│                                                     │
│  3. Final Result = Mandatory AND Extended            │
│     (if no extended logic, Final = Mandatory only)  │
└─────────────────────────────────────────────────────┘
```

---

## Data Model Changes

Three new nullable columns were added (backward-compatible, no data migration needed):

| Model            | Column                  | Type          | Description                                |
|------------------|-------------------------|---------------|--------------------------------------------|
| **Phase**        | `extendedTriggerLogic`  | `Json? @db.JsonB` | The grouped logic configuration        |
| **Trigger**      | `logicKey`              | `String?`     | Stable identifier for logic references     |
| **TriggerHistory** | `logicKey`            | `String?`     | Preserved on revert for trigger recreation |

---

## Configuration Format

The `extendedTriggerLogic` JSON stored on a Phase follows this structure:

```typescript
interface ExtendedTriggerLogic {
  groups: TriggerGroup[];
  joinOperator: 'AND' | 'OR';
}

interface TriggerGroup {
  operator: 'AND' | 'OR';
  triggers: string[];   // logicKey references
}
```

### Examples

#### Example 1: OR-of-AND-groups

"Activate if (DHM water level AND DHM rainfall) OR (GLOFAS probability AND GFH discharge)"

```json
{
  "joinOperator": "OR",
  "groups": [
    {
      "operator": "AND",
      "triggers": ["dhm_water_level", "dhm_rainfall"]
    },
    {
      "operator": "AND",
      "triggers": ["glofas_flood_prob", "gfh_discharge"]
    }
  ]
}
```

#### Example 2: AND-of-OR-groups

"Activate if (DHM water level OR GLOFAS probability) AND (DHM rainfall OR GFH discharge)"

```json
{
  "joinOperator": "AND",
  "groups": [
    {
      "operator": "OR",
      "triggers": ["dhm_water_level", "glofas_flood_prob"]
    },
    {
      "operator": "OR",
      "triggers": ["dhm_rainfall", "gfh_discharge"]
    }
  ]
}
```

#### Example 3: Simple AND (all triggers must fire)

```json
{
  "joinOperator": "AND",
  "groups": [
    {
      "operator": "AND",
      "triggers": ["dhm_water_level", "glofas_flood_prob", "gfh_discharge"]
    }
  ]
}
```

#### Example 4: Simple OR (any trigger fires)

```json
{
  "joinOperator": "OR",
  "groups": [
    {
      "operator": "OR",
      "triggers": ["dhm_water_level", "glofas_flood_prob", "gfh_discharge"]
    }
  ]
}
```

---

## API Usage

### Creating a Phase with Extended Logic

```json
POST /phases
{
  "name": "Phase 1 - Early Warning",
  "riverBasin": "Bagmati",
  "extendedTriggerLogic": {
    "joinOperator": "OR",
    "groups": [
      { "operator": "AND", "triggers": ["dhm_water_level", "dhm_rainfall"] },
      { "operator": "AND", "triggers": ["glofas_flood_prob", "gfh_discharge"] }
    ]
  }
}
```

### Creating a Trigger with a Logic Key

```json
POST /triggers
{
  "phaseId": "...",
  "triggerStatement": { ... },
  "isMandatory": false,
  "logicKey": "dhm_water_level"
}
```

### Updating Extended Logic on a Phase

```json
PATCH /phases/:uuid
{
  "extendedTriggerLogic": {
    "joinOperator": "AND",
    "groups": [
      { "operator": "AND", "triggers": ["dhm_water_level", "glofas_flood_prob"] }
    ]
  }
}
```

Set to `null` to disable extended logic and return to counter-based evaluation:

```json
PATCH /phases/:uuid
{
  "extendedTriggerLogic": null
}
```

---

## Backward Compatibility

- **No extended logic configured (null):** The system uses the existing counter-based evaluation (`requiredMandatoryTriggers` / `requiredOptionalTriggers`). No behavior change.
- **Extended logic configured:** The new evaluation engine takes over. Mandatory triggers are still checked first (all must be TRUE), then the grouped logic is evaluated.
- **Revert flow:** When a phase is reverted, the `logicKey` on each trigger is preserved in `TriggerHistory` and restored when triggers are recreated.

---

## Evaluation Rules

| Scenario | Result |
|----------|--------|
| Missing trigger (logicKey not in map) | `FALSE` |
| Stale data (freshness window exceeded) | `FALSE` |
| Empty mandatory list | `TRUE` (no mandatory constraints) |
| Empty AND group (no triggers) | `TRUE` (vacuously true) |
| Empty OR group (no triggers) | `FALSE` |
| Empty groups array | `TRUE` (no extended constraints) |
| No mandatory AND no extended logic | `FALSE` (prevents accidental activation) |

---

## Freshness Validation (Hook)

The evaluation engine includes a reserved hook for future **data freshness validation**. Each trigger state can carry:

- `freshnessWindowMs` — maximum acceptable age of the data in milliseconds
- `dataTimestamp` — timestamp of the underlying data

If both are set and `Date.now() - dataTimestamp > freshnessWindowMs`, the trigger is treated as stale (`FALSE`). This interface is designed but not yet wired to the data pipeline — it can be plugged in without changing the evaluation logic.

---

## Audit Trail

Every phase evaluation produces a structured result object for logging and debugging:

```typescript
interface PhaseEvaluationResult {
  phaseId: string;
  mandatory: {
    triggerResults: Record<string, boolean>;  // logicKey → pass/fail
    result: boolean;
  };
  extendedLogic: {
    joinOperator: 'AND' | 'OR';
    groups: Array<{
      operator: 'AND' | 'OR';
      triggers: Record<string, boolean>;  // logicKey → pass/fail
      result: boolean;
    }>;
    result: boolean;
  } | null;
  finalResult: boolean;
}
```

This result is logged at each evaluation, providing full visibility into why a phase was or was not activated.

---

