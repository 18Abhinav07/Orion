import { ethers } from 'ethers';
import { MARKETPLACE_ABI } from './marketplaceABI';
import { MASTER_TOKEN_ABI } from './masterTokenABI';
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT } from '../lib/contractAddress';

export interface TokenInfo {
  id: string;
  name: string;
  symbol: string;
  totalSupply: number;
  userBalance: number;
  isListed: boolean;
  price?: number;
  exists: boolean;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export class TokenService {
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private marketplaceAddress: string;
  private tokenAddress: string;

  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    this.marketplaceAddress = MARKETPLACE_CONTRACT;
    this.tokenAddress = TOKEN_CONTRACT;
  }

  /**
   * FIXED: Only returns tokens that the user actually owns (balance > 0)
   * This prevents the "insufficient balance" error by not showing tokens the user doesn't have
   */
  async fetchAllTokens(userAddress?: string): Promise<TokenInfo[]> {
    try {
      console.log('🔄 FIXED TOKEN FETCHING: Only showing tokens with user balance > 0...');
      
      if (!userAddress) {
        console.log('No user address provided, returning empty array');
        return [];
      }

      const signerOrProvider = this.signer || this.provider;
      const marketplaceContract = new ethers.Contract(
        this.marketplaceAddress,
        MARKETPLACE_ABI,
        signerOrProvider
      );

      // Create token contract for balance checks
      const erc1155ABI = [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function uri(uint256 id) view returns (string)"
      ];
      
      const tokenContract = new ethers.Contract(
        this.tokenAddress,
        erc1155ABI,
        this.provider
      );

      const tokens: TokenInfo[] = [];

      console.log('📞 Checking user balance for tokens 1-10...');
      
      // Check tokens 1-10 for actual user balance
      for (let tokenId = 1; tokenId <= 10; tokenId++) {
        try {
          const balance = await tokenContract.balanceOf(userAddress, tokenId);
          const userBalance = parseInt(balance.toString()); // ERC1155 balance is already a number
          
          // ONLY include tokens where user has balance > 0
          if (userBalance > 0) {
            console.log(`✅ Found owned Token ID ${tokenId} with balance:`, userBalance);
            
            // Get token metadata
            let name = `Token #${tokenId}`;
            let symbol = `TOKEN${tokenId}`;
            
            try {
              const uri = await tokenContract.uri(tokenId);
              if (uri) {
                const metadata = await this.fetchTokenMetadata(uri);
                if (metadata) {
                  name = metadata.name || name;
                  symbol = metadata.symbol || symbol;
                }
              }
            } catch (metadataError) {
              console.log(`Could not fetch metadata for token ${tokenId}`);
            }

            // Get total supply from custom mapping
            let totalSupply = 0;
            try {
              const supply = await tokenContract.tokenSupply(tokenId);
              totalSupply = parseFloat(ethers.utils.formatEther(supply));
            } catch (supplyError) {
              console.log(`Could not fetch total supply for token ${tokenId}`);
            }

            // Check if this token is listed on marketplace
            let isListed = false;
            let price = 0;
            try {
              const [allTokenIds, , , allPrices] = await marketplaceContract.getAllListings();
              for (let i = 0; i < allTokenIds.length; i++) {
                if (allTokenIds[i].toString() === tokenId.toString()) {
                  isListed = true;
                  price = parseFloat(ethers.utils.formatEther(allPrices[i]));
                  break;
                }
              }
            } catch (listingError) {
              console.log('Could not check marketplace listings');
            }

            tokens.push({
              id: tokenId.toString(),
              name,
              symbol,
              totalSupply,
              userBalance,
              isListed,
              price,
              exists: true
            });
          }
        } catch (balanceError) {
          // Skip tokens that error out
        }
      }
      
      console.log(`✅ SUCCESS: Returning ${tokens.length} tokens with user balance > 0:`, 
        tokens.map(t => `ID ${t.id} (${t.userBalance} tokens)`));
      
      if (tokens.length === 0) {
        console.log('⚠️ WARNING: User has no tokens with balance > 0');
      }
      
      return tokens;

    } catch (error) {
      console.error('Error fetching user-owned tokens:', error);
      return [];
    }
  }

  async getTokenBalance(tokenId: string, userAddress: string): Promise<number> {
    try {
      console.log(`🔍 Fetching WALLET balance for Token ID ${tokenId}, User: ${userAddress}`);
      
      try {
        // For OrderBook, check actual wallet balance using ERC1155 balanceOf
        const erc1155ABI = [
          "function balanceOf(address account, uint256 id) view returns (uint256)"
        ];
        
        const tokenContract = new ethers.Contract(
          this.tokenAddress,
          erc1155ABI,
          this.provider
        );
        
        const walletBalance = await tokenContract.balanceOf(userAddress, tokenId);
        const balance = parseInt(walletBalance.toString());
        console.log(`✅ Token ID ${tokenId} WALLET balance: ${balance} (for OrderBook)`);
        return balance;
        
      } catch (contractError) {
        console.warn(`⚠️ Wallet balance call failed for token ${tokenId}:`, contractError.message);
        return 0; // Return 0 if balance call fails
      }
      
    } catch (error) {
      console.error('❌ Error setting up marketplace contract:', error);
      return 0;
    }
  }

  async getU2UBalance(userAddress: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(userAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error fetching U2U balance:', error);
      return '0';
    }
  }

  private async fetchTokenMetadata(uri: string): Promise<any> {
    try {
      // Convert IPFS URI to HTTP gateway URL
      const httpUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      
      const response = await fetch(httpUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.log('Could not fetch token metadata:', error);
      return null;
    }
  }

  /**
   * NEW: Fetch all listed tokens from marketplace for OrderBook/Secondary marketplace
   * This shows ALL listed tokens, not just ones the user owns
   */
  async fetchMarketplaceListings(userAddress?: string): Promise<TokenInfo[]> {
    try {
      console.log('🔄 FETCHING MARKETPLACE LISTINGS for OrderBook...');
      
      const signerOrProvider = this.signer || this.provider;
      const marketplaceContract = new ethers.Contract(
        this.marketplaceAddress,
        MARKETPLACE_ABI,
        signerOrProvider
      );

      // Create token contract for metadata and balance checks
      const erc1155ABI = [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function uri(uint256 id) view returns (string)"
      ];
      
      const tokenContract = new ethers.Contract(
        this.tokenAddress,
        erc1155ABI,
        this.provider
      );

      console.log('📞 Getting all marketplace listings...');
      
      // Get all marketplace listings - returns [tokenIds[], issuers[], amounts[], prices[]]
      const listingsResult = await marketplaceContract.getAllListings();
      const [tokenIds, issuers, amounts, prices] = listingsResult;
      console.log(`Found ${tokenIds.length} marketplace listings`);

      const tokens: TokenInfo[] = [];

      // Process each listing
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i].toString();
        const issuer = issuers[i];
        const amount = amounts[i].toString();
        const price = prices[i];

        try {
          // Get user's WALLET balance for this token (for OrderBook non-custodial trading)
          let userBalance = 0;
          if (userAddress) {
            try {
              // For OrderBook, check actual wallet balance, not marketplace balance
              console.log(`🔍 DEBUGGING: Checking wallet balance for token ${tokenId}, user: ${userAddress}`);
              const walletBalance = await tokenContract.balanceOf(userAddress, tokenId);
              userBalance = parseInt(walletBalance.toString());
              console.log(`✅ DEBUGGING: User wallet balance for token ${tokenId}: ${userBalance} (for OrderBook trading)`);
              
            } catch (balanceError) {
              console.warn(`❌ DEBUGGING: Could not fetch wallet balance for token ${tokenId}:`, balanceError.message);
              userBalance = 0; // Default to 0 if balance call fails
            }
          } else {
            console.log(`⚠️ DEBUGGING: No userAddress provided, setting balance to 0`);
          }

          // Get token metadata with fallback - SIMPLIFIED VERSION
          let name = `Property #${tokenId}`;
          let symbol = `PROP${tokenId}`;
          
          // Skip metadata fetching for now to avoid contract call issues
          // TODO: Re-enable once contract interface is stable
          console.log(`Using fallback name for token ${tokenId}: ${name}`);

          // Add token to list - INCLUDE ALL LISTED TOKENS
          const tokenInfo = {
            id: tokenId,
            name: name,
            symbol: symbol,
            totalSupply: parseInt(amount), // ERC1155 amount is already a number, not wei
            userBalance: userBalance,
            isListed: true,
            price: price ? parseFloat(ethers.utils.formatEther(price)) : 0,
            exists: true
          };
          
          tokens.push(tokenInfo);

          console.log(`✅ DEBUGGING: Added marketplace listing:`, {
            tokenId: tokenInfo.id,
            name: tokenInfo.name,
            userBalance: tokenInfo.userBalance,
            totalSupply: tokenInfo.totalSupply
          });
          
        } catch (error) {
          console.error(`Error processing token ${tokenId}:`, error);
        }
      }

      console.log(`✅ MARKETPLACE LISTINGS: Found ${tokens.length} listed tokens for OrderBook`);
      return tokens;
      
    } catch (error) {
      console.error('❌ Error fetching marketplace listings:', error);
      return [];
    }
  }

  /**
   * Withdraw tokens from marketplace to user's wallet for OrderBook trading
   */
  async withdrawAsset(tokenId: string, amount: number): Promise<boolean> {
    try {
      console.log(`🔄 Withdrawing ${amount} of token ${tokenId} from marketplace to wallet...`);
      
      if (!this.signer) {
        throw new Error('Signer required for withdrawal');
      }

      const marketplaceContract = new ethers.Contract(
        this.marketplaceAddress,
        MARKETPLACE_ABI,
        this.signer
      );

      // Call withdrawAsset function
      const tx = await marketplaceContract.withdrawAsset(tokenId, amount);
      console.log('📤 Withdrawal transaction sent:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ Withdrawal confirmed in block:', receipt.blockNumber);

      return true;
    } catch (error) {
      console.error('❌ Error withdrawing asset:', error);
      throw error;
    }
  }
}