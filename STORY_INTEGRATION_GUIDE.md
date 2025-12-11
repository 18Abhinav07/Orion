# 📘 STORY PROTOCOL INTEGRATION GUIDE
## Comprehensive Integration Architecture & Flow Documentation

**Version:** 1.0
**Date:** December 11, 2025
**Purpose:** Integration-ready documentation for migrating from Flow blockchain to Story Protocol
**Focus:** Function footprints, flow architecture, and bypass strategy (NO full code implementations)

---

## 📋 TABLE OF CONTENTS

1. [Story Protocol Lifecycle Overview](#1-story-protocol-lifecycle-overview)
2. [Current vs Story Protocol Flow Comparison](#2-current-vs-story-protocol-flow-comparison)
3. [Integration Architecture](#3-integration-architecture)
4. [Service Layer Function Footprints](#4-service-layer-function-footprints)
5. [Bypass Strategy: What to Replace](#5-bypass-strategy-what-to-replace)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Backend Integration Points](#7-backend-integration-points)
8. [Frontend Integration Points](#8-frontend-integration-points)
9. [Critical Integration Decisions](#9-critical-integration-decisions)

---

## 1️⃣ STORY PROTOCOL LIFECYCLE OVERVIEW

### **The Complete Story Protocol Flow**

Story Protocol uses a **5-stage lifecycle** for IP assets:

```
Stage 1: NFT Collection Setup (ONE-TIME)
   ↓
Stage 2: IP Asset Registration (CREATOR ACTION)
   ↓
Stage 3: License Terms Attachment (CREATOR ACTION)
   ↓
Stage 4A: License Token Minting (LICENSEE ACTION)
   OR
Stage 4B: Derivative Registration (DERIVATIVE CREATOR ACTION)
   ↓
Stage 5: Royalty Distribution (AUTOMATIC)
```

---

### **Stage 1: NFT Collection Setup (One-Time Platform Setup)**

**What it does:**
- Creates an SPG (Story Protocol Gateway) NFT collection
- This collection will hold all IP assets as NFTs
- Only needs to be done ONCE per platform deployment

**When to do this:**
- During initial Story Protocol setup
- Before any creators can register IP

**Function Footprint:**
```typescript
createNFTCollection(params: {
  name: string,              // "IP-OPS Creative Assets"
  symbol: string,            // "IPOPS"
  isPublicMinting: boolean,  // false (only platform can mint)
  mintOpen: boolean,         // true
  mintFeeRecipient: Address, // Platform wallet or zero address
  contractURI: string        // Optional collection metadata
}) => Promise<{
  spgNftContract: Address,   // Store this in your config!
  txHash: string
}>
```

**Where to store the result:**
```typescript
// src/lib/storyProtocolConfig.ts
export const STORY_SPG_NFT_CONTRACT = "0xYourCollectionAddress";
```

**Bypass Strategy:**
- ❌ **REMOVE:** Current flow doesn't have NFT collection concept
- ✅ **ADD:** One-time setup script (run manually or in deployment pipeline)

---

### **Stage 2: IP Asset Registration**

**What it does:**
- Mints an NFT in your collection
- Registers the NFT as an IP Asset on Story Protocol
- Links metadata (IPFS URIs)
- Generates a unique IP ID

**When to do this:**
- When a creator uploads original content (after similarity check passes)
- Replaces: Flow's `TokenManagement.submitTokenRequest()` + `deployApprovedToken()`

**Function Footprint:**
```typescript
registerIpAsset(params: {
  nft: {
    type: "mint",                    // Mint new NFT
    spgNftContract: Address          // Your collection address
  },
  ipMetadata: {
    ipMetadataURI: string,           // IPFS URI (ipfs://Qm...)
    ipMetadataHash: HexString,       // 0x... (32 bytes)
    nftMetadataURI: string,          // Can be same as ipMetadataURI
    nftMetadataHash: HexString       // 0x... (32 bytes)
  }
}) => Promise<{
  ipId: Address,        // THIS IS THE KEY! Store this everywhere
  tokenId: bigint,      // NFT token ID in collection
  txHash: string
}>
```

**Critical Output:**
- **`ipId`**: This is the unique identifier for the IP asset. Think of it like `tokenId` in Flow, but global across Story Protocol
- **`tokenId`**: The NFT token ID within your collection

**Where to store:**
- Backend database: `ip_fingerprints.story_ip_id = ipId`
- Return to frontend for display

**Bypass Strategy:**
```typescript
// ❌ OLD (Flow): Two-step process
await tokenManagementService.submitTokenRequest(metadataURI, amount, price);
// Wait for admin approval...
await tokenManagementService.deployApprovedToken(requestId);

// ✅ NEW (Story): One-step process
const { ipId } = await storyProtocolService.registerIpAsset({
  nft: { type: "mint", spgNftContract: SPG_CONTRACT },
  ipMetadata: { ipMetadataURI, ipMetadataHash, nftMetadataURI, nftMetadataHash }
});
```

---

### **Stage 3: License Terms Attachment**

**What it does:**
- Defines the "rules" for how others can use your IP
- Sets royalty percentages
- Enables/disables commercial use, derivatives, etc.
- Attaches these terms to the IP Asset

**When to do this:**
- Immediately after IP registration (can be done in same flow)
- OR as a separate step if creator wants to add licensing later

**Function Footprint:**

**Step 3A: Register License Terms**
```typescript
registerPILTerms(params: {
  transferable: boolean,           // Can license be transferred?
  royaltyPolicy: Address,          // Story's RoyaltyPolicyLAP address
  defaultMintingFee: bigint,       // Fee to mint a license (in wei)
  expiration: bigint,              // 0 = no expiration
  commercialUse: boolean,          // Allow commercial use?
  commercialAttribution: boolean,  // Require attribution?
  commercializerChecker: Address,  // Usually zero address
  commercialRevShare: number,      // Royalty % (0-100, in basis points: 10% = 1000)
  commercialRevCeiling: bigint,    // Max revenue before no more royalties
  derivativesAllowed: boolean,     // Allow derivatives?
  derivativesAttribution: boolean, // Require attribution for derivatives?
  derivativesApproval: boolean,    // Require creator approval for derivatives?
  derivativesReciprocal: boolean,  // Derivative must use same license?
  derivativeRevCeiling: bigint,    // Max derivative revenue
  currency: Address,               // Payment token (WIP_TOKEN_ADDRESS or USDC)
  uri: string                      // Optional license metadata URI
}) => Promise<{
  licenseTermsId: string,  // Store this! Needed for minting licenses
  txHash: string
}>
```

**Step 3B: Attach Terms to IP**
```typescript
attachLicenseTerms(params: {
  ipId: Address,           // From registerIpAsset()
  licenseTermsId: string,  // From registerPILTerms()
  licenseTemplate: Address // PIL template address (from Story config)
}) => Promise<{
  txHash: string
}>
```

**Simplified Version (Recommended):**
Story SDK provides shortcuts for common license types:

```typescript
// For commercial remix with revenue share
registerCommercialRemixPIL(params: {
  defaultMintingFee: bigint,     // 0 for free licensing
  commercialRevShare: number,    // 10 = 10% royalty
  currency: Address,             // WIP_TOKEN_ADDRESS
  royaltyPolicyAddress: Address  // LAP_ROYALTY_POLICY_ADDRESS
}) => Promise<{
  licenseTermsId: string
}>
```

**Where to store:**
- Backend: `ip_fingerprints.license_terms_id = licenseTermsId`
- Or embed in metadata if you want on-chain immutability

**Bypass Strategy:**
```typescript
// ❌ OLD (Flow): Listing on marketplace with fixed price
await marketplaceContract.listAsset(tokenId, amount, price);

// ✅ NEW (Story): Attach license terms with royalty %
const { licenseTermsId } = await storyProtocolService.registerCommercialRemixPIL({
  commercialRevShare: 10,  // 10% royalty
  defaultMintingFee: 0,
  currency: WIP_TOKEN_ADDRESS,
  royaltyPolicyAddress: LAP_ROYALTY_POLICY
});

await storyProtocolService.attachLicenseTerms({
  ipId,
  licenseTermsId,
  licenseTemplate: PIL_TEMPLATE_ADDRESS
});
```

---

### **Stage 4A: License Token Minting (for Licensees)**

**What it does:**
- A user "buys a license" to use the IP
- Mints an NFT license token to the buyer
- Payment is handled by Story Protocol (uses the currency specified in license terms)
- Does NOT transfer the original IP - only grants permission

**When to do this:**
- When a user clicks "Mint License" on marketplace
- Replaces: Flow's `marketplace.buyToken()`

**Function Footprint:**
```typescript
mintLicenseTokens(params: {
  licensorIpId: Address,      // Parent IP ID (the IP being licensed)
  licenseTermsId: string,     // Which license terms to use
  licenseTemplate: Address,   // PIL template address
  amount: number,             // Number of licenses to mint (usually 1)
  receiver: Address,          // Who gets the license (buyer wallet)
  maxMintingFee: bigint,      // Max fee willing to pay (slippage protection)
  maxRevenueShare: number     // Max royalty % willing to accept
}) => Promise<{
  licenseTokenIds: bigint[],  // Array of minted license token IDs
  txHash: string
}>
```

**What happens under the hood:**
1. User pays the `defaultMintingFee` (if set) in the specified currency
2. Story Protocol mints a License NFT to the user
3. User now has permission to use the IP according to the license terms
4. If user creates derivative content, they can use this license token to register it

**Where to store:**
- Backend: Create `license_tokens` table to track owned licenses
- Frontend: Display in user's "My Licenses" section

**Bypass Strategy:**
```typescript
// ❌ OLD (Flow): Direct token purchase
await marketplaceContract.buyToken(
  tokenId,
  amount,
  { value: totalPrice }  // Send FLOW tokens
);
// Result: User owns actual token fractions

// ✅ NEW (Story): License minting
const { licenseTokenIds } = await storyProtocolService.mintLicenseTokens({
  licensorIpId: ipId,
  licenseTermsId: "10",
  licenseTemplate: PIL_TEMPLATE,
  amount: 1,
  receiver: userAddress,
  maxMintingFee: 0,
  maxRevenueShare: 100
});
// Result: User owns LICENSE to use IP (not the IP itself)
```

**Key Difference:**
- **Flow:** User buys ownership fractions (ERC1155 tokens)
- **Story:** User buys permission to use (License NFT)

---

### **Stage 4B: Derivative Registration**

**What it does:**
- Registers a new IP that is derived from a parent IP
- Links child IP to parent IP on-chain
- Automatically sets up royalty flow (parent gets % of child's revenue)

**When to do this:**
- After backend detects similarity (score >= 85%)
- User confirms they want to register as derivative
- Replaces: Manual linking in Flow (not currently implemented)

**Two Approaches:**

**Option 1: Direct Registration (No License Token Needed)**
```typescript
registerDerivative(params: {
  childIpId: Address,         // The derivative IP (register this first)
  parentIpIds: Address[],     // Array of parent IPs
  licenseTermsIds: string[],  // Which license terms to use from each parent
  maxMintingFee: bigint,      // Max fee willing to pay per parent
  maxRevenueShare: number,    // Max total royalty %
  maxRts: bigint              // Max "Royalty Token Supply" (use 100_000_000)
}) => Promise<{
  txHash: string
}>
```

**Option 2: Using License Token (If Already Minted)**
```typescript
registerDerivativeWithLicenseTokens(params: {
  childIpId: Address,         // The derivative IP
  licenseTokenIds: bigint[],  // License tokens from mintLicenseTokens()
  maxRts: bigint              // Max "Royalty Token Supply"
}) => Promise<{
  txHash: string
}>
```

**Complete Derivative Flow:**
```typescript
// Step 1: Upload derivative content to IPFS
const derivativeMetadataURI = await uploadJSONToPinata(derivativeMetadata);

// Step 2: Register derivative as IP Asset first
const { ipId: childIpId } = await storyProtocolService.registerIpAsset({
  nft: { type: "mint", spgNftContract: SPG_CONTRACT },
  ipMetadata: { ipMetadataURI: derivativeMetadataURI, ... }
});

// Step 3: Link to parent
await storyProtocolService.registerDerivative({
  childIpId,
  parentIpIds: [parentIpId],
  licenseTermsIds: [parentLicenseTermsId],
  maxMintingFee: 0,
  maxRevenueShare: 100,
  maxRts: 100_000_000
});
```

**Where to store:**
- Backend: `ip_fingerprints.parent_ip_ids = [parentIpId]`
- Backend: `ip_fingerprints.is_derivative = true`

**Bypass Strategy:**
```typescript
// ❌ OLD (Flow): No derivative tracking
// Manual linking not implemented in current Flow platform

// ✅ NEW (Story): Automatic on-chain derivative linking
// When backend detects similarity >= 85%:
if (similarityScore >= 85) {
  // Force derivative registration
  await storyProtocolService.registerDerivative({
    childIpId: bobIpId,
    parentIpIds: [aliceIpId],
    licenseTermsIds: [aliceLicenseTermsId],
    maxMintingFee: 0,
    maxRevenueShare: 100,
    maxRts: 100_000_000
  });
}
```

---

### **Stage 5: Royalty Distribution**

**What it does:**
- Tracks revenue earned by IP assets
- Automatically calculates royalty splits based on derivative relationships
- Allows creators to claim their share

**When to do this:**
- **Pay Royalty:** When someone uses a licensed IP commercially
- **Claim Revenue:** When creator wants to withdraw earned royalties

**Function Footprints:**

**Pay Royalty (External Payment):**
```typescript
payRoyaltyOnBehalf(params: {
  receiverIpId: Address,  // IP that is receiving payment
  payerIpId: Address,     // Who is paying (use zeroAddress for external payer)
  token: Address,         // Payment token (WIP_TOKEN or USDC)
  amount: bigint          // Amount to pay (in wei)
}) => Promise<{
  txHash: string
}>
```

**Claim Revenue (for Creators):**
```typescript
claimAllRevenue(params: {
  ancestorIpId: Address,       // Parent IP claiming revenue
  claimer: Address,            // Wallet claiming (usually IP owner)
  currencyTokens: Address[],   // Which tokens to claim (e.g., [WIP_TOKEN])
  childIpIds: Address[],       // Child IPs that generated revenue
  royaltyPolicies: Address[]   // Royalty policy addresses
}) => Promise<{
  claimableRevenue: bigint,    // Amount claimable
  txHash: string
}>
```

**Automatic Royalty Flow:**
```
User pays for derivative content
  ↓
Story Protocol calculates split:
  - Parent IP: 10% (from commercialRevShare)
  - Child IP: 90%
  ↓
Royalties deposited into IP Royalty Vaults
  ↓
Creators call claimAllRevenue() to withdraw
```

**Where to store:**
- Backend: Track `royalty_payments` table for analytics
- Frontend: Display in creator dashboard "Earned Royalties" section

**Bypass Strategy:**
```typescript
// ❌ OLD (Flow): Manual payment splitting via PaymentSplitter contract
// Revenue split happens at buy time, fixed %

// ✅ NEW (Story): Automatic royalty distribution
// Story Protocol handles all royalty math automatically
// Creators just need to call claim when they want to withdraw
await storyProtocolService.claimAllRevenue({
  ancestorIpId: aliceIpId,
  claimer: aliceAddress,
  currencyTokens: [WIP_TOKEN_ADDRESS],
  childIpIds: [bobIpId, charlieIpId],
  royaltyPolicies: [LAP_ROYALTY_POLICY]
});
```

---

## 2️⃣ CURRENT VS STORY PROTOCOL FLOW COMPARISON

### **Current Flow: Token Creation & Trading**

```
CREATOR FLOW (Current - Flow Blockchain):
1. Creator logs in (JWT auth)
2. Creator connects wallet (MetaMask)
3. System verifies: Admin.isIssuer(address)
4. Creator uploads metadata to IPFS
5. Creator calls: TokenManagement.submitTokenRequest(metadataURI, amount, price)
   ↳ Emits: TokenRequestSubmitted event
6. ⏸️ WAIT for admin approval
7. Admin calls: TokenManagement.approveTokenRequest(requestId)
8. Creator calls: TokenManagement.deployApprovedToken(requestId)
   ↳ Calls: ERC1155Core.mint(creator, tokenId, amount)
9. Creator calls: Marketplace.listAsset(tokenId, amount)
10. Token now available for purchase

BUYER FLOW (Current - Flow Blockchain):
1. User browses marketplace
2. User calls: Marketplace.buyToken(tokenId, amount, { value: totalPrice })
   ↳ Transfers FLOW tokens to seller
   ↳ Transfers ERC1155 tokens to buyer
3. User now owns token fractions
```

### **New Flow: IP Registration & Licensing**

```
CREATOR FLOW (New - Story Protocol):
1. Creator logs in (JWT auth)
2. Creator connects wallet (MetaMask)
3. Creator uploads content file (text/video/audio)
4. Backend fingerprints content (SHA256 or perceptual hash)
5. Backend checks similarity against database
   ↳ IF score < 60%: Proceed as original
   ↳ IF score 60-85%: Send to admin review
   ↳ IF score >= 85%: Force derivative registration
6. FOR ORIGINAL CONTENT:
   a. Upload metadata to IPFS
   b. Call: StoryProtocol.registerIpAsset(nft, ipMetadata)
      ↳ Mints NFT in SPG collection
      ↳ Registers as IP Asset
      ↳ Returns ipId
   c. Call: StoryProtocol.registerCommercialRemixPIL(royaltyPercent)
      ↳ Returns licenseTermsId
   d. Call: StoryProtocol.attachLicenseTerms(ipId, licenseTermsId)
   e. IP now available for licensing (no admin approval needed)

LICENSEE FLOW (New - Story Protocol):
1. User browses marketplace (shows IPs with license terms)
2. User calls: StoryProtocol.mintLicenseTokens(ipId, licenseTermsId, receiver)
   ↳ Pays minting fee (if any)
   ↳ Receives License NFT
3. User now has permission to use IP (doesn't own IP itself)

DERIVATIVE CREATOR FLOW (New - Story Protocol):
1. Creator uploads derivative content
2. Backend detects 92% similarity with Alice's IP
3. Frontend shows RED ALERT: "Derivative Detected!"
4. Creator must accept derivative terms:
   a. Call: StoryProtocol.registerIpAsset(derivativeMetadata)
      ↳ Returns childIpId
   b. Call: StoryProtocol.registerDerivative(childIpId, [parentIpId], [licenseTermsId])
      ↳ Links child to parent on-chain
      ↳ Sets up automatic royalty flow
5. When child IP earns revenue, parent automatically gets their %
```

---

## 3️⃣ INTEGRATION ARCHITECTURE

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Auth       │  │ Wallet     │  │ Story      │            │
│  │ Context    │  │ Context    │  │ Service    │            │
│  │ (JWT)      │  │ (MetaMask) │  │ (NEW)      │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API (Node.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth API     │  │ Fingerprint  │  │ Story API    │      │
│  │ (JWT Login)  │  │ Service      │  │ Integration  │      │
│  │              │  │ (NEW)        │  │ (NEW)        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                   │              │
│         ▼                 ▼                   ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ MongoDB      │  │ PostgreSQL   │  │ Pinata IPFS  │      │
│  │ (Users)      │  │ (Fingerprints)│  │ (Metadata)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  STORY PROTOCOL (Blockchain)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SPG NFT      │  │ IP Asset     │  │ License      │      │
│  │ Collection   │  │ Registry     │  │ Registry     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Royalty      │  │ IP Royalty   │                        │
│  │ Module       │  │ Vault        │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

### **Service Layer Structure**

**New Services to Create:**

```
src/services/
├── storyProtocolService.ts      ✅ NEW - Story SDK wrapper
├── contentFingerprintService.ts ✅ NEW - Backend API client
├── disputeResolutionService.ts  ✅ NEW - Admin dispute handling
├── authApi.ts                   ✓ KEEP - Already exists
└── (REMOVE these)
    ├── tokenManagementService.js     ❌ DELETE
    ├── directMarketplaceListingService.js ❌ DELETE
    ├── robustAuthorizationService.js ❌ DELETE (or adapt for Story)
```

**Context Updates:**

```
src/context/
├── AuthContext.tsx    ✓ KEEP - JWT auth still needed
└── WalletContext.tsx  🔧 MODIFY - Update for Story Protocol network
```

---

## 4️⃣ SERVICE LAYER FUNCTION FOOTPRINTS

### **A. storyProtocolService.ts**

**Purpose:** Wrapper around Story Protocol TypeScript SDK

**Class Structure:**
```typescript
export class StoryProtocolService {
  private client: StoryClient;
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  private userAddress: Address;
  private spgNftContract: Address;

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Initialize Story Protocol client with user's wallet
   * @param address - User's wallet address from MetaMask
   * @param signer - Ethers.js signer (from WalletContext)
   * @returns void
   * @throws Error if wallet connection fails
   */
  async initialize(
    address: Address,
    signer: Signer
  ): Promise<void>

  /**
   * Check if service is initialized
   * @returns boolean
   */
  isInitialized(): boolean

  // ========================================
  // IP ASSET REGISTRATION
  // ========================================

  /**
   * Register new IP Asset (original content)
   * @param params.ipMetadataURI - IPFS URI (ipfs://Qm...)
   * @param params.ipMetadataHash - SHA256 hash (0x...)
   * @param params.nftMetadataURI - NFT metadata URI (can be same as ipMetadataURI)
   * @param params.nftMetadataHash - NFT metadata hash
   * @returns Promise<{ ipId, tokenId, txHash }>
   * @throws Error if registration fails
   */
  async registerIpAsset(params: {
    ipMetadataURI: string;
    ipMetadataHash: HexString;
    nftMetadataURI: string;
    nftMetadataHash: HexString;
  }): Promise<{
    ipId: Address;
    tokenId: bigint;
    txHash: string;
  }>

  /**
   * Register IP Asset with license terms in one transaction
   * @param params.ipMetadata - Metadata URIs and hashes
   * @param params.licenseTerms - Commercial remix PIL terms
   * @returns Promise<{ ipId, tokenId, licenseTermsIds, txHash }>
   */
  async registerIpAssetWithLicense(params: {
    ipMetadata: IpMetadata;
    licenseTerms: CommercialRemixTerms;
  }): Promise<{
    ipId: Address;
    tokenId: bigint;
    licenseTermsIds: string[];
    txHash: string;
  }>

  // ========================================
  // LICENSE MANAGEMENT
  // ========================================

  /**
   * Register Commercial Remix PIL terms
   * @param params.royaltyPercent - Royalty percentage (0-100)
   * @param params.mintingFee - Fee to mint license (in wei, default 0)
   * @param params.currency - Payment token address
   * @returns Promise<{ licenseTermsId, txHash }>
   */
  async registerCommercialRemixPIL(params: {
    royaltyPercent: number;
    mintingFee?: bigint;
    currency: Address;
  }): Promise<{
    licenseTermsId: string;
    txHash: string;
  }>

  /**
   * Attach license terms to IP Asset
   * @param params.ipId - IP Asset ID
   * @param params.licenseTermsId - License terms ID from registerPILTerms
   * @returns Promise<{ txHash }>
   */
  async attachLicenseTerms(params: {
    ipId: Address;
    licenseTermsId: string;
  }): Promise<{
    txHash: string;
  }>

  /**
   * Mint license tokens (buyer gets permission to use IP)
   * @param params.licensorIpId - Parent IP being licensed
   * @param params.licenseTermsId - Which license terms to use
   * @param params.amount - Number of licenses to mint (usually 1)
   * @param params.receiver - Buyer's wallet address
   * @returns Promise<{ licenseTokenIds, txHash }>
   */
  async mintLicenseTokens(params: {
    licensorIpId: Address;
    licenseTermsId: string;
    amount: number;
    receiver: Address;
  }): Promise<{
    licenseTokenIds: bigint[];
    txHash: string;
  }>

  // ========================================
  // DERIVATIVE REGISTRATION
  // ========================================

  /**
   * Register derivative IP (links child to parent)
   * @param params.childIpId - Derivative IP ID (register this first!)
   * @param params.parentIpIds - Array of parent IP IDs
   * @param params.licenseTermsIds - License terms from each parent
   * @returns Promise<{ txHash }>
   */
  async registerDerivative(params: {
    childIpId: Address;
    parentIpIds: Address[];
    licenseTermsIds: string[];
  }): Promise<{
    txHash: string;
  }>

  /**
   * Register derivative IP using license tokens
   * @param params.childIpId - Derivative IP ID
   * @param params.licenseTokenIds - License tokens from mintLicenseTokens()
   * @returns Promise<{ txHash }>
   */
  async registerDerivativeWithLicenseTokens(params: {
    childIpId: Address;
    licenseTokenIds: bigint[];
  }): Promise<{
    txHash: string;
  }>

  /**
   * Complete derivative registration flow (register + link)
   * @param params.derivativeMetadata - Metadata for derivative
   * @param params.parentIpId - Parent IP ID
   * @param params.parentLicenseTermsId - Parent's license terms
   * @returns Promise<{ childIpId, txHash }>
   */
  async registerCompleteDerivative(params: {
    derivativeMetadata: IpMetadata;
    parentIpId: Address;
    parentLicenseTermsId: string;
  }): Promise<{
    childIpId: Address;
    txHash: string;
  }>

  // ========================================
  // ROYALTY MANAGEMENT
  // ========================================

  /**
   * Pay royalty on behalf of someone
   * @param params.receiverIpId - IP receiving payment
   * @param params.payerIpId - Who is paying (zeroAddress for external)
   * @param params.token - Payment token address
   * @param params.amount - Amount to pay (in wei)
   * @returns Promise<{ txHash }>
   */
  async payRoyaltyOnBehalf(params: {
    receiverIpId: Address;
    payerIpId: Address;
    token: Address;
    amount: bigint;
  }): Promise<{
    txHash: string;
  }>

  /**
   * Claim revenue from child IPs
   * @param params.ancestorIpId - Parent IP claiming revenue
   * @param params.claimer - Wallet address claiming
   * @param params.currencyTokens - Tokens to claim
   * @param params.childIpIds - Child IPs that generated revenue
   * @returns Promise<{ claimableRevenue, txHash }>
   */
  async claimAllRevenue(params: {
    ancestorIpId: Address;
    claimer: Address;
    currencyTokens: Address[];
    childIpIds: Address[];
  }): Promise<{
    claimableRevenue: bigint;
    txHash: string;
  }>

  // ========================================
  // QUERY HELPERS
  // ========================================

  /**
   * Get IP Asset details
   * @param ipId - IP Asset ID
   * @returns Promise<IpAssetDetails>
   */
  async getIpAsset(ipId: Address): Promise<IpAssetDetails>

  /**
   * Get license terms details
   * @param licenseTermsId - License terms ID
   * @returns Promise<LicenseTermsDetails>
   */
  async getLicenseTerms(licenseTermsId: string): Promise<LicenseTermsDetails>

  /**
   * Check if user owns license for IP
   * @param ipId - IP Asset ID
   * @param userAddress - User's wallet address
   * @returns Promise<boolean>
   */
  async hasLicense(ipId: Address, userAddress: Address): Promise<boolean>

  /**
   * Get all IPs owned by user (as creator)
   * @param userAddress - User's wallet address
   * @returns Promise<Address[]>
   */
  async getUserIpAssets(userAddress: Address): Promise<Address[]>

  /**
   * Get all licenses owned by user
   * @param userAddress - User's wallet address
   * @returns Promise<bigint[]>
   */
  async getUserLicenses(userAddress: Address): Promise<bigint[]>
}
```

---

### **B. contentFingerprintService.ts**

**Purpose:** Client for backend fingerprinting API

```typescript
export class ContentFingerprintService {
  private backendUrl: string;

  /**
   * Initialize with backend URL
   * @param baseUrl - Backend API base URL (default: http://localhost:3001/api)
   */
  constructor(baseUrl?: string)

  /**
   * Upload content and generate fingerprint
   * @param file - Content file (text, video, audio)
   * @param title - Asset title
   * @param walletAddress - Creator's wallet address
   * @returns Promise<{ hash, ipfsCid, fileSize, mimeType }>
   */
  async uploadAndFingerprint(
    file: File,
    title: string,
    walletAddress: Address
  ): Promise<{
    hash: HexString;
    ipfsCid: string;
    fileSize: number;
    mimeType: string;
  }>

  /**
   * Check similarity against existing fingerprints
   * @param contentHash - Hash from uploadAndFingerprint()
   * @returns Promise<SimilarityCheckResult>
   */
  async checkSimilarity(
    contentHash: HexString
  ): Promise<{
    score: number;
    isMatch: boolean;
    isPotentialMatch: boolean;
    parentIpId?: Address;
    parentMetadata?: {
      title: string;
      creator: Address;
      contentHash: HexString;
    };
  }>

  /**
   * Fetch user's fingerprinted assets
   * @param walletAddress - User's wallet address
   * @returns Promise<FingerprintRecord[]>
   */
  async getUserFingerprints(
    walletAddress: Address
  ): Promise<FingerprintRecord[]>

  /**
   * Update fingerprint with Story Protocol IP ID
   * @param contentHash - Content hash
   * @param storyIpId - IP ID from Story Protocol
   * @returns Promise<void>
   */
  async updateWithStoryIpId(
    contentHash: HexString,
    storyIpId: Address
  ): Promise<void>
}
```

---

### **C. disputeResolutionService.ts**

**Purpose:** Admin dispute handling for 60-85% similarity matches

```typescript
export class DisputeResolutionService {
  private backendUrl: string;

  constructor(baseUrl?: string)

  /**
   * Create a new dispute for admin review
   * @param params.submittedBy - Uploader's address
   * @param params.contentHash - Disputed content hash
   * @param params.contentTitle - Disputed content title
   * @param params.ipfsCid - IPFS CID
   * @param params.parentIpId - Potential parent IP ID
   * @param params.similarityScore - Similarity score (60-84)
   * @returns Promise<{ disputeId }>
   */
  async createDispute(params: {
    submittedBy: Address;
    contentHash: HexString;
    contentTitle: string;
    ipfsCid: string;
    parentIpId: Address;
    parentContentHash: HexString;
    similarityScore: number;
  }): Promise<{
    disputeId: string;
  }>

  /**
   * Fetch all pending disputes
   * @returns Promise<Dispute[]>
   */
  async fetchPendingDisputes(): Promise<Dispute[]>

  /**
   * Admin resolves dispute
   * @param disputeId - Dispute ID
   * @param resolution - 'approved_as_original' | 'enforced_derivative'
   * @param adminAddress - Admin's wallet address
   * @param notes - Resolution notes
   * @returns Promise<void>
   */
  async resolveDispute(
    disputeId: string,
    resolution: 'approved_as_original' | 'enforced_derivative',
    adminAddress: Address,
    notes?: string
  ): Promise<void>

  /**
   * Admin enforces derivative link via Story Protocol
   * @param disputeId - Dispute ID
   * @param childIpId - Child IP ID
   * @param parentIpId - Parent IP ID
   * @returns Promise<{ txHash }>
   */
  async enforceDerivativeLink(
    disputeId: string,
    childIpId: Address,
    parentIpId: Address
  ): Promise<{
    txHash: string;
  }>
}
```

---

## 5️⃣ BYPASS STRATEGY: WHAT TO REPLACE

### **Frontend Files to Modify**

#### **1. newIssuerDashboard.tsx**

**REMOVE:**
```
❌ Lines 2: import { ethers } from 'ethers'
❌ Lines 15-18: Flow service imports (TokenManagement, DirectListing, etc.)
❌ Lines 78-148: initializeService() function
❌ Lines 169-244: handleSubmitRequest() function
❌ Lines 247-260: handleDeployToken() function
❌ Lines 263-281: handleListOnMarketplace() function
```

**ADD:**
```
✅ Import: StoryProtocolService
✅ Import: ContentFingerprintService
✅ Function: initializeStoryProtocol()
✅ Function: handleRegisterIP()
✅ Function: handleDerivativeLinking()
✅ State: showDerivativeDialog, detectedParent
✅ JSX: Derivative detection dialog
```

**Flow Changes:**
```
OLD: Upload → Submit → Wait Approval → Deploy → List
NEW: Upload → Fingerprint → Check Similarity → Register IP → Attach License
```

---

#### **2. dashboard.tsx**

**REMOVE:**
```
❌ Lines 4: import { ethers } from 'ethers'
❌ Lines 11-14: Flow contract imports (MARKETPLACE_ABI, etc.)
❌ Function: fetchUserAssets() - Flow contract queries
```

**ADD:**
```
✅ Import: StoryProtocolService
✅ Import: IPAsset types
✅ Function: fetchUserIPAssets() - Backend API + Story queries
✅ State: ipAssets (replace userAssets)
```

**Data Changes:**
```
OLD: UserAsset[] with tokenId, price, amount
NEW: IPAsset[] with ipId, royaltyRate, licenseCount
```

---

#### **3. marketplace.tsx**

**REMOVE:**
```
❌ Lines 9, 14-16: Flow contract imports
❌ Lines 180-250: initializeContract() - Flow marketplace
❌ Lines 400-600: loadMarketplaceListings() - Flow contract queries
❌ Lines ~2000+: handlePurchase() - Buy button handler
```

**ADD:**
```
✅ Import: StoryProtocolService
✅ Function: initializeLicenseMarketplace()
✅ Function: loadAvailableIPs() - Backend API
✅ Function: handleMintLicense() - License minting
✅ Button: "Mint License" (replace "Buy")
```

**Button Change:**
```
OLD: <Button onClick={handlePurchase}>Buy Now</Button>
NEW: <Button onClick={handleMintLicense}>Mint License</Button>
```

---

#### **4. admin.tsx**

**REMOVE:**
```
❌ Lines 63-65: Flow admin contract imports
❌ Function: initializeContract() - Flow admin
❌ Function: handleApproveToken() - Token approval
```

**ADD:**
```
✅ Import: DisputeResolutionService
✅ State: disputeQueue
✅ Function: initializeAdminServices()
✅ Function: handleApproveAsOriginal()
✅ Function: handleEnforceDerivativeLink()
✅ Tab: Disputes
✅ JSX: Dispute queue UI
```

---

### **Backend Files to Create**

#### **New API Endpoints:**

```
POST   /api/fingerprint              - Generate hash + IPFS upload
POST   /api/check-similarity         - Compare against database
POST   /api/disputes/create          - Create dispute
GET    /api/disputes/pending         - Fetch pending disputes
POST   /api/disputes/:id/resolve     - Admin resolve
PATCH  /api/assets/:hash/update      - Update with Story IP ID
GET    /api/assets                   - Fetch user IPs
```

#### **New Database Tables:**

```
PostgreSQL:
- ip_fingerprints (hash, ipfs_cid, wallet_address, story_ip_id, title, ip_type, royalty_rate)
- similarity_disputes (dispute_id, submitted_by, content_hash, parent_ip_id, similarity_score, status)
- license_tokens (license_token_id, ip_id, licensee, minted_at)
```

---

### **Configuration Changes**

#### **src/lib/storyProtocolConfig.ts (NEW)**

```typescript
export const STORY_PROTOCOL_CONFIG = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Story Protocol Sepolia',
    rpcUrl: 'https://rpc-sepolia.story.foundation',
    blockExplorer: 'https://testnet.storyscan.xyz',
    contracts: {
      SPG_NFT_CONTRACT: '0xYourCollectionAddress',  // From createNFTCollection()
      WIP_TOKEN_ADDRESS: '0x...',                   // Payment token
      LAP_ROYALTY_POLICY: '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E',
      PIL_TEMPLATE: '0x...'                         // PIL license template
    }
  }
};

export const ACTIVE_STORY_NETWORK = 'SEPOLIA';
```

#### **WalletContext.tsx Updates**

```
CHANGE: Network validation
OLD: Flow Testnet (Chain ID: 747)
NEW: Story Sepolia (Chain ID: 11155111)

UPDATE: switchToRequiredNetwork()
- Check for chainId 11155111
- Add Story Sepolia to MetaMask if not present
```

---

## 6️⃣ DATA FLOW DIAGRAMS

### **Original Content Registration Flow**

```
┌─────────────┐
│   Creator   │
│  (Alice)    │
└──────┬──────┘
       │
       │ 1. Upload text file "My Original Story"
       ▼
┌──────────────────────────────────────────────┐
│            FRONTEND                          │
│  ┌────────────────────────────────────┐     │
│  │ newIssuerDashboard.tsx             │     │
│  │                                     │     │
│  │ handleRegisterIP() {                │     │
│  │   // Step 1: Fingerprint            │     │
│  │   contentFingerprintService         │     │
│  │     .uploadAndFingerprint(file)     │────┼─────┐
│  │ }                                   │     │     │
│  └────────────────────────────────────┘     │     │
└──────────────────────────────────────────────┘     │
                                                     │
       ┌─────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│            BACKEND API                       │
│  POST /api/fingerprint                       │
│                                              │
│  1. Read file content                        │
│  2. Generate SHA256 hash                     │
│  3. Upload to Pinata IPFS                    │
│  4. Save to ip_fingerprints table            │
│  5. Return { hash, ipfsCid }                 │
└──────────────┬───────────────────────────────┘
               │
               │ { hash: "0xabc...", ipfsCid: "Qm..." }
               │
               ▼
┌──────────────────────────────────────────────┐
│            FRONTEND                          │
│  handleRegisterIP() {                        │
│   // Step 2: Check similarity                │
│   similarityCheck =                          │
│     contentFingerprintService                │
│       .checkSimilarity(hash)  ──────────────┼─────┐
│  }                                           │     │
└──────────────────────────────────────────────┘     │
                                                     │
       ┌─────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│            BACKEND API                       │
│  POST /api/check-similarity                  │
│                                              │
│  1. Query ip_fingerprints WHERE hash = ?    │
│  2. Calculate similarity (exact match)       │
│  3. IF score < 60: { isMatch: false }       │
│  4. Return similarity result                 │
└──────────────┬───────────────────────────────┘
               │
               │ { score: 0, isMatch: false }
               │
               ▼
┌──────────────────────────────────────────────┐
│            FRONTEND                          │
│  handleRegisterIP() {                        │
│   // Step 3: No match - register as original│
│   ipMetadataURI =                            │
│     await uploadJSONToPinata(metadata)       │
│                                              │
│   // Step 4: Register on Story Protocol     │
│   { ipId } =                                 │
│     await storyProtocolService               │
│       .registerIpAsset({                     │
│         ipMetadataURI,                       │
│         ipMetadataHash                       │
│       })  ──────────────────────────────────┼─────┐
│  }                                           │     │
└──────────────────────────────────────────────┘     │
                                                     │
       ┌─────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│         STORY PROTOCOL (Blockchain)          │
│                                              │
│  1. Mint NFT in SPG collection               │
│  2. Register as IP Asset                     │
│  3. Assign unique ipId                       │
│  4. Emit IPRegistered event                  │
│  5. Return { ipId, tokenId, txHash }         │
└──────────────┬───────────────────────────────┘
               │
               │ { ipId: "0xIP123...", tokenId: 1 }
               │
               ▼
┌──────────────────────────────────────────────┐
│            FRONTEND                          │
│  handleRegisterIP() {                        │
│   // Step 5: Attach license terms            │
│   { licenseTermsId } =                       │
│     await storyProtocolService               │
│       .registerCommercialRemixPIL({          │
│         royaltyPercent: 10                   │
│       })                                     │
│                                              │
│   await storyProtocolService                 │
│     .attachLicenseTerms({                    │
│       ipId,                                  │
│       licenseTermsId                         │
│     })  ──────────────────────────────────┼─────┐
│                                              │     │
│   // Step 6: Update backend with IP ID      │     │
│   await contentFingerprintService            │     │
│     .updateWithStoryIpId(hash, ipId)         │     │
│  }                                           │     │
└──────────────────────────────────────────────┘     │
                                                     │
       ┌─────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│         STORY PROTOCOL (Blockchain)          │
│                                              │
│  1. Register PIL terms with 10% royalty      │
│  2. Attach terms to ipId                     │
│  3. IP now ready for licensing               │
│  4. Return { licenseTermsId, txHash }        │
└──────────────┬───────────────────────────────┘
               │
               │ SUCCESS!
               │
               ▼
┌──────────────────────────────────────────────┐
│            BACKEND DATABASE                  │
│                                              │
│  UPDATE ip_fingerprints                      │
│  SET story_ip_id = 'ipId',                   │
│      license_terms_id = 'licenseTermsId',    │
│      status = 'registered'                   │
│  WHERE hash = 'contentHash'                  │
└──────────────────────────────────────────────┘
```

---

### **Derivative Detection & Linking Flow**

```
┌─────────────┐
│   Creator   │
│    (Bob)    │
└──────┬──────┘
       │
       │ 1. Upload text file "My Story Remix"
       ▼
┌──────────────────────────────────────────────┐
│            FRONTEND                          │
│  handleRegisterIP() {                        │
│   fingerprint =                              │
│     await contentFingerprintService          │
│       .uploadAndFingerprint(file)            │
│  }                                           │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│            BACKEND API                       │
│  POST /api/fingerprint                       │
│  → Returns { hash: "0xdef..." }              │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│            FRONTEND                          │
│  handleRegisterIP() {                        │
│   similarityCheck =                          │
│     await contentFingerprintService          │
│       .checkSimilarity(hash)                 │
│  }                                           │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│            BACKEND API                       │
│  POST /api/check-similarity                  │
│                                              │
│  1. Compare hash with Alice's hash           │
│  2. Calculate similarity: 92%                │
│  3. Return {                                 │
│      score: 92,                              │
│      isMatch: true,                          │
│      parentIpId: "0xAliceIP...",             │
│      parentMetadata: { ... }                 │
│    }                                         │
└──────────────┬───────────────────────────────┘
               │
               │ { score: 92, isMatch: true }
               │
               ▼
┌──────────────────────────────────────────────┐
│            FRONTEND                          │
│  handleRegisterIP() {                        │
│   if (similarityCheck.isMatch) {             │
│     // RED ALERT: Derivative detected!      │
│     setDetectedParent(parentMetadata)        │
│     setShowDerivativeDialog(true)            │
│     return // STOP HERE                      │
│   }                                          │
│  }                                           │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │ Derivative Dialog                   │    │
│  │                                     │    │
│  │ "Derivative Detected!"              │    │
│  │ Original: Alice's "My Original Story"│   │
│  │ Similarity: 92%                     │    │
│  │                                     │    │
│  │ [Link as Derivative & Register]     │◄───┼── Bob clicks
│  └─────────────────────────────────────┘    │
└──────────────┬───────────────────────────────┘
               │
               │ Bob confirms derivative
               │
               ▼
┌──────────────────────────────────────────────┐
│            FRONTEND                          │
│  handleDerivativeLinking() {                 │
│   // Step 1: Register Bob's IP first        │
│   { ipId: bobIpId } =                        │
│     await storyProtocolService               │
│       .registerIpAsset(bobMetadata)          │
│  }                                           │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│         STORY PROTOCOL                       │
│  - Mints NFT for Bob's content               │
│  - Returns bobIpId                           │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│            FRONTEND                          │
│  handleDerivativeLinking() {                 │
│   // Step 2: Link to parent                  │
│   await storyProtocolService                 │
│     .registerDerivative({                    │
│       childIpId: bobIpId,                    │
│       parentIpIds: [aliceIpId],              │
│       licenseTermsIds: [aliceLicenseTermsId] │
│     })                                       │
│  }                                           │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│         STORY PROTOCOL                       │
│                                              │
│  1. Link bobIpId → aliceIpId                 │
│  2. Set up royalty flow:                     │
│     - When Bob earns $100                    │
│     - Alice gets $10 (10% from license)      │
│     - Bob keeps $90                          │
│  3. Emit DerivativeRegistered event          │
│  4. Return { txHash }                        │
└──────────────┬───────────────────────────────┘
               │
               │ SUCCESS!
               │
               ▼
┌──────────────────────────────────────────────┐
│         Bob's IP is now registered as        │
│         derivative of Alice's IP             │
│         Royalties will auto-split            │
└──────────────────────────────────────────────┘
```

---

## 7️⃣ BACKEND INTEGRATION POINTS

### **Minimal Backend Modifications**

**Current Backend (Keep):**
```
✓ Authentication API (/auth/*)
✓ JWT token management
✓ MongoDB user database
✓ Role-based access control
```

**New Backend Features (Add):**
```
✅ Content fingerprinting endpoint
✅ Similarity detection endpoint
✅ Dispute management endpoints
✅ PostgreSQL fingerprints database
✅ Story Protocol webhook handlers (optional)
```

---

### **Backend Service Integration Pattern**

**Where to integrate Story Protocol in backend:**

```
Backend should NOT directly call Story Protocol SDK
Instead:
1. Backend fingerprints content
2. Backend checks similarity
3. Backend returns results to frontend
4. Frontend calls Story Protocol SDK
5. Frontend sends confirmation back to backend
```

**Exception: Admin-Forced Derivative Linking**
```
When admin enforces derivative link:
1. Admin clicks "Enforce" in admin panel
2. Frontend calls backend: POST /api/disputes/:id/enforce
3. Backend initializes Story Protocol service (server-side)
4. Backend calls storyProtocolService.registerDerivative()
5. Backend updates dispute status
```

**Why this pattern:**
- Story Protocol requires user's wallet signature
- Most actions should happen in frontend (user signs)
- Backend only for: fingerprinting, comparison, admin overrides

---

## 8️⃣ FRONTEND INTEGRATION POINTS

### **Critical Integration Points**

#### **Point 1: newIssuerDashboard.tsx - Line 169**

**Current:** `handleSubmitRequest()`
```
Upload to IPFS → Submit to TokenManagement → Wait for approval
```

**Replace with:** `handleRegisterIP()`
```
1. Upload to backend → Fingerprint
2. Check similarity → Branch logic
3. If original → Register on Story Protocol
4. If derivative → Show dialog
```

**Key Decision:** When to call Story Protocol?
```
✅ Call after similarity check passes
❌ Don't call before fingerprinting
❌ Don't call if similarity >= 85% (force derivative)
```

---

#### **Point 2: marketplace.tsx - Line ~2000+**

**Current:** `handlePurchase(listing)` - Buy button
```
marketplaceContract.buyToken(tokenId, amount, { value: price })
```

**Replace with:** `handleMintLicense(ipAsset)` - Mint License button
```
storyProtocolService.mintLicenseTokens(ipId, licenseTermsId, receiver)
```

**Key Decision:** What does "buy" mean?
```
OLD: Buy ownership fractions (ERC1155 tokens)
NEW: Buy permission to use (License NFT)
```

**UI Change:**
```
Button text: "Buy Now" → "Mint License"
Modal title: "Purchase Tokens" → "Mint License"
Price display: "X FLOW per token" → "Royalty: X% on commercial use"
```

---

#### **Point 3: dashboard.tsx - Asset Display**

**Current:** Display owned ERC1155 tokens
```
Fetch: tokenContract.balanceOf(user, tokenId)
Display: "You own 50 tokens"
```

**Replace with:** Display registered IPs and owned licenses
```
Fetch:
  - storyProtocolService.getUserIpAssets(user) // IPs created
  - storyProtocolService.getUserLicenses(user) // Licenses owned
Display:
  - "Your Registered IPs: 3"
  - "Your Licenses: 5"
```

---

#### **Point 4: WalletContext.tsx - Network Validation**

**Current:** Check for Flow Testnet (747)
```typescript
const REQUIRED_CHAIN_ID = 747; // Flow Testnet
```

**Replace with:** Check for Story Sepolia (11155111)
```typescript
const REQUIRED_CHAIN_ID = 11155111; // Story Sepolia
```

**Network Switch Logic:**
```typescript
if (chainId !== REQUIRED_CHAIN_ID) {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${REQUIRED_CHAIN_ID.toString(16)}` }],
    });
  } catch (error) {
    // If network not added, add it
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${REQUIRED_CHAIN_ID.toString(16)}`,
        chainName: 'Story Protocol Sepolia',
        rpcUrls: ['https://rpc-sepolia.story.foundation'],
        blockExplorerUrls: ['https://testnet.storyscan.xyz'],
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18
        }
      }],
    });
  }
}
```

---

## 9️⃣ CRITICAL INTEGRATION DECISIONS

### **Decision 1: NFT Collection Setup**

**Question:** When to create the SPG NFT collection?

**Answer:**
- ✅ **One-time setup** during platform deployment
- Create manually via setup script before any users register IP
- Store `spgNftContract` address in `storyProtocolConfig.ts`
- All IP assets will be minted in this single collection

**Why:** Story Protocol requires all IP assets to belong to an NFT collection

---

### **Decision 2: License Minting Fee**

**Question:** Should minting a license be free or paid?

**Option A: Free minting**
```typescript
defaultMintingFee: 0
```
- Users can mint licenses for free
- Revenue comes from commercial use (royalty payments)
- Good for: Creative Commons-style sharing

**Option B: Paid minting**
```typescript
defaultMintingFee: parseEther("1") // 1 WIP token
```
- Users pay upfront fee to mint license
- Additional revenue comes from commercial royalties
- Good for: Premium content

**Recommendation:** Start with **free minting (0 fee)** for MVP

---

### **Decision 3: Payment Currency**

**Question:** Which token for license payments and royalties?

**Options:**
1. **WIP Token** (Story Protocol's native token)
   - `WIP_TOKEN_ADDRESS` (provided by Story SDK)
   - Users need to get WIP from faucet or exchange

2. **USDC** (Stablecoin)
   - More familiar to users
   - Requires USDC contract address on Sepolia

3. **ETH** (Native token)
   - No extra token needed
   - Users already have ETH for gas

**Recommendation:** Use **WIP Token** for MVP (Story Protocol default)

**Later:** Add multi-currency support (USDC, ETH)

---

### **Decision 4: Similarity Thresholds**

**Question:** What similarity scores trigger what actions?

**Recommendation:**
```
Score < 60%:    Proceed as original (no match)
Score 60-84%:   Send to admin review (gray area)
Score >= 85%:   Force derivative registration (clear match)
```

**MVP (Text Only):**
```
Exact match (100%):  Force derivative
No match (0%):       Proceed as original
```

**Phase 2 (Video/Audio):**
- Use perceptual hashing (fuzzy matching)
- Enable 60-84% detection range

---

### **Decision 5: Admin Role in Story Protocol**

**Question:** Should admins be able to register IPs on behalf of users?

**Answer:**
- ❌ **No** for original IP registration (user must sign)
- ✅ **Yes** for forcing derivative links (admin override)

**Implementation:**
```
Backend has admin wallet private key
When admin clicks "Enforce Derivative Link":
1. Backend initializes Story Protocol with admin wallet
2. Backend calls registerDerivative() on behalf of user
3. Admin pays gas fees
4. Derivative link is enforced on-chain
```

---

### **Decision 6: Metadata Storage**

**Question:** Where to store IP metadata?

**Answer:**
- ✅ **IPFS** (via Pinata) - Decentralized, permanent
- ✅ **Backend Database** - Fast queries, caching
- ✅ **Story Protocol** - On-chain reference (IPFS URI)

**Flow:**
```
1. Create metadata JSON
2. Upload to Pinata IPFS → Get IPFS CID
3. Store IPFS URI in Story Protocol
4. Store metadata copy in backend database for fast queries
5. Frontend fetches from backend (faster) or IPFS (fallback)
```

---

### **Decision 7: Royalty Distribution Trigger**

**Question:** When do royalties get distributed?

**Answer:**
- Story Protocol uses **pull model** (not push)
- Revenue accumulates in IP Royalty Vault
- Creator must **manually claim** by calling `claimAllRevenue()`

**Implementation:**
```
Frontend:
- Show "Claimable Royalties" in creator dashboard
- "Claim Now" button → calls storyProtocolService.claimAllRevenue()

Backend:
- Optionally: Webhook from Story Protocol on revenue events
- Update database to show pending royalties
```

---

## 📚 APPENDIX: STORY PROTOCOL RESOURCES

### **Official Documentation**
- **Overview:** https://docs.story.foundation/
- **TypeScript SDK:** https://docs.story.foundation/developers/typescript-sdk/setup
- **SPG (NFT Collection):** https://docs.story.foundation/concepts/spg/overview
- **Register IP Asset:** https://docs.story.foundation/developers/typescript-sdk/register-ip-asset
- **Attach License Terms:** https://docs.story.foundation/developers/typescript-sdk/attach-terms
- **Mint License Token:** https://docs.story.foundation/developers/typescript-sdk/mint-license
- **Register Derivative:** https://docs.story.foundation/developers/typescript-sdk/register-derivative
- **Royalty Module:** https://docs.story.foundation/concepts/royalty-module/overview

### **SDK Reference**
- **IPAsset Client:** https://docs.story.foundation/sdk-reference/ipasset
- **License Client:** https://docs.story.foundation/sdk-reference/license
- **Royalty Client:** https://docs.story.foundation/sdk-reference/royalty
- **NFT Client:** https://docs.story.foundation/sdk-reference/nftclient

### **Testnet Information**
- **Explorer:** https://testnet.storyscan.xyz
- **RPC URL:** https://rpc-sepolia.story.foundation
- **Chain ID:** 11155111 (Sepolia)
- **Faucet:** Get testnet ETH and WIP tokens

### **Key Contract Addresses (Sepolia)**
```typescript
WIP_TOKEN_ADDRESS: "0x..." // Story Protocol payment token
LAP_ROYALTY_POLICY: "0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E"
PIL_TEMPLATE: "0x..." // PIL license template
```

---

## ✅ INTEGRATION CHECKLIST

### **Phase 1: Setup & Configuration**
- [ ] Create SPG NFT collection (one-time)
- [ ] Store `spgNftContract` address in config
- [ ] Update WalletContext for Story Sepolia network
- [ ] Add Story Protocol config file

### **Phase 2: Backend API**
- [ ] Create fingerprinting endpoint
- [ ] Create similarity check endpoint
- [ ] Set up PostgreSQL fingerprints table
- [ ] Create dispute management endpoints

### **Phase 3: Frontend Services**
- [ ] Create storyProtocolService.ts
- [ ] Create contentFingerprintService.ts
- [ ] Create disputeResolutionService.ts
- [ ] Update types (IPAsset, etc.)

### **Phase 4: Page Modifications**
- [ ] Update newIssuerDashboard.tsx (registration flow)
- [ ] Update marketplace.tsx (mint license button)
- [ ] Update dashboard.tsx (display IPs and licenses)
- [ ] Update admin.tsx (dispute resolution)

### **Phase 5: Testing**
- [ ] Test IP registration (original content)
- [ ] Test similarity detection (exact match)
- [ ] Test derivative registration
- [ ] Test license minting
- [ ] Test royalty claims
- [ ] Test admin dispute resolution

---

**END OF STORY PROTOCOL INTEGRATION GUIDE**

**This document provides the architectural foundation for integrating Story Protocol. Actual code implementation should follow these function footprints and flow diagrams.**
