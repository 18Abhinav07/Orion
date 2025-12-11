// Generated ABI for OrderBookEscrow Contract
// Contract: OrderBookEscrow.sol
// Generated: Phase 1 Implementation

export const ORDER_BOOK_ESCROW_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_tokenContract",
        "type": "address"
      }
    ]
  },
  {
    "type": "event",
    "name": "SellOrderCreated",
    "inputs": [
      {
        "name": "orderId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "seller",
        "type": "address",
        "indexed": true
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "amount",
        "type": "uint256"
      },
      {
        "name": "pricePerToken",
        "type": "uint256"
      }
    ]
  },
  {
    "type": "event",
    "name": "BuyOrderCreated",
    "inputs": [
      {
        "name": "orderId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "buyer",
        "type": "address",
        "indexed": true
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "amount",
        "type": "uint256"
      },
      {
        "name": "pricePerToken",
        "type": "uint256"
      }
    ]
  },
  {
    "type": "event",
    "name": "OrderFilled",
    "inputs": [
      {
        "name": "orderId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "taker",
        "type": "address",
        "indexed": true
      },
      {
        "name": "amount",
        "type": "uint256"
      },
      {
        "name": "totalPrice",
        "type": "uint256"
      }
    ]
  },
  {
    "type": "event",
    "name": "OrderCancelled",
    "inputs": [
      {
        "name": "orderId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "maker",
        "type": "address",
        "indexed": true
      }
    ]
  },
  {
    "type": "function",
    "name": "createSellOrder",
    "inputs": [
      {
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "name": "_amount",
        "type": "uint256"
      },
      {
        "name": "_pricePerTokenU2U",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "orderId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createBuyOrder",
    "inputs": [
      {
        "name": "_tokenId",
        "type": "uint256"
      },
      {
        "name": "_amount",
        "type": "uint256"
      },
      {
        "name": "_pricePerTokenU2U",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "orderId",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "fillOrder",
    "inputs": [
      {
        "name": "_orderId",
        "type": "uint256"
      },
      {
        "name": "_amountToFill",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "cancelOrder",
    "inputs": [
      {
        "name": "_orderId",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getActiveOrders",
    "inputs": [
      {
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "sellOrders",
        "type": "uint256[]"
      },
      {
        "name": "buyOrders",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "activeOrders",
    "inputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "orderId",
        "type": "uint256"
      },
      {
        "name": "maker",
        "type": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256"
      },
      {
        "name": "pricePerTokenU2U",
        "type": "uint256"
      },
      {
        "name": "isBuyOrder",
        "type": "bool"
      },
      {
        "name": "isActive",
        "type": "bool"
      },
      {
        "name": "isFilled",
        "type": "bool"
      },
      {
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "name": "expiryTimestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEscrowedAssets",
    "inputs": [
      {
        "name": "_user",
        "type": "address"
      },
      {
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEscrowedU2U",
    "inputs": [
      {
        "name": "_user",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserOrders",
    "inputs": [
      {
        "name": "_user",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBestAskPrice",
    "inputs": [
      {
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "bestPrice",
        "type": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBestBidPrice",
    "inputs": [
      {
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "bestPrice",
        "type": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenContract",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextOrderId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "PLATFORM_FEE_PERCENT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "onERC1155Received",
    "inputs": [
      {
        "name": "",
        "type": "address"
      },
      {
        "name": "",
        "type": "address"
      },
      {
        "name": "",
        "type": "uint256"
      },
      {
        "name": "",
        "type": "uint256"
      },
      {
        "name": "",
        "type": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "onERC1155BatchReceived",
    "inputs": [
      {
        "name": "",
        "type": "address"
      },
      {
        "name": "",
        "type": "address"
      },
      {
        "name": "",
        "type": "uint256[]"
      },
      {
        "name": "",
        "type": "uint256[]"
      },
      {
        "name": "",
        "type": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes4"
      }
    ],
    "stateMutability": "pure"
  }
] as const;