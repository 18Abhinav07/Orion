/**
 * @fileoverview Legacy Issuer Service - Simple Token Minting
 * @description Direct integration with legacy ERC1155Core and Issuer contracts for real token minting
 */

import { ethers } from 'ethers';

// Legacy contract ABIs - NO MULTISIG OR SPV REQUIRED
const LEGACY_ISSUER_ABI = [
  "function createToken(uint256 _amount, uint256 _price, string memory _metadataURI) external returns (uint256)",
  "function getMyTokens() external view returns (uint256[] memory)",
  "function updateTokenPrice(uint256 _tokenId, uint256 _newPrice) external",
  "function getTokenPrice(uint256 _tokenId) external view returns (uint256)"
];

const LEGACY_ERC1155_ABI = [
  "function mintToken(uint256 _amount, uint256 _price, string memory _metadataURI) external returns (uint256)",
  "function uri(uint256 tokenId) external view returns (string memory)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function totalSupply(uint256 id) external view returns (uint256)",
  "function tokenPrice(uint256 tokenId) external view returns (uint256)",
  "function tokenMetadata(uint256 tokenId) external view returns (string memory)",
  "function tokenIssuer(uint256 tokenId) external view returns (address)",
  "function tokenSupply(uint256 tokenId) external view returns (uint256)",
  "function getTokenInfo(uint256 tokenId) external view returns (uint256 price, string memory metadataURI, address issuer, uint256 supply)",
  "event TokenMinted(address indexed issuer, uint256 indexed tokenId, uint256 amount, uint256 price, string metadataURI)"
];

const LEGACY_MARKETPLACE_ABI = [
  "function listAsset(uint256 tokenId, uint256 amount) external",
  "function removeAsset(uint256 tokenId) external",
  "function buyAsset(uint256 tokenId, uint256 amount) external payable",
  "function getAssetListing(uint256 tokenId) external view returns (address issuer, uint256 amount, uint256 price, bool isActive)"
];

const LEGACY_ADMIN_ABI = [
  "function isIssuer(address _address) external view returns (bool)",
  "function addIssuer(address _issuer) external",
  "function removeIssuer(address _issuer) external"
];

class LegacyIssuerService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.initialized = false;
  }

  /**
   * Initialize with legacy contract addresses
   */
  async initialize(provider, contractAddresses) {
    try {
      this.provider = provider;
      this.signer = provider.getSigner();
      
      // Initialize legacy contracts
      this.contracts = {
        issuer: new ethers.Contract(
          contractAddresses.ISSUER,
          LEGACY_ISSUER_ABI,
          this.signer
        ),
        erc1155Core: new ethers.Contract(
          contractAddresses.ERC1155_CORE,
          LEGACY_ERC1155_ABI,
          this.signer
        ),
        marketplace: new ethers.Contract(
          contractAddresses.MARKETPLACE,
          LEGACY_MARKETPLACE_ABI,
          this.signer
        ),
        admin: new ethers.Contract(
          contractAddresses.ADMIN,
          LEGACY_ADMIN_ABI,
          this.signer
        )
      };
      
      this.initialized = true;
      console.log('✅ Legacy Issuer Service initialized with contracts:', {
        issuer: contractAddresses.ISSUER,
        erc1155Core: contractAddresses.ERC1155_CORE,
        marketplace: contractAddresses.MARKETPLACE,
        admin: contractAddresses.ADMIN
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Legacy Issuer Service:', error);
      throw error;
    }
  }

  /**
   * Create a token directly - NO MULTISIG OR SPV REQUIRED
   */
  async createToken(amount, pricePerToken, metadataURI) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('🚀 Creating token via legacy issuer contract...');
      console.log('Parameters:', { amount, pricePerToken, metadataURI });
      
      // Direct token creation via issuer contract
      const tx = await this.contracts.issuer.createToken(
        amount,
        ethers.utils.parseEther(pricePerToken.toString()),
        metadataURI
      );
      
      console.log('📋 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.transactionHash);
      
      // Extract token ID from logs
      const tokenMintedEvent = receipt.logs.find(log => {
        try {
          const iface = new ethers.utils.Interface(LEGACY_ERC1155_ABI);
          const parsed = iface.parseLog(log);
          return parsed.name === 'TokenMinted';
        } catch (e) {
          return false;
        }
      });
      
      if (!tokenMintedEvent) {
        throw new Error('TokenMinted event not found in transaction logs');
      }
      
      const iface = new ethers.utils.Interface(LEGACY_ERC1155_ABI);
      const parsed = iface.parseLog(tokenMintedEvent);
      const tokenId = parsed.args.tokenId.toString();
      
      console.log('🎯 Token created successfully! Token ID:', tokenId);
      
      return {
        tokenId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('❌ Token creation failed:', error);
      throw error;
    }
  }

  /**
   * List token on marketplace
   */
  async listTokenOnMarketplace(tokenId, amount) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      console.log('📝 Listing token on marketplace:', { tokenId, amount });
      
      const tx = await this.contracts.marketplace.listAsset(
        parseInt(tokenId),
        amount
      );
      
      console.log('📋 Listing transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Token listed successfully:', receipt.transactionHash);
      
      return receipt.transactionHash;
      
    } catch (error) {
      console.error('❌ Token listing failed:', error);
      throw error;
    }
  }

  /**
   * Get issuer's tokens
   */
  async getMyTokens() {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const tokenIds = await this.contracts.issuer.getMyTokens();
      
      // Get detailed info for each token
      const tokens = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const info = await this.contracts.erc1155Core.getTokenInfo(tokenId);
          return {
            tokenId: tokenId.toString(),
            price: ethers.utils.formatEther(info.price),
            metadataURI: info.metadataURI,
            issuer: info.issuer,
            supply: info.supply.toString()
          };
        })
      );
      
      return tokens;
      
    } catch (error) {
      console.error('❌ Failed to get tokens:', error);
      throw error;
    }
  }

  /**
   * Check if address is authorized issuer
   */
  async isAuthorizedIssuer(address) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      return await this.contracts.admin.isIssuer(address);
    } catch (error) {
      console.error('❌ Failed to check issuer status:', error);
      return false;
    }
  }

  /**
   * Update token price
   */
  async updateTokenPrice(tokenId, newPrice) {
    if (!this.initialized) throw new Error('Service not initialized');
    
    try {
      const tx = await this.contracts.issuer.updateTokenPrice(
        tokenId,
        ethers.utils.parseEther(newPrice.toString())
      );
      
      const receipt = await tx.wait();
      console.log('✅ Token price updated:', receipt.transactionHash);
      
      return receipt.transactionHash;
      
    } catch (error) {
      console.error('❌ Failed to update token price:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const legacyIssuerService = new LegacyIssuerService();