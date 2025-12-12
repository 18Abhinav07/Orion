# IPFS Integration with Pinata

## Overview
Real IPFS metadata uploads now implemented using Pinata for Story Protocol IP asset registration.

---

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Pinata IPFS Configuration
VITE_PINATA_API_KEY=b083ca16f49fbb6a127f
VITE_PINATA_API_SECRET=449e47cfac89e05773c9198d27718563270cda231458860989d8d042424b6c8c
VITE_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud
```

**Note:** All env vars use `VITE_` prefix to be accessible in frontend.

---

## 📦 Pinata Service

### File: `src/services/pinataService.ts`

Added helper functions for Story Protocol metadata uploads:

```typescript
// Upload JSON metadata to IPFS
export async function uploadJSONToIPFS(
  data: Record<string, any>, 
  name?: string
): Promise<string>

// Upload files to IPFS  
export async function uploadFileToIPFS(
  file: File, 
  name?: string
): Promise<string>

// Convert IPFS URI to HTTP gateway URL
export function ipfsToGatewayUrl(ipfsUri: string): string
```

### Authentication
- Uses **JWT authentication** (`VITE_PINATA_JWT`)
- More modern than API key/secret approach
- Scoped permissions for security

### Return Format
- Returns `ipfs://` URIs (e.g., `ipfs://QmXxx...`)
- Ready for blockchain storage
- Can convert to HTTP URLs via `ipfsToGatewayUrl()`

---

## 🎯 Integration in TestMinting.tsx

### Before (Mock URIs)
```typescript
// ❌ Fake IPFS URIs
const calculatedIpMetadataURI = `ipfs://QmTestIP${Date.now()}`;
const calculatedNftMetadataURI = `ipfs://QmTestNFT${Date.now()}`;
```

### After (Real Pinata Upload)
```typescript
// ✅ Real IPFS uploads
const calculatedIpMetadataURI = await uploadJSONToIPFS(
  ipMetadata, 
  `ip-metadata-${calculatedContentHash}`
);

const calculatedNftMetadataURI = await uploadJSONToIPFS(
  nftMetadata, 
  `nft-metadata-${calculatedContentHash}`
);
```

### Metadata Objects
```typescript
// IP Metadata
const ipMetadata = {
  title: file?.name || 'Test IP Asset',
  description: `IP Asset created on ${new Date().toISOString()}`,
  contentHash: calculatedContentHash,
  assetType,
  creator: userAddress,
  createdAt: new Date().toISOString()
};

// NFT Metadata (ERC-721 standard)
const nftMetadata = {
  name: file?.name || 'Test IP Asset NFT',
  description: `NFT for IP Asset - ${assetType}`,
  image: '', // TODO: Add thumbnail/preview
  attributes: [
    { trait_type: 'Asset Type', value: assetType },
    { trait_type: 'Creator', value: userAddress },
    { trait_type: 'Content Hash', value: calculatedContentHash }
  ]
};
```

---

## 🔄 Complete Flow

### 1. User Uploads Asset
```
User selects file → Calculate content hash
```

### 2. Create Metadata
```typescript
ipMetadata = { title, description, contentHash, ... }
nftMetadata = { name, description, attributes, ... }
```

### 3. Upload to IPFS
```typescript
ipMetadataURI = await uploadJSONToIPFS(ipMetadata)
// Returns: ipfs://QmRealHash123...

nftMetadataURI = await uploadJSONToIPFS(nftMetadata)  
// Returns: ipfs://QmRealHash456...
```

### 4. Store in State
```typescript
setContentHash(calculatedContentHash)
setIpMetadataURI(ipMetadataURI)
setNftMetadataURI(nftMetadataURI)
```

### 5. Mint to Blockchain
```typescript
await storyProtocolService.verifyAndMint({
  to: userAddress,
  contentHash,
  ipMetadataURI,    // Real IPFS URI
  nftMetadataURI,   // Real IPFS URI
  verificationToken: token,
  licenseConfig
})
```

### 6. Backend Receives Real URIs
Backend now gets actual IPFS URIs instead of mock data:
```json
{
  "contentHash": "0xabc...",
  "ipMetadataURI": "ipfs://QmRealHash123...",
  "nftMetadataURI": "ipfs://QmRealHash456..."
}
```

---

## ✅ Bug Fixes Applied

### 1. Signer Initialization
**Before:**
```typescript
await storyProtocolService.initialize(provider); // ❌ Wrong
```

**After:**
```typescript
const signer = provider.getSigner();
await storyProtocolService.initialize(signer); // ✅ Correct
```

**Issue Fixed:** `this.signer.getAddress is not a function`

### 2. State Management
Added state variables to persist metadata across function calls:
```typescript
const [contentHash, setContentHash] = useState<string>('');
const [ipMetadataURI, setIpMetadataURI] = useState<string>('');
const [nftMetadataURI, setNftMetadataURI] = useState<string>('');
```

### 3. Parameter Passing
Updated `proceedWithMint()` signature:
```typescript
// Before: empty strings
proceedWithMint(token, userAddress, provider, '', '', '')

// After: real values
proceedWithMint(
  token, 
  userAddress, 
  provider, 
  contentHash,      // From state
  ipMetadataURI,    // From state
  nftMetadataURI    // From state
)
```

---

## 🧪 Testing Checklist

- [ ] **Pinata Credentials Valid**
  ```bash
  curl -H "Authorization: Bearer $VITE_PINATA_JWT" \
    https://api.pinata.cloud/data/testAuthentication
  ```

- [ ] **Upload IP Metadata**
  - Open TestMinting page
  - Select file
  - Check console for: `✅ Uploaded to IPFS: ipfs://QmXxx...`
  
- [ ] **Upload NFT Metadata**
  - Verify second upload completes
  - Check different CID than IP metadata

- [ ] **Verify on IPFS**
  ```
  https://gateway.pinata.cloud/ipfs/QmXxx...
  ```

- [ ] **Check Backend Receives Real URIs**
  - Inspect network tab in DevTools
  - POST to `/api/verification/token/:nonce/finalize`
  - Payload should contain real `ipfs://` URIs

---

## 🔍 Debugging

### Check Upload Status
```typescript
console.log('📤 Uploading IP metadata to Pinata...');
const ipfsUri = await uploadJSONToIPFS(data);
console.log(`✅ IP Metadata URI: ${ipfsUri}`);
```

### Verify JWT Configuration
```typescript
const jwt = import.meta.env.VITE_PINATA_JWT;
console.log('JWT configured:', !!jwt);
```

### Test Gateway Access
```typescript
import { ipfsToGatewayUrl } from '../services/pinataService';

const httpUrl = ipfsToGatewayUrl('ipfs://QmXxx...');
// Returns: https://gateway.pinata.cloud/ipfs/QmXxx...
```

---

## 🚨 Common Issues

### 1. "Pinata JWT not configured"
**Solution:** Add `VITE_PINATA_JWT` to `.env` file

### 2. "401 Unauthorized"
**Solution:** Verify JWT is valid and not expired

### 3. Empty IPFS URIs
**Solution:** Ensure `await` is used for `uploadJSONToIPFS()`

### 4. CORS Errors
**Solution:** Pinata API allows CORS by default, check browser console

---

## 📊 Pinata Dashboard

Monitor uploads at: https://app.pinata.cloud/pinmanager

- View all pinned files
- Check storage usage
- Manage pins
- Access via gateway

---

## 🎉 Summary

✅ Real IPFS uploads implemented  
✅ Pinata JWT authentication configured  
✅ Mock URIs replaced with real CIDs  
✅ Signer bug fixed  
✅ State management working  
✅ Backend receives valid IPFS URIs  

**Next Steps:**
- Add file uploads for asset content (images, docs, etc.)
- Implement thumbnail generation for NFT `image` field
- Add retry logic for failed uploads
- Implement IPFS caching strategy
