import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { EnhancedTokenInfo, EnhancedTokenService } from '../utils/enhancedTokenService';
import { marketplaceCache, MarketplaceListing } from '../utils/marketplaceCache';
import { AssetTokenCard } from './AssetTokenCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { imageCacheService } from '../services/imageCacheService';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Loader2,
  Home,
  Coins,
  Palette,
  Leaf,
  Gem,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT } from '../lib/contractAddress';
import { MARKETPLACE_ABI } from '../utils/marketplaceABI';

interface AssetTokenSelectorProps {
  selectedTokenId?: string;
  onTokenSelect: (token: EnhancedTokenInfo) => void;
  showOwnedOnly?: boolean;
}

export const AssetTokenSelector: React.FC<AssetTokenSelectorProps> = ({
  selectedTokenId,
  onTokenSelect,
  showOwnedOnly = false
}) => {
  const { provider, signer, address } = useWallet();
  
  // Debug: log component initialization
  console.log('🏗️ AssetTokenSelector: Component initialized', {
    selectedTokenId,
    showOwnedOnly,
    hasProvider: !!provider,
    hasAddress: !!address
  });
  const [tokens, setTokens] = useState<EnhancedTokenInfo[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<EnhancedTokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  
  // Cache loading states
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  // Convert MarketplaceListing to EnhancedTokenInfo for compatibility
  const convertMarketplaceListingToEnhancedToken = async (
    listing: MarketplaceListing, 
    userBalance: number = 0
  ): Promise<EnhancedTokenInfo> => {
    const priceInEther = parseFloat(ethers.utils.formatEther(listing.price || '0'));
    
    // Extract proper name and asset type from metadata
    let properName = listing.name;
    let properAssetType = listing.type || listing.category || 'Real World Asset';
    
    // If we have metadata, extract better information
    if (listing.metadata) {
      // Try different possible name fields in metadata
      const metadataName = listing.metadata.name || 
                          listing.metadata.title || 
                          listing.metadata.assetName ||
                          (listing.metadata.assetDetails?.name) ||
                          (listing.metadata.assetDetails?.title);
      
      if (metadataName && metadataName !== `Asset Token #${listing.tokenId}`) {
        properName = metadataName;
      }
      
      // Extract asset type from metadata
      const metadataAssetType = listing.metadata.assetType ||
                               (listing.metadata.assetDetails?.assetType) ||
                               (listing.metadata.assetDetails?.category);
      
      if (metadataAssetType) {
        properAssetType = metadataAssetType;
      }
      
      // Also check attributes for asset type
      if (listing.metadata.attributes) {
        const assetTypeAttr = listing.metadata.attributes.find((attr: any) => 
          attr.trait_type === 'Asset Type' || 
          attr.trait_type === 'Category' ||
          attr.trait_type === 'Type'
        );
        if (assetTypeAttr?.value) {
          properAssetType = assetTypeAttr.value;
        }
      }
    }
    
    // If still using default name, try to get from cached metadata
    if (properName === listing.name && properName?.startsWith('Asset Token #')) {
      const cachedMetadata = marketplaceCache.getCachedAssetMetadata(listing.tokenId);
      if (cachedMetadata?.metadata) {
        const metadataName = cachedMetadata.metadata.name || 
                           cachedMetadata.metadata.title || 
                           cachedMetadata.metadata.assetName;
        if (metadataName) {
          properName = metadataName;
        }
        
        const metadataAssetType = cachedMetadata.metadata.assetType ||
                                 (cachedMetadata.metadata.assetDetails?.assetType);
        if (metadataAssetType) {
          properAssetType = metadataAssetType;
        }
      }
    }
    
    return {
      id: listing.tokenId,
      name: properName,
      symbol: `TOA${listing.tokenId}`,
      description: listing.description,
      image: listing.image,
      totalSupply: listing.totalSupply || listing.amount,
      userBalance,
      isListed: true,
      marketplacePrice: priceInEther,
      exists: true,
      metadata: listing.metadata,
      assetType: properAssetType,
      location: listing.attributes?.find(attr => 
        attr.trait_type?.toLowerCase().includes('location'))?.value || 'Unknown',
      valuation: listing.attributes?.find(attr => 
        attr.trait_type?.toLowerCase().includes('valuation'))?.value || 
        `${priceInEther.toFixed(2)} Flow`,
      area: listing.attributes?.find(attr => 
        attr.trait_type?.toLowerCase().includes('area'))?.value,
      bedrooms: listing.attributes?.find(attr => 
        attr.trait_type?.toLowerCase().includes('bedroom'))?.value,
      bathrooms: listing.attributes?.find(attr => 
        attr.trait_type?.toLowerCase().includes('bathroom'))?.value,
      attributes: listing.attributes || [],
      lastPrice: priceInEther,
      priceChange24h: "0.00%", // Could be calculated if we had historical data
      volume24h: 0
    };
  };

  // Enhanced token loading with marketplace cache integration
  const loadTokensWithCache = useCallback(async (forceRefresh: boolean = false) => {
    if (!provider) return;

    try {
      // First, try to load from marketplace cache if not forcing refresh
      if (!forceRefresh) {
        console.log('🎯 Checking marketplace cache for asset token data...');
        const cachedListings = marketplaceCache.getCachedMarketplaceListings();
        
        if (cachedListings && cachedListings.length > 0) {
          console.log(`✅ Loaded ${cachedListings.length} assets from marketplace cache instantly!`);
          
          // Filter out burned tokens before processing
          const { CONTRACT_ABIS } = await import('../lib/contractAbis');
          const tokenContract = new ethers.Contract(TOKEN_CONTRACT, CONTRACT_ABIS.ERC1155CORE, provider);
          
          const activeListings = [];
          for (const listing of cachedListings) {
            try {
              const lifecycle = await tokenContract.getTokenLifecycleStatus(listing.tokenId);
              if (lifecycle !== 2) { // Skip burned tokens (lifecycle 2)
                activeListings.push(listing);
              } else {
                console.log(`🔥 Skipping burned token ${listing.tokenId} in AssetTokenSelector`);
              }
            } catch (lifecycleError) {
              console.warn(`⚠️ Could not check lifecycle for token ${listing.tokenId}, including in AssetTokenSelector`);
              activeListings.push(listing); // Include if we can't check
            }
          }
          
          console.log(`✅ Filtered ${activeListings.length} active tokens (excluded ${cachedListings.length - activeListings.length} burned)`);
          
          // Convert active marketplace listings to EnhancedTokenInfo format
          const enhancedTokens = await Promise.all(
            activeListings.map(async (listing) => {
              // Get user balance if address is available
              let userBalance = 0;
              if (address) {
                try {
                  const balance = await tokenContract.balanceOf(address, listing.tokenId);
                  userBalance = parseInt(balance.toString());
                } catch (error) {
                  console.warn(`Could not fetch balance for token ${listing.tokenId}`);
                }
              }
              
              // If the listing has incomplete metadata (showing default names), try to fetch fresh metadata
              if (listing.name?.startsWith('Asset Token #') || 
                  listing.type === 'Unknown' || 
                  !listing.metadata?.name) {
                console.log(`🔄 Refreshing metadata for token ${listing.tokenId} with incomplete data...`);
                
                try {
                  // Try to get fresh metadata from cache or IPFS
                  const cachedMetadata = marketplaceCache.getCachedAssetMetadata(listing.tokenId);
                  if (cachedMetadata?.metadata) {
                    // Update listing with fresh metadata
                    listing.metadata = cachedMetadata.metadata;
                    listing.name = cachedMetadata.metadata.name || 
                                  cachedMetadata.metadata.title || 
                                  listing.name;
                    listing.type = cachedMetadata.metadata.assetType || 
                                  cachedMetadata.metadata.assetDetails?.assetType ||
                                  listing.type;
                  }
                } catch (refreshError) {
                  console.warn(`Could not refresh metadata for token ${listing.tokenId}:`, refreshError);
                }
              }
              
              return convertMarketplaceListingToEnhancedToken(listing, userBalance);
            })
          );
          
          console.log(`💾 AssetTokenSelector: Setting ${enhancedTokens.length} tokens from cache`);
          setTokens(enhancedTokens);
          setIsFromCache(true);
          setCacheAge(Date.now());
          
          // Check if we have assets with incomplete metadata (default names)
          const incompleteAssets = enhancedTokens.filter(token => 
            token.name?.startsWith('Asset Token #') || 
            token.assetType === 'Real World Asset'
          );
          
          if (incompleteAssets.length > 0) {
            console.log(`⚠️ Found ${incompleteAssets.length} assets with incomplete metadata, triggering background refresh...`);
            // Trigger immediate background refresh for better data
            setTimeout(() => {
              console.log('🔄 Background refresh starting due to incomplete metadata...');
              loadTokensWithCache(true);
            }, 2000); // Shorter delay for incomplete data
          } else {
            // Optionally refresh in background after 30 seconds for updated data
            setTimeout(() => {
              console.log('🔄 Background asset refresh starting...');
              loadTokensWithCache(true);
            }, 30000);
          }
          
          return;
        } else {
          console.log('📭 No valid marketplace cache found, fetching fresh data...');
        }
      }

      // If no cache or forcing refresh, load fresh data
      setIsFromCache(false);
      console.log('🔄 Loading fresh asset data...');
      
      // Use the enhanced token service as fallback for fresh data
      const enhancedTokenService = new EnhancedTokenService(provider, signer);
      const fetchedTokens = await enhancedTokenService.fetchEnhancedMarketplaceListings(address);
      
      console.log(`🔥 AssetTokenSelector: Setting ${fetchedTokens.length} tokens from fresh fetch`);
      setTokens(fetchedTokens);
      console.log('✅ Enhanced tokens loaded:', fetchedTokens.length);
      
      // Preload images for faster future access
      console.log('🚀 Preloading AssetTokenSelector images...');
      const imageRequests = fetchedTokens.map(token => ({
        url: token.image,
        assetType: token.assetType || 'Real Estate',
        tokenId: token.id
      }));
      
      // Preload images in background (don't await to avoid blocking UI)
      imageCacheService.preloadImages(imageRequests).catch(error => {
        console.warn('⚠️ Image preloading failed:', error);
      });
      
      // Cache the fresh contract data for future use
      if (fetchedTokens.length > 0) {
        console.log('💾 Caching fresh contract data from AssetTokenSelector...');
        
        // Convert EnhancedTokenInfo back to MarketplaceListing format for caching
        const marketplaceListings = fetchedTokens.map(token => ({
          tokenId: token.id,
          name: token.name,
          description: token.description,
          image: token.image,
          price: ethers.utils.parseEther(token.marketplacePrice?.toString() || '0').toString(),
          amount: token.totalSupply,
          totalSupply: token.totalSupply,
          seller: '', // Will be populated by marketplace component
          metadataURI: '', // Will be populated by marketplace component  
          metadata: token.metadata,
          attributes: token.attributes,
          type: token.assetType,
          category: token.assetType
        }));
        
        // Cache the converted listings
        marketplaceCache.cacheMarketplaceListings(marketplaceListings);
        console.log(`💾 Cached ${marketplaceListings.length} marketplace listings from AssetTokenSelector fresh fetch`);
      }
      
    } catch (error) {
      console.error('Error loading tokens with cache:', error);
      // Fallback to original method if cache fails
      try {
        const enhancedTokenService = new EnhancedTokenService(provider, signer);
        const fetchedTokens = await enhancedTokenService.fetchEnhancedMarketplaceListings(address);
        setTokens(fetchedTokens);
        
        // Also cache fallback data if successful
        if (fetchedTokens.length > 0) {
          console.log('💾 Caching fallback contract data from AssetTokenSelector...');
          
          // Convert EnhancedTokenInfo back to MarketplaceListing format for caching
          const marketplaceListings = fetchedTokens.map(token => ({
            tokenId: token.id,
            name: token.name,
            description: token.description,
            image: token.image,
            price: ethers.utils.parseEther(token.marketplacePrice?.toString() || '0').toString(),
            amount: token.totalSupply,
            totalSupply: token.totalSupply,
            seller: '', // Will be populated by marketplace component
            metadataURI: '', // Will be populated by marketplace component  
            metadata: token.metadata,
            attributes: token.attributes,
            type: token.assetType,
            category: token.assetType
          }));
          
          // Cache the converted listings
          marketplaceCache.cacheMarketplaceListings(marketplaceListings);
          console.log(`💾 Cached ${marketplaceListings.length} marketplace listings from AssetTokenSelector fallback fetch`);
        }
      } catch (fallbackError) {
        console.error('Fallback token loading also failed:', fallbackError);
      }
    }
  }, [provider, signer, address]);

  // Fetch enhanced token data with caching
  useEffect(() => {
    const fetchTokens = async () => {
      if (!provider) return;

      try {
        setLoading(true);
        console.log('🚀 AssetTokenSelector: Starting token fetch process...');
        
        // Check if we have any cached data
        console.log('🔍 AssetTokenSelector: Checking marketplace cache...');
        const cachedListings = marketplaceCache.getCachedMarketplaceListings();
        console.log('📊 AssetTokenSelector: Cache check result:', {
          hasCachedData: !!cachedListings,
          cachedCount: cachedListings?.length || 0,
          cacheInstance: !!marketplaceCache
        });
        
        // If no cached data or very few items, force a fresh fetch
        if (!cachedListings || cachedListings.length === 0) {
          console.log('⚡ AssetTokenSelector: No cache found, forcing fresh fetch...');
          await loadTokensWithCache(true); // Force refresh
        } else {
          console.log('📁 AssetTokenSelector: Using existing cache...');
          await loadTokensWithCache();
          
          // Additional safety check: if we still don't have tokens after cache load, force refresh
          setTimeout(async () => {
            if (tokens.length === 0 && !loading) {
              console.log('⚠️ AssetTokenSelector: No tokens loaded from cache, forcing refresh...');
              await loadTokensWithCache(true);
            }
          }, 2000);
        }
      } catch (error) {
        console.error('❌ AssetTokenSelector: Error fetching enhanced tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [provider, signer, address, loadTokensWithCache]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTokensWithCache(true); // Force refresh to get latest data
    } catch (error) {
      console.error('Error refreshing tokens:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter tokens based on search term, asset type, and ownership
  useEffect(() => {
    let filtered = tokens;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(token =>
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.id === searchTerm
      );
    }

    // Filter by asset type
    if (selectedAssetType !== 'all') {
      filtered = filtered.filter(token => token.assetType === selectedAssetType);
    }

    // Filter by ownership
    if (showOwnedOnly) {
      filtered = filtered.filter(token => token.userBalance > 0);
    }

    console.log(`🎯 AssetTokenSelector: Filtered ${filtered.length} tokens from ${tokens.length} total (search: "${searchTerm}", type: "${selectedAssetType}", ownedOnly: ${showOwnedOnly})`);
    setFilteredTokens(filtered);
  }, [tokens, searchTerm, selectedAssetType, showOwnedOnly]);

  // Get unique asset types for filtering
  const assetTypes = Array.from(new Set(tokens.map(token => token.assetType)));

  const getAssetTypeIcon = (assetType: string) => {
    switch (assetType) {
      case 'Real Estate': return <Home className="w-4 h-4" />;
      case 'Precious Metals': return <Coins className="w-4 h-4" />;
      case 'Collectibles': return <Gem className="w-4 h-4" />;
      case 'Art': return <Palette className="w-4 h-4" />;
      case 'Carbon Credits': return <Leaf className="w-4 h-4" />;
      default: return <Home className="w-4 h-4" />;
    }
  };

  const getAssetTypeStats = (assetType: string) => {
    const typeTokens = tokens.filter(token => token.assetType === assetType);
    const ownedCount = typeTokens.filter(token => token.userBalance > 0).length;
    return { total: typeTokens.length, owned: ownedCount };
  };

  if (loading) {
    return (
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" />
            <span className="text-gray-700">Loading enhanced asset information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Filter className="w-5 h-5" />
              Asset Selection & Filtering
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by name, location, or token ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Asset Type Filter Tabs */}
          <Tabs value={selectedAssetType} onValueChange={setSelectedAssetType}>
            <TabsList className="grid w-full grid-cols-6 bg-gray-100 border-gray-200">
              <TabsTrigger value="all" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700">
                All Assets ({tokens.length})
              </TabsTrigger>
              {assetTypes.map((assetType) => {
                const stats = getAssetTypeStats(assetType);
                return (
                  <TabsTrigger key={assetType} value={assetType} className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700">
                    {getAssetTypeIcon(assetType)}
                    <span className="hidden sm:inline">{assetType.split(' ')[0]}</span>
                    <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700 border-gray-300">
                      {stats.total}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Showing {filteredTokens.length} of {tokens.length} assets
          </span>
          {showOwnedOnly && (
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
              Owned Assets Only
            </Badge>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          You own {tokens.filter(token => token.userBalance > 0).length} assets
        </div>
      </div>

      {/* Asset Grid/List */}
      {filteredTokens.length === 0 ? (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="text-gray-700">
              <Filter className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2 text-gray-900">No assets found</h3>
              <p className="text-sm text-gray-600">
                {searchTerm
                  ? `No assets match your search "${searchTerm}"`
                  : selectedAssetType !== 'all'
                  ? `No ${selectedAssetType} assets found`
                  : 'No assets available'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {filteredTokens.map((token) => (
            <AssetTokenCard
              key={token.id}
              token={token}
              isSelected={selectedTokenId === token.id}
              onSelect={() => onTokenSelect(token)}
              compact={viewMode === 'list'}
              showTradeButton={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};