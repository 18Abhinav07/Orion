# 🎯 STAGE 3: LICENSE TERMS ATTACHMENT - PLANNING DOCUMENT

**Version:** 1.0  
**Date:** December 12, 2025  
**Status:** Planning Phase  
**Target:** Post-IP Registration License Configuration

---

## 📌 EXECUTIVE SUMMARY

**What We're Building:**
A license attachment system that transforms newly minted IP Assets into monetizable, tradeable assets with configurable royalty terms.

**Core Strategy:**
- **Use Story Protocol's preset license types** (Commercial Remix, Non-Commercial)
- **User-configurable royalty percentage** (0-100%)
- **Immediate license attachment** (part of registration flow)
- **Reuse existing preset IDs** when possible (gas optimization)
- **Backend tracking** for fast marketplace queries

---

## 🎯 KEY DECISIONS (LOCKED IN)

### ✅ Decision 1: License Configuration Approach

**CHOICE:** **Option A - Presets with Custom Royalty**

**What This Means:**
- Use Story Protocol's predefined license types
- Allow user to configure royalty percentage (the money part)
- Skip complex 15-parameter configurations
- Fast, simple, gas-efficient

**User Experience:**
```
┌─────────────────────────────────────────┐
│ License Type:                           │
│ (•) Commercial Remix                    │
│     ✓ Derivatives allowed               │
│     ✓ Commercial use enabled            │
│     ✓ Attribution required              │
│                                         │
│ ( ) Non-Commercial Only                 │
│     ✓ Derivatives allowed               │
│     ✗ No commercial use                 │
│     ✓ Attribution required              │
│                                         │
│ Royalty: [10]% ◄──────── USER CONTROLS │
│          ▁▁▁▁▁▁▁▁▁▁                    │
│          0%      50%    100%            │
│                                         │
│     [Attach License Terms]              │
└─────────────────────────────────────────┘
```

**Why This Works:**
- 🟢 90% of users need 1 of 2 license types (Commercial or Non-Commercial)
- 🟢 Royalty % is the ONLY thing that varies creator-to-creator
- 🟢 Story Protocol has these presets already deployed
- 🟢 Saves gas (no custom registration needed)

---

### ✅ Decision 2: License Configuration Timing

**CHOICE:** **Option A - Immediate (During Registration)**

**Flow Sequence:**
```
1. User uploads content
   ↓
2. Backend fingerprints + checks similarity
   ↓
3. Frontend calls RegistrationWorkflows.mintAndRegisterIp()
   ↓ SUCCESS! IP Asset created
   ↓
4. 🎯 LICENSE CONFIG UI APPEARS IMMEDIATELY
   ↓
5. User selects license type + royalty %
   ↓
6. Frontend attaches license terms
   ↓
7. Backend updated with full registration
   ↓
8. IP ready for marketplace ✅
```

**Why Immediate:**
- ✅ Single session - user completes everything at once
- ✅ No "incomplete" IPs in database
- ✅ Simpler state management
- ✅ Can't publish IP without license (enforced workflow)

**Alternative Considered (Deferred):**
- ❌ User might forget to come back
- ❌ Marketplace shows "unlicensable" IPs
- ❌ Extra complexity tracking incomplete IPs

---

### ✅ Decision 3: Preset ID Reuse Strategy

**CHOICE:** **Reuse Story Protocol's Preset IDs (with custom royalty twist)**

**The Problem:**
Story Protocol has preset license terms already deployed:
- Commercial Remix 10%: `licenseTermsId: "10"`
- Commercial Remix 20%: `licenseTermsId: "20"`
- Non-Commercial: `licenseTermsId: "1"`

But we need **user-configurable royalty %** (e.g., 7%, 15%, 33%).

**The Solution (Hybrid Approach):**

```typescript
async function getLicenseTermsId(
  licenseType: 'commercial_remix' | 'non_commercial',
  royaltyPercent: number
): Promise<string> {
  
  // Step 1: Check if exact preset exists
  const KNOWN_PRESETS = {
    'commercial_remix_10': '10',
    'commercial_remix_20': '20',
    'non_commercial_0': '1'
  };
  
  const presetKey = `${licenseType}_${royaltyPercent}`;
  
  if (KNOWN_PRESETS[presetKey]) {
    console.log(`✅ Using Story Protocol preset: ${KNOWN_PRESETS[presetKey]}`);
    return KNOWN_PRESETS[presetKey];
  }
  
  // Step 2: Register custom license terms (first time for this %)
  console.log(`⚙️ Registering new license terms: ${licenseType} ${royaltyPercent}%`);
  
  const { licenseTermsId } = await registerCommercialRemixPIL({
    defaultMintingFee: 0,
    commercialRevShare: royaltyPercent,
    currency: WIP_TOKEN_ADDRESS,
    royaltyPolicyAddress: LAP_ROYALTY_POLICY
  });
  
  // Step 3: Cache this for future use (backend stores mapping)
  await cacheLicenseTermsId(licenseType, royaltyPercent, licenseTermsId);
  
  return licenseTermsId;
}
```

**Why This Works:**
- 🟢 Reuses presets for common % (10%, 20%) - **ZERO gas cost**
- 🟢 Registers custom terms ONLY when needed (e.g., 7%, 33%)
- 🟢 Once registered, custom terms are reusable across users
- 🟢 Backend caches mappings: `royalty_7% → licenseTermsId: "142"`

**Backend Caching Table:**
```sql
CREATE TABLE license_terms_cache (
  id SERIAL PRIMARY KEY,
  license_type VARCHAR(50),      -- 'commercial_remix' | 'non_commercial'
  royalty_percent INTEGER,        -- 0-100
  license_terms_id VARCHAR(100),  -- Story Protocol ID
  created_at TIMESTAMP,
  UNIQUE(license_type, royalty_percent)
);

-- Example data:
-- | license_type      | royalty_percent | license_terms_id |
-- |-------------------|----------------|------------------|
-- | commercial_remix  | 10             | 10               | ← Preset
-- | commercial_remix  | 7              | 142              | ← Custom (cached)
-- | commercial_remix  | 15             | 143              | ← Custom (cached)
-- | non_commercial    | 0              | 1                | ← Preset
```

---

### ✅ Decision 4: Backend Storage Strategy

**CHOICE:** **Store summary data in backend, query blockchain for details**

**Backend Database (Fast Queries):**
```sql
ALTER TABLE ip_fingerprints ADD COLUMN (
  license_terms_id VARCHAR(100),           -- "10" or "142"
  license_type VARCHAR(50),                -- 'commercial_remix' | 'non_commercial'
  royalty_percent INTEGER,                 -- 0-100
  allow_derivatives BOOLEAN DEFAULT true,  -- Derived from license type
  commercial_use BOOLEAN,                  -- Derived from license type
  license_attached_at TIMESTAMP,           -- When license was attached
  status VARCHAR(50)                       -- 'pending_license' | 'registered'
);

-- Index for marketplace queries
CREATE INDEX idx_registered_ips ON ip_fingerprints(status) 
WHERE status = 'registered';
```

**What We Store:**
- ✅ `license_terms_id` - For quick matching
- ✅ `license_type` - For filtering (commercial vs non-commercial)
- ✅ `royalty_percent` - For display in marketplace
- ✅ `status` - For filtering incomplete IPs
- ✅ Computed fields (`allow_derivatives`, `commercial_use`) - For fast queries

**What We DON'T Store (Query from Blockchain):**
- ❌ Detailed license parameters (transferable, expiration, etc.)
- ❌ License token count (minted licenses)
- ❌ Revenue earned (royalty tracking)
- ❌ Derivative relationships

**Why This Split:**
- 🟢 Marketplace loads fast (SQL query, not RPC call)
- 🟢 Backend can filter: `WHERE commercial_use = true AND royalty_percent <= 10`
- 🟢 Source of truth still on blockchain
- 🟢 Backend only caches what changes rarely

---

## 🎬 COMPLETE FLOW SEQUENCE

### **Happy Path: Alice Registers "My Original Song" with 12% Royalty**

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: IP REGISTRATION (Stage 2 - Already Working)    │
└─────────────────────────────────────────────────────────┘

Alice uploads song.mp3
  ↓
Backend fingerprints: hash = 0xabc123...
  ↓
Backend checks similarity: 0% match (original)
  ↓
Frontend calls RegistrationWorkflows.mintAndRegisterIp()
  ↓
✅ SUCCESS! 
   ipId: 0xfa0f47f4...
   tokenId: 3
   txHash: 0x...

┌─────────────────────────────────────────────────────────┐
│ STEP 2: LICENSE CONFIGURATION UI (NEW - THIS STAGE)    │
└─────────────────────────────────────────────────────────┘

Frontend shows modal:
  ┌──────────────────────────────────────┐
  │ 🎉 IP Asset Registered Successfully! │
  │                                      │
  │ IP ID: 0xfa0f47f4...                 │
  │ Token ID: 3                          │
  │                                      │
  │ ────────────────────────────────────│
  │ Configure License Terms              │
  │                                      │
  │ License Type:                        │
  │ (•) Commercial Remix                 │
  │     ✓ Allow commercial use           │
  │     ✓ Allow derivatives              │
  │     ✓ Require attribution            │
  │                                      │
  │ Royalty: [12]%                       │
  │          ▁▁▁▁▁▁▁▁▁▁                 │
  │                                      │
  │     [Attach License Terms]           │
  └──────────────────────────────────────┘

Alice selects:
  - License Type: Commercial Remix
  - Royalty: 12%

Alice clicks "Attach License Terms"

┌─────────────────────────────────────────────────────────┐
│ STEP 3: GET LICENSE TERMS ID (Smart Caching)           │
└─────────────────────────────────────────────────────────┘

Frontend calls:
  const licenseTermsId = await getLicenseTermsId(
    'commercial_remix',
    12
  );

Backend checks cache:
  SELECT license_terms_id 
  FROM license_terms_cache
  WHERE license_type = 'commercial_remix' 
  AND royalty_percent = 12;
  
  ❌ NOT FOUND (first time anyone uses 12%)

Backend registers new terms:
  const { licenseTermsId } = await storyClient.license.registerCommercialRemixPIL({
    defaultMintingFee: 0,
    commercialRevShare: 12,  // ← Alice's custom %
    currency: WIP_TOKEN_ADDRESS,
    royaltyPolicyAddress: LAP_ROYALTY_POLICY
  });
  
  ✅ Returns: licenseTermsId = "144"

Backend caches:
  INSERT INTO license_terms_cache 
  VALUES ('commercial_remix', 12, '144');
  
  (Next user with 12% reuses "144" - no registration needed!)

┌─────────────────────────────────────────────────────────┐
│ STEP 4: ATTACH LICENSE TO IP ASSET                     │
└─────────────────────────────────────────────────────────┘

Frontend calls Story Protocol:
  await storyClient.license.attachLicenseTerms({
    ipId: '0xfa0f47f4...',
    licenseTermsId: '144',
    licenseTemplate: PIL_TEMPLATE_ADDRESS
  });

Story Protocol blockchain:
  - Links licenseTermsId "144" to ipId 0xfa0f47f4...
  - Emits LicenseTermsAttached event
  - IP now "licensable" ✅

Returns: { txHash: '0x...' }

┌─────────────────────────────────────────────────────────┐
│ STEP 5: UPDATE BACKEND DATABASE                        │
└─────────────────────────────────────────────────────────┘

Frontend sends PATCH /api/verification/token/{nonce}/finalize:
  {
    storyIpId: '0xfa0f47f4...',
    licenseTermsId: '144',
    licenseType: 'commercial_remix',
    royaltyPercent: 12
  }

Backend updates:
  UPDATE ip_fingerprints
  SET
    story_ip_id = '0xfa0f47f4...',
    license_terms_id = '144',
    license_type = 'commercial_remix',
    royalty_percent = 12,
    allow_derivatives = true,
    commercial_use = true,
    status = 'registered',
    license_attached_at = NOW()
  WHERE content_hash = '0xabc123...';

┌─────────────────────────────────────────────────────────┐
│ STEP 6: SUCCESS FEEDBACK                               │
└─────────────────────────────────────────────────────────┘

Frontend shows:
  ┌──────────────────────────────────────┐
  │ ✅ License Terms Attached!           │
  │                                      │
  │ Your IP is now available for:        │
  │ • Commercial licensing               │
  │ • Derivative creation                │
  │ • Royalty earning (12%)              │
  │                                      │
  │ [View on Marketplace]                │
  │ [Register Another IP]                │
  └──────────────────────────────────────┘

Alice's IP is now FULLY REGISTERED and MARKETPLACE-READY! 🎉
```

---

## 🛠️ IMPLEMENTATION CHECKLIST

### **Frontend (React/TypeScript)**

#### **1. Update `TestMinting.tsx`**

**Add State:**
```typescript
const [showLicenseConfig, setShowLicenseConfig] = useState(false);
const [licenseConfig, setLicenseConfig] = useState({
  type: 'commercial_remix' as 'commercial_remix' | 'non_commercial',
  royaltyPercent: 10
});
```

**Modify `testMinting()` function:**
```typescript
// After successful IP registration:
setMintResult({ ipId, tokenId, txHash });
setShowLicenseConfig(true); // ← Show license UI
```

**Add License Attachment Function:**
```typescript
async function attachLicense() {
  try {
    setStatus('Attaching license terms...');
    
    // Step 1: Get or register license terms
    const licenseTermsId = await getLicenseTermsId(
      licenseConfig.type,
      licenseConfig.royaltyPercent
    );
    
    // Step 2: Attach to IP
    await attachLicenseTermsToIp(mintResult.ipId, licenseTermsId);
    
    // Step 3: Update backend
    await verificationService.finalizeMint({
      nonce: mintToken.nonce,
      ipId: mintResult.ipId,
      tokenId: mintResult.tokenId,
      txHash: mintResult.txHash,
      licenseTermsId,
      licenseType: licenseConfig.type,
      royaltyPercent: licenseConfig.royaltyPercent
    });
    
    setStatus('✅ License attached! IP ready for marketplace.');
    
  } catch (error) {
    console.error('License attachment failed:', error);
    setStatus('❌ License attachment failed');
  }
}
```

**Add License Config UI:**
```tsx
{showLicenseConfig && (
  <div className="license-config-modal">
    <h3>Configure License Terms</h3>
    
    <div className="license-type-selector">
      <label>
        <input
          type="radio"
          checked={licenseConfig.type === 'commercial_remix'}
          onChange={() => setLicenseConfig({
            ...licenseConfig,
            type: 'commercial_remix'
          })}
        />
        Commercial Remix
        <span className="license-details">
          ✓ Commercial use ✓ Derivatives ✓ Attribution
        </span>
      </label>
      
      <label>
        <input
          type="radio"
          checked={licenseConfig.type === 'non_commercial'}
          onChange={() => setLicenseConfig({
            ...licenseConfig,
            type: 'non_commercial',
            royaltyPercent: 0 // Non-commercial = 0% royalty
          })}
        />
        Non-Commercial Only
        <span className="license-details">
          ✗ No commercial use ✓ Derivatives ✓ Attribution
        </span>
      </label>
    </div>
    
    {licenseConfig.type === 'commercial_remix' && (
      <div className="royalty-slider">
        <label>Royalty Percentage: {licenseConfig.royaltyPercent}%</label>
        <input
          type="range"
          min="0"
          max="100"
          value={licenseConfig.royaltyPercent}
          onChange={(e) => setLicenseConfig({
            ...licenseConfig,
            royaltyPercent: parseInt(e.target.value)
          })}
        />
      </div>
    )}
    
    <button onClick={attachLicense}>Attach License Terms</button>
  </div>
)}
```

---

#### **2. Create `src/services/licenseService.ts`**

```typescript
import { ethers } from 'ethers';

const LICENSE_REGISTRY_ADDRESS = '0x...'; // Story Protocol License Registry
const LICENSE_REGISTRY_ABI = [...]; // ABI for registerPILTerms

/**
 * Get license terms ID (reuses presets or registers custom)
 */
export async function getLicenseTermsId(
  licenseType: 'commercial_remix' | 'non_commercial',
  royaltyPercent: number
): Promise<string> {
  
  // Check backend cache first
  const cached = await fetch(
    `/api/license-terms/find?type=${licenseType}&royalty=${royaltyPercent}`
  ).then(r => r.json());
  
  if (cached.licenseTermsId) {
    console.log(`✅ Using cached license terms: ${cached.licenseTermsId}`);
    return cached.licenseTermsId;
  }
  
  // Register new terms
  console.log(`⚙️ Registering license terms: ${licenseType} ${royaltyPercent}%`);
  
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const registry = new ethers.Contract(
    LICENSE_REGISTRY_ADDRESS,
    LICENSE_REGISTRY_ABI,
    signer
  );
  
  const tx = await registry.registerPILTerms({
    transferable: true,
    royaltyPolicy: LAP_ROYALTY_POLICY,
    defaultMintingFee: 0,
    expiration: 0,
    commercialUse: licenseType === 'commercial_remix',
    commercialAttribution: true,
    commercializerChecker: ethers.constants.AddressZero,
    commercialRevShare: royaltyPercent,
    commercialRevCeiling: 0,
    derivativesAllowed: true,
    derivativesAttribution: true,
    derivativesApproval: false,
    derivativesReciprocal: false,
    derivativeRevCeiling: 0,
    currency: WIP_TOKEN_ADDRESS,
    uri: ''
  });
  
  const receipt = await tx.wait();
  const event = receipt.events?.find(e => e.event === 'LicenseTermsRegistered');
  const licenseTermsId = event?.args?.licenseTermsId.toString();
  
  // Cache in backend
  await fetch('/api/license-terms/cache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      licenseType,
      royaltyPercent,
      licenseTermsId
    })
  });
  
  return licenseTermsId;
}

/**
 * Attach license terms to IP Asset
 */
export async function attachLicenseTermsToIp(
  ipId: string,
  licenseTermsId: string
): Promise<{ txHash: string }> {
  
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  const LICENSE_ATTACHMENT_ABI = [...]; // ABI for attachLicenseTerms
  const LICENSE_ATTACHMENT_ADDRESS = '0x...'; // Story Protocol address
  
  const contract = new ethers.Contract(
    LICENSE_ATTACHMENT_ADDRESS,
    LICENSE_ATTACHMENT_ABI,
    signer
  );
  
  const tx = await contract.attachLicenseTerms(
    ipId,
    licenseTermsId,
    PIL_TEMPLATE_ADDRESS
  );
  
  const receipt = await tx.wait();
  
  return { txHash: receipt.transactionHash };
}
```

---

#### **3. Update `src/services/verificationService.ts`**

**Add new method:**
```typescript
async finalizeMint(params: {
  nonce: number;
  ipId: string;
  tokenId: number;
  txHash: string;
  licenseTermsId: string;
  licenseType: string;
  royaltyPercent: number;
}) {
  const response = await fetch(
    `${this.baseUrl}/verification/token/${params.nonce}/finalize`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        ipId: params.ipId,
        tokenId: params.tokenId,
        txHash: params.txHash,
        licenseTermsId: params.licenseTermsId,
        licenseType: params.licenseType,
        royaltyPercent: params.royaltyPercent
      })
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to finalize mint');
  }
  
  return response.json();
}
```

---

### **Backend (Node.js/Express)**

---

## 🌐 COMPLETE API SPECIFICATION

### **API Endpoint Overview**

```
BASE_URL: http://localhost:3001/api

Authentication: JWT Bearer Token (for protected routes)
Content-Type: application/json

Endpoints:
├── GET    /license-terms/find              [Public]
├── POST   /license-terms/cache             [Protected]
├── PATCH  /verification/token/:nonce/finalize  [Protected]
└── GET    /marketplace/ips                 [Public]
```

---

### **1️⃣ GET `/api/license-terms/find`**

**Purpose:** Check if license terms already exist for a given type + royalty %

**Authentication:** None (Public)

**Request:**
```http
GET /api/license-terms/find?type=commercial_remix&royalty=12
```

**Query Parameters:**
```typescript
{
  type: 'commercial_remix' | 'non_commercial',  // Required
  royalty: number                                // Required (0-100)
}
```

**Example Request:**
```bash
curl "http://localhost:3001/api/license-terms/find?type=commercial_remix&royalty=12"
```

**Response (200 OK - Found):**
```json
{
  "success": true,
  "licenseTermsId": "144",
  "cached": true,
  "licenseType": "commercial_remix",
  "royaltyPercent": 12
}
```

**Response (200 OK - Not Found):**
```json
{
  "success": true,
  "licenseTermsId": null,
  "cached": false,
  "message": "License terms not cached, registration required"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Missing required query parameters: type, royalty"
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "success": false,
  "error": "Invalid royalty percent. Must be between 0 and 100",
  "received": 150
}
```

**Backend Implementation:**
```typescript
// routes/licenseTerms.js
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
      res.json({
        success: true,
        licenseTermsId: cached.rows[0].license_terms_id,
        cached: true,
        licenseType: cached.rows[0].license_type,
        royaltyPercent: cached.rows[0].royalty_percent
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
```

---

### **2️⃣ POST `/api/license-terms/cache`**

**Purpose:** Store newly registered license terms in backend cache

**Authentication:** JWT Bearer Token (Required)

**Request:**
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
  "transactionHash": "0x1234567890abcdef..."
}
```

**Payload Schema:**
```typescript
{
  licenseType: 'commercial_remix' | 'non_commercial',  // Required
  royaltyPercent: number,                              // Required (0-100)
  licenseTermsId: string,                              // Required (from Story Protocol)
  transactionHash?: string                             // Optional (blockchain tx)
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/license-terms/cache \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseType": "commercial_remix",
    "royaltyPercent": 12,
    "licenseTermsId": "144",
    "transactionHash": "0xabc123..."
  }'
```

**Response (201 Created):**
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

**Response (200 OK - Already Exists):**
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

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Missing required fields: licenseType, royaltyPercent, licenseTermsId",
  "received": {
    "licenseType": "commercial_remix",
    "royaltyPercent": null
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**Backend Implementation:**
```typescript
// routes/licenseTerms.js
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
    
    // Insert or ignore if exists
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
    
    const wasInserted = result.rowCount > 0;
    const data = result.rows[0];
    
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

### **3️⃣ PATCH `/api/verification/token/:nonce/finalize`**

**Purpose:** Finalize IP registration with license terms attached

**Authentication:** JWT Bearer Token (Required)

**Request:**
```http
PATCH /api/verification/token/23/finalize
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**URL Parameters:**
```typescript
{
  nonce: number  // The verification token nonce
}
```

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

**Payload Schema:**
```typescript
{
  ipId: string,              // Required - Story Protocol IP ID (0x...)
  tokenId: number,           // Required - NFT token ID
  txHash: string,            // Required - IP registration transaction hash
  licenseTermsId: string,    // Required - License terms ID from Story Protocol
  licenseType: 'commercial_remix' | 'non_commercial',  // Required
  royaltyPercent: number,    // Required (0-100)
  licenseTxHash?: string     // Optional - License attachment transaction hash
}
```

**Example Request:**
```bash
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
```

**Response (200 OK):**
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

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Verification token not found",
  "nonce": 23
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Missing required fields: ipId, tokenId, txHash, licenseTermsId, licenseType, royaltyPercent",
  "received": {
    "ipId": "0xfa0f...",
    "tokenId": null
  }
}
```

**Response (409 Conflict):**
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

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**Backend Implementation:**
```typescript
// routes/verification.js
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
    
    // Check if token exists
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
```

---

### **4️⃣ GET `/api/marketplace/ips`**

**Purpose:** Fetch registered IPs for marketplace display (with license filtering)

**Authentication:** None (Public)

**Request:**
```http
GET /api/marketplace/ips?status=registered&commercialUse=true&maxRoyalty=15&page=1&limit=20
```

**Query Parameters:**
```typescript
{
  status?: 'registered' | 'pending_license',  // Optional - filter by status
  commercialUse?: boolean,                     // Optional - filter by commercial use
  maxRoyalty?: number,                         // Optional - max royalty % (0-100)
  minRoyalty?: number,                         // Optional - min royalty % (0-100)
  licenseType?: 'commercial_remix' | 'non_commercial',  // Optional
  page?: number,                               // Optional - pagination (default: 1)
  limit?: number                               // Optional - items per page (default: 20)
}
```

**Example Request:**
```bash
curl "http://localhost:3001/api/marketplace/ips?status=registered&commercialUse=true&maxRoyalty=15&page=1&limit=20"
```

**Response (200 OK):**
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

**Response (200 OK - Empty):**
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

**Backend Implementation:**
```typescript
// routes/marketplace.js
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
```

---

## 📊 FRONTEND API CLIENT INTEGRATION

### **Update `src/services/verificationService.ts`**

Add these methods to the existing service:

```typescript
/**
 * Find cached license terms
 */
async findLicenseTerms(
  licenseType: 'commercial_remix' | 'non_commercial',
  royaltyPercent: number
): Promise<{
  success: boolean;
  licenseTermsId: string | null;
  cached: boolean;
}> {
  const response = await fetch(
    `${this.baseUrl}/license-terms/find?type=${licenseType}&royalty=${royaltyPercent}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to find license terms: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Cache newly registered license terms
 */
async cacheLicenseTerms(params: {
  licenseType: 'commercial_remix' | 'non_commercial';
  royaltyPercent: number;
  licenseTermsId: string;
  transactionHash?: string;
}): Promise<void> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `${this.baseUrl}/license-terms/cache`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(params)
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to cache license terms: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Finalize IP registration with license terms
 */
async finalizeMint(params: {
  nonce: number;
  ipId: string;
  tokenId: number;
  txHash: string;
  licenseTermsId: string;
  licenseType: 'commercial_remix' | 'non_commercial';
  royaltyPercent: number;
  licenseTxHash?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: any;
}> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `${this.baseUrl}/verification/token/${params.nonce}/finalize`,
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
    throw new Error(error.error || `Failed to finalize mint: ${response.statusText}`);
  }
  
  return response.json();
}
```

---

## 🗄️ DATABASE SCHEMA UPDATES

### **Update `verification_tokens` table:**

```sql
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
```

### **Create `license_terms_cache` table:**

```sql
CREATE TABLE IF NOT EXISTS license_terms_cache (
  id SERIAL PRIMARY KEY,
  license_type VARCHAR(50) NOT NULL,
  royalty_percent INTEGER NOT NULL,
  license_terms_id VARCHAR(100) NOT NULL,
  transaction_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(license_type, royalty_percent)
);

-- Seed with Story Protocol presets
INSERT INTO license_terms_cache (license_type, royalty_percent, license_terms_id) VALUES
  ('commercial_remix', 10, '10'),
  ('commercial_remix', 20, '20'),
  ('non_commercial', 0, '1')
ON CONFLICT (license_type, royalty_percent) DO NOTHING;

-- Add index
CREATE INDEX IF NOT EXISTS idx_license_cache_lookup
ON license_terms_cache(license_type, royalty_percent);
```

---

#### **2. Database Migrations**

**Create `license_terms_cache` table:**
```sql
CREATE TABLE license_terms_cache (
  id SERIAL PRIMARY KEY,
  license_type VARCHAR(50) NOT NULL,
  royalty_percent INTEGER NOT NULL,
  license_terms_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(license_type, royalty_percent)
);

-- Seed with known presets
INSERT INTO license_terms_cache VALUES
  (DEFAULT, 'commercial_remix', 10, '10', NOW()),
  (DEFAULT, 'commercial_remix', 20, '20', NOW()),
  (DEFAULT, 'non_commercial', 0, '1', NOW());
```

**Update `ip_fingerprints` table:**
```sql
ALTER TABLE ip_fingerprints ADD COLUMN
  license_terms_id VARCHAR(100),
  license_type VARCHAR(50),
  royalty_percent INTEGER,
  allow_derivatives BOOLEAN DEFAULT true,
  commercial_use BOOLEAN DEFAULT false,
  license_attached_at TIMESTAMP;

CREATE INDEX idx_marketplace_ips ON ip_fingerprints(status, commercial_use, royalty_percent)
WHERE status = 'registered';
```

---

## 🎯 SUCCESS CRITERIA

### **Definition of Done:**

✅ **User Flow Complete:**
- User registers IP → License config UI appears
- User selects license type + royalty %
- Transaction succeeds, license attached
- Backend updated with full details

✅ **Backend Optimization:**
- License terms cache working (reuses preset IDs)
- Database has all license data for fast queries
- No redundant blockchain calls

✅ **Marketplace Ready:**
- Can query: `SELECT * FROM ip_fingerprints WHERE status='registered' AND commercial_use=true`
- License details shown without RPC calls
- Royalty % visible in marketplace listings

✅ **Error Handling:**
- If license attachment fails, IP stays in `pending_license` state
- User can retry without re-registering IP
- Clear error messages

---

## 📊 NEXT STEPS (POST-PLANNING)

1. ✅ **This Planning Document** - DONE
2. ⏭️ **Implementation Phase:**
   - Update `TestMinting.tsx` with license UI
   - Create `licenseService.ts`
   - Add backend endpoints
   - Run database migrations
3. 🧪 **Testing:**
   - Test preset reuse (10%, 20%)
   - Test custom % (7%, 15%, 33%)
   - Verify backend caching
   - Test marketplace queries
4. 🚀 **Integration:**
   - Wire up to production minting flow
   - Add to actual issuer dashboard (not just test page)
   - Connect to marketplace display

---

## 💬 CONVERSATION HUB

**Latest Decisions (Dec 12, 2025):**

✅ **Option A (Presets) with custom royalty** - User controls the money, we control the complexity  
✅ **Immediate license attachment** - Part of registration flow, not deferred  
✅ **Reuse preset IDs** - Gas optimization, backend caching for custom %  
✅ **Backend storage strategy** - Summary data in DB, details on-chain  

**User Confirmed:**
> "will be going with option a but user able to define the royalty measures"
> "if we can reuse best for our use case (but keep in mind we need control over that royalty)"
> "You are really on a good page already"

**Status:** Planning complete, ready for implementation! 🚀

---

**END OF PLANNING DOCUMENT**
