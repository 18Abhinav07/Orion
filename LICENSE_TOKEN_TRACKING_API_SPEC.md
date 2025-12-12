# License Token Tracking API Specification

## Overview
This API specification defines endpoints for tracking license token minting activities, maintaining a record of all license purchases, and providing analytics for IP asset licensing.

---

## Data Models

### LicenseTokenMint
Represents a single license token minting transaction.

```typescript
interface LicenseTokenMint {
  // Primary identifiers
  id: string;                          // MongoDB ObjectId or UUID
  licenseTokenId: string;              // Token ID from Story Protocol (e.g., "64804")

  // Transaction details
  txHash: string;                      // Blockchain transaction hash
  blockNumber: number;                 // Block number where minted
  timestamp: number;                   // Unix timestamp of minting

  // IP Asset details
  ipId: string;                        // IP Asset ID (licensor)
  ipTokenId: number;                   // Original IP token ID
  licenseTermsId: string;              // License terms ID used

  // Licensee details
  licenseeAddress: string;             // Wallet address of license buyer
  amount: number;                      // Number of licenses minted (usually 1)

  // Financial details
  mintingFee: string;                  // Fee paid in wei
  currency: string;                    // Currency token address
  royaltyPercentage: number;           // Commercial rev share (e.g., 10 for 10%)

  // License terms snapshot
  licenseTerms: {
    commercialUse: boolean;
    derivativesAllowed: boolean;
    transferable: boolean;
    expirationDate?: number;           // Optional expiration timestamp
    territories?: string[];            // Optional geographic restrictions
  };

  // Metadata
  metadata: {
    ipMetadataURI: string;             // Link to IP metadata
    nftMetadataURI: string;            // Link to NFT metadata
    ipType: string;                    // "Text" | "Image" | "Video" | "Audio"
    ipTitle?: string;                  // Optional IP title
  };

  // Status tracking
  status: 'active' | 'expired' | 'revoked' | 'transferred';
  currentOwner: string;                // Current owner (if transferred)

  // Analytics
  usageCount: number;                  // How many times license was used
  derivativeCount: number;             // Number of derivatives created

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### LicenseTokenAnalytics
Aggregated analytics for license token activity.

```typescript
interface LicenseTokenAnalytics {
  ipId: string;
  totalLicensesMinted: number;
  totalRevenue: string;                // Total minting fees collected (wei)
  uniqueLicensees: number;             // Number of unique buyers
  activeLicenses: number;              // Currently active licenses
  derivativesMade: number;             // Total derivatives created
  averageMintingFee: string;           // Average fee per license
  lastMintedAt: number;                // Timestamp of last mint
}
```

---

## API Endpoints

### 1. Record License Token Mint

**Endpoint:** `POST /api/license-tokens/mint`

**Description:** Records a new license token minting transaction after successful on-chain minting.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>  // Optional: for authenticated tracking
```

**Request Body:**
```json
{
  "licenseTokenId": "64804",
  "txHash": "0x63e00fb77287b9d86cf69e448631ed1077b9402d8a67ffb7b6bcf6eda8ab892d",
  "ipId": "0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E",
  "licenseTermsId": "2665",
  "licenseeAddress": "0x23e67597f0898f747Fa3291C8920168adF9455D0",
  "amount": 1,
  "mintingFee": "0",
  "currency": "0xB132A6B7AE652c974EE1557A3521D53d18F6739f",
  "royaltyPercentage": 10,
  "licenseTerms": {
    "commercialUse": true,
    "derivativesAllowed": true,
    "transferable": true
  },
  "metadata": {
    "ipMetadataURI": "ipfs://...",
    "nftMetadataURI": "ipfs://...",
    "ipType": "Text",
    "ipTitle": "Premium Real Estate Documentation"
  }
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "licenseTokenId": "64804",
    "txHash": "0x63e00fb77287b9d86cf69e448631ed1077b9402d8a67ffb7b6bcf6eda8ab892d",
    "status": "active",
    "blockNumber": 12345678,
    "timestamp": 1734027328,
    "explorerUrl": "https://testnet.storyscan.xyz/tx/0x63e00fb77287b9d86cf69e448631ed1077b9402d8a67ffb7b6bcf6eda8ab892d"
  },
  "message": "License token mint recorded successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid data format
- `409 Conflict`: License token ID or transaction hash already recorded
- `500 Internal Server Error`: Database or processing error

---

### 2. Get License Tokens by User

**Endpoint:** `GET /api/license-tokens/user/:walletAddress`

**Description:** Retrieves all license tokens owned by a specific wallet address.

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `expired`, `revoked`, `transferred`)
- `ipType` (optional): Filter by IP type (`Text`, `Image`, `Video`, `Audio`)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (`timestamp`, `licenseTokenId`) (default: `timestamp`)
- `sortOrder` (optional): Sort order (`asc`, `desc`) (default: `desc`)

**Example Request:**
```
GET /api/license-tokens/user/0x23e67597f0898f747Fa3291C8920168adF9455D0?status=active&page=1&limit=20
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "licenses": [
      {
        "id": "507f1f77bcf86cd799439011",
        "licenseTokenId": "64804",
        "txHash": "0x63e00fb...",
        "ipId": "0xE5756dc...",
        "ipTitle": "Premium Real Estate Documentation",
        "ipType": "Text",
        "status": "active",
        "mintedAt": 1734027328,
        "licenseTerms": {
          "commercialUse": true,
          "derivativesAllowed": true,
          "transferable": true
        },
        "usageCount": 5,
        "derivativeCount": 2
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 47,
      "itemsPerPage": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 3. Get License Tokens for IP Asset

**Endpoint:** `GET /api/license-tokens/ip/:ipId`

**Description:** Retrieves all license tokens minted for a specific IP asset.

**Query Parameters:**
- `status` (optional): Filter by license status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "ipId": "0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E",
    "licenses": [
      {
        "licenseTokenId": "64804",
        "licenseeAddress": "0x23e67597...",
        "status": "active",
        "mintedAt": 1734027328,
        "usageCount": 5,
        "derivativeCount": 2
      }
    ],
    "analytics": {
      "totalLicensesMinted": 47,
      "activeLicenses": 42,
      "uniqueLicensees": 38,
      "totalRevenue": "4700000000000000000",
      "lastMintedAt": 1734027328
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 47,
      "itemsPerPage": 20
    }
  }
}
```

---

### 4. Get License Token Details

**Endpoint:** `GET /api/license-tokens/:licenseTokenId`

**Description:** Retrieves complete details for a specific license token.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "licenseTokenId": "64804",
    "txHash": "0x63e00fb77287b9d86cf69e448631ed1077b9402d8a67ffb7b6bcf6eda8ab892d",
    "blockNumber": 12345678,
    "timestamp": 1734027328,
    "ipId": "0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E",
    "ipTokenId": 1234,
    "licenseTermsId": "2665",
    "licenseeAddress": "0x23e67597f0898f747Fa3291C8920168adF9455D0",
    "currentOwner": "0x23e67597f0898f747Fa3291C8920168adF9455D0",
    "amount": 1,
    "mintingFee": "0",
    "currency": "0xB132A6B7AE652c974EE1557A3521D53d18F6739f",
    "royaltyPercentage": 10,
    "licenseTerms": {
      "commercialUse": true,
      "derivativesAllowed": true,
      "transferable": true
    },
    "metadata": {
      "ipMetadataURI": "ipfs://...",
      "nftMetadataURI": "ipfs://...",
      "ipType": "Text",
      "ipTitle": "Premium Real Estate Documentation"
    },
    "status": "active",
    "usageCount": 5,
    "derivativeCount": 2,
    "createdAt": "2024-12-12T17:25:28.000Z",
    "updatedAt": "2024-12-12T17:25:28.000Z"
  }
}
```

**Error Response:**
- `404 Not Found`: License token not found

---

### 5. Update License Token Usage

**Endpoint:** `PATCH /api/license-tokens/:licenseTokenId/usage`

**Description:** Updates usage statistics when a license is used to create derivatives or for commercial purposes.

**Request Body:**
```json
{
  "action": "derivative_created" | "commercial_use" | "transfer",
  "derivativeIpId": "0xNewDerivativeId...",  // Required if action is "derivative_created"
  "newOwner": "0xNewOwner..."                 // Required if action is "transfer"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "licenseTokenId": "64804",
    "usageCount": 6,
    "derivativeCount": 3,
    "status": "active"
  },
  "message": "License usage updated successfully"
}
```

---

### 6. Get License Token Analytics

**Endpoint:** `GET /api/license-tokens/analytics/ip/:ipId`

**Description:** Retrieves comprehensive analytics for license token activity on a specific IP asset.

**Query Parameters:**
- `startDate` (optional): Start date for analytics (Unix timestamp)
- `endDate` (optional): End date for analytics (Unix timestamp)
- `groupBy` (optional): Group results by (`day`, `week`, `month`)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "ipId": "0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E",
    "overview": {
      "totalLicensesMinted": 47,
      "activeLicenses": 42,
      "expiredLicenses": 3,
      "revokedLicenses": 2,
      "uniqueLicensees": 38,
      "totalRevenue": "4700000000000000000",
      "totalRevenueUSD": "4700.00",
      "averageMintingFee": "100000000000000000",
      "averageMintingFeeUSD": "100.00"
    },
    "derivatives": {
      "totalDerivatives": 23,
      "activeDerivatives": 20,
      "averageDerivativesPerLicense": 0.49
    },
    "timeline": [
      {
        "date": "2024-12-01",
        "licensesMinted": 5,
        "revenue": "500000000000000000",
        "uniqueLicensees": 5
      },
      {
        "date": "2024-12-02",
        "licensesMinted": 8,
        "revenue": "800000000000000000",
        "uniqueLicensees": 7
      }
    ],
    "topLicensees": [
      {
        "address": "0x23e67597...",
        "licenseCount": 3,
        "derivativeCount": 5,
        "totalSpent": "300000000000000000"
      }
    ]
  }
}
```

---

### 7. Get Global License Token Statistics

**Endpoint:** `GET /api/license-tokens/stats/global`

**Description:** Retrieves platform-wide license token statistics.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalLicensesMinted": 1247,
    "totalIPsLicensed": 89,
    "totalLicensees": 432,
    "totalRevenue": "124700000000000000000",
    "totalRevenueUSD": "124700.00",
    "activeLicenses": 1180,
    "totalDerivatives": 567,
    "topIPs": [
      {
        "ipId": "0xE5756dc...",
        "title": "Premium Real Estate Documentation",
        "licenseCount": 47,
        "revenue": "4700000000000000000"
      }
    ],
    "recentMints": [
      {
        "licenseTokenId": "64804",
        "ipId": "0xE5756dc...",
        "ipTitle": "Premium Real Estate Documentation",
        "licenseeAddress": "0x23e67597...",
        "timestamp": 1734027328
      }
    ]
  }
}
```

---

### 8. Verify License Token Ownership

**Endpoint:** `GET /api/license-tokens/verify/:licenseTokenId/owner/:walletAddress`

**Description:** Verifies if a specific wallet address owns a license token and checks its validity.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isOwner": true,
    "licenseTokenId": "64804",
    "status": "active",
    "isValid": true,
    "expiresAt": null,
    "licenseTerms": {
      "commercialUse": true,
      "derivativesAllowed": true,
      "transferable": true
    }
  }
}
```

---

## Webhook Events (Optional)

### License Token Minted Event
**Event:** `license_token.minted`
```json
{
  "event": "license_token.minted",
  "timestamp": 1734027328,
  "data": {
    "licenseTokenId": "64804",
    "ipId": "0xE5756dc...",
    "licenseeAddress": "0x23e67597...",
    "txHash": "0x63e00fb...",
    "amount": 1
  }
}
```

### License Token Transferred Event
**Event:** `license_token.transferred`
```json
{
  "event": "license_token.transferred",
  "timestamp": 1734027500,
  "data": {
    "licenseTokenId": "64804",
    "fromAddress": "0x23e67597...",
    "toAddress": "0xNewOwner...",
    "txHash": "0x789abc..."
  }
}
```

---

## Integration Flow

### Frontend → Backend Integration

1. **User Mints License Token**
   - Frontend calls Story Protocol SDK
   - Transaction is confirmed on-chain
   - Frontend receives `licenseTokenId` and `txHash`

2. **Record Mint in Backend**
   ```javascript
   // After successful mint
   const response = await axios.post('/api/license-tokens/mint', {
     licenseTokenId: response.licenseTokenIds[0].toString(),
     txHash: response.txHash,
     ipId: listing.license.ipId,
     licenseTermsId: listing.license.licenseTermsId,
     licenseeAddress: userWalletAddress,
     amount: 1,
     mintingFee: '0',
     currency: '0xB132A6B7AE652c974EE1557A3521D53d18F6739f',
     royaltyPercentage: 10,
     licenseTerms: {
       commercialUse: true,
       derivativesAllowed: true,
       transferable: true
     },
     metadata: {
       ipMetadataURI: listing.metadata.ipMetadataURI,
       nftMetadataURI: listing.metadata.nftMetadataURI,
       ipType: listing.attributes.find(a => a.trait_type === 'IP Type')?.value || 'Unknown',
       ipTitle: listing.name
     }
   });
   ```

3. **Display User's Licenses**
   ```javascript
   // Fetch user's licenses
   const licenses = await axios.get(`/api/license-tokens/user/${walletAddress}`);
   ```

---

## Database Indexes

### Recommended MongoDB Indexes

```javascript
// For fast user license lookups
{ licenseeAddress: 1, status: 1, timestamp: -1 }

// For fast IP asset license lookups
{ ipId: 1, status: 1, timestamp: -1 }

// For license token ID lookups
{ licenseTokenId: 1 } (unique)

// For transaction hash lookups
{ txHash: 1 } (unique)

// For current owner lookups
{ currentOwner: 1, status: 1 }

// For analytics queries
{ timestamp: 1, ipId: 1 }
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `LT001` | Invalid license token data |
| `LT002` | License token already recorded |
| `LT003` | Transaction hash already recorded |
| `LT004` | License token not found |
| `LT005` | IP asset not found |
| `LT006` | Unauthorized access |
| `LT007` | License expired |
| `LT008` | License revoked |
| `LT009` | Invalid wallet address |
| `LT010` | Database operation failed |

---

## Rate Limiting

- **Record Mint:** 10 requests per minute per IP
- **Query Endpoints:** 60 requests per minute per IP
- **Analytics Endpoints:** 30 requests per minute per IP

---

## Security Considerations

1. **Transaction Verification**
   - Backend should verify transaction on-chain before recording
   - Check that transaction actually minted the license token
   - Validate all addresses and IDs match on-chain data

2. **Authentication**
   - Use JWT tokens for user-specific queries
   - Verify wallet ownership through signature verification
   - Implement rate limiting per authenticated user

3. **Data Validation**
   - Validate all input data types and formats
   - Sanitize wallet addresses (checksummed format)
   - Verify IPFS URIs are valid

4. **Privacy**
   - Public data: License counts, analytics, IP-level stats
   - Private data: Individual license ownership (requires authentication)
   - Allow users to opt-in to public profile display

---

## Testing Scenarios

### Unit Tests
1. Validate license token data structure
2. Test pagination logic
3. Verify analytics calculations
4. Test error handling for invalid data

### Integration Tests
1. End-to-end mint recording flow
2. Query performance with large datasets
3. Analytics accuracy across date ranges
4. Concurrent minting handling

### Edge Cases
1. Duplicate transaction hash submission
2. Invalid wallet addresses
3. Missing or null metadata fields
4. Expired license queries
5. Transferred license ownership tracking

---

## Future Enhancements

1. **Real-time Updates**
   - WebSocket support for live license activity
   - Push notifications for license events

2. **Advanced Analytics**
   - Revenue forecasting
   - License usage patterns
   - Market trends analysis

3. **License Management**
   - License expiration reminders
   - Automatic license renewal
   - Bulk license operations

4. **Integration Features**
   - Export license reports (PDF, CSV)
   - License verification API for third parties
   - Royalty distribution tracking
