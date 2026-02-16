// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ISourceOracle {
    struct Source {
        uint256 id;
        string name;
        uint256 value;
        uint256 timestamp;
        string unit;
        uint256 decimal;
    }

    function getSource(uint256 sourceId)
        external
        view
        returns (Source memory);
}

contract TriggerContract {
    address public owner;
    ISourceOracle public immutable oracle;

    enum TriggerType {
    MANUAL,
    AUTOMATIC
    }

    uint public MAX_PHASE_TRIGGER = 100;

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
        TriggerType triggerType;
        uint256 phaseId;
        uint256 sourceId;
        uint256 threshold;
        bool triggered;
        string name;
        string uuid;
    }

    struct Phase {
        uint256 id;
        string name;
        string uuid;
        uint256 threshold;
        uint256[] triggerIds;
    }

    uint256 public nextTriggerId = 1;
    uint256 public nextPhaseId = 1;

    mapping(uint256 => Trigger) public triggers;
    mapping(uint256 => Phase) public phases;
    mapping(string => uint256) public phaseByUuid;
    mapping(string => uint256) public triggerByUuid;

    event PhaseCreated(uint256 indexed phaseId, string name, string uuid, uint256 threshold);
    event TriggerCreated(
        uint256 indexed triggerId,
        uint256 indexed phaseId,
        uint256 sourceId,
        uint256 threshold,
        string name
    );
    event TriggerActivated(uint256 indexed triggerId);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @notice Create a phase FIRST before creating triggers
     */
    function createPhase(string memory name, string memory uuid, uint256 threshold)
    external
    onlyOwner
    returns (uint256)
{
    require(phaseByUuid[uuid] == 0, "uuid already exists");
    
    uint256 id = nextPhaseId++;

    phases[id].id = id;
    phases[id].name = name;
    phases[id].uuid = uuid;
    phases[id].threshold = threshold;
    phaseByUuid[uuid] = id;

    emit PhaseCreated(id, name, uuid, threshold);
    return id;
}

    /**
     * @notice Create a trigger and attach it to a phase
     */
    function createTrigger(
        TriggerType triggerType,
        string memory phaseUuid,
        string memory triggerUuid,
        uint256 sourceId,
        uint256 threshold,
        string memory name
    )
        external
        onlyOwner
        returns (uint256)
    {
        require(triggerByUuid[triggerUuid] == 0, "trigger uuid already exists");

        uint256 phaseId = phaseByUuid[phaseUuid];
        require(phaseId != 0, "phase not found");

        // Only validate source for AUTOMATIC triggers
        if (triggerType == TriggerType.AUTOMATIC) {
            require(sourceId != 0, "sourceId required for automatic trigger");
            ISourceOracle.Source memory s = oracle.getSource(sourceId);
            require(s.id != 0, "source doesn't exist");
        }

        uint256 id = nextTriggerId++;

        triggers[id] = Trigger({
            id: id,
            triggerType: triggerType,
            phaseId: phaseId,
            sourceId: sourceId,
            threshold: threshold,
            triggered: false,
            name: name,
            uuid: triggerUuid
        });

        // Store trigger under its phase, enforce max 100 triggers
        require(phases[phaseId].triggerIds.length < MAX_PHASE_TRIGGER, "max triggers per phase reached");
        phases[phaseId].triggerIds.push(id);
        
        // Store trigger UUID mapping
        triggerByUuid[triggerUuid] = id;

        emit TriggerCreated(id, phaseId, sourceId, threshold, name);
        return id;
    }


    function activateTrigger(uint256 triggerId) external onlyOwner {
        Trigger storage t = triggers[triggerId];

        require(t.id != 0, "trigger not found");
        require(!t.triggered, "already triggered");

        // Only check oracle value for AUTOMATIC triggers
        if (t.triggerType == TriggerType.AUTOMATIC) {
            ISourceOracle.Source memory s = oracle.getSource(t.sourceId);
            require(s.value >= t.threshold, "threshold not reached");
        }

        t.triggered = true;
        emit TriggerActivated(triggerId);
    }
    
    ///@notice function to check whether phase is triggered or not
    ///@dev is only the view function
    function isPhaseTriggered(string memory phaseUuid) external  view returns (bool) {
        uint256 phaseId = phaseByUuid[phaseUuid];
        require(phaseId != 0, "phase not found");
        
        Phase memory p = phases[phaseId];

        uint256 triggeredCount = 0;

        uint256 maxCheck = p.triggerIds.length > MAX_PHASE_TRIGGER ? MAX_PHASE_TRIGGER : p.triggerIds.length;
        for (uint256 i = 0; i < maxCheck; i++) {
            uint256 tId = p.triggerIds[i];
            if (triggers[tId].triggered) {
                triggeredCount++;
            }
        }

        return triggeredCount >= p.threshold;
    }

    /**
     * @notice Get phase details by uuid
     */
    function getPhaseByUuid(string memory uuid) external view returns (Phase memory) {
        uint256 phaseId = phaseByUuid[uuid];
        require(phaseId != 0, "phase not found");
        return phases[phaseId];
    }

    /**
     * @notice Get trigger details by uuid
     */
    function getTriggerByUuid(string memory uuid) external view returns (Trigger memory) {
        uint256 triggerId = triggerByUuid[uuid];
        require(triggerId != 0, "trigger not found");
        return triggers[triggerId];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "invalid owner");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
