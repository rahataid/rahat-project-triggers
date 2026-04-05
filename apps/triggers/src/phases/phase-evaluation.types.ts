/**
 * Extended Trigger Logic — Type Definitions
 *
 * Supports one level of grouping: each group has its own operator (AND/OR),
 * and groups are joined by a top-level joinOperator (AND/OR).
 *
 * Examples:
 *   OR-of-AND-groups:  (A AND B) OR (C AND D)
 *   AND-of-OR-groups:  (A OR B) AND (C OR D)
 *   Mixed:             (A AND B) AND (C OR D)
 */

// ── Config types (stored in Phase.extendedTriggerLogic JSONB) ──

export type LogicOperator = 'AND' | 'OR';

export interface TriggerGroup {
  /** Operator applied within this group's triggers */
  operator: LogicOperator;
  /** logicKey references to triggers belonging to this group */
  triggers: string[];
}

export interface ExtendedTriggerLogic {
  /** Groups of triggers, each evaluated with its own operator */
  groups: TriggerGroup[];
  /** Operator used to combine group results */
  joinOperator: LogicOperator;
}

// ── Trigger state map (built from DB at evaluation time) ──

export interface TriggerState {
  isTriggered: boolean;
  triggeredAt?: Date | null;
  /**
   * Hook for future freshness validation.
   * If set, the trigger is considered stale (and thus FALSE) when
   * `Date.now() - dataTimestamp > freshnessWindowMs`.
   * Implementation deferred — field reserved for clean plug-in.
   */
  freshnessWindowMs?: number;
  dataTimestamp?: Date | null;
}

export type TriggersMap = Record<string, TriggerState>;

// ── Evaluation input ──

export interface PhaseEvaluationInput {
  phaseId: string;
  /** logicKeys of mandatory triggers for this phase */
  mandatoryTriggerKeys: string[];
  /** Extended logic config, or null/undefined if not configured */
  extendedTriggerLogic?: ExtendedTriggerLogic | null;
  /** Map of logicKey → trigger state, built from all phase triggers */
  triggersMap: TriggersMap;
}

// ── Evaluation result types ──

export interface MandatoryEvaluationResult {
  triggerResults: Record<string, boolean>;
  result: boolean;
}

export interface GroupEvaluationResult {
  operator: LogicOperator;
  triggers: Record<string, boolean>;
  result: boolean;
}

export interface ExtendedLogicEvaluationResult {
  joinOperator: LogicOperator;
  groups: GroupEvaluationResult[];
  result: boolean;
}

export interface PhaseEvaluationResult {
  phaseId: string;
  mandatory: MandatoryEvaluationResult;
  extendedLogic: ExtendedLogicEvaluationResult | null;
  finalResult: boolean;
}
