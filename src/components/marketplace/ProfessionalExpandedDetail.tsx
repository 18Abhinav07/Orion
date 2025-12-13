
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Info, Users, TrendingUp, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { MarketplaceListing } from '../../utils/marketplaceCache';
import { formatPriceInUSD } from '../../utils/priceService';
import { CachedImage } from '../CachedImage';
import { ethers } from 'ethers';

// Helper function to calculate total valuation
const calculateTotalValuation = (pricePerTokenWei: string, totalSupply: number): string => {
    const pricePerTokenU2U = parseFloat(ethers.utils.formatEther(pricePerTokenWei));
    const totalValuation = pricePerTokenU2U * totalSupply;
    return totalValuation.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

// Professional Expanded Detail Modal
export const ProfessionalExpandedDetail: React.FC<{
    listing: MarketplaceListing;
    onClose: () => void;
    onBuy: (listing: MarketplaceListing) => void;
    onNavigateToTrading: (listing: MarketplaceListing) => void;
    tokenPrice: number;
    onMintLicense: (listing: MarketplaceListing) => void;
    onPayRoyalty?: (listing: MarketplaceListing) => void;
  }> = ({ listing, onClose, onBuy, onNavigateToTrading, tokenPrice, onMintLicense, onPayRoyalty }) => {
    useEffect(() => {
      const handleEsc = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEsc);
      return () => {
        window.removeEventListener('keydown', handleEsc);
      };
    }, [onClose]);
  
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">{listing.name}</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-6 h-6" />
              </Button>
            </header>
            
            {/* Body */}
            <div className="flex-grow overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                {/* Left Column - Image and Key Info */}
                <div className="space-y-6 ">
                  <div className="relative rounded-xl overflow-hidden shadow-lg">
                    <CachedImage
                      src={listing.image}
                      alt={listing.name}
                      className="w-full h-80 object-cover"
                      assetType={listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value || 'Real Estate'}
                      tokenId={listing.tokenId}
                    />
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm shadow">
                        {listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                     {listing.metadataURI && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Metadata</h3>
                      <a 
                        href={`https://gateway.pinata.cloud/ipfs/${listing.metadataURI.replace('ipfs://', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm truncate block"
                      >
                        View on IPFS
                      </a>
                    </div>
                  )}
                   
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center text-gray-500 mb-1">
                        <Clock className="w-4 h-4 mr-2" /> Token ID
                      </div>
                      <div className="font-bold text-lg text-gray-900">#{listing.tokenId.toString().slice(0, 4)}..{listing.tokenId.toString().slice(-4)}</div>
                    </div>
                  </div>
                </div>
  
                {/* Right Column - Details and Description */}
                <div className="space-y-6 ">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                      <Info className="w-5 h-5 mr-2 text-gray-500" />
                      Asset Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      {listing.attributes.map((attr, index) => (
                        <div key={index} className="flex justify-between p-3 bg-gray-50 rounded-md">
                          <span className="text-gray-600">{attr.trait_type}</span>
                          <span className="font-semibold text-gray-900">{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {listing.license && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                        <Info className="w-5 h-5 mr-2 text-gray-500" />
                        License Terms
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                          <span className="text-gray-600">Commercial Use</span>
                          <span className="font-semibold text-gray-900">{listing.license.terms.commercialUse ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                          <span className="text-gray-600">Derivatives</span>
                          <span className="font-semibold text-gray-900">{listing.license.terms.derivativesAllowed ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                          <span className="text-gray-600">Royalty</span>
                          <span className="font-semibold text-gray-900">{listing.license.terms.commercialRevShare}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {listing.description}
                    </p>
                  </div>
  
                 
                </div>
              </div>
            </div>
  
            {/* Footer */}
            <footer className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end space-x-4">
                {listing.license && (
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => onMintLicense(listing)}
                  >
                    Mint License
                  </Button>
                )}
              </div>
            </footer>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }
  