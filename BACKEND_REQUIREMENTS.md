# Backend Requirements Specification
## Orion RWA Platform - Story Protocol Migration

> **Backend Mission**: Act as intelligent middleware between frontend and blockchain, providing caching, state management, session persistence, and IP detection services.

---

## 🎯 Core Responsibilities

The backend serves **four critical roles**:

1. **📦 Blockchain Cache Layer** - Reduce latency, minimize RPC calls
2. **🗄️ State Management System** - Offload frontend complexity, maintain application state
3. **🔐 Session & Auth Manager** - Reliable session persistence, JWT handling
4. **🔍 IP Detection Engine** - Content fingerprinting, similarity detection, dispute resolution

---

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph Frontend
        A[React App]
        B[WalletContext]
        C[AuthContext]
    end
    
    subgraph Backend
        D[API Gateway]
        E[Cache Layer]
        F[State Manager]
        G[Session Store]
        H[Detection Engine]
    end
    
    subgraph Storage
        I[(MongoDB)]
        J[(PostgreSQL)]
        K[(Redis)]
    end
    
    subgraph Blockchain
        L[Story Protocol]
        M[Sepolia RPC]
    end
    
    A -->|API Calls| D
    B -->|Wallet Events| D
    C -->|Auth Tokens| D
    
    D --> E
    D --> F
    D --> G
    D --> H
    
    E --> K
    F --> J
    G --> I
    H --> J
    
    E -->|Cache Miss| L
    F -->|State Sync| L
    L --> M
    
    classDef frontend fill:#e1f5ff,stroke:#0277bd
    classDef backend fill:#fff9c4,stroke:#f57c00
    classDef storage fill:#c8e6c9,stroke:#2e7d32
    classDef blockchain fill:#ffccbc,stroke:#d84315
    
    class A,B,C frontend
    class D,E,F,G,H backend
    class I,J,K storage
    class L,M blockchain
```

---

## 1️⃣ Blockchain Cache Layer

### **Purpose**
Eliminate frontend lag by caching blockchain queries. Frontend should **never wait** for RPC calls.

### **Storage Strategy**
All blockchain data cached permanently in **MongoDB** with **no TTL**. Cache acts as source of truth, only syncs on explicit events (new registration, license mint, etc.).

### **Philosophy**
- **Write-Through Cache**: Blockchain writes trigger immediate MongoDB updates
- **Event-Driven Sync**: WebSocket listeners detect blockchain events, update cache
- **Optimistic Reads**: Frontend always reads from MongoDB, never waits for RPC
- **Background Refresh**: Optional periodic sync job for data integrity verification

---

### **Requirements**

#### **1.1 Asset Metadata Caching**

**API Endpoint:**
```
GET /api/cache/assets/:ipId
```

**Response Structure:**
```json
{
  "ipId": "0x123...",
  "metadata": {
    "title": "Real Estate Asset #1",
    "description": "Prime downtown location...",
    "imageUrl": "ipfs://Qm...",
    "category": "real-estate",
    "value": "500000",
    "currency": "SUSD"
  },
  "cachedAt": "2025-12-12T10:00:00Z",
  "lastBlockchainSync": "2025-12-12T10:00:00Z",
  "source": "cache"
}
```

**How It Works:**

1. **Initial Population**: When an IP asset is registered (via our platform), the registration flow immediately writes metadata to MongoDB after blockchain confirmation

2. **Cache Lookup**: All frontend requests hit MongoDB first - zero blockchain queries during normal operation

3. **Event-Driven Updates**: Backend listens to Story Protocol events (`IPRegistered`, `IPUpdated`, `MetadataFrozen`) via WebSocket or polling, updates MongoDB when events fire

4. **Fallback Strategy**: If frontend requests an asset not in cache (e.g., registered externally), backend fetches from blockchain once, caches to MongoDB, then serves from cache forever

5. **No Expiration**: Once cached, data persists indefinitely unless explicitly updated via blockchain event

#### **1.2 Marketplace Listings Cache**

**API Endpoint:**
```
GET /api/cache/marketplace/listings?category=real-estate&page=1&limit=20
```

**Response Structure:**
```json
{
  "listings": [
    {
      "ipId": "0x123...",
      "licenseTermsId": "1",
      "mintingFee": "100",
      "currency": "SUSD",
      "royaltyRate": 10,
      "creator": "0xabc...",
      "totalMinted": 45,
      "maxSupply": 1000,
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "lastUpdated": "2025-12-12T10:00:00Z"
}
```

**How It Works:**

1. **Listing Creation Flow**: When an issuer attaches license terms to an IP asset, backend captures the event and stores listing data in MongoDB `marketplace_listings` collection

2. **Query Strategy**: All marketplace queries hit MongoDB with native query filters (category, price range, creator address) - no blockchain calls

3. **Real-Time Updates**: When a license is minted, backend decrements `remainingSupply` counter in MongoDB via event listener

4. **Aggregation Power**: Complex queries (trending assets, most-minted, price ranges) run on MongoDB aggregation pipeline - millisecond response times

5. **Permanent Storage**: Listings remain in cache forever unless creator explicitly delists (rare) or asset is flagged/removed

#### **1.3 User Portfolio Cache**

**API Endpoint:**
```
GET /api/cache/portfolio/:address
```

**Response Structure:**
```json
{
  "address": "0xabc...",
  "assets": [
    {
      "ipId": "0x123...",
      "licenseTokenIds": [5, 12, 23],
      "totalLicenses": 3,
      "originalCreator": false,
      "metadata": {},
      "estimatedValue": "1500"
    },
    {
      "ipId": "0x456...",
      "originalCreator": true,
      "derivatives": ["0x789...", "0xdef..."],
      "totalRoyaltiesEarned": "250",
      "metadata": {}
    }
  ],
  "totalValue": "1750",
  "lastUpdated": "2025-12-12T10:00:00Z"
}
```

**How It Works:**

1. **User-Centric Storage**: MongoDB maintains `user_portfolios` collection indexed by wallet address - one document per user containing all their IP assets and licenses

2. **Event-Based Updates**: 
   - User registers IP → Add to their portfolio document
   - User mints license → Append license token ID to relevant asset entry
   - User receives royalty → Increment `totalRoyaltiesEarned` counter

3. **Instant Reads**: Portfolio queries are simple MongoDB document lookups by address - no aggregation needed, sub-10ms response

4. **Derivative Tracking**: When a user's IP gets a derivative, backend automatically links it in their portfolio document for easy visualization

5. **Value Calculations**: Backend pre-calculates estimated portfolio value based on asset metadata and license counts - frontend just displays the number

#### **1.4 Cache Synchronization Strategy**

**Event Listener Architecture:**

Backend runs persistent blockchain event listeners that monitor Story Protocol contracts and trigger MongoDB updates in real-time.

**Webhook Endpoint:**
```
POST /api/webhooks/story-protocol
```

**Expected Event Payload:**
```json
{
  "event": "IPRegistered" | "LicenseMinted" | "RoyaltyPaid" | "IPUpdated",
  "ipId": "0x123...",
  "txHash": "0xabc...",
  "blockNumber": 12345678,
  "timestamp": "2025-12-12T10:00:00Z",
  "data": {}
}
```

**Synchronization Workflows:**

1. **IPRegistered Event**
   - Extract IP metadata URI from event
   - Fetch metadata from IPFS
   - Store complete asset record in MongoDB `assets` collection
   - If asset has license terms attached, add to `marketplace_listings`
   - Update creator's portfolio document
   - Emit WebSocket notification to creator's frontend

2. **LicenseMinted Event**
   - Decrement `remainingSupply` in marketplace listing
   - Add license token ID to buyer's portfolio
   - Increment `totalMinted` counter for the IP asset
   - Emit WebSocket update to both buyer and seller frontends

3. **RoyaltyPaid Event**
   - Update `totalRoyaltiesEarned` in recipient's portfolio
   - Store transaction record in royalty history
   - Trigger portfolio value recalculation
   - Notify recipient via WebSocket

4. **IPUpdated Event**
   - Fetch new metadata from updated URI
   - Replace metadata in MongoDB asset record
   - Emit cache invalidation signal to all frontends viewing this asset

**Fallback Sync Mechanism:**

- Background job runs every 6 hours checking for missed events
- Compares blockchain state vs MongoDB state for critical fields
- Auto-corrects any discrepancies (e.g., minting counter drift)
- Logs sync errors for admin review

**Why No TTL:**

- Blockchain data is append-only and immutable (除非 explicit updates)
- Event-driven sync ensures cache is always current
- Eliminates cache expiration complexity and "cold cache" scenarios
- MongoDB becomes single source of truth for frontend - blockchain is write-only from frontend perspective

---

## 2️⃣ State Management System

### **Purpose**
Offload complex state logic from frontend. Backend maintains application state, frontend just renders.

### **Requirements**

#### **2.1 Issuer Creation Flow State**
```typescript
// Multi-step wizard state persistence
POST /api/state/issuer/creation/init
Response: { sessionId: "sess_abc123" }

PATCH /api/state/issuer/creation/sess_abc123
Body:
{
  step: "metadata" | "fingerprint" | "similarity" | "registration",
  data: {
    // Step-specific data
    title: "Asset Title",
    description: "...",
    ipfsCid: "Qm...",
    fingerprint: "0x...",
    similarityScore: 45
  }
}

GET /api/state/issuer/creation/sess_abc123
Response:
{
  sessionId: "sess_abc123",
  currentStep: "registration",
  completedSteps: ["metadata", "fingerprint", "similarity"],
  data: { /* accumulated data */ },
  expiresAt: "2025-12-12T12:00:00Z"
}
```

**Backend Implementation:**
```javascript
// Store in PostgreSQL for reliability
const creationSessions = {
  sess_abc123: {
    userId: "user_123",
    sessionId: "sess_abc123",
    currentStep: "registration",
    completedSteps: ["metadata", "fingerprint", "similarity"],
    data: {
      title: "Asset Title",
      ipfsCid: "Qm...",
      fingerprint: "0x...",
      similarityScore: 45,
      similarAssets: []
    },
    createdAt: "2025-12-12T10:00:00Z",
    expiresAt: "2025-12-12T12:00:00Z" // 2-hour TTL
  }
};

// Auto-resume on browser refresh
app.get('/api/state/issuer/creation/active', async (req, res) => {
  const userId = req.user.id;
  const activeSession = await db.creationSessions
    .where({ userId, status: 'in-progress' })
    .orderBy('createdAt', 'desc')
    .first();
  
  if (activeSession && !isExpired(activeSession)) {
    return res.json(activeSession);
  }
  
  return res.json({ activeSession: null });
});
```

#### **2.2 Transaction Lifecycle Management**
```typescript
// Track pending transactions, auto-retry on failure
POST /api/state/transactions/create
Body:
{
  type: "register-ip" | "mint-license" | "register-derivative",
  userId: "user_123",
  params: { /* transaction params */ }
}

Response:
{
  txId: "tx_abc123",
  status: "pending" | "submitted" | "confirmed" | "failed",
  blockchainTxHash: null,
  retryCount: 0,
  maxRetries: 3,
  createdAt: "2025-12-12T10:00:00Z"
}

// Polling endpoint (frontend checks every 5 seconds)
GET /api/state/transactions/tx_abc123
Response:
{
  txId: "tx_abc123",
  status: "confirmed",
  blockchainTxHash: "0x...",
  blockNumber: 12345678,
  gasUsed: "150000",
  confirmedAt: "2025-12-12T10:05:00Z",
  result: {
    ipId: "0x123..." // For register-ip
  }
}
```

**Backend Implementation:**
```javascript
// Transaction queue with auto-retry
const txQueue = new Bull('transaction-queue', {
  redis: redisConfig
});

txQueue.process(async (job) => {
  const { type, userId, params } = job.data;
  
  try {
    let result;
    switch (type) {
      case 'register-ip':
        result = await storyClient.ipAsset.register(params);
        break;
      case 'mint-license':
        result = await storyClient.license.mint(params);
        break;
      // ... other types
    }
    
    // Update transaction status
    await db.transactions.update(job.data.txId, {
      status: 'confirmed',
      blockchainTxHash: result.txHash,
      confirmedAt: new Date(),
      result
    });
    
    // Emit WebSocket event
    io.to(`user:${userId}`).emit('transaction:confirmed', {
      txId: job.data.txId,
      result
    });
    
    return result;
    
  } catch (error) {
    // Auto-retry logic
    if (job.attemptsMade < 3) {
      throw error; // Bull will auto-retry
    } else {
      await db.transactions.update(job.data.txId, {
        status: 'failed',
        error: error.message,
        failedAt: new Date()
      });
      
      io.to(`user:${userId}`).emit('transaction:failed', {
        txId: job.data.txId,
        error: error.message
      });
    }
  }
});
```

#### **2.3 Dispute Resolution State**
```typescript
// Admin review workflow state
GET /api/state/disputes/pending
Response:
{
  disputes: [
    {
      disputeId: "disp_abc123",
      status: "pending" | "under-review" | "resolved",
      submittedBy: "user_123",
      submittedContent: {
        fingerprint: "0x...",
        ipfsCid: "Qm...",
        title: "My Asset"
      },
      detectedParent: {
        ipId: "0x456...",
        similarityScore: 72,
        evidence: "ipfs://Qm..."
      },
      assignedAdmin: null,
      createdAt: "2025-12-12T09:00:00Z",
      deadline: "2025-12-15T09:00:00Z" // 3-day SLA
    }
  ]
}

PATCH /api/state/disputes/disp_abc123/assign
Body: { adminId: "admin_456" }

PATCH /api/state/disputes/disp_abc123/resolve
Body:
{
  decision: "approve-original" | "enforce-derivative",
  reasoning: "After review, content is sufficiently different.",
  evidence: "Admin notes..."
}
```

**Backend Implementation:**
```javascript
async function resolveDispute(disputeId, decision, adminId) {
  const dispute = await db.disputes.findById(disputeId);
  
  // Update dispute status
  await db.disputes.update(disputeId, {
    status: 'resolved',
    decision,
    resolvedBy: adminId,
    resolvedAt: new Date()
  });
  
  // Notify submitter via WebSocket
  io.to(`user:${dispute.submittedBy}`).emit('dispute:resolved', {
    disputeId,
    decision,
    canProceed: decision === 'approve-original'
  });
  
  // If approved, resume creation session
  if (decision === 'approve-original') {
    const session = await db.creationSessions.findOne({
      userId: dispute.submittedBy,
      fingerprint: dispute.submittedContent.fingerprint
    });
    
    if (session) {
      await db.creationSessions.update(session.id, {
        currentStep: 'registration',
        disputeResolved: true
      });
    }
  }
}
```

#### **2.4 Filter & Search State**
```typescript
// Persist user filters across sessions
POST /api/state/filters/save
Body:
{
  userId: "user_123",
  page: "marketplace",
  filters: {
    category: ["real-estate", "invoices"],
    priceRange: [100, 5000],
    sortBy: "newest"
  }
}

GET /api/state/filters/:userId/marketplace
Response:
{
  filters: { /* saved filters */ },
  lastUsed: "2025-12-12T10:00:00Z"
}
```

---

## 3️⃣ Session & Authentication Manager

### **Purpose**
Reliable session persistence, JWT management, automatic refresh, cross-tab synchronization.

### **Requirements**

#### **3.1 JWT Token Management**
```typescript
// Token pair: access (15min) + refresh (7 days)
POST /api/auth/login
Body: { email: "user@example.com", password: "..." }

Response:
{
  accessToken: "eyJ...", // 15-min expiry
  refreshToken: "eyJ...", // 7-day expiry
  user: {
    id: "user_123",
    email: "user@example.com",
    role: "issuer",
    walletAddress: "0xabc..."
  },
  expiresIn: 900, // 15 minutes
  sessionId: "sess_abc123"
}

// Auto-refresh endpoint (frontend calls when token expires)
POST /api/auth/refresh
Body: { refreshToken: "eyJ..." }

Response:
{
  accessToken: "eyJ...", // New 15-min token
  expiresIn: 900
}
```

**Backend Implementation:**
```javascript
// Store refresh tokens in MongoDB
const sessions = {
  sess_abc123: {
    sessionId: "sess_abc123",
    userId: "user_123",
    refreshToken: "hashed_token",
    deviceInfo: "Chrome/macOS",
    ipAddress: "192.168.1.1",
    createdAt: "2025-12-12T10:00:00Z",
    expiresAt: "2025-12-19T10:00:00Z",
    lastActivity: "2025-12-12T10:30:00Z"
  }
};

// Automatic session cleanup (runs every hour)
cron.schedule('0 * * * *', async () => {
  await db.sessions.deleteMany({
    expiresAt: { $lt: new Date() }
  });
});

// Session activity tracking (extend on use)
app.use(async (req, res, next) => {
  if (req.user && req.sessionId) {
    await db.sessions.update(req.sessionId, {
      lastActivity: new Date()
    });
  }
  next();
});
```

#### **3.2 Cross-Tab Session Sync**
```typescript
// WebSocket-based session broadcast
// User logs in on Tab A, Tab B auto-updates

// Backend emits to all user tabs
io.to(`user:${userId}`).emit('session:created', {
  sessionId: "sess_abc123",
  user: { /* user data */ }
});

io.to(`user:${userId}`).emit('session:destroyed', {
  sessionId: "sess_abc123",
  reason: "logout"
});

// Frontend subscribes on mount
socket.on('session:created', (data) => {
  localStorage.setItem('accessToken', data.accessToken);
  authContext.setUser(data.user);
});

socket.on('session:destroyed', () => {
  localStorage.clear();
  window.location.href = '/login';
});
```

#### **3.3 Wallet Session Binding**
```typescript
// Link wallet address to user session
POST /api/auth/verify-wallet
Body:
{
  address: "0xabc...",
  signature: "0x...",
  message: "Sign this to verify ownership"
}

Response:
{
  verified: true,
  walletLinked: true,
  user: {
    id: "user_123",
    walletAddress: "0xabc...",
    walletVerified: true
  }
}

// Backend stores wallet → user mapping
const walletMappings = {
  "0xabc...": {
    userId: "user_123",
    verifiedAt: "2025-12-12T10:00:00Z",
    signature: "0x..." // For audit
  }
};
```

#### **3.4 Session Persistence Across Refreshes**
```typescript
// Resume session on page reload
GET /api/auth/session/current
Headers: { Authorization: "Bearer eyJ..." }

Response:
{
  sessionValid: true,
  user: { /* full user object */ },
  permissions: ["create-asset", "mint-license"],
  sessionExpiresIn: 3600 // 1 hour remaining
}

// If token expired, auto-refresh
if (res.status === 401) {
  const refreshed = await fetch('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  // Retry original request with new token
}
```

---

## 4️⃣ IP Detection Engine

### **Purpose**
Content fingerprinting, similarity detection, derivative identification, dispute management.

### **Requirements**

#### **4.1 Content Fingerprinting**
```typescript
// Multi-format fingerprinting service
POST /api/detection/fingerprint
Content-Type: multipart/form-data
Body:
{
  file: <binary>,
  type: "image" | "video" | "audio" | "text",
  metadata: {
    title: "Asset Title",
    creator: "user_123"
  }
}

Response:
{
  fingerprintId: "fp_abc123",
  hashes: {
    sha256: "0x...", // File hash
    perceptual: "0x...", // pHash for images/video
    chromaprint: "0x...", // Audio fingerprint
    contentHash: "0x..." // Text semantic hash
  },
  ipfsCid: "Qm...",
  storedAt: "2025-12-12T10:00:00Z",
  processingTime: "1.2s"
}
```

**Backend Implementation:**
```javascript
// Fingerprinting pipeline
async function fingerprintContent(file, type) {
  const pipeline = fingerprintPipelines[type];
  
  // 1. Generate multiple hashes
  const hashes = await Promise.all([
    crypto.createHash('sha256').update(file).digest('hex'),
    type === 'image' ? generatePHash(file) : null,
    type === 'video' ? generateVideoHash(file) : null,
    type === 'audio' ? generateChromaprint(file) : null,
    type === 'text' ? generateSemanticHash(file) : null
  ]);
  
  // 2. Store in PostgreSQL
  const fingerprint = await db.fingerprints.create({
    fingerprintId: generateId(),
    fileType: type,
    sha256: hashes[0],
    perceptualHash: hashes[1],
    chromaprint: hashes[2],
    contentHash: hashes[3],
    fileSize: file.size,
    createdAt: new Date()
  });
  
  // 3. Upload to IPFS
  const ipfsCid = await pinata.pinFileToIPFS(file);
  
  await db.fingerprints.update(fingerprint.id, { ipfsCid });
  
  return { fingerprintId: fingerprint.id, hashes, ipfsCid };
}
```

#### **4.2 Similarity Detection**
```typescript
// Compare against existing fingerprints
POST /api/detection/check-similarity
Body:
{
  fingerprintId: "fp_abc123",
  thresholds: {
    exact: 100,      // 100% match = duplicate
    high: 85,        // ≥85% = forced derivative
    medium: 60       // 60-85% = admin review
  }
}

Response:
{
  isOriginal: false,
  highestMatch: {
    ipId: "0x456...",
    fingerprintId: "fp_xyz789",
    similarityScore: 72,
    matchType: "perceptual", // Which hash matched
    confidence: 0.85,
    evidence: {
      visualDiff: "ipfs://Qm...", // Side-by-side comparison
      matchedRegions: ["0,0,100,100"], // Image coordinates
      audioSegments: [[0, 30], [45, 60]] // Matching audio segments
    }
  },
  allMatches: [
    // All matches above 60% threshold
  ],
  recommendation: "admin-review" | "force-derivative" | "approve-original"
}
```

**Backend Implementation:**
```javascript
async function checkSimilarity(fingerprintId, thresholds) {
  const fingerprint = await db.fingerprints.findById(fingerprintId);
  
  // 1. Query all fingerprints of same type
  const candidates = await db.fingerprints.where({
    fileType: fingerprint.fileType,
    ipId: { $ne: null } // Only registered IPs
  });
  
  // 2. Calculate similarity scores
  const matches = await Promise.all(
    candidates.map(async (candidate) => {
      const score = calculateSimilarity(fingerprint, candidate);
      
      if (score >= thresholds.medium) {
        // Generate evidence
        const evidence = await generateEvidence(fingerprint, candidate);
        return { candidate, score, evidence };
      }
      return null;
    })
  );
  
  const validMatches = matches.filter(m => m && m.score >= thresholds.medium);
  
  if (validMatches.length === 0) {
    return { isOriginal: true, recommendation: 'approve-original' };
  }
  
  const highestMatch = validMatches.sort((a, b) => b.score - a.score)[0];
  
  // 3. Determine action
  let recommendation;
  if (highestMatch.score >= thresholds.high) {
    recommendation = 'force-derivative';
  } else if (highestMatch.score >= thresholds.medium) {
    recommendation = 'admin-review';
  } else {
    recommendation = 'approve-original';
  }
  
  return {
    isOriginal: false,
    highestMatch: {
      ipId: highestMatch.candidate.ipId,
      similarityScore: highestMatch.score,
      evidence: highestMatch.evidence
    },
    allMatches: validMatches,
    recommendation
  };
}

// Similarity calculation (example for images)
function calculateSimilarity(fp1, fp2) {
  // Hamming distance for perceptual hash
  const hammingDistance = calculateHamming(fp1.perceptualHash, fp2.perceptualHash);
  const maxBits = 64; // pHash is 64-bit
  const similarity = ((maxBits - hammingDistance) / maxBits) * 100;
  
  return Math.round(similarity);
}
```

#### **4.3 Derivative Graph Management**
```typescript
// Track IP relationships
POST /api/detection/link-derivative
Body:
{
  childIpId: "0x123...",
  parentIpId: "0x456...",
  linkType: "remix" | "adaptation" | "collection",
  royaltyShare: 10 // Percentage
}

Response:
{
  linkId: "link_abc123",
  childIpId: "0x123...",
  parentIpId: "0x456...",
  depth: 2, // Child of child
  createdAt: "2025-12-12T10:00:00Z"
}

// Query derivative tree
GET /api/detection/derivatives/:ipId/tree

Response:
{
  root: {
    ipId: "0x456...",
    title: "Original Work",
    creator: "0xabc...",
    totalDerivatives: 5
  },
  children: [
    {
      ipId: "0x123...",
      title: "Remix Version",
      depth: 1,
      royaltyShare: 10,
      children: [
        {
          ipId: "0x789...",
          title: "Remix of Remix",
          depth: 2,
          royaltyShare: 5
        }
      ]
    }
  ],
  totalRoyaltiesGenerated: "500 SUSD"
}
```

**Backend Implementation:**
```javascript
// Adjacency list + recursive tree builder
const derivativeLinks = [
  {
    linkId: "link_abc123",
    childIpId: "0x123...",
    parentIpId: "0x456...",
    depth: 1,
    royaltyShare: 10,
    createdAt: "2025-12-12T10:00:00Z"
  }
];

async function getDerivativeTree(rootIpId) {
  const tree = await buildTree(rootIpId, 0);
  const totalRoyalties = await db.royalties
    .where({ ipId: rootIpId })
    .sum('amount');
  
  return { root: tree, totalRoyaltiesGenerated: totalRoyalties };
}

async function buildTree(ipId, depth) {
  const ip = await db.assets.findById(ipId);
  const children = await db.derivativeLinks.where({ parentIpId: ipId });
  
  return {
    ipId,
    title: ip.metadata.title,
    depth,
    children: await Promise.all(
      children.map(child => buildTree(child.childIpId, depth + 1))
    )
  };
}
```

#### **4.4 Dispute Creation & Resolution**
```typescript
// Auto-create dispute when similarity is 60-85%
POST /api/detection/disputes/create
Body:
{
  submittedContent: {
    fingerprintId: "fp_abc123",
    ipfsCid: "Qm...",
    title: "My Asset",
    creator: "user_123"
  },
  detectedParent: {
    ipId: "0x456...",
    similarityScore: 72,
    evidenceUri: "ipfs://Qm..."
  }
}

Response:
{
  disputeId: "disp_abc123",
  status: "pending",
  estimatedResolution: "2025-12-15T09:00:00Z", // 3-day SLA
  notificationSent: true
}

// Admin resolution
PATCH /api/detection/disputes/disp_abc123/resolve
Body:
{
  decision: "approve-original" | "enforce-derivative",
  adminId: "admin_456",
  reasoning: "Content differs sufficiently in X, Y, Z aspects."
}

Response:
{
  disputeId: "disp_abc123",
  status: "resolved",
  decision: "approve-original",
  resolvedBy: "admin_456",
  resolvedAt: "2025-12-13T10:00:00Z",
  userNotified: true
}
```

---

## 📊 Database Schema

### **PostgreSQL Tables**

#### **Assets Table**
```sql
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  ip_id VARCHAR(66) UNIQUE NOT NULL, -- Story Protocol IP ID
  fingerprint_id VARCHAR(50) REFERENCES fingerprints(fingerprint_id),
  creator_address VARCHAR(42) NOT NULL,
  metadata JSONB NOT NULL,
  ipfs_cid VARCHAR(100),
  license_terms_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active', -- active, disputed, removed
  created_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  INDEX idx_creator (creator_address),
  INDEX idx_fingerprint (fingerprint_id)
);
```

#### **Fingerprints Table**
```sql
CREATE TABLE fingerprints (
  id SERIAL PRIMARY KEY,
  fingerprint_id VARCHAR(50) UNIQUE NOT NULL,
  file_type VARCHAR(20) NOT NULL, -- image, video, audio, text
  sha256 VARCHAR(64) NOT NULL,
  perceptual_hash VARCHAR(64), -- For images/video
  chromaprint TEXT, -- For audio
  content_hash VARCHAR(64), -- For text
  file_size BIGINT,
  ipfs_cid VARCHAR(100),
  ip_id VARCHAR(66), -- NULL until registered
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_sha256 (sha256),
  INDEX idx_phash (perceptual_hash),
  INDEX idx_ip_id (ip_id)
);
```

#### **Derivative Links Table**
```sql
CREATE TABLE derivative_links (
  id SERIAL PRIMARY KEY,
  link_id VARCHAR(50) UNIQUE NOT NULL,
  child_ip_id VARCHAR(66) NOT NULL,
  parent_ip_id VARCHAR(66) NOT NULL,
  link_type VARCHAR(20), -- remix, adaptation, collection
  royalty_share INTEGER, -- Percentage
  depth INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (child_ip_id) REFERENCES assets(ip_id),
  FOREIGN KEY (parent_ip_id) REFERENCES assets(ip_id),
  INDEX idx_child (child_ip_id),
  INDEX idx_parent (parent_ip_id)
);
```

#### **Disputes Table**
```sql
CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  dispute_id VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, under-review, resolved
  submitted_by VARCHAR(50) NOT NULL, -- User ID
  fingerprint_id VARCHAR(50) REFERENCES fingerprints(fingerprint_id),
  detected_parent_ip_id VARCHAR(66),
  similarity_score INTEGER,
  evidence_uri TEXT,
  assigned_admin VARCHAR(50),
  decision VARCHAR(20), -- approve-original, enforce-derivative
  reasoning TEXT,
  resolved_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  deadline TIMESTAMP, -- 3-day SLA
  INDEX idx_status (status),
  INDEX idx_submitted_by (submitted_by)
);
```

#### **Creation Sessions Table**
```sql
CREATE TABLE creation_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(50) UNIQUE NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  current_step VARCHAR(20), -- metadata, fingerprint, similarity, registration
  completed_steps TEXT[], -- Array of completed steps
  session_data JSONB, -- Accumulated form data
  fingerprint_id VARCHAR(50),
  dispute_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'in-progress', -- in-progress, completed, expired
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  INDEX idx_user_status (user_id, status)
);
```

#### **Transactions Table**
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  tx_id VARCHAR(50) UNIQUE NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  tx_type VARCHAR(30), -- register-ip, mint-license, register-derivative
  status VARCHAR(20) DEFAULT 'pending', -- pending, submitted, confirmed, failed
  params JSONB,
  blockchain_tx_hash VARCHAR(66),
  block_number BIGINT,
  gas_used VARCHAR(20),
  result JSONB,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  failed_at TIMESTAMP,
  INDEX idx_user_status (user_id, status),
  INDEX idx_tx_hash (blockchain_tx_hash)
);
```

### **MongoDB Collections**

#### **Users Collection**
```javascript
{
  _id: "user_123",
  email: "user@example.com",
  passwordHash: "bcrypt_hash",
  role: "issuer" | "admin" | "manager" | "user",
  walletAddress: "0xabc...",
  walletVerified: true,
  kycStatus: "pending" | "approved" | "rejected",
  createdAt: ISODate("2025-12-12T10:00:00Z"),
  lastLogin: ISODate("2025-12-12T10:00:00Z")
}
```

#### **Sessions Collection**
```javascript
{
  _id: "sess_abc123",
  sessionId: "sess_abc123",
  userId: "user_123",
  refreshToken: "hashed_token",
  deviceInfo: "Chrome/macOS",
  ipAddress: "192.168.1.1",
  createdAt: ISODate("2025-12-12T10:00:00Z"),
  expiresAt: ISODate("2025-12-19T10:00:00Z"),
  lastActivity: ISODate("2025-12-12T10:30:00Z")
}
```

### **Redis Cache Keys**

```javascript
// Asset metadata cache
"asset:{ipId}" → { metadata, cachedAt, expiresAt }

// Marketplace listings cache
"listings:{filters}:{page}" → { listings, pagination, cachedAt }

// User portfolio cache
"portfolio:{address}" → { assets, totalValue, lastUpdated }

// Transaction status cache
"tx:{txId}" → { status, blockchainTxHash, result }

// Session data cache
"session:{sessionId}" → { userId, accessToken, expiresIn }
```

---

## 🔌 API Endpoints Summary

### **Cache Layer**
```
GET    /api/cache/assets/:ipId
GET    /api/cache/marketplace/listings
GET    /api/cache/portfolio/:address
POST   /api/webhooks/story-protocol
DELETE /api/cache/invalidate/:key
```

### **State Management**
```
POST   /api/state/issuer/creation/init
GET    /api/state/issuer/creation/:sessionId
PATCH  /api/state/issuer/creation/:sessionId
GET    /api/state/issuer/creation/active
POST   /api/state/transactions/create
GET    /api/state/transactions/:txId
GET    /api/state/disputes/pending
PATCH  /api/state/disputes/:id/assign
PATCH  /api/state/disputes/:id/resolve
POST   /api/state/filters/save
GET    /api/state/filters/:userId/:page
```

### **Session & Auth**
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/session/current
POST   /api/auth/verify-wallet
```

### **Detection Engine**
```
POST   /api/detection/fingerprint
POST   /api/detection/check-similarity
POST   /api/detection/link-derivative
GET    /api/detection/derivatives/:ipId/tree
POST   /api/detection/disputes/create
PATCH  /api/detection/disputes/:id/resolve
GET    /api/detection/disputes/:id
```

---

## 🚀 Performance Requirements

| Metric | Target | Critical Path |
|--------|--------|---------------|
| **API Response Time** | < 200ms | Cache hits |
| **Cache Hit Rate** | > 85% | Asset metadata, listings |
| **Database Query Time** | < 100ms | Indexed queries only |
| **Fingerprint Generation** | < 5s | Image/video processing |
| **Similarity Check** | < 3s | 1000 comparisons |
| **Transaction Confirmation** | < 30s | Blockchain dependent |
| **WebSocket Latency** | < 50ms | Real-time updates |
| **Session Lookup** | < 10ms | Redis cache |

---

## 🛡️ Security Requirements

1. **Rate Limiting**
   - 100 requests/min per IP for public endpoints
   - 500 requests/min per user for authenticated endpoints
   - 10 requests/min for fingerprinting (resource-intensive)

2. **Data Encryption**
   - All sensitive data encrypted at rest (AES-256)
   - TLS 1.3 for all API communication
   - Refresh tokens hashed with bcrypt

3. **Access Control**
   - Role-based permissions enforced at API layer
   - Admin-only endpoints protected by double verification
   - Wallet signatures required for critical operations

4. **Audit Logging**
   - All admin actions logged to immutable audit table
   - Dispute resolutions include reasoning + evidence
   - Transaction history retained for 7 years

---

## 📡 WebSocket Events

### **Frontend → Backend**
```javascript
// Subscribe to user-specific updates
socket.emit('subscribe', { userId: 'user_123' });

// Subscribe to asset updates
socket.emit('subscribe:asset', { ipId: '0x123...' });

// Unsubscribe on unmount
socket.emit('unsubscribe', { userId: 'user_123' });
```

### **Backend → Frontend**
```javascript
// Transaction updates
socket.on('transaction:submitted', { txId, blockchainTxHash });
socket.on('transaction:confirmed', { txId, result });
socket.on('transaction:failed', { txId, error });

// Cache invalidation
socket.on('cache:invalidated', { key, reason });

// Session events
socket.on('session:created', { sessionId, user });
socket.on('session:destroyed', { reason });

// Dispute notifications
socket.on('dispute:created', { disputeId, similarityScore });
socket.on('dispute:resolved', { disputeId, decision });

// Asset updates
socket.on('asset:registered', { ipId, metadata });
socket.on('asset:license-minted', { ipId, buyer, licenseTokenId });
```

---

## 🧪 Testing Requirements

### **Load Testing Targets**
- 1000 concurrent users
- 10,000 API requests/second
- 100,000 cached assets
- 50 fingerprints/minute

### **Critical Test Scenarios**
1. Cache invalidation propagation (< 1 second)
2. Session persistence across browser refresh
3. Concurrent transaction processing
4. Similarity detection accuracy (95%+ for exact duplicates)
5. Dispute SLA compliance (resolve within 3 days)

---

## 📈 Monitoring & Observability

### **Metrics to Track**
```javascript
// Performance
- api.response_time (p50, p95, p99)
- cache.hit_rate
- db.query_time
- fingerprint.processing_time

// Business
- assets.registered_per_day
- disputes.created_per_day
- disputes.resolution_time
- transactions.success_rate

// System
- redis.memory_usage
- postgres.connection_pool
- websocket.active_connections
- queue.pending_jobs
```

### **Alerts**
- Cache hit rate < 80%
- API response time > 500ms
- Transaction failure rate > 5%
- Dispute resolution time > 72 hours
- Redis memory > 80%

---

## 🔗 Integration Points

### **Story Protocol SDK**
```javascript
import { StoryClient } from '@story-protocol/core-sdk';

const storyClient = StoryClient.newClient({
  chainId: 11155111, // Sepolia
  transport: http(process.env.RPC_URL),
  account: privateKeyToAccount(process.env.PRIVATE_KEY)
});

// Used for:
- storyClient.ipAsset.register()
- storyClient.license.registerPILTerms()
- storyClient.license.mintLicenseTokens()
- storyClient.royalty.claimRevenue()
```

### **IPFS (Pinata)**
```javascript
import pinataSDK from '@pinata/sdk';

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_KEY
});

// Used for:
- pinata.pinFileToIPFS()
- pinata.pinJSONToIPFS()
- pinata.unpin() // Cleanup
```

### **Bull Queue (Transaction Processing)**
```javascript
import Bull from 'bull';

const txQueue = new Bull('transactions', {
  redis: { host: 'localhost', port: 6379 }
});

txQueue.process(async (job) => {
  // Process blockchain transactions
});

txQueue.on('completed', (job, result) => {
  // Emit WebSocket event
});
```

---

## 📝 Environment Variables

```bash
# Database
POSTGRES_URL=postgresql://user:pass@localhost:5432/orion
MONGODB_URL=mongodb://localhost:27017/orion
REDIS_URL=redis://localhost:6379

# Story Protocol
STORY_CHAIN_ID=11155111
STORY_RPC_URL=https://rpc.sepolia.io
STORY_PRIVATE_KEY=0x...

# IPFS
PINATA_API_KEY=ee7fd8b4670e8e75cf1f
PINATA_SECRET_KEY=...

# Auth
JWT_SECRET=...
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Rate Limiting
RATE_LIMIT_PUBLIC=100 # per minute
RATE_LIMIT_AUTHENTICATED=500

# Detection Engine
FINGERPRINT_SIMILARITY_THRESHOLD_MEDIUM=60
FINGERPRINT_SIMILARITY_THRESHOLD_HIGH=85
DISPUTE_RESOLUTION_SLA_HOURS=72
```

---

## 🎯 Success Criteria

### **Performance**
- ✅ 95% of API calls served from cache
- ✅ < 200ms average response time
- ✅ Zero session loss on browser refresh
- ✅ < 5s fingerprint generation

### **Reliability**
- ✅ 99.9% uptime
- ✅ Automatic transaction retry (3 attempts)
- ✅ Zero data loss on server restart
- ✅ Cross-tab session sync within 1 second

### **User Experience**
- ✅ No frontend "Loading..." states > 2 seconds
- ✅ Real-time transaction updates via WebSocket
- ✅ Auto-resume creation flow after browser crash
- ✅ Instant portfolio refresh (cache)

---

**Last Updated**: December 12, 2025  
**Status**: Requirements Phase  
**Target Completion**: Q1 2026
