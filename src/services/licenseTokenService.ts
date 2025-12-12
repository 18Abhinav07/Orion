import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { http, createWalletClient, custom, defineChain } from 'viem';
import { ethers } from 'ethers';
import { marketplaceService } from './marketplaceService';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Define Story Aeneid Testnet chain for viem
const storyAeneidTestnet = defineChain({
  id: 1315,
  name: 'Story Aeneid Testnet',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://aeneid.storyrpc.io'] }
  },
  blockExplorers: {
    default: { name: 'Story Explorer', url: 'https://testnet.storyscan.xyz' }
  },
  testnet: true
});

interface RecordMintParams {
  licenseTokenId: string;
  txHash: string;
  ipId: string;
  licenseTermsId: string;
  licenseeAddress: string;
  amount: number;
  blockNumber: number;
  timestamp: number;
}

export const licenseTokenService = {
  /**
   * Record license token mint in backend database
   */
  async recordLicenseTokenMint(params: RecordMintParams): Promise<void> {
    const payload = {
      licenseTokenId: params.licenseTokenId,
      txHash: params.txHash,
      ipId: params.ipId,
      licenseTermsId: params.licenseTermsId,
      licenseeAddress: params.licenseeAddress,
      amount: params.amount,
      mintingFee: '0', // Will be fetched from chain by backend
      currency: '0xB132A6B7AE652c974EE1557A3521D53d18F6739f', // WIP token
      royaltyPercentage: 10, // Default, can be fetched from license terms
      licenseTerms: {
        commercialUse: true,
        derivativesAllowed: true,
        transferable: true
      },
      metadata: {
        ipMetadataURI: '',
        nftMetadataURI: '',
        ipType: 'Unknown', // Will be enriched by backend
        ipTitle: `License Token #${params.licenseTokenId}`
      }
    };

    await axios.post(`${API_BASE_URL}/license-tokens/mint`, payload);
  },

  /**
   * Mint a license token using Story Protocol SDK
   */
  async mintLicenseToken(
    licensorIpId: string,
    licenseTermsId: string,
    receiver: string,
    amount: number,
    signer: any
  ): Promise<string> {
    try {
      console.log('🔧 Starting license token minting...');

      // Get the address from the ethers signer
      const address = await signer.getAddress();
      console.log('👤 Wallet address:', address);

      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      // Create wallet client WITHOUT specifying account - let MetaMask provide it
      const walletClient = createWalletClient({
        chain: storyAeneidTestnet,
        transport: custom(window.ethereum)
      });

      // Get account from MetaMask (this includes signing capability)
      const [account] = await walletClient.getAddresses();
      console.log('✅ Wallet client created with account from MetaMask:', account);

      // Story SDK config: Use custom transport for both reads and writes (MetaMask signing)
      const config: StoryConfig = {
        account: account,
        transport: custom(window.ethereum), // MetaMask for signing
        chainId: 'aeneid' // Story Aeneid Testnet chainId
      };

      console.log('🔧 Initializing Story Protocol client...');
      const client = StoryClient.newClient(config);
      console.log('✅ Story Protocol client initialized');

      console.log('📝 Minting parameters:', {
        licensorIpId,
        licenseTermsId,
        receiver,
        amount
      });

      const response = await client.license.mintLicenseTokens({
        licensorIpId: licensorIpId as `0x${string}`,
        licenseTermsId: BigInt(licenseTermsId),
        receiver: receiver as `0x${string}`,
        amount,
        txOptions: { waitForTransaction: true }
      });

      console.log('✅ License minting response:', response);
      const tokenId = response.licenseTokenIds?.[0]?.toString() || '';
      console.log('🎫 License Token ID:', tokenId);

      // Record the mint in the backend
      try {
        console.log('📤 Notifying backend of license mint...');
        await this.recordLicenseTokenMint({
          licenseTokenId: tokenId,
          txHash: response.txHash || '',
          ipId: licensorIpId,
          licenseTermsId: licenseTermsId,
          licenseeAddress: receiver,
          amount: amount,
          blockNumber: 0, // Will be fetched by backend
          timestamp: Math.floor(Date.now() / 1000)
        });
        console.log('✅ Backend notified successfully');
      } catch (backendError) {
        console.error('⚠️ Failed to notify backend (non-critical):', backendError);
        // Don't fail the mint if backend notification fails
      }

      return tokenId;
    } catch (error) {
      console.error('❌ Error in mintLicenseToken:', error);
      throw error;
    }
  },

  /**
   * Get all license tokens owned by a user from backend
   */
  async getUserLicenses(walletAddress: string, provider?: any): Promise<any[]> {
    if (!walletAddress) {
      return [];
    }

    try {
      console.log(`📡 Fetching licenses for user: ${walletAddress}`);
      const response = await axios.get(`${API_BASE_URL}/license-tokens/user/${walletAddress}`, {
        params: {
          status: 'active',
          sortBy: 'timestamp',
          sortOrder: 'desc',
          limit: 100
        }
      });

      if (response.data.success) {
        const licenses = response.data.data.licenses || [];
        console.log(`✅ Fetched ${licenses.length} licenses from backend`);
        return licenses;
      }

      return [];
    } catch (error) {
      console.error('❌ Error fetching user licenses from backend:', error);
      return [];
    }
  },

  /**
   * Get analytics for a specific IP asset
   */
  async getIPAnalytics(ipId: string): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/license-tokens/analytics/ip/${ipId}`);

      if (response.data.success) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching IP analytics:', error);
      return null;
    }
  },

  /**
   * Get global platform statistics
   */
  async getGlobalStats(): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/license-tokens/stats/global`);

      if (response.data.success) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching global stats:', error);
      return null;
    }
  },

  /**
   * Verify license token ownership
   */
  async verifyOwnership(licenseTokenId: string, walletAddress: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/license-tokens/verify/${licenseTokenId}/owner/${walletAddress}`
      );

      return response.data.success && response.data.data.isOwner;
    } catch (error) {
      console.error('❌ Error verifying ownership:', error);
      return false;
    }
  },
};
