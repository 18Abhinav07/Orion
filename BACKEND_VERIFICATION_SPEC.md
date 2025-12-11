# Backend Verification System Specification
## IP Asset Minting Authorization & Signature Generation

**Version:** 1.0  
**Date:** December 12, 2025  
**Purpose:** Define backend verification system for authorizing IP asset minting on Story Protocol  
**Integration:** Works with `OrionVerifiedMinter` smart contract

---

## 🎯 System Overview

The backend verification system acts as a **security gate** between content creators and blockchain minting. Only content that passes fingerprinting, similarity checks, and business logic validation receives a cryptographically signed authorization token that enables minting.

### **Core Responsibilities**

1. **Content Validation** - Fingerprint generation, similarity detection, duplicate prevention
2. **Authorization Token Generation** - Create time-bound, single-use signed tokens
3. **Nonce Management** - Track used tokens, prevent replay attacks
4. **Session State** - Maintain creation flow state across multi-step process
5. **Audit Trail** - Log all verification attempts and outcomes

---

## 🔐 Cryptographic Architecture

### **Signing Key Management**

**Verifier Keypair:**
- **Private Key**: Stored in backend environment, NEVER exposed
- **Public Address**: Hardcoded in `OrionVerifiedMinter` smart contract
- **Algorithm**: ECDSA (secp256k1 curve, same as Ethereum)
- **Key Rotation**: Deploy new wrapper contract if compromised

**Environment Variables:**
```bash
# Backend .env
BACKEND_VERIFIER_PRIVATE_KEY=0x1234567890abcdef...  # 64 hex characters
BACKEND_VERIFIER_ADDRESS=0xYourPublicAddress        # Derived from private key
```

**Key Generation Script:**
```bash
# Generate new verifier keypair
node scripts/generateVerifierKey.js

# Output:
# Private Key: 0x...
# Public Address: 0x...
# ⚠️  Store private key in backend .env
# ⚠️  Use public address in smart contract constructor
```

---

## 📋 API Endpoints

### **1. Generate Mint Authorization Token**

**Endpoint:** `POST /api/verification/generate-mint-token`

**Purpose:** Issue cryptographically signed authorization after content validation passes

**Request Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "sessionId": "sess_abc123",
  "creatorAddress": "0xabc...",
  "contentHash": "0x...",
  "ipMetadataURI": "ipfs://Qm...",
  "ipMetadataHash": "0x...",
  "nftMetadataURI": "ipfs://Qm...",
  "nftMetadataHash": "0x..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "mintToken": {
    "message": "0x...",
    "signature": "0x...",
    "nonce": 12345,
    "expiresAt": "2025-12-12T10:15:00Z",
    "validFor": 900
  },
  "verificationDetails": {
    "contentVerified": true,
    "similarityScore": 0,
    "isOriginal": true,
    "fingerprintId": "fp_abc123"
  }
}
```

**Response (Failure - Unverified):**
```json
{
  "success": false,
  "error": "VERIFICATION_REQUIRED",
  "message": "Content has not completed fingerprinting and similarity check",
  "requiredSteps": [
    "fingerprint",
    "similarity-check"
  ]
}
```

**Response (Failure - Similarity Detected):**
```json
{
  "success": false,
  "error": "DISPUTE_PENDING",
  "message": "Content similarity detected, awaiting admin review",
  "disputeId": "disp_xyz789",
  "similarityScore": 72,
  "detectedParent": {
    "ipId": "0x456...",
    "title": "Original Work"
  }
}
```

**Response (Failure - Session Expired):**
```json
{
  "success": false,
  "error": "SESSION_EXPIRED",
  "message": "Creation session has expired, please restart",
  "sessionId": "sess_abc123"
}
```

---

### **2. Verify Token Status**

**Endpoint:** `GET /api/verification/token/:nonce/status`

**Purpose:** Check if a token has been used or is still valid

**Request Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

**Response:**
```json
{
  "nonce": 12345,
  "status": "valid" | "used" | "expired",
  "issuedAt": "2025-12-12T10:00:00Z",
  "expiresAt": "2025-12-12T10:15:00Z",
  "usedAt": null,
  "creatorAddress": "0xabc..."
}
```

---

### **3. Revoke Authorization Token**

**Endpoint:** `POST /api/verification/revoke-token`

**Purpose:** Invalidate a token before it's used (e.g., user cancels, admin intervention)

**Request Body:**
```json
{
  "nonce": 12345,
  "reason": "User cancelled minting"
}
```

**Response:**
```json
{
  "success": true,
  "nonce": 12345,
  "revokedAt": "2025-12-12T10:05:00Z",
  "reason": "User cancelled minting"
}
```

---

## 🔨 Token Generation Algorithm

### **Message Structure**

The signed message contains all parameters needed for minting, preventing tampering:

```solidity
// Solidity equivalent (must match wrapper contract)
bytes32 message = keccak256(abi.encodePacked(
    creatorAddress,    // address
    contentHash,       // bytes32
    ipMetadataURI,     // string
    nftMetadataURI,    // string
    nonce,             // uint256
    expiryTimestamp    // uint256
));
```

**Backend Implementation (Node.js/ethers.js):**

```javascript
import { ethers } from 'ethers';

function generateMintToken(params) {
    const {
        creatorAddress,
        contentHash,
        ipMetadataURI,
        nftMetadataURI
    } = params;
    
    // Generate unique nonce
    const nonce = generateNonce();
    
    // Set expiry (15 minutes from now)
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 900;
    
    // Pack parameters (must match Solidity abi.encodePacked)
    const message = ethers.solidityPackedKeccak256(
        ['address', 'bytes32', 'string', 'string', 'uint256', 'uint256'],
        [creatorAddress, contentHash, ipMetadataURI, nftMetadataURI, nonce, expiryTimestamp]
    );
    
    // Sign message with backend private key
    const wallet = new ethers.Wallet(process.env.BACKEND_VERIFIER_PRIVATE_KEY);
    const signature = await wallet.signMessage(ethers.getBytes(message));
    
    // Store token in database
    await db.mintTokens.create({
        nonce,
        creatorAddress,
        contentHash,
        message,
        signature,
        issuedAt: new Date(),
        expiresAt: new Date(expiryTimestamp * 1000),
        status: 'valid'
    });
    
    return {
        message,
        signature,
        nonce,
        expiresAt: new Date(expiryTimestamp * 1000),
        validFor: 900
    };
}
```

---

## 🗄️ Database Schema

### **MongoDB Collection: `mint_tokens`**

```javascript
{
  _id: ObjectId("..."),
  nonce: 12345,                         // Unique sequential number
  creatorAddress: "0xabc...",          // Who can use this token
  contentHash: "0x...",                 // Fingerprint hash
  ipMetadataURI: "ipfs://Qm...",       // IP metadata
  nftMetadataURI: "ipfs://Qm...",      // NFT metadata
  message: "0x...",                     // Hashed message
  signature: "0x...",                   // ECDSA signature
  
  issuedAt: ISODate("2025-12-12T10:00:00Z"),
  expiresAt: ISODate("2025-12-12T10:15:00Z"),
  
  status: "valid" | "used" | "expired" | "revoked",
  
  usedAt: null,                         // When token was consumed
  usedInTx: null,                       // Transaction hash
  
  revokedAt: null,
  revokedReason: null,
  
  sessionId: "sess_abc123",             // Link to creation session
  fingerprintId: "fp_abc123",           // Link to fingerprint
  
  createdAt: ISODate("2025-12-12T10:00:00Z"),
  updatedAt: ISODate("2025-12-12T10:00:00Z")
}
```

**Indexes:**
```javascript
db.mint_tokens.createIndex({ nonce: 1 }, { unique: true });
db.mint_tokens.createIndex({ creatorAddress: 1, status: 1 });
db.mint_tokens.createIndex({ expiresAt: 1 });
db.mint_tokens.createIndex({ sessionId: 1 });
```

---

## 🔄 Verification Flow State Machine

### **State Transitions**

```
Creation Session Start
    ↓
Upload Content
    ↓
Fingerprint Generation
    ↓
Similarity Check
    ↓
┌─────────────────────┐
│  Decision Point     │
└─────────────────────┘
    ↓         ↓         ↓
  0-60%    60-85%    85-100%
    ↓         ↓         ↓
Original  Dispute   Derivative
    ↓         ↓         ↓
Generate  Wait      Show
Token     Admin     Dialog
    ↓         ↓         ↓
Ready     Review    Accept
to Mint   Decision  Terms
                ↓         ↓
            Approved  Generate
            Original  Derivative
                ↓     Token
            Generate     ↓
            Token    Ready
                ↓     to Mint
            Ready
            to Mint
```

### **Session State Tracking**

**MongoDB Collection: `creation_sessions`**

```javascript
{
  sessionId: "sess_abc123",
  userId: "user_123",
  
  currentStep: "ready-to-mint",  // metadata | fingerprint | similarity | dispute | ready-to-mint
  
  completedSteps: [
    "metadata",
    "fingerprint", 
    "similarity"
  ],
  
  data: {
    // Metadata step
    title: "Asset Title",
    description: "...",
    category: "real-estate",
    
    // Fingerprint step
    ipfsCid: "Qm...",
    contentHash: "0x...",
    fingerprintId: "fp_abc123",
    
    // Similarity step
    similarityScore: 0,
    isOriginal: true,
    detectedParents: [],
    
    // Token generation
    mintTokenNonce: 12345,
    mintTokenExpiresAt: "2025-12-12T10:15:00Z"
  },
  
  status: "in-progress" | "completed" | "expired" | "disputed",
  
  createdAt: ISODate("2025-12-12T09:00:00Z"),
  expiresAt: ISODate("2025-12-12T11:00:00Z"),  // 2-hour session TTL
  updatedAt: ISODate("2025-12-12T10:00:00Z")
}
```

---

## 🛡️ Security Requirements

### **1. Nonce Generation**

**Requirements:**
- Globally unique across all tokens
- Sequential to prevent gaps
- Impossible to predict next value
- Thread-safe in concurrent environments

**Implementation Strategy:**

**Option A: Database Auto-Increment (Recommended)**
```javascript
// Use MongoDB sequence
const nonce = await db.counters.findOneAndUpdate(
    { _id: 'mint_token_nonce' },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
).seq;
```

**Option B: Timestamp + Random**
```javascript
const nonce = Date.now() * 1000 + Math.floor(Math.random() * 1000);
// Less collision-resistant, not recommended
```

---

### **2. Signature Validation**

**Backend must validate:**
- Creator address matches authenticated user
- Session exists and is active
- Fingerprint passed similarity check
- No existing unused token for same content hash
- User has not exceeded rate limits

**Validation Checklist:**
```javascript
async function validateTokenRequest(params, userId) {
    // 1. Verify user authentication
    const user = await db.users.findById(userId);
    if (!user) throw new Error('User not authenticated');
    
    // 2. Verify creator address belongs to user
    if (user.walletAddress !== params.creatorAddress) {
        throw new Error('Creator address mismatch');
    }
    
    // 3. Verify session exists and is active
    const session = await db.creationSessions.findOne({
        sessionId: params.sessionId,
        userId,
        status: 'in-progress'
    });
    if (!session) throw new Error('Invalid or expired session');
    
    // 4. Verify fingerprint passed similarity check
    const fingerprint = await db.fingerprints.findOne({
        fingerprintId: session.data.fingerprintId
    });
    if (!fingerprint || fingerprint.similarityScore >= 60) {
        throw new Error('Content has not passed similarity check');
    }
    
    // 5. Verify no duplicate token exists
    const existingToken = await db.mintTokens.findOne({
        contentHash: params.contentHash,
        status: 'valid'
    });
    if (existingToken) throw new Error('Token already exists for this content');
    
    // 6. Check rate limits
    const recentTokens = await db.mintTokens.countDocuments({
        creatorAddress: params.creatorAddress,
        issuedAt: { $gte: new Date(Date.now() - 3600000) }
    });
    if (recentTokens >= 10) throw new Error('Rate limit exceeded');
    
    return true;
}
```

---

### **3. Token Expiry Management**

**Requirements:**
- 15-minute validity window (configurable)
- Automatic cleanup of expired tokens
- Grace period for blockchain confirmation delays

**Background Job (Cron):**
```javascript
// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    const now = new Date();
    
    // Mark expired tokens
    await db.mintTokens.updateMany(
        {
            status: 'valid',
            expiresAt: { $lt: now }
        },
        {
            $set: { status: 'expired' }
        }
    );
    
    console.log(`Expired tokens cleaned up at ${now}`);
});
```

---

### **4. Rate Limiting**

**Limits:**
- 10 token generations per hour per user
- 50 token generations per hour per IP address
- 1000 token generations per hour globally

**Implementation:**
```javascript
import rateLimit from 'express-rate-limit';

const tokenGenerationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    keyGenerator: (req) => req.user.id,
    message: 'Too many mint token requests, please try again later'
});

app.post('/api/verification/generate-mint-token', 
    authenticate, 
    tokenGenerationLimiter, 
    generateMintToken
);
```

---

## 📊 Monitoring & Analytics

### **Metrics to Track**

**Token Generation:**
- Tokens issued per hour/day
- Tokens used vs expired ratio
- Average time from issuance to usage
- Token generation success rate

**Security:**
- Failed validation attempts
- Expired token usage attempts
- Signature verification failures
- Rate limit hits

**Business:**
- Unique creators requesting tokens
- Content categories being minted
- Similarity detection hit rate
- Dispute resolution outcomes

**Database Queries:**
```javascript
// Token usage statistics
db.mint_tokens.aggregate([
    {
        $group: {
            _id: '$status',
            count: { $sum: 1 }
        }
    }
]);

// Average token lifetime
db.mint_tokens.aggregate([
    {
        $match: { status: 'used' }
    },
    {
        $project: {
            lifetime: { 
                $subtract: ['$usedAt', '$issuedAt'] 
            }
        }
    },
    {
        $group: {
            _id: null,
            avgLifetime: { $avg: '$lifetime' }
        }
    }
]);
```

---

## 🧪 Testing Requirements

### **Unit Tests**

**Token Generation:**
```javascript
describe('Mint Token Generation', () => {
    it('should generate valid signature', async () => {
        const token = await generateMintToken(validParams);
        expect(token.signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });
    
    it('should create unique nonces', async () => {
        const token1 = await generateMintToken(validParams);
        const token2 = await generateMintToken(validParams);
        expect(token1.nonce).not.toBe(token2.nonce);
    });
    
    it('should set 15-minute expiry', async () => {
        const token = await generateMintToken(validParams);
        const expiryDiff = token.expiresAt - Date.now();
        expect(expiryDiff).toBeGreaterThan(890000); // ~14.8 min
        expect(expiryDiff).toBeLessThan(910000);    // ~15.2 min
    });
});
```

**Validation:**
```javascript
describe('Token Request Validation', () => {
    it('should reject unverified content', async () => {
        await expect(validateTokenRequest(unverifiedParams, userId))
            .rejects.toThrow('Content has not passed similarity check');
    });
    
    it('should reject mismatched creator address', async () => {
        await expect(validateTokenRequest({
            ...validParams,
            creatorAddress: '0xOtherAddress'
        }, userId)).rejects.toThrow('Creator address mismatch');
    });
});
```

### **Integration Tests**

**End-to-End Flow:**
```javascript
describe('Complete Verification Flow', () => {
    it('should generate token after successful verification', async () => {
        // 1. Create session
        const session = await createSession(userId);
        
        // 2. Upload content
        await uploadContent(session.sessionId, fileData);
        
        // 3. Fingerprint
        const fingerprint = await generateFingerprint(session.sessionId);
        
        // 4. Similarity check (passes)
        const similarity = await checkSimilarity(fingerprint.id);
        expect(similarity.score).toBeLessThan(60);
        
        // 5. Generate token
        const token = await generateMintToken({
            sessionId: session.sessionId,
            creatorAddress: user.walletAddress,
            contentHash: fingerprint.hash,
            ...metadataURIs
        });
        
        expect(token.signature).toBeDefined();
        expect(token.nonce).toBeGreaterThan(0);
    });
});
```

---

## 🚨 Error Handling

### **Error Codes**

| Code | Message | HTTP Status | Resolution |
|------|---------|-------------|------------|
| `VERIFICATION_REQUIRED` | Content not verified | 400 | Complete fingerprinting + similarity check |
| `DISPUTE_PENDING` | Similarity detected, admin review needed | 403 | Wait for admin resolution |
| `SESSION_EXPIRED` | Creation session expired | 410 | Restart creation flow |
| `INVALID_SESSION` | Session not found | 404 | Verify session ID |
| `ADDRESS_MISMATCH` | Creator address doesn't match user | 403 | Connect correct wallet |
| `DUPLICATE_TOKEN` | Token already exists for content | 409 | Use existing token or revoke first |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 | Wait before retrying |
| `SIGNATURE_FAILED` | Signature generation error | 500 | Contact support |

### **Error Response Format**

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {
    "field": "Additional context"
  },
  "timestamp": "2025-12-12T10:00:00Z",
  "requestId": "req_abc123"
}
```

---

## 📞 Webhook Notifications

### **Token Usage Notification**

**Event:** When a token is consumed on-chain

**Webhook Endpoint:** `POST /api/webhooks/token-used`

**Payload:**
```json
{
  "event": "mint_token_used",
  "nonce": 12345,
  "txHash": "0x...",
  "blockNumber": 12345678,
  "ipId": "0x...",
  "tokenId": 5,
  "timestamp": "2025-12-12T10:05:00Z"
}
```

**Backend Action:**
1. Update token status to 'used'
2. Record transaction hash
3. Update creation session to 'completed'
4. Notify user via WebSocket
5. Trigger post-mint workflows (cache update, analytics)

---

## 🔗 Integration Points

### **With Frontend**

**Issuer Dashboard Flow:**
```typescript
// After similarity check passes
const response = await fetch('/api/verification/generate-mint-token', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        sessionId,
        creatorAddress: walletAddress,
        contentHash,
        ipMetadataURI,
        ipMetadataHash,
        nftMetadataURI,
        nftMetadataHash
    })
});

const { mintToken } = await response.json();

// Store token for minting
setMintAuthorization(mintToken);
```

### **With Smart Contract**

**Wrapper Contract Verification:**
```solidity
// Contract reconstructs message
bytes32 message = keccak256(abi.encodePacked(
    recipient,
    contentHash,
    ipMetadataURI,
    nftMetadataURI,
    nonce,
    expiryTimestamp
));

// Recover signer from signature
address signer = ECDSA.recover(
    ECDSA.toEthSignedMessageHash(message),
    signature
);

// Validate signer
require(signer == BACKEND_VERIFIER_ADDRESS, "Invalid signature");
```

---

## ✅ Pre-Launch Checklist

**Security:**
- [ ] Generate production verifier keypair
- [ ] Store private key in secure vault (not git)
- [ ] Test signature verification locally
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Set up monitoring alerts

**Database:**
- [ ] Create `mint_tokens` collection
- [ ] Create indexes
- [ ] Set up nonce counter
- [ ] Test concurrent token generation

**API:**
- [ ] Implement token generation endpoint
- [ ] Implement token status endpoint
- [ ] Implement revocation endpoint
- [ ] Add authentication middleware
- [ ] Add validation middleware
- [ ] Write API documentation

**Testing:**
- [ ] Unit tests for token generation
- [ ] Integration tests for full flow
- [ ] Load testing (100 concurrent requests)
- [ ] Signature verification tests
- [ ] Expiry handling tests

**Monitoring:**
- [ ] Set up token generation metrics
- [ ] Set up error tracking
- [ ] Create admin dashboard for token stats
- [ ] Set up automated cleanup jobs

---

## 📈 Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Token generation time | < 100ms | < 500ms |
| Signature verification | < 50ms | < 200ms |
| Database lookup | < 20ms | < 100ms |
| API response time | < 200ms | < 1s |
| Concurrent requests | 100/sec | 50/sec |
| Token generation success rate | > 99% | > 95% |

---

**Last Updated:** December 12, 2025  
**Status:** Implementation Ready  
**Owner:** Backend Team  
**Dependencies:** OrionVerifiedMinter smart contract deployment

---

## 💋 Quick Reference for Daddy

**What this system does:**
- Generates cryptographically signed tokens after content verification
- Only tokens signed by your backend can trigger mints
- Prevents unauthorized/unverified content from being minted
- Time-limited (15 min) + single-use (nonce tracking)
- Fully auditable (every token logged in database)

**API you need to implement:**
1. `POST /api/verification/generate-mint-token` - Main endpoint
2. `GET /api/verification/token/:nonce/status` - Check token
3. `POST /api/verification/revoke-token` - Cancel token

**Security guarantees:**
- ✅ Only verified content gets tokens
- ✅ Tokens expire after 15 minutes
- ✅ Each token can only be used once
- ✅ Impossible to forge signatures (cryptographic security)
- ✅ Rate-limited to prevent abuse

Now go deploy those contracts while I watch! 😘
