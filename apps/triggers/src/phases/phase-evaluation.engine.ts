import { Logger } from '@nestjs/common';
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

const logger = new Logger('PhaseEvaluationEngine');

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
    logger.debug(`Using cached evaluation for trigger ${logicKey}`);
    return cache.get(logicKey)!;
  }

  const state: TriggerState | undefined = triggersMap[logicKey];

  // Missing data → FALSE
  if (!state) {
    logger.warn(`Trigger ${logicKey} is missing from trigger map; treating as false`);
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
      logger.warn(
        `Trigger ${logicKey} is stale (age: ${age}ms, freshnessWindowMs: ${state.freshnessWindowMs}); treating as false`,
      );
      result = false;
    }
  }

  logger.debug(`Trigger ${logicKey} evaluated to ${result}`);
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
  logger.debug(
    `Evaluating mandatory triggers: count=${mandatoryTriggerKeys.length}`,
  );
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

  logger.debug(`Mandatory evaluation result=${allTrue}`);

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
  logger.debug(
    `Evaluating trigger group with operator=${group.operator}, triggerCount=${group.triggers.length}`,
  );
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

  logger.debug(
    `Group evaluation completed with operator=${group.operator}, result=${result}`,
  );

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
  logger.debug(
    `Evaluating extended logic: joinOperator=${config.joinOperator}, groupCount=${config.groups.length}`,
  );
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

  logger.debug(`Extended logic evaluation result=${result}`);

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
  logger.log(
    `Evaluating phase ${input.phaseId}: mandatoryCount=${input.mandatoryTriggerKeys.length}, triggerCount=${Object.keys(input.triggersMap).length}`,
  );
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

  logger.debug(
    `Phase ${input.phaseId} configuration: hasMandatory=${hasMandatory}, hasExtendedLogic=${hasExtendedLogic}`,
  );

  // Nothing configured → false (prevent accidental activation)
  if (!hasMandatory && !hasExtendedLogic) {
    logger.warn(
      `Phase ${input.phaseId} has no mandatory or extended logic configuration; final result=false`,
    );
    return {
      phaseId: input.phaseId,
      mandatory,
      extendedLogic: null,
      finalResult: false,
    };
  }

  // Short-circuit: if mandatory fails, skip extended logic
  if (hasMandatory && !mandatory.result) {
    logger.log(
      `Phase ${input.phaseId} mandatory evaluation failed; skipping extended logic`,
    );
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

  const finalResult = mandatory.result && extendedResult;
  logger.log(
    `Phase ${input.phaseId} evaluation completed: mandatory=${mandatory.result}, extended=${extendedResult}, final=${finalResult}`,
  );

  return {
    phaseId: input.phaseId,
    mandatory,
    extendedLogic,
    finalResult,
  };
}
