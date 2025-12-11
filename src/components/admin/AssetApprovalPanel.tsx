/**
 * @fileoverview Asset Approval Panel Component
 * @description Handles asset approval workflow for admin users
 */

import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';
import { pinataService } from '../../services/pinataService.js';

interface AssetApprovalPanelProps {
  onStatsUpdate: () => void;
}

interface PendingAsset {
  assetId: string;
  tokenAddress: string;
  ipfsMetadataCID: string;
  isActive: boolean;
  registrationTimestamp: number;
  metadata?: any;
}

const AssetApprovalPanel: React.FC<AssetApprovalPanelProps> = ({ onStatsUpdate }) => {
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<PendingAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Approval form state
  const [lawFirmAddress, setLawFirmAddress] = useState('');
  const [legalDocuments, setLegalDocuments] = useState<File[]>([]);
  const [expiryDays, setExpiryDays] = useState(365);
  const [comments, setComments] = useState('');

  useEffect(() => {
    loadPendingAssets();
  }, []);

  const loadPendingAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const assets = await adminService.getPendingAssets();
      
      // Load metadata for each asset
      const assetsWithMetadata = await Promise.all(
        assets.map(async (asset) => {
          try {
            if (asset.ipfsMetadataCID) {
              const metadata = await pinataService.getFromIPFS(asset.ipfsMetadataCID);
              return { ...asset, metadata };
            }
            return asset;
          } catch (err) {
            console.warn(`Failed to load metadata for asset ${asset.assetId}:`, err);
            return asset;
          }
        })
      );
      
      setPendingAssets(assetsWithMetadata);
    } catch (err) {
      console.error('Failed to load pending assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pending assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetSelect = (asset: PendingAsset) => {
    setSelectedAsset(asset);
    setError(null);
    
    // Pre-fill law firm address if available from local storage
    const savedLawFirm = localStorage.getItem('defaultLawFirm');
    if (savedLawFirm) {
      setLawFirmAddress(savedLawFirm);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setLegalDocuments(Array.from(files));
    }
  };

  const handleApproveAsset = async () => {
    if (!selectedAsset) return;
    
    try {
      setProcessing(selectedAsset.assetId);
      setError(null);
      
      // Validate inputs
      if (!lawFirmAddress || !lawFirmAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Please enter a valid law firm address');
      }
      
      if (legalDocuments.length === 0) {
        throw new Error('Please upload legal documents');
      }

      // Prepare asset metadata
      const assetMetadata = {
        ...selectedAsset.metadata,
        assetId: selectedAsset.assetId,
        approvalComments: comments,
        legalReview: {
          lawFirm: lawFirmAddress,
          reviewDate: Date.now(),
          status: 'approved'
        }
      };

      // Execute approval workflow
      const result = await adminService.approveAssetWorkflow(
        selectedAsset.assetId,
        legalDocuments,
        assetMetadata,
        lawFirmAddress
      );

      console.log('Asset approved successfully:', result);
      
      // Save law firm address for future use
      localStorage.setItem('defaultLawFirm', lawFirmAddress);
      
      // Update UI
      await loadPendingAssets();
      onStatsUpdate();
      setSelectedAsset(null);
      resetForm();
      
      // Show success message
      alert('Asset approved successfully!');
      
    } catch (err) {
      console.error('Failed to approve asset:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve asset');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectAsset = async () => {
    if (!selectedAsset) return;
    
    try {
      setProcessing(selectedAsset.assetId);
      setError(null);
      
      // Store rejection reason
      localStorage.setItem(`assetRejection:${selectedAsset.assetId}`, JSON.stringify({
        reason: comments || 'No reason provided',
        timestamp: Date.now(),
        rejectedBy: await adminService.signer?.getAddress()
      }));
      
      // For now, we'll just remove from pending list
      // In a full implementation, you'd update the asset status in the registry
      
      await loadPendingAssets();
      onStatsUpdate();
      setSelectedAsset(null);
      resetForm();
      
      alert('Asset rejected. Issuer will be notified.');
      
    } catch (err) {
      console.error('Failed to reject asset:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject asset');
    } finally {
      setProcessing(null);
    }
  };

  const resetForm = () => {
    setLawFirmAddress('');
    setLegalDocuments([]);
    setExpiryDays(365);
    setComments('');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading pending assets...</span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-6">Asset Approval</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Assets List */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Pending Assets ({pendingAssets.length})
          </h4>
          
          {pendingAssets.length === 0 ? (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <span>🎉 No assets pending approval!</span>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAssets.map((asset) => (
                <div
                  key={asset.assetId}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedAsset?.assetId === asset.assetId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleAssetSelect(asset)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-900">
                      {asset.metadata?.title || 'Untitled Asset'}
                    </h5>
                    <span className="text-xs text-gray-500">
                      {formatDate(asset.registrationTimestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {asset.metadata?.description || 'No description available'}
                  </p>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      Asset ID: {formatAddress(asset.assetId)}
                    </span>
                    <span className="text-gray-500">
                      Token: {formatAddress(asset.tokenAddress)}
                    </span>
                  </div>
                  
                  {asset.metadata?.valuation && (
                    <div className="mt-2 text-sm font-medium text-green-600">
                      Valuation: ${asset.metadata.valuation.toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval Form */}
        <div>
          {selectedAsset ? (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Approve Asset: {selectedAsset.metadata?.title || 'Untitled'}
              </h4>
              
              <div className="space-y-6">
                {/* Asset Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-3">Asset Details</h5>
                  <div className="space-y-2 text-sm">
                    <div><strong>Title:</strong> {selectedAsset.metadata?.title}</div>
                    <div><strong>Description:</strong> {selectedAsset.metadata?.description}</div>
                    <div><strong>Valuation:</strong> ${selectedAsset.metadata?.valuation?.toLocaleString()}</div>
                    <div><strong>Jurisdiction:</strong> {selectedAsset.metadata?.jurisdiction}</div>
                    <div><strong>Asset ID:</strong> {selectedAsset.assetId}</div>
                    <div><strong>Token Address:</strong> {selectedAsset.tokenAddress}</div>
                  </div>
                </div>

                {/* Law Firm Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Law Firm Address *
                  </label>
                  <input
                    type="text"
                    value={lawFirmAddress}
                    onChange={(e) => setLawFirmAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ethereum address of the trusted law firm issuing the attestation
                  </p>
                </div>

                {/* Legal Documents Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Legal Documents *
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {legalDocuments.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Selected files:</p>
                      <ul className="text-xs text-gray-500">
                        {legalDocuments.map((file, index) => (
                          <li key={index}>• {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Attestation Expiry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attestation Valid For (Days)
                  </label>
                  <input
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                    min="1"
                    max="3650"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    placeholder="Optional approval/rejection comments..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={handleApproveAsset}
                    disabled={processing === selectedAsset.assetId}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === selectedAsset.assetId ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Approving...
                      </span>
                    ) : (
                      'Approve Asset'
                    )}
                  </button>
                  
                  <button
                    onClick={handleRejectAsset}
                    disabled={processing === selectedAsset.assetId}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject Asset
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📋</div>
              <p>Select an asset from the list to review and approve</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetApprovalPanel;