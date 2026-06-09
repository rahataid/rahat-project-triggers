// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "../interfaces/TriggerLib.sol";

interface ITrigger {
    struct Trigger {
        uint256 id;
        TriggerLib.Condition condition;
        TriggerLib.Phase phase;
        bool isTriggered;
    }

    function addTrigger(TriggerLib.Condition calldata condition) external returns (uint256);
    function updateTrigger(TriggerLib.Condition calldata condition) external returns (uint256);
    function getTrigger(uint256 triggerId) external view returns (Trigger memory);

    event TriggerAdded(uint256 indexed triggerId, TriggerLib.Condition condition, TriggerLib.Phase phase);
    event TriggerUpdated(uint256 indexed triggerId, TriggerLib.Condition condition);
}