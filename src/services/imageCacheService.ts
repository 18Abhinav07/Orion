/**
 * Image Cache Service
 * 
 * Provides intelligent image caching with IPFS prioritization and local fallbacks.
 * 
 * Features:
 * - Attempts IPFS images first
 * - Falls back to deterministic local assets
 * - Caches successful images for fast delivery
 * - Persists cache across page reloads
 * - Automatic cache cleanup and expiry
 */

import { getDeterministicAssetImage } from '../utils/assetFallbackImages';

// Cache configuration
const CACHE_PREFIX = 'image_cache_';
const CACHE_EXPIRY_HOURS = 24; // 24 hours
const MAX_CACHE_SIZE = 100; // Maximum number of cached images
const CACHE_VERSION = '1.0'; // For cache invalidation on updates

// Image cache entry interface
interface CachedImageEntry {
  url: string;
  timestamp: number;
  source: 'ipfs' | 'local' | 'external';
  assetType?: string;
  tokenId?: string;
  version: string;
}

// Image cache storage interface
interface ImageCacheStorage {
  [key: string]: CachedImageEntry;
}

class ImageCacheService {
  private cache: Map<string, CachedImageEntry> = new Map();
  private loadingPromises: Map<string, Promise<string>> = new Map();

  constructor() {
    this.loadCacheFromStorage();
    this.cleanupExpiredEntries();
  }

  /**
   * Get cached image URL or load and cache new image
   */
  async getCachedImage(
    originalUrl: string,
    assetType: string = 'Real Estate',
    tokenId: string = '1',
    forceRefresh: boolean = false
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(originalUrl, assetType, tokenId);
    
    // Return cached image if available and not forcing refresh
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      
      // Check if cache entry is still valid
      if (this.isCacheEntryValid(cached)) {
        console.log(`🎯 Using cached image for ${cacheKey}:`, cached.url);
        return cached.url;
      } else {
        // Remove expired entry
        this.cache.delete(cacheKey);
        this.removeCacheFromStorage(cacheKey);
      }
    }

    // Check if already loading this image
    if (this.loadingPromises.has(cacheKey)) {
      console.log(`⏳ Image already loading for ${cacheKey}, waiting...`);
      return this.loadingPromises.get(cacheKey)!;
    }

    // Load and cache new image
    const loadingPromise = this.loadAndCacheImage(originalUrl, assetType, tokenId, cacheKey);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const finalUrl = await loadingPromise;
      this.loadingPromises.delete(cacheKey);
      return finalUrl;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Load image with IPFS priority and local fallback, then cache result
   */
  private async loadAndCacheImage(
    originalUrl: string,
    assetType: string,
    tokenId: string,
    cacheKey: string
  ): Promise<string> {
    console.log(`🔄 Loading and caching image for ${cacheKey}...`);

    // Strategy 1: Try IPFS image first if it's an IPFS URL
    if (this.isIPFSUrl(originalUrl)) {
      console.log(`🌐 Attempting IPFS image: ${originalUrl}`);
      
      const ipfsUrls = this.getIPFSGateways(originalUrl);
      
      for (const ipfsUrl of ipfsUrls) {
        try {
          const success = await this.testImageUrl(ipfsUrl);
          if (success) {
            console.log(`✅ IPFS image loaded successfully: ${ipfsUrl}`);
            
            // Cache successful IPFS image
            this.cacheImage(cacheKey, ipfsUrl, 'ipfs', assetType, tokenId);
            return ipfsUrl;
          }
        } catch (error) {
          console.log(`❌ IPFS gateway failed: ${ipfsUrl}`);
          continue;
        }
      }
      
      console.log(`⚠️ All IPFS gateways failed for: ${originalUrl}`);
    }

    // Strategy 2: Try original URL if it's not IPFS
    if (!this.isIPFSUrl(originalUrl) && originalUrl && !originalUrl.includes('placeholder')) {
      console.log(`🌐 Attempting original URL: ${originalUrl}`);
      
      try {
        const success = await this.testImageUrl(originalUrl);
        if (success) {
          console.log(`✅ Original image loaded successfully: ${originalUrl}`);
          
          // Cache successful external image
          this.cacheImage(cacheKey, originalUrl, 'external', assetType, tokenId);
          return originalUrl;
        }
      } catch (error) {
        console.log(`❌ Original URL failed: ${originalUrl}`);
      }
    }

    // Strategy 3: Fall back to deterministic local asset
    console.log(`🎨 Using deterministic local asset for ${assetType} token ${tokenId}`);
    const localAssetUrl = getDeterministicAssetImage(assetType, tokenId);
    
    // Cache the local asset
    this.cacheImage(cacheKey, localAssetUrl, 'local', assetType, tokenId);
    console.log(`✅ Cached local asset: ${localAssetUrl}`);
    
    return localAssetUrl;
  }

  /**
   * Test if an image URL loads successfully
   */
  private testImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      
      const timeoutId = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(false);
      }, 5000); // 5 second timeout

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };

      img.src = url;
    });
  }

  /**
   * Cache an image entry
   */
  private cacheImage(
    cacheKey: string,
    url: string,
    source: 'ipfs' | 'local' | 'external',
    assetType: string,
    tokenId: string
  ): void {
    const entry: CachedImageEntry = {
      url,
      timestamp: Date.now(),
      source,
      assetType,
      tokenId,
      version: CACHE_VERSION
    };

    this.cache.set(cacheKey, entry);
    this.saveCacheToStorage(cacheKey, entry);
    
    // Cleanup if cache is getting too large
    if (this.cache.size > MAX_CACHE_SIZE) {
      this.cleanupOldestEntries();
    }

    console.log(`💾 Cached image: ${cacheKey} → ${url} (${source})`);
  }

  /**
   * Generate cache key for image
   */
  private generateCacheKey(originalUrl: string, assetType: string, tokenId: string): string {
    // Create a unique key based on original URL, asset type, and token ID
    const urlHash = this.simpleHash(originalUrl || 'empty');
    return `${assetType}_${tokenId}_${urlHash}`;
  }

  /**
   * Simple hash function for URLs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if URL is an IPFS URL
   */
  private isIPFSUrl(url: string): boolean {
    return url.startsWith('ipfs://') || 
           url.includes('/ipfs/') || 
           url.match(/^Qm[a-zA-Z0-9]{44}$/) !== null;
  }

  /**
   * Get multiple IPFS gateway URLs
   */
  private getIPFSGateways(ipfsUrl: string): string[] {
    let ipfsHash = '';
    
    if (ipfsUrl.startsWith('ipfs://')) {
      ipfsHash = ipfsUrl.replace('ipfs://', '');
    } else if (ipfsUrl.includes('/ipfs/')) {
      const parts = ipfsUrl.split('/ipfs/');
      ipfsHash = parts[parts.length - 1];
    } else if (ipfsUrl.match(/^Qm[a-zA-Z0-9]{44}$/)) {
      ipfsHash = ipfsUrl;
    }
    
    if (ipfsHash) {
      return [
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
        `https://dweb.link/ipfs/${ipfsHash}`,
        `https://gateway.ipfs.io/ipfs/${ipfsHash}`
      ];
    }
    
    return [ipfsUrl];
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheEntryValid(entry: CachedImageEntry): boolean {
    const now = Date.now();
    const expiryTime = entry.timestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
    const isExpired = now > expiryTime;
    const isValidVersion = entry.version === CACHE_VERSION;
    
    return !isExpired && isValidVersion;
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));
      
      for (const key of keys) {
        const data = localStorage.getItem(key);
        if (data) {
          const entry: CachedImageEntry = JSON.parse(data);
          const cacheKey = key.replace(CACHE_PREFIX, '');
          
          if (this.isCacheEntryValid(entry)) {
            this.cache.set(cacheKey, entry);
          } else {
            // Remove expired entry from storage
            localStorage.removeItem(key);
          }
        }
      }
      
      console.log(`📦 Loaded ${this.cache.size} images from cache storage`);
    } catch (error) {
      console.error('❌ Error loading image cache from storage:', error);
    }
  }

  /**
   * Save single cache entry to localStorage
   */
  private saveCacheToStorage(cacheKey: string, entry: CachedImageEntry): void {
    try {
      localStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.error('❌ Error saving image cache to storage:', error);
      // If storage is full, cleanup and try again
      this.cleanupOldestEntries();
      try {
        localStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(entry));
      } catch (retryError) {
        console.error('❌ Error saving image cache after cleanup:', retryError);
      }
    }
  }

  /**
   * Remove cache entry from localStorage
   */
  private removeCacheFromStorage(cacheKey: string): void {
    try {
      localStorage.removeItem(CACHE_PREFIX + cacheKey);
    } catch (error) {
      console.error('❌ Error removing image cache from storage:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isCacheEntryValid(entry)) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      this.cache.delete(key);
      this.removeCacheFromStorage(key);
    }
    
    if (keysToRemove.length > 0) {
      console.log(`🗑️ Cleaned up ${keysToRemove.length} expired image cache entries`);
    }
  }

  /**
   * Clean up oldest cache entries when cache is full
   */
  private cleanupOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, Math.ceil(MAX_CACHE_SIZE * 0.2)); // Remove oldest 20%
    
    for (const [key] of toRemove) {
      this.cache.delete(key);
      this.removeCacheFromStorage(key);
    }
    
    console.log(`🗑️ Cleaned up ${toRemove.length} oldest image cache entries`);
  }

  /**
   * Clear all cached images (for debugging)
   */
  clearAllCache(): void {
    this.cache.clear();
    
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      console.log('🗑️ Cleared all image cache');
    } catch (error) {
      console.error('❌ Error clearing image cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    ipfsEntries: number;
    localEntries: number;
    externalEntries: number;
    cacheSize: string;
  } {
    const ipfsEntries = Array.from(this.cache.values()).filter(e => e.source === 'ipfs').length;
    const localEntries = Array.from(this.cache.values()).filter(e => e.source === 'local').length;
    const externalEntries = Array.from(this.cache.values()).filter(e => e.source === 'external').length;
    
    return {
      totalEntries: this.cache.size,
      ipfsEntries,
      localEntries,
      externalEntries,
      cacheSize: `${Math.round(this.cache.size * 0.5)}KB` // Rough estimate
    };
  }

  /**
   * Preload images for faster future access
   */
  async preloadImages(imageRequests: Array<{
    url: string;
    assetType: string;
    tokenId: string;
  }>): Promise<void> {
    console.log(`🚀 Preloading ${imageRequests.length} images...`);
    
    const preloadPromises = imageRequests.map(async ({ url, assetType, tokenId }) => {
      try {
        await this.getCachedImage(url, assetType, tokenId);
        return true;
      } catch (error) {
        console.error(`❌ Failed to preload image for token ${tokenId}:`, error);
        return false;
      }
    });

    const results = await Promise.allSettled(preloadPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ Preloaded ${successful}/${imageRequests.length} images`);
  }
}

// Export singleton instance
export const imageCacheService = new ImageCacheService();

// Export for debugging
(window as any).imageCacheService = imageCacheService;