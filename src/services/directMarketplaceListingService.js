/**
 * Direct Marketplace Listing Service
 * 
 * This service replicates the successful terminal script approach for listing tokens
 * on the marketplace by calling marketplace.listAsset() directly instead of going
 * through the TokenManagement contract.
 * 
 * Based on successful terminal script approach:
 * - Direct marketplace.listAsset(tokenId, amount) call
 * - Uses actual tokenId instead of requestId
 * - Bypasses TokenManagement state management issues
 */

import { ethers } from 'ethers';
import { CONTRACT_ABIS } from '../lib/contractAbis';

class DirectMarketplaceListingService {
  constructor() {
    this.contracts = {};
    this.signer = null;
    this.initialized = false;
  }

  /**
   * Initialize the service with contracts
   */
  async initialize(provider, contractAddresses) {
    try {
      console.log('🔄 Initializing Direct Marketplace Listing Service...');
      
      if (!provider) throw new Error('Provider is required');
      
      this.signer = provider.getSigner();
      
      // Initialize marketplace contract (using enhanced ABI)
      this.contracts.marketplace = new ethers.Contract(
        contractAddresses.MARKETPLACE,
        CONTRACT_ABIS.MARKETPLACE,
        this.signer
      );
      
      // Initialize token contract for metadata lookup (using ERC1155Core ABI)
      this.contracts.token = new ethers.Contract(
        contractAddresses.TOKEN,
        CONTRACT_ABIS.ERC1155CORE,
        this.signer
      );
      
      // Initialize TokenManagement contract (using enhanced ABI)
      this.contracts.tokenManagement = new ethers.Contract(
        contractAddresses.TOKEN_MANAGEMENT,
        CONTRACT_ABIS.TOKENMANAGEMENT,
        this.signer
      );
      
      this.initialized = true;
      console.log('✅ Direct Marketplace Listing Service initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Direct Marketplace Listing Service:', error);
      throw error;
    }
  }

  /**
   * List token directly on marketplace (replicating successful terminal approach)
   * 
   * @param {string} requestId - The request ID from TokenManagement
   * @param {number} amount - Amount of tokens to list
   */
  async listTokenDirectly(requestId, amount) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🔄 Starting direct marketplace listing...');
      console.log('📝 Request ID:', requestId, 'Amount:', amount);
      
      // Step 1: Get the actual tokenId from the request
      // This is the critical difference - we need to convert requestId to tokenId
      const tokenId = await this.getTokenIdFromRequest(requestId);
      console.log('🔍 Resolved Token ID:', tokenId);
      
      // Step 2: Verify token exists and we have balance
      await this.verifyTokenOwnership(tokenId, amount);
      
      // Step 3: Direct marketplace listing (same as successful terminal script)
      console.log('📞 Calling marketplace.listAsset() directly...');
      const tx = await this.contracts.marketplace.listAsset(
        parseInt(tokenId),
        amount
      );
      
      console.log('⏳ Listing transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Token listed successfully on marketplace!');
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        tokenId: tokenId,
        amount: amount
      };
      
    } catch (error) {
      console.error('❌ Direct marketplace listing failed:', error);
      throw new Error(`Marketplace listing failed: ${error.message}`);
    }
  }

  /**
   * Get tokenId from requestId using TokenManagement contract
   * This is the reliable approach that queries contract state directly
   */
  async getTokenIdFromRequest(requestId) {
    try {
      console.log('🔍 Resolving tokenId from requestId:', requestId);
      
      // Get request details from TokenManagement contract
      const requestDetails = await this.contracts.tokenManagement.getRequestDetails(requestId);
      const tokenId = requestDetails.tokenId.toString();
      
      console.log('✅ Resolved tokenId from TokenManagement:', tokenId);
      console.log('📊 Request details:', {
        tokenId: tokenId,
        requester: requestDetails.requester,
        amount: requestDetails.amount.toString(),
        approved: requestDetails.approved,
        deployed: requestDetails.deployed
      });
      
      return tokenId;
      
    } catch (error) {
      console.error('❌ Failed to resolve tokenId from TokenManagement:', error);
      
      // Fallback: Use requestId as tokenId (common case)
      console.log('🔄 Using requestId as tokenId fallback');
      return requestId;
    }
  }

  /**
   * Verify we own the token and have sufficient balance
   */
  async verifyTokenOwnership(tokenId, amount) {
    try {
      console.log('🔍 Verifying token ownership...');
      
      const userAddress = await this.signer.getAddress();
      const balance = await this.contracts.token.balanceOf(userAddress, tokenId);
      const balanceNumber = balance.toNumber();
      
      console.log(`💰 Token ${tokenId} balance: ${balanceNumber}`);
      
      if (balanceNumber < amount) {
        throw new Error(`Insufficient balance. Have ${balanceNumber}, need ${amount}`);
      }
      
      console.log('✅ Token ownership verified');
      return true;
      
    } catch (error) {
      console.error('❌ Token ownership verification failed:', error);
      throw error;
    }
  }

  /**
   * Check if marketplace is approved to transfer our tokens
   */
  async checkMarketplaceApproval() {
    try {
      const userAddress = await this.signer.getAddress();
      const isApproved = await this.contracts.token.isApprovedForAll(
        userAddress,
        this.contracts.marketplace.address
      );
      
      console.log('🔍 Marketplace approval status:', isApproved);
      return isApproved;
      
    } catch (error) {
      console.error('❌ Failed to check marketplace approval:', error);
      return false;
    }
  }

  /**
   * Approve marketplace to transfer our tokens
   */
  async approveMarketplace() {
    try {
      console.log('🔄 Approving marketplace for token transfers...');
      
      const tx = await this.contracts.token.setApprovalForAll(
        this.contracts.marketplace.address,
        true
      );
      
      console.log('⏳ Approval transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Marketplace approved for token transfers');
      
      return receipt.transactionHash;
      
    } catch (error) {
      console.error('❌ Marketplace approval failed:', error);
      throw error;
    }
  }

  /**
   * Complete listing process with automatic approval if needed
   */
  async listTokenWithAutoApproval(requestId, amount) {
    try {
      // Check if marketplace is approved
      const isApproved = await this.checkMarketplaceApproval();
      
      if (!isApproved) {
        console.log('🔄 Marketplace not approved, requesting approval...');
        await this.approveMarketplace();
      }
      
      // Now list the token
      return await this.listTokenDirectly(requestId, amount);
      
    } catch (error) {
      console.error('❌ Complete listing process failed:', error);
      throw error;
    }
  }
}

export default DirectMarketplaceListingService;