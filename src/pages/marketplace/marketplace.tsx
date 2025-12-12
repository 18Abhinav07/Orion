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
  const navigate = useNavigate();

  // Licensed IPs from backend API
  const [licensedIPs, setLicensedIPs] = useState<LicensedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [licenseTypeFilter, setLicenseTypeFilter] = useState<string>('all');
  const [commercialUseFilter, setCommercialUseFilter] = useState<string>('all');
  const [maxRoyalty, setMaxRoyalty] = useState<number>(100);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

      setLicensedIPs(result.data.ips);
      setTotalPages(result.data.pagination.totalPages);
      setLoading(false);

    } catch (err: any) {
      console.error('❌ Error fetching licensed IPs:', err);
      setError(err.message || 'Failed to load marketplace');
      setLoading(false);
      toast.error('Failed to load marketplace');
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
  // RENDER FUNCTIONS
  // ========================================

  const renderFilters = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
              <span className="font-mono text-gray-900">#{ip.tokenId}</span>
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
      </div>
    </div>
  );
};

export default Marketplace;
