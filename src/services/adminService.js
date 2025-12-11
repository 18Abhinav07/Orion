/**
 * @fileoverview Admin Service for ERC-3643 dApp
 * @description Handles all admin-related operations including attestations, user management
 */

import { ethers } from 'ethers';
import { pinataService } from './pinataService.js';

// Contract ABIs (simplified for key functions)
const ATTESTATION_REGISTRY_ABI = [
  "function createAttestation(bytes32 assetId, address lawFirm, string calldata ipfsCID, uint256 expiryTimestamp) external returns (bytes32)",
  "function addTrustedLawFirm(address lawFirm) external",
  "function isAttestationValid(bytes32 attestationId) external view returns (bool)",
  "function getAttestation(bytes32 attestationId) external view returns (tuple(bytes32 assetId, address lawFirm, string ipfsCID, uint256 expiryTimestamp, bool isValid, uint256 timestamp))",
  "event AttestationCreated(bytes32 indexed attestationId, bytes32 indexed assetId, address indexed lawFirm, string ipfsCID)",
  "event TrustedLawFirmAdded(address indexed lawFirm)"
];

const USER_REGISTRY_ABI = [
  "function addIssuer(address _issuer, string memory _metadataURI) external",
  "function addManager(address _manager, string memory _metadataURI) external", 
  "function removeIssuer(address _issuer) external",
  "function removeManager(address _manager) external",
  "function isIssuer(address _address) external view returns (bool)",
  "function isManager(address _address) external view returns (bool)",
  "function isAdmin(address _address) external view returns (bool)",
  "function batchAddIssuers(address[] memory _issuers, string[] memory _metadataURIs) external",
  "function batchAddManagers(address[] memory _managers, string[] memory _metadataURIs) external",
  "event IssuerAdded(address indexed issuer, string metadataURI, uint256 timestamp)",
  "event ManagerAdded(address indexed manager, string metadataURI, uint256 timestamp)"
];

const ASSET_REGISTRY_ABI = [
  "function updateAssetMetadata(bytes32 assetId, string calldata ipfsMetadataCID) external",
  "function addAttestation(bytes32 assetId, bytes32 attestationId) external",
  "function getAssetInfo(bytes32 assetId) external view returns (tuple(bytes32 assetId, address tokenAddress, address compliance, bytes32[] attestationIds, string ipfsMetadataCID, bool isActive, uint256 registrationTimestamp))",
  "function getAllAssets() external view returns (bytes32[] memory)",
  "event AssetMetadataUpdated(bytes32 indexed assetId, string ipfsMetadataCID)",
  "event AttestationAdded(bytes32 indexed assetId, bytes32 indexed attestationId)"
];

class AdminService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.initialized = false;
  }

  /**
   * Initialize the service with provider and contract addresses
   */
  async initialize(provider, contractAddresses) {
    try {
      this.provider = provider;
      this.signer = provider.getSigner();
      
      // Initialize contracts
      this.contracts = {
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
        assetRegistry: new ethers.Contract(
          contractAddresses.assetRegistry,
          ASSET_REGISTRY_ABI,
          this.signer
        )
      };

      this.initialized = true;
      console.log('AdminService initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AdminService:', error);
      throw error;
    }
  }

  /**
   * Check if current address has admin privileges
   */
  async isAdmin(address = null) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    const addressToCheck = address || await this.signer.getAddress();
    return await this.contracts.userRegistry.isAdmin(addressToCheck);
  }

  // ========== ATTESTATION MANAGEMENT ==========

  /**
   * Create attestation for an asset (Admin approval)
   */
  async createAttestation(assetId, lawFirmAddress, documentsCID, expiryDays = 365) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('Creating attestation for asset:', assetId);
      
      // Validate inputs
      if (!assetId || !ethers.utils.isHexString(assetId, 32)) {
        throw new Error('Invalid asset ID');
      }
      if (!ethers.utils.isAddress(lawFirmAddress)) {
        throw new Error('Invalid law firm address');
      }
      if (!documentsCID) {
        throw new Error('Documents CID required');
      }

      // Calculate expiry timestamp
      const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryDays * 24 * 60 * 60);
      
      // Create transaction
      const tx = await this.contracts.attestationRegistry.createAttestation(
        assetId,
        lawFirmAddress,
        documentsCID,
        expiryTimestamp
      );

      console.log('Attestation transaction sent:', tx.hash);
      
      // Wait for transaction and get attestation ID from event
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === 'AttestationCreated');
      
      if (!event) {
        throw new Error('AttestationCreated event not found');
      }

      const attestationId = event.args.attestationId;
      
      // Store in localStorage
      localStorage.setItem(`attestation:${assetId}`, JSON.stringify({
        attestationId,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        status: 'approved',
        timestamp: Date.now(),
        expiryTimestamp,
        lawFirm: lawFirmAddress,
        documentsCID
      }));

      console.log('Attestation created successfully:', attestationId);
      
      return {
        attestationId,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
      
    } catch (error) {
      console.error('Failed to create attestation:', error);
      throw error;
    }
  }

  /**
   * Add trusted law firm
   */
  async addTrustedLawFirm(lawFirmAddress) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      if (!ethers.utils.isAddress(lawFirmAddress)) {
        throw new Error('Invalid law firm address');
      }

      const tx = await this.contracts.attestationRegistry.addTrustedLawFirm(lawFirmAddress);
      const receipt = await tx.wait();
      
      console.log('Trusted law firm added:', lawFirmAddress);
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Failed to add trusted law firm:', error);
      throw error;
    }
  }

  /**
   * Get attestation details
   */
  async getAttestation(attestationId) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const attestation = await this.contracts.attestationRegistry.getAttestation(attestationId);
      const isValid = await this.contracts.attestationRegistry.isAttestationValid(attestationId);
      
      return {
        assetId: attestation.assetId,
        lawFirm: attestation.lawFirm,
        ipfsCID: attestation.ipfsCID,
        expiryTimestamp: attestation.expiryTimestamp.toNumber(),
        isValid: attestation.isValid && isValid,
        timestamp: attestation.timestamp.toNumber()
      };
    } catch (error) {
      console.error('Failed to get attestation:', error);
      throw error;
    }
  }

  // ========== USER MANAGEMENT ==========

  /**
   * Add issuer to the registry
   */
  async addIssuer(issuerAddress, metadataURI) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      if (!ethers.utils.isAddress(issuerAddress)) {
        throw new Error('Invalid issuer address');
      }
      if (!metadataURI) {
        throw new Error('Metadata URI required');
      }

      const tx = await this.contracts.userRegistry.addIssuer(issuerAddress, metadataURI);
      const receipt = await tx.wait();
      
      console.log('Issuer added:', issuerAddress);
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Failed to add issuer:', error);
      throw error;
    }
  }

  /**
   * Add manager to the registry
   */
  async addManager(managerAddress, metadataURI) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      if (!ethers.utils.isAddress(managerAddress)) {
        throw new Error('Invalid manager address');
      }
      if (!metadataURI) {
        throw new Error('Metadata URI required');
      }

      const tx = await this.contracts.userRegistry.addManager(managerAddress, metadataURI);
      const receipt = await tx.wait();
      
      console.log('Manager added:', managerAddress);
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Failed to add manager:', error);
      throw error;
    }
  }

  /**
   * Batch add issuers
   */
  async batchAddIssuers(issuersData) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const addresses = issuersData.map(d => d.address);
      const metadataURIs = issuersData.map(d => d.metadataURI);
      
      // Validate all addresses
      for (const address of addresses) {
        if (!ethers.utils.isAddress(address)) {
          throw new Error(`Invalid address: ${address}`);
        }
      }

      const tx = await this.contracts.userRegistry.batchAddIssuers(addresses, metadataURIs);
      const receipt = await tx.wait();
      
      console.log('Batch issuers added:', addresses.length);
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        count: addresses.length
      };
      
    } catch (error) {
      console.error('Failed to batch add issuers:', error);
      throw error;
    }
  }

  /**
   * Batch add managers
   */
  async batchAddManagers(managersData) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const addresses = managersData.map(d => d.address);
      const metadataURIs = managersData.map(d => d.metadataURI);
      
      // Validate all addresses
      for (const address of addresses) {
        if (!ethers.utils.isAddress(address)) {
          throw new Error(`Invalid address: ${address}`);
        }
      }

      const tx = await this.contracts.userRegistry.batchAddManagers(addresses, metadataURIs);
      const receipt = await tx.wait();
      
      console.log('Batch managers added:', addresses.length);
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        count: addresses.length
      };
      
    } catch (error) {
      console.error('Failed to batch add managers:', error);
      throw error;
    }
  }

  /**
   * Remove issuer
   */
  async removeIssuer(issuerAddress) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const tx = await this.contracts.userRegistry.removeIssuer(issuerAddress);
      const receipt = await tx.wait();
      
      console.log('Issuer removed:', issuerAddress);
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Failed to remove issuer:', error);
      throw error;
    }
  }

  /**
   * Remove manager
   */
  async removeManager(managerAddress) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const tx = await this.contracts.userRegistry.removeManager(managerAddress);
      const receipt = await tx.wait();
      
      console.log('Manager removed:', managerAddress);
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Failed to remove manager:', error);
      throw error;
    }
  }

  // ========== ASSET MANAGEMENT ==========

  /**
   * Update asset metadata
   */
  async updateAssetMetadata(assetId, ipfsMetadataCID) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const tx = await this.contracts.assetRegistry.updateAssetMetadata(assetId, ipfsMetadataCID);
      const receipt = await tx.wait();
      
      console.log('Asset metadata updated:', assetId);
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Failed to update asset metadata:', error);
      throw error;
    }
  }

  /**
   * Add attestation to asset
   */
  async addAttestationToAsset(assetId, attestationId) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const tx = await this.contracts.assetRegistry.addAttestation(assetId, attestationId);
      const receipt = await tx.wait();
      
      console.log('Attestation added to asset:', { assetId, attestationId });
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Failed to add attestation to asset:', error);
      throw error;
    }
  }

  /**
   * Get all assets for admin dashboard
   */
  async getAllAssets() {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const assetIds = await this.contracts.assetRegistry.getAllAssets();
      const assets = [];
      
      for (const assetId of assetIds) {
        try {
          const assetInfo = await this.contracts.assetRegistry.getAssetInfo(assetId);
          assets.push({
            assetId,
            tokenAddress: assetInfo.tokenAddress,
            compliance: assetInfo.compliance,
            attestationIds: assetInfo.attestationIds,
            ipfsMetadataCID: assetInfo.ipfsMetadataCID,
            isActive: assetInfo.isActive,
            registrationTimestamp: assetInfo.registrationTimestamp.toNumber()
          });
        } catch (error) {
          console.warn(`Failed to get info for asset ${assetId}:`, error);
        }
      }
      
      return assets;
      
    } catch (error) {
      console.error('Failed to get all assets:', error);
      throw error;
    }
  }

  // ========== WORKFLOW FUNCTIONS ==========

  /**
   * Complete asset approval workflow
   * 1. Upload legal documents to IPFS
   * 2. Create attestation
   * 3. Update asset metadata
   */
  async approveAssetWorkflow(assetId, legalDocuments, assetMetadata, lawFirmAddress) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('Starting asset approval workflow for:', assetId);
      
      // Step 1: Upload legal documents to IPFS
      console.log('Uploading legal documents to IPFS...');
      const documentsCID = await pinataService.pinLegalDocuments(legalDocuments);
      
      // Step 2: Create attestation
      console.log('Creating attestation...');
      const attestationResult = await this.createAttestation(
        assetId,
        lawFirmAddress,
        documentsCID
      );
      
      // Step 3: Upload complete metadata to IPFS
      console.log('Uploading asset metadata to IPFS...');
      const completeMetadata = {
        ...assetMetadata,
        attestationIds: [attestationResult.attestationId],
        legalDocumentsCID: documentsCID,
        approvalTimestamp: Date.now(),
        approvedBy: await this.signer.getAddress()
      };
      
      const metadataCID = await pinataService.pinAssetMetadata(completeMetadata);
      
      // Step 4: Update asset metadata
      console.log('Updating asset metadata...');
      await this.updateAssetMetadata(assetId, metadataCID);
      
      // Step 5: Add attestation to asset
      console.log('Adding attestation to asset...');
      await this.addAttestationToAsset(assetId, attestationResult.attestationId);
      
      // Store complete workflow result
      localStorage.setItem(`assetApprovalWorkflow:${assetId}`, JSON.stringify({
        attestationId: attestationResult.attestationId,
        documentsCID,
        metadataCID,
        timestamp: Date.now(),
        status: 'completed',
        lawFirm: lawFirmAddress,
        approvedBy: await this.signer.getAddress()
      }));
      
      console.log('Asset approval workflow completed successfully');
      
      return {
        attestationId: attestationResult.attestationId,
        documentsCID,
        metadataCID,
        status: 'completed'
      };
      
    } catch (error) {
      console.error('Asset approval workflow failed:', error);
      
      // Store failure state
      localStorage.setItem(`assetApprovalWorkflow:${assetId}`, JSON.stringify({
        status: 'failed',
        error: error.message,
        timestamp: Date.now()
      }));
      
      throw error;
    }
  }

  // ========== UTILITY FUNCTIONS ==========

  /**
   * Check user roles
   */
  async checkUserRoles(address) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    const [isAdmin, isIssuer, isManager] = await Promise.all([
      this.contracts.userRegistry.isAdmin(address),
      this.contracts.userRegistry.isIssuer(address),
      this.contracts.userRegistry.isManager(address)
    ]);
    
    return { isAdmin, isIssuer, isManager };
  }

  /**
   * Get pending assets (those without valid attestations)
   */
  async getPendingAssets() {
    const allAssets = await this.getAllAssets();
    const pendingAssets = [];
    
    for (const asset of allAssets) {
      let hasValidAttestation = false;
      
      for (const attestationId of asset.attestationIds) {
        try {
          const isValid = await this.contracts.attestationRegistry.isAttestationValid(attestationId);
          if (isValid) {
            hasValidAttestation = true;
            break;
          }
        } catch (error) {
          console.warn(`Failed to check attestation ${attestationId}:`, error);
        }
      }
      
      if (!hasValidAttestation) {
        pendingAssets.push(asset);
      }
    }
    
    return pendingAssets;
  }
}

// Export singleton instance
export const adminService = new AdminService();
export default adminService;