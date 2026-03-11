export const CONTRACT_NAMES = {
  trigger: "TriggerContract",
  oracle: "SourceOracle",
} as const;

export type ContractNameKey = keyof typeof CONTRACT_NAMES;
export type ContractName = (typeof CONTRACT_NAMES)[ContractNameKey];
