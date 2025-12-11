/**
 * Category-specific fallback images for real-world assets
 * Uses local assets from public/assets/ directory with unique images per asset
 */

/**
 * Local asset images organized by category
 */
export const LOCAL_ASSET_IMAGES = {
  'Real Estate': [
    '/assets/realestate/types-of-real-estate-cover.jpg',
    '/assets/realestate/real-estate-asset-classes-hero.jpeg', 
    '/assets/realestate/types-of-real-estate-overview-scaled.jpg',
    '/assets/realestate/banglore.jpeg'
  ],
  'Invoice': [
    '/assets/invoices/Commercial-Invoice-Template.webp',
    '/assets/invoices/1131w-KuVdlrcyWPE.webp',
    '/assets/invoices/images-3.png'
  ],
  // Fallback to placeholder for other categories until more local assets are added
  'Commodity': ['/placeholder.svg'],
  'Stocks': ['/placeholder.svg'],
  'Carbon Credits': ['/placeholder.svg'],
  'Precious Metals': ['/placeholder.svg'],
  'Collectibles': ['/placeholder.svg'],
  'Art': ['/placeholder.svg'],
  'Unknown': ['/placeholder.svg']
};

/**
 * Fixed fallback images - one per category for consistency
 * Uses local assets when available, otherwise fallback to placeholder
 */
export const FIXED_CATEGORY_IMAGES = {
  'Real Estate': '/assets/realestate/types-of-real-estate-cover.jpg',
  'Invoice': '/assets/invoices/Commercial-Invoice-Template.webp',
  'Commodity': '/placeholder.svg',
  'Stocks': '/placeholder.svg', 
  'Carbon Credits': '/placeholder.svg',
  'Precious Metals': '/placeholder.svg',
  'Collectibles': '/placeholder.svg',
  'Art': '/placeholder.svg',
  'Unknown': '/placeholder.svg'
};

/**
 * Get a fixed fallback image for an asset category
 * @param assetType - The category/type of the asset
 * @returns URL of fixed fallback image for the category
 */
export const getFixedCategoryImage = (assetType: string): string => {
  return FIXED_CATEGORY_IMAGES[assetType as keyof typeof FIXED_CATEGORY_IMAGES] || FIXED_CATEGORY_IMAGES['Unknown'];
};

/**
 * Get a unique image for each asset based on category and token ID
 * @param assetType - The category/type of the asset
 * @param tokenId - Token ID to ensure uniqueness
 * @returns URL of unique fallback image for the specific asset
 */
export const getUniqueAssetImage = (assetType: string, tokenId: string | number): string => {
  const categoryImages = LOCAL_ASSET_IMAGES[assetType as keyof typeof LOCAL_ASSET_IMAGES] || LOCAL_ASSET_IMAGES['Unknown'];
  
  // Use token ID to select a unique image from the category
  const imageIndex = parseInt(tokenId.toString()) % categoryImages.length;
  return categoryImages[imageIndex];
};

export interface FallbackImageSet {
  [category: string]: string[];
}

export const ASSET_FALLBACK_IMAGES: FallbackImageSet = LOCAL_ASSET_IMAGES;

/**
 * Get a fixed category-specific fallback image for an asset
 * @param assetType - The category/type of the asset
 * @param tokenId - Token ID to ensure uniqueness
 * @returns URL of unique fallback image for the specific asset
 */
export const getCategoryFallbackImage = (assetType: string, tokenId: string | number): string => {
  return getUniqueAssetImage(assetType, tokenId);
};

/**
 * Get all fallback images for a specific category
 * @param assetType - The category/type of the asset
 * @returns Array of fallback image URLs for the category
 */
export const getCategoryImages = (assetType: string): string[] => {
  return LOCAL_ASSET_IMAGES[assetType as keyof typeof LOCAL_ASSET_IMAGES] || LOCAL_ASSET_IMAGES['Unknown'];
};

/**
 * Get all supported asset categories
 * @returns Array of all supported asset category names
 */
export const getSupportedCategories = (): string[] => {
  return Object.keys(LOCAL_ASSET_IMAGES).filter(key => key !== 'Unknown');
};

/**
 * Check if an asset type has specific fallback images
 * @param assetType - The category/type to check
 * @returns true if category has specific images, false if it would use Unknown category
 */
export const hasCategoryImages = (assetType: string): boolean => {
  return assetType in LOCAL_ASSET_IMAGES && assetType !== 'Unknown';
};

/**
 * Get a deterministic unique image for an asset based on its properties
 * This ensures the same asset always gets the same image
 * @param assetType - The category/type of the asset
 * @param tokenId - Token ID for uniqueness
 * @param additionalSeed - Additional string to make selection more unique (optional)
 * @returns URL of unique fallback image for the specific asset
 */
export const getDeterministicAssetImage = (assetType: string, tokenId: string | number, additionalSeed?: string): string => {
  const categoryImages = LOCAL_ASSET_IMAGES[assetType as keyof typeof LOCAL_ASSET_IMAGES] || LOCAL_ASSET_IMAGES['Unknown'];
  
  // Create a seed from tokenId and additional seed for consistent selection
  const seed = additionalSeed ? `${tokenId}-${additionalSeed}` : tokenId.toString();
  
  // Simple hash function to get consistent index
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const imageIndex = Math.abs(hash) % categoryImages.length;
  return categoryImages[imageIndex];
};

// Legacy compatibility - keep existing exports
export { getFixedCategoryImage as getAssetTypeImage };