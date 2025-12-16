# 🎨 Orion - Intellectual Property Operations Platform

> **Revolutionizing IP protection and monetization through Story Protocol blockchain technology**

[![Story Protocol](https://img.shields.io/badge/Built%20on-Story%20Protocol-purple)](https://story.foundation/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)](https://www.postgresql.org/)
[![Demo](https://img.shields.io/youtube/views/Z01S9XWOOAA)](https://youtu.be/Z01S9XWOOAA)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [User Journeys](#-user-journeys)
- [Similarity Detection](#-similarity-detection)
- [Story Protocol Integration](#-story-protocol-integration)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [License](#-license)

---

## 🌟 Overview

**Orion** is a next-generation intellectual property management platform built on **Story Protocol**. It combines advanced content fingerprinting, automated derivative detection, and blockchain-based IP registration to create a transparent, efficient ecosystem for creators, licensees, and administrators.

### Problem Statement

- **IP Theft**: Creators struggle to prove ownership and detect unauthorized derivatives
- **Manual Licensing**: Traditional licensing processes are slow and opaque
- **Royalty Tracking**: No automated way to track and distribute derivative royalties
- **Trust Issues**: Centralized platforms control IP rights without transparency

### Our Solution

Orion leverages Story Protocol's on-chain IP infrastructure to provide:

✅ **Automated Derivative Detection** - AI-powered similarity scoring (0-100%)
✅ **On-Chain IP Registration** - Immutable proof of ownership via Story Protocol
✅ **License Marketplace** - Mint licenses instead of buying ownership fractions
✅ **Automatic Royalties** - Parent IPs earn 10% when derivatives generate revenue
✅ **Admin Dispute Resolution** - Fair arbitration for gray-area similarity (70-90%)
✅ **Cache-First Architecture** - Fast queries with blockchain verification

---

## 🚀 Key Features

### **1️⃣ Content Fingerprinting & Registration**

```mermaid
graph LR
    A[Upload Content] --> B[Generate Hash]
    B --> C[Upload to IPFS]
    C --> D[Check Similarity]
    D --> E{Score?}
    E -->|< 40%| F[Register as Original]
    E -->|40-70%| G[Show Warning]
    E -->|70-90%| H[Admin Review]
    E -->|≥ 90%| I[Force Derivative]
    F --> J[Attach License Terms]
    I --> K[Link to Parent]
```

**Features:**
- **SHA256 Hashing** for text content (perceptual hashing for images/video coming soon)
- **IPFS Storage** via Pinata for decentralized metadata
- **Database Caching** in PostgreSQL for instant similarity checks
- **Story Protocol Integration** for on-chain IP registration

---

### **2️⃣ Intelligent Similarity Detection**

Our **4-tier similarity scoring system** protects creators while enabling fair derivative creation:

| Score Range | Status | Action | Description |
|------------|--------|---------|-------------|
| **0-39%** | ✅ CLEAN | Auto-approve as original | No significant similarity detected |
| **40-69%** | ⚠️ WARNING | Suggest review to user | Potential similarity, user choice |
| **70-89%** | 🔍 REVIEW_REQUIRED | Send to admin dispute queue | Gray area requiring human judgment |
| **90-100%** | 🛑 DERIVATIVE | Force derivative registration | Clear derivative, must link to parent |

**Example Flow:**

```mermaid
sequenceDiagram
    participant User as Creator
    participant FE as Frontend
    participant API as Backend API
    participant DB as Database
    participant SP as Story Protocol

    User->>FE: Upload "My Remix Song"
    FE->>API: POST /api/fingerprint
    API->>DB: Generate hash & save
    API-->>FE: { hash, ipfsCid }

    FE->>API: POST /api/check-similarity
    API->>DB: Query similar hashes
    API-->>FE: { score: 92%, parent: "Original Song" }

    alt Score ≥ 90%
        FE->>User: 🛑 Derivative detected! Must link to parent
        User->>FE: Confirm derivative
        FE->>SP: registerDerivativeIp()
        SP-->>FE: { childIpId, txHash }
        Note over User: Parent gets 10% of future revenue
    end
```

---

### **3️⃣ License Marketplace**

Unlike traditional platforms where users "buy ownership," Orion uses **Story Protocol's License Tokens**:

**Traditional Model:**
```
User pays $100 → Owns 10% of IP → Can resell fractions
```

**Orion Model:**
```
User pays minting fee → Owns LICENSE to use IP → Cannot resell IP itself
```

**Benefits:**
- **Creator Control**: Original creator maintains ownership
- **Permission-Based**: Clear licensing terms (commercial use, derivatives, royalties)
- **Automatic Royalties**: 10% flows to parent when derivative earns revenue
- **Transparent Terms**: All terms on-chain via PIL (Programmable IP License)

```mermaid
graph TD
    A[Browse Marketplace] --> B[Select IP Asset]
    B --> C[View License Terms]
    C --> D{Accept Terms?}
    D -->|Yes| E[Mint License Token]
    D -->|No| F[Cancel]
    E --> G[Pay Minting Fee]
    G --> H[Receive License NFT]
    H --> I[Can now use IP commercially]
```

---

### **4️⃣ Admin Dispute Resolution**

For **70-89% similarity scores**, content enters the dispute queue for admin review:

```mermaid
stateDiagram-v2
    [*] --> Pending: User uploads (70-89% similarity)
    Pending --> UnderReview: Admin reviews
    UnderReview --> ApprovedAsOriginal: Sufficiently transformative
    UnderReview --> EnforcedDerivative: Clear similarity
    ApprovedAsOriginal --> [*]: Register as independent IP
    EnforcedDerivative --> [*]: Link to parent + royalty flow
```

**Admin Capabilities:**
- **Side-by-Side Comparison**: View original and disputed content
- **Similarity Metrics**: See detailed hash comparison analysis
- **Resolution Options**:
  - **Approve as Original**: Register independently (no parent link)
  - **Enforce Derivative**: Force derivative registration via backend SDK call

---

### **5️⃣ Automatic Royalty Distribution**

Story Protocol handles all royalty math automatically:

```mermaid
graph LR
    A[Derivative Earns $100] --> B[Story Protocol]
    B --> C[Parent IP: $10]
    B --> D[Child IP: $90]
    C --> E[Parent Creator Wallet]
    D --> F[Child Creator Wallet]

    style B fill:#9f7aea
    style C fill:#48bb78
    style D fill:#48bb78
```

**How It Works:**
1. User purchases derivative content for $100
2. Story Protocol calculates split (10% parent, 90% child)
3. Royalties deposited into IP Royalty Vaults
4. Creators call `claimRevenue()` to withdraw anytime

---

## 🏗️ Architecture

### System Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React + TypeScript]
        B[WalletContext<br/>MetaMask]
        C[StoryProtocolService]
        D[ContentFingerprintService]
    end

    subgraph "Backend Layer"
        E[Node.js/Express API]
        F[PostgreSQL Database]
        G[Pinata IPFS]
    end

    subgraph "Blockchain Layer"
        H[Story Protocol SDK]
        I[SPG NFT Collection]
        J[IP Asset Registry]
        K[License Registry]
        L[Royalty Module]
    end

    A --> B
    A --> C
    A --> D
    C --> H
    D --> E
    E --> F
    E --> G
    H --> I
    H --> J
    H --> K
    H --> L

    style A fill:#61dafb
    style E fill:#68a063
    style H fill:#9f7aea
```

---

### Cache-First Architecture

**Key Innovation**: Frontend calls Story Protocol SDK directly, then sends results to backend for caching.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant SP as Story Protocol<br/>(Blockchain)
    participant API as Backend API<br/>(Cache Service)
    participant DB as PostgreSQL

    Note over FE,DB: IP Registration Flow

    FE->>SP: mintAndRegisterIpAndAttachPILTerms()
    SP-->>FE: { ipId, tokenId, licenseTermsId }

    FE->>API: POST /api/cache/ip-registration
    Note right of API: Cache blockchain results
    API->>DB: UPDATE ip_fingerprints

    Note over FE,DB: Portfolio Query (Cache-First)

    FE->>API: GET /api/assets?walletAddress=0x...
    API->>DB: Query cached data
    DB-->>API: Return all user IPs
    API-->>FE: { ipId, title, royaltyRate, ... }

    Note over FE: Fast! No blockchain call needed
```

**Benefits:**
- ⚡ **Instant Queries**: Load portfolio from cache (no blockchain lag)
- 💰 **Reduced Gas**: Only write to blockchain, read from cache
- 🔄 **Real-Time Updates**: Backend stores all blockchain events
- 🎯 **Best of Both**: Speed of centralized + trust of decentralized

---

### Page Structure & Flows

```mermaid
graph TD
    A[Landing Page] --> B{Connect Wallet}
    B --> C[Creator Dashboard<br/>newIssuerDashboard.tsx]
    B --> D[User Portfolio<br/>dashboard.tsx]
    B --> E[Marketplace<br/>marketplace.tsx]
    B --> F[Admin Panel<br/>admin.tsx]

    C --> C1[Register IP]
    C --> C2[View My IPs]

    D --> D1[View Assets]
    D --> D2[Claim Royalties]

    E --> E1[Browse IPs]
    E --> E2[Mint Licenses]

    F --> F1[Dispute Queue]
    F --> F2[Resolve Disputes]

    style C fill:#f6ad55
    style D fill:#4299e1
    style E fill:#48bb78
    style F fill:#ed8936
```

---

## 🛠️ Technology Stack

### **Frontend**
```json
{
  "framework": "React 18.3.1",
  "language": "TypeScript 5.5.3",
  "build": "Vite 5.4.1",
  "styling": "Tailwind CSS + shadcn/ui",
  "state": "React Context API",
  "wallet": "ethers.js + MetaMask"
}
```

### **Backend**
```json
{
  "runtime": "Node.js 18+",
  "framework": "Express.js",
  "database": "PostgreSQL",
  "storage": "Pinata IPFS",
  "auth": "JWT tokens"
}
```

### **Blockchain**
```json
{
  "protocol": "Story Protocol",
  "network": "Sepolia Testnet",
  "chainId": 11155111,
  "rpc": "https://rpc-sepolia.story.foundation",
  "explorer": "https://testnet.storyscan.xyz",
  "sdk": "@story-protocol/core-sdk"
}
```

### **Smart Contracts** (Story Protocol Provided)
```typescript
// Story Protocol Infrastructure (Sepolia)
SPG_NFT_CONTRACT: "0x...",       // Orion NFT collection
IP_ASSET_REGISTRY: "0x...",      // Global IP registry
LICENSE_REGISTRY: "0x...",       // License token registry
ROYALTY_MODULE: "0x...",         // Automatic royalty distribution
PIL_TEMPLATE: "0x...",           // Programmable IP License template
WIP_TOKEN: "0x...",              // Payment token for licenses
```

---

## 🚀 Getting Started

### Prerequisites

```bash
# Required
Node.js >= 18.0.0
npm >= 9.0.0
PostgreSQL >= 14.0
Git

# Optional
Docker (for containerized deployment)
```

### Installation

```bash
# 1️⃣ Clone repository
git clone https://github.com/your-org/TOA-Client-VB.git
cd TOA-Client-VB

# 2️⃣ Install frontend dependencies
npm install

# 3️⃣ Install backend dependencies
cd backend
npm install
cd ..

# 4️⃣ Set up environment variables
cp .env.example .env.local
```

### Environment Configuration

**Frontend (.env.local):**
```bash
# Story Protocol Network
VITE_NETWORK=sepolia
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://rpc-sepolia.story.foundation
VITE_EXPLORER_URL=https://testnet.storyscan.xyz

# Story Protocol Contracts
VITE_SPG_NFT_CONTRACT=0xYourCollectionAddress
VITE_WIP_TOKEN=0xWIPTokenAddress
VITE_PIL_TEMPLATE=0xPILTemplateAddress

# IPFS (Pinata)
VITE_PINATA_JWT=your_pinata_jwt_token
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud

# Backend API
VITE_BACKEND_URL=http://localhost:3001/api
```

**Backend (.env):**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ipops
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ipops
DB_USER=your_user
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=7d

# IPFS
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=https://gateway.pinata.cloud

# Story Protocol (Admin Wallet)
ADMIN_PRIVATE_KEY=0xYourAdminPrivateKey
STORY_RPC_URL=https://rpc-sepolia.story.foundation

# Server
PORT=3001
NODE_ENV=development
```

### Database Setup

```bash
# Create PostgreSQL database
createdb ipops

# Run migrations (if available)
npm run db:migrate

# Or manually create tables
psql ipops < backend/schema.sql
```

**Database Schema:**
```sql
-- IP Fingerprints Table
CREATE TABLE ip_fingerprints (
  id SERIAL PRIMARY KEY,
  hash VARCHAR(66) NOT NULL UNIQUE,
  ipfs_cid VARCHAR(100) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  story_ip_id VARCHAR(66),
  token_id BIGINT,
  license_terms_id BIGINT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  ip_type VARCHAR(20) DEFAULT 'Text',
  royalty_rate INTEGER DEFAULT 10,
  status VARCHAR(30) DEFAULT 'pending',
  is_derivative BOOLEAN DEFAULT false,
  parent_ip_id VARCHAR(66),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Similarity Disputes Table
CREATE TABLE similarity_disputes (
  id SERIAL PRIMARY KEY,
  dispute_id VARCHAR(50) UNIQUE NOT NULL,
  submitted_by VARCHAR(42) NOT NULL,
  content_hash VARCHAR(66) NOT NULL,
  content_title VARCHAR(255),
  ipfs_cid VARCHAR(100),
  parent_ip_id VARCHAR(66),
  parent_content_hash VARCHAR(66),
  similarity_score INTEGER NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  resolved_by VARCHAR(42),
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- License Tokens Table
CREATE TABLE license_tokens (
  id SERIAL PRIMARY KEY,
  license_token_id BIGINT NOT NULL,
  ip_id VARCHAR(66) NOT NULL,
  licensee VARCHAR(42) NOT NULL,
  license_terms_id BIGINT NOT NULL,
  minted_at TIMESTAMP DEFAULT NOW()
);

-- Royalty Claims Table
CREATE TABLE royalty_claims (
  id SERIAL PRIMARY KEY,
  ip_id VARCHAR(66) NOT NULL,
  claimer VARCHAR(42) NOT NULL,
  amount DECIMAL(30, 0) NOT NULL,
  currency VARCHAR(42) NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  claimed_at TIMESTAMP DEFAULT NOW()
);
```

### Running the Application

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend
npm run dev

# Or use concurrently (if configured)
npm run dev:full
```

### Network Setup (MetaMask)

```bash
Network Name: Story Protocol Sepolia
RPC URL: https://rpc-sepolia.story.foundation
Chain ID: 11155111
Currency Symbol: ETH
Block Explorer: https://testnet.storyscan.xyz
```

**Get Testnet Funds:**
1. Visit [Story Faucet](https://faucet.story.foundation)
2. Enter your wallet address
3. Receive testnet ETH and WIP tokens

---

## 👥 User Journeys

### Complete User Journey (108 Steps)

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Frontend
    participant Backend
    participant IPFS
    participant StoryProtocol
    participant Database

    Note over User,Database: PHASE 1: AUTHENTICATION
    User->>Frontend: Visit platform & connect wallet
    Frontend->>Backend: POST /api/auth/check
    Backend->>Database: Query user
    Backend-->>Frontend: JWT token

    Note over User,Database: PHASE 2: IP REGISTRATION
    User->>Frontend: Upload "Original_Song.txt"
    Frontend->>Backend: POST /api/fingerprint
    Backend->>IPFS: Upload to Pinata
    Backend->>Database: Save hash
    Backend-->>Frontend: { hash, ipfsCid }

    Frontend->>Backend: POST /api/check-similarity
    Backend->>Database: Query similar hashes
    Backend-->>Frontend: { score: 0%, status: 'CLEAN' }

    Frontend->>IPFS: Upload metadata JSON
    IPFS-->>Frontend: metadataURI

    Frontend->>StoryProtocol: mintAndRegisterIpAndAttachPILTerms()
    StoryProtocol-->>Frontend: { ipId, tokenId, licenseTermsId }

    Frontend->>Backend: POST /api/cache/ip-registration
    Backend->>Database: UPDATE with Story data

    Note over User: ✅ IP Registered!

    Note over User,Database: PHASE 3: MARKETPLACE
    User->>Frontend: Browse marketplace
    Frontend->>Backend: GET /api/marketplace/available-ips
    Backend->>Database: Query registered IPs
    Backend-->>Frontend: Available IPs

    User->>Frontend: Click "Mint License"
    Frontend->>StoryProtocol: mintLicenseTokens()
    StoryProtocol-->>Frontend: { licenseTokenIds: [101] }

    Frontend->>Backend: POST /api/cache/license-minting
    Backend->>Database: INSERT license record

    Note over User: ✅ License Minted!

    Note over User,Database: PHASE 4: CLAIM ROYALTIES
    User->>Frontend: View portfolio
    Frontend->>Backend: GET /api/assets
    Backend-->>Frontend: User's IPs

    Frontend->>StoryProtocol: getClaimableRevenue()
    StoryProtocol-->>Frontend: 0.5 WIP tokens

    User->>Frontend: Click "Claim Royalties"
    Frontend->>StoryProtocol: claimRevenue()
    StoryProtocol-->>Frontend: { claimableRevenue, txHash }

    Note over User: 💰 Royalties Claimed!
```

For the complete 108-step journey with all edge cases, see [COMPLETE_USER_JOURNEY.md](./COMPLETE_USER_JOURNEY.md).

---

## 🔍 Similarity Detection

### How It Works

**Text Content (MVP):**
```javascript
// Backend: /api/fingerprint
const normalizedText = fileContent
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const hash = crypto
  .createHash('sha256')
  .update(normalizedText)
  .digest('hex');

// Save to database
await db.ip_fingerprints.insert({
  hash,
  ipfs_cid: ipfsCid,
  wallet_address: userAddress,
  title,
  ip_type: 'Text',
  status: 'pending'
});
```

**Similarity Check:**
```javascript
// Backend: /api/check-similarity
const matches = await db.ip_fingerprints.find({
  hash: contentHash
});

if (matches.length === 0) {
  return { score: 0, status: 'CLEAN' };
}

// For exact match (Text MVP)
if (matches[0].hash === contentHash) {
  return {
    score: 100,
    status: 'DERIVATIVE',
    isMatch: true,
    parentIpId: matches[0].story_ip_id,
    parentMetadata: { ... }
  };
}

// Future: Fuzzy matching with Levenshtein distance
const similarityScore = calculateLevenshtein(contentHash, matches[0].hash);
```

### Branching Logic

```mermaid
graph TD
    A[Upload Content] --> B[Generate Hash]
    B --> C{Similarity Score?}

    C -->|0-39%| D[✅ CLEAN]
    C -->|40-69%| E[⚠️ WARNING]
    C -->|70-89%| F[🔍 REVIEW_REQUIRED]
    C -->|90-100%| G[🛑 DERIVATIVE]

    D --> H[Register as Original]
    E --> I{User Choice}
    I -->|Proceed| H
    I -->|Cancel| J[Upload Cancelled]

    F --> K[Create Dispute]
    K --> L[Admin Review]

    G --> M[Force Derivative Link]

    H --> N[Attach License Terms]
    M --> O[Link to Parent + Royalty Flow]

    style D fill:#48bb78
    style E fill:#ed8936
    style F fill:#ecc94b
    style G fill:#f56565
```

---

## 📡 Story Protocol Integration

### SDK Functions Used

**1. Combined IP Registration (Recommended)**

```typescript
// One transaction: Mint NFT + Register IP + Attach License
const result = await client.ipAsset.mintAndRegisterIpAndAttachPILTerms({
  spgNftContract: SPG_NFT_CONTRACT,
  pilType: 'commercialRemix',
  ipMetadata: {
    ipMetadataURI: 'ipfs://Qm...',
    ipMetadataHash: '0x...',
    nftMetadataURI: 'ipfs://Qm...',
    nftMetadataHash: '0x...'
  },
  commercialRevShare: 1000,  // 10% royalty (basis points)
  currency: WIP_TOKEN_ADDRESS,
  mintingFee: 0,  // Free minting
  txOptions: { waitForTransaction: true }
});

// Returns:
// {
//   ipId: '0xIP_A...',      // Global IP identifier
//   tokenId: 1n,            // NFT token ID
//   licenseTermsId: 55n,    // License terms ID
//   txHash: '0xTX_A...'
// }
```

**2. Derivative Registration**

```typescript
// Register derivative and link to parent
const result = await client.ipAsset.registerDerivativeIp({
  nftContract: SPG_NFT_CONTRACT,
  tokenId: 2n,
  derivData: {
    parentIpIds: ['0xIP_A...'],
    licenseTermsIds: [55n],
    licenseTemplate: PIL_TEMPLATE_ADDRESS,
    royaltyContext: '0x'  // Empty bytes
  },
  ipMetadata: {
    ipMetadataURI: 'ipfs://Qm...',
    ipMetadataHash: '0x...',
    nftMetadataURI: 'ipfs://Qm...',
    nftMetadataHash: '0x...'
  },
  txOptions: { waitForTransaction: true }
});

// Returns:
// {
//   ipId: '0xIP_B...',      // Child IP ID
//   txHash: '0xTX_B...'
// }

// Automatic royalty setup:
// - Parent (0xIP_A): 10% of revenue
// - Child (0xIP_B): 90% of revenue
```

**3. License Minting**

```typescript
// Mint license token (user gets permission to use IP)
const result = await client.license.mintLicenseTokens({
  licensorIpId: '0xIP_A...',
  licenseTemplate: PIL_TEMPLATE_ADDRESS,
  licenseTermsId: 55n,
  amount: 1,
  receiver: userAddress,
  royaltyContext: '0x',
  maxMintingFee: 0,
  maxRevenueShare: 100,
  txOptions: { waitForTransaction: true }
});

// Returns:
// {
//   licenseTokenIds: [101n, 102n, 103n],
//   txHash: '0xTX_C...'
// }
```

**4. Royalty Claims**

```typescript
// Claim accumulated revenue
const result = await client.royalty.claimRevenue({
  snapshotIds: [1n, 2n, 3n],
  account: userAddress,
  token: WIP_TOKEN_ADDRESS,
  txOptions: { waitForTransaction: true }
});

// Returns:
// {
//   claimableRevenue: 500000000000000000n,  // 0.5 WIP in wei
//   txHash: '0xTX_D...'
// }
```

---

## 📚 API Documentation

### Backend Endpoints

#### **Content Fingerprinting**

```http
POST /api/fingerprint
Content-Type: multipart/form-data

FormData:
- file: File (content file)
- title: string
- walletAddress: string (0x...)
- ipType: 'Text' | 'Image' | 'Video' | 'Audio'

Response:
{
  "success": true,
  "data": {
    "hash": "0xabc123...",
    "ipfsCid": "QmXxx...",
    "fileSize": 1024,
    "mimeType": "text/plain",
    "uploadedAt": "2025-12-12T10:00:00Z"
  }
}
```

#### **Similarity Detection**

```http
POST /api/check-similarity
Content-Type: application/json

{
  "contentHash": "0xabc123..."
}

Response:
{
  "success": true,
  "data": {
    "score": 92,
    "status": "DERIVATIVE",
    "isMatch": true,
    "isPotentialMatch": false,
    "needsReview": false,
    "parentIpId": "0xIP_A...",
    "parentMetadata": {
      "title": "Original Song",
      "creator": "0x789...",
      "contentHash": "0x456def...",
      "ipfsCid": "QmYyy...",
      "licenseTermsId": "55"
    }
  }
}
```

#### **Asset Management**

```http
GET /api/assets?walletAddress=0x...

Response:
{
  "success": true,
  "data": [
    {
      "hash": "0xabc123...",
      "ipfsCid": "QmXxx...",
      "storyIpId": "0xIP_A...",
      "tokenId": "1",
      "title": "My Original Song",
      "ipType": "Text",
      "royaltyRate": 10,
      "licenseTermsId": "55",
      "status": "registered",
      "createdAt": "2025-12-12T10:00:00Z"
    }
  ]
}
```

#### **Dispute Management**

```http
POST /api/disputes/create
Content-Type: application/json

{
  "submittedBy": "0x456...",
  "contentHash": "0xdef...",
  "contentTitle": "My Remix Song",
  "ipfsCid": "QmZzz...",
  "parentIpId": "0xIP_A...",
  "parentContentHash": "0xabc...",
  "similarityScore": 78
}

Response:
{
  "success": true,
  "data": {
    "disputeId": "dispute_123",
    "status": "pending",
    "createdAt": "2025-12-12T10:00:00Z"
  }
}
```

```http
GET /api/disputes/pending

Response:
{
  "success": true,
  "data": [
    {
      "disputeId": "dispute_123",
      "submittedBy": "0x456...",
      "contentHash": "0xdef...",
      "contentTitle": "My Remix Song",
      "ipfsCid": "QmZzz...",
      "parentIpId": "0xIP_A...",
      "parentMetadata": {
        "title": "Original Song",
        "creator": "0x789..."
      },
      "similarityScore": 78,
      "status": "pending",
      "createdAt": "2025-12-12T10:00:00Z"
    }
  ]
}
```

#### **Cache Endpoints**

```http
POST /api/cache/ip-registration
Content-Type: application/json

{
  "contentHash": "0xabc123...",
  "ipfsCid": "QmXxx...",
  "walletAddress": "0x123...",
  "storyIpId": "0xIP_A...",
  "tokenId": "1",
  "licenseTermsId": "55",
  "txHash": "0xTX_A...",
  "title": "My Original Song",
  "ipType": "Text",
  "commercialRevShare": 1000,
  "metadata": {
    "ipMetadataURI": "ipfs://QmXxx...",
    "ipMetadataHash": "0xMETA..."
  }
}

Response:
{
  "success": true,
  "message": "IP registration cached successfully",
  "data": {
    "hash": "0xabc123...",
    "storyIpId": "0xIP_A...",
    "status": "registered"
  }
}
```

For complete API documentation with all endpoints, see [FLOW.md](./FLOW.md).

---

## 💻 Development

### Project Structure

```
TOA-Client-VB/
├── Frontend
│   ├── src/
│   │   ├── components/          # UI components
│   │   │   ├── ui/              # shadcn/ui base components
│   │   │   ├── admin/           # Admin-specific components
│   │   │   └── marketplace/     # Marketplace components
│   │   ├── pages/               # Route pages
│   │   │   ├── Issuer/          # Creator dashboard
│   │   │   │   └── newIssuerDashboard.tsx
│   │   │   ├── dashboard/       # User portfolio
│   │   │   │   └── dashboard.tsx
│   │   │   ├── marketplace/     # License marketplace
│   │   │   │   └── marketplace.tsx
│   │   │   └── admin/           # Admin panel
│   │   │       └── admin.tsx
│   │   ├── services/            # Business logic
│   │   │   ├── storyProtocolService.ts
│   │   │   ├── contentFingerprintService.ts
│   │   │   └── disputeResolutionService.ts
│   │   ├── context/             # React context
│   │   │   ├── WalletContext.tsx
│   │   │   └── AuthContext.tsx
│   │   ├── lib/                 # Utilities & config
│   │   │   └── storyProtocolConfig.ts
│   │   └── types/               # TypeScript types
│   │       └── ipAsset.ts
│   └── public/                  # Static assets
│
├── Backend
│   ├── src/
│   │   ├── routes/              # API routes
│   │   │   ├── fingerprint.ts
│   │   │   ├── similarity.ts
│   │   │   ├── disputes.ts
│   │   │   └── cache.ts
│   │   ├── services/            # Business logic
│   │   │   ├── ipfsService.ts
│   │   │   ├── hashingService.ts
│   │   │   └── storyService.ts
│   │   ├── db/                  # Database
│   │   │   ├── schema.sql
│   │   │   └── migrations/
│   │   └── utils/               # Utilities
│   └── index.ts                 # Server entry
│
└── Documentation
    ├── README.md                # This file
    ├── FLOW.md                  # Detailed flow diagrams
    ├── COMPLETE_USER_JOURNEY.md # 108-step user journey
    └── STORY_INTEGRATION_GUIDE.md # Story Protocol integration
```

### Development Scripts

```bash
# Frontend
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # ESLint check
npm run type-check       # TypeScript check

# Backend
npm run dev              # Start backend dev server
npm run build            # Compile TypeScript
npm run start            # Start production server
npm run db:migrate       # Run database migrations

# Full Stack
npm run dev:full         # Start both frontend & backend
npm run test:full        # Run all tests
```

### Contributing

```bash
# 1. Fork & clone
git clone https://github.com/your-org/TOA-Client-VB.git

# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Make changes & test
npm run dev:full
npm run lint
npm run type-check

# 4. Commit with conventional commits
git commit -m "feat: add amazing feature"

# 5. Push & create PR
git push origin feature/amazing-feature
```

**Commit Convention:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build/config changes

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Orion Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🔗 Resources

### **Official Links**
- 🌐 **Live Demo**: [Watch Demo](https://youtu.be/Z01S9XWOOAA)
- 📖 **Documentation**: [Full Documentation](./FLOW.md)
- 🎯 **User Journey**: [Complete User Journey](./COMPLETE_USER_JOURNEY.md)
- 🔧 **Integration Guide**: [Story Protocol Integration](./STORY_INTEGRATION_GUIDE.md)

### **Story Protocol Resources**
- 📚 **Official Docs**: [docs.story.foundation](https://docs.story.foundation)
- 🛠️ **TypeScript SDK**: [SDK Documentation](https://docs.story.foundation/developers/typescript-sdk/setup)
- 🔍 **Block Explorer**: [testnet.storyscan.xyz](https://testnet.storyscan.xyz)
- 💧 **Faucet**: [faucet.story.foundation](https://faucet.story.foundation)

### **Technical References**
- 🔗 **GitHub**: [Story Protocol SDK](https://github.com/storyprotocol/story-protocol-sdk)
- 📦 **NPM Package**: [@story-protocol/core-sdk](https://www.npmjs.com/package/@story-protocol/core-sdk)
- 🌐 **RPC Endpoint**: `https://rpc-sepolia.story.foundation`
- ⛓️ **Chain ID**: `11155111` (Sepolia)

---

## 🙏 Acknowledgments

- **Story Protocol Team** - For building the infrastructure for programmable IP
- **Pinata** - For reliable IPFS storage
- **shadcn/ui** - For beautiful UI components
- **Vite** - For lightning-fast development experience
- **PostgreSQL** - For robust data storage

---

<div align="center">

### **Ready to revolutionize IP management?**

**Protect your creations. Earn from derivatives. Build the future of IP.**

[![Get Started](https://img.shields.io/badge/Get%20Started-Watch%20Demo-purple?style=for-the-badge&logo=youtube)](https://youtu.be/Z01S9XWOOAA)
[![Documentation](https://img.shields.io/badge/Read%20Docs-Full%20Guide-blue?style=for-the-badge&logo=book)](./FLOW.md)

---

**Built with 💜 by the Orion Team | Powered by Story Protocol**

*© 2025 Orion. Licensed under MIT License.*

</div>
