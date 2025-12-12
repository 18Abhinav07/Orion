/**
 * Story Protocol Configuration
 * Network and contract addresses for Story Protocol integration
 */

export const STORY_PROTOCOL_CONFIG = {
  // Story Aeined Testnet
  STORY_AEINED_TESTNET: {
    chainId: 1315, // Story Aeined Testnet Chain ID
    name: 'Story Aeined Testnet',
    rpcUrl: 'https://aeneid.storyrpc.io',
    blockExplorer: 'https://testnet.storyscan.xyz',
    nativeCurrency: {
      name: 'IP',
      symbol: 'IP',
      decimals: 18
    },
    contracts: {
      // Story Protocol Core Contracts (Story Aeined Testnet)
      IP_ASSET_REGISTRY: '0x1a9d0d28a0422f26d31be72edc6f13ea4371e11b',
      LICENSING_MODULE: '0x5a7d9fa17de09350f481a53b470d798c1c1b7485',
      ROYALTY_MODULE: '0x16eF58e959522727588921A92e424025b49D4B29',

      // SPG (Story Protocol Gateway) - NFT Collection will be created
      SPG_NFT_CONTRACT: '', // TODO: Set after running createNFTCollection()

      // PIL (Programmable IP License) Template
      PIL_TEMPLATE: '0x58E2c909D557Cd23EF90D14f8fd21667A5Ae7a93',

      // Royalty Policy LAP (Liquid Absolute Percentage)
      LAP_ROYALTY_POLICY: '0x28b4F70ffE5ba7A26aEF979226f77Eb57fb9Fdb6',

      // Payment Tokens
      WIP_TOKEN_ADDRESS: '0xB132A6B7AE652c974EE1557A3521D53d18F6739f', // Story's native wrapped IP token
      USDC_ADDRESS: '', // USDC on Story Testnet (if available)
    }
  }
} as const;

// Active Story Protocol network
export const ACTIVE_STORY_NETWORK = 'STORY_AEINED_TESTNET' as const;

// Export active Story Protocol config
export const STORY_CONFIG = STORY_PROTOCOL_CONFIG[ACTIVE_STORY_NETWORK];

// Export contract addresses for convenience
export const STORY_CONTRACTS = STORY_CONFIG.contracts;

/**
 * SPG NFT Collection Configuration
 * These values are used when creating the platform's NFT collection
 */
export const SPG_COLLECTION_CONFIG = {
  name: 'IP-OPS Creative Assets',
  symbol: 'IPOPS',
  isPublicMinting: true, // Allow all verified issuers to mint
  mintOpen: true,
  mintFeeRecipient: '0x...', // TODO: Set platform wallet address
  contractURI: '', // Optional: IPFS URI for collection metadata
} as const;

/**
 * Default License Terms Configuration
 * Commercial Remix PIL with 10% royalty
 */
export const DEFAULT_LICENSE_TERMS = {
  commercialUse: true,
  derivativesAllowed: true,
  commercialRevShare: 1000, // 10% in basis points (1000 = 10%)
  currency: STORY_CONTRACTS.USDC_ADDRESS,
  defaultMintingFee: 0, // Free for MVP, can be set to paid later
} as const;

/**
 * Similarity Detection Thresholds
 * Based on content fingerprinting scores
 */
export const SIMILARITY_THRESHOLDS = {
  CLEAN: 40, // < 40% = Original content
  WARNING: 70, // 40-70% = Suggest user to review
  REVIEW_REQUIRED: 90, // 70-90% = Admin review required
  DERIVATIVE: 90, // >= 90% = Force derivative registration
} as const;

/**
 * IP Types supported by the platform
 */
export const IP_TYPES = ['Text', 'Image', 'Video', 'Audio'] as const;
export type IPType = typeof IP_TYPES[number];

/**
 * Utility: Check if Story Protocol network is configured
 */
export const isStoryProtocolConfigured = (): boolean => {
  return STORY_CONFIG.chainId === 1315 &&
         STORY_CONTRACTS.IP_ASSET_REGISTRY.length > 0;
};

/**
 * Utility: Get Story Protocol explorer URL for transaction
 */
export const getStoryExplorerUrl = (txHash: string): string => {
  return `${STORY_CONFIG.blockExplorer}/tx/${txHash}`;
};

/**
 * Utility: Get Story Protocol explorer URL for IP Asset
 */
export const getIPAssetExplorerUrl = (ipId: string): string => {
  return `${STORY_CONFIG.blockExplorer}/address/${ipId}`;
};
