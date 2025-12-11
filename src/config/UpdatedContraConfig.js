// Enhanced Invoice Financing Contract Configuration
// Deployed on Flow Testnet - Ready for Frontend Integration

// Network Configuration
export const NETWORK_CONFIG = {
  // Flow Testnet Configuration
  TESTNET: {
    chainId: 747,
    name: "Flow Testnet",
    rpcUrl: "https://mainnet.evm.nodes.onflow.org",
    blockExplorer: "https://www.flowscan.io/",
    nativeCurrency: {
      name: "Flow",
      symbol: "FLOW",
      decimals: 18
    }
  },
  
  // Flow Mainnet Configuration (for future use)
  MAINNET: {
    chainId: 747,
    name: "Flow Mainnet",
    rpcUrl: "https://mainnet.evm.nodes.onflow.org", 
    blockExplorer: "https://evm.flowscan.io/",
    nativeCurrency: {
      name: "Flow",
      symbol: "FLOW",
      decimals: 18
    }
  }
};

// Contract Addresses - Flow Testnet
export const CONTRACT_ADDRESSES = {
  // Core Contracts
  ADMIN: "0xFC53E7A6b94173D82d07a127A38d9D852bf478d4",
  TOKEN_CONTRACT: "0x7C082010BcF338675508E2FD9d6C0dD2E43b37d8",
  MARKETPLACE: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF",
  PAYMENT_SPLITTER: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91",
  TOKEN_MANAGEMENT: "0xA632A492cCd898De4a4B17DC786B381d099F5815"
};

// Contract Names Mapping
export const CONTRACT_NAMES = {
  [CONTRACT_ADDRESSES.ADMIN]: "Admin",
  [CONTRACT_ADDRESSES.TOKEN_CONTRACT]: "ERC1155Core",
  [CONTRACT_ADDRESSES.MARKETPLACE]: "Marketplace", 
  [CONTRACT_ADDRESSES.PAYMENT_SPLITTER]: "PaymentSplitter",
  [CONTRACT_ADDRESSES.TOKEN_MANAGEMENT]: "TokenManagement"
};

// Contract Roles and Permissions
export const CONTRACT_ROLES = {
  ADMIN: {
    address: CONTRACT_ADDRESSES.ADMIN,
    permissions: [
      "Add/Remove Issuers",
      "Add/Remove Managers", 
      "Approve Token Requests",
      "Manual Invoice Settlement",
      "Pause/Unpause Marketplace",
      "Assign Managers to Tokens"
    ]
  },
  
  ISSUER: {
    permissions: [
      "Submit Token Requests",
      "Deploy Approved Tokens",
      "List Tokens on Marketplace",
      "Update Token Prices"
    ]
  },
  
  MANAGER: {
    permissions: [
      "Process Invoice Settlements",
      "Submit Rental Payments",
      "Manage Assigned Tokens"
    ]
  }
};

// Token Lifecycle States
export const TOKEN_LIFECYCLE = {
  ACTIVE: 0,
  SETTLED: 1, 
  BURNED: 2
};

export const TOKEN_LIFECYCLE_NAMES = {
  [TOKEN_LIFECYCLE.ACTIVE]: "Active",
  [TOKEN_LIFECYCLE.SETTLED]: "Settled",
  [TOKEN_LIFECYCLE.BURNED]: "Burned"
};

// Request Status States
export const REQUEST_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  DEPLOYED: 3,
  LISTED: 4,
  SETTLED: 5
};

export const REQUEST_STATUS_NAMES = {
  [REQUEST_STATUS.PENDING]: "Pending",
  [REQUEST_STATUS.APPROVED]: "Approved", 
  [REQUEST_STATUS.REJECTED]: "Rejected",
  [REQUEST_STATUS.DEPLOYED]: "Deployed",
  [REQUEST_STATUS.LISTED]: "Listed",
  [REQUEST_STATUS.SETTLED]: "Settled"
};

// Platform Configuration
export const PLATFORM_CONFIG = {
  PLATFORM_FEE_PERCENT: 1, // 1% platform fee
  DEFAULT_GAS_LIMIT: 800000,
  DEFAULT_GAS_PRICE: "1000000000", // 1 Gwei
  
  // Event Block Range for History
  EVENT_BLOCK_RANGE: 10000,
  
  // UI Configuration
  DEFAULT_TOKEN_DECIMALS: 18,
  MAX_APPROVAL_AMOUNT: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
};

// Contract Event Names
export const EVENTS = {
  // Admin Events
  ISSUER_ADDED: "IssuerAdded",
  MANAGER_ADDED: "ManagerAdded", 
  MARKETPLACE_PAUSED: "MarketplacePaused",
  INVOICE_SETTLED_BY_ADMIN: "InvoiceSettledByAdmin",
  
  // Token Events
  TOKEN_MINTED: "TokenMinted",
  INVOICE_SETTLED: "InvoiceSettled",
  TOKEN_BURNED: "TokenBurned",
  LIFECYCLE_CHANGED: "LifecycleChanged",
  
  // TokenManagement Events
  TOKEN_REQUEST_SUBMITTED: "TokenRequestSubmitted",
  TOKEN_REQUEST_APPROVED: "TokenRequestApproved",
  TOKEN_REQUEST_REJECTED: "TokenRequestRejected", 
  TOKEN_DEPLOYED: "TokenDeployed",
  TOKEN_LISTED_ON_MARKETPLACE: "TokenListedOnMarketplace",
  TOKEN_REQUEST_SETTLED: "TokenRequestSettled",
  
  // Marketplace Events
  ASSET_LISTED: "AssetListed",
  ASSET_BOUGHT: "AssetBought",
  ASSET_SOLD: "AssetSold",
  ASSET_WITHDRAWN: "AssetWithdrawn",
  EARNINGS_WITHDRAWN: "EarningsWithdrawn",
  LISTING_REMOVED: "ListingRemoved",
  LISTING_UPDATED: "ListingUpdated",
  
  // PaymentSplitter Events
  RENTAL_DISTRIBUTED: "RentalDistributed",
  TOKEN_BURN_INITIATED: "TokenBurnInitiated"
};

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: "Please connect your wallet first",
  INSUFFICIENT_BALANCE: "Insufficient balance for this transaction",
  TRANSACTION_REJECTED: "Transaction was rejected by user",
  NETWORK_MISMATCH: "Please switch to Flow Testnet",
  CONTRACT_ERROR: "Contract interaction failed",
  UNAUTHORIZED: "You don't have permission for this action",
  INVALID_TOKEN: "Invalid token ID or token not found",
  TOKEN_NOT_TRADEABLE: "This token cannot be traded (settled or burned)",
  ALREADY_SETTLED: "This invoice has already been settled",
  INSUFFICIENT_PAYMENT: "Payment amount is insufficient"
};

// Success Messages
export const SUCCESS_MESSAGES = {
  TRANSACTION_SENT: "Transaction sent successfully",
  ISSUER_ADDED: "Issuer added successfully",
  MANAGER_ADDED: "Manager added successfully", 
  TOKEN_REQUEST_SUBMITTED: "Token request submitted for approval",
  TOKEN_REQUEST_APPROVED: "Token request approved",
  TOKEN_DEPLOYED: "Token deployed successfully",
  TOKEN_LISTED: "Token listed on marketplace",
  TOKEN_PURCHASED: "Tokens purchased successfully",
  INVOICE_SETTLED: "Invoice settled successfully",
  TOKENS_BURNED: "Tokens burned after settlement"
};

// Helper function to get current network config
export const getCurrentNetworkConfig = () => {
  // For now, default to testnet - can be made dynamic based on wallet network
  return NETWORK_CONFIG.TESTNET;
};

// Helper function to validate network
export const isValidNetwork = (chainId) => {
  return chainId === NETWORK_CONFIG.TESTNET.chainId || chainId === NETWORK_CONFIG.MAINNET.chainId;
};

// Contract Deployment Information
export const DEPLOYMENT_INFO = {
  network: "Flow Testnet",
  deploymentDate: "2025-10-30",
  blockNumber: null, // Can be updated with actual deployment block
  deployer: "0x827ad74308031A05c6D1b9c732E195A63BC8602e",
  verified: true,
  features: [
    "Automatic Token Burning after Settlement",
    "Proportional Settlement Distribution", 
    "Trading Prevention for Settled Tokens",
    "Complete Lifecycle Tracking",
    "Settlement History and Reporting",
    "Admin Oversight Capabilities",
    "Frontend Integration Ready"
  ]
};

export default {
  NETWORK_CONFIG,
  CONTRACT_ADDRESSES,
  CONTRACT_NAMES,
  CONTRACT_ROLES,
  TOKEN_LIFECYCLE,
  TOKEN_LIFECYCLE_NAMES,
  REQUEST_STATUS, 
  REQUEST_STATUS_NAMES,
  PLATFORM_CONFIG,
  EVENTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  getCurrentNetworkConfig,
  isValidNetwork,
  DEPLOYMENT_INFO
};