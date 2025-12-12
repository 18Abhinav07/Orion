
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketplaceListing } from '../../utils/marketplaceCache';
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
  
// Featured Properties Carousel Component
export const FeaturedPropertiesCarousel: React.FC<{ 
    listings: MarketplaceListing[];
    onSelectListing: (listing: MarketplaceListing) => void;
    onViewDetails: (listing: MarketplaceListing) => void;
    tokenPrice: number;
  }> = ({ listings, onSelectListing, onViewDetails, tokenPrice }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
  
    useEffect(() => {
      if (listings.length === 0) return;
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % listings.length);
      }, 5000);
      return () => clearInterval(timer);
    }, [listings.length]);
  
    const nextSlide = () => {
      if (listings.length === 0) return;
      setCurrentIndex((prevIndex) => (prevIndex + 1) % listings.length);
    };
  
    const prevSlide = () => {
        if (listings.length === 0) return;
      setCurrentIndex((prevIndex) => (prevIndex - 1 + listings.length) % listings.length);
    };
  
    if (listings.length === 0) return null;
  
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-black shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(75,85,99,0.2),transparent_50%)]"></div>
        
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="flex flex-col lg:flex-row"
            >
              {/* Image Section */}
              <div className="lg:w-1/2 relative">
                <CachedImage
                  src={listings[currentIndex].image}
                  alt={listings[currentIndex].name}
                  className="w-full h-64 lg:h-96 object-cover"
                  assetType={listings[currentIndex].attributes?.find(attr => attr.trait_type === 'Asset Type')?.value || 'Real Estate'}
                  tokenId={listings[currentIndex].tokenId}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                
                {/* Featured Badge */}
                <div className="absolute top-6 left-6">
                  <span className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-full text-sm font-bold shadow-lg">
                    ⭐ FEATURED
                  </span>
                </div>
              </div>
  
              {/* Content Section */}
              <div className="lg:w-1/2 p-8 lg:p-12 text-white flex flex-col justify-center">
                
                
                <h3 className=" text-white text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                  {listings[currentIndex].name}
                </h3>
                
                <p className="text-lg text-gray-100 mb-6 leading-relaxed">
                  {listings[currentIndex].description}
                </p>
                
                <div className="flex items-center justify-between mb-8">
                  
                  <div className="text-right">
                    <div className="text-green-400 font-bold">Token #{listings[currentIndex].tokenId}</div>
                  </div>
                </div>
  
                <div className="flex space-x-4">
                  
                  <button 
                    onClick={() => onSelectListing(listings[currentIndex])}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-900 transition-all duration-300 font-semibold shadow-lg"
                  >
                    Invest Now
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
  
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
  
          {/* Indicators */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {listings.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-white shadow-lg' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };
  