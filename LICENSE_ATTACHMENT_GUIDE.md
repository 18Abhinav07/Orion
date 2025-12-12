# License Attachment Guide

## Overview
This guide explains how to attach licenses to your already-minted IP assets on Story Protocol.

## The Problem
Your backend shows assets with `status: "pending"` and no `storyIpId`. This means:
1. The assets were registered in the backend (via `mintToken`)
2. But the Story Protocol minting transaction data wasn't saved
3. You need to get the IP IDs from the blockchain and attach licenses

## Solution

### Option 1: Use the License Attachment UI (Recommended)

1. **Navigate to the page:**
   ```
   http://localhost:5173/license-attachment
   ```

2. **Click "Fetch My IP IDs":**
   - Connects to your wallet
   - Scans the SPG NFT contract for tokens you own
   - Displays all your IP assets with their IP IDs

3. **Select an IP:**
   - Click on any IP from the list
   - It will auto-fill the IP ID field

4. **Configure License:**
   - Choose license type (Commercial Remix or Non-Commercial)
   - Set royalty percentage (for commercial)
   
5. **Enter Asset ID (Optional):**
   - Copy the MongoDB `_id` from your backend response
   - Example: `693bf1e6a881c6635090ad3f`
   - If provided, the backend will be updated automatically

6. **Attach License:**
   - Click "Attach License"
   - Approve the transaction in MetaMask
   - Wait for confirmation

### Option 2: Programmatic Approach

#### Get IP IDs for your wallet:

```typescript
import { getIpIdsForAddress } from './services/ipIdService';

const userAddress = '0x23e67597f0898f747Fa3291C8920168adF9455D0';
const ipIds = await getIpIdsForAddress(userAddress);

console.log('Your IP assets:', ipIds);
// Output: [{ tokenId: 1, ipId: '0x...' }, { tokenId: 2, ipId: '0x...' }]
```

#### Attach license to a specific IP:

```typescript
import { getLicenseTermsId, attachLicenseTermsToIp } from './services/licenseService';

// 1. Get or register license terms
const licenseTermsId = await getLicenseTermsId('commercial_remix', 10);

// 2. Attach to IP
const { txHash } = await attachLicenseTermsToIp(ipId, licenseTermsId);

console.log('License attached! TX:', txHash);
```

#### Update backend with IP ID:

```typescript
const backendUrl = 'http://localhost:3001/api';
const assetId = '693bf1e6a881c6635090ad3f'; // MongoDB _id

await fetch(`${backendUrl}/assets/${assetId}/finalize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storyIpId: '0x...', // IP ID from blockchain
    storyTokenId: 50, // Token ID
    licenseTermsId: '3', // License terms ID
    licenseTxHash: '0x...' // Transaction hash
  })
});
```

## Batch Processing

If you have multiple assets to process:

```typescript
import { getIpIdsForAddress } from './services/ipIdService';
import { getLicenseTermsId, attachLicenseTermsToIp } from './services/licenseService';

const userAddress = '0x23e67597f0898f747Fa3291C8920168adF9455D0';
const backendUrl = 'http://localhost:3001/api';

// 1. Get all your IP IDs
const ipAssets = await getIpIdsForAddress(userAddress);
console.log(`Found ${ipAssets.length} IP assets`);

// 2. Get your backend assets
const response = await fetch(`${backendUrl}/assets/wallet/${userAddress}`);
const { data } = await response.json();
const backendAssets = data.assets;

// 3. Get or create license terms (do this once)
const licenseTermsId = await getLicenseTermsId('commercial_remix', 10);

// 4. For each IP asset
for (const { tokenId, ipId } of ipAssets) {
  try {
    // Attach license
    const { txHash } = await attachLicenseTermsToIp(ipId, licenseTermsId);
    console.log(`✅ Licensed Token #${tokenId} - TX: ${txHash}`);
    
    // Find matching backend asset (you'll need to match by some criteria)
    // For now, we can match by tokenId if it's stored
    const matchingAsset = backendAssets.find(a => a.storyTokenId === tokenId);
    
    if (matchingAsset) {
      // Update backend
      await fetch(`${backendUrl}/assets/${matchingAsset._id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyIpId: ipId,
          storyTokenId: tokenId,
          licenseTermsId,
          licenseTxHash: txHash
        })
      });
      console.log(`✅ Updated backend for asset ${matchingAsset._id}`);
    }
    
    // Rate limit to avoid overwhelming the RPC
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (err) {
    console.error(`❌ Failed for Token #${tokenId}:`, err);
  }
}
```

## Matching Backend Assets to IP IDs

The challenge is matching your backend assets to blockchain IP IDs. Here are the strategies:

### Strategy 1: By Token ID
If your backend stores `storyTokenId`, you can match directly:

```typescript
const ipAsset = ipAssets.find(ip => ip.tokenId === backendAsset.storyTokenId);
```

### Strategy 2: By Transaction Hash
If you stored the mint transaction hash anywhere (logs, database):

```typescript
import { getIpIdFromTxHash } from './services/ipIdService';

const { ipId, tokenId } = await getIpIdFromTxHash('0x...');
```

### Strategy 3: Manual Matching
Use the UI to view your IPs and manually match them to backend assets by looking at:
- Creation timestamps
- Token IDs
- Metadata URIs

### Strategy 4: Query by Metadata URI
Since each IP has unique metadata on IPFS, you can match by `ipfsCid`:

```typescript
// This requires fetching token metadata from the blockchain
// and comparing it to backend asset.ipfsCid
```

## Common Issues

### "Could not find IP ID"
- The token may not have been minted on-chain
- Check transaction hash on Story Explorer
- Verify the transaction completed successfully

### "License already attached"
- Each IP can have multiple license terms
- Check if the specific terms ID is already attached
- You can still attach additional license terms

### "Transaction reverted"
- Ensure you're on Aeneid testnet
- Check you have enough IP tokens for gas
- Verify the IP ID is valid

### "Backend update failed"
- Check the asset ID is correct
- Verify the `/assets/:id/finalize` endpoint exists
- Check backend logs for errors

## Verification

After attaching licenses, verify on Story Protocol:

1. **Check on Explorer:**
   ```
   https://aeneid.storyscan.xyz/address/{YOUR_IP_ID}
   ```

2. **Verify License Terms:**
   - Should show license terms ID
   - Check royalty percentage
   - Verify license type

3. **Check Backend:**
   ```bash
   curl http://localhost:3001/api/assets/wallet/{YOUR_ADDRESS}
   ```
   - Verify `storyIpId` is populated
   - Check `licenseTermsId` is set
   - Ensure `status` is updated

## Best Practices

1. **Test with One Asset First**
   - Attach license to a single IP
   - Verify everything works
   - Then batch process

2. **Keep Transaction Hashes**
   - Save all transaction hashes
   - Useful for debugging
   - Required for backend updates

3. **Rate Limiting**
   - Don't spam the RPC endpoint
   - Add delays between batch operations
   - Use Promise.all with caution

4. **Error Handling**
   - Wrap in try-catch
   - Log failures separately
   - Retry failed operations

## Next Steps

After attaching licenses, you can:
1. List assets on marketplace
2. Set up royalty distribution
3. Allow derivative works
4. Track revenue shares

## Support

If you encounter issues:
1. Check browser console for detailed errors
2. Verify wallet is connected to Aeneid testnet
3. Check Story Protocol explorer for on-chain data
4. Review backend logs for API errors
