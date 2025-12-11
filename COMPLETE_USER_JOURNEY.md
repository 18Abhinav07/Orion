# 🗺️ COMPLETE USER JOURNEY - IP-OPS PLATFORM
## Single Comprehensive Sequence Diagram (Post-Migration)

**Version:** 1.0
**Date:** December 12, 2025
**Platform:** IP-OPS on Story Protocol
**Purpose:** Complete end-to-end user journey from landing to all platform features

---

## 📊 MASTER SEQUENCE DIAGRAM

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant Landing as 🏠 Landing Page
    participant Auth as 🔐 Auth System
    participant Wallet as 💰 WalletContext
    participant Creator as 🎨 Creator Dashboard<br/>(newIssuerDashboard)
    participant Portfolio as 📊 User Portfolio<br/>(dashboard)
    participant Market as 🛒 Marketplace<br/>(marketplace)
    participant AdminUI as ⚖️ Admin Panel<br/>(admin)
    participant API as ⚙️ Backend API
    participant DB as 🗄️ Database
    participant IPFS as 📦 IPFS (Pinata)
    participant SP as ⚡ Story Protocol SDK

    Note over User,SP: ═══════════════════════════════════════════════════════════
    Note over User,SP: PHASE 1: LANDING & AUTHENTICATION
    Note over User,SP: ═══════════════════════════════════════════════════════════

    User->>Landing: 1. Visit IP-OPS Platform (/)
    activate Landing
    Landing-->>User: Display hero section, features, CTA
    User->>Landing: 2. Click "Get Started" or "Connect Wallet"
    Landing->>Wallet: 3. Trigger wallet connection

    activate Wallet
    Wallet->>User: 4. Prompt MetaMask connection
    User->>Wallet: 5. Approve connection
    Wallet->>Wallet: 6. Check network (Story Sepolia - Chain ID: 11155111)

    alt Wrong Network
        Wallet->>User: Request network switch
        User->>Wallet: Approve switch
        Wallet->>Wallet: Switch to Story Sepolia
    end

    Wallet->>Auth: 7. Check if user exists
    activate Auth
    Auth->>API: GET /api/auth/check (walletAddress)
    activate API
    API->>DB: Query users WHERE wallet_address

    alt User Not Found
        DB-->>API: No user found
        API-->>Auth: User doesn't exist
        Auth->>API: POST /api/auth/register
        API->>DB: INSERT into users (wallet_address, role='user')
        DB-->>API: User created
        API-->>Auth: Return JWT token
    else User Found
        DB-->>API: User exists
        API-->>Auth: Return JWT token
    end
    deactivate API

    Auth->>Auth: Store JWT in localStorage
    Auth-->>Wallet: Authentication complete
    deactivate Auth
    Wallet-->>Landing: Connection successful
    deactivate Wallet
    Landing-->>User: Redirect to Dashboard
    deactivate Landing

    Note over User,SP: ═══════════════════════════════════════════════════════════
    Note over User,SP: PHASE 2: CREATOR DASHBOARD - IP REGISTRATION
    Note over User,SP: ═══════════════════════════════════════════════════════════

    User->>Creator: 8. Navigate to "Register IP" tab
    activate Creator
    Creator-->>User: Display IP registration form
    User->>Creator: 9. Fill form (title, description, ipType, royalty %)
    User->>Creator: 10. Upload content file "My_Original_Song.txt"
    Creator->>Creator: 11. handleRegisterIP() triggered

    Creator->>API: 12. POST /api/fingerprint
    Note right of API: FormData: file, title, walletAddress, ipType='Text'

    activate API
    API->>API: 13. Generate SHA256 hash
    Note right of API: normalizedText = content.toLowerCase().trim()
    API->>IPFS: 14. Upload file to Pinata
    activate IPFS
    IPFS-->>API: 15. Return IPFS CID (QmXxx...)
    deactivate IPFS
    API->>DB: 16. INSERT into ip_fingerprints
    Note right of DB: hash, ipfs_cid, wallet_address,<br/>title, status='pending'
    API-->>Creator: 17. Return { hash, ipfsCid, fileSize }
    deactivate API

    Creator->>API: 18. POST /api/check-similarity
    Note right of API: Body: { contentHash }

    activate API
    API->>DB: 19. Query: SELECT * FROM ip_fingerprints<br/>WHERE hash = ? OR similarity > 0
    DB-->>API: 20. Return matches
    API->>API: 21. Calculate similarity score

    alt Score < 40% - ORIGINAL CONTENT
        API-->>Creator: 22. { score: 15, status: 'CLEAN', isMatch: false }
        deactivate API

        Creator->>Creator: 23. Proceed as ORIGINAL
        Creator->>IPFS: 24. Upload metadata JSON
        Note right of IPFS: { title, description, ipType,<br/>contentHash, ipfsCid, attributes }
        activate IPFS
        IPFS-->>Creator: 25. Return metadataURI (ipfs://Qm...)
        deactivate IPFS

        Creator->>Creator: 26. Calculate keccak256(metadataJSON)
        Creator->>User: 27. "Sign transaction to register IP"
        User->>Creator: 28. Signs via MetaMask

        Creator->>SP: 29. mintAndRegisterIpAndAttachPILTerms()
        Note right of SP: spgNftContract: SPG_COLLECTION,<br/>pilType: 'commercialRemix',<br/>ipMetadata: { ipMetadataURI, ipMetadataHash },<br/>commercialRevShare: 1000 (10%),<br/>currency: WIP_TOKEN,<br/>mintingFee: 0

        activate SP
        SP->>SP: 30. Mint NFT in SPG collection
        SP->>SP: 31. Register as IP Asset (assign ipId)
        SP->>SP: 32. Create Commercial Remix PIL terms
        SP->>SP: 33. Attach license terms to IP
        SP-->>Creator: 34. { ipId, tokenId, licenseTermsId, txHash }
        deactivate SP

        Creator->>API: 35. PATCH /api/assets/:hash/update
        Note right of API: { storyIpId, tokenId,<br/>licenseTermsId, status='registered' }
        activate API
        API->>DB: 36. UPDATE ip_fingerprints SET<br/>story_ip_id, status='registered'
        API-->>Creator: 37. { success: true }
        deactivate API

        Creator-->>User: 38. ✅ Success! IP Registered<br/>Display: ipId, tokenId, view on explorer

    else Score 40-70% - SUGGESTION
        API-->>Creator: { score: 55, status: 'WARNING',<br/>needsReview: true, parentIpId }
        deactivate API

        Creator->>Creator: Display warning dialog
        Creator-->>User: ⚠️ "Similar content found (55% match).<br/>Original by [Parent Creator].<br/>Are you sure this is your original work?"

        alt User confirms "Yes, I own this"
            User->>Creator: Click "Proceed as Original"
            Note over Creator,SP: Flow continues as ORIGINAL (Score < 40%)
        else User cancels
            User->>Creator: Click "Cancel Upload"
            Creator-->>User: Upload cancelled
        end

    else Score 70-90% - ADMIN REVIEW REQUIRED
        API-->>Creator: { score: 78, status: 'REVIEW_REQUIRED',<br/>isPotentialMatch: true, parentIpId }
        deactivate API

        Creator->>API: POST /api/disputes/create
        Note right of API: { submittedBy, contentHash, contentTitle,<br/>ipfsCid, parentIpId, similarityScore: 78 }
        activate API
        API->>DB: INSERT into similarity_disputes
        API-->>Creator: { disputeId: 'dispute_123', status: 'pending' }
        deactivate API

        Creator-->>User: ⏳ "Content held for manual review.<br/>Similarity: 78%. Admin will review within 24-48h."

    else Score >= 90% - DERIVATIVE DETECTED
        API-->>Creator: { score: 95, status: 'DERIVATIVE',<br/>isMatch: true, parentIpId, parentMetadata }
        deactivate API

        Creator->>Creator: Display RED ALERT dialog
        Creator-->>User: 🛑 "Derivative Detected! (95% match)<br/>Original: [Parent Title] by [Parent Creator]<br/>You must register as derivative."

        User->>Creator: Click "Register as Derivative"
        Creator->>IPFS: Upload derivative metadata
        activate IPFS
        IPFS-->>Creator: derivativeMetadataURI
        deactivate IPFS

        Creator->>User: "Sign to register derivative"
        User->>Creator: Signs via MetaMask

        Creator->>SP: registerDerivativeIp()
        Note right of SP: nftContract: SPG_COLLECTION,<br/>derivData: {<br/>  parentIpIds: [parentIpId],<br/>  licenseTermsIds: [parentLicenseTermsId]<br/>},<br/>ipMetadata: { derivativeMetadataURI }

        activate SP
        SP->>SP: Mint derivative NFT
        SP->>SP: Link childIpId → parentIpId
        SP->>SP: Setup royalty flow (Parent: 10%, Child: 90%)
        SP-->>Creator: { ipId: childIpId, txHash }
        deactivate SP

        Creator->>API: PATCH /api/assets/:hash/update
        Note right of API: { storyIpId: childIpId,<br/>isDerivative: true, parentIpId }
        activate API
        API->>DB: UPDATE ip_fingerprints
        API-->>Creator: { success: true }
        deactivate API

        Creator-->>User: ✅ Derivative Registered & Linked<br/>When you earn revenue, parent gets 10%
    end

    deactivate Creator

    Note over User,SP: ═══════════════════════════════════════════════════════════
    Note over User,SP: PHASE 3: USER PORTFOLIO - VIEW & CLAIM ROYALTIES
    Note over User,SP: ═══════════════════════════════════════════════════════════

    User->>Portfolio: 39. Navigate to "My Portfolio"
    activate Portfolio
    Portfolio->>Portfolio: 40. useEffect() → fetchUserPortfolio()

    Portfolio->>API: 41. GET /api/assets?walletAddress=0x...
    activate API
    API->>DB: 42. SELECT * FROM ip_fingerprints<br/>WHERE wallet_address = ?
    DB-->>API: 43. Return user's IPs
    API-->>Portfolio: 44. [{ hash, ipfsCid, storyIpId, title,<br/>royaltyRate, licenseTermsId, ... }]
    deactivate API

    loop For each IP asset
        Portfolio->>SP: 45. client.ipAsset.ipAsset(ipId)
        activate SP
        SP-->>Portfolio: { owner, tokenContract, tokenId }
        deactivate SP

        Portfolio->>IPFS: 46. Fetch metadata from ipfsCid
        activate IPFS
        IPFS-->>Portfolio: { title, description, attributes }
        deactivate IPFS

        Portfolio->>Portfolio: 47. Merge backend + on-chain + IPFS data
    end

    Portfolio->>SP: 48. client.royalty.getClaimableRevenue(ipId, WIP_TOKEN)
    activate SP
    SP-->>Portfolio: 49. { claimableRevenue: 500000000000000000 } (0.5 WIP)
    deactivate SP

    Portfolio->>Portfolio: 50. Calculate metrics:<br/>Total IPs: 3, Total Royalties: 0.5 WIP
    Portfolio-->>User: 51. Display portfolio dashboard
    Note right of User: Shows: IP cards, royalty income,<br/>claimable balance, transaction history

    User->>Portfolio: 52. Click "Claim Royalties" button
    Portfolio->>User: 53. "Sign to claim 0.5 WIP"
    User->>Portfolio: 54. Signs via MetaMask

    Portfolio->>SP: 55. client.royalty.claimRevenue()
    Note right of SP: snapshotIds: [1, 2, 3],<br/>account: userAddress,<br/>token: WIP_TOKEN

    activate SP
    SP->>SP: 56. Calculate total claimable
    SP->>SP: 57. Transfer from IP Royalty Vault to user
    SP-->>Portfolio: 58. { claimableRevenue, txHash }
    deactivate SP

    Portfolio->>API: 59. POST /api/royalties/record
    Note right of API: { ipId, amount, currency, txHash }
    activate API
    API->>DB: 60. INSERT into royalty_claims
    API-->>Portfolio: { success: true }
    deactivate API

    Portfolio-->>User: 61. ✅ Success! 0.5 WIP claimed<br/>Check wallet balance
    deactivate Portfolio

    Note over User,SP: ═══════════════════════════════════════════════════════════
    Note over User,SP: PHASE 4: MARKETPLACE - BROWSE & MINT LICENSE
    Note over User,SP: ═══════════════════════════════════════════════════════════

    User->>Market: 62. Navigate to "Marketplace"
    activate Market
    Market->>Market: 63. useEffect() → loadAvailableIPs()

    Market->>API: 64. GET /api/marketplace/available-ips
    Note right of API: Query params: ipType, minRoyalty, maxRoyalty

    activate API
    API->>DB: 65. SELECT * FROM ip_fingerprints<br/>WHERE status='registered'<br/>AND is_derivative=false
    DB-->>API: 66. Return available IPs
    API-->>Market: 67. [{ storyIpId, title, royaltyRate,<br/>licenseTermsId, ipfsCid, creator }]
    deactivate API

    loop For each IP listing
        Market->>SP: 68. client.license.licenseTerms(licenseTermsId)
        activate SP
        SP-->>Market: { commercialUse: true, derivativesAllowed: true,<br/>commercialRevShare: 1000, mintingFee: 0, currency }
        deactivate SP

        Market->>IPFS: 69. Fetch preview image from ipfsCid
        activate IPFS
        IPFS-->>Market: Return image/metadata
        deactivate IPFS
    end

    Market->>Market: 70. Sort by: popularity, royalty %, newest
    Market-->>User: 71. Display marketplace grid
    Note right of User: Shows: IP cards with title, preview,<br/>royalty %, license type, "Mint License" button

    User->>Market: 72. Click "Mint License" on IP
    Market->>Market: 73. Open License Modal
    Market-->>User: 74. Display license details:<br/>Commercial use: ✓<br/>Derivatives allowed: ✓<br/>Royalty: 10%<br/>Minting fee: Free

    User->>Market: 75. Click "Confirm & Mint"
    Market->>User: 76. "Sign to mint license"
    User->>Market: 77. Signs via MetaMask

    Market->>SP: 78. client.license.mintLicenseTokens()
    Note right of SP: licensorIpId: ipId,<br/>licenseTemplate: PIL_TEMPLATE,<br/>licenseTermsId: termId,<br/>amount: 1,<br/>receiver: userAddress,<br/>maxMintingFee: 0,<br/>maxRevenueShare: 100

    activate SP
    SP->>SP: 79. Charge minting fee (if any)
    SP->>SP: 80. Mint License NFT to user
    SP->>SP: 81. Record license in registry
    SP-->>Market: 82. { licenseTokenIds: [101], txHash }
    deactivate SP

    Market->>API: 83. POST /api/licenses/record
    Note right of API: { licenseTokenId: 101, ipId,<br/>licensee, mintedAt }
    activate API
    API->>DB: 84. INSERT into license_tokens
    API-->>Market: { success: true }
    deactivate API

    Market-->>User: 85. ✅ License Minted!<br/>Token ID: 101<br/>You can now use this IP commercially
    deactivate Market

    Note over User,SP: ═══════════════════════════════════════════════════════════
    Note over User,SP: PHASE 5: ADMIN PANEL - DISPUTE RESOLUTION
    Note over User,SP: ═══════════════════════════════════════════════════════════

    User->>AdminUI: 86. Navigate to "Admin Panel" (if admin role)
    activate AdminUI
    AdminUI->>API: 87. Verify admin role
    activate API
    API->>DB: SELECT role FROM users WHERE wallet_address = ?
    DB-->>API: { role: 'admin' }
    API-->>AdminUI: Authorized
    deactivate API

    AdminUI->>AdminUI: 88. Display admin tabs: Overview, Disputes, Users
    User->>AdminUI: 89. Click "Disputes" tab

    AdminUI->>API: 90. GET /api/disputes/pending
    activate API
    API->>DB: 91. SELECT * FROM similarity_disputes<br/>WHERE status='pending'
    DB-->>API: 92. Return pending disputes
    API-->>AdminUI: 93. [{ disputeId, submittedBy, contentHash,<br/>contentTitle, parentIpId, similarityScore: 78 }]
    deactivate API

    loop For each dispute
        AdminUI->>IPFS: 94. Fetch disputed content
        activate IPFS
        IPFS-->>AdminUI: Disputed content preview
        deactivate IPFS

        AdminUI->>IPFS: 95. Fetch parent content
        activate IPFS
        IPFS-->>AdminUI: Parent content preview
        deactivate IPFS
    end

    AdminUI-->>User: 96. Display dispute queue<br/>Side-by-side comparison, similarity: 78%

    alt Admin Approves as Original
        User->>AdminUI: 97. Click "Approve as Original"
        AdminUI->>API: 98. POST /api/disputes/dispute_123/resolve
        Note right of API: { resolution: 'approved_as_original',<br/>adminAddress, notes: 'Sufficiently transformative' }

        activate API
        API->>DB: 99. UPDATE similarity_disputes<br/>SET status='approved_as_original'
        API-->>AdminUI: { success: true }
        deactivate API

        AdminUI->>SP: 100. mintAndRegisterIpAndAttachPILTerms()
        Note right of SP: Register disputed content as ORIGINAL
        activate SP
        SP-->>AdminUI: { ipId, tokenId, licenseTermsId }
        deactivate SP

        AdminUI-->>User: 101. ✅ Dispute resolved - Approved as Original

    else Admin Enforces Derivative Link
        User->>AdminUI: 102. Click "Enforce Derivative"
        AdminUI->>API: 103. POST /api/disputes/dispute_123/resolve
        Note right of API: { resolution: 'enforced_derivative',<br/>adminAddress, notes: 'Clear similarity' }

        activate API
        API->>DB: 104. UPDATE similarity_disputes<br/>SET status='enforced_derivative'

        API->>SP: 105. registerDerivativeIp() (admin wallet)
        Note right of SP: childIpId: disputed IP,<br/>parentIpIds: [parent IP],<br/>licenseTermsIds: [parent terms]

        activate SP
        SP->>SP: 106. Link child → parent on-chain
        SP->>SP: 107. Setup royalty flow
        SP-->>API: { txHash }
        deactivate SP

        API-->>AdminUI: { success: true, txHash }
        deactivate API

        AdminUI-->>User: 108. ✅ Derivative link enforced<br/>Royalties will flow to parent creator
    end

    deactivate AdminUI

    Note over User,SP: ═══════════════════════════════════════════════════════════
    Note over User,SP: PHASE 6: USER LOGS OUT
    Note over User,SP: ═══════════════════════════════════════════════════════════

    User->>Portfolio: 109. Click "Logout"
    activate Portfolio
    Portfolio->>Auth: Clear JWT token
    activate Auth
    Auth->>Auth: localStorage.removeItem('jwt_token')
    Auth-->>Portfolio: Logged out
    deactivate Auth
    Portfolio->>Wallet: Disconnect wallet
    activate Wallet
    Wallet->>Wallet: Clear wallet state
    Wallet-->>Portfolio: Disconnected
    deactivate Wallet
    Portfolio-->>Landing: Redirect to landing page
    deactivate Portfolio
    Landing-->>User: Display landing page (logged out)

    Note over User,SP: ═══════════════════════════════════════════════════════════
    Note over User,SP: END OF COMPLETE USER JOURNEY
    Note over User,SP: ═══════════════════════════════════════════════════════════
```

---

## 📊 JOURNEY SUMMARY

### **Phase 1: Landing & Authentication (Steps 1-7)**
- User visits platform
- Connects MetaMask wallet
- Network validation (Story Sepolia)
- JWT authentication (register or login)

### **Phase 2: Creator Dashboard (Steps 8-38)**
- Navigate to IP registration
- Upload content file
- **Backend fingerprinting** (hash generation + IPFS)
- **Similarity detection** (4 branching scenarios):
  - **< 40%:** Register as ORIGINAL via `mintAndRegisterIpAndAttachPILTerms()`
  - **40-70%:** Warning + user choice
  - **70-90%:** Admin review required
  - **>= 90%:** Forced derivative via `registerDerivativeIp()`

### **Phase 3: User Portfolio (Steps 39-61)**
- Fetch user's registered IPs
- Query Story Protocol for on-chain data
- Display royalty income
- **Claim royalties** via `claimRevenue()`

### **Phase 4: Marketplace (Steps 62-85)**
- Browse available IPs with license terms
- View license details (commercial use, derivatives, royalty %)
- **Mint license** via `mintLicenseTokens()`
- Record in backend database

### **Phase 5: Admin Panel (Steps 86-108)**
- Admin accesses dispute queue
- Reviews pending disputes (70-90% similarity)
- **Resolution options:**
  - **Approve as Original:** Register via `mintAndRegisterIpAndAttachPILTerms()`
  - **Enforce Derivative:** Link via `registerDerivativeIp()` (admin wallet)

### **Phase 6: Logout (Steps 109-end)**
- Clear JWT token
- Disconnect wallet
- Return to landing page

---

## 🔑 KEY INTEGRATION POINTS

### **Backend API Calls**
1. `POST /api/fingerprint` - Content hash generation + IPFS upload
2. `POST /api/check-similarity` - Derivative detection
3. `GET /api/assets` - Fetch user IPs
4. `PATCH /api/assets/:hash/update` - Update with Story IP ID
5. `POST /api/disputes/create` - Create dispute
6. `GET /api/disputes/pending` - Fetch disputes
7. `POST /api/disputes/:disputeId/resolve` - Admin resolve
8. `POST /api/licenses/record` - Track license minting
9. `POST /api/royalties/record` - Track royalty claims

### **Story Protocol SDK Functions**
1. `mintAndRegisterIpAndAttachPILTerms()` - **Combined function** (3-in-1)
2. `registerDerivativeIp()` - Derivative registration + linking
3. `mintLicenseTokens()` - License minting (replaces "buy")
4. `claimRevenue()` - Royalty claiming
5. `ipAsset.ipAsset(ipId)` - Query IP details
6. `license.licenseTerms(licenseTermsId)` - Query license terms
7. `royalty.getClaimableRevenue()` - Check claimable amount

### **Database Tables Used**
1. `users` - User authentication
2. `ip_fingerprints` - Content hashes + Story IPs
3. `similarity_disputes` - Admin review queue
4. `license_tokens` - Minted licenses tracking
5. `royalty_claims` - Royalty claim history

---

## 📈 SIMILARITY SCORE BRANCHING LOGIC

```
Score < 40%          → CLEAN (proceed as original)
Score 40-70%         → WARNING (suggest, user choice)
Score 70-90%         → REVIEW_REQUIRED (admin review)
Score >= 90%         → DERIVATIVE (forced linking)
```

---

## 🎯 CRITICAL USER FLOWS

### **1. Happy Path (Original Creator)**
Steps: 1-7 (auth) → 8-38 (register original) → 39-61 (view portfolio) → Done

### **2. Derivative Path (Remix Creator)**
Steps: 1-7 (auth) → 8-23 (upload) → 24-38 (derivative detected) → Forced link → Done

### **3. Licensee Path (User wants to use IP)**
Steps: 1-7 (auth) → 62-85 (browse marketplace, mint license) → Done

### **4. Admin Path (Dispute Resolution)**
Steps: 1-7 (auth) → 86-108 (review dispute, resolve) → Done

---

## 💡 WHAT MAKES THIS COMPREHENSIVE

✅ **Complete user journey** from landing to logout
✅ **All 4 pages documented** with detailed interactions
✅ **Backend API calls** with request/response
✅ **Story Protocol SDK** with combined functions
✅ **Database operations** shown at each step
✅ **Error handling** branches (alt/else blocks)
✅ **Similarity detection logic** with 4 scenarios
✅ **Admin enforcement** using admin wallet
✅ **Real transaction flows** with MetaMask signatures

This single diagram shows **108 steps** covering the complete platform experience!

---

**END OF COMPLETE USER JOURNEY DOCUMENTATION**
