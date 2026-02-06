// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../lib/TriggerLib.sol";

interface ITrigger {
    struct Trigger {
        uint256 id;
        TriggerLib.Condition condition;
        TriggerLib.Phase phase;
        bool isTriggered;
    }

    function addTrigger(TriggerLib.Condition calldata condition) external returns (uint256);
    function setTriggered(uint256 triggerId, uint256 observedValue) external;
    function getTrigger(uint256 triggerId) external view returns (Trigger memory);
    function getTriggerValue(uint256 triggerId) external view returns (uint256);
    function totalTriggers() external view returns (uint256);

    event TriggerAdded(uint256 indexed triggerId, TriggerLib.Condition condition, TriggerLib.Phase phase);
    event TriggerPhaseChanged(uint256 indexed triggerId, TriggerLib.Phase newPhase);
    event TriggerActivated(uint256 indexed triggerId, uint256 value);
}
