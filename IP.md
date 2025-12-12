# IP Metadata API Integration Guide

## Overview
The MintToken model now supports rich IP metadata fields that can be stored directly in MongoDB for fast querying without needing IPFS fetches. This is useful for marketplace displays, dashboards, and search functionality.

## New Fields Added to MintToken

### IP Metadata Fields
```typescript
{
  name?: string;                    // Display name of the IP asset
  description?: string;             // Detailed description
  image?: string;                   // Image URL (IPFS or HTTP)
  external_url?: string;            // External website/portfolio link
  attributes?: Array<{              // NFT-style traits
    trait_type: string;
    value: string | number;
  }>;
  tags?: string[];                  // Search tags
}
```

## Updated API Endpoints

### 1. Generate Mint Token (with Metadata)

**Endpoint:** `POST /api/verification/generate-mint-token`

**Description:** Generates a mint token with optional IP metadata. Metadata is stored in MongoDB for fast access.

**Request Payload:**

```json
{
  "creatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "contentHash": "0x1234567890abcdef...",
  "ipMetadataURI": "ipfs://QmXyz123.../metadata.json",
  "nftMetadataURI": "ipfs://QmAbc456.../nft-metadata.json",
  "assetType": "image",
  
  // Optional IP Metadata (NEW)
  "name": "Sunset Over Mountains",
  "description": "A beautiful sunset photograph taken in the Rocky Mountains during golden hour. This image captures the vibrant colors of the sky as the sun sets behind snow-capped peaks.",
  "image": "ipfs://QmImage123.../sunset.jpg",
  "external_url": "https://myportfolio.com/sunset-mountains",
  "attributes": [
    {
      "trait_type": "Category",
      "value": "Photography"
    },
    {
      "trait_type": "Location",
      "value": "Rocky Mountains"
    },
    {
      "trait_type": "Time of Day",
      "value": "Golden Hour"
    },
    {
      "trait_type": "Resolution",
      "value": "4K"
    }
  ],
  "tags": ["photography", "nature", "sunset", "mountains", "landscape"]
}
```

**Minimal Request (without metadata):**

```json
{
  "creatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "contentHash": "0x1234567890abcdef...",
  "ipMetadataURI": "ipfs://QmXyz123.../metadata.json",
  "nftMetadataURI": "ipfs://QmAbc456.../nft-metadata.json",
  "assetType": "video"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "signature": "0xabcdef123456...",
    "nonce": 42,
    "expiresAt": 1704123456,
    "expiresIn": 900
  }
}
```

---

### 2. Finalize Mint Token (with Metadata Updates)

**Endpoint:** `PATCH /api/verification/token/:nonce/finalize`

**Description:** Attaches license terms to a minted IP and optionally updates metadata fields.

**Request Payload:**

```json
{
  "licenseTermsId": "1",
  "licenseType": "commercial_remix",
  "royaltyPercent": 10,
  "allowDerivatives": true,
  "commercialUse": true,
  "licenseTxHash": "0xtxhash123...",
  
  // Optional Metadata Updates (NEW)
  "name": "Sunset Over Mountains (Updated Title)",
  "description": "An updated description with more context about the creative process and equipment used.",
  "image": "ipfs://QmNewImage.../updated-thumbnail.jpg",
  "external_url": "https://myportfolio.com/sunset-mountains-v2",
  "attributes": [
    {
      "trait_type": "Category",
      "value": "Photography"
    },
    {
      "trait_type": "License Type",
      "value": "Commercial Remix"
    },
    {
      "trait_type": "Royalty",
      "value": 10
    }
  ],
  "tags": ["photography", "nature", "sunset", "mountains", "landscape", "licensed", "commercial"]
}
```

**Minimal Request (license only):**

```json
{
  "licenseTermsId": "1",
  "licenseType": "non_commercial",
  "royaltyPercent": 0,
  "allowDerivatives": false,
  "commercialUse": false,
  "licenseTxHash": "0xtxhash456..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token finalized with license terms",
  "data": {
    "nonce": 42,
    "status": "registered",
    "ipId": "0xipid123...",
    "license": {
      "licenseTermsId": "1",
      "licenseType": "commercial_remix",
      "royaltyPercent": 10,
      "allowDerivatives": true,
      "commercialUse": true,
      "licenseTxHash": "0xtxhash123...",
      "licenseAttachedAt": 1704123456
    }
  }
}
```

---

### 3. Get Token Status (includes metadata)

**Endpoint:** `GET /api/verification/token/:nonce/status`

**Description:** Retrieves token status and all associated data including metadata.

**Response:**

```json
{
  "success": true,
  "data": {
    "nonce": 42,
    "status": "registered",
    "isExpired": false,
    "expiresAt": 1704123456,
    "createdAt": 1704122556,
    "mintDetails": {
      "ipId": "0xipid123...",
      "tokenId": "123",
      "txHash": "0xtxhash123...",
      "usedAt": 1704122756
    },
    "metadata": {
      "name": "Sunset Over Mountains",
      "description": "A beautiful sunset photograph...",
      "image": "ipfs://QmImage123.../sunset.jpg",
      "external_url": "https://myportfolio.com/sunset-mountains",
      "attributes": [
        {
          "trait_type": "Category",
          "value": "Photography"
        }
      ],
      "tags": ["photography", "nature", "sunset"]
    }
  }
}
```

---

## Example Use Cases

### Use Case 1: Marketplace Listing
When displaying IPs in the marketplace, you can query `MintToken` and immediately access:
- `name` - Display as title
- `description` - Show in preview card
- `image` - Display as thumbnail
- `tags` - Use for filtering/search
- `attributes` - Show as properties/traits

No IPFS fetch required!

### Use Case 2: Search & Filter
```javascript
// Search by name or description
const results = await MintToken.find({
  $or: [
    { name: { $regex: searchTerm, $options: 'i' } },
    { description: { $regex: searchTerm, $options: 'i' } }
  ],
  status: 'registered'
});

// Filter by tags
const tagFiltered = await MintToken.find({
  tags: { $in: ['photography', 'nature'] },
  status: 'registered'
});

// Filter by attributes
const categoryFiltered = await MintToken.find({
  'attributes.trait_type': 'Category',
  'attributes.value': 'Photography',
  status: 'registered'
});
```

### Use Case 3: Dashboard Analytics
```javascript
// Get most popular tags
const tagStats = await MintToken.aggregate([
  { $match: { status: 'registered' } },
  { $unwind: '$tags' },
  { $group: { _id: '$tags', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);
```

---

## Field Validation

### Required Fields (unchanged)
- `creatorAddress` - Ethereum address
- `contentHash` - bytes32 hash
- `ipMetadataURI` - IPFS URI
- `nftMetadataURI` - IPFS URI
- `assetType` - one of: `video`, `image`, `audio`, `text`

### Optional Metadata Fields
- `name` (string) - No length limit, but recommend < 100 chars for UI
- `description` (string) - No length limit, but recommend < 500 chars
- `image` (string) - Valid URL (IPFS or HTTP)
- `external_url` (string) - Valid URL
- `attributes` (array) - Array of `{trait_type, value}` objects
- `tags` (array) - Array of strings, recommend lowercase for consistency

### Data Types
```typescript
attributes: Array<{
  trait_type: string;     // e.g., "Category", "Location"
  value: string | number; // e.g., "Photography", 4000
}>

tags: string[];          // e.g., ["photography", "nature", "4k"]
```

---

## Best Practices

### 1. **Metadata Consistency**
Store the same metadata in both:
- IPFS metadata files (ipMetadataURI, nftMetadataURI)
- MongoDB fields (name, description, etc.)

This ensures:
- Fast queries from MongoDB
- Immutable proof on IPFS
- Consistency across systems

### 2. **Image URLs**
Prefer IPFS URLs for images:
```json
"image": "ipfs://QmHash123.../image.jpg"
```

Alternative formats also work:
```json
"image": "https://gateway.pinata.cloud/ipfs/QmHash123.../image.jpg"
"image": "https://mycdn.com/images/asset-123.jpg"
```

### 3. **Tags for Search**
Use lowercase, descriptive tags:
```json
"tags": ["photography", "nature", "landscape", "sunset", "4k", "commercial"]
```

Avoid:
- Special characters in tags
- Very long tags (> 30 chars)
- Duplicate tags

### 4. **Attributes for Filtering**
Structure attributes for UI filtering:
```json
"attributes": [
  { "trait_type": "Category", "value": "Photography" },
  { "trait_type": "License Type", "value": "Commercial Remix" },
  { "trait_type": "Resolution", "value": "4K" },
  { "trait_type": "Royalty %", "value": 10 }
]
```

This maps well to NFT marketplace UIs with trait filters.

### 5. **Backward Compatibility**
All metadata fields are **optional**. Existing mint tokens without metadata will continue to work. You can add metadata later via the finalize endpoint.

---

## Error Handling

### Common Errors

**Missing Required Fields:**
```json
{
  "success": false,
  "error": "INVALID_INPUT",
  "message": "Missing required field: contentHash"
}
```

**Invalid Asset Type:**
```json
{
  "success": false,
  "error": "INVALID_INPUT",
  "message": "Invalid assetType. Must be one of: video, image, audio, text"
}
```

**Invalid License Type:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid licenseType. Must be one of: commercial_remix, non_commercial"
}
```

---

## Migration Guide

### For Existing Frontend Code

**Before (no metadata):**
```javascript
const response = await fetch('/api/verification/generate-mint-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creatorAddress,
    contentHash,
    ipMetadataURI,
    nftMetadataURI,
    assetType
  })
});
```

**After (with metadata):**
```javascript
const response = await fetch('/api/verification/generate-mint-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creatorAddress,
    contentHash,
    ipMetadataURI,
    nftMetadataURI,
    assetType,
    // NEW: Add metadata fields
    name: formData.title,
    description: formData.description,
    image: uploadedImageUrl,
    external_url: formData.portfolioLink,
    attributes: formData.traits,
    tags: formData.tags
  })
});
```

### Updating Existing Tokens

If you have tokens without metadata, update them during finalization:

```javascript
const response = await fetch(`/api/verification/token/${nonce}/finalize`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    licenseTermsId,
    licenseType,
    royaltyPercent,
    allowDerivatives,
    commercialUse,
    licenseTxHash,
    // Add metadata during finalization
    name: "My Updated Title",
    description: "Updated description",
    tags: ["tag1", "tag2"]
  })
});
```

---

## Frontend Examples

### React Form Example

```tsx
import { useState } from 'react';

function MintIPForm() {
  const [formData, setFormData] = useState({
    // Required
    creatorAddress: '',
    contentHash: '',
    ipMetadataURI: '',
    nftMetadataURI: '',
    assetType: 'image',
    
    // Optional metadata
    name: '',
    description: '',
    image: '',
    external_url: '',
    tags: []
  });

  const [attributes, setAttributes] = useState([
    { trait_type: 'Category', value: '' },
    { trait_type: 'Style', value: '' }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      attributes: attributes.filter(attr => attr.value), // Remove empty
      tags: formData.tags.filter(Boolean) // Remove empty strings
    };

    const response = await fetch('/api/verification/generate-mint-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.success) {
      console.log('Mint token generated:', result.data);
      // Continue with contract interaction...
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Required fields */}
      <input 
        placeholder="Creator Address"
        value={formData.creatorAddress}
        onChange={e => setFormData({ ...formData, creatorAddress: e.target.value })}
      />
      
      {/* Metadata fields */}
      <input 
        placeholder="Title"
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
      />
      
      <textarea 
        placeholder="Description"
        value={formData.description}
        onChange={e => setFormData({ ...formData, description: e.target.value })}
      />
      
      <input 
        placeholder="Image URL"
        value={formData.image}
        onChange={e => setFormData({ ...formData, image: e.target.value })}
      />
      
      {/* Tags input */}
      <TagsInput 
        value={formData.tags}
        onChange={tags => setFormData({ ...formData, tags })}
      />
      
      {/* Attributes */}
      {attributes.map((attr, i) => (
        <div key={i}>
          <input 
            placeholder="Trait Type"
            value={attr.trait_type}
            onChange={e => {
              const newAttrs = [...attributes];
              newAttrs[i].trait_type = e.target.value;
              setAttributes(newAttrs);
            }}
          />
          <input 
            placeholder="Value"
            value={attr.value}
            onChange={e => {
              const newAttrs = [...attributes];
              newAttrs[i].value = e.target.value;
              setAttributes(newAttrs);
            }}
          />
        </div>
      ))}
      
      <button type="submit">Generate Mint Token</button>
    </form>
  );
}
```

---

## Summary

### Updated Endpoints
1. ✅ `POST /api/verification/generate-mint-token` - Now accepts metadata fields
2. ✅ `PATCH /api/verification/token/:nonce/finalize` - Can update metadata
3. ℹ️ `GET /api/verification/token/:nonce/status` - Returns metadata (if available)

### Key Benefits
- **Fast Queries:** No IPFS fetches needed for display
- **Rich Search:** Filter by name, description, tags, attributes
- **Backward Compatible:** All metadata fields are optional
- **Flexible:** Add metadata during generation or finalization

### Next Steps
1. Update your frontend forms to collect metadata
2. Test with the new API payloads
3. Update marketplace/dashboard queries to use metadata fields
4. Consider adding metadata to existing tokens via finalize endpoint
