import {
  evaluateTrigger,
  evaluateMandatoryTriggers,
  evaluateGroup,
  evaluateExtendedLogic,
  evaluatePhase,
} from '../phase-evaluation.engine';
import type {
  TriggersMap,
  ExtendedTriggerLogic,
  PhaseEvaluationInput,
  TriggerGroup,
} from '../phase-evaluation.types';

describe('Phase Evaluation Engine', () => {
  // ── evaluateTrigger ──

  describe('evaluateTrigger', () => {
    it('returns true when trigger is triggered', () => {
      const map: TriggersMap = { t1: { isTriggered: true } };
      expect(evaluateTrigger('t1', map)).toBe(true);
    });

    it('returns false when trigger is not triggered', () => {
      const map: TriggersMap = { t1: { isTriggered: false } };
      expect(evaluateTrigger('t1', map)).toBe(false);
    });

    it('returns false when trigger is missing (not in map)', () => {
      const map: TriggersMap = {};
      expect(evaluateTrigger('missing', map)).toBe(false);
    });

    it('returns false when data is stale (freshness exceeded)', () => {
      const map: TriggersMap = {
        t1: {
          isTriggered: true,
          freshnessWindowMs: 1000,
          dataTimestamp: new Date(Date.now() - 5000),
        },
      };
      expect(evaluateTrigger('t1', map)).toBe(false);
    });

    it('returns true when data is fresh (within freshness window)', () => {
      const map: TriggersMap = {
        t1: {
          isTriggered: true,
          freshnessWindowMs: 60000,
          dataTimestamp: new Date(Date.now() - 1000),
        },
      };
      expect(evaluateTrigger('t1', map)).toBe(true);
    });

    it('ignores freshness when freshnessWindowMs is not set', () => {
      const map: TriggersMap = {
        t1: { isTriggered: true, dataTimestamp: new Date(0) },
      };
      expect(evaluateTrigger('t1', map)).toBe(true);
    });

    it('uses cache for shared triggers', () => {
      const map: TriggersMap = { t1: { isTriggered: true } };
      const cache = new Map<string, boolean>();
      evaluateTrigger('t1', map, cache);
      expect(cache.get('t1')).toBe(true);
      // Even if we mutate the map, the cache should be reused
      map.t1 = { isTriggered: false };
      expect(evaluateTrigger('t1', map, cache)).toBe(true);
    });
  });

  // ── evaluateMandatoryTriggers ──

  describe('evaluateMandatoryTriggers', () => {
    it('returns true when all mandatory triggers are triggered', () => {
      const map: TriggersMap = {
        a: { isTriggered: true },
        b: { isTriggered: true },
      };
      const result = evaluateMandatoryTriggers(['a', 'b'], map);
      expect(result.result).toBe(true);
      expect(result.triggerResults).toEqual({ a: true, b: true });
    });

    it('returns false when any mandatory trigger is not triggered', () => {
      const map: TriggersMap = {
        a: { isTriggered: true },
        b: { isTriggered: false },
      };
      const result = evaluateMandatoryTriggers(['a', 'b'], map);
      expect(result.result).toBe(false);
    });

    it('returns true when mandatory list is empty (no mandatory constraints)', () => {
      const result = evaluateMandatoryTriggers([], {});
      expect(result.result).toBe(true);
    });

    it('returns false when mandatory trigger is missing from map', () => {
      const result = evaluateMandatoryTriggers(['missing'], {});
      expect(result.result).toBe(false);
      expect(result.triggerResults).toEqual({ missing: false });
    });
  });

  // ── evaluateGroup ──

  describe('evaluateGroup', () => {
    it('AND group: returns true when all triggers are true', () => {
      const map: TriggersMap = {
        t1: { isTriggered: true },
        t2: { isTriggered: true },
      };
      const group: TriggerGroup = { operator: 'AND', triggers: ['t1', 't2'] };
      const result = evaluateGroup(group, map);
      expect(result.result).toBe(true);
    });

    it('AND group: returns false when one trigger is false', () => {
      const map: TriggersMap = {
        t1: { isTriggered: true },
        t2: { isTriggered: false },
      };
      const group: TriggerGroup = { operator: 'AND', triggers: ['t1', 't2'] };
      expect(evaluateGroup(group, map).result).toBe(false);
    });

    it('OR group: returns true when at least one trigger is true', () => {
      const map: TriggersMap = {
        t1: { isTriggered: false },
        t2: { isTriggered: true },
      };
      const group: TriggerGroup = { operator: 'OR', triggers: ['t1', 't2'] };
      expect(evaluateGroup(group, map).result).toBe(true);
    });

    it('OR group: returns false when all triggers are false', () => {
      const map: TriggersMap = {
        t1: { isTriggered: false },
        t2: { isTriggered: false },
      };
      const group: TriggerGroup = { operator: 'OR', triggers: ['t1', 't2'] };
      expect(evaluateGroup(group, map).result).toBe(false);
    });

    it('single trigger in AND group works correctly', () => {
      const map: TriggersMap = { t1: { isTriggered: true } };
      const group: TriggerGroup = { operator: 'AND', triggers: ['t1'] };
      expect(evaluateGroup(group, map).result).toBe(true);
    });

    it('empty AND group is vacuously true', () => {
      const group: TriggerGroup = { operator: 'AND', triggers: [] };
      expect(evaluateGroup(group, {}).result).toBe(true);
    });

    it('empty OR group is false', () => {
      const group: TriggerGroup = { operator: 'OR', triggers: [] };
      expect(evaluateGroup(group, {}).result).toBe(false);
    });
  });

  // ── evaluateExtendedLogic ──

  describe('evaluateExtendedLogic', () => {
    it('OR join: returns true when one group passes', () => {
      const map: TriggersMap = {
        t1: { isTriggered: true },
        t2: { isTriggered: true },
        t3: { isTriggered: false },
      };
      const config: ExtendedTriggerLogic = {
        joinOperator: 'OR',
        groups: [
          { operator: 'AND', triggers: ['t1', 't2'] },
          { operator: 'AND', triggers: ['t3'] },
        ],
      };
      const result = evaluateExtendedLogic(config, map);
      expect(result.result).toBe(true);
      expect(result.groups[0].result).toBe(true);
      expect(result.groups[1].result).toBe(false);
    });

    it('OR join: returns false when all groups fail', () => {
      const map: TriggersMap = {
        t1: { isTriggered: false },
        t2: { isTriggered: false },
      };
      const config: ExtendedTriggerLogic = {
        joinOperator: 'OR',
        groups: [
          { operator: 'AND', triggers: ['t1'] },
          { operator: 'AND', triggers: ['t2'] },
        ],
      };
      expect(evaluateExtendedLogic(config, map).result).toBe(false);
    });

    it('AND join: returns true when all groups pass', () => {
      const map: TriggersMap = {
        t1: { isTriggered: true },
        t2: { isTriggered: true },
      };
      const config: ExtendedTriggerLogic = {
        joinOperator: 'AND',
        groups: [
          { operator: 'AND', triggers: ['t1'] },
          { operator: 'AND', triggers: ['t2'] },
        ],
      };
      expect(evaluateExtendedLogic(config, map).result).toBe(true);
    });

    it('AND join: returns false when one group fails', () => {
      const map: TriggersMap = {
        t1: { isTriggered: true },
        t2: { isTriggered: false },
      };
      const config: ExtendedTriggerLogic = {
        joinOperator: 'AND',
        groups: [
          { operator: 'AND', triggers: ['t1'] },
          { operator: 'AND', triggers: ['t2'] },
        ],
      };
      expect(evaluateExtendedLogic(config, map).result).toBe(false);
    });

    it('mixed operators: AND-of-OR-groups', () => {
      const map: TriggersMap = {
        a: { isTriggered: false },
        b: { isTriggered: true },
        c: { isTriggered: true },
        d: { isTriggered: false },
      };
      const config: ExtendedTriggerLogic = {
        joinOperator: 'AND',
        groups: [
          { operator: 'OR', triggers: ['a', 'b'] }, // true (b is true)
          { operator: 'OR', triggers: ['c', 'd'] }, // true (c is true)
        ],
      };
      expect(evaluateExtendedLogic(config, map).result).toBe(true);
    });

    it('mixed operators within groups: (A AND B) AND (C OR D)', () => {
      const map: TriggersMap = {
        a: { isTriggered: true },
        b: { isTriggered: true },
        c: { isTriggered: false },
        d: { isTriggered: true },
      };
      const config: ExtendedTriggerLogic = {
        joinOperator: 'AND',
        groups: [
          { operator: 'AND', triggers: ['a', 'b'] }, // true
          { operator: 'OR', triggers: ['c', 'd'] }, // true (d is true)
        ],
      };
      expect(evaluateExtendedLogic(config, map).result).toBe(true);
    });

    it('empty groups array returns true', () => {
      const config: ExtendedTriggerLogic = {
        joinOperator: 'OR',
        groups: [],
      };
      expect(evaluateExtendedLogic(config, {}).result).toBe(true);
    });
  });

  // ── evaluatePhase ──

  describe('evaluatePhase', () => {
    it('only mandatory triggers — all true → finalResult true', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: ['a', 'b'],
        triggersMap: {
          a: { isTriggered: true },
          b: { isTriggered: true },
        },
      };
      const result = evaluatePhase(input);
      expect(result.finalResult).toBe(true);
      expect(result.extendedLogic).toBeNull();
    });

    it('only mandatory triggers — one false → finalResult false', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: ['a', 'b'],
        triggersMap: {
          a: { isTriggered: true },
          b: { isTriggered: false },
        },
      };
      const result = evaluatePhase(input);
      expect(result.finalResult).toBe(false);
    });

    it('mandatory + extended logic — both pass → true', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: ['a'],
        extendedTriggerLogic: {
          joinOperator: 'OR',
          groups: [{ operator: 'AND', triggers: ['b'] }],
        },
        triggersMap: {
          a: { isTriggered: true },
          b: { isTriggered: true },
        },
      };
      const result = evaluatePhase(input);
      expect(result.finalResult).toBe(true);
      expect(result.mandatory.result).toBe(true);
      expect(result.extendedLogic!.result).toBe(true);
    });

    it('mandatory + extended logic — mandatory fails → false (short-circuit)', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: ['a'],
        extendedTriggerLogic: {
          joinOperator: 'OR',
          groups: [{ operator: 'AND', triggers: ['b'] }],
        },
        triggersMap: {
          a: { isTriggered: false },
          b: { isTriggered: true },
        },
      };
      const result = evaluatePhase(input);
      expect(result.finalResult).toBe(false);
      // Extended logic should not be evaluated (short-circuited)
      expect(result.extendedLogic).toBeNull();
    });

    it('mandatory + extended logic — extended fails → false', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: ['a'],
        extendedTriggerLogic: {
          joinOperator: 'AND',
          groups: [
            { operator: 'AND', triggers: ['b'] },
            { operator: 'AND', triggers: ['c'] },
          ],
        },
        triggersMap: {
          a: { isTriggered: true },
          b: { isTriggered: true },
          c: { isTriggered: false },
        },
      };
      const result = evaluatePhase(input);
      expect(result.finalResult).toBe(false);
    });

    it('no mandatory, only extended logic → finalResult = extended result', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: [],
        extendedTriggerLogic: {
          joinOperator: 'OR',
          groups: [{ operator: 'AND', triggers: ['x'] }],
        },
        triggersMap: {
          x: { isTriggered: true },
        },
      };
      const result = evaluatePhase(input);
      expect(result.finalResult).toBe(true);
      expect(result.mandatory.result).toBe(true); // vacuously true
    });

    it('no mandatory, extended logic fails → false', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: [],
        extendedTriggerLogic: {
          joinOperator: 'AND',
          groups: [{ operator: 'AND', triggers: ['x'] }],
        },
        triggersMap: {
          x: { isTriggered: false },
        },
      };
      expect(evaluatePhase(input).finalResult).toBe(false);
    });

    it('shared triggers reused across groups — evaluated once', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: [],
        extendedTriggerLogic: {
          joinOperator: 'OR',
          groups: [
            { operator: 'AND', triggers: ['shared', 'other1'] },
            { operator: 'AND', triggers: ['shared', 'other2'] },
          ],
        },
        triggersMap: {
          shared: { isTriggered: true },
          other1: { isTriggered: false },
          other2: { isTriggered: true },
        },
      };
      const result = evaluatePhase(input);
      // Group1: shared(true) AND other1(false) = false
      // Group2: shared(true) AND other2(true) = true
      // OR → true
      expect(result.finalResult).toBe(true);
      expect(result.extendedLogic!.groups[0].triggers['shared']).toBe(true);
      expect(result.extendedLogic!.groups[1].triggers['shared']).toBe(true);
    });

    it('missing data causes FALSE', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: ['exists', 'missing'],
        triggersMap: {
          exists: { isTriggered: true },
        },
      };
      const result = evaluatePhase(input);
      expect(result.finalResult).toBe(false);
      expect(result.mandatory.triggerResults['missing']).toBe(false);
    });

    it('stale data causes FALSE in extended logic', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: [],
        extendedTriggerLogic: {
          joinOperator: 'AND',
          groups: [{ operator: 'AND', triggers: ['stale'] }],
        },
        triggersMap: {
          stale: {
            isTriggered: true,
            freshnessWindowMs: 1000,
            dataTimestamp: new Date(Date.now() - 5000),
          },
        },
      };
      expect(evaluatePhase(input).finalResult).toBe(false);
    });

    it('empty extended logic (null) → use mandatory only', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: ['a'],
        extendedTriggerLogic: null,
        triggersMap: {
          a: { isTriggered: true },
        },
      };
      const result = evaluatePhase(input);
      expect(result.finalResult).toBe(true);
      expect(result.extendedLogic).toBeNull();
    });

    it('no mandatory and no extended logic → false (prevent accidental activation)', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: [],
        extendedTriggerLogic: null,
        triggersMap: {},
      };
      expect(evaluatePhase(input).finalResult).toBe(false);
    });

    it('extended logic with empty groups → treated as no constraints (true)', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'p1',
        mandatoryTriggerKeys: ['a'],
        extendedTriggerLogic: {
          joinOperator: 'OR',
          groups: [],
        },
        triggersMap: {
          a: { isTriggered: true },
        },
      };
      // Empty groups means no extended constraints, so just mandatory result
      expect(evaluatePhase(input).finalResult).toBe(true);
    });

    it('returns structured evaluation result for auditability', () => {
      const input: PhaseEvaluationInput = {
        phaseId: 'activation-phase',
        mandatoryTriggerKeys: ['m1', 'm2'],
        extendedTriggerLogic: {
          joinOperator: 'OR',
          groups: [
            { operator: 'AND', triggers: ['e1', 'e2'] },
            { operator: 'AND', triggers: ['e3'] },
          ],
        },
        triggersMap: {
          m1: { isTriggered: true },
          m2: { isTriggered: true },
          e1: { isTriggered: true },
          e2: { isTriggered: false },
          e3: { isTriggered: true },
        },
      };
      const result = evaluatePhase(input);
      expect(result).toEqual({
        phaseId: 'activation-phase',
        mandatory: {
          triggerResults: { m1: true, m2: true },
          result: true,
        },
        extendedLogic: {
          joinOperator: 'OR',
          groups: [
            {
              operator: 'AND',
              triggers: { e1: true, e2: false },
              result: false,
            },
            {
              operator: 'AND',
              triggers: { e3: true },
              result: true,
            },
          ],
          result: true,
        },
        finalResult: true,
      });
    });
  });
});
