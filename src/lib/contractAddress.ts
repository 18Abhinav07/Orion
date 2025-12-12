// Contract Addresses Configuration
// Update these addresses when contracts are redeployed

export const CONTRACT_ADDRESSES = {
  // U2U Nebulas Testnet (Legacy)
  U2U_LEGACY_TESTNET: {
    ADMIN: "0xFC53E7A6b94173D82d07a127A38d9D852bf478d4",
    ERC1155_CORE: "0x7C082010BcF338675508E2FD9d6C0dD2E43b37d8",
    ISSUER: "0xad367F8b04bC9C373aDcE2a1E797A3c4f1aD5D78", 
    MARKETPLACE: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF",
    PAYMENT_SPLITTER: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91"
  },
    // U2U Nebulas Testnet (ERC-3643 Platform)
  U2U_NEBULAS_TESTNET: {
    // FLOW TESTNET: Updated with latest deployed contract addresses from deployment
    ADMIN: "0xFC53E7A6b94173D82d07a127A38d9D852bf478d4", // Flow testnet Admin contract
    USER_REGISTRY: "0xa9E9DA96A74Ac7d7411426e9B794280BaB49AFBF", // OLD: Not used in new deployment
    TOKEN: "0x7C082010BcF338675508E2FD9d6C0dD2E43b37d8", // Flow testnet ERC1155Core (UPDATED)
    ISSUER: "0xad367F8b04bC9C373aDcE2a1E797A3c4f1aD5D78", // Flow testnet Issuer contract
    MARKETPLACE: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF", // Flow testnet Marketplace (UPDATED)
    TOKEN_MANAGEMENT: "0xA632A492cCd898De4a4B17DC786B381d099F5815", // Flow testnet TokenManagement (UPDATED)
    SECONDARY_MARKETPLACE: "0xD68805CeC8704e0E262Afa2289EB298b1bD98ce8", // ERC-3643 secondary marketplace for P2P trading
    ORDER_BOOK_ESCROW: "0x0E3b53858E1F086D6ff1a1613e2d0d951237E949", // Flow testnet OrderBookEscrow
    PAYMENT_SPLITTER: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91", // Flow testnet PaymentSplitter (UPDATED)
    
    // ERC-3643 Compliance Contracts
    IDENTITY_REGISTRY: "0x1667Cd2BB3715539C8c232D7cE256dd891Aa6923",
    CLAIM_ISSUERS_REGISTRY: "0x767FA150B3007ff446ff8f37b3116cA200BC0197",
    RULE_CONTRACT: "0xdAfc108538b0178071B648BDF5E6295d7eCf7A7C",
    ASSET_REGISTRY: "0xB6391254407b51e87dB45eCB3CEF9C2f96aad75B",
    MASTER_TOKEN: "0x2ccb132b985d096dF1A1bFAd1432CD79947295Ad",
    MULTISIG: "0x541cD0763c52ac9304A099b48fC81554Dd0A0493",
    TOKEN_FACTORY: "0xF9f94692001602b5E4AEe778659814593B9315C4",
    ERC3643_MARKETPLACE: "0xD68805CeC8704e0E262Afa2289EB298b1bD98ce8",
    WATERFALL_CONTRACT: "0xC6D5Eca0d7390bf95e5331EbD4274D3b177961e8",
    MOCK_KYC_VENDOR: "0x2B0426A3ECE73A9E2e361f111d96bdc6b13495a3",
    MOCK_LAW_FIRM: "0x56CFAFDdb032BCb5c1697053993aB3406efd6Eb9",
    MOCK_STABLECOIN: "0x40ACd6248Af692021C82b8333092De184c6e33Ff",
    MOCK_SPV_BANK_FEED: "0x0b0fD8855a03Bcd63CfA5A1fC6145FF3552c96a4",
    MERKLE_KYC: "0x65374809f4201Ac29E8176db4B764a0ae360ff56"
  },

  // Story Protocol Aeneid Testnet (IP Asset Management)
  STORY_AENEID_TESTNET: {
    // Orion Custom Contracts (Deployed Dec 12, 2025 - with RegistrationWorkflows)
    ORION_VERIFIED_MINTER: "0x1B014A3a16E5AF7D1207646f35AFD2b08535c1EB", // Custom wrapper with backend signature verification
    SPG_NFT_COLLECTION: "0x78AD3d22E62824945DED384a5542Ad65de16E637", // SPG collection for IP asset minting
    
    // Story Protocol Core Contracts (Provided by Story Protocol)
    IP_ASSET_REGISTRY: "0x77319B4031e6eF1250907aa00018B8B1c67a244b", // Central IP registry
    LICENSING_MODULE: "0x5a7D9Fa17DE09350F481A53B470D798c1c1aabae", // License attachment and verification
    ROYALTY_MODULE: "0x3C27b2d6C0a1C5c8A79b6753F32e4c5e3e3f5F1e", // Royalty payment distribution
    REGISTRATION_WORKFLOWS: "0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424", // SPG creation and registration
    
    // Collection Configuration
    COLLECTION_NAME: "Orion IP-OPS Assets",
    COLLECTION_SYMBOL: "ORION",
    MAX_SUPPLY: 100, // Initial limit, can be updated
    MINT_FEE: 0, // Free minting (platform charges via backend)
    IS_PUBLIC_MINTING: true, // Wrapper contract can mint
    
    // Backend Verification
    BACKEND_VERIFIER_ADDRESS: "0x23e67597f0898f747Fa3291C8920168adF9455D0", // Public address for signature verification
    TOKEN_EXPIRY_SECONDS: 900 // 15 minutes
  }
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  U2U_LEGACY_TESTNET: {
    chainId: 747,
    name: "Flow Mainnet",
    rpcUrl: "https://mainnet.evm.nodes.onflow.org",
    blockExplorer: "https://u2uscan.xyz",
    nativeCurrency: {
      name: "FLOW",
      symbol: "FLOW",
      decimals: 18
    }
  },
  U2U_NEBULAS_TESTNET: {
    chainId: 747,
    name: "Flow Mainnet",
    rpcUrl: "https://mainnet.evm.nodes.onflow.org",
    blockExplorer: "https://www.flowscan.io",
    nativeCurrency: {
      name: "FLOW",
      symbol: "FLOW",
      decimals: 18
    }
  },
  STORY_AENEID_TESTNET: {
    chainId: Number(import.meta.env.VITE_STORY_CHAIN_ID) || 1315,
    name: "Story Protocol Aeneid Testnet",
    rpcUrl: import.meta.env.VITE_STORY_RPC_URL || "https://aeneid.storyrpc.io",
    blockExplorer: import.meta.env.VITE_STORY_EXPLORER || "https://aeneid.storyscan.xyz",
    nativeCurrency: {
      name: "IP Token",
      symbol: "IP",
      decimals: 18
    }
  }
} as const;

// Current active network (change this to switch networks)
export const ACTIVE_NETWORK = "U2U_NEBULAS_TESTNET" as const;

// Export active contract addresses for easy import
export const CONTRACTS = CONTRACT_ADDRESSES[ACTIVE_NETWORK];

// Individual contract exports for convenience
export const ADMIN_CONTRACT = CONTRACTS.ADMIN;
export const USER_REGISTRY_CONTRACT = CONTRACTS.USER_REGISTRY;
export const TOKEN_CONTRACT = CONTRACTS.TOKEN;
export const ISSUER_CONTRACT = CONTRACTS.ISSUER;
export const MARKETPLACE_CONTRACT = CONTRACTS.MARKETPLACE;
export const TOKEN_MANAGEMENT_CONTRACT = CONTRACTS.TOKEN_MANAGEMENT;
export const ORDER_BOOK_ESCROW_CONTRACT = CONTRACTS.ORDER_BOOK_ESCROW;
export const PAYMENT_SPLITTER_CONTRACT = CONTRACTS.PAYMENT_SPLITTER;

// Type definitions
export type NetworkName = keyof typeof CONTRACT_ADDRESSES;
export type ContractName = keyof typeof CONTRACT_ADDRESSES.U2U_NEBULAS_TESTNET;

// Utility function to get contract address by name
export const getContractAddress = (contractName: ContractName, network: NetworkName = ACTIVE_NETWORK): string => {
  return CONTRACT_ADDRESSES[network][contractName];
};

// Utility function to get all contracts for a network
export const getNetworkContracts = (network: NetworkName = ACTIVE_NETWORK) => {
  return CONTRACT_ADDRESSES[network];
};

// Validation function to check if all addresses are set
export const validateContractAddresses = (network: NetworkName = ACTIVE_NETWORK): boolean => {
  const contracts = CONTRACT_ADDRESSES[network];
  return Object.values(contracts).every((address: string) => 
    address && address.length === 42 && address.startsWith("0x")
  );
};