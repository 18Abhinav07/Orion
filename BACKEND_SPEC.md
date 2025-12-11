# Backend API Specification for Story Protocol Integration

This document specifies the data flow between frontend and backend for Story Protocol IP registration.

## Architecture Overview

**Frontend Responsibility:**
- Call Story Protocol SDK directly
- Send results to backend for caching
- Handle UI/UX and user interactions

**Backend Responsibility:**
- Content fingerprinting (SHA256 hashing)
- IPFS uploads (Pinata)
- Similarity detection
- Database caching
- Admin review queue

---

## 📌 API Endpoint 1: Content Fingerprinting + IPFS Upload

### `POST /api/fingerprint`

**Purpose:** Fingerprint content, upload to IPFS, create metadata JSON, upload metadata to IPFS

**Request Format:** `multipart/form-data`

**Request Body:**
```typescript
{
  // File content
  file: File,                    // The actual content file (text, image, video, audio)

  // IP Asset metadata
  title: string,                 // IP asset title
  description: string,           // IP asset description (can be empty)
  walletAddress: string,         // Creator's wallet address (0x...)
  ipType: 'Text' | 'Image' | 'Video' | 'Audio',
  royaltyPercent: string,        // e.g., "10"

  // Additional metadata attributes (JSON string)
  attributes: string             // JSON.stringify([...])
}
```

**Example Request:**
```javascript
const formData = new FormData();
formData.append('file', registerForm.contentFiles[0]);
formData.append('title', 'My Creative Work');
formData.append('description', 'A beautiful piece of art');
formData.append('walletAddress', '0x1234...');
formData.append('ipType', 'Image');
formData.append('royaltyPercent', '10');
formData.append('attributes', JSON.stringify([
  { trait_type: 'IP Type', value: 'Image' },
  { trait_type: 'Royalty Rate', value: '10%' },
  { trait_type: 'Creator', value: '0x1234...' },
  { trait_type: 'Blockchain', value: 'Story Protocol' },
  { trait_type: 'Network', value: 'Story Aeined Testnet' }
]));
```

**Response Format:** `application/json`

**Response Body:**
```typescript
{
  hash: string,              // SHA256 hash of content (0xabc...)
  ipfsCid: string,          // IPFS CID of content file (Qm...)
  ipMetadataURI: string,    // IPFS URI for IP metadata (ipfs://Qm...)
  ipMetadataHash: string,   // Keccak256 hash of IP metadata (0xdef...)
  nftMetadataURI: string,   // IPFS URI for NFT metadata (ipfs://Qm...)
  nftMetadataHash: string   // Keccak256 hash of NFT metadata (0xghi...)
}
```

**Example Response:**
```json
{
  "hash": "0xabc123...",
  "ipfsCid": "QmXyz789...",
  "ipMetadataURI": "ipfs://QmMetadata123...",
  "ipMetadataHash": "0xdef456...",
  "nftMetadataURI": "ipfs://QmMetadata123...",
  "nftMetadataHash": "0xdef456..."
}
```

**Backend Implementation Steps:**
1. Extract file from request
2. Calculate SHA256 hash of file content
3. Upload file to IPFS (Pinata) → get `ipfsCid`
4. Create metadata JSON:
   ```json
   {
     "name": "title from request",
     "description": "description from request",
     "image": "ipfs://ipfsCid",
     "ipType": "ipType from request",
     "contentHash": "hash",
     "creator": "walletAddress from request",
     "attributes": [parsed attributes array]
   }
   ```
5. Upload metadata JSON to IPFS → get metadata CID
6. Calculate Keccak256 hash of metadata JSON
7. Return response

---

## 📌 API Endpoint 2: Similarity Check

### `POST /api/check-similarity`

**Purpose:** Check if content hash matches existing IPs (similarity detection)

**Request Format:** `application/json`

**Request Body:**
```typescript
{
  contentHash: string  // SHA256 hash from fingerprinting (0xabc...)
}
```

**Response Format:** `application/json`

**Response Body:**
```typescript
{
  score: number,                    // Similarity score 0-100
  status: 'Clean' | 'Warning' | 'Review' | 'Derivative',
  isMatch: boolean,                 // true if score >= 90%
  parentIpId?: string,              // IP ID of matched parent (if isMatch)
  parentMetadata?: {
    ipId: string,
    title: string,
    creator: string,
    ipType: string,
    contentHash: string,
    licenseTermsId: string,
    royaltyRate: number
  }
}
```

**Backend Implementation:**
1. Query database for existing IPs
2. Compare `contentHash` with all existing hashes
3. Calculate similarity score (0-100)
4. If score >= 90%, return parent IP details
5. Return status based on thresholds:
   - < 40%: "Clean"
   - 40-70%: "Warning"
   - 70-90%: "Review"
   - >= 90%: "Derivative"

---

## 📌 API Endpoint 3: Upload Derivative Metadata

### `POST /api/upload-derivative-metadata`

**Purpose:** Upload derivative-specific metadata to IPFS (for similarity >= 90%)

**Request Format:** `application/json`

**Request Body:**
```typescript
{
  title: string,
  description: string,
  ipType: 'Text' | 'Image' | 'Video' | 'Audio',
  contentHash: string,             // SHA256 hash
  walletAddress: string,           // Creator address
  isDerivative: true,
  parentIpId: string,              // Parent IP ID (0x...)
  similarityScore: number,         // 90-100
  attributes: Array<{
    trait_type: string,
    value: string
  }>
}
```

**Response Format:** `application/json`

**Response Body:**
```typescript
{
  ipMetadataURI: string,    // IPFS URI (ipfs://Qm...)
  ipMetadataHash: string,   // Keccak256 hash (0x...)
  nftMetadataURI: string,   // IPFS URI (ipfs://Qm...)
  nftMetadataHash: string   // Keccak256 hash (0x...)
}
```

**Backend Implementation:**
1. Create derivative metadata JSON with parent linkage
2. Upload to IPFS
3. Calculate Keccak256 hash
4. Return URIs and hashes

---

## 📌 API Endpoint 4: Dispute Creation

### `POST /api/disputes/create`

**Purpose:** Create admin review request for similarity 70-90%

**Request Format:** `application/json`

**Request Body:**
```typescript
{
  submittedBy: string,              // Creator wallet address
  contentHash: string,              // SHA256 hash
  contentTitle: string,
  contentDescription: string,
  ipType: 'Text' | 'Image' | 'Video' | 'Audio',
  ipfsCid: string,                  // Content IPFS CID
  parentIpId: string,               // Matched parent IP ID
  parentContentHash: string,
  parentTitle: string,
  similarityScore: number,          // 70-90
  ipMetadataURI: string,           // Pre-uploaded metadata URI
  ipMetadataHash: string,
  nftMetadataURI: string,
  nftMetadataHash: string
}
```

**Response Format:** `application/json`

**Response Body:**
```typescript
{
  disputeId: string,
  status: 'Pending_Review',
  message: string
}
```

---

## 📌 API Endpoint 5: Cache IP Registration

### `POST /api/cache/ip-registration`

**Purpose:** Cache Story Protocol registration results in database

**Request Format:** `application/json`

**Request Body:**
```typescript
{
  contentHash: string,              // SHA256 hash
  ipfsCid: string,                  // Content IPFS CID
  walletAddress: string,            // Creator address
  storyIpId: string,                // Story Protocol IP ID (0x...)
  tokenId: string,                  // NFT token ID (bigint as string)
  licenseTermsId: string,           // License terms ID (bigint as string)
  txHash: string,                   // Transaction hash (0x...)
  title: string,
  description: string,
  ipType: 'Text' | 'Image' | 'Video' | 'Audio',
  royaltyPercent: number,           // 0-100
  commercialRevShare: number,       // Basis points (royaltyPercent * 100)
  metadata: {
    ipMetadataURI: string,
    ipMetadataHash: string,
    nftMetadataURI: string,
    nftMetadataHash: string
  }
}
```

**Response:** `200 OK` or error

**Backend Implementation:**
1. Insert into `ip_registrations` table
2. Link to user wallet
3. Store all metadata for future queries
4. Index by `storyIpId`, `contentHash`, `walletAddress`

---

## 📌 API Endpoint 6: Cache Derivative Registration

### `POST /api/cache/derivative-registration`

**Purpose:** Cache derivative IP registration and parent linkage

**Request Format:** `application/json`

**Request Body:**
```typescript
{
  childIpId: string,                // Child IP ID (0x...)
  childTokenId: string,             // Child NFT token ID
  childTxHash: string,              // Registration tx hash
  parentIpIds: string[],            // Array of parent IP IDs
  licenseTermsIds: string[],        // License terms from parents
  linkTxHash: string,               // Derivative linking tx hash
  contentHash: string,              // SHA256 hash
  walletAddress: string,            // Creator address
  title: string,
  description: string,
  ipType: 'Text' | 'Image' | 'Video' | 'Audio',
  similarityScore: number,          // 90-100
  metadata: {
    ipMetadataURI: string,
    ipMetadataHash: string,
    nftMetadataURI: string,
    nftMetadataHash: string
  }
}
```

**Response:** `200 OK` or error

**Backend Implementation:**
1. Insert into `ip_registrations` table (status: 'Derivative')
2. Insert into `derivative_links` table (child-parent mapping)
3. Store similarity score
4. Index for royalty distribution queries

---

## 📌 API Endpoint 7: Get IP Registrations

### `GET /api/assets?walletAddress={address}`

**Purpose:** Fetch all IP registrations for a wallet

**Response Format:** `application/json`

**Response Body:**
```typescript
Array<{
  ipId: string,
  creator: string,
  title: string,
  ipType: 'Text' | 'Image' | 'Video' | 'Audio',
  contentHash: string,
  ipfsCid: string,
  metadataURI: string,
  licenseTermsId?: string,
  royaltyRate: number,
  status: 'Registered' | 'Derivative' | 'Pending_Review',
  registeredAt: Date,
  tokenId?: string,
  txHash?: string
}>
```

---

## 📊 Metadata JSON Structure

### IP Metadata JSON (Uploaded to IPFS)
```json
{
  "name": "My Creative Work",
  "description": "A beautiful piece of art",
  "image": "ipfs://QmContentCID...",
  "ipType": "Image",
  "contentHash": "0xabc123...",
  "creator": "0x1234...",
  "attributes": [
    { "trait_type": "IP Type", "value": "Image" },
    { "trait_type": "Royalty Rate", "value": "10%" },
    { "trait_type": "Creator", "value": "0x1234..." },
    { "trait_type": "Blockchain", "value": "Story Protocol" },
    { "trait_type": "Network", "value": "Story Aeined Testnet" }
  ]
}
```

### Derivative Metadata JSON
```json
{
  "name": "Derivative Work Title",
  "description": "Based on parent work",
  "image": "ipfs://QmContentCID...",
  "ipType": "Image",
  "contentHash": "0xdef456...",
  "creator": "0x5678...",
  "isDerivative": true,
  "parentIpId": "0xParentIpId...",
  "attributes": [
    { "trait_type": "IP Type", "value": "Image" },
    { "trait_type": "Is Derivative", "value": "true" },
    { "trait_type": "Parent IP", "value": "0xParentIpId..." },
    { "trait_type": "Parent Title", "value": "Original Work" },
    { "trait_type": "Similarity Score", "value": "95%" },
    { "trait_type": "Creator", "value": "0x5678..." },
    { "trait_type": "Blockchain", "value": "Story Protocol" },
    { "trait_type": "Network", "value": "Story Aeined Testnet" }
  ]
}
```

---

## 🔄 Complete Registration Flow

### Original IP Registration (Score < 90%)
```
1. User uploads content
   ↓
2. Frontend → POST /api/fingerprint (with full metadata)
   ↓
3. Backend: fingerprint + IPFS upload
   ↓
4. Frontend ← Returns { hash, ipfsCid, ipMetadataURI, ipMetadataHash, ... }
   ↓
5. Frontend → POST /api/check-similarity
   ↓
6. Backend checks similarity
   ↓
7. If score < 40%: proceed
   If score 40-70%: show warning, user confirms
   If score 70-90%: POST /api/disputes/create
   If score >= 90%: show derivative dialog
   ↓
8. Frontend → Story Protocol SDK (registerIpAssetWithLicense)
   ↓
9. Frontend → POST /api/cache/ip-registration
   ↓
10. Done ✅
```

### Derivative Registration (Score >= 90%)
```
1. User shown derivative dialog
   ↓
2. User confirms derivative registration
   ↓
3. Frontend → POST /api/upload-derivative-metadata
   ↓
4. Backend uploads derivative metadata to IPFS
   ↓
5. Frontend ← Returns { ipMetadataURI, ipMetadataHash, ... }
   ↓
6. Frontend → Story Protocol SDK (registerIpAsset)
   ↓
7. Frontend → Story Protocol SDK (registerDerivative - link to parent)
   ↓
8. Frontend → POST /api/cache/derivative-registration
   ↓
9. Done ✅
```

---

## 🎯 Key Points

1. **Backend handles ALL IPFS uploads** - Frontend never uploads to Pinata
2. **Metadata is created in backend** - Ensures consistency and completeness
3. **Frontend focuses on Story Protocol SDK** - Direct blockchain interaction
4. **Backend caches all results** - Fast queries without blockchain reads
5. **Similarity detection is backend logic** - Centralized and secure
6. **Hashing uses SHA256 for content, Keccak256 for metadata** - Story Protocol standard

---

## 📝 Database Schema Recommendations

### `ip_registrations` table
```sql
CREATE TABLE ip_registrations (
  id SERIAL PRIMARY KEY,
  story_ip_id VARCHAR(66) UNIQUE NOT NULL,
  token_id VARCHAR(100),
  content_hash VARCHAR(66) UNIQUE NOT NULL,
  ipfs_cid VARCHAR(100) NOT NULL,
  creator_address VARCHAR(42) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  ip_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'Registered',
  royalty_percent INTEGER NOT NULL,
  license_terms_id VARCHAR(100),
  tx_hash VARCHAR(66),
  ip_metadata_uri TEXT,
  ip_metadata_hash VARCHAR(66),
  nft_metadata_uri TEXT,
  nft_metadata_hash VARCHAR(66),
  registered_at TIMESTAMP DEFAULT NOW(),
  INDEX (creator_address),
  INDEX (content_hash),
  INDEX (story_ip_id)
);
```

### `derivative_links` table
```sql
CREATE TABLE derivative_links (
  id SERIAL PRIMARY KEY,
  child_ip_id VARCHAR(66) NOT NULL,
  parent_ip_id VARCHAR(66) NOT NULL,
  license_terms_id VARCHAR(100),
  similarity_score DECIMAL(5,2),
  link_tx_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX (child_ip_id),
  INDEX (parent_ip_id)
);
```

### `disputes` table
```sql
CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  submitted_by VARCHAR(42) NOT NULL,
  content_hash VARCHAR(66) NOT NULL,
  content_title VARCHAR(255),
  ip_type VARCHAR(20),
  ipfs_cid VARCHAR(100),
  parent_ip_id VARCHAR(66),
  similarity_score DECIMAL(5,2),
  status VARCHAR(20) DEFAULT 'Pending_Review',
  ip_metadata_uri TEXT,
  admin_decision VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  INDEX (submitted_by),
  INDEX (status)
);
```

---

## ✅ Implementation Checklist

- [ ] POST /api/fingerprint - Content fingerprinting + IPFS upload
- [ ] POST /api/check-similarity - Similarity detection
- [ ] POST /api/upload-derivative-metadata - Derivative metadata upload
- [ ] POST /api/disputes/create - Admin review queue
- [ ] POST /api/cache/ip-registration - Cache original IP
- [ ] POST /api/cache/derivative-registration - Cache derivative IP
- [ ] GET /api/assets - Fetch user's IP registrations
- [ ] Database schema implementation
- [ ] Pinata API integration
- [ ] SHA256 hashing utility
- [ ] Keccak256 hashing utility (ethers.utils.keccak256)
- [ ] Similarity algorithm implementation
