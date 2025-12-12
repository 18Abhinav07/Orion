// Standalone License Attachment for Existing IPs
import { useState } from 'react';
import { ethers } from 'ethers';
import { getLicenseTermsId, attachLicenseTermsToIp } from '../services/licenseService';
import { getIpIdsForAddress, getIpIdFromTxHash } from '../services/ipIdService';
import { findIpIdByIpfsCid, batchLookupIpIds } from '../services/ipIdLookupService';
import { useAccount } from 'wagmi';
import { useUserAssets } from '../hooks/useUserAssets';

const AENEID_CHAIN_ID = `0x${Number(import.meta.env.VITE_STORY_CHAIN_ID || 1315).toString(16)}`;
const AENEID_CONFIG = {
  chainId: AENEID_CHAIN_ID,
  chainName: 'Story Aeneid Testnet',
  nativeCurrency: {
    name: 'IP',
    symbol: 'IP',
    decimals: 18,
  },
  rpcUrls: [import.meta.env.VITE_STORY_RPC_URL || 'https://aeneid.storyrpc.io'],
  blockExplorerUrls: [import.meta.env.VITE_STORY_EXPLORER || 'https://aeneid.storyscan.xyz'],
};

export default function LicenseAttachment() {
  const { address } = useAccount();
  const { data: assetsData, isLoading: assetsLoading, error: assetsError, refetch } = useUserAssets({ 
    walletAddress: address as string 
  });
  
  const [ipId, setIpId] = useState('');
  const [assetId, setAssetId] = useState(''); // MongoDB asset ID
  const [licenseType, setLicenseType] = useState<'commercial_remix' | 'non_commercial'>('commercial_remix');
  const [royaltyPercent, setRoyaltyPercent] = useState(10);
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [userIpIds, setUserIpIds] = useState<Array<{ tokenId: number; ipId: string }>>([]);
  const [lookupResults, setLookupResults] = useState<Map<string, { ipId: string; tokenId: number }>>(new Map());

  const switchToAeneid = async () => {
    if (!window.ethereum) throw new Error('MetaMask not found');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AENEID_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [AENEID_CONFIG],
        });
      } else {
        throw switchError;
      }
    }
  };

  const handleAttachLicense = async () => {
    if (!ipId.trim()) {
      alert('Please enter an IP ID');
      return;
    }

    setLoading(true);
    setStatus('Processing...');
    setResult(null);

    try {
      // 1. Switch to Aeneid network
      setStatus('🔄 Switching to Aeneid network...');
      await switchToAeneid();

      // 2. Get or register license terms
      setStatus('📋 Getting license terms ID...');
      const licenseTermsId = await getLicenseTermsId(licenseType, royaltyPercent);
      console.log('License Terms ID:', licenseTermsId);

      // 3. Attach license to IP
      setStatus('📎 Attaching license to IP...');
      const { txHash } = await attachLicenseTermsToIp(ipId.trim(), licenseTermsId);

      // 4. Update backend if asset ID provided
      if (assetId.trim()) {
        setStatus('💾 Updating backend...');
        const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';
        
        const updateResponse = await fetch(`${backendUrl}/assets/${assetId}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyIpId: ipId.trim(),
            licenseTermsId,
            licenseTxHash: txHash
          })
        });

        if (!updateResponse.ok) {
          console.warn('Backend update failed:', await updateResponse.text());
        } else {
          console.log('✅ Backend updated successfully');
          // Refetch assets to show updated data
          refetch();
        }
      }

      setStatus('✅ License attached successfully!');
      setResult({
        ipId: ipId.trim(),
        licenseTermsId,
        txHash,
        explorerUrl: `${AENEID_CONFIG.blockExplorerUrls[0]}/tx/${txHash}`
      });

    } catch (err: any) {
      console.error('License attachment error:', err);

      // Check for "License already attached" error (error code 0x55d48f8d)
      const errorMessage = err.message?.toLowerCase() || '';
      const errorData = err.error?.data?.data || err.data?.data || '';

      if (errorMessage.includes('execution reverted') && errorData.includes('55d48f8d')) {
        setStatus('ℹ️ License terms are already attached to this IP!');
        setResult({
          ipId: ipId.trim(),
          licenseTermsId,
          alreadyAttached: true,
          message: 'This IP already has license terms attached. No transaction needed.'
        });
      } else {
        setStatus(`❌ Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMyIpIds = async () => {
    setLoading(true);
    setStatus('🔍 Fetching your IP IDs...');
    
    try {
      if (!window.ethereum) throw new Error('MetaMask not found');
      
      await switchToAeneid();
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      
      console.log('Fetching IP IDs for:', userAddress);
      const ipIds = await getIpIdsForAddress(userAddress);
      
      setUserIpIds(ipIds);
      setStatus(`✅ Found ${ipIds.length} IP(s) owned by your wallet`);
      
      if (ipIds.length > 0) {
        setIpId(ipIds[0].ipId); // Auto-fill first IP ID
      }
    } catch (err: any) {
      console.error('Error fetching IP IDs:', err);
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFromTxHash = async (txHash: string) => {
    setLoading(true);
    setStatus('🔍 Fetching IP ID from transaction...');
    
    try {
      const result = await getIpIdFromTxHash(txHash);
      
      if (result) {
        setIpId(result.ipId);
        setStatus(`✅ Found IP ID from transaction (Token #${result.tokenId})`);
      } else {
        setStatus('❌ Could not find IP ID in transaction');
      }
    } catch (err: any) {
      console.error('Error fetching from tx:', err);
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFindMissingIpIds = async () => {
    if (!assetsData || assetsData.assets.length === 0) {
      setStatus('❌ No assets to search');
      return;
    }

    setLoading(true);
    setStatus('🔍 Searching blockchain for missing IP IDs...');
    
    try {
      // Filter assets that don't have storyIpId
      const assetsNeedingLookup = assetsData.assets.filter(a => !a.storyIpId);
      
      if (assetsNeedingLookup.length === 0) {
        setStatus('✅ All assets already have IP IDs!');
        setLoading(false);
        return;
      }
      
      console.log(`🔍 Found ${assetsNeedingLookup.length} assets without IP IDs`);
      setStatus(`🔍 Searching for ${assetsNeedingLookup.length} missing IP ID(s)...`);
      
      const results = await batchLookupIpIds(
        assetsNeedingLookup.map(a => ({
          _id: a._id,
          ipfsCid: a.ipfsCid,
          creatorWallet: a.creatorWallet
        }))
      );
      
      setLookupResults(results);
      
      if (results.size > 0) {
        setStatus(`✅ Found ${results.size} IP ID(s)! Click "Update Backend" on each asset to save.`);
        
        // Auto-update backend with found IP IDs
        const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';
        let updateCount = 0;
        
        for (const [assetId, { ipId, tokenId }] of results.entries()) {
          try {
            const response = await fetch(`${backendUrl}/assets/${assetId}/finalize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                storyIpId: ipId,
                storyTokenId: tokenId,
                status: 'registered'
              })
            });
            
            if (response.ok) {
              updateCount++;
              console.log(`✅ Updated backend for ${assetId}`);
            }
          } catch (err) {
            console.error(`Failed to update ${assetId}:`, err);
          }
        }
        
        if (updateCount > 0) {
          setStatus(`✅ Found and updated ${updateCount} asset(s) in backend!`);
          refetch(); // Refresh the assets list
        }
      } else {
        setStatus('❌ Could not find any matching IP IDs on blockchain');
      }
      
    } catch (err: any) {
      console.error('Error finding IP IDs:', err);
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">📎 Attach License to Existing IP</h1>

        {!address && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-6 mb-6">
            <p className="text-yellow-300">
              ⚠️ Please connect your wallet to see your assets and attach licenses.
            </p>
          </div>
        )}

        {/* Backend Assets Section */}
        {address && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Your Backend Assets</h2>
            
            {assetsLoading && (
              <p className="text-gray-300">Loading your assets...</p>
            )}
            
            {assetsError && (
              <p className="text-red-400">Error: {assetsError.message}</p>
            )}
            
            {assetsData && assetsData.assets.length === 0 && (
              <p className="text-gray-400">No assets found in backend.</p>
            )}
            
            {assetsData && assetsData.assets.length > 0 && (
              <>
                <div className="mb-4">
                  <button
                    onClick={handleFindMissingIpIds}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-medium transition-all disabled:cursor-not-allowed"
                  >
                    {loading ? '⏳ Searching blockchain...' : '🔍 Find Missing IP IDs (Auto-Update Backend)'}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    This will scan the blockchain for tokens matching your assets' IPFS CIDs and automatically update the backend.
                  </p>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                {assetsData.assets.map((asset) => {
                  // Check if we found an IP ID for this asset
                  const foundIpData = lookupResults.get(asset._id);
                  const displayIpId = asset.storyIpId || foundIpData?.ipId;
                  const displayTokenId = asset.storyTokenId || foundIpData?.tokenId;
                  
                  return (
                  <div
                    key={asset._id}
                    className={`border rounded-lg p-4 transition-all ${
                      assetId === asset._id
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{asset.originalFilename}</h3>
                        <p className="text-xs text-gray-400 font-mono mt-1">
                          ID: {asset._id}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        asset.status === 'registered' ? 'bg-green-500/20 text-green-300' :
                        asset.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {asset.status}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      {displayIpId ? (
                        <div>
                          <span className="text-gray-400">IP ID:</span>
                          {foundIpData && !asset.storyIpId && (
                            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded">
                              Just Found!
                            </span>
                          )}
                          <p className="font-mono text-xs text-green-300 break-all">
                            {displayIpId}
                          </p>
                        </div>
                      ) : (
                        <p className="text-red-400 text-xs">❌ No Story IP ID</p>
                      )}
                      
                      {displayTokenId && (
                        <p className="text-gray-400">Token ID: <span className="text-white">{displayTokenId}</span></p>
                      )}
                      
                      {asset.licenseTermsId ? (
                        <p className="text-green-400 text-xs">✅ Licensed (Terms #{asset.licenseTermsId})</p>
                      ) : (
                        <p className="text-yellow-400 text-xs">⚠️ No license attached</p>
                      )}
                      
                      <p className="text-gray-400 text-xs">
                        IPFS: <span className="text-white">{asset.ipfsCid?.slice(0, 20)}...</span>
                      </p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setAssetId(asset._id);
                        if (displayIpId) {
                          setIpId(displayIpId);
                        }
                      }}
                      className={`mt-3 w-full px-4 py-2 rounded font-medium transition-all ${
                        displayIpId && !asset.licenseTermsId
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : displayIpId
                          ? 'bg-gray-600 hover:bg-gray-700'
                          : 'bg-red-600/50 cursor-not-allowed'
                      }`}
                      disabled={!displayIpId}
                    >
                      {!displayIpId ? '❌ Missing IP ID' :
                       asset.licenseTermsId ? '✓ Already Licensed (Re-license)' :
                       foundIpData && !asset.storyIpId ? '🆕 Select (Just Found!)' :
                       '📎 Select to License'}
                    </button>
                  </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 space-y-6">
          <h2 className="text-2xl font-semibold">License Configuration</h2>
          
          {/* Helper Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleFetchMyIpIds}
              disabled={loading || !address}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed"
            >
              🔍 Fetch IP IDs from Blockchain
            </button>
          </div>
          
          <p className="text-sm text-gray-400">
            👆 Use this if your backend assets don't have IP IDs yet. It will scan the blockchain for tokens you own.
          </p>

          {/* Display fetched IP IDs */}
          {userIpIds.length > 0 && (
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Blockchain IP Assets Found:</h4>
              <p className="text-xs text-gray-400 mb-3">
                These are tokens you own on the Story Protocol blockchain.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {userIpIds.map(({ tokenId, ipId: fetchedIpId }) => (
                  <button
                    key={tokenId}
                    onClick={() => setIpId(fetchedIpId)}
                    className={`w-full text-left px-3 py-2 rounded border ${
                      ipId === fetchedIpId
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-white/20 hover:bg-white/5'
                    } transition-all`}
                  >
                    <div className="font-mono text-sm">
                      <span className="text-gray-400">Token #{tokenId}</span>
                      <br />
                      <span className="text-xs break-all">{fetchedIpId}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* IP ID Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Story IP ID</label>
            <input
              type="text"
              value={ipId}
              onChange={(e) => setIpId(e.target.value)}
              placeholder="0x... (auto-filled when you select an asset above)"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!address}
            />
            <p className="text-xs text-gray-400 mt-1">
              {ipId ? '✓ IP ID ready' : 'Select an asset from above to auto-fill'}
            </p>
          </div>

          {/* Asset ID Input (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">Backend Asset ID</label>
            <input
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="Auto-filled when you select an asset above"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!address}
            />
            <p className="text-xs text-gray-400 mt-1">
              {assetId ? '✓ Will update backend after license attachment' : 'Optional - for backend sync'}
            </p>
          </div>

          {/* License Type */}
          <div>
            <label className="block text-sm font-medium mb-2">License Type</label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value as any)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="commercial_remix">Commercial Remix (with royalties)</option>
              <option value="non_commercial">Non-Commercial (no royalties)</option>
            </select>
          </div>

          {/* Royalty Percent */}
          {licenseType === 'commercial_remix' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Royalty Percentage: {royaltyPercent}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={royaltyPercent}
                onChange={(e) => setRoyaltyPercent(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* Attach Button */}
          <button
            onClick={handleAttachLicense}
            disabled={loading || !ipId.trim() || !address}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 px-8 py-4 rounded-lg font-semibold text-lg transition-all disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Processing...' : 
             !address ? '👛 Connect Wallet First' :
             !ipId.trim() ? '❌ Select an IP Asset First' :
             '📎 Attach License to IP'}
          </button>

          {/* Status */}
          <div className="text-center font-medium">
            {status}
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`mt-6 border-2 rounded-lg p-6 ${
            result.alreadyAttached
              ? 'bg-blue-500/20 border-blue-500'
              : 'bg-green-500/20 border-green-500'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              result.alreadyAttached ? 'text-blue-400' : 'text-green-400'
            }`}>
              {result.alreadyAttached ? 'ℹ️ Already Licensed' : '✅ License Attached!'}
            </h3>

            {result.alreadyAttached && (
              <p className="text-blue-300 mb-4">
                {result.message}
              </p>
            )}

            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="text-gray-400">IP ID:</span>
                <p className={`break-all ${result.alreadyAttached ? 'text-blue-300' : 'text-green-300'}`}>
                  {result.ipId}
                </p>
              </div>
              <div>
                <span className="text-gray-400">License Terms ID:</span>
                <p className={result.alreadyAttached ? 'text-blue-300' : 'text-green-300'}>
                  {result.licenseTermsId}
                </p>
              </div>
              {result.txHash && (
                <div>
                  <span className="text-gray-400">Transaction Hash:</span>
                  <p className="text-green-300 break-all">{result.txHash}</p>
                </div>
              )}
            </div>
            {result.explorerUrl && (
              <a
                href={result.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
              >
                View on Explorer →
              </a>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-white/5 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">📖 How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li><strong>Connect your wallet</strong> - Your backend assets will appear</li>
            <li><strong>Click "Find Missing IP IDs"</strong> - This scans the blockchain for your minted tokens</li>
            <li><strong>Wait for search to complete</strong> - Backend will auto-update with found IP IDs</li>
            <li><strong>Select an asset</strong> - Click the asset you want to license</li>
            <li><strong>Configure license</strong> - Choose type and royalty percentage</li>
            <li><strong>Attach license</strong> - Confirm the transaction in your wallet</li>
          </ol>
          
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded">
            <p className="text-blue-300 text-sm">
              <strong>💡 How It Works:</strong> The "Find Missing IP IDs" button matches your backend assets to blockchain tokens by comparing IPFS metadata URIs. When a match is found, it automatically updates your backend with the IP ID and token number!
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded">
            <p className="text-green-300 text-sm">
              <strong>✨ Your Assets:</strong> You have {assetsData?.assets.filter(a => !a.storyIpId).length || 0} asset(s) missing IP IDs. Click the button above to find them automatically!
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex gap-4">
          <a
            href="/"
            className="flex-1 text-center bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Home
          </a>
          <a
            href={AENEID_CONFIG.blockExplorerUrls[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
          >
            Story Explorer →
          </a>
        </div>
      </div>
    </div>
  );
}
