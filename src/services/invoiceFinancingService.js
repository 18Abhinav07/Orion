// Enhanced Invoice Financing Service
// Complete service layer for frontend integration

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG, TOKEN_LIFECYCLE, REQUEST_STATUS, EVENTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/UpdatedContraConfig.js';
import { CONTRACT_ABIS } from '../lib/contractAbis.js';

export class InvoiceFinancingService {
  constructor(walletProvider = null) {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.walletProvider = walletProvider;
    this.isConnected = false;
    this.userAddress = null;
    this.userRoles = {
      isAdmin: false,
      isIssuer: false,
      isManager: false
    };
  }

  // ============ CONNECTION & SETUP ============

  /**
   * Connect to wallet and initialize contracts
   */
  async connect() {
    try {
      if (!this.walletProvider) {
        throw new Error('No wallet provider available');
      }

      // Request account access
      await this.walletProvider.request({ method: 'eth_requestAccounts' });
      
      // Setup provider and signer (ethers v5 compatible)
      this.provider = new ethers.providers.Web3Provider(this.walletProvider);
      this.signer = this.provider.getSigner();
      this.userAddress = await this.signer.getAddress();
      
      // Verify network
      const network = await this.provider.getNetwork();
      if (network.chainId !== NETWORK_CONFIG.TESTNET.chainId) {
        throw new Error(ERROR_MESSAGES.NETWORK_MISMATCH);
      }

      // Initialize contracts
      await this.initializeContracts();
      
      // Load user roles
      await this.loadUserRoles();
      
      this.isConnected = true;
      console.log('✅ Connected to Invoice Financing System');
      console.log('User Address:', this.userAddress);
      console.log('User Roles:', this.userRoles);
      
      return {
        success: true,
        userAddress: this.userAddress,
        userRoles: this.userRoles
      };
    } catch (error) {
      console.error('❌ Connection failed:', error);
      throw error;
    }
  }

  /**
   * Initialize all contract instances
   */
  async initializeContracts() {
    try {
      this.contracts = {
        admin: new ethers.Contract(CONTRACT_ADDRESSES.ADMIN, CONTRACT_ABIS.ADMIN, this.signer),
        tokenContract: new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_CONTRACT, CONTRACT_ABIS.ERC1155CORE, this.signer),
        marketplace: new ethers.Contract(CONTRACT_ADDRESSES.MARKETPLACE, CONTRACT_ABIS.MARKETPLACE, this.signer),
        paymentSplitter: new ethers.Contract(CONTRACT_ADDRESSES.PAYMENT_SPLITTER, CONTRACT_ABIS.PAYMENTSPLITTER, this.signer),
        tokenManagement: new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_MANAGEMENT, CONTRACT_ABIS.TOKENMANAGEMENT, this.signer)
      };
      
      console.log('✅ Contracts initialized');
    } catch (error) {
      console.error('❌ Contract initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load user roles from contracts
   */
  async loadUserRoles() {
    try {
      this.userRoles = {
        isAdmin: await this.contracts.admin.isAdmin(this.userAddress),
        isIssuer: await this.contracts.admin.isIssuer(this.userAddress),
        isManager: await this.contracts.admin.isManager(this.userAddress)
      };
    } catch (error) {
      console.error('❌ Failed to load user roles:', error);
      this.userRoles = { isAdmin: false, isIssuer: false, isManager: false };
    }
  }

  // ============ ADMIN FUNCTIONS ============

  /**
   * Add an issuer (Admin only)
   */
  async addIssuer(issuerAddress, metadataURI) {
    this.requireRole('isAdmin');
    try {
      const tx = await this.contracts.admin.addIssuer(issuerAddress, metadataURI);
      await tx.wait();
      return { success: true, message: SUCCESS_MESSAGES.ISSUER_ADDED, txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Add a manager (Admin only)
   */
  async addManager(managerAddress, metadataURI) {
    this.requireRole('isAdmin');
    try {
      const tx = await this.contracts.admin.addManager(managerAddress, metadataURI);
      await tx.wait();
      return { success: true, message: SUCCESS_MESSAGES.MANAGER_ADDED, txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Approve token request (Admin only)
   */
  async approveTokenRequest(requestId) {
    this.requireRole('isAdmin');
    try {
      const tx = await this.contracts.tokenManagement.approveTokenRequest(requestId);
      await tx.wait();
      return { success: true, message: SUCCESS_MESSAGES.TOKEN_REQUEST_APPROVED, txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Reject token request (Admin only)
   */
  async rejectTokenRequest(requestId, reason) {
    this.requireRole('isAdmin');
    try {
      const tx = await this.contracts.tokenManagement.rejectTokenRequest(requestId, reason);
      await tx.wait();
      return { success: true, message: 'Token request rejected', txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Manually settle invoice (Admin only)
   */
  async settleInvoice(tokenId, amount) {
    this.requireRole('isAdmin');
    try {
      const tx = await this.contracts.admin.settleInvoice(tokenId, amount);
      await tx.wait();
      return { success: true, message: SUCCESS_MESSAGES.INVOICE_SETTLED, txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all pending requests (Admin view)
   */
  async getPendingRequests() {
    try {
      const requestIds = await this.contracts.tokenManagement.getPendingRequests();
      const requests = await Promise.all(
        requestIds.map(id => this.getRequestDetails(id))
      );
      return requests;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ ISSUER FUNCTIONS ============

  /**
   * Submit token request (Issuer only)
   */
  async submitTokenRequest(metadataURI, amount, price) {
    this.requireRole('isIssuer');
    try {
      const tx = await this.contracts.tokenManagement.submitTokenRequest(metadataURI, amount, price);
      const receipt = await tx.wait();
      
      // Extract request ID from events
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contracts.tokenManagement.interface.parseLog(log);
          return parsed.name === 'TokenRequestSubmitted';
        } catch (e) {
          return false;
        }
      });
      
      const requestId = this.contracts.tokenManagement.interface.parseLog(event).args.requestId;
      
      return { 
        success: true, 
        message: SUCCESS_MESSAGES.TOKEN_REQUEST_SUBMITTED, 
        requestId: requestId,
        txHash: tx.hash 
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Deploy approved token (Issuer only)
   */
  async deployApprovedToken(requestId) {
    this.requireRole('isIssuer');
    try {
      const tx = await this.contracts.tokenManagement.deployApprovedToken(requestId);
      const receipt = await tx.wait();
      
      // Extract token ID from events
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contracts.tokenManagement.interface.parseLog(log);
          return parsed.name === 'TokenDeployed';
        } catch (e) {
          return false;
        }
      });
      
      const tokenId = this.contracts.tokenManagement.interface.parseLog(event).args.tokenId;
      
      return { 
        success: true, 
        message: SUCCESS_MESSAGES.TOKEN_DEPLOYED, 
        tokenId: tokenId.toString(),
        txHash: tx.hash 
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * List token on marketplace (Issuer only)
   */
  async listTokenOnMarketplace(requestId, amount) {
    this.requireRole('isIssuer');
    try {
      const tx = await this.contracts.tokenManagement.listTokenOnMarketplace(requestId, amount);
      await tx.wait();
      return { success: true, message: SUCCESS_MESSAGES.TOKEN_LISTED, txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get issuer's requests
   */
  async getMyRequests() {
    this.requireRole('isIssuer');
    try {
      const requestIds = await this.contracts.tokenManagement.getMyRequests();
      const requests = await Promise.all(
        requestIds.map(id => this.getRequestDetails(id))
      );
      return requests;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get issuer's tokens
   */
  async getMyTokens() {
    this.requireRole('isIssuer');
    try {
      const tokenIds = await this.contracts.tokenManagement.getMyTokens();
      const tokens = await Promise.all(
        tokenIds.map(id => this.getTokenInfo(id))
      );
      return tokens;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ TRADING FUNCTIONS ============

  /**
   * Buy tokens from marketplace
   */
  async buyTokens(tokenId, amount, paymentAmount) {
    try {
      const tx = await this.contracts.marketplace.buyAsset(tokenId, amount, { value: paymentAmount });
      await tx.wait();
      return { success: true, message: SUCCESS_MESSAGES.TOKEN_PURCHASED, txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Sell tokens back to marketplace
   */
  async sellTokens(tokenId, amount, platformFeeAmount) {
    try {
      const tx = await this.contracts.marketplace.sellAsset(tokenId, amount, { value: platformFeeAmount });
      await tx.wait();
      return { success: true, message: 'Tokens sold successfully', txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Withdraw tokens from marketplace to wallet
   */
  async withdrawTokens(tokenId, amount) {
    try {
      const tx = await this.contracts.marketplace.withdrawAsset(tokenId, amount);
      await tx.wait();
      return { success: true, message: 'Tokens withdrawn successfully', txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user's marketplace balance
   */
  async getMarketplaceBalance(tokenId) {
    try {
      const balance = await this.contracts.marketplace.getUserBalance(this.userAddress, tokenId);
      return balance.toString();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user's wallet balance
   */
  async getWalletBalance(tokenId) {
    try {
      const balance = await this.contracts.tokenContract.balanceOf(this.userAddress, tokenId);
      return balance.toString();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ SETTLEMENT FUNCTIONS ============

  /**
   * Process invoice settlement (Manager only)
   */
  async processInvoiceSettlement(tokenId, settlementAmount) {
    this.requireManagerForToken(tokenId);
    try {
      const tx = await this.contracts.paymentSplitter.processInvoiceSettlement(tokenId, { 
        value: settlementAmount,
        gasLimit: 300000
      });
      await tx.wait();
      return { success: true, message: SUCCESS_MESSAGES.INVOICE_SETTLED, txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Submit rental payment (Manager only)
   */
  async submitRentalPayment(tokenId, rentalAmount) {
    this.requireManagerForToken(tokenId);
    try {
      const tx = await this.contracts.paymentSplitter.submitRental(tokenId, { value: rentalAmount });
      await tx.wait();
      return { success: true, message: 'Rental payment distributed successfully', txHash: tx.hash };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ QUERY FUNCTIONS ============

  /**
   * Get token information
   */
  async getTokenInfo(tokenId) {
    try {
      const info = await this.contracts.tokenContract.getTokenInfo(tokenId);
      const lifecycle = await this.contracts.tokenContract.getTokenLifecycleStatus(tokenId);
      
      // Get settlement info using individual functions
      let settlementAmount = '0';
      let settlementTimestamp = '0';
      let settled = false;
      
      try {
        const amount = await this.contracts.tokenContract.settlementAmount(tokenId);
        const timestamp = await this.contracts.tokenContract.settlementTimestamp(tokenId);
        settlementAmount = amount.gt(0) ? ethers.utils.formatEther(amount) : '0';
        settlementTimestamp = timestamp.toString();
        settled = amount.gt(0);
      } catch (settlementError) {
        console.warn(`Could not fetch settlement info for token ${tokenId}:`, settlementError);
      }
      
      return {
        tokenId: tokenId.toString(),
        price: ethers.utils.formatEther(info.price),
        metadataURI: info.metadataURI,
        issuer: info.issuer,
        supply: info.supply.toString(),
        lifecycle: this.getLifecycleName(lifecycle),
        lifecycleStatus: lifecycle,
        settlement: {
          settled: settled,
          amount: settlementAmount,
          timestamp: settlementTimestamp
        }
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get request details
   */
  async getRequestDetails(requestId) {
    try {
      const request = await this.contracts.tokenManagement.getRequestDetails(requestId);
      return {
        requestId: requestId,
        issuer: request.issuer,
        metadataURI: request.metadataURI,
        amount: request.amount.toString(),
        price: ethers.utils.formatEther(request.price),
        status: this.getRequestStatusName(request.status),
        statusCode: request.status,
        submittedAt: new Date(Number(request.submittedAt) * 1000).toISOString(),
        approvedAt: request.approvedAt > 0 ? new Date(Number(request.approvedAt) * 1000).toISOString() : null,
        deployedAt: request.deployedAt > 0 ? new Date(Number(request.deployedAt) * 1000).toISOString() : null,
        tokenId: request.tokenId > 0 ? request.tokenId.toString() : null,
        rejectionReason: request.rejectionReason,
        settlement: {
          settled: request.settledAt > 0,
          amount: request.settlementAmount > 0 ? ethers.utils.formatEther(request.settlementAmount) : '0',
          timestamp: request.settledAt > 0 ? new Date(Number(request.settledAt) * 1000).toISOString() : null
        }
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all marketplace listings
   */
  async getAllListings() {
    try {
      const listings = await this.contracts.marketplace.getAllListings();
      return {
        tokenIds: listings.tokenIds.map(id => id.toString()),
        issuers: listings.issuers,
        amounts: listings.amounts.map(amount => amount.toString()),
        prices: listings.prices.map(price => ethers.utils.formatEther(price))
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if token is tradeable
   */
  async isTokenTradeable(tokenId) {
    try {
      return await this.contracts.tokenContract.isTokenTradeable(tokenId);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get settlement information
   */
  async getSettlementInfo(tokenId) {
    try {
      const amount = await this.contracts.tokenContract.settlementAmount(tokenId);
      const timestamp = await this.contracts.tokenContract.settlementTimestamp(tokenId);
      
      return {
        settled: amount.gt(0),
        amount: amount.gt(0) ? ethers.utils.formatEther(amount) : '0',
        timestamp: timestamp.gt(0) ? new Date(Number(timestamp) * 1000).toISOString() : null
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get token lifecycle status
   */
  async getTokenLifecycle(tokenId) {
    try {
      const status = await this.contracts.tokenContract.getTokenLifecycleStatus(tokenId);
      return {
        status: status,
        name: this.getLifecycleName(status)
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============ EVENT LISTENERS ============

  /**
   * Listen to token request submitted events
   */
  onTokenRequestSubmitted(callback) {
    this.contracts.tokenManagement.on(EVENTS.TOKEN_REQUEST_SUBMITTED, callback);
  }

  /**
   * Listen to token deployed events
   */
  onTokenDeployed(callback) {
    this.contracts.tokenManagement.on(EVENTS.TOKEN_DEPLOYED, callback);
  }

  /**
   * Listen to invoice settled events
   */
  onInvoiceSettled(callback) {
    this.contracts.tokenContract.on(EVENTS.INVOICE_SETTLED, callback);
  }

  /**
   * Listen to token burned events
   */
  onTokenBurned(callback) {
    this.contracts.tokenContract.on(EVENTS.TOKEN_BURNED, callback);
  }

  /**
   * Listen to asset bought events
   */
  onAssetBought(callback) {
    this.contracts.marketplace.on(EVENTS.ASSET_BOUGHT, callback);
  }

  /**
   * Stop all event listeners
   */
  removeAllListeners() {
    Object.values(this.contracts).forEach(contract => {
      contract.removeAllListeners();
    });
  }

  // ============ UTILITY FUNCTIONS ============

  /**
   * Require specific role
   */
  requireRole(role) {
    if (!this.isConnected) {
      throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
    }
    if (!this.userRoles[role]) {
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }
  }

  /**
   * Require manager role for specific token
   */
  async requireManagerForToken(tokenId) {
    this.requireRole('isManager');
    try {
      const isManagerForToken = await this.contracts.admin.isManagerForToken(this.userAddress, tokenId);
      if (!isManagerForToken) {
        throw new Error('Not assigned manager for this token');
      }
    } catch (error) {
      throw new Error('Manager validation failed: ' + error.message);
    }
  }

  /**
   * Get lifecycle name from status code
   */
  getLifecycleName(status) {
    const names = ['Active', 'Settled', 'Burned'];
    return names[status] || 'Unknown';
  }

  /**
   * Get request status name from status code
   */
  getRequestStatusName(status) {
    const names = ['Pending', 'Approved', 'Rejected', 'Deployed', 'Listed', 'Settled'];
    return names[status] || 'Unknown';
  }

  /**
   * Handle contract errors
   */
  handleError(error) {
    console.error('Contract error:', error);
    
    if (error.message.includes('user rejected')) {
      return new Error(ERROR_MESSAGES.TRANSACTION_REJECTED);
    }
    if (error.message.includes('insufficient funds')) {
      return new Error(ERROR_MESSAGES.INSUFFICIENT_BALANCE);
    }
    if (error.message.includes('execution reverted')) {
      return new Error(ERROR_MESSAGES.CONTRACT_ERROR + ': ' + error.message);
    }
    
    return error;
  }

  /**
   * Format amount with proper decimals
   */
  formatAmount(amount, decimals = 18) {
    return ethers.utils.formatUnits(amount, decimals);
  }

  /**
   * Parse amount to contract format
   */
  parseAmount(amount, decimals = 18) {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash) {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Disconnect wallet
   */
  disconnect() {
    this.removeAllListeners();
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isConnected = false;
    this.userAddress = null;
    this.userRoles = { isAdmin: false, isIssuer: false, isManager: false };
    console.log('🔌 Disconnected from Invoice Financing System');
  }
}

export default InvoiceFinancingService;