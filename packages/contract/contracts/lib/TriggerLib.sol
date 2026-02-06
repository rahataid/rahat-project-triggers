// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title Trigger Library
/// @notice Defines trigger condition and lifecycle phases
library TriggerLib {

    struct Soruce {
        uint64 id;
        uint256 threshold;
        string unit;
    }

    /// @notice Trigger lifecycle phases
    enum Phase { Preparedness, Readiness, Activation }

    struct Condition {
        uint256 value;        // Threshold
        string source;        // Data source (e.g., GloFAS)
        string operator;      // Comparison operator
        string expression;    // Optional expression for complex logic
        string sourceSubType; // e.g., rainLevel, riverLevel
    }

    struct Trigger {
        uint256 id;
        Condition condition;
        Phase phase;
        bool isTriggered;
    }

    event TriggerAdded(uint256 indexed triggerId, Condition condition, Phase phase);
    event TriggerPhaseChanged(uint256 indexed triggerId, Phase newPhase);
    event TriggerActivated(uint256 indexed triggerId, uint256 value);
}
