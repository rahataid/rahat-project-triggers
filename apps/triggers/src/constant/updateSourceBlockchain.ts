export type SourceInput = {
  title: string;
  sourceSubType: string;
  value: bigint;
};

export type BlockchainUpdateSourceValuePayload = {
  sourceId: number | string;
  value: number | string;
};

export type SourceOracleContractReader = {
  getSource: (sourceId: bigint) => Promise<{
    id: bigint;
    name: string;
    value: bigint;
    timestamp: bigint;
    unit: string;
    decimal: bigint;
  }>;
};

export type SourceOracleContractWriter = {
  createSource: (input: SourceInput) => Promise<{
    hash: string;
    wait: () => Promise<unknown>;
  }>;
  updateSourceValue: (
    sourceId: bigint,
    newValue: bigint,
  ) => Promise<{
    hash: string;
    wait: () => Promise<unknown>;
  }>;
};
