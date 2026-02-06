// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface ISourceOracle {
    struct Source {
        uint256 id;
        string name;
        uint256 value;      // MUST match contract
        uint256 timestamp;
        string unit;
        uint256 decimal;    // MUST match contract
    }

    function getSource(uint256 sourceId)
        external
        view
        returns (Source memory);
}
