# 🚀 MIGRATION PLAN (FUTURE)
## Current Implementation: RWA Tokenization on Flow Blockchain
## Future Migration: IP-OPS on Story Protocol

**Document Status:** ⚠️ **FUTURE MIGRATION PLAN** (Not Current Implementation)
**Date:** December 11, 2025
**Current Platform:** Real Estate & Invoice Tokenization on Flow Blockchain
**Future Platform:** IP-OPS (Intellectual Property Operations) on Story Protocol
**Strategy:** Bypass & Replug (Keep Frontend Shell, Swap Backend Logic)

---

## ⚠️ IMPORTANT NOTE

**This document describes a FUTURE migration plan from the current RWA platform to Story Protocol.**

### **Current Implementation (As of December 11, 2025):**
- ✅ **Platform:** RWA (Real World Asset) Tokenization
- ✅ **Blockchain:** Flow EVM Testnet (Chain ID: 747)
- ✅ **Authentication:** JWT-based with multi-role system
- ✅ **Asset Types:** Real Estate, Invoices, Commodities
- ✅ **Smart Contracts:** Admin, TokenManagement, Marketplace, ERC1155Core, PaymentSplitter
- ✅ **Services:** tokenManagementService, directMarketplaceListingService, robustAuthorizationService
- ✅ **Flows:** Token request → Admin approval → Deploy → List → Buy/Sell

### **Future Migration Target:**
- 🔮 **Platform:** IP-OPS (Intellectual Property Operations)
- 🔮 **Blockchain:** Story Protocol (Sepolia testnet / Story Aeined Testnet)
- 🔮 **Focus:** IP Registration, Derivative Tracking, Content Fingerprinting
- 🔮 **Asset Types:** Text, Video, Audio, Images (Creative IP)
- 🔮 **New Features:** Content similarity detection, derivative linking, royalty automation

---

## 📋 EXECUTIVE SUMMARY

This document outlines the strategy for migrating from the current RWA tokenization platform to an IP-OPS platform using Story Protocol:

1. **Keep the UI structure** (Cards, Tables, Forms, Modals)
2. **Replace variable names and labels** (Real Estate → IP Assets, Issuer → Creator)
3. **Replace Flow blockchain calls** with Story Protocol SDK
4. **Add Backend API** for content fingerprinting and similarity detection
5. **Update authentication** to work with Story Protocol's requirements

---

## 📊 CURRENT IMPLEMENTATION OVERVIEW

### **Authentication Architecture**
```
User Registration/Login
  ↓
Backend API (Node.js + Express + MongoDB)
  ↓
JWT Token Generation
  ↓
Frontend Storage (localStorage)
  ↓
AuthContext (React Context)
  ↓
WalletContext (MetaMask via ethers.js)
  ↓
Smart Contract Authorization (Admin.isIssuer())
```

### **Current Services (src/services/)**
1. **authApi.ts** - Backend authentication API client
2. **robustAuthorizationService.js** - On-chain role verification
3. **tokenManagementService.js** - Token request workflow
4. **directMarketplaceListingService.js** - Marketplace listing
5. **invoiceFinancingService.js** - Invoice settlement
6. **tradingService.ts** - Trading history and analytics

### **Current Contexts (src/context/)**
1. **AuthContext.tsx** - JWT authentication state
   - User profile
   - Multi-role management
   - Role switching
   - Authorization helpers

2. **WalletContext.tsx** - MetaMask wallet connection
   - Web3Provider and Signer
   - Network validation (Flow Testnet - 747)
   - Auto-reconnect
   - Account/chain change listeners

### **Current Smart Contracts (Flow Testnet)**
1. **Admin** (`0xFC53E7A6b94173D82d07a127A38d9D852bf478d4`)
   - Role management (admin, issuer, manager)
   - Authorization checks

2. **TokenManagement** (`0xA632A492cCd898De4a4B17DC786B381d099F5815`)
   - Token request submission
   - Admin approval workflow
   - Token deployment

3. **Marketplace** (`0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF`)
   - Token listing
   - Buy/sell functionality
   - Trading history

4. **ERC1155Core** (`0x24eb8429Dc1e5f217866D0c74Db245Fa3aAFA31A`)
   - Token minting
   - Balance tracking
   - Transfer logic

5. **PaymentSplitter** (`0x6f2db3e628879ee72B455a946C1d6cfBa51aac91`)
   - Revenue distribution
   - Royalty payments

### **Current Workflows**
#### **Token Creation:**
```
1. Issuer logs in (JWT auth)
2. Issuer connects wallet (MetaMask)
3. System verifies: Admin.isIssuer(address)
4. Issuer uploads asset metadata to IPFS
5. Issuer submits token request to TokenManagement contract
6. Admin approves request
7. Issuer deploys token (ERC1155 mint)
8. Issuer lists on marketplace
9. Users can buy tokens
```

#### **Buy/Sell:**
```
Buy:
1. User browses marketplace
2. User clicks "Buy" → BuyModal opens
3. User enters quantity
4. Check: token.isApprovedForAll(user, marketplace)
5. If not approved: token.setApprovalForAll(marketplace, true)
6. Execute: marketplace.buyToken(tokenId, amount, { value: total })
7. Tokens transferred to buyer
8. Payment sent to seller

Sell:
1. User navigates to portfolio
2. User clicks "Sell" on owned token
3. Execute: marketplace.sellToken(tokenId, amount)
4. Tokens returned to marketplace
5. User receives payment
```

---

## 1️⃣ VARIABLE MAPPING TABLE (FOR FUTURE MIGRATION)

### 🏗️ **PAGE 1: newIssuerDashboard** (The Upload/Registration Page)
**File:** `src/pages/Issuer/newIssuerDashboard.tsx`

| Line Range | Old Variable/Label (Real Estate) | New Variable/Label (IP-OPS) | Context |
|------------|----------------------------------|----------------------------|---------|
| 67-74 | `requestForm.title` | `assetTitle` | Token/Asset name |
| 67-74 | `requestForm.description` | `assetDescription` | Asset description |
| 67-74 | `requestForm.assetType` | `ipType` | Asset Type → IP Type (Text, Video, Audio, Image) |
| 67-74 | `requestForm.amount` | `licenseCount` | Number of licenses to mint |
| 67-74 | `requestForm.pricePerToken` | `royaltyPercent` | Price per token → Royalty percentage (0-100%) |
| 67-74 | `requestForm.imageFiles` | `contentFiles` | Image files → Content files (text/video/audio) |
| 25-28 | `assetTypes = ['Invoice']` | `ipTypes = ['Text', 'Video', 'Audio', 'Image']` | Asset types dropdown |
| 198-207 | `metadata.attributes` (Asset Type, Total Supply, Price) | `metadata.attributes` (IP Type, License Count, Royalty Rate, Content Hash) | Metadata structure |
| 361 | "Issuer Dashboard" | "Creator Dashboard" | Page title |
| 362 | "Manage your token requests and deployments" | "Register and manage your IP assets" | Page subtitle |
| 367 | "Authorized Issuer" | "Verified Creator" | Badge label |
| 374 | Tab: "Dashboard" | Tab: "Dashboard" | ✓ Keep |
| 375 | Tab: "Token Requests" | Tab: "IP Registrations" | Tab name |
| 376 | Tab: "Portfolio" | Tab: "My IP Assets" | Tab name |
| 377 | Tab: "Create Request" | Tab: "Register IP" | Tab name |
| 426-430 | "No requests yet" → "Create your first token request" | "No IP registered yet" → "Register your first IP asset" | Empty state message |
| 567 | "Create Token Request" | "Register IP Asset" | Card title |
| 568 | "Submit a new token for admin approval" | "Submit new IP for protection and licensing" | Card description |
| 574 | Label: "Token Title" | Label: "IP Asset Title" | Form field |
| 584 | Label: "Asset Type" | Label: "IP Type" | Form field |
| 598 | Label: "Token Amount" | Label: "License Supply" | Form field |
| 609 | Label: "Price per Token (Flow)" | Label: "Royalty Percentage (%)" | Form field |
| 634 | Label: "Token Image" | Label: "Content File" | File upload field |

**Data Flow Changes:**
- **Old:** Upload metadata → Submit to TokenManagement contract → Wait for admin approval → Deploy → List
- **New:** Upload content → Backend fingerprinting → Check similarity → Register on Story Protocol → Attach license terms

---

### 🏠 **PAGE 2: dashboard** (The User Home/Portfolio Page)
**File:** `src/pages/dashboard/dashboard.tsx`

| Line Range | Old Variable/Label (Real Estate) | New Variable/Label (IP-OPS) | Context |
|------------|----------------------------------|----------------------------|---------|
| 3-17 | `UserAsset` interface | `IPAsset` interface | Type definition |
| 3-17 | `asset.name` | `asset.title` | Asset name |
| 3-17 | `asset.price` | `asset.royaltyRate` | Price → Royalty rate |
| 3-17 | `asset.amount` | `asset.licenseCount` | Holdings amount → License count owned |
| 3-17 | `asset.seller` | `asset.creator` | Seller → Original creator |
| 3-17 | `asset.attributes` (Location, Bedrooms, etc.) | `asset.attributes` (Content Hash, Derivative Status, Parent IP ID) | Metadata attributes |
| 21-26 | `TOKEN_ABI` (tokenPrice, balanceOf) | Story Protocol ABI (ipAssets, licenseTokens) | Contract ABI |
| 86-93 | `MOCK_INCOME_HISTORY` (Rental, Interest) | `MOCK_ROYALTY_HISTORY` (Royalty Payouts, Derivative Revenue) | Income history mock data |
| 95-176 | `MOCK_TRANSACTIONS` (buy, sell, dividend) | `MOCK_TRANSACTIONS` (mint_license, register_derivative, royalty_payout) | Transaction types |
| 178-185 | Sidebar: "Owned Assets", "My Income" | Sidebar: "My IP Assets", "Royalty Income" | Sidebar labels |
| ~300+ | "Manhattan Luxury Apartment" | "Original Song - Summer Vibes" | Example asset name |
| ~300+ | "Tech Startup Invoice #1847" | "Remix Video - Dance Challenge" | Example asset name |
| ~500+ | Table columns: "Property Name", "Location", "Value" | Table columns: "IP Title", "Content Hash", "License Value" | Data table headers |

**Key State Variables:**
```typescript
// OLD
const [userAssets, setUserAssets] = useState<UserAsset[]>([]);
const [portfolioValue, setPortfolioValue] = useState(0);
const [monthlyIncome, setMonthlyIncome] = useState(0);

// NEW
const [ipAssets, setIpAssets] = useState<IPAsset[]>([]);
const [portfolioValue, setPortfolioValue] = useState(0); // ✓ Keep
const [monthlyRoyalties, setMonthlyRoyalties] = useState(0);
```

---

### 🛒 **PAGE 3: marketplace** (The Listing/Browse Page)
**File:** `src/pages/marketplace/marketplace.tsx`

| Line Range | Old Variable/Label (Real Estate) | New Variable/Label (IP-OPS) | Context |
|------------|----------------------------------|----------------------------|---------|
| 103 | `listings` state | `availableIPs` | Marketplace listings |
| 106 | `selectedListing` | `selectedIP` | Selected item for purchase |
| 30-83 | `DEMO_MARKETPLACE_DATA` (Luxury Villa, Gold Bullion, Vintage Wine) | `DEMO_IP_DATA` (Original Song, Tutorial Video, Digital Art) | Demo data |
| 34 | `name: "Luxury Villa in Miami"` | `name: "Original Song - Summer Nights"` | Asset example |
| 35 | `description: "beachfront villa with ocean views"` | `description: "Original composition, ready for licensing"` | Description |
| 37 | `price: "250000..." Wei` | `royaltyPercent: "10"` (10% revenue share) | Price → Royalty rate |
| 38 | `amount: 100` | `licenseSupply: 100` | Available licenses |
| 41-46 | Attributes: Location, Area, Bedrooms | Attributes: IP Type, Content Hash, License Type, Derivative Status | Metadata |
| 564-598 | Asset metadata parsing (assetType, price) | IP metadata parsing (ipType, royaltyRate, contentHash) | Metadata extraction |
| 1445-1479 | Filter by: Real Estate, Invoice, Commodity, Stocks | Filter by: Original, Derivative, Pending Review, Public Domain | Category filters |
| ~1850 | Hero section badge: "Real Estate" | Hero section badge: "Original IP" | Category badge |
| ~1867 | Listing card type label | IP Type label (Text, Video, Audio, Image) | Type display |
| ~2050+ | "Buy" button | "Mint License" button | **Critical action button** |

**Buy Button Flow (MOST IMPORTANT):**
- **Line ~2050+:** The "Buy" button currently triggers marketplace purchase via ethers.js
- **Old Flow:** Click "Buy" → `handlePurchase()` → Call `marketplaceContract.buyToken()` → Transfer FLOW tokens
- **New Flow:** Click "Mint License" → `handleMintLicense()` → Call Story Protocol `mintLicenseTokens()` → Pay royalty fee → Register derivative if needed

---

### ⚖️ **PAGE 4: admin** (The Governance/Judge Page)
**File:** `src/pages/admin/admin.tsx`

| Line Range | Old Variable/Label (Real Estate) | New Variable/Label (IP-OPS) | Context |
|------------|----------------------------------|----------------------------|---------|
| 72-86 | `User` interface (issuer, manager roles) | `User` interface (creator, judge roles) | User types |
| 78 | `role: 'issuer' \| 'manager'` | `role: 'creator' \| 'judge'` | Role field |
| 88-95 | `SystemMetrics` (totalIssuers, totalManagers, activeTokens) | `SystemMetrics` (totalCreators, totalJudges, registeredIPs) | Platform metrics |
| 135-144 | `pendingAssets` (Token approval queue) | `pendingIPs` (IP registration queue + dispute queue) | Approval/dispute queue |
| 106-107 | State: `issuers`, `managers` | State: `creators`, `judges` | User lists |
| ~400+ | Tab: "Issuers", "Managers" | Tab: "Creators", "Judges" | Admin tabs |
| ~500+ | Action: "Approve Token" | Action: "Approve Original" or "Enforce Derivative Link" | Admin actions |
| ~600+ | Dialog: "Add Issuer" | Dialog: "Add Creator" | User management |
| NEW | N/A | `disputeQueue` state | **New:** Pending similarity disputes (60-85% match) |

**New Admin Responsibilities:**
1. **Approve Creators** (existing issuer approval flow)
2. **Review Similarity Disputes** (NEW - when match score is 60-85%)
3. **Force Derivative Linking** (NEW - when Bob uploads Alice's content but refuses to link)
4. **Monitor Royalty Distributions** (existing income monitoring)

---

## 2️⃣ THE "KILL LIST" 🔪

### ❌ **Imports & Dependencies to Remove/Replace**

#### **File: `newIssuerDashboard.tsx`**
```typescript
// KILL (Lines 2, 15-18)
import { ethers } from 'ethers'; // ❌ REMOVE (Flow/ethers contract interactions)
import TokenManagementService from '../../services/tokenManagementService'; // ❌ REMOVE
import DirectMarketplaceListingService from '../../services/directMarketplaceListingService'; // ❌ REMOVE
import RobustAuthorizationService from '../../services/robustAuthorizationService'; // ❌ REMOVE
import { ADMIN_CONTRACT, TOKEN_CONTRACT, MARKETPLACE_CONTRACT, TOKEN_MANAGEMENT_CONTRACT, ISSUER_CONTRACT } from '../../lib/contractAddress'; // ❌ REMOVE

// KEEP
import { uploadJSONToPinata, uploadToPinata } from '../../utils/pinata'; // ✅ KEEP (IPFS is used by Story Protocol too)

// ADD NEW
import { StoryProtocolService } from '../../services/storyProtocolService'; // ✅ ADD
import { ContentFingerprintService } from '../../services/contentFingerprintService'; // ✅ ADD (Backend API client)
import { Story Protocol Config } from '../../lib/storyProtocolConfig'; // ✅ ADD
```

#### **File: `dashboard.tsx`**
```typescript
// KILL (Lines 4, 11-14)
import { ethers } from 'ethers'; // ❌ REMOVE
import { MARKETPLACE_ABI } from '../../utils/marketplaceABI'; // ❌ REMOVE
import { ORDER_BOOK_ESCROW_ABI } from '../../utils/orderBookEscrowABI'; // ❌ REMOVE
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT, ORDER_BOOK_ESCROW_CONTRACT } from '../../lib/contractAddress'; // ❌ REMOVE

// ADD NEW
import { StoryProtocolService } from '../../services/storyProtocolService'; // ✅ ADD
import { ipAssetService } from '../../services/ipAssetService'; // ✅ ADD (Fetches user's IP assets)
```

#### **File: `marketplace.tsx`**
```typescript
// KILL (Lines 9, 14, 15-16)
import { ethers } from 'ethers'; // ❌ REMOVE
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT, NETWORK_CONFIG, ACTIVE_NETWORK } from '../../lib/contractAddress'; // ❌ REMOVE
import { MARKETPLACE_ABI } from '../../utils/marketplaceABI'; // ❌ REMOVE

// ADD NEW
import { StoryProtocolService } from '../../services/storyProtocolService'; // ✅ ADD
import { LicenseMarketplaceService } from '../../services/licenseMarketplaceService'; // ✅ ADD
```

#### **File: `admin.tsx`**
```typescript
// KILL (Lines 63-65)
import { ethers } from 'ethers'; // ❌ REMOVE (partially - keep only for address validation)
import { ADMIN_CONTRACT, TOKEN_MANAGEMENT_CONTRACT, MARKETPLACE_CONTRACT, TOKEN_CONTRACT } from '../../lib/contractAddress'; // ❌ REMOVE
import AdminTokenManagementService from '../../services/adminTokenManagementService'; // ❌ REMOVE

// ADD NEW
import { StoryProtocolAdminService } from '../../services/storyProtocolAdminService'; // ✅ ADD
import { DisputeResolutionService } from '../../services/disputeResolutionService'; // ✅ ADD (NEW - handles similarity disputes)
```

---

### ❌ **Function Calls to Remove/Replace**

#### **newIssuerDashboard.tsx**

**KILL: Lines 78-148** - `initializeService()`
```typescript
// ❌ REMOVE THIS ENTIRE BLOCK
const initializeService = async () => {
  // ... Flow contract initialization
  const service = new TokenManagementService();
  await service.initialize(signer.provider, { ... });
  const adminContract = new ethers.Contract(ADMIN_CONTRACT, ADMIN_ABI, signer.provider);
  const isAuthorized = await adminContract.isIssuer(address);
  // ...
};
```

**REPLACE WITH:**
```typescript
// ✅ NEW - Story Protocol initialization
const initializeStoryProtocol = async () => {
  const storyService = new StoryProtocolService();
  await storyService.initialize(address, signer); // MetaMask signer

  // Check creator authorization (backend API or on-chain registry)
  const isAuthorized = await storyService.isVerifiedCreator(address);
  // ...
};
```

---

**KILL: Lines 169-244** - `handleSubmitRequest()`
```typescript
// ❌ REMOVE THIS FLOW
// 1. Upload to IPFS (KEEP THIS)
// 2. Call tokenManagementService.submitTokenRequest() ❌ REMOVE
// 3. Wait for admin approval ❌ REMOVE (Story Protocol doesn't need pre-approval for minting)
```

**REPLACE WITH:**
```typescript
// ✅ NEW - IP Registration Flow
const handleRegisterIP = async () => {
  // Step 1: Upload content to backend for fingerprinting
  const fingerprintResult = await contentFingerprintService.uploadAndFingerprint(
    requestForm.contentFiles[0],
    requestForm.title
  );

  // Step 2: Check similarity against existing IPs
  const similarityCheck = await contentFingerprintService.checkSimilarity(
    fingerprintResult.hash
  );

  // Step 3: Handle branching logic
  if (similarityCheck.score > 85) {
    // ALERT: Derivative detected! Must link to parent
    setDetectedParent(similarityCheck.parentIpId);
    setShowDerivativeDialog(true);
    return;
  } else if (similarityCheck.score >= 60) {
    // YELLOW ALERT: Manual review needed
    await sendToAdminReview(fingerprintResult.hash, similarityCheck);
    toast.info('Sent for admin review due to potential similarity');
    return;
  }

  // Step 4: Register as new IP on Story Protocol
  const ipMetadataURI = await uploadJSONToPinata({
    name: requestForm.title,
    description: requestForm.description,
    ipType: requestForm.ipType,
    contentHash: fingerprintResult.hash,
    ipfsCid: fingerprintResult.ipfsCid
  });

  const result = await storyProtocolService.registerIpAsset(
    ipMetadataURI,
    requestForm.royaltyPercent
  );

  toast.success(`IP registered! IP ID: ${result.ipId}`);
};
```

---

**KILL: Lines 247-260** - `handleDeployToken()`
```typescript
// ❌ REMOVE - No "deploy" step in Story Protocol
// Story Protocol mints the IP NFT immediately during registration
```

---

**KILL: Lines 263-281** - `handleListOnMarketplace()`
```typescript
// ❌ REMOVE - Flow marketplace listing logic
```

**REPLACE WITH:**
```typescript
// ✅ NEW - Attach license terms (if not already attached during registration)
const handleAttachLicenseTerms = async (ipId: string, royaltyPercent: number) => {
  const result = await storyProtocolService.attachLicenseTerms(
    ipId,
    royaltyPercent,
    'commercial' // or 'non-commercial'
  );
  toast.success('License terms attached! Ready for licensing.');
};
```

---

#### **marketplace.tsx**

**KILL: Lines 180-250** - `initializeContract()` (Flow contract setup)
```typescript
// ❌ REMOVE - Flow marketplace contract initialization
const initializeContract = async () => {
  // ... Flow contract setup
  const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);
  // ...
};
```

**REPLACE WITH:**
```typescript
// ✅ NEW - Story Protocol license marketplace
const initializeLicenseMarketplace = async () => {
  const licenseService = new LicenseMarketplaceService();
  await licenseService.initialize();
  // Fetch available IPs with license terms attached
  const availableIPs = await licenseService.fetchAvailableIPs();
  setListings(availableIPs);
};
```

---

**KILL: Lines 400-600** - `loadMarketplaceListings()` (Flow contract fetching)
```typescript
// ❌ REMOVE - Flow marketplace contract queries
const loadMarketplaceListings = async () => {
  // ... fetch from Flow marketplace contract
  const listingIds = await marketplaceContract.getAllListings();
  // ...
};
```

**REPLACE WITH:**
```typescript
// ✅ NEW - Fetch IPs from Story Protocol
const loadAvailableIPs = async () => {
  // Option 1: Query Story Protocol indexer/subgraph
  const ips = await storyProtocolService.queryAvailableIPs();

  // Option 2: Use backend API (recommended for faster queries)
  const ips = await backendApi.getAvailableIPs();

  setListings(ips);
};
```

---

**KILL: Buy Button Handler (Lines ~2000+)**
```typescript
// ❌ REMOVE - Flow token purchase
const handlePurchase = async (listing: MarketplaceListing) => {
  const tx = await marketplaceContract.buyToken(
    listing.tokenId,
    listing.amount,
    { value: listing.price }
  );
  await tx.wait();
  toast.success('Purchase successful!');
};
```

**REPLACE WITH:**
```typescript
// ✅ NEW - Mint License from Story Protocol
const handleMintLicense = async (ipAsset: IPAsset) => {
  // Step 1: Check if user is trying to "remix" (upload derivative)
  // This would come from a separate upload flow, not marketplace purchase

  // Step 2: Mint license token from the IP
  const result = await storyProtocolService.mintLicenseToken(
    ipAsset.ipId,
    1, // quantity
    address // recipient (buyer)
  );

  // Step 3: Payment happens via Story Protocol's license module
  // The royalty split is automatic based on attached license terms

  toast.success(`License minted! Token ID: ${result.licenseTokenId}`);
};
```

---

#### **admin.tsx**

**KILL: Lines 188-200** - `initializeContract()` (Flow admin contract)
```typescript
// ❌ REMOVE - Flow admin contract initialization
const initializeContract = async () => {
  const adminContract = new ethers.Contract(ADMIN_CONTRACT, ADMIN_ABI, signer);
  setAdminContract(adminContract);
};
```

**REPLACE WITH:**
```typescript
// ✅ NEW - Story Protocol admin service + dispute resolution
const initializeAdminServices = async () => {
  const adminService = new StoryProtocolAdminService();
  await adminService.initialize(address, signer);

  const disputeService = new DisputeResolutionService();
  await disputeService.initialize();

  // Fetch pending disputes (60-85% similarity matches)
  const disputes = await disputeService.fetchPendingDisputes();
  setDisputeQueue(disputes);
};
```

---

**KILL: Token Approval Functions (Lines ~400+)**
```typescript
// ❌ REMOVE - Flow token approval workflow
const handleApproveToken = async (requestId: string) => {
  await adminTokenManagementService.approveTokenRequest(requestId);
};
```

**REPLACE WITH:**
```typescript
// ✅ NEW - Dispute resolution actions
const handleApproveAsOriginal = async (disputeId: string) => {
  // Judge confirms: Bob's content is original, not derivative
  await disputeService.resolveDispute(disputeId, 'approved_as_original');
  toast.success('Approved as original IP');
};

const handleEnforceDerivativeLink = async (disputeId: string, parentIpId: string) => {
  // Judge confirms: Bob's content is derivative of Alice's
  // Force the linking on-chain
  await disputeService.enforceDerivativeLink(
    disputeId,
    parentIpId
  );
  toast.success('Derivative link enforced');
};
```

---

## 3️⃣ SERVICE LAYER STUB (Pseudocode)

### 📁 **File: `src/services/storyProtocolService.ts`**

```typescript
/**
 * @fileoverview Story Protocol Integration Service
 * @description Handles all interactions with Story Protocol SDK
 */

import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';

interface IpAssetMetadata {
  name: string;
  description: string;
  ipType: 'Text' | 'Video' | 'Audio' | 'Image';
  contentHash: string;
  ipfsCid: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

interface LicenseTerms {
  royaltyPercent: number; // 0-100
  commercialUse: boolean;
  derivativesAllowed: boolean;
}

export class StoryProtocolService {
  private client: StoryClient | null = null;
  private walletClient: any = null;
  private userAddress: string = '';

  /**
   * Initialize Story Protocol client with user's MetaMask wallet
   * @param address - User's wallet address
   * @param signer - Ethers.js signer from MetaMask
   */
  async initialize(address: string, signer: any): Promise<void> {
    // Create viem wallet client from MetaMask
    this.walletClient = createWalletClient({
      account: address as `0x${string}`,
      chain: sepolia, // Story Protocol testnet
      transport: http('https://rpc-sepolia.story.foundation')
    });

    // Initialize Story Protocol client
    const config: StoryConfig = {
      account: this.walletClient.account,
      transport: http('https://rpc-sepolia.story.foundation'),
      chainId: 'sepolia' // or 'mainnet' for production
    };

    this.client = StoryClient.newClient(config);
    this.userAddress = address;

    console.log('✅ Story Protocol client initialized');
  }

  /**
   * STEP 1: Register a new IP Asset (Alice's original content)
   * @param ipMetadataURI - IPFS URI containing asset metadata
   * @param royaltyPercent - Royalty percentage for commercial use (0-100)
   * @returns IP ID (on-chain identifier)
   */
  async registerIpAsset(
    ipMetadataURI: string,
    royaltyPercent: number
  ): Promise<{ ipId: string; txHash: string }> {
    if (!this.client) throw new Error('Client not initialized');

    // Call Story Protocol SDK
    const response = await this.client.ipAsset.registerIpAsset({
      nftContract: '0x...', // Your NFT contract address (or use Story's default)
      tokenId: '0', // Auto-increment or specify
      ipMetadata: {
        ipMetadataURI,
        ipMetadataHash: '', // Optional: keccak256 hash for verification
        nftMetadataHash: '', // Optional
        nftMetadataURI: ipMetadataURI
      }
    });

    console.log('✅ IP Asset registered:', response.ipId);
    return {
      ipId: response.ipId,
      txHash: response.txHash
    };
  }

  /**
   * STEP 2: Attach license terms to the IP Asset
   * @param ipId - IP Asset ID from registration
   * @param royaltyPercent - Commercial revenue share (0-100)
   * @param licenseType - 'commercial' or 'non-commercial'
   */
  async attachLicenseTerms(
    ipId: string,
    royaltyPercent: number,
    licenseType: 'commercial' | 'non-commercial'
  ): Promise<{ licenseTermsId: string; txHash: string }> {
    if (!this.client) throw new Error('Client not initialized');

    // Register PIL (Programmable IP License) terms
    const termsResponse = await this.client.license.registerPILTerms({
      transferable: true,
      royaltyPolicy: '0x...', // Story Protocol's default royalty policy address
      defaultMintingFee: 0, // Fee in wei to mint a license
      expiration: 0, // 0 = no expiration
      commercialUse: licenseType === 'commercial',
      commercialAttribution: true,
      commercializerChecker: '0x0000000000000000000000000000000000000000',
      commercialRevShare: royaltyPercent * 100, // Story uses basis points (10% = 1000)
      commercialRevCeiling: 0,
      derivativesAllowed: true,
      derivativesAttribution: true,
      derivativesApproval: false,
      derivativesReciprocal: false,
      derivativeRevCeiling: 0,
      currency: '0x...', // Payment token address (USDC, etc.)
      uri: ''
    });

    // Attach the license terms to the IP
    const attachResponse = await this.client.license.attachLicenseTerms({
      ipId,
      licenseTermsId: termsResponse.licenseTermsId
    });

    console.log('✅ License terms attached:', attachResponse.txHash);
    return {
      licenseTermsId: termsResponse.licenseTermsId,
      txHash: attachResponse.txHash
    };
  }

  /**
   * STEP 3A: Mint a license token (Bob licenses from Alice)
   * @param ipId - Parent IP ID (Alice's IP)
   * @param quantity - Number of licenses to mint
   * @param receiver - Recipient address (Bob's address)
   */
  async mintLicenseToken(
    ipId: string,
    quantity: number,
    receiver: string
  ): Promise<{ licenseTokenId: string; txHash: string }> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await this.client.license.mintLicenseTokens({
      licensorIpId: ipId,
      licenseTermsId: '1', // Retrieved from attachLicenseTerms
      amount: quantity,
      receiver: receiver as `0x${string}`,
      txOptions: { waitForTransaction: true }
    });

    console.log('✅ License token minted:', response.licenseTokenId);
    return {
      licenseTokenId: response.licenseTokenId.toString(),
      txHash: response.txHash
    };
  }

  /**
   * STEP 3B: Register derivative IP (Bob's remix linked to Alice's original)
   * @param childMetadataURI - Bob's content metadata
   * @param parentIpIds - Array of parent IP IDs (Alice's IP)
   * @param licenseTokenIds - License token IDs obtained from minting
   */
  async registerDerivativeIpAsset(
    childMetadataURI: string,
    parentIpIds: string[],
    licenseTokenIds: string[]
  ): Promise<{ childIpId: string; txHash: string }> {
    if (!this.client) throw new Error('Client not initialized');

    const response = await this.client.ipAsset.registerDerivativeIp({
      nftContract: '0x...', // Your NFT contract
      tokenId: '0', // Auto or specify
      derivData: {
        parentIpIds: parentIpIds as `0x${string}`[],
        licenseTokenIds: licenseTokenIds.map(id => BigInt(id))
      },
      ipMetadata: {
        ipMetadataURI: childMetadataURI,
        ipMetadataHash: '',
        nftMetadataHash: '',
        nftMetadataURI: childMetadataURI
      }
    });

    console.log('✅ Derivative IP registered:', response.ipId);
    return {
      childIpId: response.ipId,
      txHash: response.txHash
    };
  }

  /**
   * Query available IPs with license terms attached
   * (This would typically use Story Protocol's subgraph/indexer)
   */
  async queryAvailableIPs(): Promise<any[]> {
    // TODO: Implement subgraph query or backend API call
    // For now, return mock data
    return [];
  }

  /**
   * Check if user is a verified creator (optional backend check)
   */
  async isVerifiedCreator(address: string): Promise<boolean> {
    // Call backend API or check on-chain registry
    return true; // For MVP, auto-approve all creators
  }
}
```

---

### 📁 **File: `src/services/contentFingerprintService.ts`**

```typescript
/**
 * @fileoverview Content Fingerprinting & Similarity Detection
 * @description Client for backend API that handles content hashing and comparison
 */

interface FingerprintResult {
  hash: string; // Perceptual hash or SHA256
  ipfsCid: string; // Pinata IPFS CID
  fileSize: number;
  mimeType: string;
}

interface SimilarityCheckResult {
  score: number; // 0-100
  isMatch: boolean; // score >= 85
  isPotentialMatch: boolean; // score 60-85
  parentIpId?: string; // If match found
  parentMetadata?: {
    name: string;
    creator: string;
    contentHash: string;
  };
}

export class ContentFingerprintService {
  private backendUrl: string = 'http://localhost:3001/api'; // Backend API URL

  /**
   * STEP 1: Upload content to backend for fingerprinting
   * @param file - Content file (text, video, audio, image)
   * @param title - Asset title
   * @returns Fingerprint result with hash and IPFS CID
   */
  async uploadAndFingerprint(
    file: File,
    title: string
  ): Promise<FingerprintResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    const response = await fetch(`${this.backendUrl}/fingerprint`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to fingerprint content');
    }

    const result = await response.json();
    console.log('✅ Content fingerprinted:', result);
    return result;
  }

  /**
   * STEP 2: Check similarity against existing IPs
   * @param contentHash - Hash from fingerprinting
   * @returns Similarity score and parent IP info if match found
   */
  async checkSimilarity(contentHash: string): Promise<SimilarityCheckResult> {
    const response = await fetch(`${this.backendUrl}/check-similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentHash })
    });

    if (!response.ok) {
      throw new Error('Failed to check similarity');
    }

    const result = await response.json();
    console.log('🔍 Similarity check:', result);
    return result;
  }
}
```

---

### 📁 **File: `src/services/disputeResolutionService.ts`**

```typescript
/**
 * @fileoverview Dispute Resolution Service (Admin Panel)
 * @description Handles similarity disputes (60-85% matches) for admin review
 */

interface Dispute {
  disputeId: string;
  submittedBy: string;
  contentHash: string;
  potentialParentIpId: string;
  similarityScore: number;
  status: 'pending' | 'approved_as_original' | 'enforced_derivative';
  createdAt: Date;
}

export class DisputeResolutionService {
  private backendUrl: string = 'http://localhost:3001/api';

  /**
   * Fetch all pending disputes for admin review
   */
  async fetchPendingDisputes(): Promise<Dispute[]> {
    const response = await fetch(`${this.backendUrl}/disputes/pending`);
    const disputes = await response.json();
    return disputes;
  }

  /**
   * Admin approves content as original (not derivative)
   */
  async resolveDispute(
    disputeId: string,
    resolution: 'approved_as_original' | 'enforced_derivative'
  ): Promise<void> {
    await fetch(`${this.backendUrl}/disputes/${disputeId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution })
    });
  }

  /**
   * Admin forces derivative linking via Story Protocol
   */
  async enforceDerivativeLink(
    disputeId: string,
    parentIpId: string
  ): Promise<void> {
    // This would call Story Protocol SDK to register the derivative
    // on behalf of the user (requires admin privileges or escrow)
    await fetch(`${this.backendUrl}/disputes/${disputeId}/enforce-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentIpId })
    });
  }
}
```

---

## 4️⃣ PAGE FLOW CONFIRMATION

### 🛒 **Marketplace "Buy" Button Flow** (CRITICAL)

#### **Current Flow (Real Estate on Flow):**
```
User clicks "Buy"
  → BuyModal opens
  → User enters quantity
  → Calls `marketplaceContract.buyToken(tokenId, amount, { value: price })`
  → Transfers FLOW tokens from buyer to seller
  → ERC1155 tokens transferred to buyer
  → Transaction complete
```

#### **New Flow (IP-OPS on Story Protocol):**

**Scenario A: User wants to LICENSE existing IP (not upload derivative)**
```
User clicks "Mint License" on Alice's IP
  → LicenseModal opens
  → Shows: Royalty rate (10%), License terms
  → User clicks "Confirm"
  → Calls `storyProtocolService.mintLicenseToken(ipId, 1, userAddress)`
  → Story Protocol mints license NFT
  → Payment sent to Alice (via Story's royalty module)
  → License token appears in user's "My Licenses" section
```

**Scenario B: User wants to UPLOAD DERIVATIVE (remix/adaptation)**
```
User navigates to "Register IP" page
  → Uploads their derivative content (e.g., Bob's remix video)
  → Backend fingerprints the content
  → Backend detects similarity (score = 92%) with Alice's original
  → Red Alert: "Derivative Detected! Original by Alice"
  → User MUST click "Link & Pay" button
  → Calls:
      1. storyProtocolService.mintLicenseToken(aliceIpId, 1, bobAddress)
      2. storyProtocolService.registerDerivativeIpAsset(bobMetadataURI, [aliceIpId], [licenseTokenId])
  → Bob's IP is registered as derivative of Alice
  → Bob can now license his derivative (royalties split with Alice automatically)
```

**Key Difference:**
- **Old:** "Buy" = Purchase tokens (one-time transfer)
- **New:** "Mint License" = Get permission to use IP (ongoing royalty relationship)
- **New:** Derivatives MUST be linked to parent IP (enforced by smart contract + backend detection)

---

## 5️⃣ BACKEND API REQUIREMENTS

### 🖥️ **Tech Stack Recommendation**

**Option A: Node.js/Express (Easier for TypeScript integration)**
```
- Framework: Express.js
- Database: PostgreSQL (or MongoDB for simpler MVP)
- File Upload: Multer middleware
- IPFS: Pinata SDK (already used in frontend)
- Hashing: crypto (built-in for text), ffmpeg + pHash (for video later)
```

**Option B: Python/FastAPI (Better for NLP/ML later)**
```
- Framework: FastAPI
- Database: PostgreSQL
- File Upload: FastAPI File handling
- IPFS: py-pinata or requests library
- Hashing: hashlib (for text), opencv + imagehash (for video later)
```

**Recommendation for MVP:** **Node.js/Express** (easier to integrate with your existing TypeScript codebase)

---

### 📡 **Required API Endpoints**

#### **1. POST `/api/fingerprint`**
**Purpose:** Upload content, generate hash, upload to IPFS, save to database

**Input:**
```typescript
FormData {
  file: File, // Text file initially, video later
  title: string,
  walletAddress: string
}
```

**Process:**
1. Receive file upload
2. Generate content hash:
   - **For Text:** SHA256 hash of normalized text (lowercase, remove whitespace)
   - **For Video (later):** Perceptual hash using ffmpeg + pHash or blockhash
3. Upload file to Pinata IPFS
4. Save to database:
   ```sql
   INSERT INTO ip_fingerprints (hash, ipfs_cid, wallet_address, title, created_at)
   VALUES (?, ?, ?, ?, NOW());
   ```

**Output:**
```json
{
  "hash": "0x123abc...",
  "ipfsCid": "QmXxx...",
  "fileSize": 1024,
  "mimeType": "text/plain"
}
```

---

#### **2. POST `/api/check-similarity`**
**Purpose:** Compare uploaded content hash against database to detect derivatives

**Input:**
```json
{
  "contentHash": "0x123abc..."
}
```

**Process:**
1. Query database for similar hashes:
   - **For Text (MVP):** Exact match or Levenshtein distance
   - **For Video (later):** Hamming distance on perceptual hashes
2. Calculate similarity score (0-100)
3. Return match results

**Output:**
```json
{
  "score": 88,
  "isMatch": true,
  "isPotentialMatch": false,
  "parentIpId": "0xABC...",
  "parentMetadata": {
    "name": "Original Song - Summer Nights",
    "creator": "0x789...",
    "contentHash": "0x456def..."
  }
}
```

**Logic Branching:**
- **Score >= 85:** `isMatch = true` → Force derivative linking
- **Score 60-84:** `isPotentialMatch = true` → Send to admin review
- **Score < 60:** No match → Proceed as original

---

#### **3. GET `/api/assets?walletAddress=0x...`**
**Purpose:** Fetch user's registered IP assets (for Dashboard quick fetch)

**Output:**
```json
[
  {
    "ipId": "0xABC...",
    "title": "Original Song - Summer Nights",
    "contentHash": "0x123...",
    "ipfsCid": "QmXxx...",
    "royaltyRate": 10,
    "licenseCount": 5,
    "createdAt": "2025-12-11T10:00:00Z"
  }
]
```

---

#### **4. GET `/api/disputes/pending`**
**Purpose:** Fetch pending similarity disputes for admin review

**Output:**
```json
[
  {
    "disputeId": "dispute_123",
    "submittedBy": "0x456...",
    "contentHash": "0x789...",
    "potentialParentIpId": "0xABC...",
    "similarityScore": 72,
    "status": "pending",
    "createdAt": "2025-12-11T12:00:00Z"
  }
]
```

---

#### **5. POST `/api/disputes/:disputeId/resolve`**
**Purpose:** Admin resolves a dispute

**Input:**
```json
{
  "resolution": "approved_as_original" | "enforced_derivative"
}
```

---

### 🗄️ **Database Schema**

**PostgreSQL Schema:**
```sql
-- Table: ip_fingerprints
CREATE TABLE ip_fingerprints (
  id SERIAL PRIMARY KEY,
  hash VARCHAR(66) NOT NULL UNIQUE, -- Content hash (0x...)
  ipfs_cid VARCHAR(100) NOT NULL,   -- Pinata IPFS CID
  wallet_address VARCHAR(42) NOT NULL, -- Creator address
  story_ip_id VARCHAR(66),          -- Story Protocol IP ID (if registered)
  title VARCHAR(255) NOT NULL,
  ip_type VARCHAR(20) DEFAULT 'Text', -- Text, Video, Audio, Image
  royalty_rate INTEGER DEFAULT 10,  -- Royalty percentage (0-100)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: similarity_disputes
CREATE TABLE similarity_disputes (
  id SERIAL PRIMARY KEY,
  dispute_id VARCHAR(50) UNIQUE NOT NULL,
  submitted_by VARCHAR(42) NOT NULL,   -- Uploader address
  content_hash VARCHAR(66) NOT NULL,   -- Hash of uploaded content
  parent_ip_id VARCHAR(66),            -- Potential parent IP
  similarity_score INTEGER NOT NULL,   -- 0-100
  status VARCHAR(30) DEFAULT 'pending', -- pending, approved_as_original, enforced_derivative
  resolved_by VARCHAR(42),             -- Admin address
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_hash ON ip_fingerprints(hash);
CREATE INDEX idx_wallet ON ip_fingerprints(wallet_address);
CREATE INDEX idx_status ON similarity_disputes(status);
```

---

### 🔍 **Text Hashing Algorithm (MVP)**

**For MVP, we start with TEXT content only (simpler than video):**

```javascript
// Backend: /api/fingerprint endpoint
const crypto = require('crypto');

function generateTextHash(textContent) {
  // Normalize text: lowercase, remove extra whitespace, trim
  const normalized = textContent
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  // Generate SHA256 hash
  const hash = crypto.createHash('sha256')
    .update(normalized)
    .digest('hex');

  return `0x${hash}`;
}

// Similarity check for text: Simple exact match or Levenshtein distance
function calculateTextSimilarity(hash1, hash2) {
  if (hash1 === hash2) return 100; // Exact match

  // For MVP: Return 0 if not exact (no fuzzy matching yet)
  // Later: Implement Levenshtein distance or cosine similarity
  return 0;
}
```

**Later (Video):** Use `ffmpeg` to extract audio/video fingerprints + `pHash` library

---

## 6️⃣ IMPLEMENTATION TIMELINE (NO CODE YET)

### **Phase 1: Backend API (Week 1-2)**
1. Set up Node.js/Express server
2. Implement PostgreSQL database
3. Build `/api/fingerprint` endpoint (text hashing + Pinata upload)
4. Build `/api/check-similarity` endpoint (exact match only for MVP)
5. Build `/api/assets` endpoint (fetch user IPs)
6. Build `/api/disputes/*` endpoints (admin panel)

### **Phase 2: Frontend Service Layer (Week 2-3)**
1. Create `storyProtocolService.ts` (Story SDK integration)
2. Create `contentFingerprintService.ts` (backend API client)
3. Create `disputeResolutionService.ts` (admin dispute handling)
4. Update `lib/storyProtocolConfig.ts` (Story Protocol addresses)

### **Phase 3: Page Migrations (Week 3-4)**
1. Migrate `newIssuerDashboard.tsx`:
   - Replace labels
   - Remove Flow contract calls
   - Add Story Protocol registration flow
   - Add derivative detection logic
2. Migrate `dashboard.tsx`:
   - Replace asset data structure
   - Fetch from Story Protocol + backend API
3. Migrate `marketplace.tsx`:
   - Change "Buy" to "Mint License"
   - Remove Flow marketplace contract
   - Add Story Protocol license minting
4. Migrate `admin.tsx`:
   - Add dispute queue UI
   - Add "Approve Original" vs "Enforce Derivative" actions

### **Phase 4: Testing & Refinement (Week 4-5)**
1. Test text-based IP registration flow
2. Test derivative detection (exact match)
3. Test admin dispute resolution
4. Add video/audio support (Phase 2 feature)

---

## 7️⃣ CRITICAL QUESTIONS BEFORE IMPLEMENTATION

1. **Story Protocol Network:**
   - Are you deploying on **Sepolia testnet** or **Story mainnet**?
   - Do you already have a Story Protocol API key?

2. **Content Type Priority:**
   - Confirm: Start with **TEXT only** for MVP, add video later?
   - Or do you want video support from day 1?

3. **Backend Hosting:**
   - Where will you host the backend? (Railway, Render, AWS, local for now?)
   - Do you have a PostgreSQL database set up or want to use MongoDB?

4. **Admin Authorization:**
   - How do you want to authorize "Judge" accounts?
   - Option A: Hardcoded addresses in backend
   - Option B: On-chain admin registry (reuse your existing Admin contract?)

5. **Payment Currency:**
   - What token for license payments? (USDC, ETH, Story's native token?)

---

## 8️⃣ NEXT STEPS

**STOP HERE. DO NOT IMPLEMENT YET.**

Please review this migration plan and confirm:

✅ **YES** to Variable Mapping Table
✅ **YES** to Kill List
✅ **YES** to Service Layer Stub
✅ **YES** to Page Flow Confirmation
✅ **YES** to Backend API Design

Once you say **"YES"**, I will:
1. Create the backend API (Node.js/Express + PostgreSQL)
2. Create the service layer (Story Protocol SDK integration)
3. Migrate the 4 pages one by one
4. Test the full flow end-to-end

---

## 📚 APPENDIX: KEY RESOURCES

- **Story Protocol Docs:** https://docs.story.foundation
- **Story Protocol SDK:** https://github.com/storyprotocol/sdk
- **Story Protocol Testnet Explorer:** https://testnet.storyscan.xyz
- **Pinata IPFS Docs:** https://docs.pinata.cloud
- **Perceptual Hashing (for video):** https://github.com/JohannesBuchner/imagehash

---

---

## ✅ DOCUMENT STATUS SUMMARY

### **✅ CURRENT IMPLEMENTATION (As of December 11, 2025)**

**Platform:** Real World Asset (RWA) Tokenization on Flow Blockchain

**Authentication:**
- ✅ JWT-based authentication with bcrypt
- ✅ MongoDB user database
- ✅ Multi-role system (admin, issuer, manager, user)
- ✅ Wallet integration (MetaMask + ethers.js)
- ✅ On-chain authorization via Admin contract

**Blockchain:**
- ✅ Flow EVM Testnet (Chain ID: 747)
- ✅ 5 deployed smart contracts
- ✅ ERC1155 token standard
- ✅ Marketplace with buy/sell functionality
- ✅ Invoice settlement system

**Services:**
- ✅ authApi.ts - Backend authentication
- ✅ robustAuthorizationService.js - On-chain verification
- ✅ tokenManagementService.js - Token workflow
- ✅ directMarketplaceListingService.js - Marketplace integration
- ✅ invoiceFinancingService.js - Settlement processing

**Contexts:**
- ✅ AuthContext.tsx - Global auth state
- ✅ WalletContext.tsx - Wallet connection state

### **🔮 FUTURE MIGRATION PLAN**

This document contains the detailed migration plan to transform the platform from:
- **FROM:** RWA Tokenization (Real Estate, Invoices, Commodities)
- **TO:** IP-OPS (Text, Video, Audio, Image IP Assets)
- **Blockchain:** Flow EVM → Story Protocol
- **New Features:** Content fingerprinting, similarity detection, derivative linking

**Key Migration Tasks:**
1. Replace Flow contracts with Story Protocol SDK
2. Add backend API for content fingerprinting
3. Update UI labels (Issuer → Creator, Token → IP Asset)
4. Implement similarity detection workflow
5. Add dispute resolution for derivatives

**Status:** 📋 **PLANNING PHASE** - Not yet implemented

---

**End of Migration Plan. Current implementation documented. Future migration awaits approval.**
