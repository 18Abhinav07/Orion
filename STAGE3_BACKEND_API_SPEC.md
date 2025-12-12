# 🔧 STAGE 3: LICENSE TERMS - BACKEND API SPECIFICATION

**Version:** 1.0  
**Date:** December 12, 2025  
**Purpose:** Backend API implementation guide for Story Protocol license terms integration  
**Target Audience:** Backend developers  

---

## 📋 OVERVIEW

This document specifies the backend API endpoints required for Stage 3 (License Terms Attachment) of the Story Protocol integration.

### **What We're Building:**
Backend services to support:
1. ✅ License terms caching (avoid redundant blockchain registrations)
2. ✅ IP registration finalization (store complete license metadata)
3. ✅ Marketplace queries (fast filtering by license type, royalty %)
4. ✅ License analytics (track which terms are popular)

### **Key Features:**
- **Smart Caching** - Reuse Story Protocol preset IDs when possible
- **Fast Queries** - SQL-based marketplace filtering (no blockchain calls)
- **Extensible** - Easy to add new license types later
- **Secure** - JWT authentication for write operations

---

## 🌐 API ENDPOINTS OVERVIEW

```
BASE_URL: http://localhost:3001/api

┌──────────────────────────────────────────────────────┐
│ ENDPOINT                              AUTH   METHOD  │
├──────────────────────────────────────────────────────┤
│ /license-terms/find                   No     GET     │
│ /license-terms/cache                  Yes    POST    │
│ /verification/token/:nonce/finalize   Yes    PATCH   │
│ /marketplace/ips                      No     GET     │
└──────────────────────────────────────────────────────┘

Authentication: JWT Bearer Token
Content-Type: application/json
```

---

## 🔍 ENDPOINT 1: Find Cached License Terms

### **GET `/api/license-terms/find`**

**Purpose:** Check if license terms already exist in cache to avoid redundant blockchain registration.

**Authentication:** ❌ None (Public)

---

### **Request**

```http
GET /api/license-terms/find?type=commercial_remix&royalty=12
```

**Query Parameters:**

| Parameter | Type   | Required | Description                               | Example             |
|-----------|--------|----------|-------------------------------------------|---------------------|
| `type`    | string | ✅ Yes   | License type                              | `commercial_remix`  |
| `royalty` | number | ✅ Yes   | Royalty percentage (0-100)                | `12`                |

**Valid License Types:**
- `commercial_remix` - Commercial use allowed, derivatives allowed
- `non_commercial` - No commercial use, derivatives allowed

---

### **Responses**

#### **Success - Found in Cache (200 OK)**

```json
{
  "success": true,
  "licenseTermsId": "144",
  "cached": true,
  "licenseType": "commercial_remix",
  "royaltyPercent": 12
}
```

#### **Success - Not Found (200 OK)**

```json
{
  "success": true,
  "licenseTermsId": null,
  "cached": false,
  "message": "License terms not cached, registration required"
}
```

#### **Bad Request - Missing Parameters (400)**

```json
{
  "success": false,
  "error": "Missing required query parameters: type, royalty"
}
```

#### **Invalid Royalty Percent (422)**

```json
{
  "success": false,
  "error": "Invalid royalty percent. Must be between 0 and 100",
  "received": 150
}
```

#### **Invalid License Type (422)**

```json
{
  "success": false,
  "error": "Invalid license type. Must be commercial_remix or non_commercial",
  "received": "invalid_type"
}
```

---

### **Implementation (Node.js/Express)**

```javascript
// routes/licenseTerms.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/license-terms/find', async (req, res) => {
  try {
    const { type, royalty } = req.query;
    
    // Validation
    if (!type || royalty === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: type, royalty'
      });
    }
    
    const royaltyNum = parseInt(royalty);
    if (isNaN(royaltyNum) || royaltyNum < 0 || royaltyNum > 100) {
      return res.status(422).json({
        success: false,
        error: 'Invalid royalty percent. Must be between 0 and 100',
        received: royalty
      });
    }
    
    if (!['commercial_remix', 'non_commercial'].includes(type)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid license type. Must be commercial_remix or non_commercial',
        received: type
      });
    }
    
    // Check cache
    const cached = await db.query(
      `SELECT license_terms_id, license_type, royalty_percent, created_at
       FROM license_terms_cache
       WHERE license_type = $1 AND royalty_percent = $2`,
      [type, royaltyNum]
    );
    
    if (cached.rows.length > 0) {
      const row = cached.rows[0];
      res.json({
        success: true,
        licenseTermsId: row.license_terms_id,
        cached: true,
        licenseType: row.license_type,
        royaltyPercent: row.royalty_percent
      });
    } else {
      res.json({
        success: true,
        licenseTermsId: null,
        cached: false,
        message: 'License terms not cached, registration required'
      });
    }
    
  } catch (error) {
    console.error('Error finding license terms:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
```

---

## 💾 ENDPOINT 2: Cache License Terms

### **POST `/api/license-terms/cache`**

**Purpose:** Store newly registered license terms for future reuse.

**Authentication:** ✅ JWT Bearer Token

---

### **Request**

```http
POST /api/license-terms/cache
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**

```json
{
  "licenseType": "commercial_remix",
  "royaltyPercent": 12,
  "licenseTermsId": "144",
  "transactionHash": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Body Schema:**

| Field             | Type   | Required | Description                              | Example                    |
|-------------------|--------|----------|------------------------------------------|----------------------------|
| `licenseType`     | string | ✅ Yes   | License type                             | `commercial_remix`         |
| `royaltyPercent`  | number | ✅ Yes   | Royalty percentage (0-100)               | `12`                       |
| `licenseTermsId`  | string | ✅ Yes   | Story Protocol license terms ID          | `144`                      |
| `transactionHash` | string | ❌ No    | Blockchain transaction hash (optional)   | `0xabc123...`              |

---

### **Responses**

#### **Created Successfully (201)**

```json
{
  "success": true,
  "message": "License terms cached successfully",
  "data": {
    "licenseType": "commercial_remix",
    "royaltyPercent": 12,
    "licenseTermsId": "144",
    "createdAt": "2025-12-12T10:30:45.123Z"
  }
}
```

#### **Already Exists (200 OK)**

```json
{
  "success": true,
  "message": "License terms already cached",
  "data": {
    "licenseType": "commercial_remix",
    "royaltyPercent": 12,
    "licenseTermsId": "144",
    "createdAt": "2025-12-11T08:15:30.456Z"
  }
}
```

#### **Bad Request - Missing Fields (400)**

```json
{
  "success": false,
  "error": "Missing required fields: licenseType, royaltyPercent, licenseTermsId",
  "received": {
    "licenseType": "commercial_remix",
    "royaltyPercent": null,
    "licenseTermsId": null
  }
}
```

#### **Unauthorized (401)**

```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### **Invalid License Type (422)**

```json
{
  "success": false,
  "error": "Invalid license type",
  "received": "invalid_type"
}
```

---

### **Implementation**

```javascript
// routes/licenseTerms.js
const { authenticateToken } = require('../middleware/auth');

router.post('/license-terms/cache', authenticateToken, async (req, res) => {
  try {
    const { licenseType, royaltyPercent, licenseTermsId, transactionHash } = req.body;
    
    // Validation
    if (!licenseType || royaltyPercent === undefined || !licenseTermsId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: licenseType, royaltyPercent, licenseTermsId',
        received: { licenseType, royaltyPercent, licenseTermsId }
      });
    }
    
    if (!['commercial_remix', 'non_commercial'].includes(licenseType)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid license type',
        received: licenseType
      });
    }
    
    if (typeof royaltyPercent !== 'number' || royaltyPercent < 0 || royaltyPercent > 100) {
      return res.status(422).json({
        success: false,
        error: 'Invalid royalty percent. Must be between 0 and 100',
        received: royaltyPercent
      });
    }
    
    // Insert or update if exists
    const result = await db.query(
      `INSERT INTO license_terms_cache 
       (license_type, royalty_percent, license_terms_id, transaction_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (license_type, royalty_percent) 
       DO UPDATE SET 
         license_terms_id = EXCLUDED.license_terms_id,
         transaction_hash = COALESCE(EXCLUDED.transaction_hash, license_terms_cache.transaction_hash),
         updated_at = NOW()
       RETURNING *`,
      [licenseType, royaltyPercent, licenseTermsId, transactionHash]
    );
    
    const data = result.rows[0];
    const wasInserted = result.rowCount > 0 && !data.updated_at;
    
    res.status(wasInserted ? 201 : 200).json({
      success: true,
      message: wasInserted ? 'License terms cached successfully' : 'License terms already cached',
      data: {
        licenseType: data.license_type,
        royaltyPercent: data.royalty_percent,
        licenseTermsId: data.license_terms_id,
        createdAt: data.created_at
      }
    });
    
  } catch (error) {
    console.error('Error caching license terms:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
```

---

## ✅ ENDPOINT 3: Finalize IP Registration

### **PATCH `/api/verification/token/:nonce/finalize`**

**Purpose:** Finalize IP registration by attaching license terms metadata.

**Authentication:** ✅ JWT Bearer Token

---

### **Request**

```http
PATCH /api/verification/token/23/finalize
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type   | Required | Description                   | Example |
|-----------|--------|----------|-------------------------------|---------|
| `nonce`   | number | ✅ Yes   | Verification token nonce      | `23`    |

**Request Body:**

```json
{
  "ipId": "0xfa0f47f4fc0cb501b2184c5964ae41f2e4735e21",
  "tokenId": 3,
  "txHash": "0x1234567890abcdef1234567890abcdef12345678",
  "licenseTermsId": "144",
  "licenseType": "commercial_remix",
  "royaltyPercent": 12,
  "licenseTxHash": "0xabcdef1234567890abcdef1234567890abcdef12"
}
```

**Body Schema:**

| Field            | Type   | Required | Description                          | Example                       |
|------------------|--------|----------|--------------------------------------|-------------------------------|
| `ipId`           | string | ✅ Yes   | Story Protocol IP ID                 | `0xfa0f47f4...`               |
| `tokenId`        | number | ✅ Yes   | NFT token ID                         | `3`                           |
| `txHash`         | string | ✅ Yes   | IP registration transaction hash     | `0x1234...`                   |
| `licenseTermsId` | string | ✅ Yes   | License terms ID                     | `144`                         |
| `licenseType`    | string | ✅ Yes   | License type                         | `commercial_remix`            |
| `royaltyPercent` | number | ✅ Yes   | Royalty percentage (0-100)           | `12`                          |
| `licenseTxHash`  | string | ❌ No    | License attachment transaction hash  | `0xabcdef...`                 |

---

### **Responses**

#### **Success (200 OK)**

```json
{
  "success": true,
  "message": "IP registration finalized successfully",
  "data": {
    "nonce": 23,
    "ipId": "0xfa0f47f4fc0cb501b2184c5964ae41f2e4735e21",
    "tokenId": 3,
    "status": "registered",
    "licenseType": "commercial_remix",
    "royaltyPercent": 12,
    "allowDerivatives": true,
    "commercialUse": true,
    "registeredAt": "2025-12-12T10:30:45.123Z"
  }
}
```

#### **Not Found (404)**

```json
{
  "success": false,
  "error": "Verification token not found",
  "nonce": 23
}
```

#### **Bad Request - Missing Fields (400)**

```json
{
  "success": false,
  "error": "Missing required fields: ipId, tokenId, txHash, licenseTermsId, licenseType, royaltyPercent",
  "received": {
    "ipId": "0xfa0f...",
    "tokenId": null,
    "txHash": null
  }
}
```

#### **Already Finalized (409 Conflict)**

```json
{
  "success": false,
  "error": "IP already finalized",
  "data": {
    "nonce": 23,
    "status": "registered",
    "ipId": "0xfa0f47f4fc0cb501b2184c5964ae41f2e4735e21"
  }
}
```

#### **Unauthorized (401)**

```json
{
  "success": false,
  "error": "Authentication required"
}
```

---

### **Implementation**

```javascript
// routes/verification.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.patch('/verification/token/:nonce/finalize', authenticateToken, async (req, res) => {
  try {
    const { nonce } = req.params;
    const { 
      ipId, 
      tokenId, 
      txHash, 
      licenseTermsId, 
      licenseType, 
      royaltyPercent,
      licenseTxHash 
    } = req.body;
    
    // Validation
    if (!ipId || !tokenId || !txHash || !licenseTermsId || !licenseType || royaltyPercent === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ipId, tokenId, txHash, licenseTermsId, licenseType, royaltyPercent',
        received: { ipId, tokenId, txHash, licenseTermsId, licenseType, royaltyPercent }
      });
    }
    
    // Check if token exists and belongs to user
    const tokenCheck = await db.query(
      'SELECT * FROM verification_tokens WHERE nonce = $1 AND wallet_address = $2',
      [nonce, req.user.walletAddress]
    );
    
    if (tokenCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Verification token not found',
        nonce: parseInt(nonce)
      });
    }
    
    const token = tokenCheck.rows[0];
    
    // Check if already finalized
    if (token.status === 'registered') {
      return res.status(409).json({
        success: false,
        error: 'IP already finalized',
        data: {
          nonce: token.nonce,
          status: token.status,
          ipId: token.story_ip_id
        }
      });
    }
    
    // Validate license type
    if (!['commercial_remix', 'non_commercial'].includes(licenseType)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid license type',
        received: licenseType
      });
    }
    
    // Calculate derived fields
    const allowDerivatives = ['commercial_remix', 'non_commercial'].includes(licenseType);
    const commercialUse = licenseType === 'commercial_remix';
    
    // Update database
    const result = await db.query(
      `UPDATE verification_tokens
       SET
         story_ip_id = $1,
         token_id = $2,
         tx_hash = $3,
         license_terms_id = $4,
         license_type = $5,
         royalty_percent = $6,
         allow_derivatives = $7,
         commercial_use = $8,
         license_tx_hash = $9,
         status = 'registered',
         license_attached_at = NOW(),
         updated_at = NOW()
       WHERE nonce = $10 AND wallet_address = $11
       RETURNING *`,
      [
        ipId,
        tokenId,
        txHash,
        licenseTermsId,
        licenseType,
        royaltyPercent,
        allowDerivatives,
        commercialUse,
        licenseTxHash,
        nonce,
        req.user.walletAddress
      ]
    );
    
    const updated = result.rows[0];
    
    res.json({
      success: true,
      message: 'IP registration finalized successfully',
      data: {
        nonce: updated.nonce,
        ipId: updated.story_ip_id,
        tokenId: updated.token_id,
        status: updated.status,
        licenseType: updated.license_type,
        royaltyPercent: updated.royalty_percent,
        allowDerivatives: updated.allow_derivatives,
        commercialUse: updated.commercial_use,
        registeredAt: updated.license_attached_at
      }
    });
    
  } catch (error) {
    console.error('Error finalizing mint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
```

---

## 🛍️ ENDPOINT 4: Marketplace IPs

### **GET `/api/marketplace/ips`**

**Purpose:** Fetch registered IPs with license filtering for marketplace display.

**Authentication:** ❌ None (Public)

---

### **Request**

```http
GET /api/marketplace/ips?status=registered&commercialUse=true&maxRoyalty=15&page=1&limit=20
```

**Query Parameters:**

| Parameter      | Type    | Required | Description                      | Example             |
|----------------|---------|----------|----------------------------------|---------------------|
| `status`       | string  | ❌ No    | Filter by status                 | `registered`        |
| `commercialUse`| boolean | ❌ No    | Filter by commercial use         | `true`              |
| `maxRoyalty`   | number  | ❌ No    | Max royalty % (0-100)            | `15`                |
| `minRoyalty`   | number  | ❌ No    | Min royalty % (0-100)            | `5`                 |
| `licenseType`  | string  | ❌ No    | Filter by license type           | `commercial_remix`  |
| `page`         | number  | ❌ No    | Page number (default: 1)         | `1`                 |
| `limit`        | number  | ❌ No    | Items per page (default: 20)     | `20`                |

---

### **Responses**

#### **Success with Results (200 OK)**

```json
{
  "success": true,
  "data": {
    "ips": [
      {
        "ipId": "0xfa0f47f4fc0cb501b2184c5964ae41f2e4735e21",
        "tokenId": 3,
        "contentHash": "0xabc123...",
        "title": "My Original Song",
        "creator": "0x23e67597f0898f747fa3291c8920168adf9455d0",
        "licenseType": "commercial_remix",
        "royaltyPercent": 12,
        "allowDerivatives": true,
        "commercialUse": true,
        "licenseTermsId": "144",
        "ipMetadataUri": "ipfs://QmTest...",
        "registeredAt": "2025-12-12T10:30:45.123Z"
      },
      {
        "ipId": "0x1234567890abcdef1234567890abcdef12345678",
        "tokenId": 2,
        "contentHash": "0xdef456...",
        "title": "Digital Art Collection",
        "creator": "0xabcdef1234567890abcdef1234567890abcdef12",
        "licenseType": "commercial_remix",
        "royaltyPercent": 10,
        "allowDerivatives": true,
        "commercialUse": true,
        "licenseTermsId": "10",
        "ipMetadataUri": "ipfs://QmArt...",
        "registeredAt": "2025-12-11T15:20:30.456Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 47,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

#### **Success - Empty Results (200 OK)**

```json
{
  "success": true,
  "data": {
    "ips": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 0,
      "totalPages": 0,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "message": "No IPs found matching criteria"
}
```

---

### **Implementation**

```javascript
// routes/marketplace.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/marketplace/ips', async (req, res) => {
  try {
    const {
      status = 'registered',
      commercialUse,
      maxRoyalty,
      minRoyalty,
      licenseType,
      page = 1,
      limit = 20
    } = req.query;
    
    // Build WHERE clause
    const conditions = ['status = $1'];
    const params = [status];
    let paramCount = 1;
    
    if (commercialUse !== undefined) {
      paramCount++;
      conditions.push(`commercial_use = $${paramCount}`);
      params.push(commercialUse === 'true');
    }
    
    if (maxRoyalty !== undefined) {
      paramCount++;
      conditions.push(`royalty_percent <= $${paramCount}`);
      params.push(parseInt(maxRoyalty));
    }
    
    if (minRoyalty !== undefined) {
      paramCount++;
      conditions.push(`royalty_percent >= $${paramCount}`);
      params.push(parseInt(minRoyalty));
    }
    
    if (licenseType) {
      paramCount++;
      conditions.push(`license_type = $${paramCount}`);
      params.push(licenseType);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Count total items
    const countResult = await db.query(
      `SELECT COUNT(*) FROM verification_tokens WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult.rows[0].count);
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(totalItems / limitNum);
    
    // Fetch paginated data
    const result = await db.query(
      `SELECT 
         story_ip_id as "ipId",
         token_id as "tokenId",
         content_hash as "contentHash",
         content_title as "title",
         wallet_address as "creator",
         license_type as "licenseType",
         royalty_percent as "royaltyPercent",
         allow_derivatives as "allowDerivatives",
         commercial_use as "commercialUse",
         license_terms_id as "licenseTermsId",
         ip_metadata_uri as "ipMetadataUri",
         license_attached_at as "registeredAt"
       FROM verification_tokens
       WHERE ${whereClause}
       ORDER BY license_attached_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limitNum, offset]
    );
    
    res.json({
      success: true,
      data: {
        ips: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1
        }
      },
      message: result.rows.length === 0 ? 'No IPs found matching criteria' : undefined
    });
    
  } catch (error) {
    console.error('Error fetching marketplace IPs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
```

---

## 🗄️ DATABASE SCHEMA

### **1. Create `license_terms_cache` Table**

```sql
-- License terms caching table
CREATE TABLE IF NOT EXISTS license_terms_cache (
  id SERIAL PRIMARY KEY,
  license_type VARCHAR(50) NOT NULL,
  royalty_percent INTEGER NOT NULL,
  license_terms_id VARCHAR(100) NOT NULL,
  transaction_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint: one entry per license type + royalty combination
  CONSTRAINT unique_license_terms UNIQUE (license_type, royalty_percent)
);

-- Index for fast lookups
CREATE INDEX idx_license_cache_lookup 
ON license_terms_cache(license_type, royalty_percent);

-- Seed with Story Protocol presets
INSERT INTO license_terms_cache (license_type, royalty_percent, license_terms_id) VALUES
  ('commercial_remix', 10, '10'),
  ('commercial_remix', 20, '20'),
  ('non_commercial', 0, '1')
ON CONFLICT (license_type, royalty_percent) DO NOTHING;
```

---

### **2. Update `verification_tokens` Table**

```sql
-- Add license-related columns to existing table
ALTER TABLE verification_tokens ADD COLUMN IF NOT EXISTS
  license_terms_id VARCHAR(100),
  license_type VARCHAR(50),
  royalty_percent INTEGER,
  allow_derivatives BOOLEAN DEFAULT true,
  commercial_use BOOLEAN DEFAULT false,
  license_tx_hash VARCHAR(66),
  license_attached_at TIMESTAMP;

-- Add indexes for marketplace queries
CREATE INDEX IF NOT EXISTS idx_registered_ips 
ON verification_tokens(status, commercial_use, royalty_percent)
WHERE status = 'registered';

CREATE INDEX IF NOT EXISTS idx_license_type 
ON verification_tokens(license_type)
WHERE status = 'registered';

-- Add check constraint for royalty percent
ALTER TABLE verification_tokens
ADD CONSTRAINT check_royalty_percent 
CHECK (royalty_percent IS NULL OR (royalty_percent >= 0 AND royalty_percent <= 100));
```

---

## 🔐 AUTHENTICATION MIDDLEWARE

### **JWT Authentication**

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
```

---

## 🧪 TESTING EXAMPLES

### **Test 1: Find Cached License Terms**

```bash
# Check if commercial_remix 10% exists (should find preset)
curl "http://localhost:3001/api/license-terms/find?type=commercial_remix&royalty=10"

# Expected Response:
{
  "success": true,
  "licenseTermsId": "10",
  "cached": true,
  "licenseType": "commercial_remix",
  "royaltyPercent": 10
}
```

---

### **Test 2: Cache New License Terms**

```bash
# Cache custom 12% royalty
curl -X POST http://localhost:3001/api/license-terms/cache \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseType": "commercial_remix",
    "royaltyPercent": 12,
    "licenseTermsId": "144",
    "transactionHash": "0xabc123..."
  }'

# Expected Response:
{
  "success": true,
  "message": "License terms cached successfully",
  "data": {
    "licenseType": "commercial_remix",
    "royaltyPercent": 12,
    "licenseTermsId": "144",
    "createdAt": "2025-12-12T10:30:45.123Z"
  }
}
```

---

### **Test 3: Finalize IP Registration**

```bash
# Finalize IP with license terms
curl -X PATCH http://localhost:3001/api/verification/token/23/finalize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ipId": "0xfa0f47f4fc0cb501b2184c5964ae41f2e4735e21",
    "tokenId": 3,
    "txHash": "0x1234567890abcdef...",
    "licenseTermsId": "144",
    "licenseType": "commercial_remix",
    "royaltyPercent": 12,
    "licenseTxHash": "0xabcdef..."
  }'

# Expected Response:
{
  "success": true,
  "message": "IP registration finalized successfully",
  "data": {
    "nonce": 23,
    "ipId": "0xfa0f47f4fc0cb501b2184c5964ae41f2e4735e21",
    "tokenId": 3,
    "status": "registered",
    "licenseType": "commercial_remix",
    "royaltyPercent": 12,
    "allowDerivatives": true,
    "commercialUse": true,
    "registeredAt": "2025-12-12T10:30:45.123Z"
  }
}
```

---

### **Test 4: Marketplace Query**

```bash
# Get commercial IPs with max 15% royalty
curl "http://localhost:3001/api/marketplace/ips?status=registered&commercialUse=true&maxRoyalty=15&page=1&limit=5"

# Expected Response:
{
  "success": true,
  "data": {
    "ips": [
      {
        "ipId": "0xfa0f47f4fc0cb501b2184c5964ae41f2e4735e21",
        "tokenId": 3,
        "title": "My Original Song",
        "creator": "0x23e67597f0898f747fa3291c8920168adf9455d0",
        "licenseType": "commercial_remix",
        "royaltyPercent": 12,
        "allowDerivatives": true,
        "commercialUse": true,
        "registeredAt": "2025-12-12T10:30:45.123Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

## 📊 ERROR HANDLING BEST PRACTICES

### **Standard Error Response Format**

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### **Common Error Codes**

| HTTP Status | Error Type              | When to Use                              |
|-------------|-------------------------|------------------------------------------|
| 400         | Bad Request             | Missing required fields, invalid format  |
| 401         | Unauthorized            | Missing or invalid JWT token             |
| 403         | Forbidden               | Valid token but insufficient permissions |
| 404         | Not Found               | Resource doesn't exist                   |
| 409         | Conflict                | Resource already exists/conflicting state|
| 422         | Unprocessable Entity    | Validation failed (invalid values)       |
| 500         | Internal Server Error   | Unexpected server errors                 |

---

## 🚀 DEPLOYMENT CHECKLIST

### **Environment Variables**

```bash
# .env file
DATABASE_URL=postgresql://user:password@localhost:5432/orion_db
JWT_SECRET=your-secret-key-here
PORT=3001
NODE_ENV=production

# Story Protocol (if needed for backend operations)
STORY_RPC_URL=https://aeneid.storyrpc.io
STORY_CHAIN_ID=1315
```

---

### **Pre-Deployment Steps**

- [ ] Run database migrations (create tables, indexes)
- [ ] Seed `license_terms_cache` with presets (10%, 20%, 0%)
- [ ] Test all endpoints with Postman/Insomnia
- [ ] Verify JWT authentication middleware
- [ ] Add rate limiting to public endpoints
- [ ] Set up logging (Winston, Morgan)
- [ ] Configure CORS for frontend origin
- [ ] Set up error monitoring (Sentry, etc.)

---

## 📞 INTEGRATION WITH FRONTEND

### **Frontend Base URL Configuration**

```typescript
// Frontend .env
VITE_BACKEND_API_URL=http://localhost:3001/api
```

### **Frontend API Client Example**

```typescript
// Frontend: src/services/verificationService.ts

async finalizeMint(params: {
  nonce: number;
  ipId: string;
  tokenId: number;
  txHash: string;
  licenseTermsId: string;
  licenseType: 'commercial_remix' | 'non_commercial';
  royaltyPercent: number;
  licenseTxHash?: string;
}) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_API_URL}/verification/token/${params.nonce}/finalize`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ipId: params.ipId,
        tokenId: params.tokenId,
        txHash: params.txHash,
        licenseTermsId: params.licenseTermsId,
        licenseType: params.licenseType,
        royaltyPercent: params.royaltyPercent,
        licenseTxHash: params.licenseTxHash
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to finalize mint');
  }
  
  return response.json();
}
```

---

## 📝 NOTES FOR BACKEND TEAM

### **Performance Considerations**

1. **Database Indexing**
   - ✅ Index on `(license_type, royalty_percent)` for cache lookups
   - ✅ Composite index on `(status, commercial_use, royalty_percent)` for marketplace queries
   - ✅ Index on `license_attached_at` for sorting

2. **Caching Strategy**
   - Use Redis for frequently accessed license terms
   - Cache marketplace results (5-minute TTL)
   - Invalidate cache when new IP registered

3. **Query Optimization**
   - Use `LIMIT` and `OFFSET` for pagination
   - Only SELECT needed columns (not `SELECT *`)
   - Use prepared statements to prevent SQL injection

### **Security Considerations**

1. **Input Validation**
   - Validate all user inputs (type, range, format)
   - Sanitize string inputs to prevent XSS
   - Use parameterized queries for SQL

2. **Rate Limiting**
   - Public endpoints: 100 requests/minute per IP
   - Authenticated endpoints: 500 requests/minute per user

3. **CORS Configuration**
   - Allow only frontend origin: `http://localhost:5173`
   - Production: `https://your-app.com`

---

## 🎯 SUCCESS METRICS

### **What to Monitor**

1. **API Performance**
   - Average response time < 200ms
   - 99th percentile < 500ms
   - Error rate < 1%

2. **License Terms Cache**
   - Cache hit rate > 80%
   - Unique license term combinations tracked
   - Most popular royalty percentages

3. **Marketplace Queries**
   - Query execution time < 100ms
   - Most common filter combinations
   - Pagination performance

---

**END OF BACKEND API SPECIFICATION**

*For questions or clarifications, contact the frontend team.*
