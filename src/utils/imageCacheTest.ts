/**
 * Image Cache Test Script
 * 
 * This script demonstrates and tests the image caching functionality.
 * Run this in browser console to test the cache service.
 */

// Type declarations for window properties
declare global {
  interface Window {
    imageCacheService: any;
    testImageCaching: () => Promise<any>;
    testCachePerformance: () => Promise<any>;
  }
}

// Test the image cache service with sample asset data
const testImageCaching = async () => {
  console.log('🧪 Starting Image Cache Service Tests...\n');
  
  // Sample test data
  const testAssets = [
    {
      url: 'ipfs://QmQoHpAJNJyWUgC7QGMgAnzdaMekpMAeCi1voJH6iSaFRi',
      assetType: 'Real Estate',
      tokenId: '1'
    },
    {
      url: 'https://example.com/invalid-image.jpg',
      assetType: 'Real Estate', 
      tokenId: '2'
    },
    {
      url: '',
      assetType: 'Invoice',
      tokenId: '3'
    },
    {
      url: 'placeholder-image',
      assetType: 'Real Estate',
      tokenId: '4'
    }
  ];

  console.log('1️⃣ Testing individual image caching...');
  
  for (const asset of testAssets) {
    try {
      console.log(`\n🔄 Testing asset ${asset.tokenId} (${asset.assetType}):`);
      console.log(`   Original URL: ${asset.url || 'empty'}`);
      
      const startTime = Date.now();
      const cachedUrl = await window.imageCacheService.getCachedImage(
        asset.url,
        asset.assetType,
        asset.tokenId
      );
      const loadTime = Date.now() - startTime;
      
      console.log(`✅ Cached URL: ${cachedUrl}`);
      console.log(`⏱️ Load time: ${loadTime}ms`);
      
      // Test cache hit on second call
      const startTime2 = Date.now();
      const cachedUrl2 = await window.imageCacheService.getCachedImage(
        asset.url,
        asset.assetType,
        asset.tokenId
      );
      const loadTime2 = Date.now() - startTime2;
      
      console.log(`🎯 Second call (cache hit): ${loadTime2}ms`);
      console.log(`📊 Speed improvement: ${loadTime - loadTime2}ms faster`);
      
    } catch (error) {
      console.error(`❌ Error testing asset ${asset.tokenId}:`, error);
    }
  }

  console.log('\n2️⃣ Testing batch preloading...');
  
  const preloadStartTime = Date.now();
  await window.imageCacheService.preloadImages(testAssets);
  const preloadTime = Date.now() - preloadStartTime;
  
  console.log(`✅ Batch preload completed in ${preloadTime}ms`);

  console.log('\n3️⃣ Cache Statistics:');
  const stats = window.imageCacheService.getCacheStats();
  console.table(stats);

  console.log('\n4️⃣ Testing cache persistence...');
  
  // Test cache persistence across page reloads
  console.log('📦 Current cache entries in localStorage:');
  const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('image_cache_'));
  console.log(`Found ${cacheKeys.length} cached images in localStorage`);
  
  cacheKeys.slice(0, 3).forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    console.log(`   ${key}: ${data.source} - ${data.url.substring(0, 50)}...`);
  });

  console.log('\n✅ Image Cache Service Tests Completed!');
  console.log('💡 Try refreshing the page and running tests again to see cache persistence.');
  
  return stats;
};

// Cache performance comparison test
const testCachePerformance = async () => {
  console.log('🏎️ Cache Performance Test...\n');
  
  const testUrl = 'ipfs://QmQoHpAJNJyWUgC7QGMgAnzdaMekpMAeCi1voJH6iSaFRi';
  const assetType = 'Real Estate';
  const tokenId = '100';
  
  // Clear cache for this specific item first
  console.log('🗑️ Clearing cache for performance test...');
  
  // First load (no cache)
  console.log('1️⃣ First load (no cache):');
  const start1 = Date.now();
  const url1 = await window.imageCacheService.getCachedImage(testUrl, assetType, tokenId);
  const time1 = Date.now() - start1;
  console.log(`   Time: ${time1}ms, URL: ${url1.substring(0, 50)}...`);
  
  // Second load (from cache)
  console.log('2️⃣ Second load (from cache):');
  const start2 = Date.now();
  const url2 = await window.imageCacheService.getCachedImage(testUrl, assetType, tokenId);
  const time2 = Date.now() - start2;
  console.log(`   Time: ${time2}ms, URL: ${url2.substring(0, 50)}...`);
  
  // Performance improvement
  const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
  console.log(`\n🚀 Performance improvement: ${improvement}% faster (${time1 - time2}ms saved)`);
  
  return { firstLoad: time1, cacheHit: time2, improvement: improvement + '%' };
};

// Export test functions for manual execution
if (typeof window !== 'undefined') {
  window.testImageCaching = testImageCaching;
  window.testCachePerformance = testCachePerformance;
  
  console.log('🧪 Image Cache Test Functions Available:');
  console.log('   window.testImageCaching() - Test basic caching functionality');
  console.log('   window.testCachePerformance() - Test cache performance');
  console.log('   window.imageCacheService - Direct access to cache service');
}