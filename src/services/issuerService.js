/**
 * @fileoverview Issuer Service for ERC-3643 dApp
 * @description Handles all issuer-related operations including asset registration, token deployment, and minting
 */

import { ethers } from 'ethers';
import { pinataService } from './pinataService.js';

// Contract ABIs for Issuer operations
const TOKEN_FACTORY_ABI = [
  "function deployToken(bytes32 assetId, address spvWallet, string calldata name, string calldata symbol, uint8 decimals, address identityRegistry, address compliance, bytes32[] calldata attestationIds) external returns (address)",
  "function getTokenDeployment(bytes32 assetId) external view returns (tuple(bytes32 assetId, address tokenAddress, address spvWallet, address compliance, bool isActive, uint256 deploymentTimestamp))",
  "function enableMinting(bytes32 assetId) external",
  "function disableMinting(bytes32 assetId) external", 
  "function isMintingEnabled(bytes32 assetId) external view returns (bool)",
  "function areFundsCleared(bytes32 assetId, uint256 amount) external view returns (bool)",
  "event TokenDeployed(bytes32 indexed assetId, address indexed tokenAddress, address indexed spvWallet)",
  "event MintingEnabled(bytes32 indexed assetId)",
  "event MintingDisabled(bytes32 indexed assetId)"
];

const MASTER_TOKEN_ABI = [
  "function initialize(string memory name_, string memory symbol_, uint8 decimals_, address identityRegistry_, address compliance_, address spvWallet_) external",
  "function mint(address to, uint256 amount) external",
  "function batchMint(address[] calldata to, uint256[] calldata amounts) external",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
  "function decimals() external view returns (uint8)",
  "function paused() external view returns (bool)",
  "function spvWallet() external view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const ASSET_REGISTRY_ABI = [
  "function registerAsset(bytes32 assetId, address tokenAddress, address compliance, bytes32[] calldata attestationIds) external",
  "function updateAssetMetadata(bytes32 assetId, string calldata ipfsMetadataCID) external",
  "function getAssetInfo(bytes32 assetId) external view returns (tuple(bytes32 assetId, address tokenAddress, address compliance, bytes32[] attestationIds, string ipfsMetadataCID, bool isActive, uint256 registrationTimestamp))",
  "function isAssetRegistered(bytes32 assetId) external view returns (bool)",
  "function isAssetActive(bytes32 assetId) external view returns (bool)",
  "event AssetRegistered(bytes32 indexed assetId, address indexed tokenAddress, address indexed compliance)",
  "event AssetMetadataUpdated(bytes32 indexed assetId, string ipfsMetadataCID)"
];

const ATTESTATION_REGISTRY_ABI = [
  "function getValidAssetAttestations(bytes32 assetId) external view returns (bytes32[] memory)",
  "function isAttestationValid(bytes32 attestationId) external view returns (bool)",
  "function getAttestation(bytes32 attestationId) external view returns (tuple(bytes32 assetId, address lawFirm, string ipfsCID, uint256 expiryTimestamp, bool isValid, uint256 timestamp))"
];

const USER_REGISTRY_ABI = [
  "function isIssuer(address _address) external view returns (bool)",
  "function getIssuerInfo(address _issuer) external view returns (string memory metadata, uint256 registrationTime, bool isActive)"
];

const ATOMIC_SALE_CONTRACT_ABI = [
  "function enableAssetSale(bytes32 assetId, uint256 pricePerToken) external",
  "function disableAssetSale(bytes32 assetId) external",
  "function updateAssetPrice(bytes32 assetId, uint256 newPrice) external",
  "function isSaleEnabled(bytes32 assetId) external view returns (bool)",
  "function getAssetPrice(bytes32 assetId) external view returns (uint256)",
  "function getAssetIssuer(bytes32 assetId) external view returns (address)",
  "event AssetSaleEnabled(bytes32 indexed assetId, uint256 pricePerToken, address indexed issuer)",
  "event AssetSaleDisabled(bytes32 indexed assetId)"
];

class IssuerService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.initialized = false;
    this.contractAddresses = {};
  }

  /**
   * Initialize the service with provider and contract addresses
   */
  async initialize(provider, contractAddresses) {
    try {
      this.provider = provider;
      this.signer = provider.getSigner();
      this.contractAddresses = contractAddresses;
      
      // Initialize contracts
      this.contracts = {
        tokenFactory: new ethers.Contract(
          contractAddresses.tokenFactory,
          TOKEN_FACTORY_ABI,
          this.signer
        ),
        assetRegistry: new ethers.Contract(
          contractAddresses.assetRegistry,
          ASSET_REGISTRY_ABI,
          this.signer
        ),
        attestationRegistry: new ethers.Contract(
          contractAddresses.attestationRegistry,
          ATTESTATION_REGISTRY_ABI,
          this.signer
        ),
        userRegistry: new ethers.Contract(
          contractAddresses.userRegistry,
          USER_REGISTRY_ABI,
          this.signer
        ),
        atomicSaleContract: new ethers.Contract(
          contractAddresses.atomicSaleContract,
          ATOMIC_SALE_CONTRACT_ABI,
          this.signer
        )
      };

      this.initialized = true;
      console.log('IssuerService initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize IssuerService:', error);
      throw error;
    }
  }

  /**
   * Check if current address is authorized issuer
   */
  async isAuthorizedIssuer(address = null) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    const addressToCheck = address || await this.signer.getAddress();
    return await this.contracts.userRegistry.isIssuer(addressToCheck);
  }

  /**
   * Get issuer information
   */
  async getIssuerInfo(address = null) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    const addressToCheck = address || await this.signer.getAddress();
    const info = await this.contracts.userRegistry.getIssuerInfo(addressToCheck);
    
    return {
      metadata: info.metadata,
      registrationTime: info.registrationTime.toNumber(),
      isActive: info.isActive
    };
  }

  // ========== ASSET REGISTRATION WORKFLOW ==========

  /**
   * Step 1: Register asset metadata and create draft
   */
  async registerAssetDraft(assetData) {
    try {
      console.log('Creating asset draft...');
      
      // Validate required fields
      this.validateAssetData(assetData);
      
      // Generate unique asset ID
      const assetId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['string', 'address', 'uint256'],
          [assetData.title, await this.signer.getAddress(), Date.now()]
        )
      );

      // Upload initial metadata to IPFS
      const metadataCID = await pinataService.pinAssetMetadata({
        ...assetData,
        assetId,
        issuer: await this.signer.getAddress(),
        status: 'draft',
        createdAt: Date.now()
      });

      // Store draft in localStorage
      const draftData = {
        assetId,
        ...assetData,
        metadataCID,
        status: 'draft',
        createdAt: Date.now(),
        issuer: await this.signer.getAddress()
      };

      localStorage.setItem(`assetDraft:${assetId}`, JSON.stringify(draftData));
      
      console.log('Asset draft created:', assetId);
      
      return {
        assetId,
        metadataCID,
        status: 'draft'
      };
      
    } catch (error) {
      console.error('Failed to register asset draft:', error);
      throw error;
    }
  }

  /**
   * Step 2: Submit asset for admin approval
   */
  async submitAssetForApproval(assetId, additionalDocuments = []) {
    try {
      console.log('Submitting asset for approval:', assetId);
      
      // Get draft from localStorage
      const draftData = JSON.parse(localStorage.getItem(`assetDraft:${assetId}`) || '{}');
      if (!draftData.assetId) {
        throw new Error('Asset draft not found');
      }

      // Upload additional documents if provided
      let documentsIPFS = [];
      if (additionalDocuments.length > 0) {
        console.log('Uploading additional documents...');
        documentsIPFS = await pinataService.pinMultipleFiles(additionalDocuments, {
          name: 'asset-documents',
          keyvalues: { assetId, type: 'supporting-documents' }
        });
      }

      // Update metadata with submission info
      const submissionMetadata = {
        ...draftData,
        status: 'pending-approval',
        submittedAt: Date.now(),
        additionalDocuments: documentsIPFS,
        submissionNote: 'Asset submitted for admin approval'
      };

      // Upload updated metadata
      const updatedMetadataCID = await pinataService.pinAssetMetadata(submissionMetadata);

      // Update localStorage
      submissionMetadata.metadataCID = updatedMetadataCID;
      localStorage.setItem(`assetDraft:${assetId}`, JSON.stringify(submissionMetadata));

      console.log('Asset submitted for approval successfully');
      
      return {
        assetId,
        metadataCID: updatedMetadataCID,
        status: 'pending-approval',
        documentsIPFS
      };
      
    } catch (error) {
      console.error('Failed to submit asset for approval:', error);
      throw error;
    }
  }

  /**
   * Step 3: Deploy token after admin approval
   */
  async deployTokenAfterApproval(assetId, tokenConfig) {
    try {
      console.log('Deploying token for approved asset:', assetId);
      
      // Validate issuer authorization
      const isAuthorized = await this.isAuthorizedIssuer();
      if (!isAuthorized) {
        throw new Error('Not authorized issuer');
      }

      // Check for valid attestations
      const attestations = await this.contracts.attestationRegistry.getValidAssetAttestations(assetId);
      if (attestations.length === 0) {
        throw new Error('No valid attestations found for asset');
      }

      // Get asset draft data
      const draftData = JSON.parse(localStorage.getItem(`assetDraft:${assetId}`) || '{}');
      if (!draftData.assetId) {
        throw new Error('Asset draft not found');
      }

      // Deploy token
      const deployTx = await this.contracts.tokenFactory.deployToken(
        assetId,
        tokenConfig.spvWallet || await this.signer.getAddress(),
        tokenConfig.name || draftData.title,
        tokenConfig.symbol || this.generateTokenSymbol(draftData.title),
        tokenConfig.decimals || 18,
        this.contractAddresses.identityRegistry,
        this.contractAddresses.compliance,
        attestations
      );

      console.log('Token deployment transaction sent:', deployTx.hash);
      
      // Wait for deployment
      const receipt = await deployTx.wait();
      const event = receipt.events?.find(e => e.event === 'TokenDeployed');
      
      if (!event) {
        throw new Error('TokenDeployed event not found');
      }

      const tokenAddress = event.args.tokenAddress;
      
      // Update asset status
      const deploymentData = {
        ...draftData,
        tokenAddress,
        status: 'deployed',
        deployedAt: Date.now(),
        deploymentTx: receipt.transactionHash,
        deploymentBlock: receipt.blockNumber
      };

      localStorage.setItem(`assetDraft:${assetId}`, JSON.stringify(deploymentData));

      console.log('Token deployed successfully:', tokenAddress);
      
      return {
        assetId,
        tokenAddress,
        deploymentTx: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Failed to deploy token:', error);
      throw error;
    }
  }

  /**
   * Step 4: Enable minting after T+1 clearance
   */
  async enableMinting(assetId) {
    try {
      console.log('Enabling minting for asset:', assetId);
      
      // Check if token is deployed
      const deployment = await this.contracts.tokenFactory.getTokenDeployment(assetId);
      if (!deployment.isActive) {
        throw new Error('Token not deployed or not active');
      }

      // Enable minting
      const tx = await this.contracts.tokenFactory.enableMinting(assetId);
      const receipt = await tx.wait();
      
      console.log('Minting enabled successfully');
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Failed to enable minting:', error);
      throw error;
    }
  }

  /**
   * Step 5: Batch mint initial supply
   */
  async batchMintInitialSupply(assetId, recipients, amounts) {
    try {
      console.log('Batch minting initial supply for asset:', assetId);
      
      // Validate inputs
      if (!recipients || !amounts || recipients.length !== amounts.length) {
        throw new Error('Recipients and amounts arrays must have same length');
      }

      if (recipients.length === 0) {
        throw new Error('At least one recipient required');
      }

      // Check minting is enabled
      const mintingEnabled = await this.contracts.tokenFactory.isMintingEnabled(assetId);
      if (!mintingEnabled) {
        throw new Error('Minting not enabled for this asset');
      }

      // Get token deployment info
      const deployment = await this.contracts.tokenFactory.getTokenDeployment(assetId);
      const tokenContract = new ethers.Contract(
        deployment.tokenAddress,
        MASTER_TOKEN_ABI,
        this.signer
      );

      // Batch mint
      const tx = await tokenContract.batchMint(recipients, amounts);
      const receipt = await tx.wait();
      
      // Calculate total minted
      const totalMinted = amounts.reduce((sum, amount) => sum.add(amount), ethers.BigNumber.from(0));
      
      console.log('Batch mint completed:', totalMinted.toString());
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        totalMinted: totalMinted.toString(),
        recipientCount: recipients.length
      };
      
    } catch (error) {
      console.error('Failed to batch mint:', error);
      throw error;
    }
  }

  // ========== ASSET MANAGEMENT ==========

  /**
   * Get all assets for current issuer
   */
  async getMyAssets() {
    try {
      const issuerAddress = await this.signer.getAddress();
      const assets = [];
      
      // Get assets from localStorage (drafts and pending)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('assetDraft:')) {
          try {
            const assetData = JSON.parse(localStorage.getItem(key) || '{}');
            if (assetData.issuer === issuerAddress) {
              assets.push(assetData);
            }
          } catch (error) {
            console.warn(`Failed to parse asset data for key ${key}:`, error);
          }
        }
      }
      
      return assets;
      
    } catch (error) {
      console.error('Failed to get issuer assets:', error);
      throw error;
    }
  }

  /**
   * Get asset deployment status
   */
  async getAssetDeploymentStatus(assetId) {
    try {
      // Check if asset is registered
      const isRegistered = await this.contracts.assetRegistry.isAssetRegistered(assetId);
      if (!isRegistered) {
        return { status: 'not-deployed', isRegistered: false };
      }

      // Get deployment info
      const deployment = await this.contracts.tokenFactory.getTokenDeployment(assetId);
      const mintingEnabled = await this.contracts.tokenFactory.isMintingEnabled(assetId);
      
      // Get token info
      const tokenContract = new ethers.Contract(
        deployment.tokenAddress,
        MASTER_TOKEN_ABI,
        this.signer
      );
      
      const [totalSupply, name, symbol] = await Promise.all([
        tokenContract.totalSupply(),
        tokenContract.name(),
        tokenContract.symbol()
      ]);

      return {
        status: 'deployed',
        isRegistered: true,
        tokenAddress: deployment.tokenAddress,
        spvWallet: deployment.spvWallet,
        isActive: deployment.isActive,
        deploymentTimestamp: deployment.deploymentTimestamp.toNumber(),
        mintingEnabled,
        totalSupply: totalSupply.toString(),
        name,
        symbol
      };
      
    } catch (error) {
      console.error('Failed to get deployment status:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Enable asset sale on marketplace
   */
  async enableAssetSale(assetId, pricePerToken) {
    try {
      console.log('Enabling asset sale:', assetId);
      
      // Validate price
      if (!pricePerToken || ethers.BigNumber.from(pricePerToken).lte(0)) {
        throw new Error('Invalid price per token');
      }

      // Enable sale
      const tx = await this.contracts.atomicSaleContract.enableAssetSale(assetId, pricePerToken);
      const receipt = await tx.wait();
      
      console.log('Asset sale enabled successfully');
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        pricePerToken: pricePerToken.toString()
      };
      
    } catch (error) {
      console.error('Failed to enable asset sale:', error);
      throw error;
    }
  }

  /**
   * Update asset sale price
   */
  async updateAssetPrice(assetId, newPrice) {
    try {
      console.log('Updating asset price:', assetId);
      
      const tx = await this.contracts.atomicSaleContract.updateAssetPrice(assetId, newPrice);
      const receipt = await tx.wait();
      
      console.log('Asset price updated successfully');
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        newPrice: newPrice.toString()
      };
      
    } catch (error) {
      console.error('Failed to update asset price:', error);
      throw error;
    }
  }

  /**
   * Disable asset sale
   */
  async disableAssetSale(assetId) {
    try {
      console.log('Disabling asset sale:', assetId);
      
      const tx = await this.contracts.atomicSaleContract.disableAssetSale(assetId);
      const receipt = await tx.wait();
      
      console.log('Asset sale disabled successfully');
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Failed to disable asset sale:', error);
      throw error;
    }
  }

  /**
   * Get asset sale status
   */
  async getAssetSaleStatus(assetId) {
    try {
      const [isSaleEnabled, price, issuer] = await Promise.all([
        this.contracts.atomicSaleContract.isSaleEnabled(assetId),
        this.contracts.atomicSaleContract.getAssetPrice(assetId),
        this.contracts.atomicSaleContract.getAssetIssuer(assetId)
      ]);

      return {
        isSaleEnabled,
        price: price.toString(),
        issuer,
        priceInEth: ethers.utils.formatEther(price)
      };
      
    } catch (error) {
      console.error('Failed to get asset sale status:', error);
      return { isSaleEnabled: false, price: '0', issuer: ethers.constants.AddressZero };
    }
  }

  // ========== COMPLETE WORKFLOWS ==========

  /**
   * Complete asset creation workflow
   */
  async createAssetComplete(assetData, tokenConfig, initialMintData) {
    try {
      console.log('Starting complete asset creation workflow...');
      
      // Step 1: Register asset draft
      console.log('Step 1: Registering asset draft...');
      const { assetId } = await this.registerAssetDraft(assetData);
      
      // Step 2: Submit for approval
      console.log('Step 2: Submitting for approval...');
      await this.submitAssetForApproval(assetId, assetData.supportingDocuments || []);
      
      // Note: Steps 3-6 would typically wait for admin approval
      // For testing purposes, we'll provide a method to continue after approval
      
      return {
        assetId,
        status: 'pending-approval',
        nextSteps: [
          'Wait for admin approval',
          'Deploy token after approval',
          'Enable minting',
          'Mint initial supply',
          'Enable marketplace sale'
        ]
      };
      
    } catch (error) {
      console.error('Complete asset creation workflow failed:', error);
      throw error;
    }
  }

  /**
   * Continue workflow after admin approval
   */
  async continueAfterApproval(assetId, tokenConfig, initialMintData, saleConfig) {
    try {
      console.log('Continuing workflow after admin approval...');
      
      // Step 3: Deploy token
      console.log('Step 3: Deploying token...');
      const deployResult = await this.deployTokenAfterApproval(assetId, tokenConfig);
      
      // Step 4: Enable minting
      console.log('Step 4: Enabling minting...');
      await this.enableMinting(assetId);
      
      // Step 5: Batch mint initial supply
      if (initialMintData && initialMintData.recipients.length > 0) {
        console.log('Step 5: Minting initial supply...');
        await this.batchMintInitialSupply(
          assetId, 
          initialMintData.recipients, 
          initialMintData.amounts
        );
      }
      
      // Step 6: Enable sale if configured
      if (saleConfig && saleConfig.enableSale) {
        console.log('Step 6: Enabling marketplace sale...');
        await this.enableAssetSale(assetId, saleConfig.pricePerToken);
      }
      
      console.log('Asset creation workflow completed successfully!');
      
      return {
        assetId,
        tokenAddress: deployResult.tokenAddress,
        status: 'completed',
        summary: {
          deployed: true,
          mintingEnabled: true,
          initialSupplyMinted: initialMintData?.recipients.length > 0,
          saleEnabled: saleConfig?.enableSale || false
        }
      };
      
    } catch (error) {
      console.error('Post-approval workflow failed:', error);
      throw error;
    }
  }

  // ========== UTILITY FUNCTIONS ==========

  /**
   * Validate asset data
   */
  validateAssetData(assetData) {
    const required = ['title', 'description', 'valuation', 'jurisdiction'];
    for (const field of required) {
      if (!assetData[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }
    
    if (typeof assetData.valuation !== 'number' || assetData.valuation <= 0) {
      throw new Error('Valuation must be a positive number');
    }
  }

  /**
   * Generate token symbol from title
   */
  generateTokenSymbol(title) {
    return title
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 5);
  }

  /**
   * Format asset status for UI
   */
  formatAssetStatus(status) {
    const statusMap = {
      'draft': { label: 'Draft', color: 'gray', description: 'Asset is being prepared' },
      'pending-approval': { label: 'Pending Approval', color: 'yellow', description: 'Waiting for admin approval' },
      'approved': { label: 'Approved', color: 'green', description: 'Ready for token deployment' },
      'deployed': { label: 'Deployed', color: 'blue', description: 'Token deployed and active' },
      'completed': { label: 'Live', color: 'green', description: 'Asset is live and tradeable' },
      'rejected': { label: 'Rejected', color: 'red', description: 'Asset was rejected' }
    };
    
    return statusMap[status] || { label: status, color: 'gray', description: 'Unknown status' };
  }
}

// Export singleton instance
export const issuerService = new IssuerService();
export default issuerService;