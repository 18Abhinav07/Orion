/**
 * @fileoverview Pinata Service for IPFS operations
 * @description Handles all IPFS pinning operations for ERC-3643 dApp
 */

import axios from 'axios';

/**
 * @typedef {Object} KYCUserData
 * @property {string} address
 * @property {string} fullName
 * @property {string} email
 * @property {string} dateOfBirth
 * @property {string} nationality
 * @property {string} documentType
 * @property {string} documentNumber
 * @property {string} documentExpiry
 * @property {'basic'|'enhanced'|'premium'} verificationLevel
 * @property {number} timestamp
 * @property {string} [ipAddress]
 * @property {string} [userAgent]
 */

/**
 * @typedef {Object} MerkleTreeData
 * @property {string} root
 * @property {string[]} leaves
 * @property {Object<string, string[]>} proofs
 * @property {Object} metadata
 * @property {number} metadata.totalUsers
 * @property {number} metadata.createdAt
 * @property {number} metadata.expiryDate
 * @property {string} metadata.issuer
 * @property {string} metadata.version
 */

class PinataService {
  constructor() {
    this.apiKey = null;
    this.secretKey = null;
    this.baseURL = 'https://api.pinata.cloud';
    this.initialized = false;
  }

  /**
   * Initialize Pinata service with API credentials
   */
  initialize(apiKey, secretKey) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.initialized = true;
    console.log('PinataService initialized');
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    if (!this.initialized) {
      throw new Error('Pinata service not initialized');
    }
    
    return {
      'Content-Type': 'application/json',
      'pinata_api_key': this.apiKey,
      'pinata_secret_api_key': this.secretKey
    };
  }

  /**
   * Pin JSON data to IPFS
   */
  async pinJSONToIPFS(jsonData, metadata = {}) {
    try {
      const data = {
        pinataContent: jsonData,
        pinataMetadata: {
          name: metadata.name || 'ERC3643-Data',
          keyvalues: metadata.keyvalues || {}
        },
        pinataOptions: {
          cidVersion: 1,
          wrapWithDirectory: false
        }
      };

      const response = await axios.post(
        `${this.baseURL}/pinning/pinJSONToIPFS`,
        data,
        { headers: this.getHeaders() }
      );

      console.log('JSON pinned to IPFS:', response.data.IpfsHash);
      return response.data.IpfsHash;
      
    } catch (error) {
      console.error('Failed to pin JSON to IPFS:', error);
      throw new Error(`IPFS pinning failed: ${error.message}`);
    }
  }

  /**
   * Pin file to IPFS
   */
  async pinFileToIPFS(file, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const pinataMetadata = JSON.stringify({
        name: metadata.name || file.name,
        keyvalues: metadata.keyvalues || {}
      });
      formData.append('pinataMetadata', pinataMetadata);
      
      const pinataOptions = JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false
      });
      formData.append('pinataOptions', pinataOptions);

      const response = await axios.post(
        `${this.baseURL}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.secretKey
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      console.log('File pinned to IPFS:', response.data.IpfsHash);
      return response.data.IpfsHash;
      
    } catch (error) {
      console.error('Failed to pin file to IPFS:', error);
      throw new Error(`File pinning failed: ${error.message}`);
    }
  }

  /**
   * Pin multiple files to IPFS
   */
  async pinMultipleFiles(files, metadata = {}) {
    try {
      const results = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileMetadata = {
          name: `${metadata.name || 'document'}-${i + 1}-${file.name}`,
          keyvalues: {
            ...metadata.keyvalues,
            fileIndex: i.toString(),
            originalName: file.name
          }
        };
        
        const ipfsHash = await this.pinFileToIPFS(file, fileMetadata);
        results.push({
          filename: file.name,
          ipfsHash,
          size: file.size,
          type: file.type
        });
      }
      
      return results;
      
    } catch (error) {
      console.error('Failed to pin multiple files:', error);
      throw error;
    }
  }

  /**
   * Pin asset metadata to IPFS
   */
  async pinAssetMetadata(assetData) {
    try {
      const metadata = {
        name: `Asset-${assetData.assetId || 'Unknown'}`,
        keyvalues: {
          type: 'asset-metadata',
          assetId: assetData.assetId || '',
          issuer: assetData.issuer || '',
          version: assetData.metadataVersion || '1.0'
        }
      };

      const standardizedMetadata = {
        // Core asset information
        title: assetData.title,
        description: assetData.description,
        assetId: assetData.assetId,
        issuer: assetData.issuer,
        
        // Financial information
        valuation: assetData.valuation,
        currency: assetData.currency || 'USD',
        
        // Legal information
        jurisdiction: assetData.jurisdiction,
        legalStructure: assetData.legalStructure,
        legalDocumentsCID: assetData.legalDocumentsCID,
        
        // Compliance information
        attestationIds: assetData.attestationIds || [],
        complianceStatus: assetData.complianceStatus || 'pending',
        
        // Technical information
        tokenStandard: 'ERC-3643',
        metadataVersion: assetData.metadataVersion || '1.0',
        
        // Timestamps
        createdAt: assetData.createdAt || Date.now(),
        updatedAt: Date.now(),
        approvalTimestamp: assetData.approvalTimestamp,
        
        // Admin information
        approvedBy: assetData.approvedBy,
        
        // Additional metadata
        ...assetData.additionalMetadata
      };

      return await this.pinJSONToIPFS(standardizedMetadata, metadata);
      
    } catch (error) {
      console.error('Failed to pin asset metadata:', error);
      throw error;
    }
  }

  /**
   * Pin legal documents with structured metadata
   */
  async pinLegalDocuments(documents) {
    try {
      if (!Array.isArray(documents) || documents.length === 0) {
        throw new Error('Documents array is required');
      }

      // Pin individual documents
      const documentResults = await this.pinMultipleFiles(documents, {
        name: 'legal-document',
        keyvalues: {
          type: 'legal-document',
          category: 'compliance'
        }
      });

      // Create index document
      const documentsIndex = {
        type: 'legal-documents-index',
        documents: documentResults.map((doc, index) => ({
          index,
          filename: doc.filename,
          ipfsHash: doc.ipfsHash,
          size: doc.size,
          type: doc.type,
          uploadedAt: Date.now()
        })),
        totalDocuments: documentResults.length,
        createdAt: Date.now()
      };

      // Pin the index
      const indexCID = await this.pinJSONToIPFS(documentsIndex, {
        name: 'legal-documents-index',
        keyvalues: {
          type: 'legal-documents-index',
          documentCount: documentResults.length.toString()
        }
      });

      console.log('Legal documents pinned with index:', indexCID);
      
      return indexCID;
      
    } catch (error) {
      console.error('Failed to pin legal documents:', error);
      throw error;
    }
  }

  /**
   * Pin user metadata (issuer/manager profiles)
   */
  async pinUserMetadata(userData, userType) {
    try {
      const metadata = {
        name: `${userType}-${userData.address}`,
        keyvalues: {
          type: `${userType}-metadata`,
          address: userData.address,
          userType
        }
      };

      const standardizedUserData = {
        // Identity information
        address: userData.address,
        userType: userType, // 'issuer' or 'manager'
        
        // Profile information
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        
        // Organization information
        organization: userData.organization,
        organizationType: userData.organizationType,
        website: userData.website,
        
        // Location information
        country: userData.country,
        jurisdiction: userData.jurisdiction,
        address: userData.physicalAddress,
        
        // Legal information
        registrationNumber: userData.registrationNumber,
        taxId: userData.taxId,
        
        // Compliance information
        kycStatus: userData.kycStatus || 'pending',
        amlStatus: userData.amlStatus || 'pending',
        
        // Additional documents
        documentsIPFS: userData.documentsIPFS || [],
        
        // Metadata
        metadataVersion: '1.0',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      return await this.pinJSONToIPFS(standardizedUserData, metadata);
      
    } catch (error) {
      console.error('Failed to pin user metadata:', error);
      throw error;
    }
  }

  /**
   * Get content from IPFS
   */
  async getFromIPFS(ipfsHash) {
    try {
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get content from IPFS:', error);
      throw new Error(`Failed to retrieve IPFS content: ${error.message}`);
    }
  }

  /**
   * Check if content is pinned
   */
  async isPinned(ipfsHash) {
    try {
      const response = await axios.get(
        `${this.baseURL}/data/pinList?hashContains=${ipfsHash}`,
        { headers: this.getHeaders() }
      );
      
      return response.data.rows.length > 0;
      
    } catch (error) {
      console.error('Failed to check pin status:', error);
      return false;
    }
  }

  /**
   * Unpin content from IPFS
   */
  async unpinFromIPFS(ipfsHash) {
    try {
      await axios.delete(
        `${this.baseURL}/pinning/unpin/${ipfsHash}`,
        { headers: this.getHeaders() }
      );
      
      console.log('Content unpinned from IPFS:', ipfsHash);
      return true;
      
    } catch (error) {
      console.error('Failed to unpin from IPFS:', error);
      throw new Error(`Unpinning failed: ${error.message}`);
    }
  }

  /**
   * Get pin list
   */
  async getPinList(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.status) params.append('status', options.status);
      if (options.pageLimit) params.append('pageLimit', options.pageLimit);
      if (options.pageOffset) params.append('pageOffset', options.pageOffset);
      if (options.metadata) {
        params.append('metadata[keyvalues]', JSON.stringify(options.metadata));
      }

      const response = await axios.get(
        `${this.baseURL}/data/pinList?${params.toString()}`,
        { headers: this.getHeaders() }
      );
      
      return response.data;
      
    } catch (error) {
      console.error('Failed to get pin list:', error);
      throw new Error(`Failed to get pin list: ${error.message}`);
    }
  }

  /**
   * Test Pinata connection
   */
  async testAuthentication() {
    try {
      const response = await axios.get(
        `${this.baseURL}/data/testAuthentication`,
        { headers: this.getHeaders() }
      );
      
      console.log('Pinata authentication test successful:', response.data);
      return true;
      
    } catch (error) {
      console.error('Pinata authentication test failed:', error);
      return false;
    }
  }

  /**
   * Get IPFS gateway URL
   */
  getGatewayUrl(ipfsHash) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }
}

// Export singleton instance
export const pinataService = new PinataService();

// Factory function for compatibility with TypeScript version
export const getPinataService = (config) => {
  if (config) {
    pinataService.initialize(config.apiKey, config.apiSecret);
  }
  return pinataService;
};

// Export class for TypeScript compatibility
export { PinataService };

// Export type definitions for compatibility
export const KYCUserData = {};
export const MerkleTreeData = {};

// ============================================
// Story Protocol Metadata Upload (JWT-based)
// ============================================

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud';

/**
 * Upload JSON metadata to IPFS using JWT authentication
 * @param {Object} data - JSON object to upload
 * @param {string} [name] - Optional name for the pinned content
 * @returns {Promise<string>} IPFS URI (ipfs://...)
 */
export async function uploadJSONToIPFS(data, name) {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured. Please add VITE_PINATA_JWT to your .env file');
  }

  try {
    const pinataData = {
      pinataContent: data,
      pinataMetadata: {
        name: name || `metadata-${Date.now()}`,
      },
    };

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(pinataData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata upload error:', errorText);
      throw new Error(`Pinata upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const ipfsUri = `ipfs://${result.IpfsHash}`;
    
    console.log(`✅ Uploaded to IPFS: ${ipfsUri}`);
    return ipfsUri;
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error);
    throw error;
  }
}

/**
 * Upload a file to IPFS using JWT authentication
 * @param {File} file - File object to upload
 * @param {string} [name] - Optional name for the pinned content
 * @returns {Promise<string>} IPFS URI (ipfs://...)
 */
export async function uploadFileToIPFS(file, name) {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured. Please add VITE_PINATA_JWT to your .env file');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: name || file.name,
    });
    formData.append('pinataMetadata', metadata);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata file upload error:', errorText);
      throw new Error(`Pinata file upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const ipfsUri = `ipfs://${result.IpfsHash}`;
    
    console.log(`✅ Uploaded file to IPFS: ${ipfsUri}`);
    return ipfsUri;
  } catch (error) {
    console.error('Error uploading file to Pinata:', error);
    throw error;
  }
}

/**
 * Convert IPFS URI to HTTP gateway URL
 * @param {string} ipfsUri - IPFS URI (ipfs://...)
 * @returns {string} HTTP URL via Pinata gateway
 */
export function ipfsToGatewayUrl(ipfsUri) {
  if (!ipfsUri.startsWith('ipfs://')) {
    return ipfsUri;
  }
  
  const hash = ipfsUri.replace('ipfs://', '');
  return `${PINATA_GATEWAY}/ipfs/${hash}`;
}

export default pinataService;