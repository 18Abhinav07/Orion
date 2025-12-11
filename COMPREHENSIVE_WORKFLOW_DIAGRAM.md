# Orion RWA Tokenization Platform - **COMPREHENSIVE** Workflow State Diagram

> **Complete Technical Documentation**: This diagram maps every user journey, blockchain interaction, API call, cache strategy, and error handling flow in the Orion platform.

## 📚 Table of Contents
1. [Overview](#overview)
2. [State Diagram](#state-diagram)
3. [Detailed Component Mapping](#detailed-component-mapping)
4. [Smart Contract Integration](#smart-contract-integration)
5. [API Endpoints](#api-endpoints)
6. [Data Flow Patterns](#data-flow-patterns)
7. [Caching Strategy](#caching-strategy)
8. [Error Handling](#error-handling)

---

## 🎯 Overview

### Platform Architecture
- **Frontend**: React 18+ with TypeScript
- **State Management**: React Context API (AuthContext, WalletContext)
- **Blockchain**: Flow EVM Testnet (Chain ID: 747) via ethers.js v5
- **Backend**: Node.js + Express + MongoDB
- **Authentication**: JWT with role-based access control
- **Storage**: IPFS via Pinata for metadata & images
- **Caching**: LocalStorage with TTL-based expiration

### User Roles
- **User/Investor**: Purchase assets, trade tokens, view portfolio
- **Issuer**: Submit tokenization requests, manage issued tokens
- **Manager**: Update token metadata, monitor assigned assets
- **Admin**: Approve/reject requests, manage users, settle invoices

---

## 🗺️ State Diagram

```mermaid
stateDiagram-v2
    [*] --> AppInitialization
    
    note right of AppInitialization
        📁 src/main.tsx
        📁 src/App.tsx
        📁 src/context/WalletContext.tsx
        🔧 React.createRoot + StrictMode
        🔧 WalletProvider wrapper
        🔧 Initialize global state
    end note
    
    AppInitialization --> NetworkCheck
    
    note right of NetworkCheck
        📁 src/components/NetworkSwitcher.tsx
        📁 src/utils/networkDetection.ts
        📁 src/lib/contractAddress.ts
        🔧 Detect MetaMask/wallet
        🔧 Check Chain ID (target: 747)
        🔧 Auto-switch if wrong network
        🔐 Required contracts: MARKETPLACE, TOKEN, ADMIN, etc.
    end note
    
    NetworkCheck --> LoadCache: Correct network
    NetworkCheck --> NetworkSwitch: Wrong network detected
    
    state NetworkSwitch {
        [*] --> RequestSwitch
        
        note right of RequestSwitch
            📁 src/context/WalletContext.tsx
            🔧 wallet_switchEthereumChain RPC call
            🔧 If network not exists: wallet_addEthereumChain
            🔧 Network params from NETWORK_CONFIG
        end note
        
        RequestSwitch --> SwitchSuccess: User approved
        RequestSwitch --> SwitchFailed: User rejected
        
        SwitchSuccess --> [*]
        SwitchFailed --> NetworkError
        
        note right of NetworkError
            🚫 Display error alert
            🚫 Block feature access
            🚫 Show manual instructions
        end note
    }
    
    NetworkSwitch --> LoadCache: Switched successfully
    
    note right of LoadCache
        📁 src/utils/marketplaceCache.ts
        📁 src/utils/dashboardCache.ts
        📁 src/services/imageCacheService.ts
        🔧 Read localStorage cache
        🔧 Validate TTL timestamps
        🔧 Marketplace: 10min TTL
        🔧 Metadata: 24hr TTL
        🔧 Images: 7 days TTL
        🔧 Failed fetch markers: tracked
    end note
    
    LoadCache --> CheckAuthentication
    
    note right of CheckAuthentication
        📁 src/context/AuthContext.tsx
        📁 src/api/authApi.ts
        🔧 Read authToken from localStorage
        🔧 Decode JWT (base64url)
        🔧 Extract: userId, roles, currentRole, exp
        🔧 Validate expiration
        🔧 Background: ping() every 5min
    end note
    
    CheckAuthentication --> Unauthenticated: No/invalid token
    CheckAuthentication --> Authenticated: Valid token
    
    state Unauthenticated {
        [*] --> PublicPages
        
        note right of PublicPages
            📁 src/pages/Index.tsx
            📁 src/components/HeroSection.tsx
            📁 src/components/IntegrationsSection.tsx
            📁 src/components/InsightsSection.tsx
            📁 src/components/AutoRepayingSection.tsx
            📁 src/components/FAQSection.tsx
            📁 src/components/ReviewsSection.tsx
            📁 src/components/CTASection.tsx
            📁 src/components/Footer.tsx
            🔧 Marketing landing page
            🔧 No auth required
        end note
        
        PublicPages --> AboutPage: /about
        PublicPages --> LoginPage: /login
        PublicPages --> PublicMarketplace: View listings
        
        note right of AboutPage
            📁 src/pages/about/about.tsx
            🔧 Platform info & team
        end note
        
        note right of PublicMarketplace
            📁 src/pages/marketplace/marketplace.tsx
            🔧 Read-only mode
            🔧 Demo data fallback
            🚫 Cannot purchase
        end note
        
        PublicMarketplace --> LoginPage: Attempt purchase
        AboutPage --> LoginPage
        
        state LoginPage {
            [*] --> AuthChoice
            
            note right of AuthChoice
                📁 src/pages/login/login.tsx
                🔧 Toggle login/signup
                🔧 Choose email or wallet
            end note
            
            AuthChoice --> EmailSignup: New user
            AuthChoice --> EmailLogin: Existing user (email)
            AuthChoice --> WalletLogin: Existing user (wallet)
            
            state EmailSignup {
                [*] --> CollectInfo
                
                note right of CollectInfo
                    📁 src/pages/login/login.tsx
                    🔧 Form: firstName, lastName, email, password, confirmPassword
                    🔧 Optional: walletAddress (if connected)
                    🔧 Validation: password strength, email format
                    🔧 acceptTerms checkbox
                end note
                
                CollectInfo --> SubmitRegistration
                
                note right of SubmitRegistration
                    📁 src/api/authApi.ts
                    🔧 POST /api/auth/register
                    🔧 Backend: bcrypt password hash
                    🔧 Store MongoDB: users collection
                    🔧 Default role: ['user']
                    🔧 kycStatus: 'pending'
                end note
                
                SubmitRegistration --> EmailLogin: Success
                SubmitRegistration --> CollectInfo: Validation error
            }
            
            state WalletLogin {
                [*] --> ConnectWallet
                
                note right of ConnectWallet
                    📁 src/context/WalletContext.tsx
                    🔧 eth_requestAccounts
                    🔧 Get signer address
                    🔧 Verify network
                end note
                
                ConnectWallet --> VerifyWallet
                
                note right of VerifyWallet
                    📁 src/api/authApi.ts
                    🔧 POST /api/auth/verify-wallet
                    🔧 Check if wallet exists in DB
                    🔧 Return availableRoles if found
                    🔧 Auto-fill user info
                end note
                
                VerifyWallet --> EmailLogin: Wallet registered
                VerifyWallet --> EmailSignup: New wallet (prompt signup)
            }
            
            state EmailLogin {
                [*] --> SubmitCredentials
                
                note right of SubmitCredentials
                    📁 src/api/authApi.ts
                    🔧 POST /api/auth/login
                    🔧 Body: { email, password, walletAddress? }
                    🔧 Backend: bcrypt.compare password
                    🔧 Generate JWT with roles
                end note
                
                SubmitCredentials --> StoreAuth: Valid credentials
                SubmitCredentials --> [*]: Invalid (show error)
                
                note right of StoreAuth
                    📁 src/context/AuthContext.tsx
                    🔧 localStorage.setItem('authToken')
                    🔧 localStorage.setItem('user')
                    🔧 localStorage.setItem('currentRole')
                    🔧 Set context state
                    🔧 Trigger re-render
                end note
                
                StoreAuth --> Authenticated
            }
        }
        
        LoginPage --> Authenticated: Auth success
    }
    
    state Authenticated {
        [*] --> RoleCheck
        
        note right of RoleCheck
            📁 src/components/ProtectedRoute.tsx
            📁 src/context/AuthContext.tsx
            🔧 Read user.roles array
            🔧 Check primaryRole
            🔧 Validate allowedRoles for route
            🔧 Redirect if unauthorized
        end note
        
        RoleCheck --> ComplianceCheck
        
        note right of ComplianceCheck
            📁 src/components/ComplianceGuard.tsx
            📁 src/components/ComplianceCheck.tsx
            📁 src/components/EnhancedKYCFlow.tsx
            📁 src/services/complianceService.ts
            🔧 Check user.kycStatus
            🔧 Verify regional restrictions
            🔧 Validate accreditation
            🔐 Smart Contract: COMPLIANCE_REGISTRY
        end note
        
        ComplianceCheck --> RoleRouting: KYC complete
        ComplianceCheck --> KYCFlow: KYC pending/failed
        
        state KYCFlow {
            [*] --> InitiateKYC
            
            note right of InitiateKYC
                📁 src/components/EnhancedKYCFlow.tsx
                🔧 Collect identity docs
                🔧 Verify accreditation status
                🔧 Check regional eligibility
            end note
            
            InitiateKYC --> PendingReview: Docs submitted
            PendingReview --> RoleRouting: Admin approved
            PendingReview --> InitiateKYC: Rejected (retry)
        }
        
        state RoleRouting {
            [*] --> RouteChoice
            RouteChoice --> UserDashboard: role = 'user'
            RouteChoice --> AdminDashboard: role = 'admin'
            RouteChoice --> IssuerDashboard: role = 'issuer'
            RouteChoice --> ManagerDashboard: role = 'manager'
        }
        
        state UserDashboard {
            [*] --> LoadPortfolio
            
            note right of LoadPortfolio
                📁 src/pages/dashboard/dashboard.tsx
                📁 src/utils/dashboardCache.ts
                🔧 Fetch user's token balances
                🔐 Contract: TOKEN_CONTRACT.balanceOf(address, tokenId)
                🔧 Cache: 5min TTL
                🔧 Aggregate portfolio value
                🔧 Transaction history
            end note
            
            LoadPortfolio --> PortfolioView
            
            state PortfolioView {
                [*] --> ShowAssets
                
                note right of ShowAssets
                    📁 src/pages/dashboard/dashboard.tsx
                    📁 src/components/AssetCard.tsx
                    📁 src/components/CachedImage.tsx
                    🔧 Display owned tokens
                    🔧 Real-time prices
                    🔧 Yield income reports
                end note
                
                ShowAssets --> Marketplace: Browse more
                ShowAssets --> OrderBook: Trade existing
                ShowAssets --> YieldReports: View income
                ShowAssets --> SecondaryMarket: P2P trade
            }
            
            state Marketplace {
                [*] --> FetchListings
                
                note right of FetchListings
                    📁 src/pages/marketplace/marketplace.tsx
                    📁 src/utils/marketplaceCache.ts
                    📁 src/utils/marketplaceABI.ts
                    🔐 Contract: MARKETPLACE_CONTRACT
                    🔧 Function: getAllListings()
                    🔧 Parse: tokenId, price, amount, seller
                    🔧 Cache: 10min TTL
                end note
                
                FetchListings --> EnrichMetadata
                
                note right of EnrichMetadata
                    📁 src/services/metadataService.ts
                    📁 src/utils/pinataImageFetcher.ts
                    🔐 Contract: TOKEN_CONTRACT.uri(tokenId)
                    🔧 Fetch IPFS metadata
                    🔧 Process images (Pinata gateway)
                    🔧 Fallback images if fetch fails
                    🔧 Cache metadata: 24hr TTL
                end note
                
                EnrichMetadata --> DisplayListings
                
                note right of DisplayListings
                    📁 src/pages/marketplace/marketplace.tsx
                    📁 src/components/AssetCard.tsx
                    🔧 Filter by category
                    🔧 Sort by price/date
                    🔧 Real-time price conversion (ETH/USD)
                    🔧 Pagination
                end note
                
                DisplayListings --> AssetSelection: User clicks asset
                
                state AssetSelection {
                    [*] --> OpenBuyModal
                    
                    note right of OpenBuyModal
                        📁 src/components/BuyModal.tsx
                        📁 src/utils/priceService.ts
                        🔧 Show asset details
                        🔧 Calculate: subtotal + platform fee (1%)
                        🔧 Display total in ETH + USD
                        🔧 Check user's wallet balance
                    end note
                    
                    OpenBuyModal --> ConfirmPurchase: User confirms
                    OpenBuyModal --> [*]: User cancels
                    
                    state ConfirmPurchase {
                        [*] --> CheckApproval
                        
                        note right of CheckApproval
                            📁 src/components/BuyModal.tsx
                            🔐 Contract: TOKEN_CONTRACT
                            🔧 Function: isApprovedForAll(user, MARKETPLACE)
                            🔧 If not approved, request approval
                        end note
                        
                        CheckApproval --> RequestApproval: Not approved
                        CheckApproval --> ExecutePurchase: Already approved
                        
                        note right of RequestApproval
                            🔐 Contract: TOKEN_CONTRACT.setApprovalForAll(MARKETPLACE, true)
                            🔧 Wait for tx confirmation
                            🔧 Show pending state
                        end note
                        
                        RequestApproval --> ExecutePurchase: Approved
                        RequestApproval --> [*]: User rejected
                        
                        note right of ExecutePurchase
                            📁 src/components/BuyModal.tsx
                            🔐 Contract: MARKETPLACE_CONTRACT.buyListing(tokenId, amount)
                            🔧 Send transaction with value
                            🔧 Platform fee: 1% of price
                            🔧 Wait for confirmation
                            🔧 Update local state
                        end note
                        
                        ExecutePurchase --> PurchaseSuccess: Tx confirmed
                        ExecutePurchase --> PurchaseFailed: Tx failed
                        
                        note right of PurchaseSuccess
                            🔧 Toast notification
                            🔧 Invalidate caches
                            🔧 Refresh portfolio
                            🔧 Update marketplace
                        end note
                        
                        PurchaseSuccess --> LoadPortfolio
                        PurchaseFailed --> OpenBuyModal: Retry
                    }
                }
            }
            
            state OrderBook {
                [*] --> SelectToken
                
                note right of SelectToken
                    📁 src/pages/orderbook/OrderBookPage.tsx
                    📁 src/components/AssetTokenSelector.tsx
                    🔧 Display user's tokens
                    🔧 Select token to trade
                end note
                
                SelectToken --> LoadTradingTerminal
                
                note right of LoadTradingTerminal
                    📁 src/pages/trading/TradingPage.tsx
                    📁 src/hooks/useOrderBook.ts
                    📁 src/utils/orderBookEscrowService.ts
                    📁 src/services/tradingService.ts
                    🔐 Contract: ORDER_BOOK_ESCROW_CONTRACT
                    🔧 Fetch buy/sell orders
                    🔧 Load trade history
                    🔧 Generate candlestick charts
                end note
                
                LoadTradingTerminal --> TradingActions
                
                state TradingActions {
                    [*] --> ActionChoice
                    
                    ActionChoice --> CreateSellOrder: Sell tokens
                    ActionChoice --> CreateBuyOrder: Buy tokens
                    ActionChoice --> FillOrder: Match existing order
                    ActionChoice --> CancelOrder: Cancel own order
                    
                    state CreateSellOrder {
                        [*] --> ValidateBalance
                        
                        note right of ValidateBalance
                            📁 src/components/OrderManagement.tsx
                            🔧 Check token balance
                            🔧 Ensure sufficient amount
                        end note
                        
                        ValidateBalance --> ApproveEscrow: Has balance
                        ValidateBalance --> [*]: Insufficient
                        
                        note right of ApproveEscrow
                            🔐 Contract: TOKEN_CONTRACT.setApprovalForAll(ESCROW, true)
                            🔧 One-time approval
                            🔧 Required for escrow lock
                        end note
                        
                        ApproveEscrow --> LockInEscrow
                        
                        note right of LockInEscrow
                            📁 src/hooks/useOrderBook.ts
                            🔐 Contract: ESCROW.createSellOrder(tokenId, amount, pricePerToken)
                            🔧 Transfers tokens to escrow
                            🔧 Emits OrderCreated event
                            🔧 Returns orderId
                        end note
                        
                        LockInEscrow --> OrderCreated: Success
                        LockInEscrow --> [*]: Failed
                    }
                    
                    state CreateBuyOrder {
                        [*] --> ValidateETHBalance
                        
                        note right of ValidateETHBalance
                            🔧 Check ETH/native balance
                            🔧 Ensure >= total cost
                        end note
                        
                        ValidateETHBalance --> DepositToEscrow: Has funds
                        
                        note right of DepositToEscrow
                            🔐 Contract: ESCROW.createBuyOrder(tokenId, amount, pricePerToken) payable
                            🔧 Send ETH with tx
                            🔧 Locked in escrow
                            🔧 Emits OrderCreated
                        end note
                        
                        DepositToEscrow --> OrderCreated
                    }
                    
                    state FillOrder {
                        [*] --> SelectOrder
                        
                        note right of SelectOrder
                            📁 src/pages/trading/TradingPage.tsx
                            🔧 Show order book
                            🔧 User clicks order
                        end note
                        
                        SelectOrder --> ExecuteFill
                        
                        note right of ExecuteFill
                            🔐 Contract: ESCROW.fillOrder(orderId, amountToFill)
                            🔧 If sell order: send ETH
                            🔧 If buy order: approve & transfer tokens
                            🔧 Atomic swap via escrow
                            🔧 Emits OrderFilled
                        end note
                        
                        ExecuteFill --> OrderFilled: Success
                        OrderFilled --> LoadTradingTerminal: Refresh
                    }
                    
                    state CancelOrder {
                        [*] --> ConfirmCancel
                        
                        note right of ConfirmCancel
                            🔐 Contract: ESCROW.cancelOrder(orderId)
                            🔧 Verify msg.sender is order creator
                            🔧 Return escrowed assets
                            🔧 Emits OrderCancelled
                        end note
                        
                        ConfirmCancel --> OrderCancelled
                        OrderCancelled --> LoadTradingTerminal
                    }
                }
            }
            
            state YieldReports {
                [*] --> LoadYieldData
                
                note right of LoadYieldData
                    📁 src/components/income/YieldIncomeReport.tsx
                    📁 src/components/invoice-financing/investor/TokenStatusCard.tsx
                    📁 src/components/invoice-financing/investor/PortfolioSettlements.tsx
                    🔐 Contract: PAYMENT_SPLITTER_CONTRACT
                    🔧 Fetch settlement events
                    🔧 Calculate yields per token
                    🔧 Display distribution history
                end note
                
                LoadYieldData --> DisplayReports
                
                note right of DisplayReports
                    🔧 Monthly/yearly income
                    🔧 Per-asset breakdown
                    🔧 Settlement status
                    🔧 Claimable amounts
                end note
                
                DisplayReports --> ClaimYield: Claim rewards
                
                note right of ClaimYield
                    🔐 Contract: PAYMENT_SPLITTER.claimYield(tokenId)
                    🔧 Transfer accrued yield to user
                    🔧 Update balance
                end note
            }
            
            state SecondaryMarket {
                [*] --> OpenP2PTrade
                
                note right of OpenP2PTrade
                    📁 src/components/SecondaryMarketplace.tsx
                    🔧 Permissionless trading
                    🚫 No KYC required
                    🔧 Direct peer-to-peer
                    🔧 Real-time orderbook
                end note
            }
        }
        
        state AdminDashboard {
            [*] --> AdminPanel
            
            note right of AdminPanel
                📁 src/pages/admin/admin.tsx
                📁 src/services/adminService.js
                📁 src/services/adminTokenManagementService.js
                🔧 Platform metrics dashboard
                🔧 User management interface
                🔧 Token approval queue
                🔧 System monitoring
            end note
            
            AdminPanel --> UserManagement
            AdminPanel --> TokenApproval
            AdminPanel --> InvoiceSettlement
            AdminPanel --> SystemMetrics
            
            state UserManagement {
                [*] --> ViewUsers
                
                note right of ViewUsers
                    📁 src/pages/admin/admin.tsx
                    🔧 List all users from MongoDB
                    🔧 Filter by role
                    🔧 Search functionality
                end note
                
                ViewUsers --> AddIssuer: Add new issuer
                ViewUsers --> AddManager: Add new manager
                ViewUsers --> RemoveUser: Remove user
                ViewUsers --> UpdateRole: Change roles
                
                note right of AddIssuer
                    📁 src/services/adminService.js
                    🔐 Contract: ADMIN_CONTRACT.addIssuer(address, metadataURI)
                    🔧 Upload metadata to IPFS
                    🔧 Emit IssuerAdded event
                    🔧 Update DB
                end note
                
                note right of AddManager
                    🔐 Contract: ADMIN_CONTRACT.addManager(address, metadataURI)
                    🔧 Similar to addIssuer
                    🔧 Grant manager permissions
                end note
                
                note right of RemoveUser
                    🔐 Contract: ADMIN_CONTRACT.removeIssuer/removeManager(address)
                    🔧 Revoke on-chain permissions
                    🔧 Update DB status
                end note
            }
            
            state TokenApproval {
                [*] --> LoadPendingRequests
                
                note right of LoadPendingRequests
                    📁 src/services/adminTokenManagementService.js
                    🔐 Contract: TOKEN_MANAGEMENT_CONTRACT.getPendingRequests()
                    🔧 Returns array of requestIds
                    🔧 Fetch details for each
                end note
                
                LoadPendingRequests --> ReviewRequest
                
                note right of ReviewRequest
                    📁 src/pages/admin/admin.tsx
                    🔧 Display metadata
                    🔧 Show IPFS content
                    🔧 Verify asset details
                    🔧 Check issuer credentials
                end note
                
                ReviewRequest --> ApproveRequest: Approve
                ReviewRequest --> RejectRequest: Reject
                
                note right of ApproveRequest
                    🔐 Contract: TOKEN_MANAGEMENT.approveTokenRequest(requestId)
                    🔧 Emit TokenRequestApproved
                    🔧 Update status to 'Approved'
                    🔧 Ready for deployment
                end note
                
                ApproveRequest --> DeployToken
                
                note right of DeployToken
                    📁 src/services/adminTokenManagementService.js
                    🔐 Contract: TOKEN_MANAGEMENT.deployApprovedToken(requestId)
                    🔧 Mints ERC1155 tokens
                    🔧 Sets metadata URI
                    🔧 Returns tokenId
                    🔧 Emit TokenDeployed event
                end note
                
                DeployToken --> ListOnMarketplace
                
                note right of ListOnMarketplace
                    🔐 Contract: TOKEN_MANAGEMENT.listAsset(requestId, amount)
                    🔧 Creates marketplace listing
                    🔧 Sets price from request
                    🔧 Emit TokenListedOnMarketplace
                    🔧 Now visible to users
                end note
                
                ListOnMarketplace --> AdminPanel: Complete
                
                note right of RejectRequest
                    🔐 Contract: TOKEN_MANAGEMENT.rejectTokenRequest(requestId, reason)
                    🔧 Store rejection reason
                    🔧 Notify issuer
                    🔧 Emit TokenRequestRejected
                end note
                
                RejectRequest --> AdminPanel
            }
            
            state InvoiceSettlement {
                [*] --> LoadActiveInvoices
                
                note right of LoadActiveInvoices
                    📁 src/components/invoice-financing/admin/InvoiceSettlementPanel.tsx
                    📁 src/components/invoice-financing/admin/TokenLifecycleMonitor.tsx
                    📁 src/services/invoiceFinancingService.js
                    🔐 Contract: TOKEN_MANAGEMENT
                    🔧 Query tokens with lifecycle: 'Invoice'
                    🔧 Check maturity dates
                end note
                
                LoadActiveInvoices --> ProcessSettlement
                
                note right of ProcessSettlement
                    🔐 Contract: PAYMENT_SPLITTER.settleInvoice(tokenId, paymentAmount)
                    🔧 Distribute yield to token holders
                    🔧 Calculate proportional shares
                    🔧 Emit YieldDistributed events
                end note
                
                ProcessSettlement --> BurnTokens
                
                note right of BurnTokens
                    🔐 Contract: TOKEN_CONTRACT.burn(tokenId, totalSupply)
                    🔧 Remove settled tokens
                    🔧 Update token lifecycle
                    🔧 Archive in DB
                end note
                
                BurnTokens --> AdminPanel: Settlement complete
            }
            
            state SystemMetrics {
                [*] --> DisplayMetrics
                
                note right of DisplayMetrics
                    📁 src/pages/admin/admin.tsx
                    🔧 Total users by role
                    🔧 Active tokens count
                    🔧 Total platform volume
                    🔧 Marketplace status
                    🔧 Recent transactions
                end note
            }
        }
        
        state IssuerDashboard {
            [*] --> CheckAuthorization
            
            note right of CheckAuthorization
                📁 src/services/robustAuthorizationService.js
                🔐 Contract: ADMIN_CONTRACT.isIssuer(address)
                🔧 Verify on-chain permissions
                🔧 Check wallet match
                🔧 Block if unauthorized
            end note
            
            CheckAuthorization --> IssuerPanel: Authorized
            CheckAuthorization --> UnauthorizedView: Not authorized
            
            note right of UnauthorizedView
                🚫 Show permission error
                🚫 Provide contact admin link
            end note
            
            state IssuerPanel {
                [*] --> LoadMyRequests
                
                note right of LoadMyRequests
                    📁 src/pages/Issuer/newIssuerDashboard.tsx
                    📁 src/services/tokenManagementService.js
                    🔐 Contract: TOKEN_MANAGEMENT.getMyRequests()
                    🔧 Filter by issuer address
                    🔧 Show status: Pending/Approved/Rejected/Deployed
                end note
                
                LoadMyRequests --> ViewRequests
                
                ViewRequests --> CreateRequest: New request
                ViewRequests --> ViewDetails: Click existing
                
                state CreateRequest {
                    [*] --> CollectAssetInfo
                    
                    note right of CollectAssetInfo
                        📁 src/pages/Issuer/newIssuerDashboard.tsx
                        🔧 Form fields: title, description, assetType
                        🔧 amount, pricePerToken
                        🔧 Upload images (multiple)
                    end note
                    
                    CollectAssetInfo --> UploadToIPFS
                    
                    note right of UploadToIPFS
                        📁 src/utils/pinata.ts
                        🔧 Upload images to Pinata
                        🔧 Get IPFS hashes
                        🔧 Create metadata JSON
                        🔧 Upload metadata to IPFS
                        🔧 Returns metadataURI
                    end note
                    
                    UploadToIPFS --> SubmitRequest
                    
                    note right of SubmitRequest
                        📁 src/services/tokenManagementService.js
                        🔐 Contract: TOKEN_MANAGEMENT.submitTokenRequest(metadataURI, amount, price)
                        🔧 Emit TokenRequestSubmitted
                        🔧 Returns requestId
                        🔧 Status: Pending
                    end note
                    
                    SubmitRequest --> RequestSubmitted: Success
                    SubmitRequest --> [*]: Failed
                    
                    RequestSubmitted --> LoadMyRequests: Refresh
                }
                
                state ViewDetails {
                    [*] --> ShowRequestInfo
                    
                    note right of ShowRequestInfo
                        📁 src/pages/Issuer/newIssuerDashboard.tsx
                        🔧 Display metadata
                        🔧 Show images from IPFS
                        🔧 Current status
                        🔧 Admin feedback if rejected
                    end note
                    
                    ShowRequestInfo --> DirectListing: Deploy approved token
                    ShowRequestInfo --> [*]: Close
                    
                    note right of DirectListing
                        📁 src/services/directMarketplaceListingService.js
                        🔧 For pre-approved issuers
                        🔧 Direct deployment + listing
                        🔧 Skip admin approval
                    end note
                }
            }
        }
        
        state ManagerDashboard {
            [*] --> ManagerPanel
            
            note right of ManagerPanel
                📁 src/pages/managerdashboard/managerDashboard.tsx
                🔧 View assigned tokens
                🔧 Monitor asset performance
                🔧 Update metadata as needed
            end note
            
            ManagerPanel --> ViewAssignedTokens
            ManagerPanel --> UpdateMetadata
            
            note right of ViewAssignedTokens
                🔐 Contract: TOKEN_MANAGEMENT.getTokensByManager(address)
                🔧 Show tokens under management
                🔧 Performance metrics
            end note
            
            state UpdateMetadata {
                [*] --> EditMetadata
                
                note right of EditMetadata
                    📁 src/services/metadataService.ts
                    📁 src/utils/pinata.ts
                    🔧 Modify asset details
                    🔧 Upload new metadata to IPFS
                    🔧 Get new metadataURI
                end note
                
                EditMetadata --> UpdateContract
                
                note right of UpdateContract
                    🔐 Contract: ASSET_REGISTRY.updateAssetMetadata(tokenId, newURI)
                    🔧 Emit MetadataUpdated
                    🔧 Invalidate caches
                end note
                
                UpdateContract --> ManagerPanel
            }
        }
    }
    
    Authenticated --> Logout: User logs out
    
    note right of Logout
        📁 src/context/AuthContext.tsx
        🔧 localStorage.clear()
        🔧 Reset auth state
        🔧 Disconnect wallet
        🔧 Clear all caches
        🔧 Navigate to /
    end note
    
    Logout --> [*]
    
    classDef publicState fill:#e1f5ff,stroke:#0288d1,stroke-width:2px,color:#000
    classDef authState fill:#fff9c4,stroke:#f57c00,stroke-width:2px,color:#000
    classDef userState fill:#c8e6c9,stroke:#388e3c,stroke-width:2px,color:#000
    classDef adminState fill:#ffccbc,stroke:#d84315,stroke-width:2px,color:#000
    classDef issuerState fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef managerState fill:#e1bee7,stroke:#8e24aa,stroke-width:2px,color:#000
    classDef contractState fill:#ffe0b2,stroke:#ef6c00,stroke-width:3px,color:#000
    classDef errorState fill:#ffcdd2,stroke:#c62828,stroke-width:2px,color:#000
    classDef cacheState fill:#f0f4c3,stroke:#9e9d24,stroke-width:2px,color:#000
    
    class Unauthenticated,PublicPages,AboutPage publicState
    class LoginPage,EmailSignup,EmailLogin,WalletLogin authState
    class UserDashboard,PortfolioView,Marketplace,OrderBook,YieldReports userState
    class AdminDashboard,AdminPanel,UserManagement,TokenApproval,InvoiceSettlement adminState
    class IssuerDashboard,IssuerPanel,CreateRequest issuerState
    class ManagerDashboard,ManagerPanel,UpdateMetadata managerState
    class ConfirmPurchase,DeployToken,CreateSellOrder,CreateBuyOrder,ProcessSettlement contractState
    class NetworkError,UnauthorizedView,PurchaseFailed errorState
    class LoadCache,EnrichMetadata cacheState
```

---

## 📋 Detailed Component Mapping

### **Context Providers**
| Component | Location | Responsibility |
|-----------|----------|----------------|
| WalletContext | `src/context/WalletContext.tsx` | MetaMask connection, network management, signer |
| AuthContext | `src/context/AuthContext.tsx` | JWT auth, role management, login/logout |

### **API Integration**
| Endpoint | Method | Location | Purpose |
|----------|--------|----------|---------|
| `/api/auth/register` | POST | `src/api/authApi.ts` | User registration |
| `/api/auth/login` | POST | `src/api/authApi.ts` | User login (email/wallet) |
| `/api/auth/verify-wallet` | POST | `src/api/authApi.ts` | Check wallet in DB |
| `/api/auth/ping` | GET | `src/api/authApi.ts` | Keep-alive (5min interval) |

### **Smart Contracts**
| Contract | Address Constant | ABI Location | Key Functions |
|----------|-----------------|--------------|---------------|
| Marketplace | `MARKETPLACE_CONTRACT` | `utils/marketplaceABI.ts` | `getAllListings()`, `buyListing()` |
| Token (ERC1155) | `TOKEN_CONTRACT` | `lib/contractAbis.js` | `uri()`, `balanceOf()`, `setApprovalForAll()` |
| Admin | `ADMIN_CONTRACT` | `lib/contractAbis.js` | `isIssuer()`, `addIssuer()`, `removeManager()` |
| Token Management | `TOKEN_MANAGEMENT_CONTRACT` | `services/tokenManagementService.js` | `submitTokenRequest()`, `approveTokenRequest()`, `deployApprovedToken()` |
| Order Book Escrow | `ORDER_BOOK_ESCROW_CONTRACT` | `utils/orderBookEscrowABI.ts` | `createSellOrder()`, `fillOrder()`, `cancelOrder()` |
| Payment Splitter | `PAYMENT_SPLITTER_CONTRACT` | `lib/contractAbis.js` | `settleInvoice()`, `claimYield()` |

### **Services Layer**
| Service | File | Purpose |
|---------|------|---------|
| AdminService | `services/adminService.js` | User management, attestations |
| TokenManagementService | `services/tokenManagementService.js` | Issuer request workflow |
| InvoiceFinancingService | `services/invoiceFinancingService.js` | Invoice tokenization & settlement |
| TradingService | `services/tradingService.ts` | Historical trades, candlestick data |
| ComplianceService | `services/complianceService.ts` | KYC/AML verification |
| MetadataService | `services/metadataService.ts` | IPFS metadata fetching |
| PinataService | `services/pinataService.ts` | IPFS upload via Pinata |

### **Caching System**
| Cache | File | TTL | Purpose |
|-------|------|-----|---------|
| Marketplace Listings | `utils/marketplaceCache.ts` | 10 min | Quick load of available assets |
| Asset Metadata | `utils/marketplaceCache.ts` | 24 hrs | Stable token metadata |
| IPFS Images | `utils/marketplaceCache.ts` | 7 days | Processed image URLs |
| User Portfolio | `utils/dashboardCache.ts` | 5 min | Owned tokens & balances |
| Failed Fetch Markers | `utils/dummyDataUtils.ts` | 1 hr | Prevent repeated failed IPFS calls |

---

## 🔐 Smart Contract Integration

### **Purchase Flow**
```typescript
// 1. Check approval
const isApproved = await tokenContract.isApprovedForAll(userAddress, MARKETPLACE_CONTRACT);

// 2. If not approved, approve
if (!isApproved) {
  const tx = await tokenContract.setApprovalForAll(MARKETPLACE_CONTRACT, true);
  await tx.wait();
}

// 3. Execute purchase
const price = listing.price; // Wei
const platformFee = price * 0.01; // 1%
const total = price + platformFee;

const tx = await marketplaceContract.buyListing(tokenId, amount, {
  value: total
});
await tx.wait();
```

### **Order Book Trading**
```typescript
// Sell Order (Lock tokens in escrow)
const tx = await escrowContract.createSellOrder(tokenId, amount, pricePerToken);
await tx.wait();

// Buy Order (Lock ETH in escrow)
const totalCost = amount * pricePerToken;
const tx = await escrowContract.createBuyOrder(tokenId, amount, pricePerToken, {
  value: totalCost
});
await tx.wait();

// Fill Order (Atomic swap)
const tx = await escrowContract.fillOrder(orderId, amountToFill);
await tx.wait();
```

### **Token Issuance Workflow**
```typescript
// 1. Issuer submits request
const metadataURI = "ipfs://Qm...";
const tx = await tokenManagementContract.submitTokenRequest(metadataURI, amount, price);
const receipt = await tx.wait();
const requestId = receipt.events.find(e => e.event === 'TokenRequestSubmitted').args.requestId;

// 2. Admin approves
const tx = await tokenManagementContract.approveTokenRequest(requestId);
await tx.wait();

// 3. Admin deploys
const tx = await tokenManagementContract.deployApprovedToken(requestId);
const receipt = await tx.wait();
const tokenId = receipt.events.find(e => e.event === 'TokenDeployed').args.tokenId;

// 4. Admin lists on marketplace
const tx = await tokenManagementContract.listAsset(requestId, amount);
await tx.wait();
```

---

## 🌐 API Endpoints (Backend)

### **Authentication**
- **POST** `/api/auth/register` - Create new user account
- **POST** `/api/auth/login` - Login with email/password
- **POST** `/api/auth/verify-wallet` - Check wallet registration status
- **GET** `/api/auth/ping` - Keep session alive

### **User Management (Admin)**
- **GET** `/api/admin/users` - List all users
- **POST** `/api/admin/users/issuer` - Add issuer role
- **POST** `/api/admin/users/manager` - Add manager role
- **DELETE** `/api/admin/users/:id` - Remove user/revoke role

### **Asset Metadata (Future)**
- **GET** `/api/metadata/:tokenId` - Fetch cached metadata
- **POST** `/api/metadata/:tokenId` - Update metadata cache

---

## 📊 Data Flow Patterns

### **User Purchase Journey**
```
User → Marketplace Page
  ↓ Fetch listings from cache
  ↓ If cache expired/missing → Blockchain query
  ↓ Enrich with metadata (IPFS)
  ↓ Display assets
User → Clicks asset
  ↓ Open BuyModal
  ↓ Check approval status
  ↓ Request approval (if needed)
  ↓ Execute buyListing()
  ↓ Wait for confirmation
  ↓ Invalidate caches
  ↓ Refresh portfolio
  ↓ Show success message
```

### **Issuer Token Creation**
```
Issuer → Dashboard
  ↓ Check authorization (on-chain)
  ↓ Fill asset form
  ↓ Upload images to Pinata
  ↓ Create metadata JSON
  ↓ Upload metadata to Pinata
  ↓ Submit request to contract
  ↓ Wait for admin approval
Admin → Review request
  ↓ Approve/Reject
  ↓ If approved → Deploy token
  ↓ List on marketplace
User → Can now purchase
```

### **P2P Trading Flow**
```
User A → Create Sell Order
  ↓ Approve escrow contract
  ↓ Lock tokens in escrow
  ↓ Order appears in order book
User B → Views order book
  ↓ Clicks buy order
  ↓ Send ETH to escrow
  ↓ Atomic swap executed
  ↓ User B receives tokens
  ↓ User A receives ETH
  ↓ Order removed from book
```

---

## 🎨 Color Legend

- **Light Blue** (#e1f5ff): Public/Unauthenticated states
- **Yellow** (#fff9c4): Authentication & login states
- **Green** (#c8e6c9): User/Investor states
- **Orange Red** (#ffccbc): Admin states
- **Purple** (#f3e5f5): Issuer states
- **Light Purple** (#e1bee7): Manager states
- **Deep Orange** (#ffe0b2): Smart contract interactions (thick border)
- **Red** (#ffcdd2): Error states
- **Lime** (#f0f4c3): Caching operations

---

## 🚀 Usage Tips

1. **Follow state transitions** to understand user journeys
2. **Check notes** on each state for responsible files
3. **Smart contract icons** (🔐) indicate blockchain calls
4. **Tool icons** (🔧) show operations performed
5. **Block icons** (🚫) mark restricted/error states
6. **Folder icons** (📁) reference source files

---

## 📝 Notes

- All timestamps use Unix epoch (milliseconds)
- Prices stored in Wei (1 ETH = 10^18 Wei)
- Cache TTLs configurable in respective files
- Network ID 747 = Flow EVM Testnet
- IPFS gateway: Pinata (https://gateway.pinata.cloud)
- MongoDB stores user data, blockchain stores asset data
- JWT expiration: 24 hours (configurable)

---

**Last Updated**: December 12, 2025
**Version**: 2.0 (Comprehensive)
