import asyncio
from datetime import datetime
from typing import Optional

from web3 import Web3
from web3.middleware import geth_poa_middleware

from app.core.config import settings

ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": False, "internalType": "uint256", "name": "documentId", "type": "uint256"},
            {"indexed": False, "internalType": "address", "name": "user", "type": "address"},
            {"indexed": False, "internalType": "string", "name": "action", "type": "string"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"indexed": False, "internalType": "bytes32", "name": "hash", "type": "bytes32"},
        ],
        "name": "ActionLogged",
        "type": "event",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "documentId", "type": "uint256"},
            {"internalType": "address", "name": "user", "type": "address"},
            {"internalType": "string", "name": "action", "type": "string"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"internalType": "bytes32", "name": "hash", "type": "bytes32"},
        ],
        "name": "logAction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


def _enabled() -> bool:
    return (
        settings.blockchain_enabled
        and settings.blockchain_rpc_url
        and settings.blockchain_private_key
        and settings.blockchain_contract_address
        and settings.blockchain_chain_id is not None
        and settings.blockchain_sender_address
    )


async def log_action(
    *,
    document_id: int,
    user_address: str,
    action: str,
    timestamp: datetime,
    hash_hex: str,
) -> Optional[str]:
    if not _enabled():
        return None

    def _send() -> Optional[str]:
        try:
            w3 = Web3(Web3.HTTPProvider(settings.blockchain_rpc_url))
            # For PoA chains like Mumbai/Sepolia
            w3.middleware_onion.inject(geth_poa_middleware, layer=0)
            account = w3.eth.account.from_key(settings.blockchain_private_key)
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(settings.blockchain_contract_address),
                abi=ABI,
            )
            nonce = w3.eth.get_transaction_count(account.address)
            tx = contract.functions.logAction(
                document_id,
                Web3.to_checksum_address(user_address),
                action,
                int(timestamp.timestamp()),
                bytes.fromhex(hash_hex),
            ).build_transaction(
                {
                    "from": account.address,
                    "nonce": nonce,
                    "chainId": settings.blockchain_chain_id,
                    "gas": 500000,
                }
            )
            signed = account.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
            return tx_hash.hex()
        except Exception:
            return None

    return await asyncio.to_thread(_send)
