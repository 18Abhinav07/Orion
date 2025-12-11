import { ethers } from 'ethers';

/**
 * Robust Authorization Service
 * Uses direct contract calls similar to the working debug script
 */
class RobustAuthorizationService {
  constructor() {
    this.provider = null;
    this.initialized = false;
  }

  async initialize(provider) {
    try {
      this.provider = provider;
      this.initialized = true;
      console.log('✅ Robust Authorization Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize robust authorization service:', error);
      throw error;
    }
  }

  async isAuthorizedIssuer(address, adminContractAddress) {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    try {
      console.log('🔍 Checking authorization with robust method...');
      console.log('Wallet:', address);
      console.log('Admin Contract:', adminContractAddress);

      // Use minimal ABI for maximum compatibility
      const ADMIN_ABI = [
        "function isIssuer(address _address) external view returns (bool)"
      ];

      // Create contract instance with provider (not signer)
      const adminContract = new ethers.Contract(
        adminContractAddress, 
        ADMIN_ABI, 
        this.provider
      );

      // Check if contract exists
      const contractCode = await this.provider.getCode(adminContractAddress);
      console.log('Contract code length:', contractCode.length);

      if (contractCode === '0x') {
        console.error('❌ Admin contract not found at address');
        return false;
      }

      // Direct contract call
      console.log('🔄 Calling isIssuer...');
      const isAuthorized = await adminContract.isIssuer(address);
      console.log('✅ Authorization result:', isAuthorized);

      return isAuthorized;

    } catch (error) {
      console.error('❌ Robust authorization check failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      });
      return false;
    }
  }
}

export default RobustAuthorizationService;