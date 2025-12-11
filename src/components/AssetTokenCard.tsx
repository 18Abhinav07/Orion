import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EnhancedTokenInfo } from '../utils/enhancedTokenService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { CachedImage } from './CachedImage';
import { 
  MapPin, 
  Home, 
  Coins,
  Wallet,
  TrendingUp, 
  TrendingDown,
  Eye,
  DollarSign,
  ImageIcon,
  Loader2
} from 'lucide-react';
import { 
  IPFS_GATEWAYS, 
  extractIPFSHash, 
  convertToGatewayURL, 
  getFallbackImage,
  processImageURLFast 
} from '../utils/imageUtils';
import { getFixedCategoryImage } from '../utils/assetFallbackImages';

// Helper function to calculate total valuation (moved from marketplace)
const calculateTotalValuation = (pricePerTokenFlow: number, totalSupply: number): string => {
  const totalValuation = pricePerTokenFlow * totalSupply;
  return totalValuation.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

interface AssetTokenCardProps {
  token: EnhancedTokenInfo;
  isSelected?: boolean;
  onSelect?: () => void;
  showTradeButton?: boolean;
  onTrade?: () => void;
  compact?: boolean;
}

export const AssetTokenCard: React.FC<AssetTokenCardProps> = ({
  token,
  isSelected = false,
  onSelect,
  showTradeButton = false,
  onTrade,
  compact = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [gatewayIndex, setGatewayIndex] = useState(0);

  // Handle image loading errors with IPFS gateway fallback
  const handleImageError = () => {
    console.log(`❌ Image failed to load: ${currentImageUrl}`);
    
    // Check if current URL is an IPFS URL and try next gateway
    const ipfsHash = extractIPFSHash(currentImageUrl);
    if (ipfsHash && gatewayIndex < IPFS_GATEWAYS.length - 1) {
      const nextGatewayIndex = gatewayIndex + 1;
      const newImageUrl = convertToGatewayURL(`ipfs://${ipfsHash}`, nextGatewayIndex);
      
      console.log(`🔄 Trying IPFS gateway ${nextGatewayIndex + 1}/${IPFS_GATEWAYS.length}: ${newImageUrl}`);
      setGatewayIndex(nextGatewayIndex);
      setCurrentImageUrl(newImageUrl);
      setImageError(false);
      setImageLoaded(false);
      return;
    }
    
    // If all gateways failed or not an IPFS URL, use fixed category fallback image
    const fallbackImage = getFixedCategoryImage(token.assetType);
    console.log(`🎨 Using fixed fallback image for ${token.assetType}: ${fallbackImage}`);
    setCurrentImageUrl(fallbackImage);
    setImageError(true);
  };

  // Initialize proper image URL on component mount
  useEffect(() => {
    // Process the image URL using fast method (no async validation)
    const processedImageUrl = processImageURLFast(token.image, token.assetType, token.id);
    console.log(`🔗 Processed image URL for token ${token.id}: ${token.image} → ${processedImageUrl}`);
    
    setCurrentImageUrl(processedImageUrl);
    setImageLoaded(false);
    setImageError(false);
    setGatewayIndex(0);
  }, [token.image, token.assetType, token.id]);

  const getAssetTypeColor = (assetType: string) => {
    const colors = {
      'Real Estate': 'bg-blue-50 text-blue-700 border-blue-200',
      'Precious Metals': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Collectibles': 'bg-purple-50 text-purple-700 border-purple-200',
      'Art': 'bg-pink-50 text-pink-700 border-pink-200',
      'Carbon Credits': 'bg-green-50 text-green-700 border-green-200',
      'Invoice': 'bg-orange-50 text-orange-700 border-orange-200',
      'Commodity': 'bg-amber-50 text-amber-700 border-amber-200',
      'Stocks': 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
    return colors[assetType as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getAssetTypeIcon = (assetType: string) => {
    switch (assetType) {
      case 'Real Estate': return <Home className="w-4 h-4" />;
      case 'Precious Metals': return <Coins className="w-4 h-4" />;
      case 'Collectibles': return <Eye className="w-4 h-4" />;
      case 'Art': return <Eye className="w-4 h-4" />;
      case 'Carbon Credits': return <Wallet className="w-4 h-4" />;
      case 'Invoice': return <DollarSign className="w-4 h-4" />;
      case 'Commodity': return <Coins className="w-4 h-4" />;
      case 'Stocks': return <TrendingUp className="w-4 h-4" />;
      default: return <Home className="w-4 h-4" />;
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 4 
    });
  };

  const isPriceUp = token.priceChange24h?.startsWith('+');

  // Compact view
  if (compact) {
    return (
      <Card 
        className={`bg-white border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 border-blue-200' : ''}`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
              <CachedImage
                src={currentImageUrl}
                alt={token.name}
                className="w-full h-full object-cover"
                assetType={token.assetType || 'Real Estate'}
                tokenId={token.id}
                onLoad={() => {
                  setImageLoaded(true);
                  console.log(`✅ Image loaded successfully: ${currentImageUrl}`);
                }}
                onError={handleImageError}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{token.name}</h3>
              <p className="text-xs text-gray-500 flex items-center mt-1">
                <MapPin className="w-3 h-3 mr-1" />
                {token.location}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {token.marketplacePrice ? formatPrice(token.marketplacePrice) : 'N/A'} Flow
                  </p>
                </div>
                
                {token.userBalance > 0 && (
                  <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                    <Wallet className="w-3 h-3 mr-1" />
                    {token.userBalance}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full card view - Redesigned to match marketplace theme
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className={`group bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-200/50 hover:border-gray-300/50 overflow-hidden ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-200 shadow-2xl scale-[1.02]' : ''
      }`}
    >
      <div className="relative overflow-hidden">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}
        {imageError && !imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}
        
        <CachedImage
          src={currentImageUrl}
          alt={token.name}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
          assetType={token.assetType || 'Real Estate'}
          tokenId={token.id}
          onLoad={() => {
            setImageLoaded(true);
            console.log(`✅ Image loaded successfully: ${currentImageUrl}`);
          }}
          onError={handleImageError}
        />
        
        {/* Asset Type Badge - Top Left */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 border border-gray-200/50">
            {token.assetType}
          </span>
        </div>
        
        {/* Token ID Badge - Top Right */}
        <div className="absolute top-4 right-4">
          <span className="px-2 py-1 bg-blue-500/90 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-blue-400/50">
            #{token.id}
          </span>
        </div>

        {/* User Balance Badge - Top Right (if owned) */}
        {token.userBalance > 0 && (
          <div className="absolute top-4 right-20">
            <span className="px-2 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-green-400/50">
              <Wallet className="w-3 h-3 inline mr-1" />
              {token.userBalance}
            </span>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors line-clamp-1">
          {token.name}
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed flex items-center">
          <MapPin className="w-3 h-3 mr-1 text-gray-400" />
          {token.location}
        </p>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500">
              Price per token ({token.marketplacePrice ? formatPrice(token.marketplacePrice) : 'N/A'} Flow)
            </p>
            <p className="text-sm font-semibold text-blue-600 mt-1">
              Total Valuation: {token.marketplacePrice ? calculateTotalValuation(token.marketplacePrice, token.totalSupply) : 'N/A'} Flow
            </p>
            {token.priceChange24h && (
              <p className={`text-xs flex items-center mt-1 ${isPriceUp ? 'text-green-600' : 'text-red-600'}`}>
                {isPriceUp ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {token.priceChange24h} (24h)
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-green-600">{token.totalSupply} Total</p>
            <p className="text-xs text-gray-500">Supply</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-600">Available Now</span>
          </div>
          
          {showTradeButton ? (
            <button 
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onTrade?.();
              }}
            >
              Trade Now
            </button>
          ) : (
            <button 
              className="px-4 py-2 bg-gradient-to-r from-gray-800 to-black text-white rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
            >
              Select Asset
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
