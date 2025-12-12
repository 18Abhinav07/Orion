import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { http, createWalletClient, custom, defineChain } from 'viem';
import { ethers } from 'ethers';
import { marketplaceService } from './marketplaceService';

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

export const licenseTokenService = {
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
      
      return tokenId;
    } catch (error) {
      console.error('❌ Error in mintLicenseToken:', error);
      throw error;
    }
  },

  async getUserLicenses(walletAddress: string, provider: any): Promise<any[]> {
    if (!walletAddress || !provider) {
      return [];
    }

    try {
      // Assuming a contract address and ABI are defined elsewhere
      // const licenseTokenContract = new ethers.Contract(LICENSE_TOKEN_CONTRACT, LICENSE_TOKEN_ABI, provider);
      // const balance = await licenseTokenContract.balanceOf(walletAddress);
      
      // const licenses = [];
      // for (let i = 0; i < balance.toNumber(); i++) {
      //   const tokenId = await licenseTokenContract.tokenOfOwnerByIndex(walletAddress, i);
      //   const license = await marketplaceService.getLicensedIps().then(ips => ips.find(ip => ip.ipId === tokenId.toString()));
      //   if (license) {
      //     licenses.push(license);
      //   }
      // }
      // return licenses;
      return []; // Returning empty array for now
    } catch (error) {
      console.error('Error fetching user licenses:', error);
      return [];
    }
  },
};
