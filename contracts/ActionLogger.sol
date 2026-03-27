// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ActionLogger {
    event ActionLogged(uint256 documentId, address user, string action, uint256 timestamp, bytes32 hash);

    function logAction(
        uint256 documentId,
        address user,
        string calldata action,
        uint256 timestamp,
        bytes32 hash
    ) external {
        emit ActionLogged(documentId, user, action, timestamp, hash);
    }
}
