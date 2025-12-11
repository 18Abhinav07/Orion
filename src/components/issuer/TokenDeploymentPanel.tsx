/**
 * @fileoverview Token Deployment Panel Component
 * @description Handles token deployment and minting for approved assets
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { issuerService } from '../../services/issuerService.js';

interface TokenDeploymentPanelProps {
  onStatsUpdate: () => void;
}

interface ApprovedAsset {
  assetId: string;
  title: string;
  description: string;
  valuation: number;
  status: string;
  metadataCID: string;
  tokenAddress?: string;
  deploymentStatus?: any;
}

interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  spvWallet: string;
}

interface InitialMintData {
  recipients: string[];
  amounts: string[];
}

interface SaleConfig {
  enableSale: boolean;
  pricePerToken: string;
}

const TokenDeploymentPanel: React.FC<TokenDeploymentPanelProps> = ({ onStatsUpdate }) => {
  const [approvedAssets, setApprovedAssets] = useState<ApprovedAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ApprovedAsset | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [tokenConfig, setTokenConfig] = useState<TokenConfig>({
    name: '',
    symbol: '',
    decimals: 18,
    spvWallet: ''
  });

  const [initialMintData, setInitialMintData] = useState<InitialMintData>({
    recipients: [''],
    amounts: ['']
  });

  const [saleConfig, setSaleConfig] = useState<SaleConfig>({
    enableSale: false,
    pricePerToken: '1.0'
  });

  const deploymentSteps = [
    { id: 1, title: 'Configure Token', description: 'Set token name, symbol, and parameters' },
    { id: 2, title: 'Initial Minting', description: 'Define initial token distribution' },
    { id: 3, title: 'Marketplace Setup', description: 'Configure trading parameters' },
    { id: 4, title: 'Deploy & Launch', description: 'Deploy token and enable trading' }
  ];

  useEffect(() => {
    loadApprovedAssets();
  }, []);

  const loadApprovedAssets = async () => {
    try {
      setLoading(true);
      setError(null);

      const assets = await issuerService.getMyAssets();
      
      // Filter for approved assets or those ready for deployment
      const readyAssets = await Promise.all(
        assets
          .filter(asset => 
            asset.status === 'approved' || 
            asset.status === 'pending-approval' || 
            asset.status === 'deployed'
          )
          .map(async (asset) => {
            try {
              // Get deployment status for each asset
              const deploymentStatus = await issuerService.getAssetDeploymentStatus(asset.assetId);
              return {
                ...asset,
                deploymentStatus
              };
            } catch (err) {
              console.warn(`Failed to get deployment status for ${asset.assetId}:`, err);
              return asset;
            }
          })
      );

      setApprovedAssets(readyAssets);
    } catch (err) {
      console.error('Failed to load approved assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetSelect = (asset: ApprovedAsset) => {
    setSelectedAsset(asset);
    setCurrentStep(1);
    setError(null);

    // Pre-fill token configuration
    setTokenConfig({
      name: asset.title,
      symbol: generateTokenSymbol(asset.title),
      decimals: 18,
      spvWallet: '' // Will be filled by user
    });

    // Reset other forms
    setInitialMintData({
      recipients: [''],
      amounts: ['']
    });

    setSaleConfig({
      enableSale: false,
      pricePerToken: '1.0'
    });
  };

  const generateTokenSymbol = (title: string) => {
    return title
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 5);
  };

  const addRecipient = () => {
    setInitialMintData(prev => ({
      recipients: [...prev.recipients, ''],
      amounts: [...prev.amounts, '']
    }));
  };

  const removeRecipient = (index: number) => {
    if (initialMintData.recipients.length > 1) {
      setInitialMintData(prev => ({
        recipients: prev.recipients.filter((_, i) => i !== index),
        amounts: prev.amounts.filter((_, i) => i !== index)
      }));
    }
  };

  const updateRecipient = (index: number, field: 'address' | 'amount', value: string) => {
    setInitialMintData(prev => {
      const newData = { ...prev };
      if (field === 'address') {
        newData.recipients[index] = value;
      } else {
        newData.amounts[index] = value;
      }
      return newData;
    });
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(tokenConfig.name && tokenConfig.symbol && tokenConfig.spvWallet && 
                 ethers.utils.isAddress(tokenConfig.spvWallet));
      case 2:
        return initialMintData.recipients.every((addr, i) => 
          ethers.utils.isAddress(addr) && parseFloat(initialMintData.amounts[i]) > 0
        );
      case 3:
        return !saleConfig.enableSale || parseFloat(saleConfig.pricePerToken) > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) {
      setError('Please fill in all required fields correctly');
      return;
    }
    
    if (currentStep < deploymentSteps.length) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleDeploy = async () => {
    if (!selectedAsset) return;

    try {
      setProcessing(true);
      setError(null);

      console.log('Starting token deployment workflow...');

      // Step 1: Deploy token
      console.log('Deploying token...');
      const deployResult = await issuerService.deployTokenAfterApproval(
        selectedAsset.assetId,
        tokenConfig
      );

      // Step 2: Enable minting
      console.log('Enabling minting...');
      await issuerService.enableMinting(selectedAsset.assetId);

      // Step 3: Batch mint initial supply
      if (initialMintData.recipients.length > 0 && initialMintData.recipients[0]) {
        console.log('Minting initial supply...');
        const amounts = initialMintData.amounts.map(amount => 
          ethers.utils.parseEther(amount)
        );
        
        await issuerService.batchMintInitialSupply(
          selectedAsset.assetId,
          initialMintData.recipients,
          amounts
        );
      }

      // Step 4: Enable sale if configured
      if (saleConfig.enableSale) {
        console.log('Enabling marketplace sale...');
        const priceInWei = ethers.utils.parseEther(saleConfig.pricePerToken);
        await issuerService.enableAssetSale(selectedAsset.assetId, priceInWei);
      }

      console.log('Token deployment completed successfully!');
      
      // Refresh data
      await loadApprovedAssets();
      onStatsUpdate();
      
      // Reset form
      setSelectedAsset(null);
      setCurrentStep(1);

      alert('Token deployed successfully! Your asset is now live on the blockchain.');

    } catch (err) {
      console.error('Token deployment failed:', err);
      setError(err instanceof Error ? err.message : 'Token deployment failed');
    } finally {
      setProcessing(false);
    }
  };

  const renderStepContent = () => {
    if (!selectedAsset) return null;

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Name *
              </label>
              <input
                type="text"
                value={tokenConfig.name}
                onChange={(e) => setTokenConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Manhattan Office Building Token"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Symbol *
              </label>
              <input
                type="text"
                value={tokenConfig.symbol}
                onChange={(e) => setTokenConfig(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                placeholder="e.g., MOBT"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decimals
              </label>
              <select
                value={tokenConfig.decimals}
                onChange={(e) => setTokenConfig(prev => ({ ...prev, decimals: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={18}>18 (Standard)</option>
                <option value={6}>6 (USDC-like)</option>
                <option value={0}>0 (Whole numbers only)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SPV Wallet Address *
              </label>
              <input
                type="text"
                value={tokenConfig.spvWallet}
                onChange={(e) => setTokenConfig(prev => ({ ...prev, spvWallet: e.target.value }))}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Special Purpose Vehicle wallet address for T+1 settlement and minting operations
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Initial Token Distribution</h4>
              <button
                onClick={addRecipient}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Add Recipient
              </button>
            </div>

            {initialMintData.recipients.map((recipient, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Address *
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={initialMintData.amounts[index]}
                      onChange={(e) => updateRecipient(index, 'amount', e.target.value)}
                      placeholder="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {initialMintData.recipients.length > 1 && (
                    <button
                      onClick={() => removeRecipient(index)}
                      className="mt-6 bg-red-600 text-white px-2 py-2 rounded text-sm hover:bg-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">Minting Summary</h4>
              <div className="text-sm text-blue-800">
                <div>Recipients: {initialMintData.recipients.filter(addr => addr).length}</div>
                <div>
                  Total Supply: {
                    initialMintData.amounts
                      .filter(amount => amount && !isNaN(parseFloat(amount)))
                      .reduce((sum, amount) => sum + parseFloat(amount), 0)
                      .toLocaleString()
                  } {tokenConfig.symbol}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="enableSale"
                checked={saleConfig.enableSale}
                onChange={(e) => setSaleConfig(prev => ({ ...prev, enableSale: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableSale" className="text-sm font-medium text-gray-700">
                Enable marketplace trading immediately after deployment
              </label>
            </div>

            {saleConfig.enableSale && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Token (U2U) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={saleConfig.pricePerToken}
                  onChange={(e) => setSaleConfig(prev => ({ ...prev, pricePerToken: e.target.value }))}
                  placeholder="1.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Price per token in U2U. This can be updated later.
                </p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Marketplace Configuration</h4>
              <div className="text-sm text-yellow-800 space-y-1">
                {saleConfig.enableSale ? (
                  <>
                    <div>✅ Trading will be enabled immediately</div>
                    <div>💰 Price: {saleConfig.pricePerToken} U2U per token</div>
                    <div>🔄 Investors can purchase tokens via AtomicSaleContract</div>
                  </>
                ) : (
                  <>
                    <div>⏸️ Trading will not be enabled automatically</div>
                    <div>📝 You can enable trading later from the Asset Management panel</div>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review Deployment Configuration</h3>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Asset Information</h4>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div><strong>Title:</strong> {selectedAsset.title}</div>
                  <div><strong>Valuation:</strong> ${selectedAsset.valuation.toLocaleString()}</div>
                  <div><strong>Asset ID:</strong> {selectedAsset.assetId}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Token Configuration</h4>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div><strong>Name:</strong> {tokenConfig.name}</div>
                  <div><strong>Symbol:</strong> {tokenConfig.symbol}</div>
                  <div><strong>Decimals:</strong> {tokenConfig.decimals}</div>
                  <div><strong>SPV Wallet:</strong> {tokenConfig.spvWallet}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Initial Distribution</h4>
                <div className="mt-2 text-sm text-gray-600">
                  <div><strong>Recipients:</strong> {initialMintData.recipients.filter(addr => addr).length}</div>
                  <div><strong>Total Supply:</strong> {
                    initialMintData.amounts
                      .filter(amount => amount && !isNaN(parseFloat(amount)))
                      .reduce((sum, amount) => sum + parseFloat(amount), 0)
                      .toLocaleString()
                  } {tokenConfig.symbol}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Marketplace</h4>
                <div className="mt-2 text-sm text-gray-600">
                  <div><strong>Trading Enabled:</strong> {saleConfig.enableSale ? 'Yes' : 'No'}</div>
                  {saleConfig.enableSale && (
                    <div><strong>Price:</strong> {saleConfig.pricePerToken} U2U per token</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">Deployment Process</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Deploy ERC-3643 compliant token contract</li>
                <li>Enable minting capabilities</li>
                <li>Mint initial token supply to specified recipients</li>
                {saleConfig.enableSale && <li>Enable marketplace trading</li>}
                <li>Asset becomes live and tradeable</li>
              </ol>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading approved assets...</span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-6">Token Deployment</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Asset Selection */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Select Asset ({approvedAssets.length})
          </h4>
          
          {approvedAssets.length === 0 ? (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <span>No assets ready for deployment. Please submit assets for approval first.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedAssets.map((asset) => (
                <div
                  key={asset.assetId}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedAsset?.assetId === asset.assetId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleAssetSelect(asset)}
                >
                  <h5 className="font-medium text-gray-900 mb-1">{asset.title}</h5>
                  <p className="text-sm text-gray-600 mb-2">${asset.valuation.toLocaleString()}</p>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className={`px-2 py-1 rounded-full ${
                      asset.deploymentStatus?.status === 'deployed' 
                        ? 'bg-green-100 text-green-800'
                        : asset.status === 'approved'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {asset.deploymentStatus?.status === 'deployed' ? 'Deployed' : 
                       asset.status === 'approved' ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                  
                  {asset.deploymentStatus?.tokenAddress && (
                    <div className="mt-2 text-xs text-gray-500">
                      Token: {asset.deploymentStatus.tokenAddress.slice(0, 6)}...{asset.deploymentStatus.tokenAddress.slice(-4)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deployment Configuration */}
        <div className="lg:col-span-2">
          {selectedAsset ? (
            <div>
              {/* Progress Steps */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  {deploymentSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full border ${
                        currentStep >= step.id 
                          ? 'bg-blue-600 border-blue-600 text-white text-xs' 
                          : 'border-gray-300 text-gray-500 text-xs'
                      }`}>
                        {currentStep > step.id ? '✓' : step.id}
                      </div>
                      <div className="ml-2 hidden sm:block">
                        <div className={`text-xs font-medium ${
                          currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </div>
                      </div>
                      {index < deploymentSteps.length - 1 && (
                        <div className={`hidden sm:block w-6 h-0.5 mx-2 ${
                          currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step Content */}
              <div className="bg-white border rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  {deploymentSteps[currentStep - 1].title}
                </h4>
                
                {renderStepContent()}

                {/* Navigation */}
                <div className="mt-6 flex justify-between">
                  <div>
                    {currentStep > 1 && (
                      <button
                        onClick={handlePreviousStep}
                        disabled={processing}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                    )}
                  </div>

                  <div>
                    {currentStep < deploymentSteps.length ? (
                      <button
                        onClick={handleNextStep}
                        disabled={processing || !validateCurrentStep()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        onClick={handleDeploy}
                        disabled={processing || !validateCurrentStep()}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing ? (
                          <span className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Deploying...
                          </span>
                        ) : (
                          'Deploy Token'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🚀</div>
              <p>Select an approved asset to start token deployment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenDeploymentPanel;