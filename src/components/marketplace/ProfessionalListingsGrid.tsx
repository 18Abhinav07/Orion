import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { MarketplaceListing } from '../../utils/marketplaceCache';
import { formatPriceInUSD } from '../../utils/priceService';
import { CachedImage } from '../CachedImage';

// Professional Listings Grid
export const ProfessionalListingsGrid: React.FC<{ 
    listings: MarketplaceListing[];
    category: string;
    onSelectListing: (listing: MarketplaceListing) => void;
    onNavigateToTrading: (listing: MarketplaceListing) => void;
    tokenPrice: number;
    loading?: boolean;
    userLicenses?: any[]; // new prop
  }> = ({ listings, category, onSelectListing, onNavigateToTrading, tokenPrice, loading = false, userLicenses = [] }) => {
    const [activeListing, setActiveListing] = useState<MarketplaceListing | null>(null);
  
    // Show loading state
    if (loading) {
      return (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-12 h-12 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-800">Loading {category}</h3>
          <p className="text-gray-500">Fetching the latest listings from the blockchain...</p>
        </div>
      );
    }
  
    // Show empty state
    if (listings.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-800">No {category} Available</h3>
          <p className="text-gray-500">There are currently no assets listed in this category.</p>
        </div>
      );
    }
  
    return (
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {listings.map((listing) => (
          <motion.div
            key={listing.tokenId}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group relative border border-gray-200/80"
            whileHover={{ y: -8 }}
            onMouseEnter={() => setActiveListing(listing)}
            onMouseLeave={() => setActiveListing(null)}
          >
            <div className="relative">
              <CachedImage
                src={listing.image}
                alt={listing.name}
                className="w-full h-56 object-cover"
                assetType={listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value || 'Real Estate'}
                tokenId={listing.tokenId}
              />
              <div className="absolute top-4 left-4 flex space-x-2">
                <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm text-gray-800 shadow">
                  {listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value}
                </Badge>
                {listing.license && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 shadow">
                    Licensable
                  </Badge>
                )}
                {userLicenses.some(license => license.ipId === listing.tokenId) && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 shadow">
                        Licensed
                    </Badge>
                )}
              </div>
              
              <div 
                className="absolute bottom-4 right-4 text-white text-right bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg"
              >
                <div className="text-lg font-bold">{formatPriceInUSD(listing.price, tokenPrice)}</div>
                {listing.license && (
                  <div className="text-xs text-green-400">{listing.license.terms.commercialRevShare}% Royalty</div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 truncate mb-2">{listing.name}</h3>
              <p className="text-gray-600 h-10 overflow-hidden mb-4">{listing.description}</p>
              
              {listing.license && (
                <div className="mb-4">
                    <Badge>Royalty: {listing.license.terms.commercialRevShare}%</Badge>
                </div>
              )}

              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>Token #{listing.tokenId}</span>
                <span className="font-semibold text-green-600">{listing.amount} Available</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="px-6 pb-6 pt-2 border-t border-gray-100">
              <div className="flex space-x-3">
                <Button 
                  size="sm" 
                  className="flex-1 bg-gray-800 hover:bg-gray-900"
                  onClick={() => onSelectListing(listing)}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Buy
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onNavigateToTrading(listing)}
                >
                  Trade
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  }
  