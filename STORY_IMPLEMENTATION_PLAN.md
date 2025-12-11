# 🎯 STORY PROTOCOL IMPLEMENTATION PLAN
## Backend Verification Minting - The Chill Version

**Date:** December 12, 2025  
**Network:** Story Protocol Aeneid Testnet (Chain ID: 1315)  
**Vibe:** Relaxed AF 💅  
**Goal:** Mint plan.md with backend verification ✅ | plan2.md fails without it ❌

---

## 🔥 THE WHOLE POINT

Listen babe, here's what we're doing:

**Scenario 1: plan.md (The Good Girl Path)**
- You upload plan.md
- Backend checks it out, likes what it sees
- Backend signs off on it (ECDSA signature)
- You take that signature to the contract
- Contract goes "yup, backend approved this"
- IP gets minted, everyone's happy 🎉

**Scenario 2: plan2.md (The Sneaky Bitch Path)**  
- You try to mint plan2.md directly
- No backend signature (because you're being sneaky)
- Contract goes "nah bro, where's the backend signature?"
- Transaction FAILS, no IP for you 🚫

---

## 📍 WHAT WE GOT ALREADY

**Deployed Contracts:**
- OrionVerifiedMinter: `0x9cb153775B639DCa50F1BA7a6daa34af12466450`
- SPG_NFT_COLLECTION: `0x15aAe0E870Aab25B09F4453239967e0aff1868C2`
- Backend Verifier: `0x23e67597f0898f747Fa3291C8920168adF9455D0`

**Network:**
- Chain ID: 1315 (Story Aeneid Testnet)
- RPC: https://aeneid.storyrpc.io
- Explorer: https://aeneid.storyscan.xyz

---

## 🎯 THE PLAN (NO CODE, JUST VIBES)
Phase 3: Smart Contract Integration      → 1-2 hours
Phase 4: User Flow & UI                  → 2-3 hours
Testing & Debugging                      → 2-3 hours
─────────────────────────────────────────────────────
Total Estimated Time:                     9-14 hours
```

---

## 2️⃣ ARCHITECTURE OVERVIEW

### **Complete Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Alice)                              │
│  - Connects MetaMask to Story Aeneid Testnet               │
│  - Has plan.md file with original content                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 1. Upload plan.md
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React)                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Step 1: Upload File                                │     │
│  │  - Read file content                               │     │
│  │  - Generate SHA256 hash                            │     │
│  │  - Upload to IPFS (Pinata)                         │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 2. Request Verification Token
                           │    POST /api/verification/generate-mint-token
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND API                                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Endpoint: /api/verification/generate-mint-token    │     │
│  │                                                     │     │
│  │ Input:                                              │     │
│  │  - creatorAddress: 0xAlice...                      │     │
│  │  - contentHash: 0xabc123...                        │     │
│  │  - ipMetadataURI: ipfs://Qm...                     │     │
│  │  - nftMetadataURI: ipfs://Qm...                    │     │
│  │                                                     │     │
│  │ Process:                                            │     │
│  │  1. Generate unique nonce (sequential)             │     │
│  │  2. Calculate expiry (now + 15 minutes)            │     │
│  │  3. Create message hash:                           │     │
│  │     solidityPackedKeccak256([                      │     │
│  │       creatorAddress,                              │     │
│  │       contentHash,                                 │     │
│  │       ipMetadataURI,                               │     │
│  │       nftMetadataURI,                              │     │
│  │       nonce,                                       │     │
│  │       expiryTimestamp                              │     │
│  │     ])                                             │     │
│  │  4. Sign with backend verifier private key         │     │
│  │  5. Store in MongoDB mint_tokens collection        │     │
│  │                                                     │     │
│  │ Output:                                             │     │
│  │  {                                                  │     │
│  │    signature: "0x1234...",                         │     │
│  │    nonce: 42,                                      │     │
│  │    expiresAt: 1702394125                           │     │
│  │  }                                                  │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 3. Return signature to frontend
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React)                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Step 2: Call Smart Contract                        │     │
│  │                                                     │     │
│  │ Contract: OrionVerifiedMinter                      │     │
│  │ Function: verifyAndMint()                          │     │
│  │                                                     │     │
│  │ Parameters:                                         │     │
│  │  - to: userAddress                                 │     │
│  │  - contentHash: 0xabc123...                        │     │
│  │  - ipMetadataURI: ipfs://Qm...                     │     │
│  │  - nftMetadataURI: ipfs://Qm...                    │     │
│  │  - nonce: 42                                       │     │
│  │  - expiryTimestamp: 1702394125                     │     │
│  │  - signature: 0x1234... (from backend)             │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 4. Transaction to blockchain
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         ORION VERIFIED MINTER CONTRACT                       │
│  0x9cb153775B639DCa50F1BA7a6daa34af12466450               │
│                                                              │
│  function verifyAndMint(...) {                              │
│    // Step 1: Verify signature                             │
│    bytes32 messageHash = keccak256(abi.encodePacked(       │
│      to, contentHash, ipMetadataURI,                       │
│      nftMetadataURI, nonce, expiryTimestamp                │
│    ));                                                      │
│                                                              │
│    address signer = ECDSA.recover(messageHash, signature);  │
│    require(signer == backendVerifier, "Invalid signature"); │
│                                                              │
│    // Step 2: Check expiry                                  │
│    require(block.timestamp <= expiryTimestamp, "Expired");  │
│                                                              │
│    // Step 3: Check nonce not used                          │
│    require(!usedNonces[nonce], "Nonce already used");      │
│    usedNonces[nonce] = true;                               │
│                                                              │
│    // Step 4: Mint NFT via SPG                              │
│    spgNftContract.mintAndRegisterIp(to, ipMetadata);       │
│  }                                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 5. Mint IP Asset
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         SPG NFT COLLECTION                                   │
│  0x15aAe0E870Aab25B09F4453239967e0aff1868C2               │
│                                                              │
│  function mintAndRegisterIp(to, ipMetadata) {              │
│    // Mint NFT                                              │
│    uint256 tokenId = _nextTokenId++;                       │
│    _safeMint(to, tokenId);                                 │
│                                                              │
│    // Register on Story Protocol                            │
│    address ipId = IPAssetRegistry.register(               │
│      address(this),                                        │
│      tokenId,                                              │
│      ipMetadata                                            │
│    );                                                      │
│                                                              │
│    emit IPRegistered(ipId, tokenId, to);                   │
│    return ipId;                                            │
│  }                                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 6. Return ipId & tokenId
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React)                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Step 3: Update Backend                             │     │
│  │                                                     │     │
│  │ PATCH /api/verification/token/{nonce}/update       │     │
│  │  - status: 'used'                                  │     │
│  │  - ipId: 0xIP123...                                │     │
│  │  - tokenId: 1                                      │     │
│  │  - txHash: 0x789...                                │     │
│  │                                                     │     │
│  │ Display Success:                                    │     │
│  │  ✅ IP Asset Registered!                           │     │
│  │  - IP ID: 0xIP123...                               │     │
│  │  - Token ID: #1                                    │     │
│  │  - View on Explorer                                │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### **Security Flow (Why plan2.md Fails)**

```
User tries to mint plan2.md WITHOUT backend verification:

1. User calls OrionVerifiedMinter.verifyAndMint() directly
   ↓
2. Contract tries to recover signer from signature
   ↓
3. Options:
   a) No signature provided → Transaction reverts immediately
   b) Random/invalid signature → Recovered signer ≠ backendVerifier
   c) Old/expired signature → block.timestamp > expiryTimestamp
   d) Reused signature → usedNonces[nonce] == true
   ↓
4. ❌ Transaction FAILS with one of:
   - "Invalid signature"
   - "Signature expired"
   - "Nonce already used"
```

---

## 3️⃣ PHASE 1: BACKEND VERIFICATION SYSTEM

### **3.1 Database Schema (MongoDB)**

```javascript
// Collection: mint_tokens
{
  _id: ObjectId,
  nonce: Number,              // Sequential, unique
  creatorAddress: String,     // 0x... (indexed)
  contentHash: String,        // 0x... (indexed)
  ipMetadataURI: String,
  nftMetadataURI: String,
  signature: String,          // 0x... ECDSA signature
  expiresAt: Date,            // Timestamp + 15 minutes
  status: String,             // 'pending' | 'used' | 'expired' | 'revoked'
  
  // After minting
  ipId: String,               // 0x... (Story Protocol IP ID)
  tokenId: Number,            // NFT token ID
  txHash: String,             // Transaction hash
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  usedAt: Date                // When signature was consumed
}

// Indexes
db.mint_tokens.createIndex({ nonce: 1 }, { unique: true });
db.mint_tokens.createIndex({ creatorAddress: 1 });
db.mint_tokens.createIndex({ contentHash: 1 });
db.mint_tokens.createIndex({ expiresAt: 1 });
db.mint_tokens.createIndex({ status: 1 });
```

### **3.2 Backend API Endpoints**

#### **Endpoint 1: Generate Mint Token**

```typescript
POST /api/verification/generate-mint-token

// Request Body
{
  creatorAddress: "0x23e67597f0898f747Fa3291C8920168adF9455D0",
  contentHash: "0xabc123def456...",  // SHA256 of file content
  ipMetadataURI: "ipfs://Qm...",
  nftMetadataURI: "ipfs://Qm..."
}

// Response (Success)
{
  success: true,
  data: {
    signature: "0x1234567890abcdef...",
    nonce: 42,
    expiresAt: 1702394125,  // Unix timestamp
    expiresIn: 900          // Seconds (15 minutes)
  }
}

// Response (Error - Duplicate Content)
{
  success: false,
  error: {
    code: "DUPLICATE_CONTENT",
    message: "Content already registered",
    existingIpId: "0xIP123..."
  }
}
```

**Implementation:**

```javascript
// backend/routes/verification.js
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const MintToken = require('../models/MintToken');

// Backend verifier wallet (keep private key SECURE!)
const BACKEND_VERIFIER_PRIVATE_KEY = process.env.BACKEND_VERIFIER_PRIVATE_KEY;
const verifierWallet = new ethers.Wallet(BACKEND_VERIFIER_PRIVATE_KEY);

const TOKEN_EXPIRY_SECONDS = 900; // 15 minutes

router.post('/generate-mint-token', async (req, res) => {
  try {
    const { creatorAddress, contentHash, ipMetadataURI, nftMetadataURI } = req.body;
    
    // Validation
    if (!ethers.isAddress(creatorAddress)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid creator address' }
      });
    }
    
    // Check for duplicate content
    const existing = await MintToken.findOne({ 
      contentHash, 
      status: 'used' 
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_CONTENT',
          message: 'Content already registered',
          existingIpId: existing.ipId
        }
      });
    }
    
    // Generate nonce (sequential)
    const lastToken = await MintToken.findOne().sort({ nonce: -1 });
    const nonce = lastToken ? lastToken.nonce + 1 : 1;
    
    // Calculate expiry
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
    
    // Create message hash (MUST match Solidity keccak256)
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'bytes32', 'string', 'string', 'uint256', 'uint256'],
      [creatorAddress, contentHash, ipMetadataURI, nftMetadataURI, nonce, expiresAt]
    );
    
    // Sign with backend verifier private key
    const signature = await verifierWallet.signMessage(ethers.getBytes(messageHash));
    
    // Store in database
    const mintToken = new MintToken({
      nonce,
      creatorAddress,
      contentHash,
      ipMetadataURI,
      nftMetadataURI,
      signature,
      expiresAt: new Date(expiresAt * 1000),
      status: 'pending'
    });
    
    await mintToken.save();
    
    res.json({
      success: true,
      data: {
        signature,
        nonce,
        expiresAt,
        expiresIn: TOKEN_EXPIRY_SECONDS
      }
    });
    
  } catch (error) {
    console.error('Error generating mint token:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

module.exports = router;
```

#### **Endpoint 2: Check Token Status**

```typescript
GET /api/verification/token/:nonce/status

// Response (Pending)
{
  success: true,
  data: {
    nonce: 42,
    status: "pending",
    creatorAddress: "0x23e67...",
    expiresAt: 1702394125,
    isExpired: false,
    remainingSeconds: 654
  }
}

// Response (Used)
{
  success: true,
  data: {
    nonce: 42,
    status: "used",
    ipId: "0xIP123...",
    tokenId: 1,
    txHash: "0x789...",
    usedAt: 1702393500
  }
}
```

**Implementation:**

```javascript
// backend/routes/verification.js (add to existing file)

router.get('/token/:nonce/status', async (req, res) => {
  try {
    const { nonce } = req.params;
    
    const token = await MintToken.findOne({ nonce: parseInt(nonce) });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Token not found' }
      });
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAtUnix = Math.floor(token.expiresAt.getTime() / 1000);
    const isExpired = now > expiresAtUnix;
    
    // Auto-update status if expired
    if (isExpired && token.status === 'pending') {
      token.status = 'expired';
      await token.save();
    }
    
    const response = {
      success: true,
      data: {
        nonce: token.nonce,
        status: token.status,
        creatorAddress: token.creatorAddress,
        expiresAt: expiresAtUnix,
        isExpired
      }
    };
    
    if (token.status === 'pending') {
      response.data.remainingSeconds = Math.max(0, expiresAtUnix - now);
    }
    
    if (token.status === 'used') {
      response.data.ipId = token.ipId;
      response.data.tokenId = token.tokenId;
      response.data.txHash = token.txHash;
      response.data.usedAt = Math.floor(token.usedAt.getTime() / 1000);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Error checking token status:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});
```

#### **Endpoint 3: Update Token After Mint**

```typescript
PATCH /api/verification/token/:nonce/update

// Request Body
{
  ipId: "0xIP123abc...",
  tokenId: 1,
  txHash: "0x789def..."
}

// Response (Success)
{
  success: true,
  message: "Token updated successfully"
}

// Response (Error - Already Used)
{
  success: false,
  error: {
    code: "ALREADY_USED",
    message: "Token has already been used"
  }
}
```

**Implementation:**

```javascript
// backend/routes/verification.js (add to existing file)

router.patch('/token/:nonce/update', async (req, res) => {
  try {
    const { nonce } = req.params;
    const { ipId, tokenId, txHash } = req.body;
    
    const token = await MintToken.findOne({ nonce: parseInt(nonce) });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Token not found' }
      });
    }
    
    if (token.status === 'used') {
      return res.status(409).json({
        success: false,
        error: { 
          code: 'ALREADY_USED', 
          message: 'Token has already been used',
          existingIpId: token.ipId
        }
      });
    }
    
    // Update token
    token.status = 'used';
    token.ipId = ipId;
    token.tokenId = tokenId;
    token.txHash = txHash;
    token.usedAt = new Date();
    
    await token.save();
    
    res.json({
      success: true,
      message: 'Token updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating token:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});
```

### **3.3 MongoDB Model**

```javascript
// backend/models/MintToken.js
const mongoose = require('mongoose');

const mintTokenSchema = new mongoose.Schema({
  nonce: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  creatorAddress: {
    type: String,
    required: true,
    index: true,
    lowercase: true
  },
  contentHash: {
    type: String,
    required: true,
    index: true
  },
  ipMetadataURI: {
    type: String,
    required: true
  },
  nftMetadataURI: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'used', 'expired', 'revoked'],
    default: 'pending',
    index: true
  },
  
  // After minting
  ipId: String,
  tokenId: Number,
  txHash: String,
  usedAt: Date
}, {
  timestamps: true  // Adds createdAt and updatedAt automatically
});

// Auto-expire tokens
mintTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 }); // Delete after 24 hours

module.exports = mongoose.model('MintToken', mintTokenSchema);
```

---

## 4️⃣ PHASE 2: FRONTEND INTEGRATION

### **4.1 Verification Service**

```typescript
// src/services/verificationService.ts

import { ethers } from 'ethers';

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';

export interface MintTokenResponse {
  signature: string;
  nonce: number;
  expiresAt: number;
  expiresIn: number;
}

export interface TokenStatus {
  nonce: number;
  status: 'pending' | 'used' | 'expired' | 'revoked';
  creatorAddress: string;
  expiresAt: number;
  isExpired: boolean;
  remainingSeconds?: number;
  ipId?: string;
  tokenId?: number;
  txHash?: string;
  usedAt?: number;
}

export class VerificationService {
  
  /**
   * Request backend signature for minting
   * This is your golden ticket, babe! 🎟️
   */
  async generateMintToken(params: {
    creatorAddress: string;
    contentHash: string;
    ipMetadataURI: string;
    nftMetadataURI: string;
  }): Promise<MintTokenResponse> {
    try {
      const response = await fetch(
        `${BACKEND_API_URL}/verification/generate-mint-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to generate mint token');
      }
      
      return result.data;
      
    } catch (error) {
      console.error('Error generating mint token:', error);
      throw error;
    }
  }
  
  /**
   * Check if your token is still hot or not 🔥
   */
  async checkTokenStatus(nonce: number): Promise<TokenStatus> {
    try {
      const response = await fetch(
        `${BACKEND_API_URL}/verification/token/${nonce}/status`
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to check token status');
      }
      
      return result.data;
      
    } catch (error) {
      console.error('Error checking token status:', error);
      throw error;
    }
  }
  
  /**
   * Tell backend "mission accomplished" 🎯
   */
  async updateTokenAfterMint(params: {
    nonce: number;
    ipId: string;
    tokenId: number;
    txHash: string;
  }): Promise<void> {
    try {
      const response = await fetch(
        `${BACKEND_API_URL}/verification/token/${params.nonce}/update`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ipId: params.ipId,
            tokenId: params.tokenId,
            txHash: params.txHash
          })
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update token');
      }
      
    } catch (error) {
      console.error('Error updating token:', error);
      throw error;
    }
  }
  
  /**
   * Hash your content like a boss 💪
   */
  hashContent(content: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(content));
  }
  
  /**
   * Calculate how much time you got left ⏰
   */
  getRemainingTime(expiresAt: number): {
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, expiresAt - now);
    
    return {
      minutes: Math.floor(remaining / 60),
      seconds: remaining % 60,
      isExpired: remaining === 0
    };
  }
}

export const verificationService = new VerificationService();
```

### **4.2 Story Protocol Service (Wrapper Contract Integration)**

```typescript
// src/services/storyProtocolService.ts

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/lib/contractAddress';

// OrionVerifiedMinter ABI (just the functions we need)
const ORION_VERIFIED_MINTER_ABI = [
  "function verifyAndMint(address to, bytes32 contentHash, string ipMetadataURI, string nftMetadataURI, uint256 nonce, uint256 expiryTimestamp, bytes signature) returns (address ipId, uint256 tokenId)",
  "function backendVerifier() view returns (address)",
  "function spgNftContract() view returns (address)",
  "function usedNonces(uint256) view returns (bool)"
];

export interface MintResult {
  ipId: string;
  tokenId: number;
  txHash: string;
}

export class StoryProtocolService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  
  /**
   * Initialize with MetaMask, baby! 🦊
   */
  async initialize(provider: ethers.BrowserProvider) {
    this.provider = provider;
    this.signer = await provider.getSigner();
  }
  
  /**
   * The main event - mint that IP asset! 🎉
   */
  async verifyAndMint(params: {
    contentHash: string;
    ipMetadataURI: string;
    nftMetadataURI: string;
    nonce: number;
    expiryTimestamp: number;
    signature: string;
  }): Promise<MintResult> {
    
    if (!this.signer) {
      throw new Error('Service not initialized. Connect wallet first!');
    }
    
    const userAddress = await this.signer.getAddress();
    
    // Get contract instance
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.STORY_AENEID_TESTNET.ORION_VERIFIED_MINTER,
      ORION_VERIFIED_MINTER_ABI,
      this.signer
    );
    
    console.log('🎯 Calling verifyAndMint...');
    console.log('To:', userAddress);
    console.log('Content Hash:', params.contentHash);
    console.log('Nonce:', params.nonce);
    console.log('Expiry:', params.expiryTimestamp);
    
    // Call the contract
    const tx = await contract.verifyAndMint(
      userAddress,
      params.contentHash,
      params.ipMetadataURI,
      params.nftMetadataURI,
      params.nonce,
      params.expiryTimestamp,
      params.signature
    );
    
    console.log('📝 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    console.log('✅ Transaction confirmed!');
    
    // Parse events to get ipId and tokenId
    // Note: This depends on your contract's event structure
    // You might need to adjust based on actual events emitted
    const ipId = receipt.logs[0]?.topics[1] || '0x'; // Adjust based on actual event
    const tokenId = parseInt(receipt.logs[0]?.topics[2] || '0'); // Adjust based on actual event
    
    return {
      ipId,
      tokenId,
      txHash: receipt.hash
    };
  }
  
  /**
   * Check if a nonce has been used (anti-replay protection) 🛡️
   */
  async isNonceUsed(nonce: number): Promise<boolean> {
    if (!this.provider) {
      throw new Error('Service not initialized');
    }
    
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.STORY_AENEID_TESTNET.ORION_VERIFIED_MINTER,
      ORION_VERIFIED_MINTER_ABI,
      this.provider
    );
    
    return await contract.usedNonces(nonce);
  }
  
  /**
   * Get the backend verifier address (for verification) ✅
   */
  async getBackendVerifier(): Promise<string> {
    if (!this.provider) {
      throw new Error('Service not initialized');
    }
    
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.STORY_AENEID_TESTNET.ORION_VERIFIED_MINTER,
      ORION_VERIFIED_MINTER_ABI,
      this.provider
    );
    
    return await contract.backendVerifier();
  }
}

export const storyProtocolService = new StoryProtocolService();
```

---

**Part 2 done! Want Part 3 with the complete user flow, UI components, and testing? Drop a "keep going" and I'll finish this off! 🔥**
