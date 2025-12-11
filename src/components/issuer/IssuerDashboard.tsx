/**
 * @fileoverview Issuer Dashboard Component
 * @description Main dashboard for issuer operations in ERC-3643 dApp
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { issuerService } from '../../services/issuerService.js';
import AssetRegistrationForm from './AssetRegistrationForm';
import AssetManagementPanel from './AssetManagementPanel';
// import TokenDeploymentPanel from './TokenDeploymentPanel'; // DISABLED - Using legacy contracts now

interface IssuerDashboardProps {
  provider: ethers.providers.Web3Provider;
  contractAddresses: {
    attestationRegistry: string;
    userRegistry: string;
    assetRegistry: string;
    tokenFactory: string;
    atomicSaleContract: string;
    identityRegistry: string;
    compliance: string;
  };
}

interface DashboardStats {
  totalAssets: number;
  pendingAssets: number;
  deployedAssets: number;
  activeAssets: number;
  totalValueLocked: string;
}

interface IssuerInfo {
  metadata: string;
  registrationTime: number;
  isActive: boolean;
}

const IssuerDashboard: React.FC<IssuerDashboardProps> = ({ provider, contractAddresses }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issuerInfo, setIssuerInfo] = useState<IssuerInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    pendingAssets: 0,
    deployedAssets: 0,
    activeAssets: 0,
    totalValueLocked: '0'
  });

  // Initialize services
  useEffect(() => {
    initializeServices();
  }, [provider]);

  const initializeServices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize issuer service
      await issuerService.initialize(provider, contractAddresses);

      // Check if current user is authorized issuer
      const authorized = await issuerService.isAuthorizedIssuer();
      setIsAuthorized(authorized);

      if (authorized) {
        // Load issuer info and stats
        await loadIssuerInfo();
        await loadDashboardStats();
      }

      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize issuer dashboard:', err);
      setError(err instanceof Error ? err.message : 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const loadIssuerInfo = async () => {
    try {
      const info = await issuerService.getIssuerInfo();
      setIssuerInfo(info);
    } catch (err) {
      console.error('Failed to load issuer info:', err);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const assets = await issuerService.getMyAssets();
      
      let pendingCount = 0;
      let deployedCount = 0;
      let activeCount = 0;
      let totalValue = 0;

      for (const asset of assets) {
        if (asset.status === 'pending-approval' || asset.status === 'approved') {
          pendingCount++;
        } else if (asset.status === 'deployed' || asset.status === 'completed') {
          deployedCount++;
          if (asset.status === 'completed') {
            activeCount++;
          }
        }
        
        if (asset.valuation) {
          totalValue += asset.valuation;
        }
      }

      setStats({
        totalAssets: assets.length,
        pendingAssets: pendingCount,
        deployedAssets: deployedCount,
        activeAssets: activeCount,
        totalValueLocked: totalValue.toLocaleString()
      });
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleAssetCreated = (assetId: string) => {
    console.log('New asset created:', assetId);
    setActiveTab('assets');
    loadDashboardStats();
  };

  const handleRefreshStats = () => {
    loadDashboardStats();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Issuer Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button
            onClick={initializeServices}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Access Denied: </strong>
            <span className="block sm:inline">
              You are not registered as an authorized issuer. Please contact the admin to get issuer privileges.
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Issuer registration is required to tokenize real-world assets on this ERC-3643 compliant platform.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Issuer Dashboard</h1>
              <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ERC-3643 Compliant
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">Authorized Issuer</div>
                {issuerInfo && (
                  <div className="text-xs text-gray-500">
                    Registered: {new Date(issuerInfo.registrationTime * 1000).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">I</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📊</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Assets</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalAssets}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">⏳</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Approval</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pendingAssets}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🚀</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Deployed</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.deployedAssets}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">💰</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Assets</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.activeAssets}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">💎</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                    <dd className="text-lg font-medium text-gray-900">${stats.totalValueLocked}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'register', name: 'Register Asset', icon: '➕' },
                { id: 'assets', name: 'My Assets', icon: '🏢', badge: stats.totalAssets },
                { id: 'deploy', name: 'Deploy Tokens', icon: '🚀', badge: stats.pendingAssets },
                { id: 'manage', name: 'Asset Management', icon: '⚙️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap flex py-4 px-6 border-b-2 font-medium text-sm items-center space-x-2`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                  {tab.badge && tab.badge > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Issuer Overview</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-600 mb-4">
                    Welcome to your ERC-3643 compliant asset tokenization dashboard. As an authorized issuer, you can:
                  </p>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Asset Lifecycle</h4>
                      <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                        <li>Register new real-world assets</li>
                        <li>Submit assets for admin approval</li>
                        <li>Deploy ERC-3643 compliant tokens</li>
                        <li>Mint initial token supply</li>
                        <li>Enable marketplace trading</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Compliance Features</h4>
                      <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                        <li>Legal attestation requirements</li>
                        <li>KYC/AML compliance integration</li>
                        <li>Regulatory jurisdiction support</li>
                        <li>Automated compliance checks</li>
                        <li>IPFS document storage</li>
                      </ul>
                    </div>
                  </div>
                  
                  {stats.pendingAssets > 0 && (
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">
                            Action Required
                          </h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>
                              You have {stats.pendingAssets} asset(s) pending approval or ready for deployment. 
                              Check the "Deploy Tokens" tab to proceed.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {stats.totalAssets === 0 && (
                    <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">
                            Get Started
                          </h3>
                          <div className="mt-2 text-sm text-green-700">
                            <p>
                              Ready to tokenize your first asset? Click on "Register Asset" to start the process.
                            </p>
                          </div>
                          <div className="mt-3">
                            <button
                              onClick={() => setActiveTab('register')}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Register Your First Asset
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'register' && (
              <AssetRegistrationForm
                onAssetCreated={handleAssetCreated}
                onCancel={() => setActiveTab('overview')}
              />
            )}

            {activeTab === 'assets' && (
              <AssetManagementPanel onStatsUpdate={handleRefreshStats} />
            )}

            {activeTab === 'deploy' && (
              // TokenDeploymentPanel DISABLED - Using legacy issuer service now
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-green-800 font-medium">✅ Legacy Contract Mode Active</h3>
                <p className="text-green-700 text-sm mt-1">
                  Direct issuer minting enabled - No multisig or SPV wallet restrictions.
                  Use the main "Start Tokenization" button to create tokens.
                </p>
              </div>
            )}

            {activeTab === 'manage' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Management</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-yellow-800">
                    Asset management features will be available here. This includes:
                  </p>
                  <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                    <li>Update asset pricing</li>
                    <li>Manage marketplace listings</li>
                    <li>View sales analytics</li>
                    <li>Handle compliance updates</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssuerDashboard;