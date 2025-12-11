# Story Protocol Migration - State Diagram
## Minimal-Change Integration Strategy

> **Migration Philosophy**: Preserve existing workflows, swap blockchain layer, add IP detection & derivative linking capabilities.

---

## 🎯 Migration Overview

### Core Strategy
- ✅ **Keep**: Authentication, UI components, wallet integration, caching
- 🔄 **Replace**: Smart contract calls (Flow → Story Protocol SDK)
- ➕ **Add**: Fingerprinting, similarity detection, derivative workflows
- 🔧 **Adapt**: Marketplace (token ownership → license minting)

### What Changes Minimally
1. **Frontend Components** → Only swap service layer calls
2. **User Flows** → Same UX, different blockchain operations
3. **Database** → Add fingerprint tables, keep user/auth tables
4. **Backend APIs** → Add detection endpoints, keep auth APIs

---

## 🗺️ Migration State Diagram

```mermaid
stateDiagram-v2
    [*] --> AppInitialization
    
    note right of AppInitialization
        ✅ UNCHANGED
        📁 src/main.tsx
        📁 src/App.tsx
        📁 src/context/WalletContext.tsx
        🔧 Same React initialization
    end note
    
    AppInitialization --> NetworkCheck
    
    note right of NetworkCheck
        🔄 MODIFIED (Minimal)
        📁 src/components/NetworkSwitcher.tsx
        📁 src/lib/storyProtocolConfig.ts (NEW)
        🔧 OLD: Check for Flow EVM (Chain ID 747)
        🔧 NEW: Check for Story Sepolia (Chain ID 11155111)
        ⚡ Change: Update NETWORK_CONFIG constant
    end note
    
    NetworkCheck --> CheckAuthentication: Correct network
    NetworkCheck --> NetworkSwitch: Wrong network
    
    state NetworkSwitch {
        [*] --> RequestSwitch
        
        note right of RequestSwitch
            🔄 MODIFIED (Minimal)
            📁 src/context/WalletContext.tsx
            🔧 OLD: Switch to Flow Testnet
            🔧 NEW: Switch to Story Sepolia
            ⚡ Change: Update chain params in switchToRequiredNetwork()
        end note
    }
    
    NetworkSwitch --> CheckAuthentication
    
    note right of CheckAuthentication
        ✅ UNCHANGED
        📁 src/context/AuthContext.tsx
        📁 src/api/authApi.ts
        🔧 JWT auth remains identical
        🔧 MongoDB user management unchanged
    end note
    
    CheckAuthentication --> Unauthenticated: No token
    CheckAuthentication --> Authenticated: Valid token
    
    state Unauthenticated {
        [*] --> PublicPages
        
        note right of PublicPages
            ✅ UNCHANGED
            📁 src/pages/Index.tsx
            📁 All hero/marketing components
            🔧 Landing page identical
        end note
        
        PublicPages --> LoginPage
        
        state LoginPage {
            [*] --> AuthFlow
            
            note right of AuthFlow
                ✅ UNCHANGED
                📁 src/pages/login/login.tsx
                📁 src/api/authApi.ts
                🔧 Email/password login identical
                🔧 Wallet connection same process
                🔧 Backend auth APIs unchanged
            end note
        }
    }
    
    state Authenticated {
        [*] --> RoleCheck
        
        note right of RoleCheck
            ✅ UNCHANGED
            📁 src/components/ProtectedRoute.tsx
            📁 src/context/AuthContext.tsx
            🔧 Role-based routing identical
        end note
        
        RoleCheck --> UserDashboard: user
        RoleCheck --> AdminDashboard: admin
        RoleCheck --> IssuerDashboard: issuer
        RoleCheck --> ManagerDashboard: manager
        
        state IssuerDashboard {
            [*] --> LoadIssuerPanel
            
            note right of LoadIssuerPanel
                🔄 MODIFIED (Service Layer Only)
                📁 src/pages/Issuer/newIssuerDashboard.tsx
                ✅ Keep: UI components, form structure
                🔧 OLD: Import TokenManagementService
                🔧 NEW: Import StoryProtocolService
            end note
            
            LoadIssuerPanel --> CreateAsset
            
            state CreateAsset {
                [*] --> CollectMetadata
                
                note right of CollectMetadata
                    ✅ UNCHANGED
                    📁 src/pages/Issuer/newIssuerDashboard.tsx
                    🔧 Same form: title, description, images
                    🔧 Same IPFS upload via Pinata
                end note
                
                CollectMetadata --> UploadToIPFS
                
                note right of UploadToIPFS
                    ✅ UNCHANGED
                    📁 src/utils/pinata.ts
                    🔧 Pinata upload logic identical
                    🔧 Returns ipfsCid (same as before)
                end note
                
                UploadToIPFS --> ContentFingerprint
                
                note right of ContentFingerprint
                    ➕ NEW STEP (Added)
                    📁 src/services/contentFingerprintService.ts (NEW)
                    🔧 Upload file to backend
                    🔧 Backend generates SHA256/pHash
                    🔧 Store in PostgreSQL fingerprints table
                    ⚡ API: POST /api/fingerprint
                end note
                
                ContentFingerprint --> SimilarityCheck
                
                note right of SimilarityCheck
                    ➕ NEW STEP (Added)
                    📁 src/services/contentFingerprintService.ts
                    🔧 Query backend for similar content
                    🔧 Returns: score, isMatch, parentIpId
                    ⚡ API: POST /api/check-similarity
                end note
                
                SimilarityCheck --> OriginalContent: score < 60%
                SimilarityCheck --> AdminReview: 60% ≤ score < 85%
                SimilarityCheck --> DerivativeForced: score ≥ 85%
                
                state OriginalContent {
                    [*] --> RegisterIPAsset
                    
                    note right of RegisterIPAsset
                        🔄 REPLACED (Different Service)
                        📁 src/pages/Issuer/newIssuerDashboard.tsx
                        ❌ OLD: tokenManagementService.submitTokenRequest()
                        ✅ NEW: storyProtocolService.registerIpAsset()
                        
                        OLD CALL:
                        const { requestId } = await tokenManagementService
                          .submitTokenRequest(metadataURI, amount, price)
                        
                        NEW CALL:
                        const { ipId } = await storyProtocolService
                          .registerIpAsset({
                            nft: { type: "mint", spgNftContract },
                            ipMetadata: { ipMetadataURI, ipMetadataHash }
                          })
                        
                        ⚡ Change: One function call replacement
                        ⚡ Returns: ipId instead of requestId
                    end note
                    
                    RegisterIPAsset --> AttachLicense
                    
                    note right of AttachLicense
                        ➕ NEW STEP (Replaces listing)
                        📁 src/pages/Issuer/newIssuerDashboard.tsx
                        
                        OLD: marketplace.listAsset(tokenId, amount)
                        NEW: Two-step license attachment
                        
                        Step 1: Register license terms
                        const { licenseTermsId } = await storyProtocolService
                          .registerCommercialRemixPIL({
                            commercialRevShare: 10,
                            currency: SUSD_ADDRESS,
                            royaltyPolicyAddress: LAP_ROYALTY_POLICY
                          })
                        
                        Step 2: Attach to IP
                        await storyProtocolService.attachLicenseTerms({
                          ipId,
                          licenseTermsId,
                          licenseTemplate: PIL_TEMPLATE_ADDRESS
                        })
                    end note
                    
                    AttachLicense --> UpdateBackend
                    
                    note right of UpdateBackend
                        ➕ NEW STEP
                        📁 src/services/contentFingerprintService.ts
                        🔧 Store ipId in fingerprints table
                        ⚡ API: PATCH /api/assets/:hash
                        🔧 Link hash → Story ipId
                    end note
                    
                    UpdateBackend --> IPRegistered
                }
                
                state AdminReview {
                    [*] --> CreateDispute
                    
                    note right of CreateDispute
                        ➕ NEW WORKFLOW
                        📁 src/services/disputeResolutionService.ts (NEW)
                        🔧 Create dispute record
                        🔧 Admin notification
                        ⚡ API: POST /api/disputes/create
                    end note
                    
                    CreateDispute --> WaitingAdmin
                    
                    note right of WaitingAdmin
                        ➕ NEW STATE
                        🔧 Similar to old "Pending Approval"
                        🔧 Different purpose: similarity dispute
                    end note
                    
                    WaitingAdmin --> AdminApproveOriginal: Admin approves original
                    WaitingAdmin --> AdminEnforceDerivative: Admin enforces derivative
                    
                    AdminApproveOriginal --> OriginalContent
                    AdminEnforceDerivative --> DerivativeForced
                }
                
                state DerivativeForced {
                    [*] --> ShowDerivativeDialog
                    
                    note right of ShowDerivativeDialog
                        ➕ NEW UI COMPONENT
                        📁 src/pages/Issuer/newIssuerDashboard.tsx
                        🔧 Red alert dialog
                        🔧 Show parent IP details
                        🔧 Force acknowledgment
                        🔧 User must accept derivative terms
                    end note
                    
                    ShowDerivativeDialog --> RegisterDerivativeIP
                    
                    note right of RegisterDerivativeIP
                        ➕ NEW WORKFLOW
                        Step 1: Register child IP
                        const { ipId: childIpId } = 
                          await storyProtocolService.registerIpAsset(...)
                        
                        Step 2: Link to parent
                        await storyProtocolService.registerDerivative({
                          childIpId,
                          parentIpIds: [parentIpId],
                          licenseTermsIds: [parentLicenseTermsId],
                          licenseTemplate: PIL_TEMPLATE_ADDRESS
                        })
                        
                        🔧 Automatic royalty routing setup
                        🔧 Parent gets % of child revenue
                    end note
                    
                    RegisterDerivativeIP --> IPRegistered
                }
            }
            
            IPRegistered --> LoadIssuerPanel: Refresh
        }
        
        state UserDashboard {
            [*] --> LoadPortfolio
            
            note right of LoadPortfolio
                🔄 MODIFIED (Data Source Changed)
                📁 src/pages/dashboard/dashboard.tsx
                ✅ Keep: UI components, layout
                
                OLD: Query Flow contracts
                - TOKEN_CONTRACT.balanceOf(address, tokenId)
                - Multiple ERC1155 token balances
                
                NEW: Query Story + Backend
                - Backend API: GET /api/assets?owner=address
                - Returns: ipIds, license counts, derivatives
                - storyProtocolService.getUserLicenses(address)
                
                ⚡ Change: Replace contract query with API call
                🔧 Display logic remains same
            end note
            
            LoadPortfolio --> PortfolioView
            
            state PortfolioView {
                [*] --> DisplayAssets
                
                note right of DisplayAssets
                    🔄 MODIFIED (Minimal UI Changes)
                    📁 src/pages/dashboard/dashboard.tsx
                    📁 src/components/AssetCard.tsx
                    
                    OLD: Show "You own X tokens"
                    NEW: Show "You own X licenses" + "Original IP"
                    
                    ⚡ Change: Update label text
                    ✅ Keep: Card components, styling
                end note
                
                DisplayAssets --> Marketplace: Browse
                DisplayAssets --> ViewDerivativeGraph: See derivatives
                
                state ViewDerivativeGraph {
                    [*] --> ShowGraph
                    
                    note right of ShowGraph
                        ➕ NEW FEATURE
                        📁 src/components/DerivativeGraph.tsx (NEW)
                        🔧 Visualize parent-child IP relationships
                        🔧 Show royalty flow direction
                        ⚡ API: GET /api/assets/:ipId/derivatives
                    end note
                }
            }
            
            state Marketplace {
                [*] --> LoadListings
                
                note right of LoadListings
                    🔄 MODIFIED (Data Model Changed)
                    📁 src/pages/marketplace/marketplace.tsx
                    
                    OLD: marketplace.getAllListings()
                    - Returns: tokenId, price, amount, seller
                    
                    NEW: Backend API + Story queries
                    - API: GET /api/marketplace/listings
                    - Returns: ipId, licenseTermsId, mintingFee, royaltyRate
                    - Metadata from ipMetadataURI
                    
                    ⚡ Change: Swap contract call with API
                    ✅ Keep: Display grid, filters, search
                end note
                
                LoadListings --> DisplayListings
                
                note right of DisplayListings
                    🔄 MODIFIED (Button Text Changed)
                    📁 src/pages/marketplace/marketplace.tsx
                    📁 src/components/AssetCard.tsx
                    
                    OLD: "Buy Now" button
                    NEW: "Mint License" button
                    
                    ⚡ Change: Button label + handler
                    ✅ Keep: Card layout, images, metadata
                end note
                
                DisplayListings --> AssetSelection
                
                state AssetSelection {
                    [*] --> OpenLicenseModal
                    
                    note right of OpenLicenseModal
                        🔄 MODIFIED (Logic Changed)
                        📁 src/components/BuyModal.tsx → LicenseModal.tsx
                        
                        OLD: Calculate total = price × quantity + fee
                        NEW: Show license terms + minting fee
                        
                        Display:
                        - Commercial use: Yes/No
                        - Derivatives allowed: Yes/No
                        - Royalty rate: X%
                        - Minting fee: Y SUSD
                        
                        ⚡ Change: Update calculation logic
                        ✅ Keep: Modal structure, UI components
                    end note
                    
                    OpenLicenseModal --> ConfirmLicense
                    
                    state ConfirmLicense {
                        [*] --> CheckAllowance
                        
                        note right of CheckAllowance
                            🔄 MODIFIED (Different Token)
                            
                            OLD: Check ETH balance
                            NEW: Check SUSD allowance for Story contracts
                            
                            const allowance = await SUSDContract
                              .allowance(userAddress, LICENSING_MODULE)
                            
                            ⚡ Change: ERC20 approval instead of native token
                        end note
                        
                        CheckAllowance --> ApproveToken: Insufficient allowance
                        CheckAllowance --> MintLicense: Approved
                        
                        note right of ApproveToken
                            🔄 MODIFIED (ERC20 Flow)
                            await SUSDContract.approve(
                              LICENSING_MODULE,
                              mintingFee
                            )
                        end note
                        
                        ApproveToken --> MintLicense
                        
                        note right of MintLicense
                            🔄 REPLACED (Core Change)
                            📁 src/components/LicenseModal.tsx
                            
                            OLD CALL:
                            await marketplaceContract.buyListing(
                              tokenId,
                              amount,
                              { value: totalPrice }
                            )
                            Result: User owns token fractions
                            
                            NEW CALL:
                            const { licenseTokenIds } = 
                              await storyProtocolService.mintLicenseTokens({
                                licensorIpId: ipId,
                                licenseTermsId: licenseTermsId,
                                amount: 1,
                                receiver: userAddress,
                                royaltyContext: ""
                              })
                            Result: User owns license NFT
                            
                            ⚡ Change: One function swap
                            🔧 Update success message
                        end note
                        
                        MintLicense --> LicenseSuccess
                        
                        note right of LicenseSuccess
                            🔄 MODIFIED (Message Changed)
                            OLD: "Purchase successful! Tokens added to wallet"
                            NEW: "License minted! You can now use this IP"
                            
                            ⚡ Change: Toast notification text
                            ✅ Keep: Success flow, cache invalidation
                        end note
                    }
                }
            }
        }
        
        state AdminDashboard {
            [*] --> AdminPanel
            
            note right of AdminPanel
                🔄 MODIFIED (Add Dispute Tab)
                📁 src/pages/admin/admin.tsx
                ✅ Keep: User management tab
                ❌ Remove: Token approval tab (no manual approval)
                ➕ Add: Dispute resolution tab
                ✅ Keep: Invoice settlement tab (adapt)
            end note
            
            AdminPanel --> UserManagement
            AdminPanel --> DisputeResolution
            AdminPanel --> RoyaltyManagement
            
            state UserManagement {
                [*] --> ManageUsers
                
                note right of ManageUsers
                    🔄 MODIFIED (Contract Changed)
                    📁 src/pages/admin/admin.tsx
                    
                    OLD: ADMIN_CONTRACT (Flow)
                    NEW: Backend API + Story access control
                    
                    Still supports:
                    - Add/remove issuers
                    - Add/remove managers
                    - Role management
                    
                    ⚡ Change: Replace smart contract calls with API calls
                    🔧 Backend handles Story access config
                    ✅ Keep: UI, workflows
                end note
            }
            
            state DisputeResolution {
                [*] --> LoadDisputes
                
                note right of LoadDisputes
                    ➕ NEW TAB
                    📁 src/pages/admin/admin.tsx
                    📁 src/components/admin/DisputeQueue.tsx (NEW)
                    
                    ⚡ API: GET /api/disputes/pending
                    
                    Display:
                    - Submitted content hash
                    - Detected parent IP
                    - Similarity score (60-85%)
                    - Evidence link
                    - Creator info
                end note
                
                LoadDisputes --> ReviewDispute
                
                state ReviewDispute {
                    [*] --> ShowEvidence
                    
                    note right of ShowEvidence
                        ➕ NEW UI
                        🔧 Show side-by-side comparison
                        🔧 IPFS evidence viewer
                        🔧 Similarity metrics
                    end note
                    
                    ShowEvidence --> ApproveAsOriginal: Admin approves
                    ShowEvidence --> EnforceDerivative: Admin enforces
                    
                    note right of ApproveAsOriginal
                        ⚡ API: POST /api/disputes/:id/resolve
                        Body: { decision: "original" }
                        🔧 Allow registration as new IP
                    end note
                    
                    note right of EnforceDerivative
                        ⚡ API: POST /api/disputes/:id/resolve
                        Body: { decision: "derivative" }
                        🔧 Force derivative linking
                        🔧 Notify creator
                    end note
                }
            }
            
            state RoyaltyManagement {
                [*] --> ViewRoyalties
                
                note right of ViewRoyalties
                    🔄 MODIFIED (Story Royalty Module)
                    📁 src/pages/admin/admin.tsx
                    
                    OLD: PAYMENT_SPLITTER contract (Flow)
                    NEW: Story Royalty Module queries
                    
                    Display:
                    - IP royalty earnings
                    - Derivative splits
                    - Claimable amounts
                    
                    ⚡ Change: Query Story royalty vaults
                    ✅ Keep: UI structure
                end note
            }
        }
        
        state ManagerDashboard {
            [*] --> ManagerPanel
            
            note right of ManagerPanel
                🔄 MODIFIED (Metadata Updates)
                📁 src/pages/managerdashboard/managerDashboard.tsx
                
                OLD: Update via ASSET_REGISTRY
                NEW: Update via Story SDK
                
                const tx = await storyProtocolService
                  .updateMetadata(ipId, newMetadataURI)
                
                ⚡ Change: Function call swap
                ✅ Keep: UI, permissions
            end note
        }
    }
    
    Authenticated --> Logout
    
    note right of Logout
        ✅ UNCHANGED
        📁 src/context/AuthContext.tsx
        🔧 Same logout flow
        🔧 Clear localStorage
        🔧 Reset state
    end note
    
    Logout --> [*]
    
    classDef unchanged fill:#c8e6c9,stroke:#2e7d32,stroke-width:3px,color:#000
    classDef modified fill:#fff9c4,stroke:#f57c00,stroke-width:3px,color:#000
    classDef new fill:#e1f5ff,stroke:#0277bd,stroke-width:3px,color:#000
    classDef replaced fill:#ffccbc,stroke:#d84315,stroke-width:3px,color:#000
    
    class PublicPages,CheckAuthentication,AuthFlow,Logout,CollectMetadata,UploadToIPFS unchanged
    class NetworkCheck,LoadIssuerPanel,LoadPortfolio,DisplayAssets,DisplayListings,OpenLicenseModal,CheckAllowance,AdminPanel,ManageUsers,ManagerPanel modified
    class ContentFingerprint,SimilarityCheck,AdminReview,ShowDerivativeDialog,ViewDerivativeGraph,DisputeResolution new
    class RegisterIPAsset,AttachLicense,MintLicense replaced
```

---

## 📋 Migration Checklist

### **Frontend Changes**

#### **Files to Keep (Unchanged)**
- ✅ `src/main.tsx`
- ✅ `src/App.tsx`
- ✅ `src/context/AuthContext.tsx`
- ✅ `src/api/authApi.ts`
- ✅ `src/pages/Index.tsx` (landing page)
- ✅ `src/pages/login/login.tsx`
- ✅ `src/utils/pinata.ts`
- ✅ `src/components/ui/*` (all UI components)
- ✅ `src/components/Header.tsx`
- ✅ `src/components/Footer.tsx`
- ✅ `src/components/Navbar.tsx`

#### **Files to Modify (Minimal Changes)**
- 🔄 `src/context/WalletContext.tsx` - Update network config
- 🔄 `src/pages/Issuer/newIssuerDashboard.tsx` - Swap service calls
- 🔄 `src/pages/dashboard/dashboard.tsx` - Change data source
- 🔄 `src/pages/marketplace/marketplace.tsx` - Replace buy with mint
- 🔄 `src/components/BuyModal.tsx` → Rename to `LicenseModal.tsx`
- 🔄 `src/pages/admin/admin.tsx` - Add dispute tab

#### **Files to Create (New)**
- ➕ `src/lib/storyProtocolConfig.ts`
- ➕ `src/services/storyProtocolService.ts`
- ➕ `src/services/contentFingerprintService.ts`
- ➕ `src/services/disputeResolutionService.ts`
- ➕ `src/components/DerivativeGraph.tsx`
- ➕ `src/components/admin/DisputeQueue.tsx`
- ➕ `src/components/DerivativeDetectionDialog.tsx`

#### **Files to Remove**
- ❌ `src/services/tokenManagementService.js`
- ❌ `src/services/adminTokenManagementService.js`
- ❌ `src/services/directMarketplaceListingService.js`
- ❌ `src/services/robustAuthorizationService.js`

---

### **Backend Changes**

#### **Keep Existing**
- ✅ Auth APIs (login, register, verify-wallet)
- ✅ MongoDB users collection
- ✅ JWT authentication
- ✅ Pinata integration

#### **Add New**
- ➕ PostgreSQL fingerprints table
- ➕ PostgreSQL disputes table
- ➕ `POST /api/fingerprint`
- ➕ `POST /api/check-similarity`
- ➕ `POST /api/disputes/create`
- ➕ `GET /api/disputes/pending`
- ➕ `POST /api/disputes/:id/resolve`
- ➕ `GET /api/marketplace/listings` (Story-aware)
- ➕ `GET /api/assets` (Story IP query)
- ➕ `PATCH /api/assets/:hash`

---

## 🔄 Service Layer Migration Map

### **Current (Flow) → Story Protocol**

| Current Service | Story Replacement | Change Complexity |
|----------------|-------------------|-------------------|
| `TokenManagementService.submitTokenRequest()` | `StoryProtocolService.registerIpAsset()` | **LOW** - Function swap |
| `TokenManagementService.deployApprovedToken()` | *Removed* (instant registration) | **LOW** - Delete calls |
| `Marketplace.buyListing()` | `StoryProtocolService.mintLicenseTokens()` | **LOW** - Function swap |
| `Marketplace.getAllListings()` | Backend API + Story queries | **MEDIUM** - Data model change |
| `TOKEN_CONTRACT.balanceOf()` | `StoryProtocolService.getUserLicenses()` | **LOW** - Function swap |
| `ADMIN_CONTRACT.addIssuer()` | Backend API (no on-chain needed) | **LOW** - API call |
| `PAYMENT_SPLITTER.settleInvoice()` | Story Royalty Module | **MEDIUM** - Different logic |

---

## 🎯 Key Migration Insights

### **1. Authentication: Zero Changes**
- ✅ JWT auth stays identical
- ✅ MongoDB user database unchanged
- ✅ Login/signup flows same
- ✅ Role management preserved

### **2. UI Components: Minimal Changes**
- ✅ 95% of UI components unchanged
- 🔄 5% label updates ("Buy" → "Mint License")
- ➕ Add derivative detection dialog
- ➕ Add dispute resolution UI

### **3. Smart Contract Calls: Simple Swaps**
```typescript
// OLD (Flow)
await tokenManagementService.submitTokenRequest(uri, amount, price)

// NEW (Story)
await storyProtocolService.registerIpAsset({ ipMetadata: { ipMetadataURI: uri } })
```

**Pattern**: Find-and-replace function calls, same file locations.

### **4. Data Model: Conceptual Shift**
```typescript
// OLD: Token ownership model
{
  tokenId: "1",
  amount: 100,    // You own 100 tokens
  price: "1000"   // Price per token
}

// NEW: License-based model
{
  ipId: "0x123...",
  licenseTokenId: "5",  // You own license #5
  licenseTermsId: "1",  // Terms: commercial remix
  royaltyRate: 10       // 10% to creator
}
```

**Impact**: Update type definitions, display logic. Core UI structure stays.

### **5. New Workflows: Additive**
- ➕ Fingerprinting happens before registration
- ➕ Similarity check added to creation flow
- ➕ Derivative dialog shown when needed
- ➕ Admin dispute queue for edge cases

**Pattern**: Insert new steps, don't replace existing flows.

---

## 📊 Migration Effort Estimate

| Component | Files to Change | Effort | Risk |
|-----------|----------------|--------|------|
| **Network Config** | 2 files | 30 min | LOW |
| **Service Layer** | 4 files (swap) + 3 new | 4 hours | LOW |
| **Issuer Dashboard** | 1 file | 3 hours | MEDIUM |
| **Marketplace** | 2 files | 3 hours | MEDIUM |
| **User Dashboard** | 2 files | 2 hours | LOW |
| **Admin Panel** | 2 files | 4 hours | MEDIUM |
| **Backend APIs** | 6 new endpoints | 6 hours | MEDIUM |
| **Database** | 2 new tables | 1 hour | LOW |
| **Testing** | All flows | 4 hours | - |
| **TOTAL** | ~20 files | **27 hours** | **LOW-MEDIUM** |

---

## 🚀 Phased Rollout Strategy

### **Phase 1: Foundation (Week 1)**
1. ✅ Setup Story Protocol SDK
2. ✅ Create `storyProtocolConfig.ts`
3. ✅ Update network detection
4. ✅ Add PostgreSQL fingerprints table
5. ✅ Build `contentFingerprintService`

### **Phase 2: Core Migration (Week 2)**
1. 🔄 Migrate issuer registration flow
2. 🔄 Swap marketplace buy → mint
3. 🔄 Update dashboard data queries
4. ✅ Add fingerprinting to upload flow

### **Phase 3: Detection & Derivatives (Week 3)**
1. ➕ Build similarity check API
2. ➕ Add derivative detection dialog
3. ➕ Implement derivative linking
4. ➕ Build admin dispute resolution

### **Phase 4: Polish (Week 4)**
1. 🔧 Update all UI labels
2. 🔧 Add derivative graph visualization
3. 🔧 Royalty distribution UI
4. ✅ End-to-end testing

---

## 🎨 Color Legend

- **Green** (✅): Unchanged - keep as-is
- **Yellow** (🔄): Modified - minimal changes needed
- **Blue** (➕): New - additional features
- **Red** (❌): Removed - deprecated components

---

## 💡 Developer Tips

### **For Frontend Developers**
```typescript
// Pattern: Service Injection
// Instead of importing specific services, inject via props/context

// OLD
import { tokenManagementService } from '../services/tokenManagementService';

// NEW (Better)
const { ipService } = useIPOperations(); // Can be Flow or Story
```

### **For Backend Developers**
```typescript
// Pattern: Abstract fingerprinting
// Same API regardless of detection method

POST /api/fingerprint
{
  file: Buffer,
  type: "video" | "audio" | "image" | "text"
}

Response:
{
  hash: "0x...",
  ipfsCid: "Qm...",
  detectionMethod: "sha256" | "phash" | "chromaprint"
}
```

### **For Smart Contract Integration**
```typescript
// Pattern: Adapter pattern
// Wrap both Flow and Story behind same interface

interface IPRegistrationService {
  register(metadata): Promise<{ id: string, txHash: string }>
  mintAccess(ipId, user): Promise<{ tokenId: string }>
}

// Implementations: FlowAdapter, StoryAdapter
// Swap implementation, keep interface
```

---

## 🔗 Related Documentation

- [COMPREHENSIVE_WORKFLOW_DIAGRAM.md](./COMPREHENSIVE_WORKFLOW_DIAGRAM.md) - Current Flow implementation
- [STORY_INTEGRATION_GUIDE.md](./STORY_INTEGRATION_GUIDE.md) - Detailed Story Protocol integration
- [story_doc_requirement.md](./story_doc_requirement.md) - IP-OPS Engine requirements

---

**Last Updated**: December 12, 2025  
**Migration Status**: Planning Phase  
**Target Completion**: Q1 2026
