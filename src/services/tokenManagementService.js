/**
 * @fileoverview Token Management Service - Proper Request/Approval Workflow
 * @description Integrates with TokenManagement contract for proper issuer request → admin approval → token deployment workflow
 */

import { ethers } from 'ethers';

// TokenManagement contract ABI
const TOKEN_MANAGEMENT_ABI = [
  // Request submission
  "function submitTokenRequest(string memory _metadataURI, uint256 _amount, uint256 _price) external returns (bytes32)",
  
  // Token deployment
  "function deployApprovedToken(bytes32 _requestId) external returns (uint256)",
  
  // Marketplace listing
  "function listAsset(bytes32 _requestId, uint256 _amount) external",
  
  // View functions
  "function getMyRequests() external view returns (bytes32[] memory)",
  "function getRequestDetails(bytes32 _requestId) external view returns (tuple(bytes32 requestId, address issuer, string metadataURI, uint256 amount, uint256 price, uint8 status, uint256 submittedAt, uint256 approvedAt, uint256 deployedAt, uint256 tokenId, string rejectionReason))",
  "function getMyTokens() external view returns (uint256[] memory)",
  "function getPendingRequests() external view returns (bytes32[] memory)",
  "function getApprovedRequests() external view returns (bytes32[] memory)",
  
  // Admin functions
  "function approveTokenRequest(bytes32 _requestId) external",
  "function rejectTokenRequest(bytes32 _requestId, string memory _reason) external",
  
  // Events
  "event TokenRequestSubmitted(bytes32 indexed requestId, address indexed issuer, string metadataURI, uint256 amount, uint256 price, uint256 timestamp)",
  "event TokenRequestApproved(bytes32 indexed requestId, address indexed admin, uint256 timestamp)",
  "event TokenRequestRejected(bytes32 indexed requestId, address indexed admin, string reason, uint256 timestamp)",
  "event TokenDeployed(bytes32 indexed requestId, uint256 indexed tokenId, address indexed issuer, uint256 amount, uint256 price, uint256 timestamp)",
  "event TokenListedOnMarketplace(uint256 indexed tokenId, address indexed issuer, uint256 amount, uint256 price, uint256 timestamp)"
];

// Admin contract ABI (for issuer authorization)
const ADMIN_ABI = [
  "function isIssuer(address _address) external view returns (bool)"
];

// ERC1155Core ABI (for token approvals)
const ERC1155_ABI = [
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address account, address operator) external view returns (bool)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function uri(uint256 tokenId) external view returns (string memory)"
];

// Request Status Enum
const RequestStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Deployed: 3,
  Listed: 4
};

class TokenManagementService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.initialized = false;
  }

  /**
   * Initialize with contract addresses
   */
  async initialize(provider, contractAddresses) {
    try {
      this.provider = provider;
      this.signer = provider.getSigner();
      
      // Initialize contracts
      this.contracts = {
        tokenManagement: new ethers.Contract(
          contractAddresses.TOKEN_MANAGEMENT,
          TOKEN_MANAGEMENT_ABI,
          this.signer
        ),
        admin: new ethers.Contract(
          contractAddresses.ADMIN,
          ADMIN_ABI,
          this.signer
        ),
        erc1155Core: new ethers.Contract(
          contractAddresses.ERC1155_CORE,
          ERC1155_ABI,
          this.signer
        )
      };
      
      this.contractAddresses = contractAddresses;
      this.initialized = true;
      
      console.log('✅ Token Management Service initialized with contracts:', contractAddresses);
      
    } catch (error) {
      console.error('❌ Failed to initialize Token Management Service:', error);
      throw error;
    }
  }

  /**
   * Check if user is authorized issuer
   */
  async isAuthorizedIssuer(address) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const isAuthorized = await this.contracts.admin.isIssuer(address);
      console.log(`🔍 Authorization check for ${address}:`, isAuthorized);
      return isAuthorized;
    } catch (error) {
      console.error('❌ Failed to check issuer authorization:', error);
      return false;
    }
  }

  /**
   * STEP 1: Submit token request for admin approval
   */
  async submitTokenRequest(metadataURI, amount, pricePerToken) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🔄 Step 1: Submitting token request for approval...');
      console.log('📋 Request details:', { metadataURI, amount, pricePerToken });
      
      const priceInWei = ethers.utils.parseEther(pricePerToken.toString());
      
      const tx = await this.contracts.tokenManagement.submitTokenRequest(
        metadataURI,
        amount,
        priceInWei
      );
      
      console.log('⏳ Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      
      // Extract request ID from event
      const event = receipt.logs.find(log => {
        try {
          const decoded = this.contracts.tokenManagement.interface.parseLog(log);
          return decoded.name === 'TokenRequestSubmitted';
        } catch (e) {
          return false;
        }
      });
      
      if (event) {
        const decoded = this.contracts.tokenManagement.interface.parseLog(event);
        const requestId = decoded.args.requestId;
        
        console.log('✅ Token request submitted successfully!');
        console.log('📝 Request ID:', requestId);
        
        // Store in localStorage for UI tracking
        this._storeRequestInLocalStorage({
          requestId,
          metadataURI,
          amount,
          price: pricePerToken,
          status: 'Pending',
          submittedAt: new Date(),
          txHash: tx.hash
        });
        
        return {
          requestId,
          txHash: tx.hash,
          status: 'submitted'
        };
      } else {
        throw new Error('Failed to extract request ID from transaction');
      }
      
    } catch (error) {
      console.error('❌ Failed to submit token request:', error);
      throw error;
    }
  }

  /**
   * STEP 2: Deploy approved token (after admin approval)
   */
  async deployApprovedToken(requestId) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🔄 Step 2: Deploying approved token...');
      console.log('📝 Request ID:', requestId);
      
      // Check request status first
      const requestDetails = await this.contracts.tokenManagement.getRequestDetails(requestId);
      
      if (requestDetails.status !== RequestStatus.Approved) {
        throw new Error(`Request not approved. Current status: ${this._getStatusString(requestDetails.status)}`);
      }
      
      const tx = await this.contracts.tokenManagement.deployApprovedToken(requestId);
      console.log('⏳ Deployment transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      
      // Extract token ID from event
      const event = receipt.logs.find(log => {
        try {
          const decoded = this.contracts.tokenManagement.interface.parseLog(log);
          return decoded.name === 'TokenDeployed';
        } catch (e) {
          return false;
        }
      });
      
      if (event) {
        const decoded = this.contracts.tokenManagement.interface.parseLog(event);
        const tokenId = decoded.args.tokenId;
        
        console.log('✅ Token deployed successfully!');
        console.log('🆔 Token ID:', tokenId.toString());
        
        // Update localStorage
        this._updateRequestInLocalStorage(requestId, {
          status: 'Deployed',
          tokenId: tokenId.toString(),
          deployedAt: new Date(),
          deploymentTxHash: tx.hash
        });
        
        return {
          tokenId: tokenId.toString(),
          txHash: tx.hash,
          status: 'deployed'
        };
      } else {
        throw new Error('Failed to extract token ID from deployment transaction');
      }
      
    } catch (error) {
      console.error('❌ Failed to deploy approved token:', error);
      throw error;
    }
  }

  /**
   * STEP 3: List deployed token on marketplace
   */
  async listTokenOnMarketplace(requestId, amount) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🔄 Step 3: Listing token on marketplace...');
      console.log('📝 Request ID:', requestId, 'Amount:', amount);
      
      // Check request status
      const requestDetails = await this.contracts.tokenManagement.getRequestDetails(requestId);
      
      if (requestDetails.status !== RequestStatus.Deployed) {
        throw new Error(`Token not deployed yet. Current status: ${this._getStatusString(requestDetails.status)}`);
      }
      
      // Check if marketplace is approved for token transfers
      
      
     
      
      // List on marketplace
      const tx = await this.contracts.tokenManagement.listAsset(requestId, amount);
      console.log('⏳ Listing transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Token listed on marketplace successfully!');
      
      // Update localStorage
      this._updateRequestInLocalStorage(requestId, {
        status: 'Listed',
        listedAmount: amount,
        listedAt: new Date(),
        listingTxHash: tx.hash
      });
      
      return {
        txHash: tx.hash,
        status: 'listed'
      };
      
    } catch (error) {
      console.error('❌ Failed to list token on marketplace:', error);
      throw error;
    }
  }

  /**
   * Get issuer's requests
   */
  async getMyRequests() {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const requestIds = await this.contracts.tokenManagement.getMyRequests();
      const requests = [];
      
      for (const requestId of requestIds) {
        try {
          const details = await this.contracts.tokenManagement.getRequestDetails(requestId);
          requests.push({
            requestId,
            issuer: details.issuer,
            metadataURI: details.metadataURI,
            amount: details.amount.toString(),
            price: ethers.utils.formatEther(details.price),
            status: this._getStatusString(details.status),
            submittedAt: new Date(details.submittedAt * 1000),
            approvedAt: details.approvedAt > 0 ? new Date(details.approvedAt * 1000) : null,
            deployedAt: details.deployedAt > 0 ? new Date(details.deployedAt * 1000) : null,
            tokenId: details.tokenId > 0 ? details.tokenId.toString() : null,
            rejectionReason: details.rejectionReason
          });
        } catch (err) {
          console.warn(`Failed to fetch details for request ${requestId}:`, err);
        }
      }
      
      return requests;
    } catch (error) {
      console.error('❌ Failed to fetch requests:', error);
      return [];
    }
  }

  /**
   * Get pending requests (Admin function)
   */
  async getPendingRequests() {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const requestIds = await this.contracts.tokenManagement.getPendingRequests();
      const requests = [];
      
      for (const requestId of requestIds) {
        try {
          const details = await this.contracts.tokenManagement.getRequestDetails(requestId);
          requests.push({
            requestId,
            issuer: details.issuer,
            metadataURI: details.metadataURI,
            amount: details.amount.toString(),
            price: ethers.utils.formatEther(details.price),
            status: 'Pending',
            submittedAt: new Date(details.submittedAt * 1000)
          });
        } catch (err) {
          console.warn(`Failed to fetch details for pending request ${requestId}:`, err);
        }
      }
      
      return requests;
    } catch (error) {
      console.error('❌ Failed to fetch pending requests:', error);
      return [];
    }
  }

  /**
   * Approve token request (Admin function)
   */
  async approveTokenRequest(requestId) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🔄 Approving token request:', requestId);
      
      const tx = await this.contracts.tokenManagement.approveTokenRequest(requestId);
      console.log('⏳ Approval transaction sent:', tx.hash);
      
      await tx.wait();
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
   * Reject token request (Admin function)
   */
  async rejectTokenRequest(requestId, reason) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🔄 Rejecting token request:', requestId, 'Reason:', reason);
      
      const tx = await this.contracts.tokenManagement.rejectTokenRequest(requestId, reason);
      console.log('⏳ Rejection transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ Token request rejected');
      
      return {
        txHash: tx.hash,
        status: 'rejected'
      };
    } catch (error) {
      console.error('❌ Failed to reject token request:', error);
      throw error;
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

  _storeRequestInLocalStorage(requestData) {
    try {
      const stored = JSON.parse(localStorage.getItem('tokenRequests') || '[]');
      stored.push(requestData);
      localStorage.setItem('tokenRequests', JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to store request in localStorage:', error);
    }
  }

  _updateRequestInLocalStorage(requestId, updates) {
    try {
      const stored = JSON.parse(localStorage.getItem('tokenRequests') || '[]');
      const index = stored.findIndex(req => req.requestId === requestId);
      if (index !== -1) {
        stored[index] = { ...stored[index], ...updates };
        localStorage.setItem('tokenRequests', JSON.stringify(stored));
      }
    } catch (error) {
      console.warn('Failed to update request in localStorage:', error);
    }
  }
}

export default TokenManagementService;