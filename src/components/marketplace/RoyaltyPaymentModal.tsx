import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MarketplaceListing } from '../../utils/marketplaceCache';
import { AlertTriangle, Coins } from 'lucide-react';

interface RoyaltyPaymentModalProps {
  listing: MarketplaceListing;
  onClose: () => void;
  onPayRoyalty: (listing: MarketplaceListing, amount: string) => void;
  userLicenses?: any[];
}

export const RoyaltyPaymentModal: React.FC<RoyaltyPaymentModalProps> = ({
  listing,
  onClose,
  onPayRoyalty,
  userLicenses = []
}) => {
  const [amount, setAmount] = useState('');
  const [understand, setUnderstand] = useState(false);

  const handlePay = () => {
    if (understand && amount && parseFloat(amount) > 0) {
      onPayRoyalty(listing, amount);
    }
  };

  // Check if user has a license for this IP
  const hasLicense = userLicenses.some(license => license.ipId === listing.tokenId);

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
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Coins className="w-6 h-6 text-green-600" />
            Pay Royalty
          </h2>
          <p className="text-gray-600 mb-4">
            Support the creator by paying royalties for:{" "}
            <span className="font-semibold">{listing.name}</span>
          </p>

          {/* License Status */}
          {hasLicense ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800 flex items-center gap-2">
                ✅ You have a license for this IP
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                ℹ️ You don't have a license yet. Consider minting one first!
              </p>
            </div>
          )}

          {/* Important Notice */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-900">
                <p className="font-semibold mb-1">Important Technical Note:</p>
                <p className="text-xs leading-relaxed">
                  Story Protocol requires royalties to be paid from a <strong>derivative IP</strong> to its parent IP.
                  Currently, this implementation uses a simplified approach for testing purposes. For production use,
                  you should create a derivative IP first, then pay from that derivative to the parent.
                </p>
              </div>
            </div>
          </div>

          {/* IP Information */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">IP Information</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>IP ID:</span>
                <span className="font-mono text-xs">{listing.tokenId.toString().slice(0, 10)}...{listing.tokenId.toString().slice(-8)}</span>
              </div>
              {listing.license && (
                <>
                  <div className="flex justify-between">
                    <span>Royalty Rate:</span>
                    <span className="font-semibold text-green-600">{listing.license.terms.commercialRevShare}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>License Type:</span>
                    <span>{listing.license.terms.commercialUse ? 'Commercial' : 'Non-Commercial'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <Label htmlFor="royalty-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount (WIP tokens)
            </Label>
            <Input
              type="number"
              id="royalty-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
              step="0.01"
              min="0"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the amount in WIP tokens you want to pay as royalty
            </p>
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="flex items-start mb-6">
            <input
              id="understand"
              type="checkbox"
              checked={understand}
              onChange={(e) => setUnderstand(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
            />
            <label htmlFor="understand" className="ml-2 text-sm text-gray-700">
              I understand this is a test implementation and that proper royalty payments
              require a derivative IP in production environments.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handlePay}
              disabled={!understand || !amount || parseFloat(amount) <= 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Pay Royalty
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
