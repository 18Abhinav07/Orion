// TokenManagement Contract ABI
export const TOKEN_MANAGEMENT_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "requestId",
        type: "uint256"
      }
    ],
    name: "getRequestDetails",
    outputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256"
      },
      {
        internalType: "address",
        name: "requester",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool"
      },
      {
        internalType: "bool",
        name: "deployed",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "requestId",
        type: "uint256"
      }
    ],
    name: "approveRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "requestId",
        type: "uint256"
      }
    ],
    name: "deployToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];