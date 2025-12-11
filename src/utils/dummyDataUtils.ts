/**
 * Utility functions to identify and handle dummy/fallback data
 */

export interface TokenData {
  name?: string;
  description?: string;
  image?: string;
  metadata?: any;
  assetType?: string;
  [key: string]: any;
}

/**
 * Check if data appears to be dummy/fallback data that shouldn't be cached
 */
export function isDummyData(data: TokenData | null): boolean {
  if (!data) return false;

  // Check for dummy name patterns
  if (data.name) {
    const dummyNamePatterns = [
      /^Asset Token #\d+$/,      // "Asset Token #1"
      /^Asset #\d+$/,            // "Asset #1"
      /^Token #\d+$/,            // "Token #1"
      /^NFT #\d+$/,              // "NFT #1"
      /^Unknown Asset/,          // "Unknown Asset"
      /^Default Token/,          // "Default Token"
    ];

    if (dummyNamePatterns.some(pattern => pattern.test(data.name))) {
      return true;
    }
  }

  // Check for dummy descriptions
  if (data.description) {
    const dummyDescPatterns = [
      /^Asset token #\d+$/,      // "Asset token #1"
      /^Token #\d+ description$/,
      /^Default description/,
      /^Placeholder description/,
    ];

    if (dummyDescPatterns.some(pattern => pattern.test(data.description))) {
      return true;
    }
  }

  // Check for dummy asset types
  if (data.assetType === 'Unknown' && (!data.metadata || Object.keys(data.metadata).length === 0)) {
    return true;
  }

  // Check if metadata is clearly fallback/empty
  if (data.metadata) {
    const hasRealContent = data.metadata.name && 
                          !data.metadata.name.match(/^(Asset|Token) #?\d+$/) &&
                          data.metadata.name.trim().length > 0;
    
    if (!hasRealContent) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a marketplace listing contains dummy data
 */
export function isMarketplaceListingDummy(listing: any): boolean {
  if (!listing) return false;

  return isDummyData({
    name: listing.name,
    description: listing.description,
    metadata: listing.metadata,
    assetType: listing.type || listing.assetType
  });
}

/**
 * Create a cache key that indicates this is a failed fetch
 */
export function createFailedFetchMarker(tokenId: string, metadataURI: string): any {
  return {
    _isDummyData: true,
    _failedFetch: true,
    _tokenId: tokenId,
    _metadataURI: metadataURI,
    _timestamp: Date.now(),
    _expiry: Date.now() + (5 * 60 * 1000) // 5 minutes
  };
}

/**
 * Check if cached data is a failed fetch marker
 */
export function isFailedFetchMarker(data: any): boolean {
  return data && data._isDummyData === true && data._failedFetch === true;
}

/**
 * Check if failed fetch marker has expired
 */
export function isFailedFetchMarkerExpired(data: any): boolean {
  if (!isFailedFetchMarker(data)) return false;
  return Date.now() > data._expiry;
}

/**
 * Clean dummy data from marketplace listings
 */
export function cleanDummyDataFromListings(listings: any[]): any[] {
  return listings.filter(listing => !isMarketplaceListingDummy(listing));
}

/**
 * Clear all dummy data from localStorage
 */
export function clearDummyDataFromCache(): number {
  let clearedCount = 0;
  const keysToRemove: string[] = [];

  // Check all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    try {
      const item = localStorage.getItem(key);
      if (!item) continue;

      const data = JSON.parse(item);
      
      // Check if this is marketplace cache data
      if (data && data.data && Array.isArray(data.data)) {
        // This looks like marketplace listings
        const cleanListings = data.data.filter((listing: any) => !isMarketplaceListingDummy(listing));
        
        if (cleanListings.length !== data.data.length) {
          console.log(`🧹 Found ${data.data.length - cleanListings.length} dummy listings in ${key}`);
          
          if (cleanListings.length === 0) {
            // All listings were dummy - remove the entire cache entry
            keysToRemove.push(key);
          } else {
            // Some real listings remain - update the cache
            data.data = cleanListings;
            localStorage.setItem(key, JSON.stringify(data));
          }
          clearedCount += (data.data.length - cleanListings.length);
        }
      } else if (data && data.metadata && isDummyData(data)) {
        // This looks like individual asset metadata
        keysToRemove.push(key);
        clearedCount++;
      } else if (isFailedFetchMarker(data)) {
        // This is a failed fetch marker
        if (isFailedFetchMarkerExpired(data)) {
          keysToRemove.push(key);
          clearedCount++;
        }
      }
    } catch (error) {
      // Skip invalid JSON
      continue;
    }
  }

  // Remove identified keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ Removed dummy data cache key: ${key}`);
  });

  return clearedCount;
}

/**
 * Get dummy data statistics
 */
export function getDummyDataStats(): {
  totalCacheEntries: number;
  dummyDataEntries: number;
  failedFetchMarkers: number;
  expiredFailedFetches: number;
} {
  let totalCacheEntries = 0;
  let dummyDataEntries = 0;
  let failedFetchMarkers = 0;
  let expiredFailedFetches = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    try {
      const item = localStorage.getItem(key);
      if (!item) continue;

      totalCacheEntries++;
      const data = JSON.parse(item);
      
      if (data && data.data && Array.isArray(data.data)) {
        // Marketplace listings
        const dummyCount = data.data.filter((listing: any) => isMarketplaceListingDummy(listing)).length;
        dummyDataEntries += dummyCount;
      } else if (data && data.metadata && isDummyData(data)) {
        dummyDataEntries++;
      } else if (isFailedFetchMarker(data)) {
        failedFetchMarkers++;
        if (isFailedFetchMarkerExpired(data)) {
          expiredFailedFetches++;
        }
      }
    } catch (error) {
      // Skip invalid JSON
      continue;
    }
  }

  return {
    totalCacheEntries,
    dummyDataEntries,
    failedFetchMarkers,
    expiredFailedFetches
  };
}

// Make utilities available globally for debugging
(window as any).DummyDataUtils = {
  isDummyData,
  isMarketplaceListingDummy,
  clearDummyDataFromCache,
  getDummyDataStats,
  cleanDummyDataFromListings
};

export default {
  isDummyData,
  isMarketplaceListingDummy,
  createFailedFetchMarker,
  isFailedFetchMarker,
  isFailedFetchMarkerExpired,
  cleanDummyDataFromListings,
  clearDummyDataFromCache,
  getDummyDataStats
};