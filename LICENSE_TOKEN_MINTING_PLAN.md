# License Token Minting Implementation Plan

## Overview
Enable users to mint license tokens for IP assets on the marketplace, allowing them to legally use others' creative works (art, music, text) by purchasing permission rather than ownership. This implements Story Protocol's licensing model where licenses are NFTs that grant usage rights.

---

## Core Concept

### What is License Token Minting?

**Traditional Ownership Model (What We're NOT Doing):**
- User buys actual asset (like buying a painting)
- User owns the physical/digital item
- Limited control over derivative uses

**License Model (Story Protocol - What We ARE Doing):**
- User mints a License NFT (like buying a permit)
- User gets **permission to use** the IP according to specific terms
- Original creator retains ownership
- License NFT is tradeable and verifiable on-chain
- Royalties automatically enforced when licensee commercializes

### Real-World Analogy
Think of it like Shutterstock or Getty Images:
- Photographer owns the photo
- You buy a license to use it in your blog/website
- You don't own the photo itself
- Different license tiers (personal, commercial, exclusive, etc.)

---

## User Journeys

### Journey 1: Licensee (Buyer) Perspective

**Scenario:** Bob wants to use Alice's artwork in his commercial project

1. **Discovery**
   - Bob browses the IP marketplace
   - Sees Alice's artwork "Sunset Dreams"
   - Clicks to view details

2. **License Review**
   - Views attached license terms:
     - Type: Commercial Remix
     - Royalty: 10% of revenue
     - Minting Fee: 0 (free to mint license)
     - Derivatives Allowed: Yes
     - Attribution Required: Yes
   
3. **Decision to License**
   - Bob clicks "Mint License" button
   - Modal appears showing:
     - One-time minting fee (if any)
     - Ongoing royalty commitment (10%)
     - Terms of use summary
   
4. **Minting Transaction**
   - Confirms transaction in MetaMask
   - Pays minting fee (if set by creator)
   - Story Protocol mints License NFT to Bob's wallet
   - Bob receives License Token ID

5. **License Ownership**
   - Bob's dashboard now shows "My Licenses"
   - Displays: Alice's "Sunset Dreams" - License Token #42
   - Can use the artwork per license terms
   - If Bob earns money using it, must pay 10% royalty to Alice

6. **Creating Derivative Work (Optional)**
   - Bob creates remix using Alice's art
   - Can use his License Token #42 to register derivative
   - Story Protocol automatically links Bob's IP → Alice's IP
   - Royalties flow automatically when Bob's derivative earns revenue

---

### Journey 2: Licensor (Creator) Perspective

**Scenario:** Alice wants to monetize her artwork through licensing

1. **IP Registration** (Already Implemented)
   - Alice uploads artwork
   - Registers as IP Asset
   - Receives IP ID: `0xAliceIP123...`

2. **License Terms Configuration** (Already Implemented)
   - Chooses "Commercial Remix" license
   - Sets royalty: 10%
   - Sets minting fee: 0 (free) or 1 WIP (paid)
   - Attaches terms to IP
   - Receives License Terms ID: `3`

3. **Marketplace Listing** (NEW - To Implement)
   - Lists IP on marketplace as "Available for Licensing"
   - NOT selling ownership
   - Selling permission to use

4. **License Minting by Others**
   - Bob mints a license (see Journey 1)
   - Alice receives minting fee (if set)
   - Alice's dashboard shows:
     - "Licenses Issued: 1"
     - "Licensees: Bob (0xBob123...)"

5. **Revenue Tracking**
   - When Bob uses the artwork commercially
   - Bob must pay royalty to Alice's IP
   - Alice can claim accumulated royalties anytime

---

## Technical Architecture

### Frontend Components to Create

#### 1. Marketplace IP Card (Enhanced)

**Current State:**
- Shows IP asset details
- Shows metadata (title, creator, description)

**Additions Needed:**
```
Visual Design:
┌─────────────────────────────────────┐
│  [Image Preview]                    │
│                                     │
│  "Sunset Dreams"                    │
│  by Alice (0xAli...)                │
│                                     │
│  💎 License Terms:                  │
│    • Commercial Use: ✓              │
│    • Royalty: 10%                   │
│    • Derivatives: ✓                 │
│    • Minting Fee: Free              │
│                                     │
│  📊 Stats:                          │
│    • Licenses Minted: 5             │
│    • Available: Unlimited           │
│                                     │
│  [Mint License] [View Details]      │
└─────────────────────────────────────┘
```

**Data to Display:**
- IP ID
- License Terms ID
- Royalty percentage
- Minting fee (if any)
- Number of licenses minted so far
- Whether user already owns a license
- Call-to-action button state

---

#### 2. License Minting Modal

**Trigger:** User clicks "Mint License" button

**Modal Structure:**
```
┌─────────────────────────────────────────────┐
│  Mint License                         [X]   │
├─────────────────────────────────────────────┤
│                                             │
│  You are about to mint a license for:       │
│                                             │
│  📄 "Sunset Dreams"                         │
│     by Alice (0xAlic...4e5f)                │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ License Terms Summary                │   │
│  │                                      │   │
│  │ ✓ Commercial Use Allowed             │   │
│  │ ✓ Derivative Works Allowed           │   │
│  │ ⚠️ Attribution Required              │   │
│  │ 💰 Royalty: 10% of revenue           │   │
│  │ 🎫 Minting Fee: Free                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  📊 Cost Breakdown:                         │
│    Minting Fee:        0 WIP               │
│    Gas Fee (est.):     ~$2.50              │
│    Total:              ~$2.50              │
│                                             │
│  ⚠️ By minting this license, you agree to: │
│    • Pay 10% royalty on commercial use     │
│    • Follow license terms                  │
│    • Provide attribution                   │
│                                             │
│  [ Cancel ]  [ Mint License (Sign TX) ]    │
└─────────────────────────────────────────────┘
```

**Form Fields:**
- Amount to mint (default: 1, can be multiple)
- Max fee willing to pay (slippage protection)
- Checkbox: "I agree to license terms"

**Validation:**
- User wallet connected
- User on correct network (Story Protocol)
- Sufficient balance for minting fee + gas
- Terms agreement checkbox checked

---

#### 3. My Licenses Dashboard Section

**Location:** User Dashboard → New "Licenses" Tab

**Purpose:** Show all License Tokens owned by the user

```
My Licenses Dashboard:
┌─────────────────────────────────────────────────────┐
│  Your Owned Licenses (3)                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ License Token #42                           │  │
│  │                                             │  │
│  │ IP: "Sunset Dreams" by Alice               │  │
│  │ Licensed: Dec 12, 2025                      │  │
│  │ Terms: Commercial Remix (10% royalty)       │  │
│  │                                             │  │
│  │ ✓ Can use commercially                      │  │
│  │ ✓ Can create derivatives                    │  │
│  │ ⚠️ Must attribute Alice                     │  │
│  │                                             │  │
│  │ [Create Derivative] [View Terms] [Transfer] │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ License Token #43                           │  │
│  │ ...                                         │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Data to Display:**
- License Token ID
- Linked IP Asset details
- License terms summary
- Minted date
- Permissions granted
- Actions available (create derivative, transfer, etc.)

---

#### 4. Creator's License Analytics

**Location:** Creator Dashboard → "My IPs" Section

**Purpose:** Show licensing statistics for creator's IPs

```
My IP Assets - Licensing Stats:
┌─────────────────────────────────────────────────────┐
│  "Sunset Dreams"                                    │
│  IP ID: 0xAlic...4e5f                               │
│                                                     │
│  📊 Licensing Performance:                          │
│    • Total Licenses Minted: 5                       │
│    • Active Licensees: 5                            │
│    • Minting Fees Earned: 0 WIP (free minting)     │
│    • Pending Royalties: 2.5 WIP                    │
│                                                     │
│  👥 Recent Licensees:                               │
│    • Bob (0xBob...123) - Dec 12, 2025              │
│    • Carol (0xCar...456) - Dec 11, 2025            │
│    • Dave (0xDav...789) - Dec 10, 2025             │
│                                                     │
│  [View All Licensees] [Claim Royalties]            │
└─────────────────────────────────────────────────────┘
```

---

### Backend Components to Create

#### 1. Database Schema - License Tokens Table

```sql
CREATE TABLE license_tokens (
  id UUID PRIMARY KEY,
  license_token_id BIGINT NOT NULL,        -- On-chain License Token ID
  licensor_ip_id VARCHAR(66) NOT NULL,     -- Parent IP being licensed
  licensee_wallet VARCHAR(42) NOT NULL,    -- Who owns the license
  license_terms_id VARCHAR(10) NOT NULL,   -- Which terms were used
  minted_at TIMESTAMP NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  
  -- Cached license terms for quick queries
  license_type VARCHAR(50),                -- 'commercial_remix', 'non_commercial'
  royalty_percent INTEGER,
  commercial_use BOOLEAN,
  derivatives_allowed BOOLEAN,
  
  -- Status tracking
  is_active BOOLEAN DEFAULT TRUE,
  transferred_to VARCHAR(42),              -- If license was transferred
  
  FOREIGN KEY (licensor_ip_id) REFERENCES assets(story_ip_id)
);

-- Indexes for performance
CREATE INDEX idx_license_licensee ON license_tokens(licensee_wallet);
CREATE INDEX idx_license_licensor ON license_tokens(licensor_ip_id);
CREATE INDEX idx_license_token_id ON license_tokens(license_token_id);
```

---

#### 2. API Endpoints to Create

**Endpoint 1: Get License Terms for IP**
```
GET /api/licenses/ip/:ipId/terms

Response:
{
  "success": true,
  "data": {
    "ipId": "0xAlic...4e5f",
    "licenseTermsId": "3",
    "terms": {
      "transferable": true,
      "commercialUse": true,
      "commercialRevShare": 10,
      "derivativesAllowed": true,
      "defaultMintingFee": "0",
      "currency": "0x..."
    },
    "stats": {
      "totalLicensesMinted": 5,
      "activeLicensees": 5
    }
  }
}
```

---

**Endpoint 2: Record License Mint**
```
POST /api/licenses/mint

Body:
{
  "licenseTokenId": "42",
  "licensorIpId": "0xAlic...4e5f",
  "licenseeWallet": "0xBob...123",
  "licenseTermsId": "3",
  "txHash": "0x..."
}

Response:
{
  "success": true,
  "message": "License token recorded",
  "data": {
    "id": "uuid-here",
    "licenseTokenId": "42"
  }
}
```

---

**Endpoint 3: Get User's Owned Licenses**
```
GET /api/licenses/wallet/:address

Response:
{
  "success": true,
  "data": {
    "licenses": [
      {
        "licenseTokenId": "42",
        "licensorIp": {
          "ipId": "0xAlic...4e5f",
          "title": "Sunset Dreams",
          "creator": "0xAlic...4e5f",
          "ipfsCid": "Qm..."
        },
        "terms": {
          "licenseTermsId": "3",
          "type": "commercial_remix",
          "royaltyPercent": 10,
          "commercialUse": true,
          "derivativesAllowed": true
        },
        "mintedAt": "2025-12-12T10:00:00Z",
        "txHash": "0x..."
      }
    ]
  }
}
```

---

**Endpoint 4: Get Licensees for Creator's IP**
```
GET /api/licenses/ip/:ipId/licensees

Response:
{
  "success": true,
  "data": {
    "ipId": "0xAlic...4e5f",
    "totalLicenses": 5,
    "licensees": [
      {
        "wallet": "0xBob...123",
        "licenseTokenId": "42",
        "mintedAt": "2025-12-12T10:00:00Z"
      },
      ...
    ]
  }
}
```

---

### Service Layer Implementation

#### License Service (Frontend)

**File:** `src/services/licenseTokenService.ts`

**Purpose:** Handle all license token minting operations

**Key Functions:**

1. **mintLicenseToken()**
   - Calls Story Protocol SDK
   - Mints License NFT
   - Returns License Token ID
   - Sends confirmation to backend

2. **getLicenseTermsForIp()**
   - Fetches license terms from blockchain
   - Caches in backend
   - Returns formatted terms

3. **getUserLicenses()**
   - Queries blockchain for License NFTs owned by user
   - Fetches associated IP metadata
   - Returns enriched license list

4. **checkIfUserHasLicense()**
   - Checks if user already owns license for specific IP
   - Prevents duplicate minting (if desired)
   - Returns boolean

5. **transferLicense()** (Future)
   - Transfers License NFT to another wallet
   - Updates backend records

---

## User Flow Diagrams

### Flow 1: Simple License Minting

```
User (Bob)
    ↓
[Browse Marketplace]
    ↓
[Click on Alice's IP "Sunset Dreams"]
    ↓
[View License Terms]
    │
    ├─→ If already owns license → Show "You own a license"
    │                             [Create Derivative] button
    │
    └─→ If no license → [Mint License] button
            ↓
      [Click "Mint License"]
            ↓
      [Review Terms Modal Opens]
            ↓
      [Check "I Agree" checkbox]
            ↓
      [Click "Mint License (Sign TX)"]
            ↓
      [MetaMask Popup - Sign Transaction]
            ↓
      [Transaction Processing...]
            ↓
      ┌─────────────────────────────────┐
      │  Story Protocol Blockchain      │
      │  1. Mint License NFT            │
      │  2. Assign Token ID #42         │
      │  3. Transfer to Bob             │
      └─────────────────────────────────┘
            ↓
      [Success! License Token #42 Minted]
            ↓
      [Frontend calls backend API]
      POST /api/licenses/mint
            ↓
      [Backend saves license record]
            ↓
      [Bob's Dashboard updates]
      "My Licenses" → Shows License Token #42
```

---

### Flow 2: License Minting with Derivative Creation

```
User (Bob) owns License Token #42 for Alice's IP
    ↓
[Wants to create derivative artwork]
    ↓
[Goes to "Upload IP" page]
    ↓
[Uploads derivative content]
    ↓
[Backend detects 92% similarity to Alice's IP]
    ↓
┌─────────────────────────────────────────────┐
│  Derivative Detection Dialog                │
│                                             │
│  ⚠️ Similar content detected!               │
│  Original: "Sunset Dreams" by Alice         │
│  Similarity: 92%                            │
│                                             │
│  You own License Token #42 for this IP!    │
│                                             │
│  Options:                                   │
│  ○ Register as derivative (using license)   │
│  ○ Register as original (disputed)          │
│                                             │
│  [Continue]                                 │
└─────────────────────────────────────────────┘
    ↓
[Bob selects "Register as derivative"]
    ↓
[Frontend calls Story Protocol]
registerDerivativeWithLicenseTokens({
  childIpId: bobIpId,
  licenseTokenIds: [42]
})
    ↓
┌─────────────────────────────────────────────┐
│  Story Protocol Blockchain                  │
│  1. Verify Bob owns License Token #42      │
│  2. Link Bob's IP → Alice's IP              │
│  3. Set up automatic royalty split          │
│     (When Bob earns $100, Alice gets $10)   │
└─────────────────────────────────────────────┘
    ↓
[Success! Derivative registered]
    ↓
[Bob's IP page shows]
"Derivative of: Sunset Dreams by Alice"
"Royalty: 10% to parent"
```

---

## Marketplace Integration Strategy

### Phase 1: Display License Information (Week 1)

**Goal:** Show license availability and terms without minting capability

**Tasks:**
1. Update marketplace asset cards to show license badge
2. Add "Licensed" tag to IPs with license terms
3. Display license terms in IP detail view
4. Show royalty percentage prominently
5. Indicate if user already owns a license

**No blockchain calls yet** - just UI/UX foundation

---

### Phase 2: License Minting Core (Week 2)

**Goal:** Enable basic license token minting

**Tasks:**
1. Create `licenseTokenService.ts`
2. Implement `mintLicenseToken()` function
3. Build License Minting Modal component
4. Add "Mint License" button to marketplace
5. Handle transaction signing and confirmation
6. Show success/error states
7. Update user's dashboard to show owned licenses

**Backend:**
1. Create `license_tokens` table
2. Implement `POST /api/licenses/mint` endpoint
3. Implement `GET /api/licenses/wallet/:address` endpoint

---

### Phase 3: License Management (Week 3)

**Goal:** Full license lifecycle management

**Tasks:**
1. "My Licenses" dashboard section
2. License transfer capability (if needed)
3. Creator analytics (who licensed their IP)
4. License usage tracking
5. Integration with derivative registration flow

**Backend:**
1. License statistics endpoints
2. Licensee tracking for creators
3. License activity logs

---

### Phase 4: Advanced Features (Week 4+)

**Goal:** Enhanced licensing features

**Tasks:**
1. Multiple license tiers (personal, commercial, exclusive)
2. Time-limited licenses (expiration)
3. Territory-restricted licenses (geographic)
4. License bundles (multiple IPs in one license)
5. License marketplace (resell licenses)
6. Automated royalty claiming for licensees

---

## Key Decisions Needed

### Decision 1: Minting Fee Strategy

**Question:** Should license minting be free or paid?

**Options:**

**A. Free Minting (defaultMintingFee = 0)**
- Pros:
  - Lower barrier to entry
  - More licenses minted = more potential derivative revenue
  - Encourages adoption
- Cons:
  - Creator doesn't earn upfront
  - Relies entirely on royalty enforcement
  
**B. Paid Minting (defaultMintingFee = 1 WIP or similar)**
- Pros:
  - Immediate revenue for creator
  - Filters out non-serious users
  - Additional revenue stream beyond royalties
- Cons:
  - Reduces number of licenses minted
  - Requires users to have WIP tokens

**Recommendation for MVP:**
- Start with **FREE minting** (0 fee)
- Allow creators to optionally set minting fee
- UI shows "Free to mint" vs "Minting Fee: X WIP"

---

### Decision 2: License Limits

**Question:** Should there be a maximum number of licenses per IP?

**Options:**

**A. Unlimited Licenses**
- Anyone can mint a license anytime
- No scarcity model
- Simple implementation

**B. Limited Licenses**
- Creator sets max supply (e.g., "Only 100 licenses available")
- Creates scarcity and urgency
- Licenses may become valuable
- Requires additional smart contract logic

**Recommendation for MVP:**
- **Unlimited licenses** for simplicity
- Phase 2 can add optional limits

---

### Decision 3: License Display Priority

**Question:** How to organize marketplace - by IPs or by licenses?

**Options:**

**A. IP-First Marketplace (Recommended)**
- Main marketplace shows IP assets
- Each IP card shows "License Available" badge
- Click IP → View Details → Mint License button
- Users discover IPs first, licensing is secondary action

**B. License-First Marketplace**
- Dedicated "License Marketplace" section
- Shows only licensable IPs
- Emphasizes licensing as primary transaction
- IPs without license terms hidden

**Recommendation:**
- **IP-First approach** for MVP
- Filter option: "Show only licensable IPs"
- Clear call-to-action when license available

---

### Decision 4: Auto-Derivative Registration

**Question:** If user owns a license, should derivative registration be automatic or manual?

**Scenario:** Bob owns License Token #42 for Alice's IP, then uploads similar content

**Options:**

**A. Manual Choice (Recommended)**
- Show dialog: "You own a license for this IP!"
- Present options:
  - "Use my license to register as derivative"
  - "Dispute similarity - register as original"
- User makes conscious decision

**B. Automatic Derivative**
- If similarity >= 85% AND user owns license
- Automatically register as derivative using license token
- No user choice (enforced)

**Recommendation:**
- **Manual choice** for transparency
- Users should understand what "derivative" means
- Educational opportunity in the UI

---

## Success Metrics

### Week 1 Metrics (Display Phase)
- [ ] All IPs with license terms show licensing badge
- [ ] License terms viewable on IP detail page
- [ ] UI correctly indicates if user owns license

### Week 2 Metrics (Minting Phase)
- [ ] First license token successfully minted
- [ ] Transaction confirmed on Story Protocol
- [ ] License recorded in backend database
- [ ] User's dashboard shows owned license

### Week 3 Metrics (Management Phase)
- [ ] "My Licenses" section functional
- [ ] Creator can see who licensed their IP
- [ ] License statistics accurate

### Phase 4 Metrics (Advanced)
- [ ] Multiple users minting licenses
- [ ] Derivatives registered using license tokens
- [ ] Royalty payments flowing correctly

---

## Technical Implementation Checklist

### Frontend Components
- [ ] `LicenseMintingModal.tsx` - Mint license dialog
- [ ] `LicenseCard.tsx` - Display license in user dashboard
- [ ] `LicenseTermsDisplay.tsx` - Show license terms clearly
- [ ] `LicenseableIPCard.tsx` - Enhanced marketplace card
- [ ] `MyLicensesSection.tsx` - Dashboard section
- [ ] `CreatorLicenseAnalytics.tsx` - Creator stats

### Frontend Services
- [ ] `licenseTokenService.ts` - Main license operations
- [ ] Add `mintLicenseToken()` function
- [ ] Add `getUserLicenses()` function
- [ ] Add `getLicenseTermsForIp()` function
- [ ] Add `checkIfUserHasLicense()` function

### Backend Endpoints
- [ ] `GET /api/licenses/ip/:ipId/terms` - Get license terms
- [ ] `POST /api/licenses/mint` - Record minted license
- [ ] `GET /api/licenses/wallet/:address` - User's licenses
- [ ] `GET /api/licenses/ip/:ipId/licensees` - Who licensed this IP
- [ ] `GET /api/licenses/stats` - Platform-wide license stats

### Backend Database
- [ ] Create `license_tokens` table
- [ ] Add indexes for performance
- [ ] Add foreign key constraints
- [ ] Migration scripts

### Integration Points
- [ ] Update marketplace API to include license info
- [ ] Update asset detail API to show license terms
- [ ] Update user dashboard to fetch licenses
- [ ] Update creator dashboard to show licensees

### Testing
- [ ] Unit tests for license service
- [ ] Integration tests for minting flow
- [ ] E2E test: Complete license mint flow
- [ ] Test license display in marketplace
- [ ] Test derivative registration with license

---

## Edge Cases to Handle

### Edge Case 1: User Tries to Mint Multiple Licenses for Same IP

**Scenario:** Bob already owns License Token #42 for Alice's IP, tries to mint another

**Options:**
1. **Allow multiple licenses**
   - User can own multiple license tokens for same IP
   - Each token is independent
   - Use case: Reselling licenses?
   
2. **Block duplicate minting**
   - Show message: "You already own a license for this IP"
   - Disable "Mint License" button
   - Prevents duplicate ownership

**Recommendation:** **Block duplicates** unless there's clear use case

---

### Edge Case 2: License Terms Change After Minting

**Scenario:** Alice updates license terms after Bob minted License Token #42

**Behavior:**
- Bob's license uses ORIGINAL terms (Terms ID #3)
- New licenses use NEW terms (Terms ID #4)
- License Token is immutable - terms frozen at mint time

**Implementation:** No action needed - Story Protocol handles this

---

### Edge Case 3: IP Asset Deleted/Disputed After License Minting

**Scenario:** Bob mints license, then Alice's IP gets disputed/removed

**Considerations:**
- License NFT still exists on blockchain
- Backend may remove IP from marketplace
- Bob's license should remain valid (blockchain truth)

**Recommendation:**
- Keep license record active
- Show warning if parent IP disputed
- Don't auto-revoke licenses (blockchain immutable)

---

### Edge Case 4: Gas Price Spike During Minting

**Scenario:** User approves transaction, gas price spikes, transaction fails

**Handling:**
1. Show estimated gas fee BEFORE signing
2. Allow user to set max gas price
3. If transaction fails:
   - Show clear error message
   - Suggest retrying with higher gas limit
   - Don't record failed mint in backend

---

## UI/UX Considerations

### Visual Indicators

**IP Card in Marketplace:**
- 🎫 Badge: "Licensable" (if license terms attached)
- 💰 Badge: "Royalty: 10%" (prominently displayed)
- 🆓 Badge: "Free to Mint" (if no minting fee)
- ✓ Badge: "Licensed" (if user already owns license)

**License Minting Button States:**
- Default: "Mint License" (blue, prominent)
- Disabled: "Already Licensed" (gray)
- Loading: "Minting..." (spinning)
- Success: "View My License" (green)

**License in User Dashboard:**
- License Token ID displayed prominently
- Linked IP preview image
- Terms summary (icons for commercial, derivatives, etc.)
- "Create Derivative" quick action

---

### User Education

**License Concept Explainer:**
Show on first license mint:

```
💡 What is a License Token?

A License Token is like a digital permit that gives you 
permission to use someone's creative work.

✓ You can use the work according to the license terms
✓ The creator keeps ownership
✓ You may need to pay royalties if you earn money
✗ You don't own the original work

Think of it like licensing stock photos or music!
```

**Royalty Explainer:**
```
💰 What are Royalties?

When you mint this license, you agree to pay 10% of any 
revenue you earn using this IP.

Example:
- You use Alice's artwork in your product
- You sell product and earn $100
- You owe Alice $10 (10% royalty)
- Story Protocol automatically enforces this!

Royalties are tracked on-chain and must be paid to maintain 
license validity.
```

---

## Integration with Existing Features

### Connection to Asset Registration Flow

**Current:** User uploads → Registers IP → Attaches license

**Addition:** After license attached:
- Show confirmation: "Your IP is now licensable!"
- Show preview of what licensees will see
- Show link to view in marketplace

---

### Connection to Derivative Flow

**Current:** Similarity detected → Manual derivative registration

**Enhancement:** If similarity detected:
1. Check if user owns license for parent IP
2. If YES:
   - Show: "You own a license! Register as derivative?"
   - Use license token for registration
3. If NO:
   - Show: "Consider minting a license first"
   - Link to mint license from parent IP

---

### Connection to Royalty Dashboard

**Current:** (To be built) Creators claim royalties

**Enhancement:**
- Show royalty sources:
  - "From License #42 (Bob): 0.5 WIP"
  - "From License #43 (Carol): 0.3 WIP"
- Track which licensees generated revenue
- Show royalty payment history per license

---

## Timeline Estimate

### Week 1: Foundation (5 days)
- Day 1-2: Database schema + backend endpoints
- Day 3-4: Frontend license service
- Day 5: Marketplace UI updates (display only)

### Week 2: Core Minting (5 days)
- Day 1-2: License minting modal component
- Day 3: Integration with Story Protocol SDK
- Day 4: Transaction handling + error states
- Day 5: Testing + bug fixes

### Week 3: Management Features (5 days)
- Day 1-2: "My Licenses" dashboard section
- Day 3-4: Creator analytics (licensees)
- Day 5: Integration testing

### Week 4: Polish & Advanced (5 days)
- Day 1-2: Derivative flow integration
- Day 3: User education + tooltips
- Day 4: Performance optimization
- Day 5: Final testing + deployment

**Total:** ~20 working days (~4 weeks)

---

## Next Steps

1. **Review this plan** with team
2. **Make key decisions** (free vs paid minting, unlimited licenses, etc.)
3. **Create GitHub issues** for each component
4. **Set up project board** with phases
5. **Start with Phase 1** (Display only)
6. **Iterative implementation** week by week

---

## Questions for Team Discussion

1. Should we allow multiple licenses per user for same IP?
2. What should default minting fee be? (0 recommended)
3. Do we need license limits (max supply)?
4. Should we build license transfer feature in MVP?
5. How to handle license revocation (if needed)?
6. Should we show global license statistics?
7. Do we need license tiers (personal vs commercial)?
8. Should there be a "popular licenses" section?

---

## Risks & Mitigations

### Risk 1: Low License Minting Adoption

**Risk:** Users don't understand licensing model

**Mitigation:**
- Clear educational content
- Visual explainers
- Example use cases
- "Why mint a license?" section

---

### Risk 2: Gas Fees Too High

**Risk:** Users refuse to mint due to gas costs

**Mitigation:**
- Show gas estimate clearly before signing
- Batch license minting (future)
- Wait for low gas periods (weekend)
- Consider L2 scaling (future)

---

### Risk 3: License Terms Confusion

**Risk:** Users don't read/understand terms

**Mitigation:**
- Visual term indicators (icons)
- Plain language summaries
- Terms comparison table
- Required confirmation checkbox

---

### Risk 4: Royalty Payment Enforcement

**Risk:** Licensees don't pay royalties voluntarily

**Mitigation:**
- Story Protocol enforces on-chain
- Automatic royalty tracking
- Payment required before derivative registration
- Clear terms at mint time

---

## Conclusion

License token minting represents a fundamental shift from ownership-based trading to permission-based licensing. By implementing this feature, we enable a sustainable creator economy where:

- **Creators** earn ongoing royalties from usage
- **Users** get legal permission to use creative works
- **Derivatives** are properly tracked and monetized
- **Royalties** flow automatically through blockchain

This plan provides a structured approach to rolling out license minting across 4 weeks, starting with simple display enhancements and building up to full license lifecycle management.

The key to success is **user education** - helping both creators and licensees understand the value and mechanics of the licensing model. With clear UI/UX and proper onboarding, this feature will unlock new monetization opportunities for creators while providing users with transparent, enforceable usage rights.
