// ABI for SecondaryMarketBridge contract
export const SECONDARY_MARKET_BRIDGE_ABI = [
  // Bridge Functions
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "bridgeToP2P",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "pricePerToken", "type": "uint256"},
      {"internalType": "uint256", "name": "expiryTimestamp", "type": "uint256"}
    ],
    "name": "createP2PSellOrder",
    "outputs": [{"internalType": "uint256", "name": "orderId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "orderId", "type": "uint256"},
      {"internalType": "uint256", "name": "amountToBuy", "type": "uint256"}
    ],
    "name": "buyFromP2P",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getBridgedHoldings",
    "outputs": [
      {"internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]"},
      {"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"},
      {"internalType": "address[]", "name": "wrappedAddresses", "type": "address[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "getP2POrders",
    "outputs": [{"internalType": "uint256[]", "name": "orderIds", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "getWrappedTokenInfo",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "originalTokenId", "type": "uint256"},
          {"internalType": "address", "name": "wrappedAddress", "type": "address"},
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "symbol", "type": "string"},
          {"internalType": "uint256", "name": "totalBridged", "type": "uint256"},
          {"internalType": "bool", "name": "isActive", "type": "bool"}
        ],
        "internalType": "struct SecondaryMarketBridge.WrappedToken",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "address", "name": "wrappedToken", "type": "address"}
    ],
    "name": "TokenBridged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "seller", "type": "address"},
      {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "price", "type": "uint256"}
    ],
    "name": "P2POrderCreated",
    "type": "event"
  }
];

// ABI for ERC-3643 Marketplace contract
export const ERC3643_MARKETPLACE_ABI = [
  // Order Management
  {
    "inputs": [
      {"internalType": "address", "name": "tokenContract", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "pricePerToken", "type": "uint256"},
      {"internalType": "uint256", "name": "expiryTimestamp", "type": "uint256"}
    ],
    "name": "createSellOrder",
    "outputs": [{"internalType": "uint256", "name": "orderId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "orderId", "type": "uint256"},
      {"internalType": "uint256", "name": "amountToBuy", "type": "uint256"}
    ],
    "name": "buyTokens",
    "outputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "orderId", "type": "uint256"}
    ],
    "name": "cancelOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "tokenContract", "type": "address"}
    ],
    "name": "getActiveOrdersForToken",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getUserActiveOrders",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "tradeId", "type": "uint256"}
    ],
    "name": "getTrade",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "tradeId", "type": "uint256"},
          {"internalType": "uint256", "name": "orderId", "type": "uint256"},
          {"internalType": "address", "name": "buyer", "type": "address"},
          {"internalType": "address", "name": "seller", "type": "address"},
          {"internalType": "address", "name": "tokenContract", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "uint256", "name": "totalPrice", "type": "uint256"},
          {"internalType": "uint256", "name": "platformFee", "type": "uint256"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "internalType": "struct Marketplace.Trade",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "orderId", "type": "uint256"}
    ],
    "name": "orders",
    "outputs": [
      {"internalType": "uint256", "name": "orderId", "type": "uint256"},
      {"internalType": "address", "name": "seller", "type": "address"},
      {"internalType": "address", "name": "tokenContract", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "pricePerToken", "type": "uint256"},
      {"internalType": "uint256", "name": "totalPrice", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
      {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
      {"internalType": "uint256", "name": "expiryTimestamp", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "tokenContract", "type": "address"}
    ],
    "name": "getOrderBookDepth",
    "outputs": [
      {"internalType": "uint256", "name": "totalOrders", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVolume", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "tokenContract", "type": "address"}
    ],
    "name": "getBestAskPrice",
    "outputs": [
      {"internalType": "uint256", "name": "bestPrice", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "orderId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "seller", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "tokenContract", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "pricePerToken", "type": "uint256"}
    ],
    "name": "OrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "orderId", "type": "uint256"},
      {"indexed": true, "internalType": "uint256", "name": "tradeId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "buyer", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "totalPrice", "type": "uint256"}
    ],
    "name": "OrderFilled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "tradeId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "buyer", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "seller", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "tokenContract", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "totalPrice", "type": "uint256"}
    ],
    "name": "TradeExecuted",
    "type": "event"
  }
];

// ABI for KYCBridge contract
export const KYC_BRIDGE_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "registerUserKYC",
    "outputs": [{"internalType": "bool", "name": "success", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "isKYCVerified",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "verifyUserForTrading",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address[]", "name": "users", "type": "address[]"}
    ],
    "name": "batchVerifyUsers",
    "outputs": [{"internalType": "bool[]", "name": "results", "type": "bool[]"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getUserDetails",
    "outputs": [
      {"internalType": "bool", "name": "registered", "type": "bool"},
      {"internalType": "uint256", "name": "regTimestamp", "type": "uint256"},
      {"internalType": "bool", "name": "kycStatus", "type": "bool"},
      {"internalType": "uint256", "name": "kycTimestamp", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // PRIMARY MARKETPLACE COMPATIBILITY - Add getAllListings for issuer portfolio
  {
    "inputs": [],
    "name": "getAllListings",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "tokenIds",
        "type": "uint256[]"
      },
      {
        "internalType": "address[]",
        "name": "issuers", 
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "prices",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Contract addresses (these would be deployed addresses)
export const SECONDARY_MARKET_CONTRACTS = {
  BRIDGE: '0xedD1b33e41CB0479074775D32DA68f1365F78BEd', // From Phase 2 deployment
  ERC3643_MARKETPLACE: '0xD68805CeC8704e0E262Afa2289EB298b1bD98ce8', // From Phase 1 deployment
  KYC_BRIDGE: '0x85E8cd971E41d5c0C481CECF72dE86e69B125ccB', // From Phase 2 deployment
  ENHANCED_MARKETPLACE: '0x38Da8Af0E9Bb2f3572B69A32332fc0532ae4B104' // From Phase 2 deployment
};

// Helper function to get contract address by name
export const getSecondaryMarketContract = (contractName: keyof typeof SECONDARY_MARKET_CONTRACTS): string => {
  return SECONDARY_MARKET_CONTRACTS[contractName];
};