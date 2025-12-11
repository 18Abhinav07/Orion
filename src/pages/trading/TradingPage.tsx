import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, TrendingUp, BarChart3 } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { TradingTerminal } from '../orderbook/TradingTerminal';
import { TokenService } from '../../utils/tokenService';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'sonner';
import Header from '../../components/Header';

interface AssetDetails {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  category: string;
  price: string;
  availableSupply: number;
  attributes: Array<{ trait_type: string; value: string }>;
}

const TradingPage: React.FC = () => {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const { address, provider } = useWallet();
  const [assetDetails, setAssetDetails] = useState<AssetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch asset details
  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (!tokenId || !provider) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Initialize TokenService and fetch marketplace listings
        const signer = provider.getSigner(address || '');
        const tokenService = new TokenService(provider, signer);
        const fetchedTokens = await tokenService.fetchMarketplaceListings(address || '');
        
        console.log('🔍 Trading Page: Fetched listings:', fetchedTokens);
        
        // Find the specific token by tokenId
        const token = fetchedTokens.find(token => token.id === tokenId);
        
        if (!token) {
          throw new Error(`Asset with Token ID ${tokenId} not found`);
        }

        // Transform TokenInfo to AssetDetails format
        const getCategoryFromAttributes = (attributes?: Array<{ trait_type: string; value: string }>): string => {
          if (attributes) {
            const assetTypeAttr = attributes.find(attr => attr.trait_type === 'Asset Type');
            return assetTypeAttr?.value || 'Unknown';
          }
          return 'Unknown';
        };

        const category = getCategoryFromAttributes(token.attributes);
        const assetImage = token.image || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop';
        const description = token.description || 
          `${token.name} - Tokenized ${category.toLowerCase()} asset with ${token.totalSupply} total supply. Available for secondary P2P trading on the Open Assets Trading Platform.`;

        const assetDetails: AssetDetails = {
          tokenId: token.id,
          name: token.name,
          description: description,
          image: assetImage,
          category: category,
          price: token.price?.toString() || '1.0',
          availableSupply: Number(token.totalSupply) - Number(token.userBalance || 0),
          attributes: token.attributes || []
        };

        setAssetDetails(assetDetails);
        console.log('🎯 Asset details loaded:', assetDetails);
        
      } catch (err) {
        console.error('❌ Error fetching asset details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load asset details');
        toast.error('Failed to load asset details');
      } finally {
        setLoading(false);
      }
    };

    fetchAssetDetails();
  }, [tokenId, provider, address]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
          <div className="container mx-auto px-4 pt-8">
            {/* Header Skeleton */}
            <div className="flex items-center gap-4 mb-8">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="w-48 h-8 mb-2" />
                <Skeleton className="w-32 h-4" />
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="p-6">
                    <Skeleton className="w-full h-64 mb-4 rounded-lg" />
                    <Skeleton className="w-3/4 h-6 mb-2" />
                    <Skeleton className="w-full h-4 mb-4" />
                    <Skeleton className="w-1/2 h-4" />
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-6">
                    <Skeleton className="w-full h-96" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !assetDetails) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Asset Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The requested asset could not be found.'}</p>
            <Button onClick={() => navigate('/orderbook')} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Open Assets Trading Platform
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="container mx-auto px-4 pt-8">
          {/* Header Navigation */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/orderbook')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Assets
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trading Terminal</h1>
              <p className="text-gray-600">Real-time trading with on-chain escrow</p>
            </div>
          </div>

          {/* Main Trading Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Asset Details Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    Asset Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Asset Image */}
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={assetDetails.image}
                      alt={assetDetails.name}
                      className="w-full h-64 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop';
                      }}
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 text-gray-700">
                        {assetDetails.category}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="bg-blue-500/90 text-white">
                        #{assetDetails.tokenId}
                      </Badge>
                    </div>
                  </div>

                  {/* Asset Info */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {assetDetails.name}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {assetDetails.description}
                    </p>
                  </div>

                  {/* Price and Supply Info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Price per Token</p>
                        <p className="text-lg font-bold text-green-600">
                          {parseFloat(assetDetails.price).toFixed(4)} U2U
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Available Supply</p>
                        <p className="text-lg font-bold text-blue-600">
                          {assetDetails.availableSupply.toLocaleString()} tokens
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>

                  {/* Attributes */}
                  {assetDetails.attributes && assetDetails.attributes.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Attributes</h4>
                      <div className="space-y-2">
                        {assetDetails.attributes.map((attr, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">{attr.trait_type}</span>
                            <span className="text-sm font-medium text-gray-900">{attr.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trading Status */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">Live Trading Active</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trading Terminal */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Trading Terminal - {assetDetails.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Real-time P2P trading with secure escrow • Token ID: {assetDetails.tokenId}
                  </p>
                </CardHeader>
                <CardContent>
                  {address ? (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">Trading Terminal</h3>
                      <p className="text-gray-600 mb-4">
                        Trading for {assetDetails.name} (Token ID: {assetDetails.tokenId})
                      </p>
                      <p className="text-sm text-yellow-600">
                        Trading terminal integration in progress. Please use the orderbook page for now.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Wallet to Trade</h3>
                      <p className="text-gray-600">Please connect your wallet to access the trading terminal.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TradingPage;