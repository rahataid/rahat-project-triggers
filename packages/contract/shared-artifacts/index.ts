import TriggerContract from "../artifacts/contracts/src/trigger.sol/TriggerContract.json";
import SourceOracle from "../artifacts/contracts/src/oracle.sol/SourceOracle.json";

export type ContractArtifact = typeof TriggerContract | typeof SourceOracle;
export type ContractArtifactMap = Record<string, ContractArtifact>;

const artifacts: ContractArtifactMap = {
  TriggerContract,
  SourceOracle,
};

export { TriggerContract, SourceOracle };
export default artifacts;
