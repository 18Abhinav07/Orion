import { ethers } from 'ethers';
import { CONTRACTS } from '../lib/contractAddress';

// Contract ABIs (simplified for key functions)
const IDENTITY_REGISTRY_ABI = [
  'function isRegistered(address user) external view returns (bool)',
  'function registerIdentity(address user, address provider) external',
  'function getIdentity(address user) external view returns (address)'
];

const MOCK_KYC_VENDOR_ABI = [
  'function hasValidClaim(address user) external view returns (bool)',
  'function issueClaim(address user) external',
  'function getClaimData(address user) external view returns (tuple(uint256 claimId, uint256 issuanceDate, uint256 expiryDate, bool isValid))'
];

const RULE_CONTRACT_ABI = [
  'function canTransfer(address from, address to, uint256 amount) external view returns (bool)',
  'function validateCompliance(address user) external view returns (bool)'
];

export interface KYCData {
  claimId: string;
  issuanceDate: number;
  expiryDate: number;
  isValid: boolean;
}

export interface ComplianceStatus {
  isRegistered: boolean;
  hasValidKYC: boolean;
  canTrade: boolean;
  kycData?: KYCData;
  lastChecked: number;
}

export interface TransferValidation {
  canTransfer: boolean;
  reason?: string;
  requiresAction?: string;
}

export class ComplianceService {
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private identityRegistry: ethers.Contract | null = null;
  private kycVendor: ethers.Contract | null = null;
  private ruleContract: ethers.Contract | null = null;
  private contractsInitialized = false;

  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    this.initializeContracts();
  }

  private async initializeContracts() {
    try {
      // Check if ERC-3643 contracts are available
      if (CONTRACTS.IDENTITY_REGISTRY && CONTRACTS.MOCK_KYC_VENDOR && CONTRACTS.RULE_CONTRACT) {
        // Verify contracts exist by checking if they have code
        const [identityCode, kycCode, ruleCode] = await Promise.all([
          this.provider.getCode(CONTRACTS.IDENTITY_REGISTRY),
          this.provider.getCode(CONTRACTS.MOCK_KYC_VENDOR),
          this.provider.getCode(CONTRACTS.RULE_CONTRACT)
        ]);

        if (identityCode !== '0x' && kycCode !== '0x' && ruleCode !== '0x') {
          // Initialize contract instances only if they exist
          this.identityRegistry = new ethers.Contract(
            CONTRACTS.IDENTITY_REGISTRY,
            IDENTITY_REGISTRY_ABI,
            this.signer || this.provider
          );
          
          this.kycVendor = new ethers.Contract(
            CONTRACTS.MOCK_KYC_VENDOR,
            MOCK_KYC_VENDOR_ABI,
            this.signer || this.provider
          );
          
          this.ruleContract = new ethers.Contract(
            CONTRACTS.RULE_CONTRACT,
            RULE_CONTRACT_ABI,
            this.provider
          );
          
          this.contractsInitialized = true;
          console.log('ERC-3643 contracts initialized successfully');
        } else {
          console.warn('One or more ERC-3643 contracts not found at specified addresses');
        }
      } else {
        console.warn('ERC-3643 contract addresses not configured for current network');
      }
    } catch (error) {
      console.error('Failed to initialize ERC-3643 contracts:', error);
    }
  }

  /**
   * Check comprehensive compliance status for a user
   */
  async checkComplianceStatus(userAddress: string): Promise<ComplianceStatus> {
    try {
      // If contracts not initialized, return default status
      if (!this.contractsInitialized || !this.identityRegistry || !this.kycVendor) {
        console.warn('ERC-3643 contracts not available, returning default compliance status');
        return {
          isRegistered: false,
          hasValidKYC: false,
          canTrade: false,
          lastChecked: Date.now()
        };
      }

      // Check if user is registered in identity registry
      const isRegistered = await this.identityRegistry.isRegistered(userAddress);
      
      // Check if user has valid KYC claim
      const hasValidKYC = await this.kycVendor.hasValidClaim(userAddress);
      
      // Get detailed KYC data if available
      let kycData: KYCData | undefined;
      if (hasValidKYC) {
        try {
          const claimData = await this.kycVendor.getClaimData(userAddress);
          kycData = {
            claimId: claimData.claimId.toString(),
            issuanceDate: Number(claimData.issuanceDate),
            expiryDate: Number(claimData.expiryDate),
            isValid: claimData.isValid
          };
        } catch (error) {
          console.warn('Could not retrieve KYC claim data:', error);
        }
      }
      
      // Check if user can trade (overall compliance validation)
      const canTrade = isRegistered && hasValidKYC;
      
      return {
        isRegistered,
        hasValidKYC,
        canTrade,
        kycData,
        lastChecked: Date.now()
      };
    } catch (error) {
      console.error('Error checking compliance status:', error);
      return {
        isRegistered: false,
        hasValidKYC: false,
        canTrade: false,
        lastChecked: Date.now()
      };
    }
  }

  /**
   * Register user for KYC verification
   */
  async registerForKYC(userAddress: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for KYC registration');
    }

    if (!this.contractsInitialized || !this.identityRegistry || !this.kycVendor) {
      throw new Error('ERC-3643 contracts not available. Please ensure you are connected to the correct network.');
    }

    try {
      // Step 1: Register identity if not already registered
      const isRegistered = await this.identityRegistry.isRegistered(userAddress);
      
      if (!isRegistered) {
        console.log('Registering user identity...');
        const registerTx = await this.identityRegistry.registerIdentity(
          userAddress,
          CONTRACTS.MOCK_KYC_VENDOR
        );
        await registerTx.wait();
        console.log('Identity registered successfully');
      }
      
      // Step 2: Issue KYC claim
      console.log('Issuing KYC claim...');
      const claimTx = await this.kycVendor.issueClaim(userAddress);
      const receipt = await claimTx.wait();
      
      console.log('KYC claim issued successfully');
      return receipt.transactionHash;
    } catch (error: any) {
      console.error('KYC registration failed:', error);
      throw new Error(`KYC registration failed: ${error.message}`);
    }
  }

  /**
   * Validate if a transfer can proceed between two addresses
   */
  async validateTransfer(
    fromAddress: string,
    toAddress: string,
    amount: number
  ): Promise<TransferValidation> {
    try {
      // If contracts not initialized, allow transfer (fallback to basic validation)
      if (!this.contractsInitialized) {
        console.warn('ERC-3643 contracts not available, allowing transfer');
        return {
          canTransfer: true,
          reason: 'Compliance contracts not available - transfer allowed'
        };
      }

      // Check compliance status for both addresses
      const [fromStatus, toStatus] = await Promise.all([
        this.checkComplianceStatus(fromAddress),
        this.checkComplianceStatus(toAddress)
      ]);

      // Check if sender can transfer
      if (!fromStatus.canTrade) {
        return {
          canTransfer: false,
          reason: 'Sender not KYC verified',
          requiresAction: 'Complete KYC verification to enable trading'
        };
      }

      // Check if recipient can receive
      if (!toStatus.canTrade) {
        return {
          canTransfer: false,
          reason: 'Recipient not KYC verified',
          requiresAction: 'Recipient must complete KYC verification'
        };
      }

      // Use rule contract for additional transfer validation if available
      if (this.ruleContract) {
        try {
          const canTransferByRules = await this.ruleContract.canTransfer(
            fromAddress,
            toAddress,
            ethers.utils.parseEther(amount.toString())
          );

          if (!canTransferByRules) {
            return {
              canTransfer: false,
              reason: 'Transfer blocked by compliance rules',
              requiresAction: 'Contact support for rule clarification'
            };
          }
        } catch (ruleError) {
          console.warn('Rule contract validation failed, allowing transfer:', ruleError);
        }
      }

      return {
        canTransfer: true,
        reason: 'All compliance checks passed'
      };
    } catch (error) {
      console.error('Transfer validation failed:', error);
      return {
        canTransfer: false,
        reason: 'Validation error occurred',
        requiresAction: 'Please try again or contact support'
      };
    }
  }

  /**
   * Check if KYC claim is expired
   */
  async isKYCExpired(userAddress: string): Promise<boolean> {
    try {
      const status = await this.checkComplianceStatus(userAddress);
      if (!status.kycData) return true;
      
      const now = Math.floor(Date.now() / 1000);
      return now > status.kycData.expiryDate;
    } catch (error) {
      console.error('Error checking KYC expiry:', error);
      return true;
    }
  }

  /**
   * Get user's identity provider
   */
  async getIdentityProvider(userAddress: string): Promise<string | null> {
    try {
      const identityAddress = await this.identityRegistry.getIdentity(userAddress);
      return identityAddress;
    } catch (error) {
      console.error('Error getting identity provider:', error);
      return null;
    }
  }

  /**
   * Batch check compliance for multiple addresses (for marketplace display)
   */
  async batchCheckCompliance(addresses: string[]): Promise<Map<string, ComplianceStatus>> {
    const results = new Map<string, ComplianceStatus>();
    
    try {
      const statusChecks = addresses.map(address => 
        this.checkComplianceStatus(address)
          .then(status => ({ address, status }))
          .catch(error => ({
            address,
            status: {
              isRegistered: false,
              hasValidKYC: false,
              canTrade: false,
              lastChecked: Date.now()
            } as ComplianceStatus
          }))
      );
      
      const statuses = await Promise.all(statusChecks);
      
      statuses.forEach(({ address, status }) => {
        results.set(address, status);
      });
    } catch (error) {
      console.error('Batch compliance check failed:', error);
    }
    
    return results;
  }

  /**
   * Get compliance contract addresses for frontend display
   */
  getContractAddresses() {
    return CONTRACTS;
  }

  /**
   * Format compliance status for user display
   */
  formatComplianceStatus(status: ComplianceStatus): string {
    if (status.canTrade) {
      return 'Verified ✅';
    } else if (status.isRegistered && !status.hasValidKYC) {
      return 'KYC Pending ⏳';
    } else if (!status.isRegistered) {
      return 'Registration Required 📝';
    } else {
      return 'Verification Failed ❌';
    }
  }

  /**
   * Get time until KYC expiry
   */
  getKYCTimeToExpiry(status: ComplianceStatus): string | null {
    if (!status.kycData || !status.kycData.isValid) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = status.kycData.expiryDate - now;
    
    if (timeLeft <= 0) return 'Expired';
    
    const days = Math.floor(timeLeft / (24 * 60 * 60));
    const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
    
    if (days > 0) {
      return `${days} days, ${hours} hours`;
    } else {
      return `${hours} hours`;
    }
  }
}

// Singleton instance for app-wide use
let complianceServiceInstance: ComplianceService | null = null;

export const getComplianceService = (provider: ethers.providers.Provider, signer?: ethers.Signer): ComplianceService => {
  if (!complianceServiceInstance) {
    complianceServiceInstance = new ComplianceService(provider, signer);
  }
  return complianceServiceInstance;
};

export default ComplianceService;