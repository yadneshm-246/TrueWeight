// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TrueWeightRegistry {

    address public owner;

    mapping(bytes32 => uint256) public certificateTimestamp;

    event CertificateAnchored(
        bytes32 indexed certificateHash,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    function anchorCertificate(
        bytes32 certificateHash
    ) external {

        require(
            certificateTimestamp[certificateHash] == 0,
            "Certificate already anchored"
        );

        certificateTimestamp[certificateHash] = block.timestamp;

        emit CertificateAnchored(
            certificateHash,
            block.timestamp
        );
    }

    function isAnchored(
        bytes32 certificateHash
    ) external view returns (bool) {

        return certificateTimestamp[certificateHash] != 0;
    }

    function getTimestamp(
        bytes32 certificateHash
    ) external view returns (uint256) {

        return certificateTimestamp[certificateHash];
    }
}