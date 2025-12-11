// TokenFactory Contract ABI for ERC-3643 System (Issuer Contract)
export const TOKEN_FACTORY_ABI = [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "assetId",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "spvWallet",
        type: "address"
      },
      {
        internalType: "string",
        name: "name",
        type: "string"
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string"
      },
      {
        internalType: "uint8",
        name: "decimals",
        type: "uint8"
      },
      {
        internalType: "address",
        name: "identityRegistry",
        type: "address"
      },
      {
        internalType: "address",
        name: "compliance",
        type: "address"
      },
      {
        internalType: "bytes32[]",
        name: "attestationIds",
        type: "bytes32[]"
      }
    ],
    name: "deployToken",
    outputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32[]",
        name: "assetIds",
        type: "bytes32[]"
      },
      {
        internalType: "address[]",
        name: "spvWallets",
        type: "address[]"
      },
      {
        internalType: "string[]",
        name: "names",
        type: "string[]"
      },
      {
        internalType: "string[]",
        name: "symbols",
        type: "string[]"
      }
    ],
    name: "batchDeployTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getDeployedAssets",
    outputs: [
      {
        internalType: "bytes32[]",
        name: "",
        type: "bytes32[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getDeployedAssetsCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256"
      }
    ],
    name: "getDeployedAssetAt",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "assetId",
        type: "bytes32"
      }
    ],
    name: "getTokenDeployment",
    outputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "assetId",
            type: "bytes32"
          },
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address"
          },
          {
            internalType: "address",
            name: "spvWallet",
            type: "address"
          },
          {
            internalType: "address",
            name: "compliance",
            type: "address"
          },
          {
            internalType: "bool",
            name: "isActive",
            type: "bool"
          },
          {
            internalType: "uint256",
            name: "deploymentTimestamp",
            type: "uint256"
          }
        ],
        internalType: "struct ITokenFactory.TokenDeployment",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "assetId",
        type: "bytes32"
      }
    ],
    name: "enableMinting",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "assetId",
        type: "bytes32"
      }
    ],
    name: "disableMinting",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "assetId",
        type: "bytes32"
      }
    ],
    name: "isMintingEnabled",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "assetRegistry",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "masterToken",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];