/**
 * Cached Image Component
 * 
 * A React component that uses the image cache service for fast image loading
 * with IPFS prioritization and local fallbacks.
 */

import React, { useState, useEffect } from 'react';
import { imageCacheService } from '../services/imageCacheService';

interface CachedImageProps {
  src: string;
  alt: string;
  className?: string;
  assetType?: string;
  tokenId?: string;
  forceRefresh?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: React.ReactNode;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  alt,
  className = '',
  assetType = 'Real Estate',
  tokenId = '1',
  forceRefresh = false,
  onLoad,
  onError,
  placeholder
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cacheSource, setCacheSource] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        console.log(`🔄 Loading cached image for token ${tokenId} (${assetType}):`, src);
        
        const cachedUrl = await imageCacheService.getCachedImage(
          src,
          assetType,
          tokenId,
          forceRefresh
        );
        
        if (isMounted) {
          setImageUrl(cachedUrl);
          
          // Determine cache source for debugging
          if (cachedUrl.includes('/assets/')) {
            setCacheSource('local');
          } else if (cachedUrl.includes('ipfs') || cachedUrl.includes('gateway')) {
            setCacheSource('ipfs');
          } else {
            setCacheSource('external');
          }
          
          console.log(`✅ Cached image loaded for token ${tokenId}:`, cachedUrl);
        }
      } catch (error) {
        console.error(`❌ Failed to load cached image for token ${tokenId}:`, error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
          onError?.();
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [src, assetType, tokenId, forceRefresh]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
    console.log(`🎯 Image rendered successfully for token ${tokenId} from ${cacheSource} cache`);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
    console.error(`❌ Image render failed for token ${tokenId}:`, imageUrl);
  };

  // Default placeholder
  const defaultPlaceholder = (
    <div className="flex items-center justify-center bg-gray-200 animate-pulse">
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0">
          {placeholder || defaultPlaceholder}
        </div>
      )}

      {/* Main image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs">Image unavailable</span>
          </div>
        </div>
      )}

      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && !isLoading && !hasError && cacheSource && (
        <div className="absolute top-1 right-1 px-1 py-0.5 bg-black bg-opacity-60 text-white text-xs rounded">
          {cacheSource === 'local' ? '🎨' : cacheSource === 'ipfs' ? '🌐' : '🔗'}
        </div>
      )}
    </div>
  );
};

export default CachedImage;