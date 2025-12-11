/**
 * Utility functions for handling IPFS images with robust fallback mechanisms
 * Updated to integrate with Pinata JWT authentication
 */

import { fetchMetadataFromIPFS, processImageURL as processPinataImageURL } from './pinataImageFetcher';

// IPFS Gateways in order of preference (now using JWT-authenticated Pinata first)
export const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/', // JWT authenticated
  'https://olive-left-snake-740.mypinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.ipfs.io/ipfs/'
];

// Fallback images by asset type
export const FALLBACK_IMAGES = {
  'Real Estate': [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop', // Professional business
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'
  ],
  'Precious Metals': [
    'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=600&fit=crop'
  ],
  'Collectibles': [
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop'
  ],
  'Art': [
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800&h=600&fit=crop'
  ],
  'Carbon Credits': [
    'https://images.unsplash.com/photo-1569163139342-de0874c4e2c5?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1587614295999-6c1c13675117?w=800&h=600&fit=crop'
  ],
  'Invoice': [
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop'
  ],
  'Stocks': [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=600&fit=crop'
  ],
  'Unknown': [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop'
  ]
};

/**
 * Extract IPFS hash from various URL formats
 */
export const extractIPFSHash = (url: string): string | null => {
  if (!url) return null;
  
  // ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', '');
  }
  
  // Gateway URL format
  if (url.includes('/ipfs/')) {
    const parts = url.split('/ipfs/');
    return parts.length > 1 ? parts[1] : null;
  }
  
  // Raw hash (starts with Qm or baf)
  if (url.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]{56})$/)) {
    return url;
  }
  
  return null;
};

/**
 * Convert IPFS URL to gateway URL using preferred gateway
 */
export const convertToGatewayURL = (ipfsUrl: string, gatewayIndex: number = 0): string => {
  const hash = extractIPFSHash(ipfsUrl);
  if (!hash) return ipfsUrl;
  
  const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
  return `${gateway}${hash}`;
};

/**
 * Get fallback image for asset type
 */
export const getFallbackImage = (assetType: string, tokenId: string): string => {
  const normalizedAssetType = assetType || 'Unknown';
  const assetImages = FALLBACK_IMAGES[normalizedAssetType as keyof typeof FALLBACK_IMAGES] || FALLBACK_IMAGES['Unknown'];
  
  // Use token ID to deterministically select fallback image
  const index = parseInt(tokenId.slice(-1)) % assetImages.length;
  return assetImages[index];
};

/**
 * Validate if an image URL is accessible
 */
export const validateImageURL = async (url: string, timeout: number = 5000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Prepare headers - add JWT auth for Pinata requests
    const headers: Record<string, string> = {};
    
    // Add JWT authentication for Pinata requests
    if (url.includes('gateway.pinata.cloud') || url.includes('mypinata.cloud')) {
      const JWT_TOKEN = import.meta.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjMDU3NzI3NC0xMzU2LTRmZjgtODk5Yi02MjU0MTZmNTMxYTEiLCJlbWFpbCI6ImFkb2U3NDAzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJlZTdmZDhiNDY3MGU4ZTc1Y2YxZiIsInNjb3BlZEtleVNlY3JldCI6Ijg3NjU3MDdkNzBmNzAyZjFkYTAxMmVhNmU1MmYzNDUyMjFkOGE0YzgwMWFjYjVlN2Y4NTk5NzYwODIyNTc3ZGYiLCJleHAiOjE3OTA5Mzk1NTR9.huKruxuknG20OfbJsMjiuIaLTQMbCWsILk1B5Dl7Oko';
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
      console.log('🔐 Using JWT authentication for Pinata image validation');
    }
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-cache',
      headers
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn(`Image validation failed for ${url}:`, error);
    return false;
  }
};

/**
 * Try to get a working IPFS image URL by testing multiple gateways
 */
export const getWorkingIPFSImageURL = async (ipfsUrl: string, timeout: number = 5000): Promise<string | null> => {
  const hash = extractIPFSHash(ipfsUrl);
  if (!hash) return null;
  
  console.log(`🔍 Testing IPFS image accessibility for hash: ${hash}`);
  
  // Test each gateway with proper authentication
  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    const gatewayUrl = `${IPFS_GATEWAYS[i]}${hash}`;
    console.log(`🌐 Testing gateway ${i + 1}/${IPFS_GATEWAYS.length}: ${gatewayUrl}`);
    
    const isAccessible = await validateImageURL(gatewayUrl, timeout);
    if (isAccessible) {
      console.log(`✅ Working IPFS gateway found: ${gatewayUrl}`);
      return gatewayUrl;
    }
  }
  
  console.warn(`❌ No working IPFS gateways found for hash: ${hash}`);
  return null;
};

/**
 * Process image URL with robust IPFS handling and fallback
 */
export const processImageURL = async (
  imageUrl: string, 
  assetType: string, 
  tokenId: string,
  skipValidation: boolean = false
): Promise<string> => {
  console.log(`🖼️ Processing image URL: ${imageUrl} for ${assetType} token ${tokenId}`);
  
  // If no image URL provided, use fallback immediately
  if (!imageUrl || imageUrl.includes('placeholder')) {
    const fallback = getFallbackImage(assetType, tokenId);
    console.log(`📷 No image URL, using fallback: ${fallback}`);
    return fallback;
  }
  
  // If it's already a regular HTTP URL (not IPFS), validate it if requested
  if (imageUrl.startsWith('http') && !imageUrl.includes('/ipfs/')) {
    if (skipValidation) {
      return imageUrl;
    }
    
    const isValid = await validateImageURL(imageUrl);
    if (isValid) {
      console.log(`✅ HTTP image validated: ${imageUrl}`);
      return imageUrl;
    } else {
      console.warn(`❌ HTTP image failed validation: ${imageUrl}`);
      const fallback = getFallbackImage(assetType, tokenId);
      console.log(`📷 Using fallback: ${fallback}`);
      return fallback;
    }
  }
  
  // Handle IPFS URLs
  const hash = extractIPFSHash(imageUrl);
  if (hash) {
    if (skipValidation) {
      // Just convert to gateway URL without validation
      return convertToGatewayURL(imageUrl);
    }
    
    // Try to find a working IPFS gateway
    const workingUrl = await getWorkingIPFSImageURL(imageUrl);
    if (workingUrl) {
      return workingUrl;
    }
    
    // If no IPFS gateway works, use fallback
    const fallback = getFallbackImage(assetType, tokenId);
    console.log(`📷 IPFS failed, using fallback: ${fallback}`);
    return fallback;
  }
  
  // Unknown format, use fallback
  const fallback = getFallbackImage(assetType, tokenId);
  console.log(`📷 Unknown image format, using fallback: ${fallback}`);
  return fallback;
};

/**
 * Process image URL for immediate use (without validation)
 * Useful for fast rendering where validation happens later
 */
export const processImageURLFast = (imageUrl: string, assetType: string, tokenId: string): string => {
  if (!imageUrl || imageUrl.includes('placeholder')) {
    return getFallbackImage(assetType, tokenId);
  }
  
  // Convert IPFS to gateway URL
  const hash = extractIPFSHash(imageUrl);
  if (hash) {
    return convertToGatewayURL(imageUrl);
  }
  
  // Return as-is for HTTP URLs
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Fallback for unknown formats
  return getFallbackImage(assetType, tokenId);
};

/**
 * Enhanced image processing with Pinata JWT authentication
 * Uses the new pinataImageFetcher utility for authenticated requests
 */
export const processImageURLWithAuth = async (imageUrl: string, metadata?: any): Promise<string> => {
  try {
    console.log('🔐 Processing image URL with Pinata authentication:', imageUrl);
    
    // Use the Pinata utility for processing
    const processedUrl = processPinataImageURL(imageUrl, metadata);
    
    // Validate that the processed URL works
    const isValid = await validateImageURL(processedUrl);
    if (isValid) {
      console.log('✅ Authenticated image URL validated:', processedUrl);
      return processedUrl;
    } else {
      console.warn('⚠️ Authenticated image URL failed validation, using fallback');
      // Try with regular gateway processing as fallback
      return convertToGatewayURL(imageUrl);
    }
  } catch (error) {
    console.error('❌ Error processing image with authentication:', error);
    // Fallback to regular processing
    return convertToGatewayURL(imageUrl);
  }
};

/**
 * Enhanced metadata fetching with Pinata integration
 * Fetches metadata and processes image URLs with authentication
 */
export const fetchEnhancedMetadata = async (metadataURI: string) => {
  try {
    console.log('🔄 Fetching enhanced metadata with Pinata integration:', metadataURI);
    
    // Use the Pinata utility for metadata fetching
    const metadata = await fetchMetadataFromIPFS(metadataURI);
    
    if (metadata && metadata.image) {
      // Process the image URL with authentication
      const enhancedImageUrl = await processImageURLWithAuth(metadata.image, metadata);
      
      return {
        ...metadata,
        image: enhancedImageUrl,
        _enhanced: true,
        _source: 'pinata-authenticated'
      };
    }
    
    return metadata;
  } catch (error) {
    console.error('❌ Error fetching enhanced metadata:', error);
    return null;
  }
};