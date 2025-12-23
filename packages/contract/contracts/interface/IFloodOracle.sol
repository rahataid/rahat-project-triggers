// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IFloodDataAggregator
/// @notice Interface for a simplified multi-source flood data aggregator with Chainlink Functions
interface IFloodDataAggregator {

    /// @notice Metadata for each data source
    struct Source {
        string name;          // e.g., "GLOFAS"
        string description;   // Optional
        bool active;          // Whether the source is active
    }

    /// @notice Latest data stored for a source
    struct SourceData {
        uint256 timestamp;    // When the data was recorded
        string dataUri;       // Optional URI of raw data
        bytes32 dataHash;     // Hash of raw data
        bytes rawData;        // Raw Chainlink Functions response
    }

    /* ========== EVENTS ========== */

    event SourceRegistered(bytes32 indexed sourceId, string name);
    event SourceDataUpdated(bytes32 indexed sourceId, uint256 timestamp);
    event ChainlinkResponse(bytes32 indexed requestId, bytes response, bytes err);

    /* ========== SOURCE MANAGEMENT ========== */

    /// @notice Register a new data source
    function registerSource(
        bytes32 sourceId,
        string calldata name,
        string calldata description
    ) external;

    /// @notice Retrieve metadata for a specific source
    function sources(bytes32 sourceId) external view returns (
        string memory name,
        string memory description,
        bool active
    );

    /* ========== DATA REQUEST / CHAINLINK FUNCTIONS ========== */
    /// @notice Request flood data for a specific source
    /// @param sourceId The source to request data from
    /// @return requestId The Chainlink Functions request ID
    function requestFloodData(bytes32 sourceId) external returns (bytes32 requestId);

    /// @notice Last Chainlink Functions request ID
    function lastRequestId() external view returns (bytes32);

    /// @notice Last response from Chainlink Functions
    function lastResponse() external view returns (bytes memory);

    /// @notice Last error from Chainlink Functions
    function lastError() external view returns (bytes memory);

    /* ========== DATA ACCESS ========== */

    /// @notice Retrieve latest data for a source
    function latestData(bytes32 sourceId) external view returns (
        uint256 timestamp,
        string memory dataUri,
        bytes32 dataHash,
        bytes memory rawData
    );
}