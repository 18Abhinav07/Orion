/**
 * @fileoverview Admin Dashboard Component
 * @description Main dashboard for admin operations in ERC-3643 dApp
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { adminService } from '../../services/adminService.js';
import { pinataService } from '../../services/pinataService.js';
import AssetApprovalPanel from './AssetApprovalPanel';
import UserManagementPanel from './UserManagementPanel';
import AttestationPanel from './AttestationPanel';

interface AdminDashboardProps {
  provider: ethers.providers.Web3Provider;
  contractAddresses: {
    attestationRegistry: string;
    userRegistry: string;
    assetRegistry: string;
    tokenFactory: string;
    atomicSaleContract: string;
  };
}

interface DashboardStats {
  totalAssets: number;
  pendingAssets: number;
  totalIssuers: number;
  totalManagers: number;
  totalAttestations: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ provider, contractAddresses }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    pendingAssets: 0,
    totalIssuers: 0,
    totalManagers: 0,
    totalAttestations: 0
  });

  // Initialize services
  useEffect(() => {
    initializeServices();
  }, [provider]);

  const initializeServices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize Pinata service (you'll need to add your API keys)
      pinataService.initialize(
        process.env.REACT_APP_PINATA_API_KEY || '',
        process.env.REACT_APP_PINATA_SECRET_KEY || ''
      );

      // Test Pinata connection
      const pinataAuth = await pinataService.testAuthentication();
      if (!pinataAuth) {
        console.warn('Pinata authentication failed - IPFS features may not work');
      }

      // Initialize admin service
      await adminService.initialize(provider, contractAddresses);

      // Check if current user is admin
      const adminStatus = await adminService.isAdmin();
      setIsAdmin(adminStatus);

      if (adminStatus) {
        // Load dashboard stats
        await loadDashboardStats();
      }

      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize admin dashboard:', err);
      setError(err instanceof Error ? err.message : 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      // This would be implemented with actual contract calls
      // For now, using placeholder data
      const allAssets = await adminService.getAllAssets();
      const pendingAssets = await adminService.getPendingAssets();

      setStats({
        totalAssets: allAssets.length,
        pendingAssets: pendingAssets.length,
        totalIssuers: 0, // Would fetch from UserRegistry
        totalManagers: 0, // Would fetch from UserRegistry
        totalAttestations: 0 // Would fetch from AttestationRegistry
      });
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Admin Dashboard...</p>
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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <strong className="font-bold">Access Denied: </strong>
            <span className="block sm:inline">You do not have admin privileges.</span>
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
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ERC-3643
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Connected as Admin</span>
              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">A</span>
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
                    <span className="text-white text-sm font-bold">A</span>
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
                    <span className="text-white text-sm font-bold">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Assets</dt>
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
                    <span className="text-white text-sm font-bold">I</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Issuers</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalIssuers}</dd>
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
                    <span className="text-white text-sm font-bold">M</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Managers</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalManagers}</dd>
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
                    <span className="text-white text-sm font-bold">T</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Attestations</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalAttestations}</dd>
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
                { id: 'asset-approval', name: 'Asset Approval', icon: '✅', badge: stats.pendingAssets },
                { id: 'user-management', name: 'User Management', icon: '👥' },
                { id: 'attestations', name: 'Attestations', icon: '📜' }
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
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-600">
                    Welcome to the ERC-3643 Admin Dashboard. From here you can:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Approve asset registrations by creating attestations</li>
                    <li>Manage issuer and manager accounts</li>
                    <li>Monitor attestation status and validity</li>
                    <li>Oversee the overall system health</li>
                  </ul>
                  
                  {stats.pendingAssets > 0 && (
                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Attention Required
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              You have {stats.pendingAssets} asset(s) waiting for approval. 
                              Please review them in the Asset Approval tab.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'asset-approval' && (
              <AssetApprovalPanel onStatsUpdate={loadDashboardStats} />
            )}

            {activeTab === 'user-management' && (
              <UserManagementPanel onStatsUpdate={loadDashboardStats} />
            )}

            {activeTab === 'attestations' && (
              <AttestationPanel onStatsUpdate={loadDashboardStats} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;