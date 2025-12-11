# 🚀 API Specification: Story Protocol Minting Flow

**For:** The Frontend Team (aka us)  
**Date:** December 12, 2025  
**Vibe:** Technical but make it fun 💅  
**Purpose:** Know exactly what to send to backend and what to expect back

---

## 📡 Backend Base URL

**Development:** `http://localhost:3001`
**Production:** TBD (will update when deployed)

---

## 🎯 API Endpoints Overview

We got **3 endpoints** to work with:

1. **Generate Mint Token** - Get backend signature for minting
2. **Check Token Status** - See if our token is still valid
3. **Update After Mint** - Tell backend we successfully minted

---

## 1️⃣ Generate Mint Token

**The whole point:** We upload a file (like plan.md), hash it, upload to IPFS, then ask backend "yo, sign this for me so I can mint"

### Request

```http
POST /api/verification/generate-mint-token
Content-Type: application/json
```

**Payload:**
```json
{
  "creatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "contentHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "ipMetadataURI": "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "nftMetadataURI": "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx"
}
```

**Field Breakdown:**
- `creatorAddress`: User's wallet address from MetaMask (the one minting)
- `contentHash`: SHA256 hash of file content (we calculate this in frontend)
- `ipMetadataURI`: IPFS link to IP metadata JSON (we upload to Pinata first)
- `nftMetadataURI`: IPFS link to NFT metadata JSON (also uploaded to Pinata)

### Response (Success)

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "signature": "0x8f3c4d2e1a9b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a",
    "nonce": 42,
    "expiresAt": 1702394125,
    "expiresIn": 900
  }
}
```

**Field Breakdown:**
- `signature`: The ECDSA signature backend created (this is our golden ticket! 🎟️)
- `nonce`: Unique sequential number for this mint attempt
- `expiresAt`: Unix timestamp when signature expires (15 min from now)
- `expiresIn`: Seconds until expiry (always 900 = 15 minutes)

### Response (Error - Duplicate Content)

**Status:** `409 Conflict`

```json
{
  "success": false,
  "error": "DUPLICATE_CONTENT",
  "message": "This content has already been minted",
  "existingMint": {
    "ipId": "0xabc...",
    "tokenId": 123,
    "txHash": "0xdef..."
  }
}
```

**What this means:** Someone already minted this exact content. No double-dipping!

### Response (Error - Invalid Input)

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": "INVALID_INPUT",
  "message": "Missing required field: contentHash"
}
```

---

## 2️⃣ Check Token Status

**The whole point:** "Hey backend, is my signature still good or did it expire?"

### Request

```http
GET /api/verification/token/42/status
```

**URL Params:**
- `42` = the nonce we got from endpoint #1

### Response (Token Still Pending)

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "nonce": 42,
    "status": "pending",
    "isExpired": false,
    "remainingSeconds": 847,
    "expiresAt": 1702394125,
    "createdAt": 1702393225
  }
}
```

**Field Breakdown:**
- `status`: Can be `"pending"`, `"used"`, `"expired"`, or `"revoked"`
- `isExpired`: Boolean - is it past expiry time?
- `remainingSeconds`: How much time left before it expires (only if pending)

### Response (Token Already Used)

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "nonce": 42,
    "status": "used",
    "isExpired": false,
    "mintDetails": {
      "ipId": "0x1234567890abcdef1234567890abcdef12345678",
      "tokenId": 123,
      "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "usedAt": 1702393500
    }
  }
}
```

**What this means:** Token was already consumed in a successful mint. Shows us the details!

### Response (Token Expired)

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "nonce": 42,
    "status": "expired",
    "isExpired": true,
    "expiresAt": 1702394125
  }
}
```

**What this means:** Took too long, signature expired. Need to request a new one.

### Response (Token Not Found)

**Status:** `404 Not Found`

```json
{
  "success": false,
  "error": "TOKEN_NOT_FOUND",
  "message": "No token found with nonce: 42"
}
```

---

## 3️⃣ Update After Mint

**The whole point:** "Yo backend, I just minted successfully! Here's the proof."

### Request

```http
PATCH /api/verification/token/42/update
Content-Type: application/json
```

**Payload:**
```json
{
  "ipId": "0x1234567890abcdef1234567890abcdef12345678",
  "tokenId": 123,
  "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
}
```

**Field Breakdown:**
- `ipId`: The IP ID we got from Story Protocol after minting
- `tokenId`: The NFT token ID from the transaction
- `txHash`: Transaction hash from blockchain

### Response (Success)

**Status:** `200 OK`

```json
{
  "success": true,
  "message": "Token marked as used",
  "data": {
    "nonce": 42,
    "status": "used",
    "usedAt": 1702393500
  }
}
```

### Response (Error - Already Used)

**Status:** `409 Conflict`

```json
{
  "success": false,
  "error": "TOKEN_ALREADY_USED",
  "message": "This token has already been used",
  "existingMint": {
    "ipId": "0xabc...",
    "tokenId": 456,
    "txHash": "0xdef...",
    "usedAt": 1702393300
  }
}
```

**What this means:** Someone already used this token (or we called this endpoint twice by accident)

### Response (Error - Token Not Found)

**Status:** `404 Not Found`

```json
{
  "success": false,
  "error": "TOKEN_NOT_FOUND",
  "message": "No token found with nonce: 42"
}
```

---

## 🔄 Complete Flow Example

Here's how we're gonna use these endpoints in our frontend:

### Step 1: User Uploads plan.md

```javascript
// Frontend code flow (not actual implementation, just the vibe)

// 1. User selects file
const file = selectedFile; // plan.md

// 2. Read and hash content
const content = await file.text();
const contentHash = sha256(content); // "0x1234..."

// 3. Upload to IPFS
const ipMetadata = await uploadToIPFS({
  name: "My Plan",
  description: "Strategic planning document"
});
const nftMetadata = await uploadToIPFS({
  name: "Plan NFT",
  image: "ipfs://..." // thumbnail or whatever
});

// 4. Get user's wallet address
const userAddress = await signer.getAddress(); // "0x742d..."
```

### Step 2: Request Backend Signature

```javascript
// Call Endpoint #1
const response = await fetch('http://localhost:3001/api/verification/generate-mint-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creatorAddress: userAddress,
    contentHash: contentHash,
    ipMetadataURI: ipMetadata.uri,
    nftMetadataURI: nftMetadata.uri
  })
});

const { signature, nonce, expiresAt } = (await response.json()).data;
// signature: "0x8f3c4d2e..."
// nonce: 42
// expiresAt: 1702394125
```

### Step 3: Call Smart Contract

```javascript
// Now we got the signature, let's mint!
const tx = await orionVerifiedMinter.verifyAndMint(
  userAddress,           // to
  contentHash,           // contentHash
  ipMetadata.uri,        // ipMetadataURI
  nftMetadata.uri,       // nftMetadataURI
  nonce,                 // nonce (42)
  expiresAt,             // expiryTimestamp
  signature              // signature from backend
);

const receipt = await tx.wait();
// Parse events to get ipId and tokenId
```

### Step 4: Tell Backend It Worked

```javascript
// Call Endpoint #3
await fetch(`http://localhost:3001/api/verification/token/${nonce}/update`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ipId: parsedIpId,
    tokenId: parsedTokenId,
    txHash: receipt.transactionHash
  })
});

// Done! Show success screen to user 🎉
```

---

## 🚨 Error Handling Strategy

**What we need to handle in frontend:**

### Network Errors
```javascript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    // Handle HTTP errors (400, 404, 409, 500, etc.)
  }
} catch (error) {
  // Handle network failures (no internet, server down, etc.)
  console.error("Backend unreachable:", error);
}
```

### Timeout Handling
```javascript
// Start countdown timer when we get signature
const timeRemaining = expiresIn; // 900 seconds
setInterval(() => {
  if (timeRemaining <= 0) {
    // Show "Signature expired, please try again" message
  }
}, 1000);
```

### Duplicate Content
```javascript
if (error.error === 'DUPLICATE_CONTENT') {
  // Show message: "This content was already minted!"
  // Maybe show link to existing token/IP
}
```

---

## 🎯 Summary for Frontend Dev

**When user wants to mint:**

1. **Hash their file** → `contentHash`
2. **Upload metadata to IPFS** → `ipMetadataURI`, `nftMetadataURI`
3. **POST to `/api/verification/generate-mint-token`** → Get `signature`, `nonce`, `expiresAt`
4. **Call contract's `verifyAndMint()`** with those params
5. **Wait for transaction** → Get `ipId`, `tokenId`, `txHash` from events
6. **PATCH to `/api/verification/token/:nonce/update`** → Tell backend we succeeded

**Optional but nice:**
- Periodically **GET `/api/verification/token/:nonce/status`** to check if token expired while user was doing something else

---

**That's it babe! Everything we need to integrate with backend. Clean, clear, and ready to code. 💋**
