/**
 * Cache Cleanup and Repair Script
 * This script fixes dummy data caching issues and provides comprehensive cache management
 */

import { marketplaceCache } from './marketplaceCache';
import { dashboardCache } from './dashboardCache';
import { clearDummyDataFromCache, getDummyDataStats } from './dummyDataUtils';

export class CacheCleanupScript {
  
  /**
   * Run comprehensive cache cleanup
   */
  static async runFullCleanup(): Promise<void> {
    console.log('🧹 Starting comprehensive cache cleanup...\n');

    // Step 1: Get initial statistics
    console.log('📊 Initial Cache Analysis:');
    const initialStats = getDummyDataStats();
    console.log(`  Total cache entries: ${initialStats.totalCacheEntries}`);
    console.log(`  Dummy data entries: ${initialStats.dummyDataEntries}`);
    console.log(`  Failed fetch markers: ${initialStats.failedFetchMarkers}`);
    console.log(`  Expired failed fetches: ${initialStats.expiredFailedFetches}\n`);

    // Step 2: Clear metadata service cache
    console.log('🔧 Clearing metadata service cache...');
    if ((window as any).metadataService) {
      (window as any).metadataService.clearCache();
    }

    // Step 3: Clear marketplace cache dummy data
    console.log('🧹 Clearing marketplace dummy data...');
    const marketplaceClearedCount = marketplaceCache.clearDummyDataFromCache();

    // Step 4: Clear dashboard cache dummy data
    console.log('🧹 Clearing dashboard dummy data...');
    const dashboardClearedCount = dashboardCache.clearDummyDataFromCache();

    // Step 5: Clear general dummy data from localStorage
    console.log('🧹 Clearing general dummy data...');
    const generalClearedCount = clearDummyDataFromCache();

    // Step 6: Clear expired cache entries
    console.log('🧹 Clearing expired cache entries...');
    marketplaceCache.clearExpiredCache();

    // Step 6: Get final statistics
    console.log('\n📊 Final Cache Analysis:');
    const finalStats = getDummyDataStats();
    console.log(`  Total cache entries: ${finalStats.totalCacheEntries}`);
    console.log(`  Dummy data entries: ${finalStats.dummyDataEntries}`);
    console.log(`  Failed fetch markers: ${finalStats.failedFetchMarkers}`);
    console.log(`  Expired failed fetches: ${finalStats.expiredFailedFetches}`);

    const totalClearedCount = marketplaceClearedCount + dashboardClearedCount + generalClearedCount;
    console.log(`\n✅ Cleanup completed! Removed ${totalClearedCount} dummy data entries.`);
    
    if (totalClearedCount > 0) {
      console.log('\n💡 Recommendations:');
      console.log('1. Refresh the page to see clean data');
      console.log('2. Check marketplace, dashboard, and orderbook for proper metadata');
      console.log('3. Monitor console for IPFS gateway performance');
      console.log('4. Use window.IPFSTestScript.runCompleteTest() to test IPFS connectivity');
    }
  }

  /**
   * Quick cleanup for immediate use
   */
  static async quickCleanup(): Promise<void> {
    console.log('⚡ Running quick cache cleanup...');
    
    // Clear all caches
    marketplaceCache.clearCache();
    dashboardCache.clearCache();
    if ((window as any).metadataService) {
      (window as any).metadataService.clearCache();
    }
    
    // Clear dummy data
    const clearedCount = clearDummyDataFromCache() + 
                        marketplaceCache.clearDummyDataFromCache() + 
                        dashboardCache.clearDummyDataFromCache();
    
    console.log(`✅ Quick cleanup done! Cleared ${clearedCount} dummy entries.`);
    console.log('💡 Refresh the page to see fresh data.');
  }

  /**
   * Analyze current cache state without making changes
   */
  static analyzeCacheState(): void {
    console.log('🔍 Analyzing current cache state...\n');

    // Dummy data analysis
    const stats = getDummyDataStats();
    console.log('📊 Dummy Data Analysis:');
    console.log(`  Total cache entries: ${stats.totalCacheEntries}`);
    console.log(`  Dummy data entries: ${stats.dummyDataEntries}`);
    console.log(`  Failed fetch markers: ${stats.failedFetchMarkers}`);
    console.log(`  Expired failed fetches: ${stats.expiredFailedFetches}`);

    // Marketplace cache analysis
    console.log('\n📈 Marketplace Cache Analysis:');
    const marketplaceStats = marketplaceCache.getCacheStats();
    Object.entries(marketplaceStats).forEach(([name, data]: [string, any]) => {
      console.log(`  ${name}: ${data.count} entries (${Math.round(data.totalSize / 1024)}KB)`);
    });

    // Metadata service cache analysis
    console.log('\n🔬 Metadata Service Cache:');
    if ((window as any).metadataService && (window as any).metadataService.cache) {
      const metadataCache = (window as any).metadataService.cache;
      console.log(`  Size: ${metadataCache.size} entries`);
      
      let successCount = 0;
      let failedCount = 0;
      
      for (const [key, value] of metadataCache.entries()) {
        if (value && value.error) {
          failedCount++;
        } else if (value) {
          successCount++;
        }
      }
      
      console.log(`  Successful: ${successCount}`);
      console.log(`  Failed: ${failedCount}`);
    } else {
      console.log('  Metadata service cache not available');
    }

    // Recommendations
    if (stats.dummyDataEntries > 0) {
      console.log('\n⚠️ Issues Found:');
      console.log(`  ${stats.dummyDataEntries} dummy data entries detected`);
      console.log('  Run window.CacheCleanupScript.runFullCleanup() to fix');
    } else {
      console.log('\n✅ Cache appears clean!');
    }
  }

  /**
   * Test metadata fetching after cleanup
   */
  static async testAfterCleanup(): Promise<void> {
    console.log('🧪 Testing metadata fetching after cleanup...\n');

    // Test common scenarios
    const testCases = [
      {
        name: 'Empty URI',
        uri: ''
      },
      {
        name: 'Test Hash',
        uri: 'ipfs://TestHash123'
      },
      {
        name: 'Valid IPFS Format',
        uri: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
      }
    ];

    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.name}`);
      try {
        const result = await (window as any).metadataService.fetchMetadataFromIPFS(testCase.uri);
        if (result) {
          console.log(`  ✅ Success: ${result.name || 'No name'}`);
        } else {
          console.log(`  ❌ Failed: null result`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n💡 Use window.IPFSTestScript.runCompleteTest() for comprehensive testing');
  }

  /**
   * Monitor cache in real-time
   */
  static startCacheMonitoring(): void {
    console.log('📺 Starting cache monitoring...');
    console.log('Monitor will log cache operations as they happen.');
    console.log('Use window.CacheCleanupScript.stopCacheMonitoring() to stop.\n');

    // Override localStorage setItem to monitor caching
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
      try {
        const data = JSON.parse(value);
        if (key.includes('marketplace') || key.includes('asset_metadata')) {
          console.log(`📝 CACHE SET: ${key}`, {
            dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
            itemCount: Array.isArray(data.data) ? data.data.length : 1,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } catch (e) {
        // Not JSON, ignore
      }
      
      return originalSetItem.call(this, key, value);
    };

    // Store original function for restoration
    (window as any)._originalSetItem = originalSetItem;
  }

  /**
   * Stop cache monitoring
   */
  static stopCacheMonitoring(): void {
    if ((window as any)._originalSetItem) {
      localStorage.setItem = (window as any)._originalSetItem;
      delete (window as any)._originalSetItem;
      console.log('📺 Cache monitoring stopped.');
    }
  }
}

// Make cache cleanup available globally
(window as any).CacheCleanupScript = CacheCleanupScript;

export default CacheCleanupScript;