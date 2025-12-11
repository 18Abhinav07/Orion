# Image Caching System

## Overview

The Image Caching System provides intelligent image loading with IPFS prioritization, local asset fallbacks, and persistent caching for fast image delivery across the application.

## Features

- **IPFS Priority**: Attempts to load IPFS images first through multiple gateways
- **Smart Fallbacks**: Falls back to deterministic local assets if IPFS fails
- **Persistent Cache**: Stores successful images in localStorage for fast future access
- **Automatic Preloading**: Preloads images in background for faster UI
- **Cache Management**: Automatic expiry, cleanup, and size management
- **Performance Optimization**: Dramatic speed improvements for repeated image access

## Architecture

### Components

1. **ImageCacheService** (`src/services/imageCacheService.ts`)
   - Core caching logic
   - IPFS gateway management
   - Cache persistence and cleanup

2. **CachedImage Component** (`src/components/CachedImage.tsx`)
   - React component for cached image rendering
   - Loading states and error handling
   - Development debugging indicators

3. **Test Suite** (`src/utils/imageCacheTest.ts`)
   - Comprehensive testing functions
   - Performance benchmarking
   - Cache validation

### Integration Points

- **Marketplace**: Uses CachedImage for all asset listings and featured carousel
- **Dashboard**: Uses CachedImage for user asset displays and details modals
- **OrderBook**: Uses CachedImage in AssetTokenCard components

## Usage

### Basic Implementation

```tsx
import { CachedImage } from '../components/CachedImage';

<CachedImage
  src={asset.image}
  alt={asset.name}
  className="w-full h-48 object-cover"
  assetType={asset.type || 'Real Estate'}
  tokenId={asset.tokenId}
/>
```

### Advanced Usage with Preloading

```typescript
import { imageCacheService } from '../services/imageCacheService';

// Preload images for faster access
const imageRequests = assets.map(asset => ({
  url: asset.image,
  assetType: asset.type || 'Real Estate',
  tokenId: asset.tokenId
}));

imageCacheService.preloadImages(imageRequests);
```

## Image Loading Strategy

1. **Check Cache**: Look for cached image first
2. **IPFS Attempt**: Try multiple IPFS gateways if original is IPFS
3. **Original URL**: Try original URL if not IPFS
4. **Local Fallback**: Use deterministic local asset as final fallback
5. **Cache Result**: Store successful image for future use

## Cache Configuration

```typescript
const CACHE_EXPIRY_HOURS = 24;     // Cache validity period
const MAX_CACHE_SIZE = 100;        // Maximum cached images
const CACHE_VERSION = '1.0';       // For cache invalidation
```

## IPFS Gateways

The system uses multiple IPFS gateways for reliability:

1. `gateway.pinata.cloud` (Primary)
2. `ipfs.io`
3. `cloudflare-ipfs.com`
4. `dweb.link`
5. `gateway.ipfs.io`

## Local Asset Fallbacks

Local assets are organized by category:

- **Real Estate**: `/assets/realestate/` (4 unique images)
- **Invoice**: `/assets/invoices/` (3 unique images)

Images are selected deterministically based on token ID to ensure consistency.

## Performance Benefits

- **First Load**: Attempts IPFS with fallback to local assets
- **Subsequent Loads**: Instant delivery from cache (>90% speed improvement)
- **Preloading**: Background image loading for seamless UX
- **Persistence**: Cache survives page reloads and navigation

## Testing

### Manual Testing in Browser Console

```javascript
// Test basic functionality
await window.testImageCaching();

// Test performance improvements
await window.testCachePerformance();

// Check cache statistics
window.imageCacheService.getCacheStats();

// Clear cache for testing
window.imageCacheService.clearAllCache();
```

### Performance Metrics

Typical performance improvements:
- **Cache Hit**: 1-5ms (instant)
- **IPFS Load**: 2000-5000ms
- **Local Fallback**: 10-50ms
- **Speed Improvement**: 95%+ for cached images

## Cache Management

### Automatic Cleanup

- Expired entries (>24 hours) are automatically removed
- Cache size is limited to 100 entries
- Oldest entries are removed when limit is exceeded

### Manual Management

```typescript
// Clear all cache
imageCacheService.clearAllCache();

// Get cache statistics
const stats = imageCacheService.getCacheStats();

// Force refresh specific image
imageCacheService.getCachedImage(url, assetType, tokenId, true);
```

## Development Features

- **Debug Indicators**: Shows cache source (🎨 local, 🌐 IPFS, 🔗 external) in development
- **Console Logging**: Detailed logging for cache hits, misses, and performance
- **Test Functions**: Built-in testing and benchmarking tools

## Browser Compatibility

- **localStorage**: Required for cache persistence
- **Image Loading**: Standard browser Image API
- **Promise Support**: Modern async/await support

## Best Practices

1. **Always Specify Asset Type**: Helps with fallback selection
2. **Use Unique Token IDs**: Ensures proper cache keys
3. **Preload Critical Images**: Use preloading for above-the-fold content
4. **Monitor Cache Size**: Check cache stats in development
5. **Test Fallback Paths**: Ensure local assets are properly configured

## Troubleshooting

### Common Issues

1. **Images Not Caching**: Check localStorage availability and quota
2. **Slow Initial Load**: IPFS gateways may be slow, fallbacks will activate
3. **Cache Not Persisting**: Verify localStorage isn't being cleared
4. **Local Assets Not Loading**: Check assets exist in `/assets/` directories

### Debug Commands

```javascript
// Check cache contents
Object.keys(localStorage).filter(k => k.startsWith('image_cache_'))

// View specific cache entry
JSON.parse(localStorage.getItem('image_cache_Real Estate_1_abc123'))

// Monitor cache performance
window.imageCacheService.getCacheStats()
```

## Migration Guide

### From RobustImage to CachedImage

Replace:
```tsx
<RobustImage
  src={image}
  alt={name}
  className="w-full h-48"
  fallbackSrc={fallbackUrl}
/>
```

With:
```tsx
<CachedImage
  src={image}
  alt={name}
  className="w-full h-48"
  assetType={type}
  tokenId={id}
/>
```

### Adding Preloading

Add after data loading:
```typescript
// Preload images for better UX
const imageRequests = assets.map(asset => ({
  url: asset.image,
  assetType: asset.type,
  tokenId: asset.tokenId
}));

imageCacheService.preloadImages(imageRequests);
```

## Future Enhancements

- **IndexedDB Support**: For larger cache storage
- **Background Sync**: Update cached images in background
- **Cache Analytics**: Detailed usage statistics
- **Image Optimization**: Automatic resizing and compression
- **CDN Integration**: Support for additional image CDNs