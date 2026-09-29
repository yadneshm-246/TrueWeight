import os
from datetime import datetime, timezone

from web3 import Web3


RPC_URL = os.getenv("BLOCKCHAIN_RPC_URL")
PRIVATE_KEY = os.getenv("BLOCKCHAIN_PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("BLOCKCHAIN_CONTRACT_ADDRESS")


CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "certificateHash",
                "type": "bytes32",
            }
        ],
        "name": "anchorCertificate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "certificateHash",
                "type": "bytes32",
            }
        ],
        "name": "isAnchored",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
]


def anchor_certificate(certificate_hash: str):

    if not RPC_URL:
        return {
            "success": False,
            "status": "NOT_CONFIGURED",
            "error": "BLOCKCHAIN_RPC_URL is not configured",
        }

    if not PRIVATE_KEY:
        return {
            "success": False,
            "status": "NOT_CONFIGURED",
            "error": "BLOCKCHAIN_PRIVATE_KEY is not configured",
        }

    if not CONTRACT_ADDRESS:
        return {
            "success": False,
            "status": "NOT_CONFIGURED",
            "error": "BLOCKCHAIN_CONTRACT_ADDRESS is not configured",
        }

    try:

        web3 = Web3(Web3.HTTPProvider(RPC_URL))

        if not web3.is_connected():
            return {
                "success": False,
                "status": "FAILED",
                "error": "Blockchain RPC connection failed",
            }

        account = web3.eth.account.from_key(PRIVATE_KEY)

        contract = web3.eth.contract(
            address=Web3.to_checksum_address(
                CONTRACT_ADDRESS
            ),
            abi=CONTRACT_ABI,
        )

        hash_bytes = bytes.fromhex(certificate_hash)

        already_anchored = contract.functions.isAnchored(
            hash_bytes
        ).call()

        if already_anchored:

            return {
                "success": True,
                "status": "ALREADY_ANCHORED",
                "transaction_hash": None,
                "contract": CONTRACT_ADDRESS,
                "anchored_at": datetime.now(
                    timezone.utc
                ),
            }

        nonce = web3.eth.get_transaction_count(
            account.address
        )

        transaction = contract.functions.anchorCertificate(
            hash_bytes
        ).build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "chainId": web3.eth.chain_id,
                "gas": 150000,
                "gasPrice": web3.eth.gas_price,
            }
        )

        signed_transaction = web3.eth.account.sign_transaction(
            transaction,
            PRIVATE_KEY,
        )

        tx_hash = web3.eth.send_raw_transaction(
            signed_transaction.raw_transaction
        )

        receipt = web3.eth.wait_for_transaction_receipt(
            tx_hash,
            timeout=120,
        )

        if receipt.status != 1:

            return {
                "success": False,
                "status": "FAILED",
                "error": "Blockchain transaction failed",
            }

        return {
            "success": True,
            "status": "ANCHORED",
            "transaction_hash": tx_hash.hex(),
            "contract": CONTRACT_ADDRESS,
            "anchored_at": datetime.now(
                timezone.utc
            ),
        }

    except Exception as e:

        return {
            "success": False,
            "status": "FAILED",
            "error": str(e),
        }