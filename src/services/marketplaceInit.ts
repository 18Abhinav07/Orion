import { MarketplaceService } from './marketplaceService';

const MARKETPLACE_PRIVATE_KEY = '0x7ea592ad2bf4db5e006b39dfc60f3ab9f17f6b548fba1fc5d89d4a38f8211acd';
const PLATFORM_WALLET = '0x7ea592ad2bf4db5e006b39dfc60f3ab9f17f6b548'; // Derived from private key

/**
 * Initialize marketplace by setting the platform wallet
 * This should be called once after marketplace deployment
 */
export async function initializeMarketplace(): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    const marketplaceService = new MarketplaceService(MARKETPLACE_PRIVATE_KEY);
    
    console.log('🔧 Initializing marketplace with platform wallet...');
    const result = await marketplaceService.setPlatformWallet(PLATFORM_WALLET);
    
    console.log('✅ Marketplace initialized successfully!');
    return {
      success: true,
      transactionHash: result.transactionHash
    };
    
  } catch (error: any) {
    console.error('❌ Failed to initialize marketplace:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export { PLATFORM_WALLET, MARKETPLACE_PRIVATE_KEY };
