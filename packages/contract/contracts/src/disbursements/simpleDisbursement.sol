// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

/**
 * @title ERC20Disburser
 * @notice Bulk ERC20 token disbursement without using assembly
 */
contract SimpleERC20Disburser {
    /**
     * @notice Disburse ERC20 tokens to multiple recipients
     * @param token The ERC20 token address
     * @param recipients The addresses to receive tokens
     * @param amounts The corresponding token amounts for each recipient
     * @param totalAmount The total amount to transfer from sender
     */
    function disburseERC20(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256 totalAmount
    ) external {
        require(recipients.length == amounts.length, "Array length mismatch");

        IERC20 erc20 = IERC20(token);

        // Step 1: Pull the total amount from sender to this contract
        require(erc20.transferFrom(msg.sender, address(this), totalAmount), "TransferFrom failed");

        // Step 2: Disburse to each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            require(erc20.transfer(recipients[i], amounts[i]), "Transfer to recipient failed");
        }
    }
}
