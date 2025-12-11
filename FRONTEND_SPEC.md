# 🎨 FRONTEND MODIFICATION SPECIFICATION
## IP-OPS Platform - Detailed Implementation Guide

**Version:** 1.0
**Date:** December 11, 2025
**Strategy:** Reskin & Replug (Keep UI Shell, Swap Logic)

---

## 📋 OVERVIEW

This document details the exact changes needed for each frontend file to migrate from "Real Estate on Flow" to "IP-OPS on Story Protocol."

**Core Principles:**
1. **Keep the UI components** (Cards, Tables, Modals, Forms) - they're well-designed
2. **Replace labels and text** (Real Estate → IP Assets, Issuer → Creator)
3. **Remove Flow blockchain calls** (ethers.js contract interactions with Flow contracts)
4. **Add Story Protocol SDK calls** (New service layer)
5. **Add backend API calls** (Content fingerprinting and similarity detection)

---

## 🗂️ FILE MODIFICATION PLAN

### **Phase 1: Service Layer (New Files)**

These are NEW files to create:

#### **1. `src/services/storyProtocolService.ts`** ✅ NEW
**Purpose:** Wrapper for Story Protocol SDK

**Key Functions:**
```typescript
class StoryProtocolService {
  async initialize(address: string, signer: any): Promise<void>
  async registerIpAsset(ipMetadataURI: string, royaltyPercent: number): Promise<{ ipId: string; txHash: string }>
  async attachLicenseTerms(ipId: string, royaltyPercent: number, licenseType: string): Promise<{ licenseTermsId: string; txHash: string }>
  async mintLicenseToken(ipId: string, quantity: number, receiver: string): Promise<{ licenseTokenId: string; txHash: string }>
  async registerDerivativeIpAsset(childMetadataURI: string, parentIpIds: string[], licenseTokenIds: string[]): Promise<{ childIpId: string; txHash: string }>
  async queryAvailableIPs(): Promise<any[]>
}
```

**See:** Full implementation in `MIGRATION_PLAN.md` Section 3

---

#### **2. `src/services/contentFingerprintService.ts`** ✅ NEW
**Purpose:** Client for backend API (content hashing and similarity detection)

**Key Functions:**
```typescript
class ContentFingerprintService {
  async uploadAndFingerprint(file: File, title: string): Promise<FingerprintResult>
  async checkSimilarity(contentHash: string): Promise<SimilarityCheckResult>
}
```

**See:** Full implementation in `MIGRATION_PLAN.md` Section 3

---

#### **3. `src/services/disputeResolutionService.ts`** ✅ NEW
**Purpose:** Admin dispute handling (60-85% similarity cases)

**Key Functions:**
```typescript
class DisputeResolutionService {
  async fetchPendingDisputes(): Promise<Dispute[]>
  async resolveDispute(disputeId: string, resolution: string): Promise<void>
  async enforceDerivativeLink(disputeId: string, parentIpId: string): Promise<void>
}
```

---

#### **4. `src/lib/storyProtocolConfig.ts`** ✅ NEW
**Purpose:** Story Protocol configuration (like contractAddress.ts for Flow)

```typescript
export const STORY_PROTOCOL_CONFIG = {
  // Testnet
  SEPOLIA: {
    chainId: 11155111,
    name: 'Story Protocol Sepolia',
    rpcUrl: 'https://rpc-sepolia.story.foundation',
    blockExplorer: 'https://testnet.storyscan.xyz',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    contracts: {
      IP_ASSET_REGISTRY: '0x...', // Story Protocol contract addresses
      LICENSE_REGISTRY: '0x...',
      ROYALTY_MODULE: '0x...',
      PIL_LICENSE_TEMPLATE: '0x...'
    }
  },
  // Mainnet
  MAINNET: {
    chainId: 1513,
    name: 'Story Protocol Mainnet',
    rpcUrl: 'https://rpc.story.foundation',
    blockExplorer: 'https://storyscan.xyz',
    // ... similar structure
  }
} as const;

export const ACTIVE_STORY_NETWORK = 'SEPOLIA' as const;
```

---

#### **5. `src/types/ipAssetTypes.ts`** ✅ NEW
**Purpose:** TypeScript types for IP assets (replaces dashboardTypes.ts)

```typescript
export interface IPAsset {
  ipId: string;                    // Story Protocol IP ID (0x...)
  tokenId: string;                 // NFT token ID
  title: string;                   // IP title
  description: string;
  contentHash: string;             // Fingerprint hash from backend
  ipfsCid: string;                 // IPFS CID
  ipType: 'Text' | 'Video' | 'Audio' | 'Image';

  // Ownership
  creator: string;                 // Original creator address
  owner: string;                   // Current owner address

  // Licensing
  royaltyRate: number;             // Percentage (0-100)
  licenseType: 'commercial' | 'non-commercial';
  licenseTermsId: string;          // Story Protocol license terms ID
  licenseCount: number;            // Number of licenses minted

  // Derivative status
  isDerivative: boolean;
  parentIpIds?: string[];          // If derivative, parent IP IDs
  childIpIds?: string[];           // If original, child IP IDs

  // Metadata
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;

  // Status
  status: 'pending' | 'registered' | 'disputed';

  // Timestamps
  createdAt: Date;
  registeredAt?: Date;
}

export interface LicenseToken {
  licenseTokenId: string;
  ipId: string;                    // Parent IP being licensed
  licensee: string;                // License holder address
  licenseTermsId: string;
  mintedAt: Date;
}

export interface IPPortfolioData {
  totalIPs: number;                // Total IPs owned
  originalIPs: number;             // Original IPs created
  derivativeIPs: number;           // Derivatives created
  licensesOwned: number;           // Licenses purchased
  monthlyRoyalties: number;        // Royalties earned this month
  totalRoyalties: number;          // All-time royalties
}
```

---

### **Phase 2: Page Modifications**

---

## 📄 PAGE 1: newIssuerDashboard.tsx → creatorDashboard.tsx

**File:** `src/pages/Issuer/newIssuerDashboard.tsx`
**Rename to:** `src/pages/Creator/creatorDashboard.tsx` (optional, or keep same path)

### **Changes Required:**

#### **1. Update Imports**

**REMOVE:**
```typescript
// ❌ REMOVE
import { ethers } from 'ethers';
import TokenManagementService from '../../services/tokenManagementService';
import DirectMarketplaceListingService from '../../services/directMarketplaceListingService';
import RobustAuthorizationService from '../../services/robustAuthorizationService';
import { ADMIN_CONTRACT, TOKEN_CONTRACT, MARKETPLACE_CONTRACT, TOKEN_MANAGEMENT_CONTRACT, ISSUER_CONTRACT } from '../../lib/contractAddress';
```

**ADD:**
```typescript
// ✅ ADD
import { StoryProtocolService } from '../../services/storyProtocolService';
import { ContentFingerprintService } from '../../services/contentFingerprintService';
import { STORY_PROTOCOL_CONFIG, ACTIVE_STORY_NETWORK } from '../../lib/storyProtocolConfig';
import { IPAsset } from '../../types/ipAssetTypes';
```

**KEEP:**
```typescript
// ✅ KEEP (IPFS is still used)
import { uploadJSONToPinata, uploadToPinata } from '../../utils/pinata';
```

---

#### **2. Update Constants**

**CHANGE Line 25-28:**
```typescript
// OLD
const assetTypes = ['Invoice'];

// NEW
const ipTypes = ['Text', 'Video', 'Audio', 'Image'];
```

---

#### **3. Update Interface**

**CHANGE Line 30-42:**
```typescript
// OLD
interface TokenRequest {
  requestId: string;
  issuer: string;
  metadataURI: string;
  amount: string;
  price: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Deployed' | 'Listed';
  // ...
}

// NEW
interface IPRegistration {
  ipId: string;                    // Story Protocol IP ID
  creator: string;                 // Creator address
  title: string;
  description: string;
  contentHash: string;             // Content fingerprint
  ipfsCid: string;
  ipType: 'Text' | 'Video' | 'Audio' | 'Image';
  royaltyRate: number;             // Percentage (0-100)
  licenseTermsId?: string;         // If license terms attached
  status: 'pending_fingerprint' | 'pending_similarity_check' | 'dispute' | 'registered';
  createdAt: Date;
  registeredAt?: Date;
}
```

---

#### **4. Update State Variables**

**CHANGE Line 47-63:**
```typescript
// OLD
const [tokenManagementService, setTokenManagementService] = useState(null);
const [tokenRequests, setTokenRequests] = useState<TokenRequest[]>([]);

// NEW
const [storyProtocolService, setStoryProtocolService] = useState<StoryProtocolService | null>(null);
const [contentFingerprintService, setContentFingerprintService] = useState<ContentFingerprintService | null>(null);
const [ipRegistrations, setIpRegistrations] = useState<IPRegistration[]>([]);
const [showDerivativeDialog, setShowDerivativeDialog] = useState(false);
const [detectedParent, setDetectedParent] = useState<any>(null);
```

---

#### **5. Update Form State**

**CHANGE Line 67-74:**
```typescript
// OLD
const [requestForm, setRequestForm] = useState({
  title: '',
  description: '',
  assetType: '',
  amount: '',
  pricePerToken: '',
  imageFiles: [] as File[]
});

// NEW
const [registrationForm, setRegistrationForm] = useState({
  title: '',
  description: '',
  ipType: 'Text' as 'Text' | 'Video' | 'Audio' | 'Image',
  contentFile: null as File | null,
  royaltyRate: 10,  // Default 10%
  licenseType: 'commercial' as 'commercial' | 'non-commercial'
});
```

---

#### **6. Replace initializeService() Function**

**REPLACE Lines 78-148:**

```typescript
// ❌ REMOVE OLD
const initializeService = async () => {
  // ... Flow contract initialization
};

// ✅ ADD NEW
const initializeStoryProtocol = async () => {
  if (!isConnected || !address || !signer) {
    setIsAuthorizedCreator(null);
    setIsServiceInitialized(false);
    return;
  }

  setAuthCheckLoading(true);
  console.log('🔄 Initializing Story Protocol service...');

  try {
    // Initialize Story Protocol service
    const storyService = new StoryProtocolService();
    await storyService.initialize(address, signer);
    setStoryProtocolService(storyService);

    // Initialize content fingerprint service (backend API)
    const fingerprintService = new ContentFingerprintService();
    setContentFingerprintService(fingerprintService);

    // Check if user is verified creator (optional - for MVP, auto-approve)
    const isVerified = await storyService.isVerifiedCreator(address);
    setIsAuthorizedCreator(isVerified);

    setIsServiceInitialized(true);

    if (isVerified) {
      console.log('✅ User is verified creator');
      toast.success('Welcome, verified creator!');
      await loadIPRegistrations();
    } else {
      console.log('❌ User is not verified creator');
      toast.error('Your wallet is not authorized as a creator');
    }

  } catch (error) {
    console.error('❌ Failed to initialize Story Protocol:', error);
    toast.error(`Initialization failed: ${error.message}`);
    setIsAuthorizedCreator(false);
  } finally {
    setAuthCheckLoading(false);
  }
};

// Update useEffect to call new function
useEffect(() => {
  initializeStoryProtocol();
}, [isConnected, address, signer]);
```

---

#### **7. Replace loadTokenRequests() Function**

**REPLACE Lines 150-166:**

```typescript
// ❌ REMOVE OLD
const loadTokenRequests = async (service?: TokenManagementService) => {
  // ...
};

// ✅ ADD NEW
const loadIPRegistrations = async () => {
  if (!address || !contentFingerprintService) return;

  setLoadingRequests(true);
  try {
    // Fetch user's registered IPs from backend API
    const response = await fetch(`http://localhost:3001/api/assets?walletAddress=${address}`);
    const result = await response.json();

    if (result.success) {
      setIpRegistrations(result.data);
      console.log('📋 Loaded IP registrations:', result.data);
    }
  } catch (error) {
    console.error('❌ Failed to load IP registrations:', error);
    toast.error('Failed to load your IP registrations');
  } finally {
    setLoadingRequests(false);
  }
};
```

---

#### **8. Replace handleSubmitRequest() Function** (MOST IMPORTANT)

**REPLACE Lines 169-244:**

```typescript
// ❌ REMOVE OLD FLOW
const handleSubmitRequest = async () => {
  // Old: Submit to TokenManagement contract → Wait for admin approval
};

// ✅ ADD NEW FLOW
const handleRegisterIP = async () => {
  if (!storyProtocolService || !contentFingerprintService || !registrationForm.title || !registrationForm.contentFile) {
    toast.error('Please fill in all required fields');
    return;
  }

  setIsSubmitting(true);

  try {
    // STEP 1: Upload content to backend for fingerprinting
    console.log('🔄 Step 1: Fingerprinting content...');
    const fingerprintResult = await contentFingerprintService.uploadAndFingerprint(
      registrationForm.contentFile,
      registrationForm.title
    );

    console.log('✅ Content fingerprinted:', fingerprintResult);

    // STEP 2: Check similarity against existing IPs
    console.log('🔄 Step 2: Checking similarity...');
    const similarityCheck = await contentFingerprintService.checkSimilarity(
      fingerprintResult.contentHash
    );

    console.log('🔍 Similarity check result:', similarityCheck);

    // STEP 3: Handle branching logic based on similarity score
    if (similarityCheck.isMatch) {
      // RED ALERT: Clear derivative detected (score >= 85%)
      console.warn('🚨 Derivative detected! Score:', similarityCheck.score);
      setDetectedParent(similarityCheck.parentMetadata);
      setShowDerivativeDialog(true);

      // Store fingerprint data for later use
      sessionStorage.setItem('pendingRegistration', JSON.stringify({
        fingerprintResult,
        similarityCheck,
        formData: registrationForm
      }));

      setIsSubmitting(false);
      return; // Stop here, show dialog for user to decide
    }

    if (similarityCheck.isPotentialMatch) {
      // YELLOW ALERT: Potential match (60-84%) - send to admin review
      console.warn('⚠️ Potential match detected! Score:', similarityCheck.score);

      // Create dispute in backend
      await fetch('http://localhost:3001/api/disputes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submittedBy: address,
          contentHash: fingerprintResult.contentHash,
          contentTitle: registrationForm.title,
          ipfsCid: fingerprintResult.ipfsCid,
          parentIpId: similarityCheck.parentIpId,
          parentContentHash: similarityCheck.parentMetadata?.contentHash,
          similarityScore: similarityCheck.score
        })
      });

      toast.info('⏳ Similarity detected! Sent for admin review.');
      setIsSubmitting(false);
      return;
    }

    // STEP 4: No match - proceed as original IP
    console.log('✅ No match found - registering as original IP');

    // Create metadata for Story Protocol
    const metadata = {
      name: registrationForm.title,
      description: registrationForm.description,
      ipType: registrationForm.ipType,
      contentHash: fingerprintResult.contentHash,
      ipfsCid: fingerprintResult.ipfsCid,
      attributes: [
        { trait_type: 'IP Type', value: registrationForm.ipType },
        { trait_type: 'Content Hash', value: fingerprintResult.contentHash },
        { trait_type: 'Royalty Rate', value: `${registrationForm.royaltyRate}%` },
        { trait_type: 'License Type', value: registrationForm.licenseType }
      ]
    };

    // Upload metadata to IPFS
    const metadataHash = await uploadJSONToPinata(metadata);
    const metadataURI = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;

    console.log('✅ Metadata uploaded to IPFS:', metadataURI);

    // STEP 5: Register IP on Story Protocol
    console.log('🔄 Step 5: Registering IP on Story Protocol...');
    const ipAssetResult = await storyProtocolService.registerIpAsset(
      metadataURI,
      registrationForm.royaltyRate
    );

    console.log('✅ IP registered on Story Protocol:', ipAssetResult.ipId);

    // STEP 6: Attach license terms
    console.log('🔄 Step 6: Attaching license terms...');
    await storyProtocolService.attachLicenseTerms(
      ipAssetResult.ipId,
      registrationForm.royaltyRate,
      registrationForm.licenseType
    );

    console.log('✅ License terms attached!');

    // STEP 7: Update backend with Story Protocol IP ID
    await fetch(`http://localhost:3001/api/assets/${fingerprintResult.contentHash}/update-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyIpId: ipAssetResult.ipId,
        status: 'registered'
      })
    });

    toast.success(`🎉 IP registered successfully! IP ID: ${ipAssetResult.ipId.slice(0, 10)}...`);

    // Reset form
    setRegistrationForm({
      title: '',
      description: '',
      ipType: 'Text',
      contentFile: null,
      royaltyRate: 10,
      licenseType: 'commercial'
    });

    // Reload registrations
    await loadIPRegistrations();

  } catch (error) {
    console.error('❌ Failed to register IP:', error);
    toast.error(`Failed to register IP: ${error.message}`);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

#### **9. Add handleDerivativeLinking() Function** (NEW)

**ADD NEW FUNCTION:**

```typescript
// ✅ NEW - Handle derivative linking when user confirms
const handleDerivativeLinking = async () => {
  if (!storyProtocolService) return;

  setIsSubmitting(true);

  try {
    // Retrieve pending registration data
    const pendingData = JSON.parse(sessionStorage.getItem('pendingRegistration') || '{}');
    const { fingerprintResult, similarityCheck, formData } = pendingData;

    console.log('🔄 Step 1: Minting license from parent IP...');

    // STEP 1: Mint license token from parent IP
    const licenseResult = await storyProtocolService.mintLicenseToken(
      similarityCheck.parentIpId,
      1, // quantity
      address // receiver (current user)
    );

    console.log('✅ License minted:', licenseResult.licenseTokenId);

    // STEP 2: Create derivative metadata
    const derivativeMetadata = {
      name: formData.title,
      description: formData.description,
      ipType: formData.ipType,
      contentHash: fingerprintResult.contentHash,
      ipfsCid: fingerprintResult.ipfsCid,
      parentIpId: similarityCheck.parentIpId,
      isDerivative: true,
      attributes: [
        { trait_type: 'IP Type', value: formData.ipType },
        { trait_type: 'Content Hash', value: fingerprintResult.contentHash },
        { trait_type: 'Derivative Status', value: 'Derivative' },
        { trait_type: 'Parent IP ID', value: similarityCheck.parentIpId },
        { trait_type: 'Royalty Rate', value: `${formData.royaltyRate}%` }
      ]
    };

    const metadataHash = await uploadJSONToPinata(derivativeMetadata);
    const metadataURI = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;

    // STEP 3: Register as derivative IP
    console.log('🔄 Step 3: Registering derivative IP...');
    const derivativeResult = await storyProtocolService.registerDerivativeIpAsset(
      metadataURI,
      [similarityCheck.parentIpId],
      [licenseResult.licenseTokenId]
    );

    console.log('✅ Derivative IP registered:', derivativeResult.childIpId);

    // STEP 4: Update backend
    await fetch(`http://localhost:3001/api/assets/${fingerprintResult.contentHash}/update-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyIpId: derivativeResult.childIpId,
        status: 'registered'
      })
    });

    toast.success(`🎉 Derivative IP registered! IP ID: ${derivativeResult.childIpId.slice(0, 10)}...`);

    // Clear pending data
    sessionStorage.removeItem('pendingRegistration');
    setShowDerivativeDialog(false);
    setDetectedParent(null);

    // Reset form and reload
    setRegistrationForm({
      title: '',
      description: '',
      ipType: 'Text',
      contentFile: null,
      royaltyRate: 10,
      licenseType: 'commercial'
    });

    await loadIPRegistrations();

  } catch (error) {
    console.error('❌ Failed to register derivative:', error);
    toast.error(`Failed to register derivative: ${error.message}`);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

#### **10. Remove handleDeployToken() and handleListOnMarketplace()**

**DELETE Lines 247-281:**

```typescript
// ❌ REMOVE - No "deploy" or "list" steps in Story Protocol
// Story Protocol mints the IP NFT immediately during registration
// License terms are attached in the same flow
```

---

#### **11. Update JSX Labels**

**CHANGE Multiple Lines (361-686):**

```typescript
// Line 361: Page title
// OLD: "Issuer Dashboard"
// NEW: "Creator Dashboard"

// Line 362: Subtitle
// OLD: "Manage your token requests and deployments"
// NEW: "Register and manage your IP assets"

// Line 367: Badge
// OLD: "Authorized Issuer"
// NEW: "Verified Creator"

// Line 375: Tab
// OLD: "Token Requests"
// NEW: "IP Registrations"

// Line 376: Tab
// OLD: "Portfolio"
// NEW: "My IP Assets"

// Line 377: Tab
// OLD: "Create Request"
// NEW: "Register IP"

// Line 426: Empty state
// OLD: "Create your first token request to get started"
// NEW: "Register your first IP asset to get started"

// Line 567: Card title
// OLD: "Create Token Request"
// NEW: "Register IP Asset"

// Line 568: Card description
// OLD: "Submit a new token for admin approval"
// NEW: "Submit new IP for protection and licensing"

// Line 574: Form label
// OLD: "Token Title *"
// NEW: "IP Asset Title *"

// Line 584: Form label
// OLD: "Asset Type *"
// NEW: "IP Type *"

// Line 598: Form label
// OLD: "Token Amount *"
// NEW: "License Supply *" (or remove this field - not needed for MVP)

// Line 609: Form label
// OLD: "Price per Token (Flow) *"
// NEW: "Royalty Percentage (%) *"

// Line 634: Form label
// OLD: "Token Image"
// NEW: "Content File"

// Line 674: Button text
// OLD: "Submit Request"
// NEW: "Register IP"
```

---

#### **12. Add Derivative Detection Dialog** (NEW JSX)

**ADD AFTER Line 682 (before closing </div>):**

```tsx
{/* Derivative Detection Dialog */}
<Dialog open={showDerivativeDialog} onOpenChange={setShowDerivativeDialog}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle className="text-red-600 flex items-center gap-2">
        <AlertTriangle className="w-6 h-6" />
        Derivative Content Detected!
      </DialogTitle>
      <DialogDescription>
        Your content appears to be highly similar to an existing IP asset.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {detectedParent && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-2">Original IP Asset:</h4>
            <p className="text-sm"><strong>Title:</strong> {detectedParent.name}</p>
            <p className="text-sm"><strong>Creator:</strong> {detectedParent.creator?.slice(0, 10)}...</p>
            <p className="text-sm"><strong>IP ID:</strong> {detectedParent.ipId?.slice(0, 20)}...</p>
            <p className="text-sm mt-2 text-red-600">
              <strong>Similarity Score:</strong> High (likely derivative)
            </p>
          </CardContent>
        </Card>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">What does this mean?</h4>
        <p className="text-sm text-yellow-700">
          Your content must be registered as a <strong>derivative work</strong> and linked to the original IP.
          This ensures proper royalty sharing with the original creator.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleDerivativeLinking}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Linking...
            </>
          ) : (
            'Link as Derivative & Register'
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setShowDerivativeDialog(false);
            setDetectedParent(null);
            sessionStorage.removeItem('pendingRegistration');
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

### **Summary of newIssuerDashboard.tsx Changes:**
- ✅ Renamed variables and labels (Issuer → Creator, Token → IP)
- ✅ Removed Flow contract services
- ✅ Added Story Protocol service integration
- ✅ Added content fingerprinting flow
- ✅ Added similarity detection logic (branching: original vs derivative)
- ✅ Added derivative linking flow
- ✅ Updated form fields (assetType → ipType, price → royaltyRate)
- ✅ Removed "deploy" and "list" steps (Story Protocol does this automatically)

---

## 📄 PAGE 2: dashboard.tsx (User Home/Portfolio)

**File:** `src/pages/dashboard/dashboard.tsx`

### **Key Changes:**

#### **1. Update Imports**

**REMOVE:**
```typescript
import { MARKETPLACE_ABI } from '../../utils/marketplaceABI';
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT } from '../../lib/contractAddress';
```

**ADD:**
```typescript
import { StoryProtocolService } from '../../services/storyProtocolService';
import { IPAsset, IPPortfolioData } from '../../types/ipAssetTypes';
```

---

#### **2. Update State Variables**

**CHANGE:**
```typescript
// OLD
const [userAssets, setUserAssets] = useState<UserAsset[]>([]);
const [portfolioData, setPortfolioData] = useState<PortfolioData>({...});

// NEW
const [ipAssets, setIpAssets] = useState<IPAsset[]>([]);
const [portfolioData, setPortfolioData] = useState<IPPortfolioData>({
  totalIPs: 0,
  originalIPs: 0,
  derivativeIPs: 0,
  licensesOwned: 0,
  monthlyRoyalties: 0,
  totalRoyalties: 0
});
```

---

#### **3. Update Fetch Logic**

**REPLACE asset fetching function:**

```typescript
// OLD - Fetch from Flow marketplace contract
const fetchUserAssets = async () => {
  // ... Flow contract queries
};

// NEW - Fetch from backend API + Story Protocol
const fetchUserIPAssets = async () => {
  if (!address) return;

  try {
    // Fetch from backend API (faster than blockchain queries)
    const response = await fetch(`http://localhost:3001/api/assets?walletAddress=${address}&status=registered`);
    const result = await response.json();

    if (result.success) {
      setIpAssets(result.data);

      // Calculate portfolio metrics
      const originalIPs = result.data.filter((ip: IPAsset) => !ip.isDerivative);
      const derivativeIPs = result.data.filter((ip: IPAsset) => ip.isDerivative);

      setPortfolioData({
        totalIPs: result.data.length,
        originalIPs: originalIPs.length,
        derivativeIPs: derivativeIPs.length,
        licensesOwned: 0, // TODO: Query Story Protocol for owned license tokens
        monthlyRoyalties: 0, // TODO: Query royalty earnings from Story Protocol
        totalRoyalties: 0
      });
    }
  } catch (error) {
    console.error('Failed to fetch IP assets:', error);
    toast.error('Failed to load your IP assets');
  }
};
```

---

#### **4. Update JSX Labels**

**CHANGE:**
- Sidebar: "Owned Assets" → "My IP Assets"
- Sidebar: "My Income" → "Royalty Income"
- Portfolio card: "Total Investment" → "Total IPs"
- Portfolio card: "Monthly Income" → "Monthly Royalties"
- Table header: "Property Name" → "IP Title"
- Table header: "Location" → "Content Hash"
- Table header: "Value" → "License Value"

---

### **Summary of dashboard.tsx Changes:**
- ✅ Updated data types (UserAsset → IPAsset)
- ✅ Changed fetch logic (Flow contracts → Backend API)
- ✅ Updated portfolio metrics (income → royalties)
- ✅ Updated UI labels

---

## 📄 PAGE 3: marketplace.tsx (Listing/Browse Page)

**File:** `src/pages/marketplace/marketplace.tsx`

### **Key Changes:**

#### **1. Update Imports**

**REMOVE:**
```typescript
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT } from '../../lib/contractAddress';
import { MARKETPLACE_ABI } from '../../utils/marketplaceABI';
```

**ADD:**
```typescript
import { StoryProtocolService } from '../../services/storyProtocolService';
import { IPAsset } from '../../types/ipAssetTypes';
```

---

#### **2. Update State Variables**

**CHANGE:**
```typescript
// OLD
const [listings, setListings] = useState<MarketplaceListing[]>([]);
const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);

// NEW
const [availableIPs, setAvailableIPs] = useState<IPAsset[]>([]);
const [storyProtocolService, setStoryProtocolService] = useState<StoryProtocolService | null>(null);
```

---

#### **3. Replace initializeContract()**

**REPLACE:**
```typescript
// OLD - Flow contract initialization
const initializeContract = async () => {
  const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);
  setMarketplaceContract(marketplaceContract);
};

// NEW - Story Protocol initialization
const initializeServices = async () => {
  const storyService = new StoryProtocolService();
  await storyService.initialize(address, signer);
  setStoryProtocolService(storyService);
};
```

---

#### **4. Replace loadMarketplaceListings()**

**REPLACE:**
```typescript
// OLD - Fetch from Flow marketplace contract
const loadMarketplaceListings = async () => {
  const listingIds = await marketplaceContract.getAllListings();
  // ...
};

// NEW - Fetch IPs with license terms attached
const loadAvailableIPs = async () => {
  try {
    // Fetch from backend API (shows all registered IPs with license terms)
    const response = await fetch('http://localhost:3001/api/assets?status=registered&hasLicenseTerms=true');
    const result = await response.json();

    if (result.success) {
      setAvailableIPs(result.data);
    }
  } catch (error) {
    console.error('Failed to load available IPs:', error);
    toast.error('Failed to load marketplace');
  }
};
```

---

#### **5. Replace Buy Button Handler** (MOST CRITICAL)

**REPLACE:**
```typescript
// OLD - Buy tokens from Flow marketplace
const handlePurchase = async (listing: MarketplaceListing) => {
  const tx = await marketplaceContract.buyToken(
    listing.tokenId,
    listing.amount,
    { value: listing.price }
  );
  await tx.wait();
  toast.success('Purchase successful!');
};

// NEW - Mint license from Story Protocol
const handleMintLicense = async (ipAsset: IPAsset) => {
  if (!storyProtocolService) {
    toast.error('Story Protocol not initialized');
    return;
  }

  try {
    console.log('🔄 Minting license from IP:', ipAsset.ipId);

    // Mint license token (payment happens via Story Protocol's license module)
    const result = await storyProtocolService.mintLicenseToken(
      ipAsset.ipId,
      1, // quantity
      address // recipient (current user)
    );

    toast.success(`✅ License minted! Token ID: ${result.licenseTokenId}`);

    // TODO: Show license details in user's dashboard

  } catch (error) {
    console.error('Failed to mint license:', error);
    toast.error(`Failed to mint license: ${error.message}`);
  }
};
```

---

#### **6. Update JSX Button**

**CHANGE Line ~2050:**
```tsx
{/* OLD */}
<Button onClick={() => handlePurchase(listing)}>
  Buy Now
</Button>

{/* NEW */}
<Button onClick={() => handleMintLicense(ipAsset)}>
  Mint License
</Button>
```

---

#### **7. Update Category Filters**

**CHANGE Lines 1445-1479:**
```typescript
// OLD - Filter by Real Estate, Invoice, Commodity, etc.
const realEstateListings = listings.filter(l => l.type === 'Real Estate');

// NEW - Filter by IP Type and Derivative Status
const originalIPs = availableIPs.filter(ip => !ip.isDerivative);
const derivativeIPs = availableIPs.filter(ip => ip.isDerivative);
const textIPs = availableIPs.filter(ip => ip.ipType === 'Text');
const videoIPs = availableIPs.filter(ip => ip.ipType === 'Video');
```

---

### **Summary of marketplace.tsx Changes:**
- ✅ Removed Flow marketplace contract
- ✅ Added Story Protocol service
- ✅ Changed "Buy" to "Mint License"
- ✅ Updated fetch logic (blockchain → backend API)
- ✅ Updated category filters (Real Estate → IP Types)

---

## 📄 PAGE 4: admin.tsx (Governance/Judge Panel)

**File:** `src/pages/admin/admin.tsx`

### **Key Changes:**

#### **1. Update Imports**

**ADD:**
```typescript
import { DisputeResolutionService } from '../../services/disputeResolutionService';
```

---

#### **2. Update State Variables**

**CHANGE:**
```typescript
// OLD
const [issuers, setIssuers] = useState<User[]>([]);
const [managers, setManagers] = useState<User[]>([]);

// NEW
const [creators, setCreators] = useState<User[]>([]);
const [judges, setJudges] = useState<User[]>([]);
const [disputeQueue, setDisputeQueue] = useState<Dispute[]>([]); // NEW
```

---

#### **3. Add Dispute Queue Tab** (NEW JSX)

**ADD NEW TAB:**
```tsx
<TabsList>
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="creators">Creators</TabsTrigger>
  <TabsTrigger value="judges">Judges</TabsTrigger>
  <TabsTrigger value="disputes">Disputes ({disputeQueue.length})</TabsTrigger> {/* NEW */}
  <TabsTrigger value="settlements">Settlements</TabsTrigger>
</TabsList>

{/* NEW Disputes Tab */}
<TabsContent value="disputes" className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>Pending Similarity Disputes</CardTitle>
      <CardDescription>
        Review content with 60-85% similarity scores
      </CardDescription>
    </CardHeader>
    <CardContent>
      {disputeQueue.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-600">No pending disputes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputeQueue.map((dispute) => (
            <Card key={dispute.disputeId} className="border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h4 className="font-semibold">{dispute.contentTitle}</h4>
                    <p className="text-sm text-gray-600">
                      Submitted by: {dispute.submittedBy.slice(0, 10)}...
                    </p>
                    <p className="text-sm text-gray-600">
                      Similarity Score: <strong className="text-yellow-600">{dispute.similarityScore}%</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                      Potential Parent: {dispute.parentIpId?.slice(0, 20)}...
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApproveAsOriginal(dispute.disputeId)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve as Original
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleEnforceDerivativeLink(dispute.disputeId, dispute.parentIpId)}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Enforce Derivative Link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>
```

---

#### **4. Add Dispute Resolution Functions** (NEW)

**ADD NEW FUNCTIONS:**
```typescript
const handleApproveAsOriginal = async (disputeId: string) => {
  if (!disputeService) return;

  try {
    await disputeService.resolveDispute(disputeId, 'approved_as_original');
    toast.success('Approved as original IP');

    // Reload disputes
    const updatedDisputes = disputeQueue.filter(d => d.disputeId !== disputeId);
    setDisputeQueue(updatedDisputes);
  } catch (error) {
    console.error('Failed to approve dispute:', error);
    toast.error('Failed to approve dispute');
  }
};

const handleEnforceDerivativeLink = async (disputeId: string, parentIpId: string) => {
  if (!disputeService) return;

  try {
    await disputeService.enforceDerivativeLink(disputeId, parentIpId);
    toast.success('Derivative link enforced');

    // Reload disputes
    const updatedDisputes = disputeQueue.filter(d => d.disputeId !== disputeId);
    setDisputeQueue(updatedDisputes);
  } catch (error) {
    console.error('Failed to enforce link:', error);
    toast.error('Failed to enforce derivative link');
  }
};
```

---

### **Summary of admin.tsx Changes:**
- ✅ Renamed roles (Issuer → Creator, Manager → Judge)
- ✅ Added dispute queue state and tab
- ✅ Added dispute resolution actions
- ✅ Updated system metrics

---

## 🚀 IMPLEMENTATION CHECKLIST

### **Phase 1: Service Layer**
- [ ] Create `src/services/storyProtocolService.ts`
- [ ] Create `src/services/contentFingerprintService.ts`
- [ ] Create `src/services/disputeResolutionService.ts`
- [ ] Create `src/lib/storyProtocolConfig.ts`
- [ ] Create `src/types/ipAssetTypes.ts`

### **Phase 2: Page Migrations**
- [ ] Modify `newIssuerDashboard.tsx`:
  - [ ] Update imports
  - [ ] Update state variables
  - [ ] Replace initializeService()
  - [ ] Replace handleSubmitRequest()
  - [ ] Add handleDerivativeLinking()
  - [ ] Update JSX labels
  - [ ] Add derivative dialog
- [ ] Modify `dashboard.tsx`:
  - [ ] Update imports
  - [ ] Update state types
  - [ ] Replace fetch logic
  - [ ] Update JSX labels
- [ ] Modify `marketplace.tsx`:
  - [ ] Update imports
  - [ ] Replace initializeContract()
  - [ ] Replace handlePurchase() with handleMintLicense()
  - [ ] Update category filters
  - [ ] Update button labels
- [ ] Modify `admin.tsx`:
  - [ ] Add dispute service
  - [ ] Add dispute queue tab
  - [ ] Add resolution functions
  - [ ] Update role labels

### **Phase 3: Testing**
- [ ] Test IP registration (text file)
- [ ] Test similarity detection (exact match)
- [ ] Test derivative linking
- [ ] Test license minting
- [ ] Test admin dispute resolution
- [ ] Test portfolio display

---

**End of Frontend Specification. Ready for implementation after backend is complete.**
