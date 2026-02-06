export type TriggerWithPhase = {
  uuid: string;
  triggerStatement: Record<string, any> | null;
  source: string;
  phaseId?: string;
  phase: {
    name: string;
    riverBasin: string | null;
  };
};

export type TriggerConditionPayload = {
  value: bigint;
  source: string;
  operator: string;
  expression: string;
  sourceSubType: string;
};

export type SerializedCondition = {
  value: string;
  source: string;
  operator: string;
  expression: string;
  sourceSubType: string;
};

export type CreateTriggerCondition = {
  phaseId: string;
  sourceId: string;
  threshold: string;
  name: string;
};

export type BlockchainJobPayload = {
  triggerUuid: string;
  phaseId: string;
  condition: CreateTriggerCondition;
};

export type TriggerWithPhaseAndData = TriggerWithPhase & {
  triggerRecord: {
    uuid: string;
    title: string | null;
    sourceType: 'MANUAL' | 'AUTOMATIC';
  };
  phaseData: {
    uuid: string;
    PhaseBlockchain: {
      blockchainId: string;
    } | null;
  } | null;
};

export type BlockchainBatchJobPayload = {
  triggers: TriggerWithPhaseAndData[];
};

export type BlockchainUpdatePhasePayload = {
  triggerId: string;
  observedValue: string;
};

export type BlockchainActivateTriggerPayload = {
  triggerUuid: string;
};

export type TriggerContractWriter = {
  addTrigger: (condition: TriggerConditionPayload) => Promise<{
    hash: string;
    wait: () => Promise<unknown>;
  }>;
  updateTriggerPhase: (
    triggerId: bigint,
    observedValue: bigint,
  ) => Promise<{
    hash: string;
    wait: () => Promise<unknown>;
  }>;
  createPhase: (name: string, threshold: bigint) => Promise<bigint>;
  createTrigger: (
    triggerType: number,
    phaseUuid: string,
    triggerUuid: string,
    sourceId: bigint,
    threshold: bigint,
    name: string,
  ) => Promise<{
    hash: string;
    wait: () => Promise<unknown>;
  }>;
  activateTrigger: (triggerId: bigint) => Promise<{
    hash: string;
    wait: () => Promise<unknown>;
  }>;
  getTriggerByUuid: (uuid: string) => Promise<{
    id: bigint;
    phaseId: bigint;
    sourceId: bigint;
    threshold: bigint;
    triggered: boolean;
    name: string;
    uuid: string;
  }>;
};
