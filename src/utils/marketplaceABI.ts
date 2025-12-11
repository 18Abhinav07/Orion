// Auto-generated ABI for Fixed Marketplace Contract
// Contract Address: 0xa0F3926A51F2f2947510FB59CEc9318d302D801B
// Generated: 2025-10-05T03:18:04.805Z
// Fix: Corrected seller address bug (issuer: tokenIssuer instead of msg.sender)

export const MARKETPLACE_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {"type": "address", "name": "_adminContract"},
      {"type": "address", "name": "_tokenContract"}
    ]
  },
  {
    "type": "function",
    "name": "listAsset",
    "constant": false,
    "inputs": [
      {"type": "uint256", "name": "_tokenId"},
      {"type": "uint256", "name": "_amount"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "buyAsset",
    "constant": false,
    "stateMutability": "payable",
    "payable": true,
    "inputs": [
      {"type": "uint256", "name": "_tokenId"},
      {"type": "uint256", "name": "_amount"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getAllListings",
    "constant": true,
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {"type": "uint256[]", "name": "tokenIds"},
      {"type": "address[]", "name": "issuers"},
      {"type": "uint256[]", "name": "amounts"},
      {"type": "uint256[]", "name": "prices"}
    ]
  },
  {
    "type": "function",
    "name": "tokenManagementContract",
    "constant": true,
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"type": "address", "name": ""}]
  },
  {
    "type": "function",
    "name": "setTokenManagementContract",
    "constant": false,
    "inputs": [{"type": "address", "name": "_tokenManagementContract"}],
    "outputs": []
  },
  {
    "type": "function",
    "name": "listings",
    "constant": true,
    "stateMutability": "view",
    "inputs": [{"type": "uint256", "name": ""}],
    "outputs": [
      {"type": "address", "name": "issuer"},
      {"type": "uint256", "name": "amount"},
      {"type": "bool", "name": "active"}
    ]
  },
  {
    "type": "function",
    "name": "tokenHolders",
    "constant": true,
    "stateMutability": "view",
    "inputs": [
      {"type": "address", "name": ""},
      {"type": "uint256", "name": ""}
    ],
    "outputs": [{"type": "uint256", "name": ""}]
  },
  {
    "type": "function",
    "name": "getTokenHolders",
    "constant": true,
    "stateMutability": "view",
    "inputs": [{"type": "uint256", "name": "_tokenId"}],
    "outputs": [
      {"type": "address[]", "name": "holders"},
      {"type": "uint256[]", "name": "amounts"}
    ]
  },
  {
    "type": "function",
    "name": "getMyAssets",
    "constant": true,
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {"type": "uint256[]", "name": "tokenIds"},
      {"type": "uint256[]", "name": "amounts"}
    ]
  },
  {
    "type": "function",
    "name": "adminContract",
    "constant": true,
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"type": "address", "name": ""}]
  },
  {
    "type": "function",
    "name": "tokenContract",
    "constant": true,
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"type": "address", "name": ""}]
  },
  {
    "type": "function",
    "name": "withdrawEarnings",
    "constant": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "withdrawEarnings",
    "constant": false,
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getUserBalance",
    "constant": true,
    "stateMutability": "view",
    "inputs": [
      {"type": "address", "name": "_user"},
      {"type": "uint256", "name": "_tokenId"}
    ],
    "outputs": [{"type": "uint256", "name": ""}]
  },
  {
    "type": "function",
    "name": "sellAsset",
    "constant": false,
    "stateMutability": "payable",
    "payable": true,
    "inputs": [
      {"type": "uint256", "name": "_tokenId"},
      {"type": "uint256", "name": "_amount"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "withdrawAsset",
    "constant": false,
    "stateMutability": "nonpayable",
    "inputs": [
      {"type": "uint256", "name": "_tokenId"},
      {"type": "uint256", "name": "_amount"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "removeListing",
    "constant": false,
    "inputs": [{"type": "uint256", "name": "_tokenId"}],
    "outputs": []
  },
  {
    "type": "function",
    "name": "updateListing",
    "constant": false,
    "inputs": [
      {"type": "uint256", "name": "_tokenId"},
      {"type": "string", "name": "_newMetadataURI"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "getTotalListed",
    "constant": true,
    "stateMutability": "view",
    "inputs": [{"type": "uint256", "name": "_tokenId"}],
    "outputs": [{"type": "uint256", "name": ""}]
  },
  {
    "type": "function",
    "name": "getTokenHoldersList",
    "constant": true,
    "stateMutability": "view",
    "inputs": [{"type": "uint256", "name": "_tokenId"}],
    "outputs": [{"type": "address[]", "name": ""}]
  },
  {
    "type": "event",
    "name": "AssetBought",
    "anonymous": false,
    "inputs": [
      {"type": "uint256", "name": "tokenId", "indexed": true},
      {"type": "address", "name": "buyer", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false},
      {"type": "uint256", "name": "platformFee", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "AssetSold",
    "anonymous": false,
    "inputs": [
      {"type": "uint256", "name": "tokenId", "indexed": true},
      {"type": "address", "name": "seller", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false},
      {"type": "uint256", "name": "platformFee", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "AssetWithdrawn",
    "anonymous": false,
    "inputs": [
      {"type": "uint256", "name": "tokenId", "indexed": true},
      {"type": "address", "name": "holder", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false}
    ]
  },
  {
    "type": "function",
    "name": "setPaymentSplitter",
    "constant": false,
    "inputs": [{"type": "address", "name": "_paymentSplitter"}],
    "outputs": []
  }
] as const;
