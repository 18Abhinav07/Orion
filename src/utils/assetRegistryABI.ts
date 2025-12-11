// AssetRegistry Contract ABI for ERC-3643 System (Admin Contract)
export const ASSET_REGISTRY_ABI = [
  {
    inputs: [
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
        name: "compliance",
        type: "address"
      },
      {
        internalType: "bytes32[]",
        name: "attestationIds",
        type: "bytes32[]"
      }
    ],
    name: "registerAsset",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getAllAssets",
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
    name: "getActiveAssets", 
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
    inputs: [
      {
        internalType: "bytes32",
        name: "assetId",
        type: "bytes32"
      }
    ],
    name: "getAssetInfo",
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
            name: "compliance",
            type: "address"
          },
          {
            internalType: "bytes32[]",
            name: "attestationIds",
            type: "bytes32[]"
          },
          {
            internalType: "string",
            name: "ipfsMetadataCID",
            type: "string"
          },
          {
            internalType: "bool",
            name: "isActive",
            type: "bool"
          },
          {
            internalType: "uint256",
            name: "registrationTimestamp",
            type: "uint256"
          }
        ],
        internalType: "struct IAssetRegistry.AssetInfo",
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
    name: "reactivateAsset",
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
    name: "deactivateAsset",
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
    name: "isAssetActive",
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
    inputs: [
      {
        internalType: "bytes32",
        name: "assetId",
        type: "bytes32"
      }
    ],
    name: "getAssetMetadata",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
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
    name: "isAssetRegistered",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];