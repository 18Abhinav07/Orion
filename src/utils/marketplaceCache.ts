import { metadataService } from '../services/metadataService';
import { isDummyData, isMarketplaceListingDummy, createFailedFetchMarker, isFailedFetchMarker, isFailedFetchMarkerExpired } from './dummyDataUtils';

// Cache configuration for marketplace and assets
export const MARKETPLACE_CACHE_CONFIG = {
  // Cache keys
  KEYS: {
    MARKETPLACE_LISTINGS: 'marketplace_listings',
    ASSET_METADATA: 'asset_metadata', // Individual asset metadata
    IPFS_IMAGES: 'ipfs_images', // Processed image URLs
    USER_OWNED_ASSETS: 'user_owned_assets', // User's owned assets in dashboard
  },
  
  // Expiration times in milliseconds
  EXPIRATION: {
    MARKETPLACE_LISTINGS: 10 * 60 * 1000, // 10 minutes for marketplace listings
    ASSET_METADATA: 24 * 60 * 60 * 1000, // 24 hours for individual asset metadata (stable data)
    IPFS_IMAGES: 7 * 24 * 60 * 60 * 1000, // 7 days for processed image URLs (very stable)
    USER_OWNED_ASSETS: 5 * 60 * 1000, // 5 minutes for user's owned assets
  }
};

// Types for marketplace caching
import { LicensedIp } from '../services/marketplaceService';

// ...

export interface MarketplaceListing {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  price: string;
  amount: number;
  totalSupply?: number;
  seller: string;
  metadataURI: string;
  metadata?: any;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
  type?: string;
  category?: string;
  license?: LicensedIp;
}

export interface AssetMetadata {
  tokenId: string;
  metadata: any;
  processedImageUrl: string;
  metadataURI: string;
  fetchedAt: number;
}

export interface CachedImageData {
  originalUrl: string;
  processedUrl: string;
  fetchedAt: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

export class MarketplaceCache {
  private static instance: MarketplaceCache;
  
  public static getInstance(): MarketplaceCache {
    if (!MarketplaceCache.instance) {
      MarketplaceCache.instance = new MarketplaceCache();
    }
    return MarketplaceCache.instance;
  }

  private constructor() {}

  /**
   * Store data in cache with timestamp
   */
  private setCache<T>(key: string, data: T): void {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        key
      };
      localStorage.setItem(key, JSON.stringify(cacheEntry));
      console.log(`✅ Cached data for key: ${key}`);
    } catch (error) {
      console.warn(`⚠️ Failed to cache data for key: ${key}`, error);
    }
  }

  /**
   * Get data from cache if valid
   */
  private getCache<T>(key: string, expirationTime: number): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) {
        console.log(`📭 No cached data found for key: ${key}`);
        return null;
      }

      const cacheEntry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if cache is expired
      const now = Date.now();
      const age = now - cacheEntry.timestamp;
      if (age > expirationTime) {
        console.log(`⏰ Cache expired for key: ${key} (age: ${Math.round(age / 1000)}s, max: ${Math.round(expirationTime / 1000)}s)`);
        localStorage.removeItem(key);
        return null;
      }

      console.log(`🎯 Using cached data for key: ${key} (age: ${Math.round(age / 1000)}s)`);
      return cacheEntry.data;
    } catch (error) {
      console.warn(`⚠️ Failed to retrieve cached data for key: ${key}`, error);
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Clear all marketplace cache or specific keys
   */
  public clearCache(specificKey?: string): void {
    try {
      if (specificKey) {
        localStorage.removeItem(specificKey);
        console.log(`🗑️ Cleared cache for key: ${specificKey}`);
      } else {
        Object.values(MARKETPLACE_CACHE_CONFIG.KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
        console.log('🗑️ Cleared all marketplace cache');
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear cache', error);
    }
  }

  /**
   * Clear only dummy data from cache
   */
  public clearDummyDataFromCache(): number {
    console.log('🧹 Clearing dummy data from marketplace cache...');
    
    let clearedCount = 0;
    const keysToCheck = [
      MARKETPLACE_CACHE_CONFIG.KEYS.MARKETPLACE_LISTINGS,
      MARKETPLACE_CACHE_CONFIG.KEYS.USER_OWNED_ASSETS,
    ];

    // Clear dummy marketplace listings
    keysToCheck.forEach(baseKey => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(baseKey)) continue;

        try {
          const cached = localStorage.getItem(key);
          if (!cached) continue;

          const cacheEntry = JSON.parse(cached);
          if (!cacheEntry.data) continue;

          if (Array.isArray(cacheEntry.data)) {
            // Process array data (listings)
            const originalLength = cacheEntry.data.length;
            cacheEntry.data = cacheEntry.data.filter((item: any) => !isMarketplaceListingDummy(item));
            
            if (cacheEntry.data.length !== originalLength) {
              const removedCount = originalLength - cacheEntry.data.length;
              clearedCount += removedCount;
              
              if (cacheEntry.data.length === 0) {
                localStorage.removeItem(key);
                console.log(`🗑️ Removed empty cache entry: ${key}`);
              } else {
                localStorage.setItem(key, JSON.stringify(cacheEntry));
                console.log(`🧹 Cleaned ${removedCount} dummy entries from: ${key}`);
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error processing cache key ${key}:`, error);
        }
      }
    });

    // Clear individual asset metadata that's dummy
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(MARKETPLACE_CACHE_CONFIG.KEYS.ASSET_METADATA)) continue;

      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;

        const cacheEntry = JSON.parse(cached);
        if (cacheEntry.data && cacheEntry.data.metadata) {
          if (isDummyData({ metadata: cacheEntry.data.metadata, name: cacheEntry.data.metadata?.name })) {
            localStorage.removeItem(key);
            clearedCount++;
            console.log(`🗑️ Removed dummy asset metadata: ${key}`);
          }
        }
      } catch (error) {
        // Skip invalid entries
      }
    }

    console.log(`✅ Cleared ${clearedCount} dummy data entries from cache`);
    return clearedCount;
  }

  /**
   * Cache marketplace listings (filters out dummy data)
   */
  public cacheMarketplaceListings(listings: MarketplaceListing[]): void {
    // Filter out dummy data before caching
    const realListings = listings.filter(listing => !isMarketplaceListingDummy(listing));
    
    console.log(`🧹 Filtered marketplace listings: ${listings.length} → ${realListings.length} (removed ${listings.length - realListings.length} dummy entries)`);
    
    if (realListings.length > 0) {
      this.setCache(MARKETPLACE_CACHE_CONFIG.KEYS.MARKETPLACE_LISTINGS, realListings);
    } else {
      console.warn('⚠️ All marketplace listings were dummy data - not caching');
    }
  }

  /**
   * Get cached marketplace listings (cleans dummy data)
   */
  public getCachedMarketplaceListings(): MarketplaceListing[] | null {
    console.log('🔍 getCachedMarketplaceListings called');
    const result = this.getCache<MarketplaceListing[]>(
      MARKETPLACE_CACHE_CONFIG.KEYS.MARKETPLACE_LISTINGS,
      MARKETPLACE_CACHE_CONFIG.EXPIRATION.MARKETPLACE_LISTINGS
    );
    
    if (!result) {
      console.log('📭 No cached marketplace listings found');
      return null;
    }
    
    // Filter out any dummy data that might have been cached previously
    const cleanResult = result.filter(listing => !isMarketplaceListingDummy(listing));
    
    if (cleanResult.length !== result.length) {
      console.log(`🧹 Cleaned marketplace cache: ${result.length} → ${cleanResult.length} (removed ${result.length - cleanResult.length} dummy entries)`);
      
      // Update cache with clean data
      if (cleanResult.length > 0) {
        this.cacheMarketplaceListings(cleanResult);
      } else {
        // All were dummy, clear the cache
        this.clearCache(MARKETPLACE_CACHE_CONFIG.KEYS.MARKETPLACE_LISTINGS);
        return null;
      }
    }
    
    console.log('📊 Cache result:', cleanResult ? `${cleanResult.length} clean listings found` : 'No cache found');
    if (cleanResult && cleanResult.length > 0) {
      console.log('📋 First listing sample:', {
        name: cleanResult[0].name,
        type: cleanResult[0].type,
        category: cleanResult[0].category,
        attributes: cleanResult[0].attributes
      });
    }
    return cleanResult.length > 0 ? cleanResult : null;
  }

  /**
   * Cache individual asset metadata (prevents dummy data caching)
   */
  public cacheAssetMetadata(tokenId: string, metadata: any, processedImageUrl: string, metadataURI: string): void {
    // Don't cache dummy or null metadata
    if (!metadata || isDummyData({ metadata, name: metadata?.name })) {
      console.log(`⚠️ Skipping cache for token ${tokenId} - dummy or null metadata detected`);
      
      // Instead, store a failed fetch marker with short expiry
      const failedMarker = createFailedFetchMarker(tokenId, metadataURI);
      const key = `${MARKETPLACE_CACHE_CONFIG.KEYS.ASSET_METADATA}_${tokenId}_failed`;
      this.setCache(key, failedMarker);
      return;
    }

    const assetData: AssetMetadata = {
      tokenId,
      metadata,
      processedImageUrl,
      metadataURI,
      fetchedAt: Date.now()
    };
    const key = `${MARKETPLACE_CACHE_CONFIG.KEYS.ASSET_METADATA}_${tokenId}`;
    this.setCache(key, assetData);
    console.log(`✅ Cached real metadata for token ${tokenId}: ${metadata?.name || 'Unknown name'}`);
  }

  /**
   * Get cached asset metadata (handles failed fetch markers)
   */
  public getCachedAssetMetadata(tokenId: string): AssetMetadata | null {
    const key = `${MARKETPLACE_CACHE_CONFIG.KEYS.ASSET_METADATA}_${tokenId}`;
    const failedKey = `${key}_failed`;
    
    // Check for failed fetch marker first
    const failedMarker = this.getCache<any>(failedKey, MARKETPLACE_CACHE_CONFIG.EXPIRATION.ASSET_METADATA);
    if (failedMarker && isFailedFetchMarker(failedMarker)) {
      if (isFailedFetchMarkerExpired(failedMarker)) {
        // Marker expired, remove it and allow retry
        localStorage.removeItem(failedKey);
        console.log(`🔄 Failed fetch marker expired for token ${tokenId}, allowing retry`);
      } else {
        // Recent failure, skip retry
        console.log(`⏭️ Recent fetch failure for token ${tokenId}, skipping retry`);
        return null;
      }
    }
    
    // Get regular cached metadata
    const cached = this.getCache<AssetMetadata>(
      key,
      MARKETPLACE_CACHE_CONFIG.EXPIRATION.ASSET_METADATA
    );
    
    // Validate cached data isn't dummy
    if (cached && isDummyData({ metadata: cached.metadata, name: cached.metadata?.name })) {
      console.log(`🧹 Removing dummy data from cache for token ${tokenId}`);
      localStorage.removeItem(key);
      return null;
    }
    
    return cached;
  }

  /**
   * Cache processed image URL
   */
  public cacheProcessedImage(originalUrl: string, processedUrl: string): void {
    const imageData: CachedImageData = {
      originalUrl,
      processedUrl,
      fetchedAt: Date.now()
    };
    const key = `${MARKETPLACE_CACHE_CONFIG.KEYS.IPFS_IMAGES}_${this.hashUrl(originalUrl)}`;
    this.setCache(key, imageData);
  }

  /**
   * Get cached processed image URL
   */
  public getCachedProcessedImage(originalUrl: string): string | null {
    const key = `${MARKETPLACE_CACHE_CONFIG.KEYS.IPFS_IMAGES}_${this.hashUrl(originalUrl)}`;
    const cached = this.getCache<CachedImageData>(
      key,
      MARKETPLACE_CACHE_CONFIG.EXPIRATION.IPFS_IMAGES
    );
    return cached?.processedUrl || null;
  }

  /**
   * Cache user's owned assets (for dashboard)
   */
  public cacheUserOwnedAssets(walletAddress: string, assets: any[]): void {
    const key = `${MARKETPLACE_CACHE_CONFIG.KEYS.USER_OWNED_ASSETS}_${walletAddress}`;
    this.setCache(key, assets);
  }

  /**
   * Get cached user's owned assets
   */
  public getCachedUserOwnedAssets(walletAddress: string): any[] | null {
    const key = `${MARKETPLACE_CACHE_CONFIG.KEYS.USER_OWNED_ASSETS}_${walletAddress}`;
    return this.getCache<any[]>(
      key,
      MARKETPLACE_CACHE_CONFIG.EXPIRATION.USER_OWNED_ASSETS
    );
  }

  /**
   * Enhanced metadata fetching with caching
   */
  public async fetchMetadataWithCache(tokenId: string, metadataURI: string): Promise<{ metadata: any; processedImageUrl: string }> {
    // Check cache first
    const cached = this.getCachedAssetMetadata(tokenId);
    if (cached) {
      console.log(`🎯 Using cached metadata for token ${tokenId}`);
      return {
        metadata: cached.metadata,
        processedImageUrl: cached.processedImageUrl
      };
    }

    try {
      console.log(`🔄 Fetching fresh metadata for token ${tokenId} from ${metadataURI}`);
      
      // Fetch metadata using the existing metadata service
      const metadata = await metadataService.fetchMetadataFromIPFS(metadataURI);
      
      // Process image URL (check cache first)
      let processedImageUrl = '';
      if (metadata?.image) {
        const cachedImage = this.getCachedProcessedImage(metadata.image);
        if (cachedImage) {
          processedImageUrl = cachedImage;
          console.log(`🎯 Using cached image for ${metadata.image}`);
        } else {
          // Process image and cache it
          const { processImageURL } = await import('../utils/pinataImageFetcher');
          processedImageUrl = processImageURL(metadata.image, metadata);
          this.cacheProcessedImage(metadata.image, processedImageUrl);
          console.log(`✅ Processed and cached image: ${metadata.image} → ${processedImageUrl}`);
        }
      }

      // Cache the metadata
      this.cacheAssetMetadata(tokenId, metadata, processedImageUrl, metadataURI);
      
      return {
        metadata,
        processedImageUrl
      };
    } catch (error) {
      console.error(`❌ Failed to fetch metadata for token ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Batch fetch metadata with caching for multiple assets
   */
  public async batchFetchMetadataWithCache(
    assets: Array<{ tokenId: string; metadataURI: string }>
  ): Promise<Map<string, { metadata: any; processedImageUrl: string }>> {
    const results = new Map();
    const uncachedAssets = [];

    // First pass: check cache for all assets
    for (const asset of assets) {
      const cached = this.getCachedAssetMetadata(asset.tokenId);
      if (cached) {
        results.set(asset.tokenId, {
          metadata: cached.metadata,
          processedImageUrl: cached.processedImageUrl
        });
        console.log(`🎯 Cache hit for token ${asset.tokenId}`);
      } else {
        uncachedAssets.push(asset);
      }
    }

    console.log(`📊 Cache stats: ${results.size} hits, ${uncachedAssets.length} misses`);

    // Second pass: fetch uncached assets in parallel (with limit)
    if (uncachedAssets.length > 0) {
      console.log(`🔄 Fetching ${uncachedAssets.length} uncached metadata entries...`);
      
      // Process in batches of 5 to avoid overwhelming IPFS gateways
      const batchSize = 5;
      for (let i = 0; i < uncachedAssets.length; i += batchSize) {
        const batch = uncachedAssets.slice(i, i + batchSize);
        
        const promises = batch.map(async (asset) => {
          try {
            const result = await this.fetchMetadataWithCache(asset.tokenId, asset.metadataURI);
            results.set(asset.tokenId, result);
          } catch (error) {
            console.warn(`⚠️ Failed to fetch metadata for token ${asset.tokenId}:`, error);
            // Store empty result to avoid refetching in this session
            results.set(asset.tokenId, {
              metadata: null,
              processedImageUrl: ''
            });
          }
        });

        await Promise.all(promises);
        
        // Add delay between batches to be respectful to IPFS gateways
        if (i + batchSize < uncachedAssets.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    return results;
  }

  /**
   * Simple hash function for URLs
   */
  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache statistics for debugging
   */
  public getCacheStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    Object.entries(MARKETPLACE_CACHE_CONFIG.KEYS).forEach(([name, keyPrefix]) => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(keyPrefix)) {
          keys.push(key);
        }
      }
      
      stats[name] = {
        count: keys.length,
        keys: keys.slice(0, 5), // Show first 5 keys
        totalSize: keys.reduce((size, key) => {
          const item = localStorage.getItem(key);
          return size + (item ? item.length : 0);
        }, 0)
      };
    });
    
    return stats;
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    let cleared = 0;
    const now = Date.now();
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Check if it's one of our cache keys
      const isOurKey = Object.values(MARKETPLACE_CACHE_CONFIG.KEYS).some(prefix => 
        key.startsWith(prefix)
      );
      
      if (isOurKey) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheEntry = JSON.parse(cached);
            const age = now - cacheEntry.timestamp;
            
            // Find appropriate expiration time
            let expirationTime = MARKETPLACE_CACHE_CONFIG.EXPIRATION.ASSET_METADATA; // default
            if (key.includes('marketplace_listings')) {
              expirationTime = MARKETPLACE_CACHE_CONFIG.EXPIRATION.MARKETPLACE_LISTINGS;
            } else if (key.includes('ipfs_images')) {
              expirationTime = MARKETPLACE_CACHE_CONFIG.EXPIRATION.IPFS_IMAGES;
            } else if (key.includes('user_owned_assets')) {
              expirationTime = MARKETPLACE_CACHE_CONFIG.EXPIRATION.USER_OWNED_ASSETS;
            }
            
            if (age > expirationTime) {
              localStorage.removeItem(key);
              cleared++;
            }
          }
        } catch (error) {
          // Remove invalid cache entries
          localStorage.removeItem(key);
          cleared++;
        }
      }
    }
    
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} expired cache entries`);
    }
  }
}

// Export singleton instance
export const marketplaceCache = MarketplaceCache.getInstance();