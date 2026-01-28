import TriggerContract from "./TriggerContract.json";
import SourceOracle from "./SourceOracle.json";

export type ContractArtifact = typeof TriggerContract | typeof SourceOracle;
export type ContractArtifactMap = Record<string, ContractArtifact>;

const artifacts: ContractArtifactMap = {
  TriggerContract,
  SourceOracle,
};

export { TriggerContract, SourceOracle };
export default artifacts;