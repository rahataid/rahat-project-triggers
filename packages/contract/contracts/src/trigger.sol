// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../interface/IOracle.sol";

contract TriggerContract {
    address public owner;
    ISourceOracle public oracle;

    constructor(address oracleAddress) {
        owner = msg.sender;
        oracle = ISourceOracle(oracleAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    struct Trigger {
        uint256 id;
        uint256 phaseId;
        uint256 sourceId;
        uint256 threshold;
        bool triggered;
        string name;
    }

    struct Phase {
        uint256 id;
        string name;
        uint256 threshold;
        uint256[] triggerIds;
    }

    uint256 public nextTriggerId = 1;
    uint256 public nextPhaseId = 1;

    mapping(uint256 => Trigger) public triggers;
    mapping(uint256 => Phase) public phases;

    event PhaseCreated(uint256 indexed phaseId, string name, uint256 threshold);
    event TriggerCreated(
        uint256 indexed triggerId,
        uint256 indexed phaseId,
        uint256 sourceId,
        uint256 threshold,
        string name
    );
    event TriggerActivated(uint256 indexed triggerId);

    /**
     * @notice Create a phase FIRST before creating triggers
     */
    function createPhase(string memory name, uint256 threshold)
    external
    onlyOwner
    returns (uint256)
{
    uint256 id = nextPhaseId++;

    phases[id].id = id;
    phases[id].name = name;
    phases[id].threshold = threshold;

    emit PhaseCreated(id, name, threshold);
    return id;
}

    /**
     * @notice Create a trigger and attach it to a phase
     */
    function createTrigger(
        uint256 phaseId,
        uint256 sourceId,
        uint256 threshold,
        string memory name
    )
        external
        onlyOwner
        returns (uint256)
    {
        require(phases[phaseId].id != 0, "phase not found");

        ISourceOracle.Source memory s = oracle.getSource(sourceId);
        require(s.id != 0, "source doesn't exist");

        uint256 id = nextTriggerId++;

        triggers[id] = Trigger({
            id: id,
            phaseId: phaseId,
            sourceId: sourceId,
            threshold: threshold,
            triggered: false,
            name: name
        });

        // Store trigger under its phase
        phases[phaseId].triggerIds.push(id);

        emit TriggerCreated(id, phaseId, sourceId, threshold, name);
        return id;
    }


    function activateTrigger(uint256 triggerId) external onlyOwner {
        Trigger storage t = triggers[triggerId];

        require(t.id != 0, "trigger not found");
        require(!t.triggered, "already triggered");

        // check live oracle value
        ISourceOracle.Source memory s = oracle.getSource(t.sourceId);
        require(s.value >= t.threshold, "threshold not reached");

        t.triggered = true;
        emit TriggerActivated(triggerId);
    }

    function isPhaseTriggered(uint256 phaseId) external view returns (bool) {
        Phase storage p = phases[phaseId];
        require(p.id != 0, "phase not found");

        uint256 triggeredCount = 0;

        for (uint256 i = 0; i < p.triggerIds.length; i++) {
            uint256 tId = p.triggerIds[i];
            if (triggers[tId].triggered) {
                triggeredCount++;
            }
        }

        return triggeredCount >= p.threshold;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "invalid owner");
        owner = newOwner;
    }
}
