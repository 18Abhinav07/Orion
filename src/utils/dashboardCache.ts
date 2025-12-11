import { UserAsset, PortfolioData, TransactionHistory, TradingNotification, CacheEntry } from '../types/dashboardTypes';
import { isDummyData, isMarketplaceListingDummy, createFailedFetchMarker, isFailedFetchMarker, isFailedFetchMarkerExpired } from './dummyDataUtils';

// Cache configuration
export const CACHE_CONFIG = {
  // Cache keys
  KEYS: {
    USER_ASSETS: 'dashboard_user_assets',
    PORTFOLIO_DATA: 'dashboard_portfolio_data',
    TRANSACTION_HISTORY: 'dashboard_transactions',
    NOTIFICATIONS: 'dashboard_notifications',
    LAST_REFRESH: 'dashboard_last_refresh',
  },
  
  // Expiration times in milliseconds
  EXPIRATION: {
    USER_ASSETS: 5 * 60 * 1000, // 5 minutes
    PORTFOLIO_DATA: 5 * 60 * 1000, // 5 minutes
    TRANSACTION_HISTORY: 10 * 60 * 1000, // 10 minutes
    NOTIFICATIONS: 2 * 60 * 1000, // 2 minutes
  }
};

export class DashboardCache {
  private static instance: DashboardCache;
  
  public static getInstance(): DashboardCache {
    if (!DashboardCache.instance) {
      DashboardCache.instance = new DashboardCache();
    }
    return DashboardCache.instance;
  }

  private constructor() {}

  /**
   * Store data in cache with timestamp and wallet address
   */
  private setCache<T>(key: string, data: T, walletAddress: string): void {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        walletAddress
      };
      localStorage.setItem(key, JSON.stringify(cacheEntry));
      console.log(`✅ Cached data for key: ${key}, wallet: ${walletAddress}`);
    } catch (error) {
      console.warn(`⚠️ Failed to cache data for key: ${key}`, error);
    }
  }

  /**
   * Get data from cache if valid and for the correct wallet
   */
  private getCache<T>(key: string, walletAddress: string, expirationTime: number): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) {
        console.log(`📭 No cached data found for key: ${key}`);
        return null;
      }

      const cacheEntry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if cache is for the same wallet
      if (cacheEntry.walletAddress !== walletAddress) {
        console.log(`🔄 Cache invalidated - different wallet (cached: ${cacheEntry.walletAddress}, current: ${walletAddress})`);
        localStorage.removeItem(key);
        return null;
      }

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
   * Clear all cache for a specific wallet or all wallets
   */
  public clearCache(walletAddress?: string): void {
    try {
      Object.values(CACHE_CONFIG.KEYS).forEach(key => {
        if (walletAddress) {
          // Only clear if it's for the specific wallet
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheEntry = JSON.parse(cached);
            if (cacheEntry.walletAddress === walletAddress) {
              localStorage.removeItem(key);
              console.log(`🗑️ Cleared cache for key: ${key}, wallet: ${walletAddress}`);
            }
          }
        } else {
          // Clear all cache
          localStorage.removeItem(key);
          console.log(`🗑️ Cleared all cache for key: ${key}`);
        }
      });
    } catch (error) {
      console.warn('⚠️ Failed to clear cache', error);
    }
  }

  /**
   * Cache user assets (filters out dummy data)
   */
  public cacheUserAssets(assets: UserAsset[], walletAddress: string): void {
    // Filter out dummy data before caching
    const realAssets = assets.filter(asset => {
      // Check if this asset has dummy data characteristics
      const isDummy = isDummyData({
        name: asset.name,
        metadata: asset.metadata,
        assetType: asset.type
      });

      // Also check for specific "Unknown Asset" patterns
      const hasUnknownAssetName = asset.name && (
        asset.name.includes('Unknown Asset') ||
        asset.name.match(/Unknown Asset #\d+/) ||
        (asset.type === 'Unknown' && asset.name.includes('Asset #'))
      );

      return !isDummy && !hasUnknownAssetName;
    });

    console.log(`🧹 Filtered dashboard user assets: ${assets.length} → ${realAssets.length} (removed ${assets.length - realAssets.length} dummy entries)`);
    
    if (realAssets.length > 0) {
      this.setCache(CACHE_CONFIG.KEYS.USER_ASSETS, realAssets, walletAddress);
    } else {
      console.warn('⚠️ All user assets were dummy data - not caching');
    }
  }

  /**
   * Get cached user assets (cleans dummy data)
   */
  public getCachedUserAssets(walletAddress: string): UserAsset[] | null {
    const result = this.getCache<UserAsset[]>(
      CACHE_CONFIG.KEYS.USER_ASSETS, 
      walletAddress, 
      CACHE_CONFIG.EXPIRATION.USER_ASSETS
    );

    if (!result) {
      console.log('📭 No cached user assets found');
      return null;
    }

    // Filter out any dummy data that might have been cached previously
    const cleanResult = result.filter(asset => {
      const isDummy = isDummyData({
        name: asset.name,
        metadata: asset.metadata,
        assetType: asset.type
      });

      const hasUnknownAssetName = asset.name && (
        asset.name.includes('Unknown Asset') ||
        asset.name.match(/Unknown Asset #\d+/) ||
        (asset.type === 'Unknown' && asset.name.includes('Asset #'))
      );

      return !isDummy && !hasUnknownAssetName;
    });

    if (cleanResult.length !== result.length) {
      console.log(`🧹 Cleaned dashboard cache: ${result.length} → ${cleanResult.length} (removed ${result.length - cleanResult.length} dummy entries)`);
      
      // Update cache with clean data
      if (cleanResult.length > 0) {
        this.cacheUserAssets(cleanResult, walletAddress);
      } else {
        // All were dummy, clear the cache
        localStorage.removeItem(CACHE_CONFIG.KEYS.USER_ASSETS);
        return null;
      }
    }

    console.log('📊 Dashboard cache result:', cleanResult ? `${cleanResult.length} clean assets found` : 'No cache found');
    return cleanResult.length > 0 ? cleanResult : null;
  }

  /**
   * Cache portfolio data
   */
  public cachePortfolioData(portfolio: PortfolioData, walletAddress: string): void {
    this.setCache(CACHE_CONFIG.KEYS.PORTFOLIO_DATA, portfolio, walletAddress);
  }

  /**
   * Get cached portfolio data
   */
  public getCachedPortfolioData(walletAddress: string): PortfolioData | null {
    return this.getCache<PortfolioData>(
      CACHE_CONFIG.KEYS.PORTFOLIO_DATA, 
      walletAddress, 
      CACHE_CONFIG.EXPIRATION.PORTFOLIO_DATA
    );
  }

  /**
   * Cache transaction history
   */
  public cacheTransactionHistory(transactions: TransactionHistory[], walletAddress: string): void {
    this.setCache(CACHE_CONFIG.KEYS.TRANSACTION_HISTORY, transactions, walletAddress);
  }

  /**
   * Get cached transaction history
   */
  public getCachedTransactionHistory(walletAddress: string): TransactionHistory[] | null {
    return this.getCache<TransactionHistory[]>(
      CACHE_CONFIG.KEYS.TRANSACTION_HISTORY, 
      walletAddress, 
      CACHE_CONFIG.EXPIRATION.TRANSACTION_HISTORY
    );
  }

  /**
   * Cache notifications
   */
  public cacheNotifications(notifications: TradingNotification[], walletAddress: string): void {
    this.setCache(CACHE_CONFIG.KEYS.NOTIFICATIONS, notifications, walletAddress);
  }

  /**
   * Get cached notifications
   */
  public getCachedNotifications(walletAddress: string): TradingNotification[] | null {
    return this.getCache<TradingNotification[]>(
      CACHE_CONFIG.KEYS.NOTIFICATIONS, 
      walletAddress, 
      CACHE_CONFIG.EXPIRATION.NOTIFICATIONS
    );
  }

  /**
   * Record when data was last refreshed from blockchain
   */
  public recordLastRefresh(walletAddress: string): void {
    this.setCache(CACHE_CONFIG.KEYS.LAST_REFRESH, Date.now(), walletAddress);
  }

  /**
   * Check if we should force refresh (e.g., after certain actions)
   */
  public shouldForceRefresh(walletAddress: string, actionTime?: number): boolean {
    const lastRefresh = this.getCache<number>(
      CACHE_CONFIG.KEYS.LAST_REFRESH, 
      walletAddress, 
      24 * 60 * 60 * 1000 // 24 hours max
    );
    
    if (!lastRefresh) return true;
    
    // If an action time is provided (e.g., after buying/selling), check if refresh is needed
    if (actionTime && actionTime > lastRefresh) {
      console.log('🔄 Force refresh needed - action performed after last refresh');
      return true;
    }
    
    return false;
  }

  /**
   * Get cache statistics for debugging
   */
  public getCacheStats(walletAddress: string): Record<string, any> {
    const stats: Record<string, any> = {};
    
    Object.entries(CACHE_CONFIG.KEYS).forEach(([name, key]) => {
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const cacheEntry = JSON.parse(cached);
          stats[name] = {
            size: cached.length,
            age: Date.now() - cacheEntry.timestamp,
            wallet: cacheEntry.walletAddress,
            isValidWallet: cacheEntry.walletAddress === walletAddress
          };
        } catch (error) {
          stats[name] = { error: 'Invalid cache entry' };
        }
      } else {
        stats[name] = { status: 'not cached' };
      }
    });
    
    return stats;
  }

  /**
   * Clear only dummy data from dashboard cache
   */
  public clearDummyDataFromCache(walletAddress?: string): number {
    console.log('🧹 Clearing dummy data from dashboard cache...');
    
    let clearedCount = 0;

    // Clear dummy user assets
    if (walletAddress) {
      const cachedAssets = this.getCachedUserAssets(walletAddress);
      if (cachedAssets) {
        const originalLength = cachedAssets.length;
        const cleanAssets = cachedAssets.filter(asset => {
          const isDummy = isDummyData({
            name: asset.name,
            metadata: asset.metadata,
            assetType: asset.type
          });

          const hasUnknownAssetName = asset.name && (
            asset.name.includes('Unknown Asset') ||
            asset.name.match(/Unknown Asset #\d+/) ||
            (asset.type === 'Unknown' && asset.name.includes('Asset #'))
          );

          return !isDummy && !hasUnknownAssetName;
        });

        if (cleanAssets.length !== originalLength) {
          const removedCount = originalLength - cleanAssets.length;
          clearedCount += removedCount;
          
          if (cleanAssets.length === 0) {
            localStorage.removeItem(CACHE_CONFIG.KEYS.USER_ASSETS);
            console.log(`🗑️ Removed all dummy dashboard assets for wallet: ${walletAddress}`);
          } else {
            this.cacheUserAssets(cleanAssets, walletAddress);
            console.log(`🧹 Cleaned ${removedCount} dummy assets from dashboard cache for wallet: ${walletAddress}`);
          }
        }
      }
    } else {
      // Clear dummy data for all wallets
      Object.values(CACHE_CONFIG.KEYS).forEach(key => {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const storageKey = localStorage.key(i);
          if (!storageKey || !storageKey.startsWith(key)) continue;

          try {
            const cached = localStorage.getItem(storageKey);
            if (!cached) continue;

            const cacheEntry = JSON.parse(cached);
            if (!cacheEntry.data) continue;

            if (Array.isArray(cacheEntry.data) && key === CACHE_CONFIG.KEYS.USER_ASSETS) {
              // Process user assets
              const originalLength = cacheEntry.data.length;
              cacheEntry.data = cacheEntry.data.filter((asset: any) => {
                const isDummy = isDummyData({
                  name: asset.name,
                  metadata: asset.metadata,
                  assetType: asset.type
                });

                const hasUnknownAssetName = asset.name && (
                  asset.name.includes('Unknown Asset') ||
                  asset.name.match(/Unknown Asset #\d+/) ||
                  (asset.type === 'Unknown' && asset.name.includes('Asset #'))
                );

                return !isDummy && !hasUnknownAssetName;
              });
              
              if (cacheEntry.data.length !== originalLength) {
                const removedCount = originalLength - cacheEntry.data.length;
                clearedCount += removedCount;
                
                if (cacheEntry.data.length === 0) {
                  localStorage.removeItem(storageKey);
                  console.log(`🗑️ Removed empty dashboard cache entry: ${storageKey}`);
                } else {
                  localStorage.setItem(storageKey, JSON.stringify(cacheEntry));
                  console.log(`🧹 Cleaned ${removedCount} dummy entries from: ${storageKey}`);
                }
              }
            }
          } catch (error) {
            console.warn(`⚠️ Error processing dashboard cache key ${storageKey}:`, error);
          }
        }
      });
    }

    console.log(`✅ Cleared ${clearedCount} dummy data entries from dashboard cache`);
    return clearedCount;
  }
}

// Export singleton instance
export const dashboardCache = DashboardCache.getInstance();