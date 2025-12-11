import { ethers } from 'ethers';
import { MARKETPLACE_ABI } from './marketplaceABI';
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT } from '../lib/contractAddress';
import { processImageURLFast, getFallbackImage } from './imageUtils';
import { metadataService } from '../services/metadataService';
import { getDeterministicAssetImage } from './assetFallbackImages';

export interface AssetMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string;
    display_type?: string;
  }>;
  // RWA-specific fields
  asset_type?: string;
  location?: string;
  valuation?: string;
  certification?: string;
}

export interface EnhancedTokenInfo {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  totalSupply: number;
  userBalance: number;
  isListed: boolean;
  marketplacePrice?: number;
  exists: boolean;
  metadata?: AssetMetadata;
  // RWA-specific enhanced fields
  assetType: string;
  location: string;
  valuation: string;
  area?: string;
  bedrooms?: string;
  bathrooms?: string;
  // Additional attributes
  attributes: Array<{
    trait_type: string;
    value: string;
    display_type?: string;
  }>;
  // Trading info
  lastPrice?: number;
  priceChange24h?: string;
  volume24h?: number;
}

export class EnhancedTokenService {
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
   * Fetch enhanced token information with metadata and RWA-specific details
   */
  async fetchEnhancedMarketplaceListings(userAddress?: string): Promise<EnhancedTokenInfo[]> {
    try {
      console.log('🔄 ENHANCED: Fetching detailed marketplace listings for OrderBook...');
      
      const signerOrProvider = this.signer || this.provider;
      const marketplaceContract = new ethers.Contract(
        this.marketplaceAddress,
        MARKETPLACE_ABI,
        signerOrProvider
      );

      // Create token contract for metadata and balance checks
      const erc1155ABI = [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function uri(uint256 id) view returns (string)",
        "function getTokenLifecycleStatus(uint256 tokenId) external view returns (uint8)"
      ];
      
      const tokenContract = new ethers.Contract(
        this.tokenAddress,
        erc1155ABI,
        this.provider
      );

      console.log('📞 Getting all marketplace listings...');
      
      // Get all marketplace listings
      const listingsResult = await marketplaceContract.getAllListings();
      const [tokenIds, issuers, amounts, prices] = listingsResult;
      console.log(`Found ${tokenIds.length} marketplace listings`);

      const enhancedTokens: EnhancedTokenInfo[] = [];

      // Process each listing with enhanced data
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i].toString();
        const amount = amounts[i].toString();
        const price = prices[i];

        try {
          // Skip burned tokens by checking lifecycle status
          try {
            const lifecycle = await tokenContract.getTokenLifecycleStatus(tokenId);
            if (lifecycle === 2) { // 2 = Burned
              console.log(`🔥 Skipping burned token ${tokenId} in orderbook`);
              continue;
            }
          } catch (lifecycleError) {
            console.warn(`⚠️ Could not check lifecycle for token ${tokenId}, including in orderbook`);
          }
          
          // Get user's wallet balance
          let userBalance = 0;
          if (userAddress) {
            try {
              const walletBalance = await tokenContract.balanceOf(userAddress, tokenId);
              userBalance = parseInt(walletBalance.toString());
            } catch (balanceError) {
              console.warn(`Could not fetch wallet balance for token ${tokenId}`);
              userBalance = 0;
            }
          }

          // Fetch comprehensive metadata
          const enhancedMetadata = await this.fetchEnhancedMetadata(tokenContract, tokenId);
          
          // Create enhanced token info
          const enhancedToken: EnhancedTokenInfo = {
            id: tokenId,
            name: enhancedMetadata.name,
            symbol: enhancedMetadata.symbol,
            description: enhancedMetadata.description,
            image: enhancedMetadata.image,
            totalSupply: parseInt(amount),
            userBalance: userBalance,
            isListed: true,
            marketplacePrice: price ? parseFloat(ethers.utils.formatEther(price)) : 0,
            exists: true,
            metadata: enhancedMetadata.metadata,
            // RWA-specific fields
            assetType: enhancedMetadata.assetType,
            location: enhancedMetadata.location,
            valuation: enhancedMetadata.valuation,
            area: enhancedMetadata.area,
            bedrooms: enhancedMetadata.bedrooms,
            bathrooms: enhancedMetadata.bathrooms,
            attributes: enhancedMetadata.attributes,
            // Mock trading data (in real app, fetch from API/subgraph)
            lastPrice: price ? parseFloat(ethers.utils.formatEther(price)) : 0,
            priceChange24h: this.generateMockPriceChange(),
            volume24h: this.generateMockVolume()
          };
          
          enhancedTokens.push(enhancedToken);

          console.log(`✅ ENHANCED: Added token ${tokenId}:`, {
            name: enhancedToken.name,
            assetType: enhancedToken.assetType,
            location: enhancedToken.location,
            userBalance: enhancedToken.userBalance
          });
          
        } catch (error) {
          console.error(`Error processing enhanced token ${tokenId}:`, error);
        }
      }

      console.log(`✅ ENHANCED LISTINGS: Found ${enhancedTokens.length} detailed tokens for OrderBook`);
      return enhancedTokens;
      
    } catch (error) {
      console.error('❌ Error fetching enhanced marketplace listings:', error);
      return [];
    }
  }

  /**
   * Fetch comprehensive metadata with fallbacks and RWA-specific parsing
   */
  private async fetchEnhancedMetadata(tokenContract: ethers.Contract, tokenId: string) {
    try {
      console.log(`🔍 Fetching enhanced metadata for token ${tokenId}...`);
      
      // Try to get metadata URI from contract
      let metadataUri = '';
      try {
        metadataUri = await tokenContract.uri(tokenId);
        console.log(`Got metadata URI for token ${tokenId}:`, metadataUri);
      } catch (uriError) {
        console.log(`Could not fetch URI for token ${tokenId}, using fallbacks`);
      }

      // Parse metadata if available using unified metadata service
      let metadata: AssetMetadata | undefined;
      if (metadataUri && metadataUri !== '' && !metadataUri.includes('TestHash')) {
        const unifiedMetadata = await metadataService.fetchMetadataFromIPFS(metadataUri);
        if (unifiedMetadata) {
          // Convert to AssetMetadata format
          metadata = {
            name: unifiedMetadata.name || '',
            description: unifiedMetadata.description || '',
            image: unifiedMetadata.image || '',
            external_url: unifiedMetadata.external_url,
            attributes: unifiedMetadata.attributes || [],
            asset_type: unifiedMetadata.assetDetails?.assetType || 
                       unifiedMetadata.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value,
            location: unifiedMetadata.attributes?.find(attr => attr.trait_type === 'Location')?.value || '',
            valuation: unifiedMetadata.attributes?.find(attr => attr.trait_type === 'Valuation')?.value || '',
            certification: unifiedMetadata.attributes?.find(attr => attr.trait_type === 'Certification')?.value || ''
          };
        }
      }

      // Create comprehensive token info with intelligent fallbacks
      return this.createEnhancedTokenData(tokenId, metadata);
      
    } catch (error) {
      console.error(`Error fetching enhanced metadata for token ${tokenId}:`, error);
      return this.createEnhancedTokenData(tokenId, undefined);
    }
  }

  /**
   * Parse metadata from IPFS URI with multiple gateway fallbacks
   */
  private async parseMetadataFromUri(uri: string): Promise<AssetMetadata | undefined> {
    try {
      // Handle different URI formats
      let httpUrl = uri;
      if (uri.startsWith('ipfs://')) {
        httpUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      } else if (!uri.startsWith('http')) {
        httpUrl = `https://gateway.pinata.cloud/ipfs/${uri}`;
      }

      console.log(`Fetching metadata from: ${httpUrl}`);

      const response = await fetch(httpUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        // Add timeout
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metadata = await response.json();
      console.log(`✅ Successfully fetched metadata:`, metadata);

      // Process and validate image URL
      if (metadata.image) {
        if (metadata.image.startsWith('ipfs://')) {
          const ipfsImageUrl = metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          // Test if IPFS image is accessible
          try {
            const imageResponse = await fetch(ipfsImageUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            if (imageResponse.ok) {
              metadata.image = ipfsImageUrl;
              console.log(`✅ IPFS image validated: ${ipfsImageUrl}`);
            } else {
              console.warn(`⚠️ IPFS image not accessible: ${ipfsImageUrl}`);
              metadata.image = ''; // Clear to trigger fallback
            }
          } catch (imageError) {
            console.warn(`⚠️ IPFS image validation failed: ${ipfsImageUrl}`, imageError);
            metadata.image = ''; // Clear to trigger fallback
          }
        } else if (!metadata.image.startsWith('http')) {
          console.warn(`⚠️ Invalid image URL format: ${metadata.image}`);
          metadata.image = ''; // Clear to trigger fallback
        }
      }

      return metadata;
    } catch (error) {
      console.log('Could not fetch metadata from URI:', error);
      return undefined;
    }
  }

  /**
   * Create enhanced token data with intelligent fallbacks and RWA-specific categorization
   */
  private createEnhancedTokenData(tokenId: string, metadata?: AssetMetadata) {
    // Extract RWA-specific attributes
    const attributes = metadata?.attributes || [];
    
    // Smart categorization based on metadata
    const assetType = this.determineAssetType(metadata, attributes);
    const location = this.extractLocation(metadata, attributes);
    const valuation = this.extractValuation(metadata, attributes);
    
    // Real estate specific attributes
    const area = this.extractAttribute(attributes, ['Area', 'Size', 'Square Feet', 'Sq Ft']);
    const bedrooms = this.extractAttribute(attributes, ['Bedrooms', 'Beds', 'Bedroom']);
    const bathrooms = this.extractAttribute(attributes, ['Bathrooms', 'Baths', 'Bathroom']);

    return {
      name: metadata?.name || this.generateFallbackName(tokenId, assetType),
      symbol: this.generateSymbol(tokenId, assetType),
      description: metadata?.description || this.generateFallbackDescription(tokenId, assetType),
      image: processImageURLFast(metadata?.image || '', assetType, tokenId),
      metadata,
      assetType,
      location,
      valuation,
      area,
      bedrooms,
      bathrooms,
      attributes
    };
  }

  /**
   * Intelligent asset type determination
   */
  private determineAssetType(metadata?: AssetMetadata, attributes: any[] = []): string {
    // Check explicit asset_type field
    if (metadata?.asset_type) {
      return metadata.asset_type;
    }

    // Check attributes for type hints
    const typeAttribute = this.extractAttribute(attributes, ['Type', 'Asset Type', 'Category']);
    if (typeAttribute) {
      return typeAttribute;
    }

    // Smart inference from name/description
    const text = `${metadata?.name || ''} ${metadata?.description || ''}`.toLowerCase();
    
    if (text.includes('real estate') || text.includes('property') || text.includes('villa') || text.includes('house')) {
      return 'Real Estate';
    } else if (text.includes('gold') || text.includes('silver') || text.includes('metal') || text.includes('bullion')) {
      return 'Precious Metals';
    } else if (text.includes('wine') || text.includes('vintage') || text.includes('bottle')) {
      return 'Collectibles';
    } else if (text.includes('art') || text.includes('painting') || text.includes('sculpture')) {
      return 'Art';
    } else if (text.includes('carbon') || text.includes('credit') || text.includes('offset')) {
      return 'Carbon Credits';
    }

    return 'Real World Asset';
  }

  /**
   * Extract location from metadata
   */
  private extractLocation(metadata?: AssetMetadata, attributes: any[] = []): string {
    // Check attributes for location
    const location = this.extractAttribute(attributes, ['Location', 'Address', 'City', 'Region', 'Country']);
    if (location) return location;

    // Extract from description
    if (metadata?.description) {
      const locationRegex = /(in|at|located in)\s+([A-Z][a-zA-Z\s,]+)/i;
      const match = metadata.description.match(locationRegex);
      if (match) return match[2].trim();
    }

    return 'Location TBD';
  }

  /**
   * Extract valuation information
   */
  private extractValuation(metadata?: AssetMetadata, attributes: any[] = []): string {
    const valuation = this.extractAttribute(attributes, ['Valuation', 'Value', 'Worth', 'Appraisal']);
    return valuation || 'Valuation Pending';
  }

  /**
   * Helper to extract attribute by key variants
   */
  private extractAttribute(attributes: any[], keyVariants: string[]): string {
    for (const attr of attributes) {
      for (const key of keyVariants) {
        if (attr.trait_type?.toLowerCase() === key.toLowerCase()) {
          return attr.value;
        }
      }
    }
    return '';
  }

  /**
   * Generate fallback names based on asset type
   */
  private generateFallbackName(tokenId: string, assetType: string): string {
    const typeNames = {
      'Real Estate': `Property #${tokenId}`,
      'Precious Metals': `Gold Asset #${tokenId}`,
      'Collectibles': `Collectible #${tokenId}`,
      'Art': `Artwork #${tokenId}`,
      'Carbon Credits': `Carbon Credit #${tokenId}`
    };
    return typeNames[assetType as keyof typeof typeNames] || `Asset #${tokenId}`;
  }

  /**
   * Generate smart symbols
   */
  private generateSymbol(tokenId: string, assetType: string): string {
    const typeSymbols = {
      'Real Estate': `PROP${tokenId}`,
      'Precious Metals': `GOLD${tokenId}`,
      'Collectibles': `COLL${tokenId}`,
      'Art': `ART${tokenId}`,
      'Carbon Credits': `CARB${tokenId}`
    };
    return typeSymbols[assetType as keyof typeof typeSymbols] || `RWA${tokenId}`;
  }

  /**
   * Generate contextual descriptions
   */
  private generateFallbackDescription(tokenId: string, assetType: string): string {
    const descriptions = {
      'Real Estate': `Tokenized real estate property with fractional ownership rights. Property ID: ${tokenId}`,
      'Precious Metals': `Physical precious metal asset backed by certified bullion. Asset ID: ${tokenId}`,
      'Collectibles': `Authenticated collectible item with provenance tracking. Item ID: ${tokenId}`,
      'Art': `Tokenized artwork with verified authenticity and ownership history. Piece ID: ${tokenId}`,
      'Carbon Credits': `Verified carbon offset credit representing environmental impact reduction. Credit ID: ${tokenId}`
    };
    return descriptions[assetType as keyof typeof descriptions] || `Real-world asset token with verifiable ownership rights. Asset ID: ${tokenId}`;
  }

  /**
   * Generate contextual placeholder images using local assets
   */
  private generateFallbackImage(assetType: string, tokenId?: string): string {
    return getDeterministicAssetImage(assetType, tokenId || '1');
  }

  /**
   * Generate mock trading data (replace with real API in production)
   */
  private generateMockPriceChange(): string {
    const changes = ['+2.4%', '-1.8%', '+0.7%', '-0.3%', '+4.1%', '-2.9%', '+1.2%'];
    return changes[Math.floor(Math.random() * changes.length)];
  }

  private generateMockVolume(): number {
    return Math.floor(Math.random() * 1000) + 100;
  }

  /**
   * Get detailed token info by ID
   */
  async getDetailedTokenInfo(tokenId: string, userAddress?: string): Promise<EnhancedTokenInfo | null> {
    try {
      const tokens = await this.fetchEnhancedMarketplaceListings(userAddress);
      return tokens.find(token => token.id === tokenId) || null;
    } catch (error) {
      console.error(`Error fetching detailed info for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Get user's U2U balance
   */
  async getU2UBalance(userAddress: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(userAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error fetching U2U balance:', error);
      return '0';
    }
  }
}