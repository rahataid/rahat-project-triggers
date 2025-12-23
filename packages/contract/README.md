# Flood Data Aggregator & Trigger System

## Oracle Contract

- Use `registerSource` to add a new data source along with its JavaScript code.
- Each source is identified by a unique **source ID**, which is used to fetch data from that source.
- When `requestFloodData` is called with a source ID, the JS code runs via **Chainlink Functions**, and the result is stored on-chain with a **timestamp** and **hash** for reference.
- Generic and extensible: you can add new sources or new types of data at any time.

---

.

## Trigger Contract

- Use `registerTrigger` to create a new trigger with parameters such as:
  - `triggerType`, `phase`, `title`, `source`, `riverBasin`, `paramsHash`
  - Optional: `actionContract` that will be called when triggered

- Update triggers using:
  - `updateTrigger` → update phase or triggered status (backend-driven)
  - `setTriggered` → mark trigger as triggered and optionally pass `params` to the action contract

- Events are emitted on **registration, update, and execution** for off-chain monitoring.

---

## Action Contract Interface

- Generic interface `IAction` defines how any action is triggered by a Trigger contract.
- **Mandatory function**: `executeAction(triggerId, params)`
  - `triggerId` identifies which trigger caused the action
  - `params` is flexible `bytes` and can encode any data (e.g., array of addresses and amounts for disbursement)

- Optional helper functions can be implemented by the contract (e.g., `disburseFunds`, `sendNotifications`, `logAction`)
- Supports multiple types of actions, not just disbursements — any on-chain process triggered by flood events.

---

## Flow Summary

1. **Oracle** stores flood/rainfall data from multiple sources.
2. **Backend** listens to oracle events, calculates trigger conditions, and updates triggers.
3. When a trigger is set to `isTriggered = true`, the **Trigger contract optionally calls an action contract** with encoded params.
4. The **Action contract executes the intended process** (disbursement, notification, or anything else).
5. All actions and updates are tracked via **events** for transparency and off-chain automation.
