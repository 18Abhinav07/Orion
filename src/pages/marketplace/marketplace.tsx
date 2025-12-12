import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, DollarSign, Award, Shield, TrendingUp, Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsTrigger, TabsList } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import HeroBackground from '../../components/HeroBackground';

// ========================================
// FLOW BLOCKCHAIN CODE - COMMENTED OUT
// ========================================
/*
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT, NETWORK_CONFIG, ACTIVE_NETWORK } from '../../lib/contractAddress';
import { MARKETPLACE_ABI } from '../../utils/marketplaceABI';
import { fetchETHPrice, formatPriceInUSD, convertETHToUSD, formatETHWithUSD } from '../../utils/priceService';
import { processImageURLFast, processImageURLWithAuth, fetchEnhancedMetadata } from '../../utils/imageUtils';
import { metadataService } from '../../services/metadataService';
import { processImageURL as processPinataImageURL } from '../../utils/pinataImageFetcher';
import { getCategoryFallbackImage, getUniqueAssetImage, getDeterministicAssetImage, ASSET_FALLBACK_IMAGES } from '../../utils/assetFallbackImages';
import { CachedImage } from '../../components/CachedImage';
import { imageCacheService } from '../../services/imageCacheService';
import { marketplaceCache, MarketplaceListing } from '../../utils/marketplaceCache';
import HeroBackground from '../../components/HeroBackground';
import { FeaturedPropertiesCarousel } from '../../components/marketplace/FeaturedPropertiesCarousel';
import { ProfessionalListingsGrid } from '../../components/marketplace/ProfessionalListingsGrid';
import { ProfessionalExpandedDetail } from '../../components/marketplace/ProfessionalExpandedDetail';
import { LicenseMintingModal } from '../../components/marketplace/LicenseMintingModal';
import { marketplaceService } from '../../services/marketplaceService';
import { licenseTokenService } from '../../services/licenseTokenService';

// Alternative RPC endpoints for Flow
const FLOW_RPC_URLS = [
  "https://mainnet.evm.nodes.onflow.org/"
];

// Contract initialization code - ALL COMMENTED OUT
const initializeContract = async () => {
  // Flow contract initialization logic
};
*/

// ========================================
// BACKEND API INTEGRATION
// ========================================

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';

// Licensed IP Asset interface (from backend API)
interface LicensedIP {
  nonce: number;
  ipId: string;
  tokenId: number;
  creatorAddress: string;
  contentHash: string;
  status: string;
  metadata: {
    ipMetadataURI: string;
    nftMetadataURI: string;
  };
  license: {
    licenseTermsId: string;
    licenseType: 'commercial_remix' | 'non_commercial';
    royaltyPercent: number;
    allowDerivatives: boolean;
    commercialUse: boolean;
    licenseTxHash?: string;
    licenseAttachedAt?: number;
  };
  registeredAt: number;
  originalFilename?: string;
  ipfsUrl?: string;
}

interface MarketplaceResponse {
  success: boolean;
  data: {
    ips: LicensedIP[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    filters: {
      licenseType?: string;
      commercialUse?: boolean;
      royaltyRange?: {
        min?: number;
        max?: number;
      };
    };
  };
}

const Marketplace: React.FC = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [showDetails, setShowDetails] = useState<MarketplaceListing | null>(null);
  const [showLicenseMintingModal, setShowLicenseMintingModal] = useState(false);
  const [selectedListingForLicense, setSelectedListingForLicense] = useState<MarketplaceListing | null>(null);
  const [ethPrice, setEthPrice] = useState<number>(2500); // Default U2U price
  const [priceLoading, setPriceLoading] = useState(true);
  
  // Cache loading states
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  
  // Track whether we have real contract data vs demo/placeholder data
  const [hasRealContractData, setHasRealContractData] = useState(false);
  
  // Wallet and contract integration
  const { provider, signer } = useWallet();
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  const [userLicenses, setUserLicenses] = useState<any[]>([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (signer) {
      const fetchUserLicenses = async () => {
        const licenses = await licenseTokenService.getUserLicenses(await signer.getAddress(), provider);
        setUserLicenses(licenses);
      };
      fetchUserLicenses();
    }
  }, [signer, provider]);

  // Navigate to trading terminal for P2P trading
  const navigateToTradingTerminal = (listing: MarketplaceListing) => {
    // Convert price from Wei to U2U for proper display
    let marketplacePrice = 0;
    try {
      const priceInWei = ethers.BigNumber.from(listing.price);
      marketplacePrice = parseFloat(ethers.utils.formatEther(priceInWei));
      console.log(`🔄 Converting price for ${listing.name}: ${listing.price} Wei → ${marketplacePrice} U2U`);
    } catch (error) {
      console.warn('⚠️ Error converting price:', error);
      marketplacePrice = parseFloat(listing.price) || 0;
    }

    // Navigate to the OrderBook page with the selected token
    navigate('/orderbook', { 
      state: { 
        selectedToken: {
          tokenId: listing.tokenId,
          name: listing.name,
          image: listing.image,
          type: listing.type || listing.category,
          userBalance: 0, // User doesn't own this yet from marketplace
          price: listing.price, // Keep original for compatibility
          marketplacePrice: marketplacePrice, // Add converted U2U price
          description: listing.description
        }
      } 
    });
  };

  // Licensed IPs from backend API
  const [licensedIPs, setLicensedIPs] = useState<LicensedIP[]>([]);

  // Filters
  const [licenseTypeFilter, setLicenseTypeFilter] = useState<string>('all');
  const [commercialUseFilter, setCommercialUseFilter] = useState<string>('all');
  const [maxRoyalty, setMaxRoyalty] = useState<number>(100);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handlenavigate = () => {
    navigate('/dashboard');
  }

  // ========================================
  // FETCH LICENSED IPS FROM BACKEND API
  // ========================================
  const fetchLicensedIPs = async () => {
    try {
      setLoading(true);
      setError('');

      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '20');

      if (licenseTypeFilter !== 'all') {
        params.append('licenseType', licenseTypeFilter);
      }

      if (commercialUseFilter === 'commercial') {
        params.append('commercialUse', 'true');
      } else if (commercialUseFilter === 'non-commercial') {
        params.append('commercialUse', 'false');
      }

      if (maxRoyalty < 100) {
        params.append('maxRoyalty', maxRoyalty.toString());
      }

      console.log('🔍 Fetching licensed IPs with params:', params.toString());

      const response = await fetch(`${BACKEND_API_URL}/marketplace/licensed?${params}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result: MarketplaceResponse = await response.json();

      if (!result.success) {
        throw new Error('Failed to fetch licensed IPs');
      }

      console.log('✅ Fetched licensed IPs:', result.data);

      // Process IPs to fetch metadata from IPFS
      const processedIPs = await Promise.all(
        result.data.ips.map(async (ip) => {
          try {
            // Fetch NFT metadata to get title and image
            const nftMetadataUrl = ip.metadata.nftMetadataURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
            console.log(`📥 Fetching metadata for token ${ip.tokenId}:`, nftMetadataUrl);

            const metadataResponse = await fetch(nftMetadataUrl);
            if (metadataResponse.ok) {
              const metadata = await metadataResponse.json();
              console.log(`✅ Got metadata for token ${ip.tokenId}:`, metadata);

              // Extract title/name and image
              const title = metadata.name || metadata.title || `IP Asset #${ip.tokenId}`;
              let imageUrl = metadata.image || '';

              // Convert IPFS image URL
              if (imageUrl && imageUrl.startsWith('ipfs://')) {
                imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
              }

              return {
                ...ip,
                originalFilename: title,
                ipfsUrl: imageUrl,
                description: metadata.description || 'No description available'
              };
            }
          } catch (error) {
            console.warn(`⚠️ Failed to fetch metadata for token ${ip.tokenId}:`, error);
          }

          // Return IP with fallback data if metadata fetch failed
          return {
            ...ip,
            originalFilename: `IP Asset #${ip.tokenId}`,
            ipfsUrl: '',
            description: 'No description available'
          };
        })
      );

      console.log('✅ Processed IPs with metadata:', processedIPs);

      // Set licensed IPs and pagination
      setLicensedIPs(processedIPs);
      setTotalPages(result.data.pagination.totalPages);
      setLoading(false);

      console.log(`📊 Found ${processedIPs.length} licensed IPs`);
          const issuer = issuers[i];
          const amount = ethers.BigNumber.isBigNumber(amounts[i]) ? amounts[i].toNumber() : Number(amounts[i]);
          const price = ethers.BigNumber.isBigNumber(prices[i]) ? prices[i].toString() : prices[i].toString();
          
          // Skip burned tokens by checking lifecycle status
          if (tokenContract) {
            try {
              const lifecycle = await tokenContract.getTokenLifecycleStatus(tokenId);
              if (lifecycle === 2) { // 2 = Burned
                console.log(`🔥 Skipping burned token ${tokenId}`);
                continue;
              }
            } catch (lifecycleError) {
              console.warn(`⚠️ Could not check lifecycle for token ${tokenId}, including in listings`);
            }
          }
          
          console.log(`🔄 Preparing listing ${i + 1}/${tokenIds.length}:`, {
            tokenId,
            issuer,
            amount,
            priceInETH: ethers.utils.formatEther(price),
            priceInWei: price
          });
          
          // Store listing data
          listingData.push({
            tokenId,
            issuer,
            amount,
            price,
            index: i
          });
          
          // Get token metadata URI from token contract with fallback
          let metadataURI = '';
          if (tokenContract) {
            try {
              // Try tokenMetadata first (custom function)
              metadataURI = await tokenContract.tokenMetadata(tokenId);
              console.log('✅ Got metadata URI from tokenMetadata:', metadataURI);
            } catch (e) {
              try {
                // Fallback to uri function (standard ERC1155)
                metadataURI = await tokenContract.uri(tokenId);
                console.log('✅ Got metadata URI from uri:', metadataURI);
              } catch (e2) {
                console.warn('⚠️ Could not get metadata URI for token:', tokenId);
                metadataURI = ''; // Will use fallback data
              }
            }
          }
          
          if (metadataURI) {
            metadataRequests.push({ tokenId, metadataURI, index: i });
          }
          
        } catch (preparationError) {
          console.error(`❌ Error preparing listing ${i}:`, preparationError);
          // Continue with next listing
        }
      }
      
      console.log(`📊 Prepared ${listingData.length} listings, ${metadataRequests.length} metadata requests`);
      
      // Batch fetch metadata with caching
      const metadataResults = await marketplaceCache.batchFetchMetadataWithCache(metadataRequests);
      
      // Now process all listings with cached metadata
      for (const data of listingData) {
        try {
          const { tokenId, issuer, amount, price, index } = data;
          
          // Get cached metadata result
          const metadataResult = metadataResults.get(tokenId);
          const metadata = metadataResult?.metadata;
          const imageUrl = metadataResult?.processedImageUrl || '';
          
          // Enhanced asset type detection (matching AssetTokenSelector logic)
          let assetType = 'Investment Asset'; // Better default than 'Unknown'
          
          // Check metadata for asset type with multiple fallbacks
          if (metadata) {
            // Check direct assetType field
            const metadataAssetType = metadata.assetType ||
                                    (metadata.assetDetails?.assetType) ||
                                    (metadata.assetDetails?.category);
            if (metadataAssetType && metadataAssetType.trim() && metadataAssetType.trim() !== 'Unknown') {
              assetType = metadataAssetType.trim();
            }
            
            // Check attributes for asset type
            if (metadata.attributes && Array.isArray(metadata.attributes)) {
              const assetTypeAttr = metadata.attributes.find((attr: any) => 
                attr.trait_type === 'Asset Type' || 
                attr.trait_type === 'Category' ||
                attr.trait_type === 'Type'
              );
              if (assetTypeAttr?.value && assetTypeAttr.value.trim() && assetTypeAttr.value.trim() !== 'Unknown') {
                assetType = assetTypeAttr.value.trim();
              }
            }
          }
          
          // Use unique asset-specific fallback images if no processed image
          const finalImageUrl = imageUrl || getDeterministicAssetImage(assetType, tokenId);
          console.log(`🎨 Final unique image for token ${tokenId} (${assetType}):`, finalImageUrl);
          
          // Fetch total supply for valuation calculation
          let totalSupply = 0;
          try {
            // Use the mapping directly instead of calling a function
            const totalListed = await marketplaceContract.totalTokensListed(tokenId);
            totalSupply = parseInt(totalListed.toString());
            console.log(`📊 Token ${tokenId} total supply: ${totalSupply}`);
          } catch (e) {
            console.warn(`⚠️ Could not fetch total supply for token ${tokenId}:`, e);
            totalSupply = amount; // Fallback to available amount
          }
          
          // Extract proper name and asset type from metadata with multiple fallbacks
          let properName = `Asset Token #${tokenId}`;
          let properAssetType = assetType;
          
          if (metadata) {
            // Try different possible name fields in metadata
            const metadataName = metadata.name || 
                               metadata.title || 
                               metadata.assetName ||
                               (metadata.assetDetails?.name) ||
                               (metadata.assetDetails?.title);
            
            if (metadataName && metadataName.trim()) {
              properName = metadataName.trim();
            }
            
            // Extract asset type from metadata with multiple fallbacks
            const metadataAssetType = metadata.assetType ||
                                    (metadata.assetDetails?.assetType) ||
                                    (metadata.assetDetails?.category);
            
            if (metadataAssetType && metadataAssetType.trim()) {
              properAssetType = metadataAssetType.trim();
            }
            
            // Also check attributes for asset type
            if (metadata.attributes && Array.isArray(metadata.attributes)) {
              const assetTypeAttr = metadata.attributes.find((attr: any) => 
                attr.trait_type === 'Asset Type' || 
                attr.trait_type === 'Category' ||
                attr.trait_type === 'Type'
              );
              if (assetTypeAttr?.value && assetTypeAttr.value.trim()) {
                properAssetType = assetTypeAttr.value.trim();
              }
            }
          }
          
          console.log(`📝 Token ${tokenId} processed with name: "${properName}", type: "${properAssetType}"`);
          
          const listing: MarketplaceListing = {
            tokenId,
            name: properName,
            description: metadata?.description || `Asset token listed on the marketplace. Token ID: ${tokenId}`,
            image: finalImageUrl,
            price,
            amount,
            totalSupply,
            seller: issuer,
            metadataURI: metadataRequests.find(req => req.tokenId === tokenId)?.metadataURI || `placeholder-${tokenId}`,
            metadata,
            attributes: metadata?.attributes || [
              { trait_type: "Asset Type", value: properAssetType }
            ],
            type: properAssetType,
            category: properAssetType
          };

          if (licensedIpMap.has(tokenId)) {
            listing.license = licensedIpMap.get(tokenId);
          }
          
          processedListings.push(listing);
          
        } catch (listingError) {
          console.error(`❌ Error processing listing for token ${data.tokenId}:`, listingError);
          // Continue with next listing - don't fail entire load
        }
      }
      
      setListings(processedListings);
      console.log('✅ Marketplace listings loaded:', processedListings.length);
      
      // Preload images for faster future access
      console.log('🚀 Preloading marketplace images...');
      const imageRequests = processedListings.map(listing => ({
        url: listing.image,
        assetType: listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value || 'Real Estate',
        tokenId: listing.tokenId
      }));
      
      // Preload images in background (don't await to avoid blocking UI)
      imageCacheService.preloadImages(imageRequests).catch(error => {
        console.warn('⚠️ Image preloading failed:', error);
      });
      
      // Mark that we now have real contract data
      setHasRealContractData(true);
      fetchedRealData = true; // Local flag for finally block
      console.log('✅ Real contract data fetched and marked');
      
      // Cache the marketplace listings
      console.log('💾 Caching marketplace listings...');
      marketplaceCache.cacheMarketplaceListings(processedListings);
      
      if (processedListings.length === 0) {
        toast.info('No assets could be loaded from the marketplace');
      } else {
        const isBackgroundRefresh = isFromCache;
        if (isBackgroundRefresh) {
          // Silent background refresh - no toast needed for better UX
          console.log(`✅ Background refresh: Updated ${processedListings.length} marketplace listings`);
        } else {
          toast.success(`${processedListings.length} assets loaded from marketplace`);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error loading marketplace listings:', error);
      
      let errorMessage = 'Failed to load marketplace listings';
      if (error.message?.includes('Network synchronization')) {
        errorMessage = 'Network synchronization issue. Loading demo data as fallback.';
      } else if (error.message?.includes('Smart contract call failed')) {
        errorMessage = 'Marketplace contract unavailable. Loading demo data as fallback.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection issue. Loading demo data as fallback.';
      } else {
        errorMessage = 'Contract data unavailable. Loading demo data as fallback.';
      }
      
      // Load demo data as fallback
      console.log('🔄 Loading demo marketplace data as fallback...');
      setListings(DEMO_MARKETPLACE_DATA);
      setError(errorMessage);
      setHasRealContractData(false);
      console.log('⚠️ Demo data loaded - keeping loading state active');
      
      toast.error(errorMessage);
    } finally {
      // Only turn off loading if we successfully fetched real contract data
      if (fetchedRealData) {
        setLoading(false);
        console.log('✅ Turning off loading - real contract data fetched successfully');
      } else {
        console.log('⚠️ Keeping loading state - no real contract data fetched yet');
        // Keep loading state active to show spinner instead of dummy cards
      }
    }
  };

  // Load licensed IPs on mount and when filters change
  useEffect(() => {
    fetchLicensedIPs();
  }, [currentPage, licenseTypeFilter, commercialUseFilter, maxRoyalty]);

  // ========================================
  // BUY LICENSE HANDLER (Non-functional placeholder)
  // ========================================
  const handleBuyLicense = (ip: LicensedIP) => {
    console.log('📝 Buy license requested for:', ip);
    toast.info('Buy License feature coming soon! Backend will provide contract call service.', {
      description: `License for: ${ip.originalFilename || `IP Asset #${ip.tokenId}`}`,
      duration: 4000,
    });
    // TODO: Backend will provide service layer contract call to mint license
  };

  // ========================================
  // HANDLER FUNCTIONS
  // ========================================

  const handleMintLicense = async (listing: MarketplaceListing, amount: number) => {
    if (!signer) {
      toast.error('Please connect your wallet to mint a license.');
      return;
    }
    try {
      const licenseTokenId = await licenseTokenService.mintLicenseToken(
        listing.license.ipId,
        listing.license.licenseTermsId,
        await signer.getAddress(),
        amount,
        signer
      );
      toast.success(`Successfully minted license token #${licenseTokenId}`);
      setShowLicenseMintingModal(false);
      // Refresh user licenses
      const licenses = await licenseTokenService.getUserLicenses(await signer.getAddress(), provider);
      setUserLicenses(licenses);
    } catch (error) {
      console.error('Error minting license:', error);
      toast.error('Failed to mint license.');
    }
  };

  const handlePurchaseSuccess = () => {
    // Clear marketplace cache since listings have changed
    console.log('🗑️ Clearing marketplace cache after successful purchase...');
    marketplaceCache.clearCache();

    // Reload licensed IPs after successful purchase (force refresh)
    fetchLicensedIPs();
    toast.success('Purchase completed! Refreshing marketplace...');
  };

  // ========================================
  // RENDER FUNCTIONS
  // ========================================

  const renderFilters = () => (
    <div className="bg-white/60 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* License Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            License Type
          </label>
          <Select value={licenseTypeFilter} onValueChange={setLicenseTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="commercial_remix">Commercial Remix</SelectItem>
              <SelectItem value="non_commercial">Non-Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Commercial Use Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Commercial Use
          </label>
          <Select value={commercialUseFilter} onValueChange={setCommercialUseFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="non-commercial">Non-Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Royalty Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Royalty: {maxRoyalty}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={maxRoyalty}
            onChange={(e) => setMaxRoyalty(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <Button
        onClick={() => {
          setLicenseTypeFilter('all');
          setCommercialUseFilter('all');
          setMaxRoyalty(100);
          setCurrentPage(1);
        }}
        variant="outline"
        className="mt-4"
      >
        Reset Filters
      </Button>
    </div>
  );

  const renderIPCard = (ip: LicensedIP) => (
    <Card key={ip.nonce} className="hover:shadow-lg transition-shadow ">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold line-clamp-1">
              {ip.originalFilename || `IP Asset #${ip.tokenId}`}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={ip.license.licenseType === 'commercial_remix' ? 'default' : 'secondary'}>
                {ip.license.licenseType === 'commercial_remix' ? 'Commercial Remix' : 'Non-Commercial'}
              </Badge>
              {ip.license.royaltyPercent > 0 && (
                <Badge variant="outline" className="text-green-600">
                  {ip.license.royaltyPercent}% Royalty
                </Badge>
              )}
            </div>
          </div>
          <Award className="w-6 h-6 text-blue-600 flex-shrink-0" />
        </div>

        {/* IPFS Image Preview */}
        <div className="w-full h-48 bg-gray-100 rounded-md overflow-hidden">
          <img
            src={ip.ipfsUrl ? ip.ipfsUrl.replace('ipfs://', 'https://ipfs.io/ipfs/') : 'https://via.placeholder.com/400x300?text=IP+Asset'}
            alt={ip.originalFilename || `IP Asset #${ip.tokenId}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=IP+Asset';
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          {ip.ipId && (
            <div className="flex justify-between">
              <span className="text-gray-500">IP ID:</span>
              <span className="font-mono text-gray-900 truncate ml-2" title={ip.ipId}>
                {ip.ipId.slice(0, 10)}...
              </span>
            </div>
          )}

          {ip.tokenId && (
            <div className="flex justify-between">
              <span className="text-gray-500">Token ID:</span>
              <span className="font-mono text-gray-900">#{ip.tokenId.toString().slice(0, 10)}</span>
            </div>
          )}

          {ip.license.licenseTermsId && (
            <div className="flex justify-between">
              <span className="text-gray-500">License ID:</span>
              <span className="font-mono text-gray-900 truncate ml-2" title={ip.license.licenseTermsId}>
                {ip.license.licenseTermsId}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-gray-500">Derivatives:</span>
            <Badge variant={ip.license.allowDerivatives ? 'default' : 'secondary'} className="text-xs">
              {ip.license.allowDerivatives ? '✓ Allowed' : '✗ Not Allowed'}
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500">Commercial:</span>
            <Badge variant={ip.license.commercialUse ? 'default' : 'secondary'} className="text-xs">
              {ip.license.commercialUse ? '✓ Yes' : '✗ No'}
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button
          onClick={() => handleBuyLicense(ip)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Shield className="w-4 h-4 mr-2" />
          Buy License
        </Button>
        {ip.creatorAddress && (
          <p className="text-xs text-gray-500 text-center">
            Created by: {ip.creatorAddress.slice(0, 6)}...{ip.creatorAddress.slice(-4)}
          </p>
        )}
      </CardFooter>
    </Card>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-4 mt-8">
        <Button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          variant="outline"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <Button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          variant="outline"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  };

  // ========================================
  // MAIN RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroBackground />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Licensed IP Marketplace
          </h1>
          <p className="text-lg text-gray-600">
            Discover and license intellectual property assets on Story Protocol
          </p>
          
          
         
       </div>
      <div className="absolute top-9 right-4 z-20">
        <Button className='bg-black' onClick={handlenavigate}>
          Go to Dashboard
        </Button>
      </div>

       

        {/* Filters */}
        {renderFilters()}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading licensed IP assets...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Marketplace</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchLicensedIPs} variant="outline">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && licensedIPs.length === 0 && (
          <Card className="border border-dashed border-gray-300 w-full">
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Licensed IPs Available</h3>
              <p className="text-gray-600 mb-4">
                No IP assets match your current filters. Try adjusting the filters or check back later.
              </p>
              <Button
                onClick={() => navigate('/issuer')}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                Register Your IP Asset
              </Button>
            </CardContent>
          </Card>
        )}

        {/* IP Assets Grid */}
        {!loading && !error && licensedIPs.length > 0 && (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {licensedIPs.length} licensed IP asset{licensedIPs.length !== 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {licensedIPs.map(renderIPCard)}
            </div>

            {/* Pagination */}
            {renderPagination()}
          </>
        )}

        {/* Details Modal */}
        {showDetails && (
          <ProfessionalExpandedDetail
            listing={showDetails}
            onClose={() => setShowDetails(null)}
            onBuy={(listing) => {
              setShowDetails(null);
              setSelectedListing(listing);
            }}
            onNavigateToTrading={navigateToTradingTerminal}
            tokenPrice={ethPrice}
            onMintLicense={(listing) => {
              setSelectedListingForLicense(listing);
              setShowLicenseMintingModal(true);
            }}
          />
        )}

        {/* License Minting Modal */}
        {showLicenseMintingModal && selectedListingForLicense && (
          <LicenseMintingModal
            listing={selectedListingForLicense}
            tokenPrice={ethPrice}
            onClose={() => setShowLicenseMintingModal(false)}
            onMint={handleMintLicense}
          />
        )}
      </div>
    </div>
  );
};

export default Marketplace;
