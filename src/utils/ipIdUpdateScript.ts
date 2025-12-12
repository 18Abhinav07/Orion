// Quick script to fetch IP IDs for backend assets and update them
// Run this in browser console on the license attachment page

import { getIpIdFromTxHash } from '../services/ipIdService';

/**
 * Update backend assets with their IP IDs from transaction hashes
 */
export async function updateBackendAssetsWithIpIds(walletAddress: string) {
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';
  
  console.log('🔍 Fetching assets from backend...');
  const response = await fetch(`${backendUrl}/assets/wallet/${walletAddress}?page=1&limit=50`);
  const data = await response.json();
  
  if (!data.success) {
    console.error('Failed to fetch assets:', data);
    return;
  }

  const assets = data.data.assets;
  console.log(`📋 Found ${assets.length} assets`);

  const results = [];

  for (const asset of assets) {
    if (asset.storyIpId) {
      console.log(`✅ Asset ${asset._id} already has IP ID: ${asset.storyIpId}`);
      results.push({ assetId: asset._id, status: 'already_set', ipId: asset.storyIpId });
      continue;
    }

    // Try to get transaction hash from somewhere
    // Note: Your backend schema doesn't seem to store the mint transaction hash
    // You might need to add this field or get it from your frontend logs
    
    console.log(`⚠️ Asset ${asset._id} (${asset.originalFilename}) has no IP ID and no tx hash stored`);
    results.push({ assetId: asset._id, status: 'missing_data', ipId: null });
  }

  console.log('\n📊 Summary:');
  console.table(results);
  
  return results;
}

/**
 * Manually update a single asset with its IP ID
 */
export async function updateAssetIpId(assetId: string, ipId: string, tokenId?: number) {
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';
  
  const response = await fetch(`${backendUrl}/assets/${assetId}/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storyIpId: ipId,
      storyTokenId: tokenId
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to update asset:', error);
    return false;
  }

  const result = await response.json();
  console.log('✅ Asset updated:', result);
  return true;
}

// Make functions available globally for testing
if (typeof window !== 'undefined') {
  (window as any).updateBackendAssetsWithIpIds = updateBackendAssetsWithIpIds;
  (window as any).updateAssetIpId = updateAssetIpId;
}
