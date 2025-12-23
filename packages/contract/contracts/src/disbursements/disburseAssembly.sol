// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title ERC20Disburser
 * @notice Ultra gas-efficient bulk ERC20 transfer contract
 * @dev Uses inline assembly to reduce gas by directly manipulating calldata and memory.
 */
contract ERC20Disburser {
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
    ) external payable {
        assembly {
            // Ensure equal length arrays
            if iszero(eq(recipients.length, amounts.length)) {
                revert(0, 0)
            }

            // Step 1: Transfer total amount from sender to this contract
            // transferFrom(address from, address to, uint256 value)
            mstore(0x00, hex"23b872dd")
            mstore(0x04, caller())
            mstore(0x24, address())
            mstore(0x44, totalAmount)

            if iszero(call(gas(), token, 0, 0x00, 0x64, 0, 0)) {
                revert(0, 0)
            }

            // Step 2: Prepare for per-recipient transfers
            // transfer(address to, uint256 value)
            mstore(0x00, hex"a9059cbb")

            let end := add(recipients.offset, shl(5, recipients.length))
            let diff := sub(recipients.offset, amounts.offset)

            // Step 3: Loop through recipients and transfer tokens
            for {
                let offset := recipients.offset
            } 1 {

            } {
                mstore(0x04, calldataload(offset)) // recipient
                mstore(0x24, calldataload(sub(offset, diff))) // amount

                if iszero(call(gas(), token, 0, 0x00, 0x44, 0, 0)) {
                    revert(0, 0)
                }

                offset := add(offset, 0x20)
                if iszero(lt(offset, end)) {
                    break
                }
            }
        }
    }
}
