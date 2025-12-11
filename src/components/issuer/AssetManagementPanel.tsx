/**
 * @fileoverview Asset Management Panel Component
 * @description Manage existing assets, view status, and update configurations
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { issuerService } from '../../services/issuerService.js';

interface AssetManagementPanelProps {
  onStatsUpdate: () => void;
}

interface ManagedAsset {
  assetId: string;
  title: string;
  description: string;
  valuation: number;
  status: string;
  createdAt: number;
  tokenAddress?: string;
  deploymentStatus?: any;
  saleStatus?: any;
}

const AssetManagementPanel: React.FC<AssetManagementPanelProps> = ({ onStatsUpdate }) => {
  const [assets, setAssets] = useState<ManagedAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ManagedAsset | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Price update state
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    loadMyAssets();
  }, []);

  const loadMyAssets = async () => {
    try {
      setLoading(true);
      setError(null);

      const myAssets = await issuerService.getMyAssets();
      
      // Enrich with deployment and sale status
      const enrichedAssets = await Promise.all(
        myAssets.map(async (asset) => {
          try {
            const [deploymentStatus, saleStatus] = await Promise.all([
              issuerService.getAssetDeploymentStatus(asset.assetId),
              issuerService.getAssetSaleStatus(asset.assetId)
            ]);

            return {
              ...asset,
              deploymentStatus,
              saleStatus
            };
          } catch (err) {
            console.warn(`Failed to get status for asset ${asset.assetId}:`, err);
            return asset;
          }
        })
      );

      setAssets(enrichedAssets);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetSelect = (asset: ManagedAsset) => {
    setSelectedAsset(asset);
    setActiveTab('overview');
    setNewPrice(asset.saleStatus?.priceInEth || '1.0');
    setError(null);
  };

  const handleEnableSale = async () => {
    if (!selectedAsset || !newPrice) return;

    try {
      setUpdating(true);
      setError(null);

      const priceInWei = ethers.utils.parseEther(newPrice);
      await issuerService.enableAssetSale(selectedAsset.assetId, priceInWei);

      console.log('Sale enabled successfully');
      await loadMyAssets();
      onStatsUpdate();

      alert('Sale enabled successfully!');
    } catch (err) {
      console.error('Failed to enable sale:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable sale');
    } finally {
      setUpdating(false);
    }
  };

  const handleDisableSale = async () => {
    if (!selectedAsset) return;

    try {
      setUpdating(true);
      setError(null);

      await issuerService.disableAssetSale(selectedAsset.assetId);

      console.log('Sale disabled successfully');
      await loadMyAssets();
      onStatsUpdate();

      alert('Sale disabled successfully!');
    } catch (err) {
      console.error('Failed to disable sale:', err);
      setError(err instanceof Error ? err.message : 'Failed to disable sale');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!selectedAsset || !newPrice) return;

    try {
      setUpdating(true);
      setError(null);

      const priceInWei = ethers.utils.parseEther(newPrice);
      await issuerService.updateAssetPrice(selectedAsset.assetId, priceInWei);

      console.log('Price updated successfully');
      await loadMyAssets();
      onStatsUpdate();

      alert('Price updated successfully!');
    } catch (err) {
      console.error('Failed to update price:', err);
      setError(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending-approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'deployed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading your assets...</span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-6">My Assets</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assets List */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Your Assets ({assets.length})
          </h4>
          
          {assets.length === 0 ? (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <span>No assets found. Create your first asset to get started!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset) => (
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
                    <h5 className="font-medium text-gray-900 text-sm">{asset.title}</h5>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(asset.status)}`}>
                      {asset.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">${asset.valuation.toLocaleString()}</p>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Created: {formatDate(asset.createdAt)}</div>
                    {asset.deploymentStatus?.tokenAddress && (
                      <div>Token: {formatAddress(asset.deploymentStatus.tokenAddress)}</div>
                    )}
                    {asset.saleStatus?.isSaleEnabled && (
                      <div className="text-green-600 font-medium">🟢 Sale Active</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Asset Details */}
        <div className="lg:col-span-2">
          {selectedAsset ? (
            <div>
              {/* Asset Header */}
              <div className="bg-white border rounded-lg p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{selectedAsset.title}</h4>
                    <p className="text-gray-600">{selectedAsset.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedAsset.status)}`}>
                    {selectedAsset.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Valuation</div>
                    <div className="font-medium">${selectedAsset.valuation.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Created</div>
                    <div className="font-medium">{formatDate(selectedAsset.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Token Status</div>
                    <div className="font-medium">
                      {selectedAsset.deploymentStatus?.status === 'deployed' ? '✅ Deployed' : '⏳ Pending'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Sale Status</div>
                    <div className="font-medium">
                      {selectedAsset.saleStatus?.isSaleEnabled ? '🟢 Active' : '🔴 Inactive'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white border rounded-lg">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {[
                      { id: 'overview', name: 'Overview', icon: '📊' },
                      { id: 'token', name: 'Token Details', icon: '🪙' },
                      { id: 'marketplace', name: 'Marketplace', icon: '🛍️' },
                      { id: 'analytics', name: 'Analytics', icon: '📈' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap flex py-4 px-6 border-b-2 font-medium text-sm items-center space-x-2`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Asset Information</h5>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                          <div><strong>Asset ID:</strong> {selectedAsset.assetId}</div>
                          <div><strong>Title:</strong> {selectedAsset.title}</div>
                          <div><strong>Valuation:</strong> ${selectedAsset.valuation.toLocaleString()}</div>
                          <div><strong>Status:</strong> {selectedAsset.status}</div>
                          <div><strong>Created:</strong> {formatDate(selectedAsset.createdAt)}</div>
                        </div>
                      </div>

                      {selectedAsset.deploymentStatus?.status === 'deployed' && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-3">Deployment Information</h5>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                            <div><strong>Token Address:</strong> {selectedAsset.deploymentStatus.tokenAddress}</div>
                            <div><strong>Token Name:</strong> {selectedAsset.deploymentStatus.name}</div>
                            <div><strong>Token Symbol:</strong> {selectedAsset.deploymentStatus.symbol}</div>
                            <div><strong>Total Supply:</strong> {selectedAsset.deploymentStatus.totalSupply}</div>
                            <div><strong>SPV Wallet:</strong> {selectedAsset.deploymentStatus.spvWallet}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'token' && (
                    <div className="space-y-6">
                      {selectedAsset.deploymentStatus?.status === 'deployed' ? (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-3">Token Contract Details</h5>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-gray-500">Contract Address</div>
                                <div className="font-mono">{selectedAsset.deploymentStatus.tokenAddress}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Token Standard</div>
                                <div>ERC-3643</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Total Supply</div>
                                <div>{selectedAsset.deploymentStatus.totalSupply} {selectedAsset.deploymentStatus.symbol}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Minting Status</div>
                                <div>{selectedAsset.deploymentStatus.mintingEnabled ? '✅ Enabled' : '❌ Disabled'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-4">🚀</div>
                          <p>Token not deployed yet</p>
                          <p className="text-sm">Deploy your token from the "Deploy Tokens" tab</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'marketplace' && (
                    <div className="space-y-6">
                      {selectedAsset.deploymentStatus?.status === 'deployed' ? (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-3">Marketplace Configuration</h5>
                          
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-gray-500">Sale Status</div>
                                <div className={selectedAsset.saleStatus?.isSaleEnabled ? 'text-green-600 font-medium' : 'text-red-600'}>
                                  {selectedAsset.saleStatus?.isSaleEnabled ? '🟢 Active' : '🔴 Inactive'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Current Price</div>
                                <div>{selectedAsset.saleStatus?.priceInEth || '0'} Flow per token</div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Price per Token (Flow)
                              </label>
                              <input
                                type="number"
                                step="0.001"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            <div className="flex space-x-3">
                              {!selectedAsset.saleStatus?.isSaleEnabled ? (
                                <button
                                  onClick={handleEnableSale}
                                  disabled={updating || !newPrice}
                                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {updating ? 'Enabling...' : 'Enable Sale'}
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={handleUpdatePrice}
                                    disabled={updating || !newPrice}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {updating ? 'Updating...' : 'Update Price'}
                                  </button>
                                  <button
                                    onClick={handleDisableSale}
                                    disabled={updating}
                                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {updating ? 'Disabling...' : 'Disable Sale'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-4">🛍️</div>
                          <p>Marketplace features available after token deployment</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'analytics' && (
                    <div className="space-y-6">
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-4">📈</div>
                        <p>Analytics dashboard coming soon</p>
                        <p className="text-sm">Track sales, investor activity, and performance metrics</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🏢</div>
              <p>Select an asset from the list to view details and manage settings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetManagementPanel;