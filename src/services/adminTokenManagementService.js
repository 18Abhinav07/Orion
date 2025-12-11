/**
 * @fileoverview Admin Token Management Service
 * @description Admin service for managing token requests through TokenManagement contract
 */

import { ethers } from 'ethers';

// TokenManagement contract ABI for admin functions
const TOKEN_MANAGEMENT_ADMIN_ABI = [
  // Admin view functions
  "function getPendingRequests() external view returns (bytes32[] memory)",
  "function getApprovedRequests() external view returns (bytes32[] memory)",
  "function getRequestDetails(bytes32 _requestId) external view returns (tuple(bytes32 requestId, address issuer, string metadataURI, uint256 amount, uint256 price, uint8 status, uint256 submittedAt, uint256 approvedAt, uint256 deployedAt, uint256 tokenId, string rejectionReason))",
  
  // Admin functions
  "function approveTokenRequest(bytes32 _requestId) external",
  "function rejectTokenRequest(bytes32 _requestId, string memory _reason) external",
  
  // Events
  "event TokenRequestSubmitted(bytes32 indexed requestId, address indexed issuer, string metadataURI, uint256 amount, uint256 price, uint256 timestamp)",
  "event TokenRequestApproved(bytes32 indexed requestId, address indexed admin, uint256 timestamp)",
  "event TokenRequestRejected(bytes32 indexed requestId, address indexed admin, string reason, uint256 timestamp)"
];

// Request Status Enum
const RequestStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Deployed: 3,
  Listed: 4
};

/**
 * @typedef {Object} TokenRequest
 * @property {string} requestId
 * @property {string} issuer
 * @property {string} metadataURI
 * @property {string} amount
 * @property {string} price
 * @property {'Pending'|'Approved'|'Rejected'|'Deployed'|'Listed'} status
 * @property {Date} submittedAt
 * @property {Date} [approvedAt]
 * @property {Date} [deployedAt]
 * @property {string} [tokenId]
 * @property {string} [rejectionReason]
 */

class AdminTokenManagementService {
  constructor() {
    this.initialized = false;
    this.tokenManagementContract = null;
    this.tokenManagementAddress = '0x24eb8429Dc1e5f217866D0c74Db245Fa3aAFA31A'; // FINAL: Complete workflow TokenManagement contract
  }

  /**
   * Initialize admin service with TokenManagement contract
   */
  async initialize(provider, tokenManagementAddress) {
    try {
      this.provider = provider;
      this.signer = provider.getSigner();
      
      this.tokenManagementContract = new ethers.Contract(
        tokenManagementAddress,
        TOKEN_MANAGEMENT_ADMIN_ABI,
        this.signer
      );
      
      this.initialized = true;
      console.log('✅ Admin Token Management Service initialized:', tokenManagementAddress);
      
    } catch (error) {
      console.error('❌ Failed to initialize Admin Token Management Service:', error);
      throw error;
    }
  }

  /**
   * Get all pending token requests
   */
  async getPendingTokenRequests() {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🔄 Fetching pending token requests from TokenManagement contract...');
      
      const requestIds = await this.tokenManagementContract.getPendingRequests();
      console.log('📋 Found pending request IDs:', requestIds);
      
      const requests = [];
      
      for (const requestId of requestIds) {
        try {
          const details = await this.tokenManagementContract.getRequestDetails(requestId);
          
          const request = {
            requestId,
            issuer: details.issuer,
            metadataURI: details.metadataURI,
            amount: details.amount.toString(),
            price: ethers.utils.formatEther(details.price),
            status: this._getStatusString(details.status),
            submittedAt: new Date(details.submittedAt * 1000),
            approvedAt: details.approvedAt > 0 ? new Date(details.approvedAt * 1000) : undefined,
            deployedAt: details.deployedAt > 0 ? new Date(details.deployedAt * 1000) : undefined,
            tokenId: details.tokenId > 0 ? details.tokenId.toString() : undefined,
            rejectionReason: details.rejectionReason || undefined
          };
          
          requests.push(request);
          console.log('📋 Request details:', request);
          
        } catch (err) {
          console.warn(`Failed to fetch details for request ${requestId}:`, err);
        }
      }
      
      console.log('✅ Fetched pending requests:', requests.length);
      return requests;
      
    } catch (error) {
      console.error('❌ Failed to fetch pending token requests:', error);
      throw error;
    }
  }

  /**
   * Get all approved token requests (waiting for deployment)
   */
  async getApprovedTokenRequests() {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🔄 Fetching approved token requests...');
      
      const requestIds = await this.tokenManagementContract.getApprovedRequests();
      const requests = [];
      
      for (const requestId of requestIds) {
        try {
          const details = await this.tokenManagementContract.getRequestDetails(requestId);
          
          requests.push({
            requestId,
            issuer: details.issuer,
            metadataURI: details.metadataURI,
            amount: details.amount.toString(),
            price: ethers.utils.formatEther(details.price),
            status: this._getStatusString(details.status),
            submittedAt: new Date(details.submittedAt * 1000),
            approvedAt: details.approvedAt > 0 ? new Date(details.approvedAt * 1000) : undefined
          });
          
        } catch (err) {
          console.warn(`Failed to fetch details for approved request ${requestId}:`, err);
        }
      }
      
      console.log('✅ Fetched approved requests:', requests.length);
      return requests;
      
    } catch (error) {
      console.error('❌ Failed to fetch approved token requests:', error);
      throw error;
    }
  }

  /**
   * Approve a token request
   */
  async approveTokenRequest(requestId) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🔄 Approving token request:', requestId);
      
      const tx = await this.tokenManagementContract.approveTokenRequest(requestId);
      console.log('⏳ Approval transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Token request approved successfully!');
      
      return {
        txHash: tx.hash,
        status: 'approved'
      };
      
    } catch (error) {
      console.error('❌ Failed to approve token request:', error);
      throw error;
    }
  }

  /**
   * Reject a token request
   */
  async rejectTokenRequest(requestId, reason) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🔄 Rejecting token request:', requestId, 'Reason:', reason);
      
      const tx = await this.tokenManagementContract.rejectTokenRequest(requestId, reason);
      console.log('⏳ Rejection transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Token request rejected successfully!');
      
      return {
        txHash: tx.hash,
        status: 'rejected'
      };
      
    } catch (error) {
      console.error('❌ Failed to reject token request:', error);
      throw error;
    }
  }

  /**
   * Fetch metadata from IPFS
   */
  async fetchMetadataFromIPFS(metadataURI) {
    try {
      const response = await fetch(metadataURI);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.error('Failed to fetch metadata from IPFS:', error);
      return null;
    }
  }

  /**
   * Get formatted pending assets for admin UI (compatible with existing interface)
   */
  async getFormattedPendingAssets() {
    try {
      const pendingRequests = await this.getPendingTokenRequests();
      
      const formattedAssets = await Promise.all(
        pendingRequests.map(async (request) => {
          // Try to fetch metadata for better display
          let metadata = null;
          if (request.metadataURI) {
            metadata = await this.fetchMetadataFromIPFS(request.metadataURI);
          }
          
          return {
            assetId: request.requestId,
            requestId: request.requestId,
            name: metadata?.name || `Token Request ${request.requestId.slice(0, 8)}...`,
            description: metadata?.description || `${request.amount} tokens at ${request.price} ETH each`,
            status: 'Pending',
            createdAt: request.submittedAt,
            metadataURI: request.metadataURI,
            issuer: request.issuer,
            amount: request.amount,
            price: request.price,
            metadata: metadata,
            // Additional fields for token management
            tokenRequest: true,
            submittedAt: request.submittedAt
          };
        })
      );
      
      console.log('✅ Formatted pending assets for UI:', formattedAssets.length);
      return formattedAssets;
      
    } catch (error) {
      console.error('❌ Failed to get formatted pending assets:', error);
      return [];
    }
  }

  // Helper functions
  _getStatusString(status) {
    const statusMap = {
      0: 'Pending',
      1: 'Approved', 
      2: 'Rejected',
      3: 'Deployed',
      4: 'Listed'
    };
    return statusMap[status] || 'Unknown';
  }
}

export default AdminTokenManagementService;