// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../lib/hackathon/src/AbstractReactive.sol";

/**
 * @title ReactiveVolatilityTrigger
 * @notice A reactive-network contract that uses reactive-lib. It is triggered by an off-chain FAST API when crypto volatility exceeds 2%.
 * Upon triggering, the contract requires a call with exactly 0.01 ETH, which it then transfers to a static recipient address.
 */
contract ReactiveVolatilityTrigger is AbstractReactive {
    // Static recipient address provided at deployment.
    address private immutable recipient;
    
    event TransferExecuted(address indexed from, address indexed to, uint256 amount);
    
    /**
     * @notice Constructor that sets the static recipient.
     * @param _recipient The address that will receive the 0.01 ETH transfers.
     */
    constructor(address _recipient) {
        recipient = _recipient;
    }
    
    /**
     * @notice React function called by the off-chain FAST API trigger when volatility is above threshold.
     * The function requires an attached message value of exactly 0.01 ETH. On success, it transfers this amount to the static recipient.
     * @param log A log record parameter from the reactive network trigger (its data is not used in this implementation).
     */
    function react(LogRecord calldata log) external override {
        // Ensure the caller sends exactly 0.01 ETH.
        require(msg.value == 0.01 ether, "Must send exactly 0.01 ETH");
        
        // Transfer the ETH to the static recipient.
        (bool sent, ) = recipient.call{value: msg.value}("");
        require(sent, "Transfer failed");
        
        emit TransferExecuted(msg.sender, recipient, msg.value);
    }
    
    // Fallback function to accept ETH if necessary.
    receive() external payable {}
}
