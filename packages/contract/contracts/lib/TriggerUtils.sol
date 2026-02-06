// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./TriggerLib.sol";

/// @title Trigger Utilities
/// @notice Provides reusable functions for evaluating trigger conditions
library TriggerUtils {

    /// @notice Evaluates whether a given observed value satisfies the condition
    function evaluate(uint256 observedValue, TriggerLib.Condition memory condition)
        internal
        pure
        returns (bool)
    {
        string memory op = condition.operator;
        uint256 threshold = condition.value;

        if (compareStrings(op, ">")) return observedValue > threshold;
        if (compareStrings(op, ">=")) return observedValue >= threshold;
        if (compareStrings(op, "<")) return observedValue < threshold;
        if (compareStrings(op, "<=")) return observedValue <= threshold;
        if (compareStrings(op, "==")) return observedValue == threshold;
        if (compareStrings(op, "!=")) return observedValue != threshold;

        revert("TriggerUtils: invalid operator");
    }

    /// @notice Simple helper for string comparison
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    /// @notice Helper to get next phase
    function nextPhase(TriggerLib.Phase current) internal pure returns (TriggerLib.Phase) {
        if (current == TriggerLib.Phase.Preparedness) return TriggerLib.Phase.Readiness;
        if (current == TriggerLib.Phase.Readiness) return TriggerLib.Phase.Activation;
        revert("TriggerUtils: invalid phase transition");
    }
}
