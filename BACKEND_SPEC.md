# 🖥️ BACKEND API SPECIFICATION
## IP-OPS Content Fingerprinting & Similarity Detection Service

**Version:** 1.0 (MVP - Text-Based)
**Date:** December 11, 2025
**Purpose:** Act as the "Index" and "Detection Engine" for IP-OPS platform

---

## 📋 OVERVIEW

The backend serves as the critical "Missing Link" between the frontend and Story Protocol. It provides:

1. **Content Fingerprinting:** Generate unique hashes for text content (video/audio later)
2. **Similarity Detection:** Compare new uploads against existing IP database
3. **Dispute Management:** Queue ambiguous cases (60-85% similarity) for admin review
4. **Fast Caching Layer:** Provide quick asset lookups without blockchain queries

**Why We Need This:**
- **Story Protocol** handles IP registration and licensing on-chain
- **Backend** handles content comparison off-chain (blockchain can't do fuzzy matching)
- **Frontend** orchestrates the user flow and calls both services

---

## 🔧 TECH STACK

### **Recommended: Node.js/Express**
```json
{
  "runtime": "Node.js 18+",
  "framework": "Express.js 4.18+",
  "database": "PostgreSQL 14+ (or MongoDB 6+)",
  "orm": "Prisma (for PostgreSQL) or Mongoose (for MongoDB)",
  "fileUpload": "multer",
  "ipfs": "pinata-sdk",
  "hashing": "crypto (built-in)",
  "textSimilarity": "string-similarity or natural (NLP library)",
  "environment": "dotenv"
}
```

### **Alternative: Python/FastAPI** (Better for ML later)
```json
{
  "runtime": "Python 3.10+",
  "framework": "FastAPI 0.100+",
  "database": "PostgreSQL 14+",
  "orm": "SQLAlchemy",
  "fileUpload": "FastAPI File handling",
  "ipfs": "requests + Pinata API",
  "hashing": "hashlib",
  "textSimilarity": "difflib or scikit-learn (TF-IDF)",
  "videoHashing": "opencv + imagehash (Phase 2)"
}
```

**MVP Choice:** **Node.js/Express** (easier integration with TypeScript frontend)

---

## 🗄️ DATABASE SCHEMA

### **PostgreSQL Schema (Recommended)**

```sql
-- Table 1: IP Fingerprints (The Index)
CREATE TABLE ip_fingerprints (
  id SERIAL PRIMARY KEY,

  -- Content Identification
  content_hash VARCHAR(66) NOT NULL UNIQUE,  -- SHA256 hash of content (0x...)
  ipfs_cid VARCHAR(100) NOT NULL,            -- Pinata IPFS CID (Qm...)

  -- Owner Information
  wallet_address VARCHAR(42) NOT NULL,       -- Creator's wallet address
  story_ip_id VARCHAR(66),                   -- Story Protocol IP ID (set after on-chain registration)

  -- Metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  ip_type VARCHAR(20) DEFAULT 'Text',        -- Text, Video, Audio, Image
  file_size INTEGER,                         -- File size in bytes
  mime_type VARCHAR(100),                    -- text/plain, video/mp4, etc.

  -- Licensing
  royalty_rate INTEGER DEFAULT 10,           -- Royalty percentage (0-100)
  license_type VARCHAR(20) DEFAULT 'commercial', -- commercial, non-commercial

  -- Status
  status VARCHAR(20) DEFAULT 'pending',      -- pending, registered, disputed

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table 2: Similarity Disputes (The Review Queue)
CREATE TABLE similarity_disputes (
  id SERIAL PRIMARY KEY,

  -- Dispute Identification
  dispute_id VARCHAR(50) UNIQUE NOT NULL,    -- Unique dispute ID (dispute_xxxxx)

  -- Content Information
  submitted_by VARCHAR(42) NOT NULL,         -- Uploader's wallet address
  content_hash VARCHAR(66) NOT NULL,         -- Hash of disputed content
  content_title VARCHAR(255),                -- Title of disputed content
  ipfs_cid VARCHAR(100),                     -- IPFS CID of disputed content

  -- Similarity Data
  parent_ip_id VARCHAR(66),                  -- Potential parent IP from Story Protocol
  parent_content_hash VARCHAR(66),           -- Hash of parent content
  similarity_score INTEGER NOT NULL,         -- Similarity score (0-100)

  -- Resolution
  status VARCHAR(30) DEFAULT 'pending',      -- pending, approved_as_original, enforced_derivative, rejected
  resolution_notes TEXT,                     -- Admin's notes
  resolved_by VARCHAR(42),                   -- Admin wallet address
  resolved_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table 3: Admin Logs (Audit Trail)
CREATE TABLE admin_logs (
  id SERIAL PRIMARY KEY,
  admin_address VARCHAR(42) NOT NULL,
  action VARCHAR(50) NOT NULL,              -- approve_original, enforce_derivative, etc.
  dispute_id VARCHAR(50),
  details JSONB,                            -- Additional context
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_content_hash ON ip_fingerprints(content_hash);
CREATE INDEX idx_wallet_address ON ip_fingerprints(wallet_address);
CREATE INDEX idx_story_ip_id ON ip_fingerprints(story_ip_id);
CREATE INDEX idx_status ON ip_fingerprints(status);
CREATE INDEX idx_dispute_status ON similarity_disputes(status);
CREATE INDEX idx_dispute_submitted_by ON similarity_disputes(submitted_by);
```

### **MongoDB Schema (Alternative)**

```javascript
// Collection: ipFingerprints
{
  _id: ObjectId,
  contentHash: String (indexed, unique),
  ipfsCid: String,
  walletAddress: String (indexed),
  storyIpId: String (indexed, sparse),
  title: String,
  description: String,
  ipType: String, // Text, Video, Audio, Image
  fileSize: Number,
  mimeType: String,
  royaltyRate: Number,
  licenseType: String,
  status: String,
  createdAt: Date,
  updatedAt: Date
}

// Collection: similarityDisputes
{
  _id: ObjectId,
  disputeId: String (indexed, unique),
  submittedBy: String (indexed),
  contentHash: String,
  contentTitle: String,
  ipfsCid: String,
  parentIpId: String,
  parentContentHash: String,
  similarityScore: Number,
  status: String (indexed),
  resolutionNotes: String,
  resolvedBy: String,
  resolvedAt: Date,
  createdAt: Date
}
```

---

## 📡 API ENDPOINTS

### **Base URL:** `http://localhost:3001/api` (or your deployed domain)

---

### **1. POST `/api/fingerprint`**

**Purpose:** Upload content, generate hash, upload to IPFS, save to database

**Authentication:** Optional (use JWT or wallet signature for production)

**Request:**
```http
POST /api/fingerprint
Content-Type: multipart/form-data

Form Data:
- file: File (required) - The content file (text for MVP)
- title: string (required) - Asset title
- description: string (optional) - Asset description
- walletAddress: string (required) - Creator's wallet address
- ipType: string (default: 'Text') - Text, Video, Audio, Image
- royaltyRate: number (default: 10) - Royalty percentage (0-100)
```

**Processing Steps:**
1. Validate file upload (max size, allowed MIME types)
2. Read file content
3. Generate content hash:
   - **Text:** SHA256 of normalized content (lowercase, trimmed)
   - **Video (Phase 2):** Perceptual hash using ffmpeg + blockhash
4. Check if hash already exists in database (duplicate detection)
5. Upload file to Pinata IPFS
6. Save fingerprint to database with status='pending'
7. Return hash and IPFS CID to frontend

**Response:**
```json
{
  "success": true,
  "data": {
    "contentHash": "0x123abc456def...",
    "ipfsCid": "QmXxx123...",
    "fileSize": 1024,
    "mimeType": "text/plain",
    "fingerprintId": 42
  }
}
```

**Error Cases:**
- 400: Missing required fields
- 400: File too large (>10MB for text, >100MB for video later)
- 400: Invalid file type
- 409: Content hash already exists (duplicate)
- 500: IPFS upload failed

---

### **2. POST `/api/check-similarity`**

**Purpose:** Check if uploaded content is similar to existing IPs in database

**Request:**
```http
POST /api/check-similarity
Content-Type: application/json

{
  "contentHash": "0x123abc456def..."
}
```

**Processing Steps:**
1. Query database for all existing content hashes
2. Calculate similarity scores:
   - **MVP (Text):** Exact match = 100, no match = 0
   - **Phase 2 (Text):** Use Levenshtein distance or TF-IDF cosine similarity
   - **Phase 3 (Video):** Hamming distance on perceptual hashes
3. Find best match and return score
4. If score >= 60, fetch parent IP details from database

**Similarity Logic:**
```javascript
// MVP: Exact match only
if (uploadedHash === existingHash) {
  score = 100;
} else {
  score = 0;
}

// Phase 2: Levenshtein distance for text
function calculateTextSimilarity(text1, text2) {
  const distance = levenshtein(text1, text2);
  const maxLength = Math.max(text1.length, text2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity);
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 92,
    "isMatch": true,              // score >= 85
    "isPotentialMatch": false,    // 60 <= score < 85
    "parentIpId": "0xABC123...",  // Story Protocol IP ID (if found)
    "parentMetadata": {
      "title": "Original Song - Summer Nights",
      "creator": "0x789def...",
      "contentHash": "0x456def...",
      "ipfsCid": "QmYyy456..."
    }
  }
}
```

**Response Cases:**
- **Score >= 85:** `isMatch: true` → Frontend shows RED alert, forces derivative linking
- **Score 60-84:** `isPotentialMatch: true` → Frontend shows YELLOW alert, sends to admin
- **Score < 60:** `isMatch: false` → Frontend proceeds as original

---

### **3. POST `/api/disputes/create`**

**Purpose:** Create a dispute for admin review (called when similarity is 60-84%)

**Request:**
```http
POST /api/disputes/create
Content-Type: application/json

{
  "submittedBy": "0x123...",
  "contentHash": "0xabc...",
  "contentTitle": "Remix Song v2",
  "ipfsCid": "QmZzz789...",
  "parentIpId": "0xABC123...",
  "parentContentHash": "0x456def...",
  "similarityScore": 72
}
```

**Processing:**
1. Generate unique dispute ID (e.g., `dispute_1234567890`)
2. Insert into `similarity_disputes` table with status='pending'
3. Return dispute ID

**Response:**
```json
{
  "success": true,
  "data": {
    "disputeId": "dispute_1234567890",
    "status": "pending"
  }
}
```

---

### **4. GET `/api/disputes/pending`**

**Purpose:** Fetch all pending disputes for admin review

**Authentication:** Admin only (check wallet signature or JWT)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "disputeId": "dispute_1234567890",
      "submittedBy": "0x456...",
      "contentTitle": "Remix Song v2",
      "ipfsCid": "QmZzz789...",
      "parentIpId": "0xABC123...",
      "parentMetadata": {
        "title": "Original Song - Summer Nights",
        "creator": "0x789def..."
      },
      "similarityScore": 72,
      "status": "pending",
      "createdAt": "2025-12-11T10:30:00Z"
    }
  ]
}
```

---

### **5. POST `/api/disputes/:disputeId/resolve`**

**Purpose:** Admin resolves a dispute (approve as original or enforce derivative)

**Authentication:** Admin only

**Request:**
```http
POST /api/disputes/dispute_1234567890/resolve
Content-Type: application/json

{
  "resolution": "approved_as_original",  // or "enforced_derivative"
  "adminAddress": "0xAdmin123...",
  "notes": "Reviewed content, confirmed as original work"
}
```

**Processing:**
1. Update dispute status in database
2. If `enforced_derivative`:
   - Call Story Protocol SDK to register derivative on-chain
   - Update `ip_fingerprints` table with parent linkage
3. Log admin action in `admin_logs` table

**Response:**
```json
{
  "success": true,
  "data": {
    "disputeId": "dispute_1234567890",
    "resolution": "approved_as_original",
    "resolvedAt": "2025-12-11T11:00:00Z"
  }
}
```

---

### **6. GET `/api/assets`**

**Purpose:** Fetch user's registered IP assets (dashboard quick fetch)

**Query Parameters:**
- `walletAddress` (required) - User's wallet address
- `status` (optional) - Filter by status (pending, registered, disputed)
- `limit` (optional, default: 50) - Max results
- `offset` (optional, default: 0) - Pagination

**Example:**
```http
GET /api/assets?walletAddress=0x123...&status=registered&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "contentHash": "0xabc...",
      "ipfsCid": "QmXxx123...",
      "storyIpId": "0xIPID123...",
      "title": "Original Song - Summer Nights",
      "description": "A chill summer track",
      "ipType": "Text",
      "royaltyRate": 10,
      "licenseType": "commercial",
      "status": "registered",
      "createdAt": "2025-12-10T08:00:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0
  }
}
```

---

### **7. PATCH `/api/assets/:contentHash/update-status`**

**Purpose:** Update IP fingerprint status after Story Protocol registration

**Request:**
```http
PATCH /api/assets/0xabc.../update-status
Content-Type: application/json

{
  "storyIpId": "0xIPID123...",
  "status": "registered"
}
```

**Processing:**
1. Find fingerprint by contentHash
2. Update `story_ip_id` and `status` fields
3. Update `updated_at` timestamp

**Response:**
```json
{
  "success": true,
  "message": "IP fingerprint updated successfully"
}
```

---

## 🔐 AUTHENTICATION & SECURITY

### **MVP: No Authentication**
- For initial testing, endpoints are open
- Rate limiting: 100 requests per minute per IP

### **Production: Wallet Signature Authentication**
```javascript
// Request headers
{
  "X-Wallet-Address": "0x123...",
  "X-Signature": "0xabc...",  // Signed message: "IP-OPS Auth: {timestamp}"
  "X-Timestamp": "1234567890"
}

// Backend validation
function verifySignature(address, signature, timestamp) {
  // Check timestamp is within 5 minutes
  const now = Date.now();
  if (Math.abs(now - timestamp) > 300000) return false;

  // Recover signer from signature
  const message = `IP-OPS Auth: ${timestamp}`;
  const recovered = ethers.utils.verifyMessage(message, signature);

  return recovered.toLowerCase() === address.toLowerCase();
}
```

### **Admin Endpoints: Hardcoded Admin List**
```javascript
const ADMIN_ADDRESSES = [
  '0xAdmin1...'.toLowerCase(),
  '0xAdmin2...'.toLowerCase()
];

function isAdmin(address) {
  return ADMIN_ADDRESSES.includes(address.toLowerCase());
}
```

---

## 🧪 TEXT HASHING IMPLEMENTATION (MVP)

### **Node.js Implementation:**

```javascript
const crypto = require('crypto');

/**
 * Generate SHA256 hash of text content
 * @param {string} text - Raw text content
 * @returns {string} - Hash in hex format (0x...)
 */
function generateTextHash(text) {
  // Normalize text to reduce false negatives
  const normalized = text
    .toLowerCase()               // Case-insensitive
    .replace(/\s+/g, ' ')       // Collapse multiple spaces
    .replace(/[^\w\s]/g, '')    // Remove punctuation (optional)
    .trim();                    // Remove leading/trailing spaces

  // Generate SHA256 hash
  const hash = crypto.createHash('sha256')
    .update(normalized, 'utf8')
    .digest('hex');

  return `0x${hash}`;
}

/**
 * Calculate text similarity (MVP: exact match only)
 * @param {string} hash1 - First content hash
 * @param {string} hash2 - Second content hash
 * @returns {number} - Similarity score (0-100)
 */
function calculateTextSimilarity(hash1, hash2) {
  if (hash1 === hash2) return 100;
  return 0;
}

// Example usage
const text1 = "The quick brown fox jumps over the lazy dog.";
const text2 = "the quick brown fox jumps over the lazy dog"; // Different case/punctuation

const hash1 = generateTextHash(text1);
const hash2 = generateTextHash(text2);

console.log(hash1 === hash2); // true (after normalization)
```

### **Phase 2: Fuzzy Text Matching (Levenshtein Distance)**

```javascript
const stringSimilarity = require('string-similarity');

/**
 * Calculate fuzzy text similarity
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} - Similarity score (0-100)
 */
function calculateFuzzyTextSimilarity(text1, text2) {
  const similarity = stringSimilarity.compareTwoStrings(
    text1.toLowerCase(),
    text2.toLowerCase()
  );
  return Math.round(similarity * 100);
}

// Example
const original = "The quick brown fox jumps over the lazy dog";
const modified = "The quick brown fox leaps over a lazy dog"; // Minor changes

const score = calculateFuzzyTextSimilarity(original, modified);
console.log(score); // ~85-90 (high similarity)
```

---

## 🎥 VIDEO HASHING (PHASE 3 - FUTURE)

### **Approach: Perceptual Hashing**

```javascript
const ffmpeg = require('fluent-ffmpeg');
const { blockhash } = require('blockhash-js');
const sharp = require('sharp');

/**
 * Generate perceptual hash of video
 * @param {string} videoPath - Path to video file
 * @returns {string} - Perceptual hash
 */
async function generateVideoHash(videoPath) {
  // Step 1: Extract keyframes using ffmpeg
  const keyframes = await extractKeyframes(videoPath, 10); // 10 frames

  // Step 2: Generate perceptual hash for each frame
  const frameHashes = [];
  for (const frame of keyframes) {
    const imageBuffer = await sharp(frame).resize(32, 32).toBuffer();
    const hash = blockhash(imageBuffer, 16); // 16-bit blockhash
    frameHashes.push(hash);
  }

  // Step 3: Combine frame hashes into single video hash
  const combinedHash = frameHashes.join('');
  const videoHash = crypto.createHash('sha256')
    .update(combinedHash)
    .digest('hex');

  return `0x${videoHash}`;
}

/**
 * Calculate Hamming distance between two perceptual hashes
 * @param {string} hash1
 * @param {string} hash2
 * @returns {number} - Distance (0-256)
 */
function hammingDistance(hash1, hash2) {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

/**
 * Calculate video similarity based on Hamming distance
 * @param {string} hash1
 * @param {string} hash2
 * @returns {number} - Similarity score (0-100)
 */
function calculateVideoSimilarity(hash1, hash2) {
  const distance = hammingDistance(hash1, hash2);
  const maxDistance = hash1.length;
  const similarity = ((maxDistance - distance) / maxDistance) * 100;
  return Math.round(similarity);
}
```

---

## 🚀 DEPLOYMENT

### **Environment Variables (.env)**

```bash
# Server
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ipops
# or
MONGO_URI=mongodb://localhost:27017/ipops

# Pinata IPFS
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt

# Story Protocol
STORY_RPC_URL=https://rpc-sepolia.story.foundation
STORY_CHAIN_ID=sepolia

# Admin Wallets (comma-separated)
ADMIN_ADDRESSES=0xAdmin1...,0xAdmin2...

# Security
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### **Deployment Options:**

1. **Railway.app** (Easiest)
   - Push to GitHub
   - Connect Railway to repo
   - Add PostgreSQL add-on
   - Set environment variables
   - Deploy

2. **Render.com** (Free tier)
   - Similar to Railway
   - Includes free PostgreSQL

3. **AWS EC2** (Production)
   - Set up Ubuntu server
   - Install Node.js, PostgreSQL
   - Use PM2 for process management
   - Set up NGINX reverse proxy

---

## 📊 MONITORING & LOGGING

### **Key Metrics to Track:**
- Total fingerprints stored
- Similarity checks per day
- Average similarity score
- Disputes created vs resolved
- IPFS upload success rate
- API response times

### **Logging:**
```javascript
// Use winston or pino for structured logging
const logger = require('winston');

logger.info('Fingerprint created', {
  contentHash: '0xabc...',
  walletAddress: '0x123...',
  ipfsCid: 'QmXxx...'
});

logger.warn('High similarity detected', {
  score: 92,
  parentIpId: '0xABC...'
});

logger.error('IPFS upload failed', {
  error: err.message,
  file: 'content.txt'
});
```

---

## ✅ TESTING CHECKLIST

- [ ] Upload text file → Generate hash → Verify IPFS upload
- [ ] Check similarity with exact match (100% score)
- [ ] Check similarity with no match (0% score)
- [ ] Create dispute for 70% similarity
- [ ] Admin approve dispute as original
- [ ] Admin enforce derivative link
- [ ] Fetch user assets by wallet address
- [ ] Update fingerprint status after Story Protocol registration
- [ ] Test rate limiting
- [ ] Test error handling (invalid file, missing fields, etc.)

---

**End of Backend Specification. Ready for implementation after approval.**
