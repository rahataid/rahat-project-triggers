import type {
  ExtendedTriggerLogic,
  TriggersMap,
  TriggerGroup,
  TriggerState,
  MandatoryEvaluationResult,
  GroupEvaluationResult,
  ExtendedLogicEvaluationResult,
  PhaseEvaluationInput,
  PhaseEvaluationResult,
} from './phase-evaluation.types';

/**
 * Resolve a single trigger's boolean value from the map.
 * Missing triggers are treated as FALSE (safe default).
 * Stale data (freshnessWindowMs exceeded) is treated as FALSE.
 */
export function evaluateTrigger(
  logicKey: string,
  triggersMap: TriggersMap,
  cache?: Map<string, boolean>,
): boolean {
  // Reuse cached result for shared triggers across groups
  if (cache?.has(logicKey)) {
    return cache.get(logicKey)!;
  }

  const state: TriggerState | undefined = triggersMap[logicKey];

  // Missing data → FALSE
  if (!state) {
    cache?.set(logicKey, false);
    return false;
  }

  let result = state.isTriggered;

  // Freshness hook: if both freshnessWindowMs and dataTimestamp are set,
  // treat stale data as FALSE
  if (
    result &&
    state.freshnessWindowMs != null &&
    state.dataTimestamp != null
  ) {
    const age = Date.now() - new Date(state.dataTimestamp).getTime();
    if (age > state.freshnessWindowMs) {
      result = false;
    }
  }

  cache?.set(logicKey, result);
  return result;
}

/**
 * Evaluate mandatory triggers — ALL must be TRUE.
 * If mandatoryTriggerKeys is empty, result is TRUE (no mandatory constraints).
 */
export function evaluateMandatoryTriggers(
  mandatoryTriggerKeys: string[],
  triggersMap: TriggersMap,
  cache?: Map<string, boolean>,
): MandatoryEvaluationResult {
  const triggerResults: Record<string, boolean> = {};

  if (mandatoryTriggerKeys.length === 0) {
    return { triggerResults, result: true };
  }

  let allTrue = true;
  for (const key of mandatoryTriggerKeys) {
    const val = evaluateTrigger(key, triggersMap, cache);
    triggerResults[key] = val;
    if (!val) allTrue = false;
  }

  return { triggerResults, result: allTrue };
}

/**
 * Evaluate a single group using its operator (AND or OR).
 */
export function evaluateGroup(
  group: TriggerGroup,
  triggersMap: TriggersMap,
  cache?: Map<string, boolean>,
): GroupEvaluationResult {
  const triggers: Record<string, boolean> = {};

  for (const key of group.triggers) {
    triggers[key] = evaluateTrigger(key, triggersMap, cache);
  }

  let result: boolean;
  if (group.triggers.length === 0) {
    // Empty group — vacuously true for AND, false for OR
    result = group.operator === 'AND';
  } else if (group.operator === 'AND') {
    result = Object.values(triggers).every(Boolean);
  } else {
    result = Object.values(triggers).some(Boolean);
  }

  return { operator: group.operator, triggers, result };
}

/**
 * Evaluate the full extended logic config: groups joined by joinOperator.
 */
export function evaluateExtendedLogic(
  config: ExtendedTriggerLogic,
  triggersMap: TriggersMap,
  cache?: Map<string, boolean>,
): ExtendedLogicEvaluationResult {
  const groups: GroupEvaluationResult[] = config.groups.map((g) =>
    evaluateGroup(g, triggersMap, cache),
  );

  let result: boolean;
  if (groups.length === 0) {
    // No groups configured — treat as true (no extended constraints)
    result = true;
  } else if (config.joinOperator === 'AND') {
    result = groups.every((g) => g.result);
  } else {
    result = groups.some((g) => g.result);
  }

  return { joinOperator: config.joinOperator, groups, result };
}

/**
 * Top-level phase evaluation.
 *
 * FINAL = MANDATORY_RESULT AND EXTENDED_LOGIC_RESULT (if configured)
 *
 * If no mandatory triggers and no extended logic, returns false
 * (same as legacy behavior — at least something must be configured).
 */
export function evaluatePhase(
  input: PhaseEvaluationInput,
): PhaseEvaluationResult {
  const cache = new Map<string, boolean>();

  const mandatory = evaluateMandatoryTriggers(
    input.mandatoryTriggerKeys,
    input.triggersMap,
    cache,
  );

  const hasExtendedLogic =
    input.extendedTriggerLogic != null &&
    input.extendedTriggerLogic.groups?.length > 0;

  const hasMandatory = input.mandatoryTriggerKeys.length > 0;

  // Nothing configured → false (prevent accidental activation)
  if (!hasMandatory && !hasExtendedLogic) {
    return {
      phaseId: input.phaseId,
      mandatory,
      extendedLogic: null,
      finalResult: false,
    };
  }

  // Short-circuit: if mandatory fails, skip extended logic
  if (hasMandatory && !mandatory.result) {
    return {
      phaseId: input.phaseId,
      mandatory,
      extendedLogic: null,
      finalResult: false,
    };
  }

  let extendedLogic: ExtendedLogicEvaluationResult | null = null;
  let extendedResult = true;

  if (hasExtendedLogic) {
    extendedLogic = evaluateExtendedLogic(
      input.extendedTriggerLogic!,
      input.triggersMap,
      cache,
    );
    extendedResult = extendedLogic.result;
  }

  return {
    phaseId: input.phaseId,
    mandatory,
    extendedLogic,
    finalResult: mandatory.result && extendedResult,
  };
}
