import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { MarketplaceListing } from '../../utils/marketplaceCache';
import { formatPriceInUSD } from '../../utils/priceService';
import { ethers } from 'ethers';

interface LicenseMintingModalProps {
  listing: MarketplaceListing;
  tokenPrice: number;
  onClose: () => void;
  onMint: (listing: MarketplaceListing, amount: number) => void;
}

export const LicenseMintingModal: React.FC<LicenseMintingModalProps> = ({
  listing,
  tokenPrice,
  onClose,
  onMint,
}) => {
  const [amount, setAmount] = useState(1);
  const [agree, setAgree] = useState(false);

  const handleMint = () => {
    console.log('🎫 Mint button clicked:', { agree, amount, listing });
    if (agree) {
      console.log('✅ Agreement confirmed, calling onMint...');
      onMint(listing, amount);
    } else {
      console.warn('⚠️ User must agree to terms first');
    }
  };

  if (!listing.license) {
    console.error('❌ No license found on listing:', listing);
    return null;
  }

  console.log('📋 License Modal Data:', listing.license);
  
  const mintingFee = listing.license.terms.defaultMintingFee 
    ? parseFloat(ethers.utils.formatEther(listing.license.terms.defaultMintingFee))
    : 0;

  return (
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mint License</h2>
          <p className="text-gray-600 mb-4">
            You are about to mint a license for:{" "}
            <span className="font-semibold">{listing.name}</span>
          </p>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">License Terms Summary</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✓ Commercial Use: {listing.license.terms.commercialUse ? 'Yes' : 'No'}</li>
              <li>✓ Derivative Works: {listing.license.terms.derivativesAllowed ? 'Yes' : 'No'}</li>
              <li>💰 Royalty: {listing.license.terms.commercialRevShare}% of revenue</li>
              <li>🎫 Minting Fee: {mintingFee} ETH</li>
            </ul>
          </div>

          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount to mint
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
            />
          </div>

          <div className="flex items-start mb-6">
            <input
              id="agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
            />
            <label htmlFor="agree" className="ml-2 text-sm text-gray-700">
              I agree to the license terms, including the royalty commitment.
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleMint} disabled={!agree}>
              Mint License
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
