# 🎯 STAGE 5: ROYALTY DISTRIBUTION - COMPREHENSIVE IMPLEMENTATION PLAN

**Version:** 1.0  
**Date:** December 13, 2025  
**Purpose:** Complete planning document for implementing royalty payment, tracking, and claiming functionality  
**Scope:** Stage 5 of Story Protocol Integration (Final Stage)

---

## 📋 TABLE OF CONTENTS

1. [Overview & Architecture](#1-overview--architecture)
2. [Understanding Story Protocol Royalty System](#2-understanding-story-protocol-royalty-system)
3. [Backend Data Architecture](#3-backend-data-architecture)
4. [Frontend User Flows](#4-frontend-user-flows)
5. [Service Layer Design](#5-service-layer-design)
6. [Payment Triggers & Workflows](#6-payment-triggers--workflows)
7. [Revenue Claiming System](#7-revenue-claiming-system)
8. [Analytics & Tracking](#8-analytics--tracking)
9. [UI/UX Requirements](#9-uiux-requirements)
10. [Integration Points](#10-integration-points)

---

## 1️⃣ OVERVIEW & ARCHITECTURE

### **What Stage 5 Accomplishes**

Stage 5 is the **monetization and revenue distribution layer** that makes the entire IP ecosystem financially operational. This stage:

1. **Enables Payments**: Allows users to pay royalties to IP owners when using licensed content
2. **Tracks Revenue**: Monitors all revenue flows through the system for analytics
3. **Facilitates Claims**: Provides creators a way to withdraw earned royalties from their IP Royalty Vaults
4. **Automates Distribution**: Leverages Story Protocol's automatic parent-child royalty splitting
5. **Provides Transparency**: Shows users their earnings, pending royalties, and payment history

### **Core Principles**

**Story Protocol Handles:**
- Automatic royalty splitting between parent and child IPs
- Storage of revenue in IP Royalty Vaults
- Distribution to Royalty Token holders
- On-chain transparency and immutability

**Our Platform Handles:**
- User-friendly payment interfaces
- Off-chain tracking and analytics
- Email notifications for revenue events
- Dashboard visualizations
- Historical payment records
- Tax reporting data

### **Key Difference from Traditional Systems**

**Traditional (Flow Blockchain):**
- Revenue split happens at purchase time
- Fixed percentages
- Immediate distribution to wallets
- Centralized payment splitting

**Story Protocol:**
- Revenue accumulates in IP Royalty Vaults
- Dynamic percentage based on derivative relationships
- Creators claim manually (pull model)
- Decentralized and automatic

---

## 2️⃣ UNDERSTANDING STORY PROTOCOL ROYALTY SYSTEM

### **IP Royalty Vaults - The Foundation**

Every IP Asset gets its own Royalty Vault:
- **Deployed automatically** when first license token is minted OR first derivative is registered
- **Stores all revenue** earned by that IP
- **Linked to 100 Royalty Tokens** (ERC-20 tokens)
- **Immutable and transparent** on-chain

### **Royalty Tokens - The Ownership Mechanism**

Royalty Tokens represent the right to claim revenue:
- **Initial Distribution**: IP Account (the IP itself) receives all 100 tokens
- **Transferable**: Can be sent to other wallets (IP owner, investors, collaborators)
- **Percentage-Based**: Holding 10 tokens = right to claim 10% of vault revenue
- **ERC-20 Standard**: Can be traded, sold, or used in DeFi

### **Royalty Stack - Multi-Level Distribution**

When a derivative IP earns revenue, it must pay ancestors:
- **Child IP License Terms** define what % goes to parent
- **Cumulative Calculation**: If IP3 derives from IP2 derives from IP1:
  - IP1 gets 5% (from license terms)
  - IP2 gets 10% (from license terms)
  - IP3 keeps 85%
  - Total "Royalty Stack" = 15%

### **Payment Flow Architecture**

**Step 1: Payment Initiation**
- External user pays an IP for commercial use
- Payment goes to Royalty Module (Story Protocol contract)

**Step 2: Royalty Module Distribution**
- Module calculates royalty stack percentage
- Splits payment based on derivative relationships
- Routes funds to IP Royalty Vault (direct) or Royalty Policy (for ancestors)

**Step 3: Royalty Policy Handling**
- Holds revenue owed to parent IPs
- Waits for claim transaction
- Uses LAP (Liquid Absolute Percentage) policy by default

**Step 4: Transfer to Vaults**
- When claim is initiated, transfers from Royalty Policy to ancestor IP Royalty Vaults
- Happens automatically during claim transaction

**Step 5: Token-Based Claiming**
- Revenue distributed from vault to Royalty Token holders
- Proportional to token ownership
- Transferred to wallet addresses

### **Whitelisted Payment Tokens**

Only specific tokens can be used for royalty payments:
- **WIP Token**: Native Story Protocol token (address provided by SDK)
- **MERC20**: Test token for Sepolia testnet
- **Future**: USDC, ETH can be whitelisted

### **Pull Model vs Push Model**

**Critical Understanding:**
- Story Protocol uses **PULL MODEL** (not push)
- Revenue does NOT automatically appear in creator wallets
- Creators must **actively claim** by calling claimAllRevenue
- This reduces gas costs and gives creators control over timing

---

## 3️⃣ BACKEND DATA ARCHITECTURE

### **Database Tables to Create**

#### **Table 1: royalty_payments**
Tracks all payment transactions for analytics and history.

**Purpose**: Off-chain record of every payment made through the system

**Fields**:
- `payment_id` (UUID, primary key)
- `tx_hash` (string, indexed) - Blockchain transaction hash
- `payer_address` (string, indexed) - Who paid
- `payer_ip_id` (string, nullable) - If payer is an IP Asset
- `receiver_ip_id` (string, indexed) - IP that received payment
- `token_address` (string) - Payment token (WIP, USDC, etc)
- `amount_paid` (decimal) - Amount in token units
- `amount_paid_wei` (string) - Exact amount in wei (for precision)
- `payment_type` (enum) - 'license_mint', 'direct_payment', 'derivative_payment', 'tip'
- `related_license_token_id` (bigint, nullable) - If from license minting
- `payment_timestamp` (timestamp)
- `block_number` (bigint)
- `notes` (text, nullable)
- `created_at` (timestamp)

**Indexes**:
- `receiver_ip_id` for fast creator dashboard queries
- `payer_address` for user payment history
- `tx_hash` for transaction lookups
- `payment_timestamp` for date-range queries

**Use Cases**:
- Display payment history in creator dashboard
- Show "who paid me" information
- Generate revenue analytics charts
- Export payment data for tax purposes
- Detect unusual payment patterns

---

#### **Table 2: royalty_claims**
Tracks when creators claim revenue from their vaults.

**Purpose**: Historical record of claim transactions

**Fields**:
- `claim_id` (UUID, primary key)
- `tx_hash` (string, indexed)
- `ancestor_ip_id` (string, indexed) - IP claiming revenue
- `claimer_address` (string, indexed) - Wallet that claimed
- `child_ip_ids` (jsonb) - Array of child IPs claimed from
- `currency_tokens` (jsonb) - Array of token addresses claimed
- `total_claimed` (jsonb) - Map of {token: amount}
- `total_claimed_usd` (decimal, nullable) - USD value at claim time
- `claim_timestamp` (timestamp)
- `block_number` (bigint)
- `created_at` (timestamp)

**Indexes**:
- `ancestor_ip_id` for IP-specific claim history
- `claimer_address` for user claim history
- `claim_timestamp` for recent claims

**Use Cases**:
- Show "claimed successfully" confirmation
- Display claim history
- Calculate total lifetime earnings
- Detect claim patterns

---

#### **Table 3: pending_royalties_cache**
Caches claimable amounts to reduce blockchain queries.

**Purpose**: Performance optimization - cache on-chain claimable amounts

**Fields**:
- `cache_id` (UUID, primary key)
- `ip_id` (string, unique indexed)
- `claimer_address` (string)
- `token_address` (string)
- `claimable_amount` (decimal)
- `claimable_amount_wei` (string)
- `last_checked` (timestamp)
- `last_claim_tx_hash` (string, nullable)
- `last_claim_timestamp` (timestamp, nullable)
- `cache_valid_until` (timestamp)
- `updated_at` (timestamp)

**Indexes**:
- `ip_id` for fast lookups
- `cache_valid_until` for cache invalidation

**Cache Strategy**:
- Refresh every 5 minutes
- Invalidate immediately after successful claim
- Invalidate after new payment to this IP
- Show "Last updated X minutes ago" in UI

**Use Cases**:
- Display "You have X $WIP to claim" without blockchain query every time
- Reduce RPC calls to Story Protocol
- Improve dashboard load speed

---

#### **Table 4: royalty_token_distributions**
Tracks when IP owners distribute Royalty Tokens to other addresses.

**Purpose**: Monitor Royalty Token ownership changes

**Fields**:
- `distribution_id` (UUID, primary key)
- `ip_id` (string, indexed)
- `from_address` (string) - Usually the IP Account
- `to_address` (string, indexed)
- `token_amount` (integer) - Number of tokens (out of 100)
- `reason` (enum) - 'investor_share', 'collaborator_payment', 'sold', 'gifted', 'other'
- `tx_hash` (string)
- `timestamp` (timestamp)
- `notes` (text, nullable)
- `created_at` (timestamp)

**Indexes**:
- `ip_id` for IP-specific distributions
- `to_address` for "where did I receive tokens from"

**Use Cases**:
- Show "Who can claim from my IP vault" information
- Alert IP owners when they transfer tokens
- Track collaborative revenue sharing arrangements

---

#### **Table 5: revenue_snapshots**
Daily/weekly snapshots for analytics and charts.

**Purpose**: Time-series data for dashboard charts

**Fields**:
- `snapshot_id` (UUID, primary key)
- `ip_id` (string, indexed)
- `snapshot_date` (date, indexed)
- `snapshot_period` (enum) - 'daily', 'weekly', 'monthly'
- `payments_received_count` (integer)
- `payments_received_total` (jsonb) - Map of {token: amount}
- `claims_made_count` (integer)
- `claims_made_total` (jsonb)
- `pending_claimable` (jsonb)
- `active_licenses_count` (integer)
- `derivative_count` (integer)
- `created_at` (timestamp)

**Indexes**:
- Composite: `(ip_id, snapshot_date)`
- `snapshot_date` for time-range queries

**Use Cases**:
- "Revenue over time" line charts
- "Best performing IPs" analytics
- Email reports: "This week you earned..."

---

### **Backend API Endpoints to Create**

#### **Payment Tracking Endpoints**

**POST /api/royalty/track-payment**
- Called by frontend AFTER successful payRoyaltyOnBehalf transaction
- Stores payment details in royalty_payments table
- Returns confirmation

**GET /api/royalty/payments/:ipId**
- Fetches all payments received by an IP
- Supports pagination, date filters
- Returns sorted payment history

**GET /api/royalty/payments/sent/:walletAddress**
- Fetches all payments made BY a user
- For "My Payment History" page

---

#### **Claimable Revenue Endpoints**

**GET /api/royalty/claimable/:ipId**
- Returns cached claimable amount from pending_royalties_cache
- If cache expired, queries blockchain and updates cache
- Fast response for dashboard

**POST /api/royalty/refresh-claimable/:ipId**
- Forces blockchain query to refresh cache
- Called when user clicks "Refresh" button
- Returns updated claimable amount

---

#### **Claim Tracking Endpoints**

**POST /api/royalty/track-claim**
- Called AFTER successful claimAllRevenue transaction
- Stores claim details in royalty_claims table
- Invalidates pending_royalties_cache
- Triggers success notification

**GET /api/royalty/claims/:ipId**
- Fetches claim history for an IP
- Shows "You claimed X on date Y" history

---

#### **Analytics Endpoints**

**GET /api/royalty/analytics/:ipId**
- Returns comprehensive analytics:
  - Total lifetime earnings (per token)
  - Total claims made
  - Pending claimable
  - Number of payers
  - Average payment amount
  - Revenue trend (last 30 days)

**GET /api/royalty/dashboard-summary/:walletAddress**
- Returns summary for all IPs owned by user:
  - Total pending across all IPs
  - Total claimed lifetime
  - Recent payments (last 10)
  - Top earning IPs

---

#### **Royalty Token Distribution Endpoints**

**POST /api/royalty/track-token-distribution**
- Called when IP owner transfers Royalty Tokens
- Stores in royalty_token_distributions table
- Sends notification to recipient

**GET /api/royalty/token-holders/:ipId**
- Returns list of addresses holding Royalty Tokens for an IP
- Shows percentage owned by each
- Used in "Revenue Sharing" settings page

---

### **Data Flow: Payment to Database**

**When External User Pays an IP:**

1. Frontend calls `storyProtocolService.payRoyaltyOnBehalf()`
2. Transaction is broadcast to blockchain
3. User waits for confirmation
4. Transaction succeeds → returns `txHash`
5. Frontend immediately calls `POST /api/royalty/track-payment` with:
   - txHash
   - receiverIpId
   - payerAddress
   - tokenAddress
   - amount
   - paymentType: 'direct_payment'
6. Backend stores in royalty_payments table
7. Backend invalidates pending_royalties_cache for receiverIpId
8. Backend triggers webhook/notification to IP owner
9. Frontend shows success message

---

### **Data Flow: Claim to Database**

**When Creator Claims Revenue:**

1. Frontend calls `storyProtocolService.claimAllRevenue()`
2. Transaction succeeds → returns `{ claimedTokens, txHash }`
3. Frontend calls `POST /api/royalty/track-claim` with:
   - txHash
   - ancestorIpId
   - claimerAddress
   - childIpIds array
   - currencyTokens array
   - claimedTokens map
4. Backend stores in royalty_claims table
5. Backend updates pending_royalties_cache to 0
6. Backend creates revenue_snapshot entry
7. Backend sends "Claim successful" email
8. Frontend shows "Claimed X $WIP successfully!"

---

### **Caching Strategy Details**

**Why Cache Claimable Amounts?**
- Blockchain queries are slow (500ms - 2s)
- RPC rate limits exist
- Users check dashboard frequently
- Real-time precision not critical (5-minute delay acceptable)

**Cache Refresh Triggers:**
- Every 5 minutes (background job)
- After successful claim (immediate)
- After new payment received (immediate via webhook or polling)
- Manual refresh button click

**Cache Invalidation Rules:**
- Mark as stale after claim transaction
- Recompute after payment event detected
- Expire after 10 minutes even if no events

---

### **Database Query Optimization**

**High-Frequency Queries:**
- Dashboard summary (user opens dashboard)
- Claimable amount check (dashboard auto-refresh)
- Recent payments list (dashboard display)

**Optimization Strategies:**
- Composite indexes on (ip_id, timestamp)
- Materialized views for analytics
- Read replicas for reporting queries
- Database connection pooling
- Query result caching (Redis layer optional)

---

### **Data Consistency Considerations**

**Challenge**: Off-chain database vs on-chain truth

**Solution Strategy**:
1. Treat blockchain as source of truth
2. Backend database is for UX optimization only
3. Always verify critical data on-chain before actions
4. Implement reconciliation jobs:
   - Nightly: Compare database payments vs blockchain events
   - Detect missing records
   - Flag discrepancies for manual review

**Reconciliation Job Design**:
- Query Story Protocol events for last 7 days
- Compare with royalty_payments table
- Insert missing payments
- Mark mismatched records
- Send alert to admin if >10 discrepancies found

---

## 4️⃣ FRONTEND USER FLOWS

### **User Persona 1: Licensee (Paying Royalties)**

**Scenario**: Bob minted a license for Alice's IP and created commercial content. Now Bob needs to pay royalties to Alice.

**Entry Points**:
1. From "My Licenses" page → "Pay Royalty" button
2. From licensed IP detail page → "Send Royalty Payment"
3. Notification reminder: "You have active licenses. Consider paying royalties."

**Flow Steps**:

1. **Select Payment Source**
   - User navigates to "My Licenses"
   - Sees list of all licensed IPs
   - Each card shows: IP title, license terms, "Pay Royalty" button

2. **Payment Dialog Opens**
   - Modal displays:
     - IP title and owner
     - License terms (royalty percentage if derivative)
     - Payment token selector (WIP, USDC, ETH)
     - Amount input field
     - Current wallet balance
     - Estimated gas fee

3. **Enter Payment Amount**
   - User types amount (e.g., "10 WIP")
   - UI shows:
     - USD equivalent (if exchange rate available)
     - "You're paying Alice's IP for commercial use"
     - Breakdown: "10 WIP → Alice receives based on royalty stack"

4. **Confirm Payment**
   - User clicks "Send Payment"
   - Wallet popup for transaction signature
   - Loading state: "Processing payment..."

5. **Transaction Processing**
   - Blockchain confirmation
   - Progress indicator with tx hash link

6. **Success State**
   - Green checkmark animation
   - Message: "Payment successful! Alice can now claim this revenue."
   - Transaction details: amount, timestamp, tx hash
   - Option: "View on Explorer"
   - Backend tracking API called automatically

7. **Post-Payment State**
   - Payment appears in "My Payment History"
   - Badge on license card: "Last paid 2 days ago"

---

### **User Persona 2: IP Creator (Claiming Revenue)**

**Scenario**: Alice's IP has earned royalties from Bob's payments and derivative sales. Alice wants to claim her earnings.

**Entry Points**:
1. Dashboard notification: "You have 15 WIP to claim!"
2. Creator Dashboard → "Claimable Revenue" card
3. Email notification: "Your IP earned revenue this week"

**Flow Steps**:

1. **Dashboard Overview**
   - Creator sees "Earnings Summary" widget:
     - Total Pending: "15.5 WIP ($23.25)"
     - Total Claimed: "100 WIP (lifetime)"
     - Breakdown by IP (if multiple)
     - "Claim All" button (primary CTA)

2. **Claim Details View**
   - User clicks IP to see claim breakdown:
     - Direct payments: "10 WIP from 5 payments"
     - Derivative royalties: "5.5 WIP from child IPs"
     - List of child IPs contributing
     - Last updated: "2 minutes ago" (cache timestamp)
     - "Refresh" button to force blockchain check

3. **Initiate Claim**
   - User clicks "Claim Now"
   - Confirmation modal shows:
     - Total amount to claim per token
     - Which child IPs claiming from
     - Gas fee estimate
     - "After claiming, funds will be in your wallet"

4. **Transaction Execution**
   - Wallet signature request
   - Loading: "Claiming revenue from IP Royalty Vault..."
   - Progress bar with steps:
     - Transfer from Royalty Policy to Vault
     - Distribute to Royalty Token holders
     - Transfer to your wallet

5. **Success State**
   - Confetti animation
   - Message: "Successfully claimed 15.5 WIP!"
   - New wallet balance displayed
   - Transaction hash and explorer link
   - Automatic backend tracking

6. **Post-Claim State**
   - Pending balance updates to 0
   - "Last claimed 1 minute ago"
   - Claim appears in "Claim History" tab
   - Email confirmation sent

---

### **User Persona 3: Derivative Creator (Child IP with Parent Royalty)**

**Scenario**: Charlie created a derivative of Alice's IP. When Charlie's IP earns money, Alice automatically gets her cut. Charlie needs to understand this.

**Educational Flow**:

1. **During Derivative Registration**
   - After derivative link created, show explainer:
     - "Your IP is linked to Alice's IP (parent)"
     - "Alice's license terms: 10% royalty on commercial use"
     - "When your IP earns 100 WIP, Alice automatically receives 10 WIP"
     - Diagram showing revenue flow

2. **Dashboard Transparency**
   - Charlie's IP dashboard shows:
     - "Revenue Sharing Active"
     - Parent IPs list: "Alice's IP (10%)"
     - Effective keep rate: "You keep 90%"
     - Visual: pie chart of revenue split

3. **When Payment Arrives**
   - Notification: "Your IP received 100 WIP payment"
   - Breakdown shown:
     - Total received: 100 WIP
     - Your share: 90 WIP (claimable)
     - Alice's share: 10 WIP (auto-distributed)
   - Transparency builds trust

---

### **User Persona 4: Multi-Token Holder (Revenue Sharing Partner)**

**Scenario**: David invested in Alice's IP by buying 30 of her 100 Royalty Tokens. He wants to claim his 30% share.

**Flow Steps**:

1. **Discovery**
   - David sees in wallet: "30 Royalty Tokens for IP #123"
   - Clicks to see details
   - Redirected to platform: "You own 30% of IP #123's revenue"

2. **Revenue Dashboard**
   - Shows claimable amount: "4.5 WIP (your 30% share)"
   - Alice (IP owner) has claimed her 70%
   - David clicks "Claim My Share"

3. **Claim Process**
   - Similar to creator claim flow
   - Automatic calculation: total vault × token percentage
   - Claims only his proportional share

4. **Investment Tracking**
   - Optional feature: ROI calculator
   - "You invested X, earned Y, ROI = Z%"
   - Secondary market link: "Sell your tokens"

---

### **Flow Decision Points**

**When to Show "Pay Royalty" Button:**
- User owns a license token for the IP
- OR user is registering derivative (prompt to pay parent)
- OR user is using IP commercially (honor system + reminders)

**When to Show "Claim Revenue" Button:**
- User owns Royalty Tokens for an IP
- Claimable amount > 0
- Cache shows pending balance
- Prominent placement in dashboard

**When to Force Payment (Optional Future Feature):**
- For derivatives: require periodic royalty payments
- Escrow system: hold derivative revenue until parent is paid
- Platform could enforce payment before allowing certain actions

---

## 5️⃣ SERVICE LAYER DESIGN

### **Royalty Service Architecture**

**New Service: royaltyService.ts**

**Purpose**: Centralize all royalty-related blockchain and backend operations

**Responsibilities**:
- Wrap Story Protocol royalty SDK methods
- Handle error cases gracefully
- Provide user-friendly error messages
- Manage transaction states
- Coordinate with backend API

---

### **Service Methods Breakdown**

#### **Payment Methods**

**Method: payRoyaltyToIP**

**Purpose**: External user pays royalty to an IP

**Parameters**:
- receiverIpId: Address of IP receiving payment
- amount: bigint (in wei)
- tokenAddress: Address of payment token (WIP, USDC, etc)
- paymentType: 'license_use' | 'tip' | 'commercial_use'
- notes: Optional string for payment context

**Process**:
1. Validate user has sufficient token balance
2. Check token allowance for Royalty Module
3. If needed, request token approval first
4. Call storyProtocolService.payRoyaltyOnBehalf
5. Wait for transaction confirmation
6. On success, call backend to track payment
7. Show success notification
8. Update UI with new balance

**Error Handling**:
- Insufficient balance → Show "Not enough WIP" message
- No approval → Auto-request approval, then retry payment
- Transaction rejected → Show "Transaction cancelled"
- Network error → Show "Network issue, please retry"
- Success but backend tracking fails → Log error, payment still valid

---

**Method: payRoyaltyFromIP**

**Purpose**: One IP pays royalty to another IP (derivative to parent)

**Parameters**:
- payerIpId: Address of IP making payment (user owns this)
- receiverIpId: Address of parent IP
- amount: bigint
- tokenAddress: Address
- reason: 'derivative_revenue' | 'license_obligation'

**Process**:
Similar to payRoyaltyToIP but:
- Uses payerIpId instead of zeroAddress
- Validates user owns/controls payer IP
- Shows in UI as "IP-to-IP payment"

---

#### **Claimable Amount Methods**

**Method: getClaimableRevenue**

**Purpose**: Check how much revenue an IP can claim

**Parameters**:
- ipId: Address of IP
- claimerAddress: Address of claimer (token holder)
- tokenAddress: Address of revenue token
- forceRefresh: boolean (skip cache, query blockchain)

**Process**:
1. If !forceRefresh, query backend cache API
2. If cache valid, return cached amount
3. If forceRefresh or cache expired:
   - Call storyProtocolService.claimableRevenue
   - Update backend cache
   - Return blockchain result
4. Format result with token symbol and USD value

**Return**:
- amount: bigint
- formatted: string (e.g., "15.5 WIP")
- usdValue: number (if exchange rate available)
- lastUpdated: timestamp

---

**Method: refreshClaimableAmount**

**Purpose**: Force refresh of claimable amount from blockchain

**Parameters**:
- ipId: Address
- claimerAddress: Address
- tokenAddress: Address

**Process**:
1. Show loading state in UI
2. Call blockchain query
3. Update backend cache
4. Return refreshed amount
5. Show "Updated" indicator

---

#### **Claim Methods**

**Method: claimRevenue**

**Purpose**: Claim all revenue from IP Royalty Vault

**Parameters**:
- ancestorIpId: Address of IP claiming for
- claimerAddress: Address of claimer
- currencyTokens: Address[] (tokens to claim)
- childIpIds: Address[] (children to claim from)
- royaltyPolicyAddress: Address (LAP policy)

**Process**:
1. Pre-flight check: get claimable amount
2. If amount === 0, show "Nothing to claim" message
3. Confirm claim with user (show modal)
4. Call storyProtocolService.claimAllRevenue
5. Show transaction progress
6. Wait for confirmation
7. On success:
   - Parse claimedTokens from response
   - Call backend track-claim API
   - Invalidate cache
   - Update UI balances
   - Show success animation
   - Send analytics event

**Error Handling**:
- No claimable amount → Show informational message
- Transaction fails → Show error, suggest trying again
- Partial claim success → Log warning, track what succeeded
- Backend tracking fails → Claim still succeeded on-chain, show warning

---

**Method: batchClaimRevenue**

**Purpose**: Claim from multiple IPs in one transaction (if user owns multiple)

**Parameters**:
- ancestorIps: Array of { ipId, claimer, childIpIds, currencyTokens }

**Process**:
1. Validate all IPs owned by user
2. Calculate total claimable across all IPs
3. Show summary: "Claim from 5 IPs totaling 50 WIP"
4. User confirms
5. Call storyProtocolService.batchClaimAllRevenue
6. Process response for each IP
7. Track each claim in backend
8. Show aggregated success message

---

#### **Helper Methods**

**Method: getRoyaltyVaultAddress**

**Purpose**: Get the vault address for an IP

**Parameters**:
- ipId: Address

**Returns**:
- vaultAddress: Address

**Use Cases**:
- Link to vault on block explorer
- Advanced users checking vault directly
- Debugging payment flows

---

**Method: getTokenHolders**

**Purpose**: Get list of addresses holding Royalty Tokens for an IP

**Parameters**:
- ipId: Address

**Process**:
1. Query backend API: GET /api/royalty/token-holders/:ipId
2. Backend queries blockchain for ERC-20 transfers
3. Returns map of { address: tokenCount }

**Returns**:
- Array of { address, tokenCount, percentage }

**Use Cases**:
- "Who can claim from my IP" display
- Revenue sharing transparency
- Ownership verification

---

### **Service Integration with Story Protocol SDK**

**Initialization**:
- Royalty service depends on initialized StoryProtocolService
- Requires user wallet connection
- Needs access to publicClient for read operations

**Transaction Management**:
- All write operations return { txHash }
- Service tracks transaction state: pending, confirmed, failed
- Provides tx receipt for detailed info
- Emits events for UI to listen to

**Token Handling**:
- Auto-detects WIP token address from SDK config
- Supports multiple token types
- Handles token approvals transparently
- Checks balances before operations

---

### **Error Handling Strategy**

**User-Facing Errors (Graceful)**:
- "Insufficient WIP balance" → Show balance, suggest getting more
- "Transaction rejected" → "You cancelled the transaction"
- "Network congestion" → "High gas fees right now, try later?"

**Technical Errors (Logged)**:
- RPC errors → Log, retry with exponential backoff
- Contract reverts → Parse revert reason, show specific message
- Cache errors → Fallback to blockchain query
- Backend API errors → Blockchain is source of truth, continue

**Recovery Mechanisms**:
- Retry failed transactions with user confirmation
- Cache fallbacks if backend unavailable
- Blockchain query fallback if cache stale
- Manual refresh button always available

---

## 6️⃣ PAYMENT TRIGGERS & WORKFLOWS

### **Trigger 1: License Token Minting**

**When it happens**: User mints a license token for an IP

**Automatic Payment Flow**:
1. User calls mintLicenseTokens with defaultMintingFee
2. Story Protocol charges the fee automatically
3. Fee goes to IP Royalty Vault
4. Frontend detects successful mint
5. Backend tracks payment via POST /api/royalty/track-payment:
   - payment_type: 'license_mint'
   - amount: defaultMintingFee
   - related_license_token_id: returned token ID

**No Additional User Action Needed** - payment is atomic with minting

---

### **Trigger 2: Direct Commercial Usage Payment**

**When it happens**: User has a license and uses the IP commercially, now paying royalty

**Manual Payment Flow**:
1. User navigates to "My Licenses" page
2. Selects licensed IP
3. Clicks "Pay Royalty"
4. Enters amount based on usage/revenue earned
5. Confirms payment
6. Transaction executes
7. Payment tracked in backend

**Optional: Usage Reporting**:
- User reports usage: "I made $1000 from this IP"
- Platform calculates royalty: "You owe 10% = $100"
- Suggests payment amount in WIP equivalent
- User pays suggested amount or custom

---

### **Trigger 3: Derivative IP Revenue**

**When it happens**: Derivative IP earns money, must pay parent

**Automatic Calculation**:
1. Derivative IP receives payment (via payRoyaltyOnBehalf)
2. Story Protocol automatically splits based on royalty stack
3. Parent's share goes to Royalty Policy contract
4. Child's share goes to child's vault
5. No manual calculation needed

**Manual Top-Up Option**:
- If derivative creator wants to pay parent directly
- Use payRoyaltyFromIP method
- Specify payerIpId (child IP) and receiverIpId (parent IP)

---

### **Trigger 4: Tips/Donations**

**When it happens**: User loves an IP and wants to tip the creator

**Flow**:
1. User views IP detail page
2. Clicks "Tip Creator" button
3. Enters tip amount
4. Payment processed as direct royalty payment
5. Creator receives full tip (no split)

**UI Considerations**:
- Heart icon or "☕ Buy Creator a Coffee" style
- Preset amounts: 1 WIP, 5 WIP, 10 WIP, Custom
- Message option: "Include a note with your tip"
- Public tip wall (optional): "Recent tips from supporters"

---

### **Trigger 5: Platform-Mediated Sales**

**Future Feature**: Platform could facilitate IP sales with automatic royalty

**Flow**:
1. Buyer purchases content/product using IP
2. Platform collects payment in fiat or crypto
3. Platform converts to WIP
4. Platform calls payRoyaltyOnBehalf on buyer's behalf
5. Revenue flows to IP owner

**Example**:
- Merchandise store selling products with registered IP designs
- Video game selling in-game items based on licensed IPs
- Music streaming paying artists per play

---

### **Payment Workflow Components**

**Pre-Payment Validation**:
- Check user wallet balance
- Verify token allowance
- Validate IP exists and has vault
- Confirm payment token is whitelisted
- Calculate gas fee estimate

**Transaction Execution**:
- Request wallet signature
- Show pending state with spinner
- Display tx hash immediately (for transparency)
- Poll for confirmation (max 5 minutes)
- Handle confirmation success/failure

**Post-Payment Actions**:
- Call backend tracking API
- Refresh claimable amounts cache for receiver
- Show success notification
- Update payment history UI
- Send email to IP owner (optional)
- Update analytics

---

### **Payment Amount Suggestions**

**For License Usage**:
- Show license terms royalty percentage
- Suggest: "Based on $X revenue, you should pay Y WIP"
- Formula: `revenue * royalty_percentage * wip_exchange_rate`

**For Tips**:
- Preset buttons: Small, Medium, Large, Custom
- Show USD equivalent
- "Most people tip 5 WIP" social proof

**For Derivative Obligations**:
- Show accumulated usage time/revenue
- Calculate owed amount from license terms
- "Your derivative earned X, parent is owed Y"

---

## 7️⃣ REVENUE CLAIMING SYSTEM

### **Claimable Revenue Dashboard**

**Widget Design**:

**Primary Display**:
- Large number: "15.5 WIP" (claimable amount)
- USD equivalent: "≈ $23.25"
- Status badge: "Ready to Claim" (green) or "Nothing to claim" (gray)
- Last updated: "Updated 3 minutes ago"
- Refresh icon button

**Breakdown Section**:
- Direct Payments: "10.0 WIP from 8 payments"
- Derivative Royalties: "5.5 WIP from 2 child IPs"
- Click to expand: list of child IPs with amounts

**Action Button**:
- "Claim Now" (primary CTA)
- Disabled if amount === 0
- Shows loading state during transaction
- Success confetti animation

---

### **Multi-Token Claiming**

**Scenario**: IP has earnings in both WIP and USDC

**UI Display**:
- Tabbed or separate cards per token
- WIP: 15.5 claimable
- USDC: 10.0 claimable
- Checkbox selection: "Claim both in one transaction"
- Gas fee shown for batch claim

**Claiming Process**:
- Single call to claimAllRevenue with currencyTokens array
- Both tokens claimed atomically
- Both amounts appear in wallet after confirmation

---

### **Child IP Selection**

**For Parent IPs with Multiple Children**:

**Problem**: claimAllRevenue requires listing childIpIds array

**Solution**:
1. Backend maintains mapping: parentIpId → [childIpId1, childIpId2, ...]
2. Frontend fetches: GET /api/royalty/child-ips/:parentIpId
3. Pass full array to claimAllRevenue
4. UI shows: "Claiming from 5 derivative works"

**Optimization**:
- If >10 children, paginate or use most recent N
- Option: "Claim from all children" vs "Select specific"
- Advanced users may want to claim from subset

---

### **Claim History Display**

**Table Columns**:
- Date/Time
- Amount (per token)
- USD Value (at claim time)
- Child IPs (if from derivatives)
- Transaction Hash (link to explorer)
- Status (confirmed)

**Filters**:
- Date range picker
- Token filter (WIP, USDC, All)
- Amount range
- Export CSV button

**Use Cases**:
- "How much have I earned lifetime?"
- "When did I last claim?"
- Tax reporting
- Proof of earnings for investors

---

### **Automatic Claim (Future Feature)**

**Concept**: Auto-claim when amount reaches threshold

**Implementation**:
- User sets preference: "Auto-claim when ≥ 10 WIP"
- Platform monitoring job checks pending amounts
- When threshold reached, send notification: "Ready to auto-claim?"
- User approves, transaction executes
- Or: User grants platform approval (gasless meta-transactions)

**Risks**:
- Gas fees may be high at bad times
- User loses control over timing
- Security concerns with automated transactions

**Recommendation**: Keep manual claiming for MVP, consider automation in Phase 2

---

### **Claim Gas Optimization**

**Problem**: Gas fees can be significant, especially for small claims

**Solutions**:

1. **Batch Claiming**: Claim from multiple IPs in one transaction
2. **Threshold Suggestions**: "Wait until you have ≥ X to claim (gas-efficient)"
3. **Gas Price Monitoring**: "Gas is low right now, good time to claim!"
4. **Layer 2 Future**: If Story Protocol expands to L2, much cheaper claims

---

### **Claim Notifications**

**When to Notify**:
- Claimable amount >threshold (e.g., > 5 WIP)
- Been >7 days since last claim
- User just received large payment
- Weekly summary: "You earned X this week"

**Notification Channels**:
- Email (primary)
- In-app notification badge
- Optional: Discord webhook, Telegram bot
- Push notifications (mobile app future)

**Email Template**:
```
Subject: You have 15.5 WIP to claim! 💰

Hi Alice,

Your IP "My Original Story" has earned royalties:
- 8 direct payments: 10.0 WIP
- Derivative royalties: 5.5 WIP
- Total claimable: 15.5 WIP (≈ $23.25)

[Claim Now Button]

Questions? Reply to this email.
```

---

## 8️⃣ ANALYTICS & TRACKING

### **Creator Analytics Dashboard**

**Section 1: Revenue Overview**

**Metrics**:
- Total Lifetime Earnings (all-time sum of claimed revenue)
- Total Pending (sum of all claimable amounts across IPs)
- Number of Payments Received
- Number of Unique Payers
- Average Payment Size

**Visualization**:
- Big numbers with trend indicators (↑ 15% from last month)
- Color coding: green for positive, red for zero

---

**Section 2: Revenue Timeline**

**Chart Type**: Line chart

**Data**:
- X-axis: Time (daily/weekly/monthly toggle)
- Y-axis: Revenue amount (WIP)
- Lines:
  - Payments received (blue)
  - Claims made (green)
  - Pending claimable (dashed yellow)

**Interactivity**:
- Hover to see exact values
- Click date to see payment list
- Zoom in/out

---

**Section 3: Top Earning IPs**

**Display**: Sortable table or card grid

**Columns**:
- IP Title (thumbnail)
- Total Earnings
- Pending Claimable
- Number of Licensees
- Number of Derivatives
- Last Payment Date

**Sorting**:
- By total earnings (default)
- By pending amount
- By recent activity
- By derivative count

---

**Section 4: Revenue Sources**

**Chart Type**: Pie chart

**Breakdown**:
- Direct payments (X%)
- License minting fees (Y%)
- Derivative royalties (Z%)

**Use Case**: Understand where money comes from

---

**Section 5: Payer Insights**

**Display**: List of top payers

**Info per Payer**:
- Wallet address (truncated with copy button)
- Total paid
- Number of payments
- Last payment date
- Badge: "Top Supporter" if >threshold

**Use Case**: Thank top supporters, build community

---

### **Platform-Wide Analytics (Admin View)**

**Metrics**:
- Total Royalties Paid (all users)
- Total Claims Made
- Number of Active IPs with Earnings
- Average Time Between Payment and Claim
- Most Profitable IPs
- Highest Single Payment

**Use Cases**:
- Monitor platform health
- Detect anomalies
- Marketing materials: "Our creators earned $X"
- Investor reports

---

### **Analytics API Endpoints**

**GET /api/royalty/analytics/overview/:walletAddress**
- Returns aggregated stats for all IPs owned by wallet

**GET /api/royalty/analytics/timeline/:ipId**
- Returns time-series data for charts

**GET /api/royalty/analytics/top-payers/:ipId**
- Returns list of top payers

**GET /api/royalty/analytics/platform-summary** (admin only)
- Returns platform-wide metrics

---

### **Data Export Features**

**CSV Export**:
- Payment history
- Claim history
- Revenue summary

**Use Cases**:
- Tax reporting
- Accounting integration
- External analysis

**Fields in CSV**:
- Date, Amount, Token, USD Value, Payer, Transaction Hash, Status

---

## 9️⃣ UI/UX REQUIREMENTS

### **Dashboard Layout**

**Creator Dashboard Structure**:

```
┌─────────────────────────────────────────────────┐
│  🏠 Creator Dashboard                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  💰 EARNINGS SUMMARY                            │
│  ┌───────────────┬───────────────┬──────────┐  │
│  │ Total Pending │ Total Claimed │ Active   │  │
│  │ 15.5 WIP      │ 100 WIP       │ IPs: 3   │  │
│  │ ≈ $23.25      │ ≈ $150.00     │          │  │
│  └───────────────┴───────────────┴──────────┘  │
│  [Claim All] button                             │
│                                                 │
│  📊 REVENUE TIMELINE                            │
│  [Line chart here]                              │
│                                                 │
│  💎 YOUR IPs                                    │
│  ┌─────────────────────────────────┐           │
│  │ IP: "My Original Story"         │           │
│  │ Pending: 10 WIP [Claim]         │           │
│  │ Derivatives: 2                  │           │
│  │ Last Payment: 2 days ago        │           │
│  └─────────────────────────────────┘           │
│                                                 │
│  📜 RECENT ACTIVITY                             │
│  [Payment history table]                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### **Payment Modal Design**

**Pay Royalty Modal**:

```
┌─────────────────────────────────────────┐
│  💸 Pay Royalty to IP                   │
├─────────────────────────────────────────┤
│                                         │
│  IP: "Alice's Original Story"           │
│  Owner: 0x1234...5678                   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Payment Token:                  │   │
│  │ [v] WIP ▼                       │   │
│  │                                 │   │
│  │ Amount:                         │   │
│  │ [___10.0___] WIP                │   │
│  │ ≈ $15.00 USD                    │   │
│  │                                 │   │
│  │ Your Balance: 50.0 WIP          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Reason (optional):                     │
│  [v] Commercial Use ▼                   │
│                                         │
│  Gas Fee: ~0.002 ETH                    │
│                                         │
│  [Cancel]  [Send Payment]               │
│                                         │
└─────────────────────────────────────────┘
```

---

### **Claim Modal Design**

**Claim Revenue Modal**:

```
┌─────────────────────────────────────────┐
│  🎉 Claim Your Revenue                  │
├─────────────────────────────────────────┤
│                                         │
│  IP: "My Original Story"                │
│                                         │
│  Claimable Amount:                      │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃  15.5 WIP                       ┃  │
│  ┃  ≈ $23.25 USD                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                         │
│  Revenue Sources:                       │
│  • Direct payments: 10.0 WIP            │
│  • Derivative royalties: 5.5 WIP        │
│    - From "Bob's Remix" (3.0 WIP)       │
│    - From "Charlie's Cover" (2.5 WIP)   │
│                                         │
│  After claiming, WIP will be sent to:   │
│  Your wallet: 0x1234...5678             │
│                                         │
│  Gas Fee: ~0.005 ETH                    │
│                                         │
│  [Cancel]  [Claim Now]                  │
│                                         │
└─────────────────────────────────────────┘
```

---

### **Success/Error States**

**Success Animation**:
- Confetti or checkmark animation
- Green background flash
- Sound effect (optional, with mute button)

**Success Message**:
```
✅ Success!

Payment of 10 WIP sent to Alice's IP
Transaction: 0xabcd...ef12
[View on Explorer]

This payment helps support creators!
```

**Error Message**:
```
❌ Transaction Failed

Insufficient WIP balance.
You have: 5 WIP
Required: 10 WIP + gas fees

[Get WIP] [Try Again]
```

---

### **Mobile Responsiveness**

**Dashboard Mobile View**:
- Stack cards vertically
- Summary cards become carousel swipeable
- Chart scrollable horizontally
- Claim button fixed at bottom

**Modal Mobile View**:
- Full-screen modals on mobile
- Large touch targets
- Bottom sheet style for iOS
- Simplified input fields

---

### **Accessibility**

**Requirements**:
- All buttons keyboard navigable
- Screen reader labels for amounts
- High contrast mode support
- Alternative text for charts
- Focus indicators visible

**Amount Display**:
- Use `<span aria-label="15.5 WIP tokens">15.5 WIP</span>`
- Read as "fifteen point five WIP tokens"

---

### **Loading States**

**Skeleton Screens**:
- Show skeleton while loading claimable amounts
- Pulsing animation
- Maintain layout structure

**Transaction Progress**:
- Step indicator: [1] Confirming → [2] Processing → [3] Complete
- Progress bar
- Cancel button (only before signing)

---

## 🔟 INTEGRATION POINTS

### **Integration with Existing Services**

**storyProtocolService.ts Integration**:
- royaltyService imports StoryProtocolService
- Uses initialized client
- Shares wallet connection
- Reuses error handling patterns

**Backend API Integration**:
- royaltyService calls backend endpoints
- Uses same auth tokens (JWT)
- Shares API client configuration
- Consistent error handling

**WalletContext Integration**:
- Access current wallet address
- Listen for wallet changes
- Validate network (Story Sepolia)
- Handle disconnections

---

### **Integration with IP Registration Flow**

**During IP Registration**:
- After attaching license terms, show royalty info:
  - "You set 10% royalty. When others earn from your IP, you automatically get 10%."
  - Link to "Understanding Royalties" help doc

**After Registration Complete**:
- Dashboard card: "Your IP can now earn royalties!"
- CTA: "Share your IP to start earning"

---

### **Integration with License Minting Flow**

**During License Minting**:
- Show minting fee: "This license costs 5 WIP"
- Explain: "This payment goes to the IP creator"
- After minting, backend tracks payment automatically

**Post-Mint**:
- Notification to IP owner: "Someone just licensed your IP!"
- Update claimable amount cache

---

### **Integration with Derivative Registration Flow**

**During Derivative Linking**:
- Show parent royalty terms: "This IP requires 10% royalty"
- Explain revenue sharing: "When your derivative earns, parent gets 10%"
- Visualize with diagram

**Post-Registration**:
- Child IP dashboard shows parent link
- Parent IP dashboard shows new derivative
- Both see revenue sharing active status

---

### **Integration with Marketplace**

**Marketplace Listing Display**:
- Show royalty percentage: "10% royalty on commercial use"
- Tooltip explaining: "Creator earns 10% when you use this commercially"

**After License Purchase**:
- Reminder: "Remember to pay royalties when you use this commercially"
- Link to payment flow

---

### **Integration with Admin Panel**

**Admin Analytics Tab**:
- Platform-wide royalty statistics
- Top earning creators
- Most active payers
- Revenue trends

**Admin Actions**:
- No admin intervention needed for normal royalty flow
- Admin can view transaction details
- Admin can help users with stuck transactions

---

### **Integration with Notification System**

**Events to Notify**:
- Payment received: "Your IP earned 10 WIP!"
- Claimable threshold reached: "You have 15 WIP ready to claim"
- Claim successful: "Claimed 15 WIP successfully"
- Derivative created: "Your IP was used in a derivative work"

**Notification Channels**:
- Email (primary)
- In-app badges
- Dashboard alerts
- Optional webhooks for power users

---

### **Integration with External Services**

**Price Feeds (Optional)**:
- Fetch WIP/USD exchange rate
- Show USD equivalents
- Use CoinGecko or similar API

**Block Explorers**:
- Link transactions to Story Sepolia explorer
- Deep link to specific tx, address, or contract

**IPFS Gateways**:
- Display IP metadata from IPFS
- Show thumbnails, titles, descriptions

---

**END OF STAGE 5 ROYALTY DISTRIBUTION PLAN - PART 1**

---

# 🎯 STAGE 5: ROYALTY DISTRIBUTION - PART 2

## 📋 CONTINUATION: ADVANCED TOPICS & EDGE CASES

---

## 1️⃣1️⃣ EDGE CASES & ERROR HANDLING

### **Edge Case 1: Zero Claimable Amount**

**Scenario**: User clicks "Claim Revenue" but claimable amount is 0

**Why This Happens**:
- User already claimed recently
- No payments received yet
- All revenue went to other Royalty Token holders
- Cache shows stale data

**Handling Strategy**:

**Prevention**:
- Disable "Claim" button when amount is 0
- Show grayed out state with tooltip: "No revenue to claim"
- Display last claim date if available

**Detection**:
- Pre-flight check before transaction
- Call claimableRevenue() to verify amount
- If 0, show friendly message instead of failing transaction

**User Message**:
```
ℹ️ No Revenue to Claim

You don't have any pending revenue at this time.
Revenue will appear here when:
- Someone pays your IP directly
- Your derivatives earn money
- License tokens are minted

Last claimed: 3 days ago (15.5 WIP)
```

---

### **Edge Case 2: Transaction Timeout**

**Scenario**: Claim transaction takes >5 minutes, user loses patience

**Why This Happens**:
- Network congestion (high gas prices)
- RPC provider issues
- Complex derivative tree (many child IPs)
- User set gas price too low

**Handling Strategy**:

**During Wait**:
- Show estimated time: "Usually takes 1-2 minutes"
- Display transaction hash immediately
- Allow user to "View on Explorer" while waiting
- Show "Still processing..." after 2 minutes
- Option to "Speed up transaction" (increase gas)

**Timeout Protection**:
- After 5 minutes, show option: "Transaction may be stuck"
- Suggest: "Check status on block explorer"
- Don't assume failure - transaction may still succeed
- Provide: "Check Status" button to query blockchain

**Recovery**:
- Store pending transaction hash in localStorage
- On page reload, check if transaction succeeded
- If succeeded, show success message and update UI
- If failed, allow retry

---

### **Edge Case 3: Partial Claim Failure**

**Scenario**: Claiming from multiple child IPs, some succeed, some fail

**Why This Happens**:
- One child IP's vault is empty
- One child IP has invalid royalty policy
- Gas runs out mid-execution
- Contract revert in specific child

**Handling Strategy**:

**Detection**:
- Parse transaction receipt for partial failures
- Check claimed amounts array
- Identify which children failed

**User Notification**:
```
⚠️ Partial Claim Success

Successfully claimed from 2 of 3 derivative IPs:
✅ "Bob's Remix" - 3.0 WIP claimed
✅ "Charlie's Cover" - 2.5 WIP claimed
❌ "Dan's Version" - Failed (empty vault)

Total claimed: 5.5 WIP
You can retry failed claims later.
```

**Retry Logic**:
- Store failed child IPs
- Show "Retry Failed Claims" button
- Next claim attempt only targets failed children
- Prevent duplicate claims

---

### **Edge Case 4: Royalty Token Transfer During Claim**

**Scenario**: User transfers Royalty Tokens while claim transaction is pending

**Why This Is Risky**:
- Claim is based on token balance at execution time
- If tokens transferred before tx confirms, claim goes to new holder
- Original claimer loses revenue

**Prevention**:
- Warning message before token transfer: "You have pending claims!"
- Lock tokens during active claim transaction
- Show "Transfer will fail until claim completes"

**UI Warning**:
```
⚠️ Pending Claim Active

You cannot transfer Royalty Tokens while a claim is processing.
Current claim: 15.5 WIP (pending confirmation)

Please wait for claim to complete before transferring tokens.
```

---

### **Edge Case 5: Gas Price Volatility**

**Scenario**: Gas fee estimate shown to user changes dramatically before transaction

**Why This Happens**:
- Network congestion spikes
- User waits too long to confirm
- Block gas limit changes

**Handling Strategy**:

**Estimation**:
- Show gas estimate range: "0.003 - 0.008 ETH"
- Update estimate every 10 seconds
- Warn if estimate increases >50%: "⚠️ Gas fees are rising"

**Protection**:
- Set max gas limit in transaction
- If actual gas exceeds max, transaction reverts (no payment)
- Better to fail than overpay unexpectedly

**User Control**:
- Advanced settings: "Custom gas price"
- Presets: Slow (cheap), Normal, Fast (expensive)
- Show estimated time for each preset

---

### **Edge Case 6: Duplicate Payment Tracking**

**Scenario**: Same payment recorded multiple times in backend database

**Why This Happens**:
- User refreshes page during tracking call
- Frontend retries after network error
- Transaction confirmed but tracking API timed out

**Prevention**:

**Idempotency**:
- Use tx_hash as unique constraint in database
- Backend checks: "Does this tx_hash already exist?"
- If exists, return 200 OK without inserting duplicate

**Backend Logic**:
```
POST /api/royalty/track-payment
1. Check if tx_hash exists in royalty_payments
2. If exists: return { status: 'already_tracked' }
3. If not: insert new record
4. Return success
```

**Result**: Safe to call tracking endpoint multiple times

---

### **Edge Case 7: Child IP Deleted/Unlinked**

**Scenario**: Parent tries to claim from child IP that was removed/disputed

**Why This Happens**:
- Child IP violated terms, admin removed link
- Derivative relationship was challenged
- Child IP owner burned the NFT

**Handling Strategy**:

**Detection**:
- Query child IPs from backend before claim
- Filter out invalid/deleted children
- Only pass valid children to claimAllRevenue

**User Notification**:
```
ℹ️ Derivative Status Changed

One of your derivative IPs is no longer active:
❌ "Disputed Remix" - Link removed by admin

Claiming from remaining 2 active derivatives only.
```

**Automatic Handling**:
- Backend periodically validates derivative relationships
- Removes invalid children from cached lists
- Prevents claim failures

---

### **Edge Case 8: Multi-Currency Claims with Different Decimals**

**Scenario**: Claiming WIP (18 decimals) and USDC (6 decimals) together

**Why This Matters**:
- Display formatting must be correct
- Precision loss if not careful
- USD conversion needs different rates

**Handling Strategy**:

**Display Formatting**:
- WIP: Show 18 decimal precision (trim trailing zeros)
- USDC: Show 6 decimal precision
- Format example: "15.5 WIP" not "15.500000000000000000"

**Calculation Safety**:
- Always use bigint for amounts
- Never convert to JavaScript Number (loses precision)
- Only format to string for display

**USD Conversion**:
- Fetch separate exchange rates: WIP/USD and USDC/USD
- Calculate total: `(wipAmount * wipRate) + (usdcAmount * usdcRate)`
- Cache rates for 5 minutes

---

### **Edge Case 9: Wallet Disconnects During Transaction**

**Scenario**: User's wallet disconnects while claim transaction is pending

**Why This Happens**:
- User switches wallets in MetaMask
- Browser tab loses focus (mobile)
- Wallet extension crashes

**Handling Strategy**:

**Detection**:
- Listen for wallet disconnect events
- Track pending transactions in state

**User Notification**:
```
⚠️ Wallet Disconnected

Your wallet disconnected while a claim was pending.
Transaction Hash: 0xabc...123

The transaction may still succeed on-chain.
Reconnect your wallet to check status.

[Reconnect Wallet] [Check Transaction Status]
```

**Recovery**:
- Store pending tx hash in localStorage
- After reconnection, check tx status
- Show result based on blockchain state

---

### **Edge Case 10: IP Owner Changes During Claim**

**Scenario**: IP is transferred to new owner while claim transaction is pending

**Why This Is Complex**:
- Original owner initiated claim
- New owner may have different expectations
- Royalty Tokens may have been transferred too

**Story Protocol Behavior**:
- Claim succeeds based on Royalty Token ownership at execution time
- If tokens transferred before claim executes, new holder gets revenue
- If IP transferred but tokens stayed, old holder gets revenue

**UI Clarity**:
- Show: "You are claiming as: [claimer address]"
- Warn: "Revenue goes to Royalty Token holders, not necessarily IP owner"
- Display token holder list before claim

---

## 1️⃣2️⃣ ADVANCED PAYMENT SCENARIOS

### **Scenario 1: Bulk Payment to Multiple IPs**

**Use Case**: Platform wants to distribute rewards to top creators

**Implementation Ideas**:

**Admin Tool**:
- CSV upload: IP ID, Amount, Token
- Bulk validation: Check all IPs exist
- Batch transaction: Loop through and pay each
- Progress tracker: "Paying 5 of 20 IPs..."

**Gas Optimization**:
- Use multicall if Story Protocol supports it
- Group payments by token type
- Pay during low gas times (automated scheduling)

**User Experience**:
- Creators receive notification: "You received platform reward!"
- Dashboard shows: "Platform Reward: 10 WIP"
- Separate badge for platform payments vs user payments

---

### **Scenario 2: Subscription-Style Payments**

**Use Case**: User wants to pay monthly royalties for ongoing IP usage

**Implementation Ideas**:

**Manual Approach (MVP)**:
- User sets reminder: "Pay Alice's IP monthly"
- Email notification: "Time to pay your monthly royalty"
- User manually initiates payment each month

**Automated Approach (Future)**:
- User approves spending limit for contract
- Platform smart contract auto-debits monthly
- User can cancel anytime
- Notification: "Subscription payment successful"

**Challenges**:
- Requires custom smart contract
- Gas fees for automation
- User must maintain balance

---

### **Scenario 3: Revenue Sharing Splits (Multiple Royalty Token Holders)**

**Use Case**: Alice holds 70 tokens, investor Bob holds 30 tokens

**How It Works**:

**Automatic Distribution**:
- IP receives 100 WIP payment
- Alice claims: receives 70 WIP
- Bob claims: receives 30 WIP
- Each claims independently when ready

**Dashboard Display for IP Owner (Alice)**:
```
💎 Your IP: "My Original Story"

Royalty Token Distribution:
- You: 70 tokens (70%)
- Bob (Investor): 30 tokens (30%)

Pending Revenue: 100 WIP total
- Your share: 70 WIP [Claim]
- Bob's share: 30 WIP (Bob must claim)
```

**Dashboard for Investor (Bob)**:
```
📊 Your Investments

IP: "Alice's Original Story" (30% ownership)
Claimable: 30 WIP [Claim]
Total earned lifetime: 150 WIP
ROI: +45%
```

---

### **Scenario 4: Escrow Payments for Derivative Obligations**

**Use Case**: Ensure derivative creators pay parents before withdrawing revenue

**Problem**:
- Child IP earns 100 WIP
- Owes parent 10 WIP
- Child creator claims all 100 WIP immediately
- Never pays parent

**Solution Ideas**:

**Story Protocol Handles This**:
- Royalty split happens automatically at payment time
- Parent's 10 WIP goes to Royalty Policy contract
- Child's 90 WIP goes to child vault
- No escrow needed - built into protocol

**Platform Enforcement** (Optional):
- Track: "Has child paid parent this period?"
- UI shows: "⚠️ You have outstanding parent royalties"
- Optional: Restrict certain features until paid

---

### **Scenario 5: Tipping Campaigns**

**Use Case**: Fans organize tipping campaign for favorite creator

**Implementation Ideas**:

**Campaign Page**:
- Goal: "Help Alice reach 100 WIP!"
- Progress bar: "70 WIP raised (70%)"
- Recent tips: "John tipped 5 WIP 2 hours ago"
- Leaderboard: Top tippers

**Social Features**:
- Public tip wall with messages
- Share campaign on social media
- Matching donations: "Platform matches tips up to 50 WIP!"

**Technical**:
- Each tip = payRoyaltyOnBehalf call
- Backend tracks campaign_id in payment notes
- Aggregate by campaign for analytics

---

## 1️⃣3️⃣ PERFORMANCE OPTIMIZATION

### **Database Indexing Strategy**

**High-Traffic Queries**:

**Query 1: Get user's claimable amounts**
```sql
SELECT ip_id, claimable_amount, token_address 
FROM pending_royalties_cache 
WHERE claimer_address = ? 
  AND cache_valid_until > NOW()
```
**Index**: `(claimer_address, cache_valid_until)`

---

**Query 2: Get payment history for IP**
```sql
SELECT * FROM royalty_payments 
WHERE receiver_ip_id = ? 
ORDER BY payment_timestamp DESC 
LIMIT 20
```
**Index**: `(receiver_ip_id, payment_timestamp DESC)`

---

**Query 3: Get recent payments for dashboard**
```sql
SELECT * FROM royalty_payments 
WHERE receiver_ip_id IN (?, ?, ?) 
  AND payment_timestamp > NOW() - INTERVAL 30 DAY
ORDER BY payment_timestamp DESC
```
**Index**: `(receiver_ip_id, payment_timestamp)`

---

### **Caching Layers**

**Layer 1: Browser (localStorage)**
- Cache claimable amounts for 5 minutes
- Store last refresh timestamp
- Invalidate on claim success
- Fast dashboard loads

**Layer 2: Backend Database (pending_royalties_cache table)**
- Cache blockchain queries for 10 minutes
- Refresh asynchronously via background job
- Shared across all users
- Reduces RPC calls dramatically

**Layer 3: Redis (Optional)**
- Cache aggregate analytics
- Session data
- Rate limiting counters
- TTL-based expiration

---

### **Background Jobs Architecture**

**Job 1: Cache Refresher**
```
Schedule: Every 5 minutes
Purpose: Update pending_royalties_cache for all active IPs
Logic:
  1. Get list of IPs with recent activity
  2. For each IP, query blockchain claimableRevenue
  3. Update cache table
  4. Flag stale entries
Duration: ~2-5 minutes for 1000 IPs
```

---

**Job 2: Payment Reconciliation**
```
Schedule: Daily at 2 AM
Purpose: Ensure database matches blockchain events
Logic:
  1. Query Story Protocol payment events (last 7 days)
  2. Compare with royalty_payments table
  3. Insert missing payments
  4. Flag discrepancies
  5. Send alert if >10 mismatches
Duration: ~10-30 minutes
```

---

**Job 3: Analytics Snapshots**
```
Schedule: Daily at 3 AM
Purpose: Create daily revenue snapshots for charts
Logic:
  1. For each IP, aggregate yesterday's payments
  2. Insert into revenue_snapshots table
  3. Calculate weekly/monthly rollups
Duration: ~5-15 minutes
```

---

**Job 4: Stale Cache Cleanup**
```
Schedule: Hourly
Purpose: Remove old cache entries
Logic:
  1. DELETE FROM pending_royalties_cache 
     WHERE last_checked < NOW() - INTERVAL 24 HOUR
  2. Optimize table
Duration: <1 minute
```

---

### **API Rate Limiting**

**Why Needed**:
- Prevent abuse
- Protect RPC provider quota
- Ensure fair usage

**Rate Limits**:

**Claimable Amount Queries**:
- Cached: Unlimited (served from database)
- Forced refresh: 10 per minute per user
- Reason: Blockchain queries are expensive

**Payment Tracking**:
- 100 per minute per user
- Each payment is one API call
- Normal usage <<10/min

**Analytics Queries**:
- 30 per minute per user
- Cached responses shared across users

**Implementation**:
- Use express-rate-limit middleware
- Redis-backed store for distributed systems
- Custom keys: `${userId}:${endpoint}`

---

### **Lazy Loading Strategies**

**Dashboard Optimization**:

**Initial Load**:
- Load summary data first (claimable totals)
- Show skeleton screens for charts
- Load payment history after 500ms delay

**Deferred Loading**:
- Charts load on scroll into view
- Token holder list loads on tab click
- Full payment history loads on "View All" click

**Infinite Scroll**:
- Payment history: Load 20 at a time
- "Load More" button or auto-scroll detection
- Backend pagination: LIMIT 20 OFFSET N

---

## 1️⃣4️⃣ SECURITY CONSIDERATIONS

### **Protection Against Frontend Manipulation**

**Risk**: User modifies frontend to claim revenue they don't own

**Protection**:

**Blockchain as Authority**:
- All claims executed by user's wallet
- Smart contract validates ownership
- User can only claim what Royalty Tokens they hold
- Frontend is just UI - can't bypass on-chain rules

**Backend Verification**:
- Backend tracking is for UX only
- Never rely on backend for authorization
- Backend can lie - blockchain cannot

---

### **Protection Against Replay Attacks**

**Risk**: Attacker replays a claim transaction multiple times

**Protection**:

**Built into Blockchain**:
- Nonces prevent replay on same chain
- Once claimed, vault balance decreases
- Subsequent replays would claim 0 amount
- No risk of double-claiming

**Transaction Monitoring**:
- Backend tracks tx hashes
- Duplicate tx hashes ignored
- Idempotency in tracking API

---

### **Protection Against Cache Poisoning**

**Risk**: Attacker manipulates cache to show fake claimable amounts

**Protection**:

**Cache Validation**:
- Cache is optimization only
- Critical operations always query blockchain
- Before claim, verify amount on-chain
- Display "Refreshing..." indicator during verification

**Refresh Button**:
- User can force blockchain query anytime
- Shows "Last verified from blockchain: Just now"
- Builds trust

---

### **Protection Against Transaction Frontrunning**

**Risk**: Attacker sees claim transaction, frontruns with their own

**Why This Doesn't Work**:
- Only Royalty Token holder can claim
- Attacker doesn't have tokens
- Their transaction would fail
- Waste of gas fees for attacker

**Platform Has No Risk** from standard frontrunning

---

### **Protection Against Malicious Payment Notes**

**Risk**: Attacker sends payment with XSS payload in notes field

**Protection**:

**Input Sanitization**:
- Backend sanitizes all text inputs
- Escape HTML entities: `<script>` → `&lt;script&gt;`
- Use DOMPurify library for sanitization

**Display Safety**:
- Render notes as plain text, not HTML
- Use React's default escaping: `{note}`
- Never use dangerouslySetInnerHTML for user content

---

### **Protection Against Gas Griefing**

**Risk**: Malicious child IP designed to waste gas on claim

**Scenario**:
- Parent tries to claim from 100 child IPs
- One child IP has malicious contract
- Claim transaction runs out of gas
- Parent loses gas fees, gets nothing

**Protection**:

**Batch Size Limits**:
- Limit claims to 20 child IPs per transaction
- If >20 children, multiple transactions required
- Show: "Claim from first 20 children (of 50)"

**Gas Estimation**:
- Pre-estimate gas for claim
- If estimate too high, warn user
- Option to skip problematic children

---

## 1️⃣5️⃣ TESTING STRATEGY

### **Unit Tests (Backend)**

**Test: Payment Tracking Idempotency**
```
Given: A payment with tx_hash already in database
When: POST /api/royalty/track-payment called again
Then: Should return success without inserting duplicate
And: Database should have only 1 record for that tx_hash
```

---

**Test: Claimable Amount Cache Expiry**
```
Given: Cache entry with cache_valid_until in past
When: GET /api/royalty/claimable/:ipId called
Then: Should query blockchain
And: Should update cache with new value
And: Should return fresh amount
```

---

**Test: Child IP Filtering**
```
Given: Parent IP with 5 children, 2 marked as deleted
When: Fetching child IPs for claim
Then: Should return only 3 active children
And: Deleted children not in response
```

---

### **Integration Tests (Frontend + Backend)**

**Test: Complete Payment Flow**
```
1. User initiates payment to IP
2. Wallet prompts for signature
3. Transaction broadcasts
4. Backend tracks payment
5. Claimable cache invalidated
6. IP owner sees updated claimable amount
```

---

**Test: Complete Claim Flow**
```
1. User views dashboard
2. Sees claimable amount from cache
3. Clicks "Claim Now"
4. Pre-flight check verifies amount
5. Transaction executes
6. Backend tracks claim
7. Cache updated to 0
8. Success notification shown
```

---

### **E2E Tests (Blockchain Interaction)**

**Test: Story Protocol Payment**
```
1. Fund test wallet with WIP tokens
2. Call payRoyaltyOnBehalf to test IP
3. Wait for confirmation
4. Query IP Royalty Vault balance
5. Assert balance increased correctly
```

---

**Test: Story Protocol Claim**
```
1. Test IP has claimable WIP in vault
2. Call claimAllRevenue
3. Wait for confirmation
4. Check wallet WIP balance increased
5. Query vault balance decreased to 0
```

---

### **Load Testing**

**Scenario 1: Dashboard Load**
```
Simulate: 1000 concurrent users loading dashboard
Metrics:
- Page load time <2 seconds
- API response time <500ms
- Database queries <100ms
- Cache hit rate >90%
```

---

**Scenario 2: Claim Spike**
```
Simulate: 100 users claiming simultaneously
Metrics:
- RPC calls <200 (most cached)
- Database writes successful
- No deadlocks
- All claims processed within 5 minutes
```

---

### **Security Testing**

**Test: SQL Injection Attempts**
```
POST /api/royalty/track-payment
Body: { "notes": "'; DROP TABLE royalty_payments; --" }
Expected: Input sanitized, no SQL executed
```

---

**Test: XSS Attempts**
```
POST /api/royalty/track-payment
Body: { "notes": "<script>alert('XSS')</script>" }
Expected: Stored as plain text, rendered safely
```

---

**Test: Unauthorized Access**
```
GET /api/royalty/claimable/:ipId
Without: Valid JWT token
Expected: 401 Unauthorized
```

---

## 1️⃣6️⃣ MONITORING & ALERTING

### **Key Metrics to Track**

**Business Metrics**:
- Total royalties paid (daily, weekly, monthly)
- Total royalties claimed
- Number of active IPs earning revenue
- Average revenue per IP
- Claim rate: claimed / available (should be >70%)

**Technical Metrics**:
- API response times (p50, p95, p99)
- RPC call count and latency
- Cache hit rate (should be >85%)
- Database query times
- Background job duration

**User Experience Metrics**:
- Time from payment to claim
- Claim transaction success rate
- Failed transaction rate and reasons
- User satisfaction with earnings dashboard

---

### **Alerts to Configure**

**Critical Alerts** (Immediate Response):
```
Alert: Claim transaction failure rate >10%
Action: Check RPC provider, Story Protocol status
Severity: P1
```

```
Alert: Database reconciliation finds >50 missing payments
Action: Investigate data sync issues
Severity: P1
```

```
Alert: Background cache job hasn't run in 30 minutes
Action: Check job scheduler, server health
Severity: P2
```

---

**Warning Alerts** (Monitor):
```
Alert: Cache hit rate drops below 70%
Action: Review cache strategy, increase TTL
Severity: P3
```

```
Alert: Average claim time >3 minutes
Action: Check network congestion, consider gas optimization
Severity: P3
```

---

### **Logging Strategy**

**What to Log**:

**Payment Events**:
```
{
  event: 'royalty_payment_received',
  ipId: '0x...',
  amount: '1000000000000000000',
  token: 'WIP',
  payer: '0x...',
  txHash: '0x...',
  timestamp: '2025-12-13T10:30:00Z'
}
```

**Claim Events**:
```
{
  event: 'royalty_claim_initiated',
  ipId: '0x...',
  claimer: '0x...',
  expectedAmount: '15500000000000000000',
  childIpIds: ['0x...', '0x...'],
  timestamp: '2025-12-13T10:35:00Z'
}
```

**Error Events**:
```
{
  event: 'claim_failed',
  ipId: '0x...',
  error: 'Insufficient gas',
  txHash: '0x...',
  userId: 'user123',
  timestamp: '2025-12-13T10:36:00Z'
}
```

---

### **Dashboard Analytics**

**Admin Dashboard Widgets**:

**Revenue Overview**:
- Total platform royalties: $XX,XXX
- 7-day trend: ↑ 15%
- Active earning IPs: 1,234
- Top earning IP: "Alice's Story" ($5,432)

**Health Metrics**:
- Cache hit rate: 87%
- Avg claim time: 1.8 minutes
- Failed transactions: 2.3%
- RPC calls today: 45,231

**User Activity**:
- Payments today: 1,234
- Claims today: 567
- New earning IPs: 89
- Avg payment size: 12.5 WIP

---

## 1️⃣7️⃣ FUTURE ENHANCEMENTS

### **Phase 2 Features**

**1. Automatic Claim Thresholds**
- User sets: "Auto-claim when ≥50 WIP"
- Platform monitors claimable amounts
- Sends notification when threshold reached
- User approves, claim executes automatically

**2. Revenue Forecasting**
- ML model predicts future earnings
- Based on: historical payments, derivative count, trends
- Dashboard shows: "Projected earnings next month: ~45 WIP"

**3. Tax Reporting**
- Annual report generator
- CSV export with: Date, Amount, USD Value, Transaction Hash
- Compatible with tax software (TurboTax, etc.)
- IRS Form 1099 generation assistance

**4. Royalty Token Marketplace**
- Secondary market for buying/selling Royalty Tokens
- Pricing based on revenue history
- Escrow-based safe trading
- Discover investment opportunities

**5. Multi-Token Portfolio View**
- Aggregate view across all currencies
- Total in USD: "Your portfolio: $1,234"
- Asset allocation chart: 60% WIP, 30% USDC, 10% ETH
- Swap between tokens

---

### **Phase 3 Features**

**1. DAO Governance for Dispute Resolution**
- Token holders vote on derivative disputes
- Decentralized decision making
- Transparent voting records
- Reputation system for voters

**2. Cross-Chain Royalty Bridging**
- Claim on Story Protocol, receive on another chain
- Bridge integration (LayerZero, Wormhole)
- Multi-chain portfolio tracking

**3. NFT Royalty Standard Integration**
- Support EIP-2981 (NFT Royalty Standard)
- Automatic royalty enforcement on NFT sales
- Integration with OpenSea, Rarible

**4. Streaming Payments**
- Real-time micro-payments
- Pay-per-view, pay-per-use models
- Sablier integration for streaming
- Continuous revenue flow

**5. Revenue-Backed Lending**
- Borrow against future royalties
- Use IP revenue as collateral
- DeFi lending protocol integration
- Unlock liquidity without selling IP

---

**END OF STAGE 5 ROYALTY DISTRIBUTION PLAN - PART 2**

**This comprehensive planning document provides all necessary architectural decisions, edge case handling, performance optimization strategies, security considerations, testing approaches, and future enhancement roadmaps for implementing Story Protocol's royalty distribution system - all without a single line of code, purely conceptual wisdom.**
