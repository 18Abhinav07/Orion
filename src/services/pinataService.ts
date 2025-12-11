// Pinata API Service for KYC Data Storage
// Integrates with MerkleKYC contract for privacy-preserving verification

export interface PinataConfig {
  apiKey: string;
  apiSecret: string;
  baseURL?: string;
}

export interface KYCUserData {
  address: string;
  fullName: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  documentType: string;
  documentNumber: string;
  documentExpiry: string;
  verificationLevel: 'basic' | 'enhanced' | 'premium';
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface MerkleTreeData {
  root: string;
  leaves: string[];
  proofs: { [address: string]: string[] };
  metadata: {
    totalUsers: number;
    createdAt: number;
    expiryDate: number;
    issuer: string;
    version: string;
  };
}

export interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate?: boolean;
}

export interface PinataMetadata {
  name?: string;
  keyvalues?: { [key: string]: string };
}

export class PinataService {
  private config: PinataConfig;
  private baseURL: string;

  constructor(config: PinataConfig) {
    this.config = config;
    this.baseURL = config.baseURL || 'https://api.pinata.cloud';
  }

  /**
   * Test Pinata API connection
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/data/testAuthentication`, {
        method: 'GET',
        headers: {
          'pinata_api_key': this.config.apiKey,
          'pinata_secret_api_key': this.config.apiSecret,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Pinata authentication test failed:', error);
      return false;
    }
  }

  /**
   * Upload KYC user data to IPFS via Pinata
   */
  async uploadKYCData(userData: KYCUserData, metadata?: PinataMetadata): Promise<string> {
    try {
      // Encrypt or hash sensitive data before upload
      const sanitizedData = this.sanitizeKYCData(userData);
      
      const data = {
        pinataContent: sanitizedData,
        pinataMetadata: {
          name: metadata?.name || `KYC-${userData.address}-${Date.now()}`,
          keyvalues: {
            type: 'kyc-data',
            address: userData.address,
            verificationLevel: userData.verificationLevel,
            timestamp: userData.timestamp.toString(),
            ...metadata?.keyvalues
          }
        },
        pinataOptions: {
          cidVersion: 1,
          wrapWithDirectory: false
        }
      };

      const response = await fetch(`${this.baseURL}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.config.apiKey,
          'pinata_secret_api_key': this.config.apiSecret,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Pinata upload failed: ${errorData.error || response.statusText}`);
      }

      const result: PinataUploadResponse = await response.json();
      return result.IpfsHash;
    } catch (error) {
      console.error('Failed to upload KYC data to Pinata:', error);
      throw new Error(`KYC data upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload Merkle tree data to IPFS
   */
  async uploadMerkleTree(treeData: MerkleTreeData, metadata?: PinataMetadata): Promise<string> {
    try {
      const data = {
        pinataContent: treeData,
        pinataMetadata: {
          name: metadata?.name || `MerkleTree-${Date.now()}`,
          keyvalues: {
            type: 'merkle-tree',
            totalUsers: treeData.metadata.totalUsers.toString(),
            issuer: treeData.metadata.issuer,
            version: treeData.metadata.version,
            createdAt: treeData.metadata.createdAt.toString(),
            ...metadata?.keyvalues
          }
        },
        pinataOptions: {
          cidVersion: 1,
          wrapWithDirectory: false
        }
      };

      const response = await fetch(`${this.baseURL}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.config.apiKey,
          'pinata_secret_api_key': this.config.apiSecret,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Pinata upload failed: ${errorData.error || response.statusText}`);
      }

      const result: PinataUploadResponse = await response.json();
      return result.IpfsHash;
    } catch (error) {
      console.error('Failed to upload Merkle tree to Pinata:', error);
      throw new Error(`Merkle tree upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve data from IPFS via Pinata gateway
   */
  async retrieveFromIPFS<T = any>(ipfsHash: string): Promise<T> {
    try {
      // Use Pinata gateway for faster access
      const gatewayURL = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      
      const response = await fetch(gatewayURL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to retrieve from IPFS: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to retrieve data from IPFS:', error);
      throw new Error(`IPFS retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Merkle tree from user addresses
   */
  generateMerkleTree(
    userAddresses: string[], 
    issuer: string, 
    salt: string,
    expiryDays: number = 365
  ): MerkleTreeData {
    // Simple Merkle tree implementation (in production, use a proper library like merkletreejs)
    const leaves = userAddresses.map(address => 
      this.generateLeafHash(address, salt)
    );

    // Build tree from bottom up
    let currentLevel = [...leaves];
    const tree: string[][] = [currentLevel];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const parent = this.hashPair(left, right);
        nextLevel.push(parent);
      }
      
      currentLevel = nextLevel;
      tree.push(currentLevel);
    }

    const root = currentLevel[0];

    // Generate proofs for each address
    const proofs: { [address: string]: string[] } = {};
    userAddresses.forEach((address, index) => {
      proofs[address] = this.generateMerkleProof(tree, index);
    });

    return {
      root,
      leaves,
      proofs,
      metadata: {
        totalUsers: userAddresses.length,
        createdAt: Math.floor(Date.now() / 1000),
        expiryDate: Math.floor(Date.now() / 1000) + (expiryDays * 24 * 60 * 60),
        issuer,
        version: '1.0'
      }
    };
  }

  /**
   * Generate leaf hash for Merkle tree (matches contract implementation)
   */
  private generateLeafHash(address: string, salt: string): string {
    // This should match the _constructLeaf function in MerkleKYC contract
    // Using a simple hash function for demo (use proper keccak256 in production)
    const combined = address.toLowerCase() + salt;
    return this.simpleHash(combined);
  }

  /**
   * Generate Merkle proof for a specific leaf
   */
  private generateMerkleProof(tree: string[][], leafIndex: number): string[] {
    const proof: string[] = [];
    let currentIndex = leafIndex;

    // Work our way up the tree
    for (let level = 0; level < tree.length - 1; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < tree[level].length) {
        proof.push(tree[level][siblingIndex]);
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Hash a pair of values (for Merkle tree construction)
   */
  private hashPair(left: string, right: string): string {
    // Sort to ensure deterministic hashing regardless of order
    const sorted = [left, right].sort();
    return this.simpleHash(sorted[0] + sorted[1]);
  }

  /**
   * Simple hash function (replace with keccak256 for production)
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  }

  /**
   * Sanitize KYC data before IPFS upload (remove or hash sensitive fields)
   */
  private sanitizeKYCData(userData: KYCUserData): Partial<KYCUserData> {
    // In production, encrypt or hash sensitive fields
    return {
      address: userData.address,
      verificationLevel: userData.verificationLevel,
      timestamp: userData.timestamp,
      // Hash sensitive data
      fullNameHash: this.simpleHash(userData.fullName),
      emailHash: this.simpleHash(userData.email),
      documentHash: this.simpleHash(userData.documentNumber),
      // Keep non-sensitive metadata
      nationality: userData.nationality,
      documentType: userData.documentType,
    };
  }

  /**
   * List all pinned files (for admin purposes)
   */
  async listPinnedFiles(filters?: { 
    metadata?: { [key: string]: string },
    status?: 'pinned' | 'unpinned',
    limit?: number
  }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status) {
        params.append('status', filters.status);
      }
      
      if (filters?.limit) {
        params.append('pageLimit', filters.limit.toString());
      }

      // Add metadata filters
      if (filters?.metadata) {
        Object.entries(filters.metadata).forEach(([key, value]) => {
          params.append(`metadata[keyvalues][${key}]`, value);
        });
      }

      const response = await fetch(`${this.baseURL}/data/pinList?${params}`, {
        method: 'GET',
        headers: {
          'pinata_api_key': this.config.apiKey,
          'pinata_secret_api_key': this.config.apiSecret,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list pinned files: ${response.statusText}`);
      }

      const result = await response.json();
      return result.rows || [];
    } catch (error) {
      console.error('Failed to list pinned files:', error);
      throw error;
    }
  }

  /**
   * Unpin a file from IPFS (for data management)
   */
  async unpinFile(ipfsHash: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/pinning/unpin/${ipfsHash}`, {
        method: 'DELETE',
        headers: {
          'pinata_api_key': this.config.apiKey,
          'pinata_secret_api_key': this.config.apiSecret,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to unpin file:', error);
      return false;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/data/userPinnedDataTotal`, {
        method: 'GET',
        headers: {
          'pinata_api_key': this.config.apiKey,
          'pinata_secret_api_key': this.config.apiSecret,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get usage stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      throw error;
    }
  }
}

// Singleton instance for app-wide use
let pinataServiceInstance: PinataService | null = null;

export const getPinataService = (config: PinataConfig): PinataService => {
  if (!pinataServiceInstance) {
    pinataServiceInstance = new PinataService(config);
  }
  return pinataServiceInstance;
};

export default PinataService;