/**
 * Debug utilities for metadata service monitoring and troubleshooting
 */

interface CacheEntry {
  error?: string;
  expiry?: number;
  timestamp?: number;
  name?: string;
  description?: string;
  image?: string;
}

export class MetadataDebugUtils {
  /**
   * Clear all metadata cache entries
   */
  static clearMetadataCache(): void {
    // Check if metadataService cache exists
    const metadataService = (window as any).metadataService;
    if (metadataService && metadataService.cache) {
      const cacheSize = metadataService.cache.size;
      metadataService.cache.clear();
      console.log(`🧹 Cleared metadata cache (${cacheSize} entries)`);
    } else {
      console.warn('⚠️ Metadata service cache not found');
    }
  }

  /**
   * Clear only failed cache entries
   */
  static clearFailedCacheEntries(): void {
    const metadataService = (window as any).metadataService;
    if (metadataService && metadataService.cache) {
      let clearedCount = 0;
      
      for (const [key, value] of metadataService.cache.entries()) {
        const entry = value as CacheEntry;
        if (entry.error) {
          metadataService.cache.delete(key);
          clearedCount++;
        }
      }
      
      console.log(`🧹 Cleared ${clearedCount} failed cache entries`);
    }
  }

  /**
   * Inspect current cache state
   */
  static inspectCache(): void {
    const metadataService = (window as any).metadataService;
    if (!metadataService || !metadataService.cache) {
      console.warn('⚠️ Metadata service cache not found');
      return;
    }

    const cache = metadataService.cache;
    const totalEntries = cache.size;
    let successfulEntries = 0;
    let failedEntries = 0;
    let expiredFailures = 0;

    console.log('📊 Metadata Cache Inspection:');
    console.log(`Total entries: ${totalEntries}`);

    for (const [key, value] of cache.entries()) {
      const entry = value as CacheEntry;
      
      if (entry.error) {
        failedEntries++;
        if (entry.expiry && Date.now() > entry.expiry) {
          expiredFailures++;
        }
      } else {
        successfulEntries++;
      }
    }

    console.log(`✅ Successful: ${successfulEntries}`);
    console.log(`❌ Failed: ${failedEntries}`);
    console.log(`⏰ Expired failures: ${expiredFailures}`);

    // Log some sample entries
    let count = 0;
    for (const [key, value] of cache.entries()) {
      if (count >= 3) break;
      
      const entry = value as CacheEntry;
      console.log(`\nSample entry ${count + 1}:`);
      console.log(`URI: ${key}`);
      console.log(`Status: ${entry.error ? 'Failed' : 'Success'}`);
      if (entry.error) {
        console.log(`Error: ${entry.error}`);
        console.log(`Expires: ${entry.expiry ? new Date(entry.expiry).toLocaleString() : 'Never'}`);
      } else {
        console.log(`Name: ${entry.name || 'Unknown'}`);
        console.log(`Description: ${entry.description ? entry.description.substring(0, 50) + '...' : 'None'}`);
      }
      count++;
    }
  }

  /**
   * Test metadata fetching for a specific IPFS hash
   */
  static async testIPFSFetch(ipfsHash: string): Promise<void> {
    const gateways = [
      { name: 'Custom Pinata', url: `https://olive-left-snake-740.mypinata.cloud/ipfs/${ipfsHash}` },
      { name: 'Pinata Gateway', url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}` },
      { name: 'IPFS.io', url: `https://ipfs.io/ipfs/${ipfsHash}` },
      { name: 'Dweb Link', url: `https://dweb.link/ipfs/${ipfsHash}` },
      { name: 'Cloudflare', url: `https://cloudflare-ipfs.com/ipfs/${ipfsHash}` }
    ];

    console.log(`🧪 Testing IPFS gateways for hash: ${ipfsHash}`);

    for (const gateway of gateways) {
      try {
        console.log(`Testing ${gateway.name}...`);
        const startTime = Date.now();
        
        const response = await Promise.race([
          fetch(gateway.url),
          new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          )
        ]);

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${gateway.name}: Success (${duration}ms)`);
          console.log(`   Name: ${data.name || 'Unknown'}`);
          console.log(`   Image: ${data.image ? 'Present' : 'Missing'}`);
        } else {
          console.log(`❌ ${gateway.name}: HTTP ${response.status} (${duration}ms)`);
        }
      } catch (error) {
        console.log(`❌ ${gateway.name}: ${error.message}`);
      }
    }
  }

  /**
   * Monitor metadata service calls in real-time
   */
  static enableRealTimeMonitoring(): void {
    // Intercept console.log calls from metadata service
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log('🔍 Metadata monitoring enabled. Watch for metadata service calls...');

    console.log = (...args) => {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('🔄 Fetching metadata') || 
           args[0].includes('✅ Metadata fetched') ||
           args[0].includes('💾 Using cached'))) {
        originalLog('📺 METADATA MONITOR:', ...args);
      } else {
        originalLog(...args);
      }
    };

    console.warn = (...args) => {
      if (args[0] && typeof args[0] === 'string' && 
          args[0].includes('Gateway')) {
        originalWarn('📺 METADATA MONITOR:', ...args);
      } else {
        originalWarn(...args);
      }
    };

    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('IPFS gateways failed') ||
           args[0].includes('metadata fetching'))) {
        originalError('📺 METADATA MONITOR:', ...args);
      } else {
        originalError(...args);
      }
    };
  }
}

// Make utilities available globally for debugging
(window as any).MetadataDebugUtils = MetadataDebugUtils;

export default MetadataDebugUtils;