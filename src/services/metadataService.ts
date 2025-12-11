/**
 * Unified Metadata Service
 * Handles IPFS metadata fetching with JWT authentication and multiple gateway fallbacks
 */

export interface TokenMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: any;
  }>;
  assetDetails?: {
    assetType?: string;
    category?: string;
  };
  // Allow for cache management properties
  error?: string;
  timestamp?: number;
  expiry?: number;
}

export interface EnhancedTokenData {
  tokenId: string;
  metadata: TokenMetadata | null;
  name: string;
  description: string;
  image: string;
  assetType: string;
  category: string;
  metadataURI: string;
  attributes: Array<{
    trait_type: string;
    value: any;
  }>;
}

import { getUniqueAssetImage, getFixedCategoryImage } from '../utils/assetFallbackImages';

class MetadataService {
  private cache = new Map<string, TokenMetadata>();
  private readonly JWT_TOKEN = import.meta.env.VITE_JWT_SECRET || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjMDU3NzI3NC0xMzU2LTRmZjgtODk5Yi02MjU0MTZmNTMxYTEiLCJlbWFpbCI6ImFkb2U3NDAzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJlZTdmZDhiNDY3MGU4ZTc1Y2YxZiIsInNjb3BlZEtleVNlY3JldCI6Ijg3NjU3MDdkNzBmNzAyZjFkYTAxMmVhNmU1MmYzNDUyMjFkOGE0YzgwMWFjYjVlN2Y4NTk5NzYwODIyNTc3ZGYiLCJleHAiOjE3OTA5Mzk1NTR9.huKruxuknG20OfbJsMjiuIaLTQMbCWsILk1B5Dl7Oko';

  /**
   * Extract IPFS hash from various URI formats
   */
  private extractIPFSHash(uri: string): string {
    if (!uri) throw new Error('Empty URI provided');

    // Handle doubled gateway URLs
    if (uri.includes('https://gateway.pinata.cloud/ipfs/https://gateway.pinata.cloud/ipfs/')) {
      const parts = uri.split('https://gateway.pinata.cloud/ipfs/');
      if (parts.length > 2) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.startsWith('Qm') || lastPart.startsWith('baf')) {
          return lastPart;
        }
      }
      throw new Error('Invalid doubled IPFS URL format');
    }

    // Standard formats
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', '');
    } else if (uri.startsWith('https://gateway.pinata.cloud/ipfs/')) {
      return uri.replace('https://gateway.pinata.cloud/ipfs/', '');
    } else if (uri.startsWith('Qm') || uri.startsWith('baf')) {
      return uri;
    }

    throw new Error(`Unrecognized IPFS format: ${uri}`);
  }

  /**
   * Get fallback image based on asset type and token ID for uniqueness
   */
  private getAssetTypeImage(assetType: string, tokenId?: string): string {
    // If tokenId is provided, get a unique image for this specific asset
    if (tokenId) {
      return getUniqueAssetImage(assetType, tokenId);
    }
    
    // Otherwise, get the fixed category image
    return getFixedCategoryImage(assetType);
  }

  /**
   * Process image URL for display
   */
  private processImageURL(imageUrl: string): string {
    if (!imageUrl) return '/placeholder.svg';

    try {
      if (imageUrl.startsWith('ipfs://')) {
        const hash = imageUrl.replace('ipfs://', '');
        return `https://gateway.pinata.cloud/ipfs/${hash}`;
      } else if (imageUrl.startsWith('Qm') || imageUrl.startsWith('baf')) {
        return `https://gateway.pinata.cloud/ipfs/${imageUrl}`;
      } else if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
    } catch (error) {
      console.warn('Error processing image URL:', error);
    }

    return '/placeholder.svg';
  }

  /**
   * Fetch metadata from IPFS with multiple gateway fallbacks
   */
  async fetchMetadataFromIPFS(metadataURI: string): Promise<TokenMetadata | null> {
    if (!metadataURI || metadataURI.trim() === '') {
      console.warn('Empty metadata URI provided');
      return null;
    }

    // Check cache first
    if (this.cache.has(metadataURI)) {
      const cached = this.cache.get(metadataURI)!;
      
      // If it's a failed result, check if it's expired
      if (cached.error && cached.expiry && Date.now() > cached.expiry) {
        this.cache.delete(metadataURI);
        console.log('🔄 Failed cache entry expired, retrying:', metadataURI);
      } else if (cached.error) {
        console.log('⏭️ Recently failed, skipping retry for:', metadataURI);
        return null;
      } else {
        console.log('💾 Using cached metadata for:', metadataURI);
        return cached;
      }
    }

    try {
      const ipfsHash = this.extractIPFSHash(metadataURI);
      
      // Skip test/fake hashes
      if (ipfsHash.includes('TestHash') || ipfsHash.length < 40) {
        console.log('⚠️ Skipping fake/test metadata hash:', ipfsHash);
        return null;
      }

      console.log('🔄 Fetching metadata from IPFS:', ipfsHash);

      // Multiple IPFS gateways for fallback
      const gateways = [
        {
          url: `https://olive-left-snake-740.mypinata.cloud/ipfs/${ipfsHash}`,
          name: 'Custom Pinata'
        },
        {
          url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
          name: 'Pinata Gateway'
        },
        {
          url: `https://ipfs.io/ipfs/${ipfsHash}`,
          name: 'IPFS.io'
        },
        {
          url: `https://dweb.link/ipfs/${ipfsHash}`,
          name: 'Dweb Link'
        },
        {
          url: `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
          name: 'Cloudflare'
        },
        {
          url: `https://gateway.ipfs.io/ipfs/${ipfsHash}`,
          name: 'IPFS Gateway'
        },
        {
          url: `https://ipfs.infura.io/ipfs/${ipfsHash}`,
          name: 'Infura'
        },
        {
          url: `https://cf-ipfs.com/ipfs/${ipfsHash}`,
          name: 'CF IPFS'
        },
        {
          url: `https://dweb.link/ipfs/${ipfsHash}`,
          name: 'DWeb.link'
        }
      ];

      // Try each gateway with timeout and retry logic
      for (let attempt = 1; attempt <= 2; attempt++) { // 2 attempts per gateway
        for (const gateway of gateways) {
          console.log(`🔄 Trying gateway: ${gateway.name} - ${gateway.url} (attempt ${attempt})`);
          
          try {
            const response = await Promise.race([
              fetch(gateway.url, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                }
              }),
              new Promise<Response>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), attempt === 1 ? 5000 : 10000) // Longer timeout on second attempt
              )
            ]);

            if (response.ok) {
              const metadata = await response.json();
              console.log(`✅ Metadata fetched successfully from ${gateway.name} on attempt ${attempt}`);
              
              // Process image URL
              if (metadata.image) {
                metadata.image = this.processImageURL(metadata.image);
              }

              // Cache the result
              this.cache.set(metadataURI, metadata);
              return metadata;
            } else if (response.status === 429) {
              console.log(`⚠️ Gateway ${gateway.name} rate limited (429), trying next...`);
              continue;
            } else if (response.status === 404) {
              console.log(`⚠️ Gateway ${gateway.name} returned 404 - content not found`);
              continue;
            } else {
              console.log(`⚠️ Gateway ${gateway.name} failed with status ${response.status}, trying next...`);
              continue;
            }
          } catch (gatewayError) {
            console.warn(`❌ Gateway ${gateway.name} error (attempt ${attempt}):`, gatewayError.message);
            
            // If this was a timeout and we're on first attempt, continue to next gateway
            // If this was second attempt, we'll try next gateway on next iteration
            continue;
          }
        }
      }

      console.error('❌ All IPFS gateways failed for:', metadataURI);
      
      // Store failed attempt in cache with short expiry to avoid immediate retries
      const failedResult = { 
        error: 'All gateways failed', 
        timestamp: Date.now(),
        expiry: Date.now() + (5 * 60 * 1000) // 5 minutes
      };
      this.cache.set(metadataURI, failedResult);
      
      return null;

    } catch (error) {
      console.error('❌ Error fetching metadata from IPFS:', error);
      return null;
    }
  }

  /**
   * Batch fetch metadata for multiple tokens
   */
  async batchFetchTokenMetadata(tokenIds: string[], getMetadataURI: (tokenId: string) => Promise<string>): Promise<EnhancedTokenData[]> {
    const results: EnhancedTokenData[] = [];
    
    console.log(`🔄 Batch processing ${tokenIds.length} tokens...`);
    
    // Process in batches to avoid overwhelming the gateways
    const BATCH_SIZE = 5;
    for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
      const batch = tokenIds.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (tokenId) => {
        try {
          const metadataURI = await getMetadataURI(tokenId);
          const metadata = await this.fetchMetadataFromIPFS(metadataURI);
          
          // Extract asset type from metadata
          let assetType = 'Unknown';
          let category = 'General';
          
          if (metadata?.attributes) {
            const assetTypeAttr = metadata.attributes.find((attr: any) => 
              attr.trait_type === 'Asset Type'
            );
            assetType = assetTypeAttr?.value || assetType;
            
            const categoryAttr = metadata.attributes.find((attr: any) => 
              attr.trait_type === 'Category'
            );
            category = categoryAttr?.value || category;
          } else if (metadata?.assetDetails) {
            assetType = metadata.assetDetails.assetType || assetType;
            category = metadata.assetDetails.category || category;
          }

          const processedData: EnhancedTokenData = {
            tokenId,
            metadata,
            name: metadata?.name || `Asset Token #${tokenId}`,
            description: metadata?.description || `Asset token #${tokenId}`,
            image: metadata?.image || this.getAssetTypeImage(assetType, tokenId),
            assetType,
            category,
            metadataURI,
            attributes: metadata?.attributes || [
              { trait_type: 'Asset Type', value: assetType },
              { trait_type: 'Token ID', value: tokenId }
            ]
          };

          return processedData;
        } catch (error) {
          console.error(`❌ Error processing token ${tokenId}:`, error);
          
          // Return fallback data
          return {
            tokenId,
            metadata: null,
            name: `Asset Token #${tokenId}`,
            description: `Asset token #${tokenId}`,
            image: this.getAssetTypeImage('Unknown', tokenId),
            assetType: 'Unknown',
            category: 'General',
            metadataURI: '',
            attributes: [
              { trait_type: 'Asset Type', value: 'Unknown' },
              { trait_type: 'Token ID', value: tokenId }
            ]
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + BATCH_SIZE < tokenIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Batch processing completed: ${results.length} tokens processed`);
    return results;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Metadata cache cleared');
  }
}

export const metadataService = new MetadataService();