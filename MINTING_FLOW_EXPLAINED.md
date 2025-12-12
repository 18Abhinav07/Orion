# Complete Minting Flow with Backend Updates

## Overview
This document explains how the minting flow saves IP IDs to the backend to prevent "pending" status issues.

## The Full Flow

### 1. Initial Upload & Verification
**File**: `src/pages/TestMinting.tsx` → `testMinting()` function

```typescript
// User uploads file or enters text
const contentHash = await hashFile(file);
const ipMetadataURI = await uploadJSONToIPFS(ipMetadata);
const nftMetadataURI = await uploadJSONToIPFS(nftMetadata);

// Request mint token from backend (includes RAG similarity check)
const token = await verificationService.requestMintToken({
  creatorWallet,
  contentHash,
  ipMetadataURI,
  nftMetadataURI,
  // ... other params
});
```

**Backend Creates**: 
- MintToken record (with nonce)
- Asset record with status: "pending"
- No `storyIpId` or `storyTokenId` yet

---

### 2. On-Chain Minting
**File**: `src/pages/TestMinting.tsx` → `proceedWithMint()` function

```typescript
// Call Story Protocol RegistrationWorkflows
const tx = await workflowsContract.mintAndRegisterIp(
  SPG_NFT_CONTRACT,
  userAddress,
  ipMetadata,
  true // allowDuplicates
);

const receipt = await tx.wait();

// Parse transaction logs to extract IP ID and Token ID
const { ipId, tokenId } = parseIPRegisteredEvent(receipt);
```

**Result**: 
- IP asset created on Story Protocol blockchain
- IP ID (address format): `0x...`
- Token ID (number): `50`, `51`, etc.
- Transaction hash: `0x...`

---

### 3. **CRITICAL**: Update Backend with IP ID
**File**: `src/pages/TestMinting.tsx` → After minting completes

```typescript
// THIS IS THE KEY STEP - Updates asset with blockchain data
await verificationService.updateTokenAfterMint({
  nonce: token.nonce,      // Links to MintToken record
  ipId: mintingResult.ipId,    // Story Protocol IP ID
  tokenId: mintingResult.tokenId,  // NFT token number
  txHash: mintingResult.txHash     // Transaction hash
});
```

**What This Does**:
- Calls: `PATCH /api/verification/token/${nonce}/update`
- Backend updates the Asset record:
  ```javascript
  {
    storyIpId: ipId,           // ← Now populated!
    storyTokenId: tokenId,     // ← Now populated!
    txHash: txHash,
    status: 'registered'       // ← Changed from 'pending'
  }
  ```

**If This Fails**:
- Asset stays with `status: "pending"`
- `storyIpId` remains `null`
- User sees "❌ Missing IP ID" in UI
- **Solution**: Use License Attachment page → "Find Missing IP IDs"

---

### 4. License Attachment
**File**: `src/pages/TestMinting.tsx` → `attachLicense()` function

```typescript
// User configures license (Commercial Remix, 10% royalty, etc.)
const licenseTermsId = await getLicenseTermsId(
  licenseConfig.type,
  licenseConfig.royaltyPercent
);

// Attach license on-chain
const attachTx = await attachLicenseTermsToIp(ipId, licenseTermsId);
```

---

### 5. Finalize Backend with License Info
**File**: `src/pages/TestMinting.tsx` → After license attachment

```typescript
await verificationService.finalizeMint({
  nonce: token.nonce,
  ipId: mintResult.ipId,
  tokenId: mintResult.tokenId,
  txHash: mintResult.txHash,
  licenseTermsId,              // ← License info
  licenseType: licenseConfig.type,
  royaltyPercent: licenseConfig.royaltyPercent,
  licenseTxHash: attachTx.txHash
});
```

**What This Does**:
- Calls: `PATCH /api/verification/token/${nonce}/finalize`
- Backend updates the Asset record:
  ```javascript
  {
    licenseTermsId: '3',        // ← License terms ID
    licenseType: 'commercial_remix',
    royaltyPercent: 10,
    licenseTxHash: '0x...',
    status: 'registered'        // ← Confirmed
  }
  ```

---

## Backend Endpoints Expected

### Endpoint 1: Update After Mint
```
PATCH /api/verification/token/:nonce/update

Body:
{
  "ipId": "0x...",      // Story Protocol IP ID (address)
  "tokenId": 50,        // NFT token number
  "txHash": "0x..."     // Minting transaction hash
}

Response:
{
  "success": true,
  "message": "Asset updated with IP ID",
  "data": { /* updated asset */ }
}
```

**Backend Should**:
1. Find MintToken by nonce
2. Find associated Asset record
3. Update Asset:
   ```javascript
   asset.storyIpId = ipId;
   asset.storyTokenId = tokenId;
   asset.txHash = txHash;
   asset.status = 'registered';
   asset.registeredAt = new Date();
   ```

---

### Endpoint 2: Finalize with License
```
PATCH /api/verification/token/:nonce/finalize

Headers:
{
  "Authorization": "Bearer <jwt_token>"
}

Body:
{
  "ipId": "0x...",
  "tokenId": 50,
  "txHash": "0x...",
  "licenseTermsId": "3",
  "licenseType": "commercial_remix",
  "royaltyPercent": 10,
  "licenseTxHash": "0x..."
}

Response:
{
  "success": true,
  "message": "IP registration finalized",
  "data": { /* fully updated asset */ }
}
```

**Backend Should**:
1. Verify JWT token
2. Find MintToken by nonce
3. Find associated Asset record
4. Update Asset:
   ```javascript
   asset.licenseTermsId = licenseTermsId;
   asset.licenseType = licenseType;
   asset.royaltyPercent = royaltyPercent;
   asset.licenseTxHash = licenseTxHash;
   asset.status = 'registered';
   ```

---

## Why Assets Show "Pending"

Your current issue (Asset #50, #49 showing "pending" with no IP ID):

**Possible Causes**:
1. ✅ **Minting succeeded** on blockchain
2. ❌ **Backend update failed** at step 3
   - Network error
   - Backend endpoint not implemented
   - Backend returned error (500, 400, etc.)
   - CORS issue

3. Result: Asset created with `status: "pending"`, no `storyIpId`

**How to Fix**:
- **Future mints**: Ensure backend endpoints work (check logs)
- **Existing assets**: Use `/license-attachment` → "Find Missing IP IDs"
  - Scans blockchain for your tokens
  - Matches by IPFS CID
  - Auto-updates backend with found IP IDs

---

## Testing Backend Integration

### Test the Update Endpoint:
```bash
# After a successful mint, check console logs
# Should see: "✅ Backend updated successfully with IP ID and token ID"

# If you see: "⚠️ IP minted but backend update failed"
# Check backend logs for errors
```

### Manual Test:
```javascript
// In browser console after minting
const response = await fetch('http://localhost:3001/api/verification/token/1/update', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ipId: '0x...',  // Your IP ID
    tokenId: 50,
    txHash: '0x...'
  })
});

const result = await response.json();
console.log(result);
```

### Verify Asset Updated:
```bash
# Check if asset now has IP ID
curl http://localhost:3001/api/assets/wallet/0x23e67597f0898f747Fa3291C8920168adF9455D0

# Look for:
# "storyIpId": "0x...",    ← Should be populated
# "storyTokenId": 50,      ← Should be populated
# "status": "registered"   ← Should be 'registered'
```

---

## Flow Diagram

```
┌─────────────────┐
│ User Uploads    │
│ File/Content    │
└────────┬────────┘
         │
         v
┌─────────────────────┐
│ Frontend:           │
│ - Hash content      │
│ - Upload to IPFS    │
│ - Create metadata   │
└────────┬────────────┘
         │
         v
┌─────────────────────────────┐
│ Backend: requestMintToken   │
│ - RAG similarity check      │
│ - Create MintToken (nonce)  │
│ - Create Asset (pending)    │ ← Asset created without IP ID
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│ Blockchain: Mint IP         │
│ - Call RegistrationWorkflows│
│ - Get IP ID from event      │
│ - Get Token ID from event   │
└────────┬────────────────────┘
         │
         v
┌──────────────────────────────────┐
│ Backend: updateTokenAfterMint    │  ← CRITICAL STEP
│ PATCH /token/:nonce/update       │
│ - Save storyIpId                 │
│ - Save storyTokenId              │
│ - Change status → 'registered'   │
└────────┬─────────────────────────┘
         │
         v
┌─────────────────────────┐
│ User Configures License │
└────────┬────────────────┘
         │
         v
┌─────────────────────────────┐
│ Blockchain: Attach License  │
│ - Register/get terms        │
│ - Attach to IP              │
└────────┬────────────────────┘
         │
         v
┌──────────────────────────────┐
│ Backend: finalizeMint        │
│ PATCH /token/:nonce/finalize │
│ - Save licenseTermsId        │
│ - Save license details       │
└──────────────────────────────┘
         │
         v
┌─────────────────────┐
│ ✅ Complete!        │
│ Asset fully tracked │
└─────────────────────┘
```

---

## Quick Fixes

### If Backend Update Fails:

**Option 1**: Use License Attachment Page
```
1. Go to /license-attachment
2. Click "Find Missing IP IDs"
3. Waits for blockchain scan
4. Auto-updates backend
```

**Option 2**: Manual Update via API
```bash
curl -X PATCH http://localhost:3001/api/assets/693bf1e6a881c6635090ad3f/finalize \
  -H "Content-Type: application/json" \
  -d '{
    "storyIpId": "0x...",
    "storyTokenId": 50
  }'
```

**Option 3**: Check Backend Logs
```
# Look for errors in backend console
# Common issues:
# - Endpoint not found (404)
# - Validation error (400)
# - Database connection (500)
# - CORS blocking request
```

---

## Summary

✅ **When minting works correctly**:
- Blockchain mint → Extract IP ID → Update backend → Attach license → Finalize backend
- Asset has `storyIpId`, `storyTokenId`, `licenseTermsId`
- Status is `'registered'`
- Shows in `/assets/wallet/` endpoint

❌ **When backend update fails**:
- Blockchain mint → Extract IP ID → ❌ Backend update fails
- Asset stays with `status: 'pending'`, no `storyIpId`
- Shows in backend but can't be licensed
- **Fix**: Use "Find Missing IP IDs" feature

🔧 **Prevention**:
- Monitor console for "✅ Backend updated successfully"
- Check backend logs for errors
- Test endpoints independently
- Ensure CORS allows requests
- Verify nonce-based lookup works
