/**
 * Story Protocol Service
 * Frontend SDK wrapper for Story Protocol interactions
 * All Story SDK calls are made from FRONTEND, results sent to backend for caching
 */

import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { Address, http, createPublicClient, createWalletClient, custom } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { odyssey } from '@story-protocol/core-sdk/chains';
import { STORY_CONFIG, STORY_CONTRACTS, DEFAULT_LICENSE_TERMS } from '../lib/storyProtocolConfig';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface IPMetadata {
  ipMetadataURI: string;
  ipMetadataHash: `0x${string}`;
  nftMetadataURI: string;
  nftMetadataHash: `0x${string}`;
}

interface RegisterIPResult {
  ipId: Address;
  tokenId: bigint;
  txHash: string;
}

interface RegisterIPWithLicenseResult {
  ipId: Address;
  tokenId: bigint;
  licenseTermsId: bigint;
  txHash: string;
}

interface MintLicenseResult {
  licenseTokenIds: bigint[];
  txHash: string;
}

interface RegisterDerivativeResult {
  txHash: string;
}

interface ClaimRevenueResult {
  claimableRevenue: bigint;
  txHash: string;
}

// ============================================
// STORY PROTOCOL SERVICE CLASS
// ============================================

export class StoryProtocolService {
  private client: StoryClient | null = null;
  private walletClient: any = null;
  private publicClient: any = null;
  private userAddress: Address | null = null;
  private isInitialized: boolean = false;

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Initialize Story Protocol client with user's MetaMask wallet
   * Called from frontend when user connects wallet
   */
  async initialize(address: Address, ethersSigner: any): Promise<void> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      // Create viem wallet client from MetaMask
      this.walletClient = createWalletClient({
        account: address,
        chain: odyssey, // Story Aeined Testnet
        transport: custom(window.ethereum)
      });

      // Create public client for read operations
      this.publicClient = createPublicClient({
        chain: odyssey,
        transport: http(STORY_CONFIG.rpcUrl)
      });

      // Initialize Story Protocol SDK
      const config: StoryConfig = {
        account: this.walletClient.account,
        transport: http(STORY_CONFIG.rpcUrl),
        chainId: 'odyssey' // Story Aeined Testnet
      };

      this.client = StoryClient.newClient(config);
      this.userAddress = address;
      this.isInitialized = true;

      console.log('✅ Story Protocol SDK initialized for address:', address);
    } catch (error) {
      console.error('❌ Failed to initialize Story Protocol SDK:', error);
      throw error;
    }
  }

  /**
   * Check if SDK is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Get current user address
   */
  getAddress(): Address | null {
    return this.userAddress;
  }

  // ========================================
  // IP ASSET REGISTRATION
  // ========================================

  /**
   * Register IP Asset (Original Content)
   * Frontend calls this, then sends result to backend via POST /api/cache/ip-registration
   *
   * @param ipMetadata - IPFS metadata URIs and hashes
   * @returns IP ID, Token ID, Transaction Hash
   */
  async registerIpAsset(ipMetadata: IPMetadata): Promise<RegisterIPResult> {
    if (!this.isReady()) {
      throw new Error('Story Protocol SDK not initialized');
    }

    try {
      console.log('🔄 Registering IP Asset on Story Protocol...');

      const response = await this.client!.ipAsset.register({
        nftContract: STORY_CONTRACTS.SPG_NFT_CONTRACT as Address,
        tokenId: '0', // Auto-increment
        ipMetadata: {
          ipMetadataURI: ipMetadata.ipMetadataURI,
          ipMetadataHash: ipMetadata.ipMetadataHash,
          nftMetadataURI: ipMetadata.nftMetadataURI,
          nftMetadataHash: ipMetadata.nftMetadataHash
        },
        txOptions: { waitForTransaction: true }
      });

      console.log('✅ IP Asset registered:', response.ipId);

      return {
        ipId: response.ipId as Address,
        tokenId: BigInt(response.tokenId || 0),
        txHash: response.txHash || ''
      };
    } catch (error) {
      console.error('❌ Failed to register IP Asset:', error);
      throw error;
    }
  }

  /**
   * Register IP Asset WITH License Terms (Combined Function)
   * Recommended: Uses mintAndRegisterIpAndAttachPILTerms for single transaction
   *
   * @param ipMetadata - IPFS metadata
   * @param royaltyPercent - Royalty percentage (0-100)
   * @returns IP ID, Token ID, License Terms ID, Transaction Hash
   */
  async registerIpAssetWithLicense(
    ipMetadata: IPMetadata,
    royaltyPercent: number = 10
  ): Promise<RegisterIPWithLicenseResult> {
    if (!this.isReady()) {
      throw new Error('Story Protocol SDK not initialized');
    }

    try {
      console.log('🔄 Registering IP Asset with License Terms...');

      const response = await this.client!.ipAsset.mintAndRegisterIpAndAttachPILTerms({
        spgNftContract: STORY_CONTRACTS.SPG_NFT_CONTRACT as Address,
        pilType: 'commercialRemix', // Commercial use + derivatives allowed
        ipMetadata: {
          ipMetadataURI: ipMetadata.ipMetadataURI,
          ipMetadataHash: ipMetadata.ipMetadataHash,
          nftMetadataURI: ipMetadata.nftMetadataURI,
          nftMetadataHash: ipMetadata.nftMetadataHash
        },
        commercialRevShare: royaltyPercent * 100, // Convert to basis points (10% = 1000)
        currency: STORY_CONTRACTS.WIP_TOKEN_ADDRESS as Address,
        mintingFee: DEFAULT_LICENSE_TERMS.defaultMintingFee.toString(),
        txOptions: { waitForTransaction: true }
      });

      console.log('✅ IP Asset registered with license:', response.ipId);

      return {
        ipId: response.ipId as Address,
        tokenId: BigInt(response.tokenId || 0),
        licenseTermsId: BigInt(response.licenseTermsId || 0),
        txHash: response.txHash || ''
      };
    } catch (error) {
      console.error('❌ Failed to register IP with license:', error);
      throw error;
    }
  }

  // ========================================
  // LICENSE MINTING
  // ========================================

  /**
   * Mint License Tokens (User buys permission to use IP)
   * Frontend calls this, then sends result to backend via POST /api/cache/license-minting
   *
   * @param licensorIpId - Parent IP being licensed
   * @param licenseTermsId - License terms ID from registration
   * @param amount - Number of licenses to mint
   * @param receiver - Recipient address (buyer)
   * @returns License Token IDs, Transaction Hash
   */
  async mintLicenseTokens(
    licensorIpId: Address,
    licenseTermsId: string,
    amount: number = 1,
    receiver?: Address
  ): Promise<MintLicenseResult> {
    if (!this.isReady()) {
      throw new Error('Story Protocol SDK not initialized');
    }

    const recipientAddress = receiver || this.userAddress!;

    try {
      console.log('🔄 Minting license tokens...');

      const response = await this.client!.license.mintLicenseTokens({
        licensorIpId: licensorIpId,
        licenseTemplate: STORY_CONTRACTS.PIL_TEMPLATE as Address,
        licenseTermsId: BigInt(licenseTermsId),
        amount: amount,
        receiver: recipientAddress,
        txOptions: { waitForTransaction: true }
      });

      console.log('✅ License tokens minted:', response.licenseTokenIds);

      return {
        licenseTokenIds: response.licenseTokenIds || [],
        txHash: response.txHash || ''
      };
    } catch (error) {
      console.error('❌ Failed to mint license tokens:', error);
      throw error;
    }
  }

  // ========================================
  // DERIVATIVE REGISTRATION
  // ========================================

  /**
   * Register Derivative IP (Links child to parent)
   * Frontend calls this when similarity score >= 90%
   * Then sends result to backend via POST /api/cache/derivative-registration
   *
   * @param childIpId - Derivative IP ID (register this first!)
   * @param parentIpIds - Array of parent IP IDs
   * @param licenseTermsIds - License terms from each parent
   * @returns Transaction Hash
   */
  async registerDerivative(
    childIpId: Address,
    parentIpIds: Address[],
    licenseTermsIds: string[]
  ): Promise<RegisterDerivativeResult> {
    if (!this.isReady()) {
      throw new Error('Story Protocol SDK not initialized');
    }

    try {
      console.log('🔄 Registering derivative IP...');

      const response = await this.client!.ipAsset.registerDerivative({
        childIpId: childIpId,
        parentIpIds: parentIpIds,
        licenseTermsIds: licenseTermsIds.map(id => BigInt(id)),
        txOptions: { waitForTransaction: true }
      });

      console.log('✅ Derivative IP registered:', response.txHash);

      return {
        txHash: response.txHash || ''
      };
    } catch (error) {
      console.error('❌ Failed to register derivative:', error);
      throw error;
    }
  }

  /**
   * Register Derivative using License Tokens
   * Alternative method if user already has license tokens
   *
   * @param childIpId - Derivative IP ID
   * @param licenseTokenIds - License token IDs from mintLicenseTokens()
   * @returns Transaction Hash
   */
  async registerDerivativeWithLicenseTokens(
    childIpId: Address,
    licenseTokenIds: bigint[]
  ): Promise<RegisterDerivativeResult> {
    if (!this.isReady()) {
      throw new Error('Story Protocol SDK not initialized');
    }

    try {
      console.log('🔄 Registering derivative with license tokens...');

      const response = await this.client!.ipAsset.registerDerivativeWithLicenseTokens({
        childIpId: childIpId,
        licenseTokenIds: licenseTokenIds,
        txOptions: { waitForTransaction: true }
      });

      console.log('✅ Derivative registered with license tokens');

      return {
        txHash: response.txHash || ''
      };
    } catch (error) {
      console.error('❌ Failed to register derivative with tokens:', error);
      throw error;
    }
  }

  // ========================================
  // ROYALTY MANAGEMENT
  // ========================================

  /**
   * Claim Revenue from IP Royalty Vault
   * Creator claims earned royalties from derivatives
   *
   * @param snapshotIds - Revenue snapshot IDs
   * @param account - Claimer address
   * @param token - Currency token address
   * @returns Claimable revenue amount, Transaction Hash
   */
  async claimRevenue(
    snapshotIds: bigint[],
    account?: Address,
    token?: Address
  ): Promise<ClaimRevenueResult> {
    if (!this.isReady()) {
      throw new Error('Story Protocol SDK not initialized');
    }

    const claimerAddress = account || this.userAddress!;
    const currencyToken = token || (STORY_CONTRACTS.WIP_TOKEN_ADDRESS as Address);

    try {
      console.log('🔄 Claiming revenue...');

      const response = await this.client!.royalty.claimRevenue({
        snapshotIds: snapshotIds,
        royaltyVaultIpId: claimerAddress, // IP ID of the claimer
        token: currencyToken,
        txOptions: { waitForTransaction: true }
      });

      console.log('✅ Revenue claimed:', response.claimableRevenue);

      return {
        claimableRevenue: BigInt(response.claimableRevenue || 0),
        txHash: response.txHash || ''
      };
    } catch (error) {
      console.error('❌ Failed to claim revenue:', error);
      throw error;
    }
  }

  /**
   * Get Claimable Revenue (Read-only)
   * Check how much revenue is available to claim
   *
   * @param ipId - IP Asset ID
   * @param token - Currency token address
   * @returns Claimable revenue amount
   */
  async getClaimableRevenue(ipId: Address, token?: Address): Promise<bigint> {
    if (!this.isReady()) {
      throw new Error('Story Protocol SDK not initialized');
    }

    const currencyToken = token || (STORY_CONTRACTS.WIP_TOKEN_ADDRESS as Address);

    try {
      // Query claimable revenue from royalty module
      // Note: This is a read operation, no transaction needed
      const claimableRevenue = await this.client!.royalty.getClaimableRevenue({
        royaltyVaultIpId: ipId,
        account: this.userAddress!,
        snapshotId: BigInt(0), // Latest snapshot
        token: currencyToken
      });

      return BigInt(claimableRevenue || 0);
    } catch (error) {
      console.error('❌ Failed to get claimable revenue:', error);
      return BigInt(0);
    }
  }

  // ========================================
  // QUERY HELPERS
  // ========================================

  /**
   * Get IP Asset Details (Read-only)
   * Fetch on-chain IP asset information
   *
   * @param ipId - IP Asset ID
   * @returns IP Asset details
   */
  async getIpAsset(ipId: Address): Promise<any> {
    if (!this.isReady()) {
      throw new Error('Story Protocol SDK not initialized');
    }

    try {
      const ipAsset = await this.client!.ipAsset.get(ipId);
      return ipAsset;
    } catch (error) {
      console.error('❌ Failed to get IP asset:', error);
      throw error;
    }
  }

  /**
   * Get License Terms Details (Read-only)
   * Fetch license terms information
   *
   * @param licenseTermsId - License terms ID
   * @returns License terms details
   */
  async getLicenseTerms(licenseTermsId: string): Promise<any> {
    if (!this.isReady()) {
      throw new Error('Story Protocol SDK not initialized');
    }

    try {
      const terms = await this.client!.license.getLicenseTerms({
        licenseTermsId: BigInt(licenseTermsId)
      });
      return terms;
    } catch (error) {
      console.error('❌ Failed to get license terms:', error);
      throw error;
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

// Export singleton instance
export const storyProtocolService = new StoryProtocolService();
