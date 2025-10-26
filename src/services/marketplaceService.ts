import { ethers } from 'ethers';

const MARKETPLACE_ADDRESS = '0x1A88e748E74fc90D437b23595D7E176b25289673';
const MARKETPLACE_ACCOUNT_ID = '0.0.6530062';
const HEDERA_TESTNET_RPC = 'https://testnet.hashio.io/api';

// Marketplace contract ABI - updated for simplified contract with payment splitter
const MARKETPLACE_ABI = [
  "function listAsset(string _tokenId, uint256 _amount, uint256 _price, string _metadataURI) external",
  "function buyAsset(string _tokenId, uint256 _amount) external payable",
  "function sellAsset(string _tokenId, uint256 _amount) external",
  "function setPaymentSplitter(address _paymentSplitter) external",
  "function getAllListings() external view returns (string[] memory tokenIds, address[] memory sellers, uint256[] memory amounts, uint256[] memory prices, string[] memory metadataURIs)",
  "function getListing(string _tokenId) external view returns (address seller, uint256 amount, uint256 price, string memory metadataURI, bool active)",
  "function getMarketplaceBalance() external view returns (uint256)",
  "function paymentSplitter() external view returns (address)",
  "function getMyAssets(address user) external view returns (string[] memory tokenIds, uint256[] memory balances)"
];

export class MarketplaceService {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract;
  private wallet?: ethers.Wallet;
  private signer?: ethers.Signer;

  constructor(privateKey?: string, signer?: ethers.Signer) {
    this.provider = new ethers.providers.JsonRpcProvider(HEDERA_TESTNET_RPC);
    
    if (signer) {
      // Use provided signer (for user transactions with MetaMask)
      this.signer = signer;
      this.contract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
    } else if (privateKey) {
      // Use private key (for automated operations)
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, this.wallet);
    } else {
      throw new Error('Either privateKey or signer must be provided');
    }
  }

  /**
   * List an asset on the marketplace
   */
  async listAsset(tokenId: string, amount: number, price: number, metadataURI: string): Promise<{ success: boolean; transactionHash: string }> {
    try {
      console.log(`Listing asset: ${tokenId}, amount: ${amount}, price: ${price}`);
      
      // Call the listAsset function with manual gas limit and higher gas price
      const tx = await this.contract.listAsset(tokenId, amount, price, metadataURI, {
        gasLimit: 3000000, // Manual gas limit to avoid estimation failures
        gasPrice: ethers.utils.parseUnits('340', 'gwei') // Use minimum required gas price
      });
      const receipt = await tx.wait();
      
      console.log('✅ Asset listed successfully!');
      console.log('Transaction Hash:', receipt.transactionHash);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash
      };
      
    } catch (error) {
      console.error('Error listing asset:', error);
      throw error;
    }
  }

  /**
   * Record listing after tokens are already transferred via Hedera native transfer
   * @deprecated - Use listAsset instead
   */
  async recordListing(tokenAddress: string, amount: number, price: number): Promise<{ success: boolean; transactionHash: string }> {
    // For backwards compatibility, convert to new format
    return this.listAsset(tokenAddress, amount, price, '');
  }

  /**
   * Get all marketplace listings with metadata
   */
  async getAllListings(): Promise<{ 
    tokenIds: string[]; 
    sellers: string[];
    amounts: number[]; 
    prices: string[]; // Changed to string to avoid BigNumber overflow
    metadataURIs: string[];
    metadata: any[];
  }> {
    try {
      const result = await this.contract.getAllListings();
      
      // Create mutable copies of the arrays to avoid read-only errors
      const listings = {
        tokenIds: [...result.tokenIds], // Create mutable copy
        sellers: [...result.sellers], // Create mutable copy
        amounts: result.amounts.map((amount: any) => amount.toNumber()),
        prices: result.prices.map((price: any) => price.toString()), // Keep as string to avoid overflow
        metadataURIs: [...result.metadataURIs], // Create mutable copy
        metadata: [] as any[]
      };

      // Fetch metadata for each listing and filter out failed ones
      const validListings = {
        tokenIds: [] as string[],
        sellers: [] as string[],
        amounts: [] as number[],
        prices: [] as string[],
        metadataURIs: [] as string[],
        metadata: [] as any[]
      };

      for (let i = 0; i < listings.metadataURIs.length; i++) {
        try {
          const metadata = await this.fetchMetadataFromIPFS(listings.metadataURIs[i]);
          
          // Only add to valid listings if metadata fetch succeeds
          validListings.tokenIds.push(listings.tokenIds[i]);
          validListings.sellers.push(listings.sellers[i]);
          validListings.amounts.push(listings.amounts[i]);
          validListings.prices.push(listings.prices[i]);
          validListings.metadataURIs.push(listings.metadataURIs[i]);
          validListings.metadata.push(metadata);
        } catch (error) {
          console.warn(`Failed to fetch metadata for token ${listings.tokenIds[i]}:`, error);
          // Skip this listing if IPFS metadata fails
        }
      }
      
      return validListings;
      
    } catch (error) {
      console.error('Error getting listings:', error);
      throw error;
    }
  }

  /**
   * Buy an asset from the marketplace - Simple direct call
   */
  async buyAsset(tokenId: string, amount: number, pricePerToken: string): Promise<{ success: boolean; transactionHash: string }> {
    if (!this.signer) {
      throw new Error('Please connect MetaMask first');
    }

    try {
      console.log('=== SIMPLE BUY ASSET ===');
      console.log('Token ID:', tokenId);
      console.log('Amount:', amount);
      console.log('Price per token (Wei):', pricePerToken);
      
      // Calculate total cost
      const totalCost = ethers.BigNumber.from(pricePerToken).mul(amount);
      console.log('Total cost (Wei):', totalCost.toString());
      console.log('Total cost (HBAR):', ethers.utils.formatEther(totalCost));

      // Direct contract call with minimal parameters
      console.log('Making contract call...');
      const tx = await this.contract.buyAsset(tokenId, amount, {
        value: totalCost
      });

      console.log('Transaction hash:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Transaction receipt status:', receipt.status);

      if (receipt.status === 0) {
        throw new Error('Transaction reverted by contract');
      }

      console.log('✅ Purchase successful!');
      return {
        success: true,
        transactionHash: receipt.transactionHash
      };
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      if (error.code === 'CALL_EXCEPTION') {
        throw new Error('Smart contract rejected the transaction. Please check if the asset is still available and you have sufficient HBAR.');
      }
      
      if (error.code === 'USER_REJECTED') {
        throw new Error('Transaction was rejected by user');
      }
      
      throw new Error(`Purchase failed: ${error.message}`);
    }
  }

  /**
   * Get a specific listing with metadata
   */
  async getListing(tokenId: string): Promise<{
    seller: string;
    amount: number;
    price: string;
    metadataURI: string;
    active: boolean;
    metadata?: any;
  } | null> {
    try {
      const result = await this.contract.getListing(tokenId);
      const [seller, amount, price, metadataURI, active] = result;

      if (!active) {
        return null;
      }

      const listing = {
        seller,
        amount: amount.toNumber(),
        price: price.toString(),
        metadataURI,
        active
      };

      // Try to fetch metadata from IPFS
      try {
        const metadata = await this.fetchMetadataFromIPFS(metadataURI);
        return { ...listing, metadata };
      } catch (error) {
        console.warn(`Failed to fetch metadata for token ${tokenId}:`, error);
        return null; // Don't return listings with failed IPFS metadata
      }

    } catch (error) {
      console.error('Error fetching listing:', error);
      throw error;
    }
  }

  /**
   * Fetch metadata from IPFS
   */
  private async fetchMetadataFromIPFS(uri: string): Promise<any> {
    try {
      // Handle different IPFS URI formats
      let ipfsUrl = uri;
      if (uri.startsWith('ipfs://')) {
        ipfsUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      } else if (uri.startsWith('Qm') || uri.startsWith('baf')) {
        ipfsUrl = `https://gateway.pinata.cloud/ipfs/${uri}`;
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(ipfsUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.error('Error fetching IPFS metadata:', error);
      throw error;
    }
  }

  /**
   * Set payment splitter (admin function)
   */
  async setPaymentSplitter(paymentSplitterAddress: string): Promise<{ success: boolean; transactionHash: string }> {
    try {
      console.log(`Setting payment splitter: ${paymentSplitterAddress}`);
      
      const tx = await this.contract.setPaymentSplitter(paymentSplitterAddress, {
        gasLimit: 3000000, // Manual gas limit
        gasPrice: ethers.utils.parseUnits('340', 'gwei') // Required gas price for Hedera
      });
      const receipt = await tx.wait();
      
      console.log('✅ Payment splitter set successfully!');
      console.log('Transaction Hash:', receipt.transactionHash);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash
      };
      
    } catch (error) {
      console.error('Error setting payment splitter:', error);
      throw error;
    }
  }

  /**
   * Get marketplace HBAR balance
   */
  async getMarketplaceBalance(): Promise<number> {
    try {
      const balance = await this.contract.getMarketplaceBalance();
      return parseFloat(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error('Error getting marketplace balance:', error);
      throw error;
    }
  }

  /**
   * Debug function to check asset purchase conditions
   */
  async debugAssetPurchase(tokenId: string, amount: number, pricePerToken: string): Promise<void> {
    try {
      console.log('=== DEBUG ASSET PURCHASE ===');
      console.log('Token ID:', tokenId);
      console.log('Amount to purchase:', amount);
      console.log('Price per token (Wei):', pricePerToken);
      
      // Check listing
      const listing = await this.getListing(tokenId);
      console.log('Current listing:', listing);
      
      if (!listing) {
        console.log('❌ Listing not found or not active');
        return;
      }
      
      console.log('✅ Listing is active');
      console.log('Available amount:', listing.amount);
      console.log('Listed price (Wei):', listing.price);
      console.log('Seller:', listing.seller);
      
      // Check payment splitter
      try {
        const paymentSplitterAddress = await this.contract.paymentSplitter();
        console.log('Payment splitter address:', paymentSplitterAddress);
        if (paymentSplitterAddress === '0x0000000000000000000000000000000000000000') {
          console.log('⚠️ WARNING: Payment splitter is not set');
        } else {
          console.log('✅ Payment splitter is set');
        }
      } catch (error) {
        console.log('❌ Could not check payment splitter:', error);
      }
      
      // Check if buyer is same as seller
      if (this.signer) {
        const buyerAddress = await this.signer.getAddress();
        console.log('Buyer address:', buyerAddress);
        
        if (buyerAddress.toLowerCase() === listing.seller.toLowerCase()) {
          console.log('⚠️ WARNING: Buyer and seller are the same address');
        }
      }
      
      // Calculate total cost
      const pricePerTokenBN = ethers.BigNumber.from(pricePerToken);
      const totalCost = pricePerTokenBN.mul(amount);
      console.log('Total cost (Wei):', totalCost.toString());
      console.log('Total cost (HBAR):', ethers.utils.formatEther(totalCost));
      
      // Check conditions
      if (listing.amount < amount) {
        console.log('❌ Insufficient tokens available');
      } else {
        console.log('✅ Sufficient tokens available');
      }
      
      if (listing.price !== pricePerToken) {
        console.log('❌ Price mismatch');
        console.log('Expected:', pricePerToken);
        console.log('Actual:', listing.price);
      } else {
        console.log('✅ Price matches');
      }
      
      console.log('=== END DEBUG ===');
      
    } catch (error) {
      console.error('Debug error:', error);
    }
  }

  /**
   * Get marketplace contract address
   */
  static getMarketplaceAddress(): string {
    return MARKETPLACE_ADDRESS;
  }

  /**
   * Get marketplace account ID for Hedera operations
   */
  static getMarketplaceAccountId(): string {
    return MARKETPLACE_ACCOUNT_ID;
  }

  /**
   * Get user's owned assets
   */
  async getMyAssets(userAddress: string): Promise<Array<{ tokenId: string; balance: number }>> {
    try {
      console.log(`Getting assets for user: ${userAddress}`);
      
      const result = await this.contract.getMyAssets(userAddress);
      const [tokenIds, balances] = result;
      
      console.log('Raw assets result:', { tokenIds, balances });
      
      const assets = tokenIds.map((tokenId: string, index: number) => ({
        tokenId,
        balance: parseInt(balances[index].toString())
      }));
      
      console.log('Processed user assets:', assets);
      return assets;
      
    } catch (error) {
      console.error('Error getting user assets:', error);
      throw new Error(`Failed to get user assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set platform wallet (admin function) - REMOVED from simplified contract
   * @deprecated - Use setPaymentSplitter instead
   */
  async setPlatformWallet(platformWallet: string): Promise<{ success: boolean; transactionHash: string }> {
    // Redirect to setPaymentSplitter for compatibility
    return this.setPaymentSplitter(platformWallet);
  }
}

export default MarketplaceService;
