# 🎨 FRONTEND SPECIFICATION
## RWA Tokenization Platform - Current Implementation

**Version:** 1.0 (Current Implementation)
**Date:** December 11, 2025
**Platform:** Real Estate & Invoice Tokenization on Flow Blockchain
**Tech Stack:** React + TypeScript + ethers.js + Tailwind CSS

---

## 📋 OVERVIEW

This document details the current frontend implementation of the RWA tokenization platform.

**Architecture:**
1. **React Context API** for global state management (Auth, Wallet)
2. **ethers.js** for blockchain interactions with Flow EVM
3. **JWT Authentication** with role-based access control
4. **MetaMask Integration** for wallet connection
5. **Smart Contract Services** for blockchain operations

---

## 🏗️ PROJECT STRUCTURE

### **Core Directories**
```
src/
├── api/                    # API client modules
│   └── authApi.ts         # Authentication API client
├── context/               # React Context providers
│   ├── AuthContext.tsx    # Authentication state management
│   └── WalletContext.tsx  # Wallet connection management
├── services/              # Blockchain service layer
│   ├── adminService.js
│   ├── adminTokenManagementService.js
│   ├── directMarketplaceListingService.js
│   ├── invoiceFinancingService.js
│   ├── issuerService.js
│   ├── robustAuthorizationService.js
│   ├── tokenManagementService.js
│   └── tradingService.ts
├── hooks/                 # Custom React hooks
│   ├── useWeb3Contracts.ts
│   └── useOrderBook.ts
├── components/            # Reusable UI components
│   ├── BuyModal.tsx
│   ├── AssetCard.tsx
│   └── SecondaryMarketplace.tsx
├── pages/                 # Page components
│   ├── login/
│   ├── dashboard/
│   ├── marketplace/
│   ├── Issuer/
│   ├── admin/
│   └── managerdashboard/
└── lib/                   # Configuration and utilities
    ├── contractAddress.ts # Smart contract addresses
    └── contractAbis.ts    # Contract ABI definitions
```

---

## 🔐 AUTHENTICATION ARCHITECTURE

### **1. AuthContext (`src/context/AuthContext.tsx`)**

**Purpose:** Global authentication state management

**Key Features:**
- JWT token management (localStorage)
- User profile storage
- Multi-role system (admin, issuer, manager, user)
- Role switching functionality
- Authorization helpers

**State:**
```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  userRoles: string[];
  currentRole: string | null;
  primaryRole: string | null;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  switchRole: (role: string) => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canAccess: (allowedRoles: string[]) => boolean;
}
```

**Usage:**
```typescript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, currentRole, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <div>Welcome, {user?.firstName}!</div>;
}
```

---

### **2. WalletContext (`src/context/WalletContext.tsx`)**

**Purpose:** MetaMask wallet connection and network management

**Key Features:**
- MetaMask integration via ethers.js
- Auto-connect on page load
- Network validation (Flow Testnet - Chain ID: 747)
- Network switching
- Account and chain change listeners

**State:**
```typescript
interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  network: string | null;
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToRequiredNetwork: () => Promise<boolean>;
  isCorrectNetwork: boolean;
}
```

**Usage:**
```typescript
import { useWallet } from '../context/WalletContext';

function ConnectButton() {
  const { isConnected, address, connectWallet } = useWallet();

  if (isConnected) {
    return <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>;
  }

  return <button onClick={connectWallet}>Connect Wallet</button>;
}
```

---

## 🔗 BLOCKCHAIN INTEGRATION

### **Network Configuration (`src/lib/contractAddress.ts`)**

```typescript
export const NETWORK_CONFIG = {
  FLOW_TESTNET: {
    chainId: 747,
    name: 'Flow EVM Testnet',
    rpcUrl: 'https://testnet.evm.nodes.onflow.org',
    blockExplorer: 'https://evm-testnet.flowscan.io',
    nativeCurrency: {
      name: 'Flow',
      symbol: 'FLOW',
      decimals: 18
    }
  }
};

export const ACTIVE_NETWORK = 'FLOW_TESTNET';

// Smart Contract Addresses
export const ADMIN_CONTRACT = '0xFC53E7A6b94173D82d07a127A38d9D852bf478d4';
export const TOKEN_CONTRACT = '0x24eb8429Dc1e5f217866D0c74Db245Fa3aAFA31A';
export const MARKETPLACE_CONTRACT = '0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF';
export const PAYMENT_SPLITTER_CONTRACT = '0x6f2db3e628879ee72B455a946C1d6cfBa51aac91';
export const TOKEN_MANAGEMENT_CONTRACT = '0xA632A492cCd898De4a4B17DC786B381d099F5815';
```

---

### **Service Layer Architecture**

#### **1. robustAuthorizationService.js**

**Purpose:** On-chain authorization verification

```javascript
class RobustAuthorizationService {
  async initialize(provider): Promise<void>
  async isAuthorizedIssuer(address: string, adminContractAddress: string): Promise<boolean>
}
```

**Flow:**
```
User attempts action
  → Frontend checks JWT role (AuthContext)
  → Frontend calls service.isAuthorizedIssuer(address)
  → Service calls Admin contract: contract.isIssuer(address)
  → Returns true/false
```

---

#### **2. directMarketplaceListingService.js**

**Purpose:** List tokens on marketplace

```javascript
class DirectMarketplaceListingService {
  async initialize(provider, contractAddresses): Promise<boolean>
  async listTokenDirectly(requestId: string, amount: number): Promise<{ success, transactionHash, tokenId, amount }>
  async approveMarketplace(): Promise<string>
  async listTokenWithAutoApproval(requestId: string, amount: number): Promise<any>
}
```

**Flow:**
```
Issuer creates token
  → Token deployed to blockchain
  → Issuer lists on marketplace
  → Check marketplace approval
  → If not approved, call token.setApprovalForAll(marketplace, true)
  → Call marketplace.listAsset(tokenId, amount)
  → Token available for purchase
```

---

#### **3. tokenManagementService.js**

**Purpose:** Token request and deployment management

```javascript
class TokenManagementService {
  async initialize(provider, contractAddresses): Promise<void>
  async submitTokenRequest(metadataURI: string, amount: number, pricePerToken: string): Promise<string>
  async getRequestDetails(requestId: string): Promise<RequestDetails>
  async deployApprovedToken(requestId: string): Promise<string>
}
```

---

## 🎯 AUTHENTICATION FLOWS

### **Login Flow**
```
1. User enters email + password
2. Frontend validates input
3. POST /auth/login to backend
4. Backend verifies credentials, returns JWT + user data
5. Frontend stores token in localStorage
6. AuthContext updates state (isAuthenticated = true)
7. User clicks "Connect Wallet"
8. WalletContext.connectWallet() via MetaMask
9. ethers.js creates provider and signer
10. Check network (should be Flow Testnet - 747)
11. If wrong network, prompt to switch
12. Store wallet connection in localStorage
13. Redirect to dashboard based on currentRole
```

### **Authorization Flow (for Issuer Actions)**
```
1. User navigates to Issuer Dashboard
2. Frontend checks AuthContext.currentRole === 'issuer'
3. Frontend checks WalletContext.isConnected
4. Frontend initializes robustAuthorizationService
5. Service calls Admin contract: isIssuer(userAddress)
6. If authorized, show dashboard UI
7. If not authorized, show error message
```

### **Token Creation Flow**
```
1. Issuer fills token request form
2. Upload images to Pinata IPFS
3. Create metadata JSON
4. Upload metadata to Pinata IPFS
5. Call tokenManagementService.submitTokenRequest()
6. Contract emits TokenRequestSubmitted event
7. Admin receives notification
8. Admin approves request via Admin Dashboard
9. Contract updates request status to approved
10. Issuer deploys token via deployApprovedToken()
11. Contract mints ERC1155 tokens
12. Issuer lists on marketplace
```

### **Buy/Sell Flow**
```
Buy Flow:
1. User browses marketplace
2. User clicks "Buy" on listing
3. BuyModal opens with listing details
4. User enters quantity
5. Frontend calculates: total = quantity * pricePerToken
6. User confirms purchase
7. Frontend calls marketplace.buyToken(tokenId, quantity, { value: total })
8. MetaMask prompts for transaction approval
9. Transaction confirmed on blockchain
10. Marketplace contract transfers tokens to buyer
11. Payment sent to seller
12. Frontend updates UI with new balances

Sell Flow:
1. User navigates to portfolio
2. User clicks "Sell" on owned token
3. SellModal opens
4. User enters quantity to sell
5. Frontend calls marketplace.sellToken(tokenId, quantity)
6. Contract transfers tokens back to marketplace
7. Contract pays user based on current price
8. Frontend updates UI
```

---

## ✅ IMPLEMENTATION SUMMARY

### **Current Technology Stack**
✅ **Framework:** React 18+ with TypeScript
✅ **Styling:** Tailwind CSS + shadcn/ui components
✅ **State Management:** React Context API (AuthContext + WalletContext)
✅ **Blockchain:** ethers.js v5 for Flow EVM interaction
✅ **Authentication:** JWT tokens with localStorage
✅ **IPFS:** Pinata for metadata and image storage
✅ **Routing:** React Router v6

### **Key Features Implemented**
✅ Multi-role authentication (admin, issuer, manager, user)
✅ MetaMask wallet connection with auto-reconnect
✅ Network validation and switching (Flow Testnet)
✅ Token request and approval workflow
✅ Marketplace listing and trading
✅ Invoice financing with settlement
✅ Real-time balance updates
✅ Role switching for multi-role users
✅ On-chain authorization verification

### **Smart Contract Integration**
✅ Admin Contract - Role management
✅ TokenManagement Contract - Token request workflow
✅ Marketplace Contract - Buy/sell functionality
✅ ERC1155Core Contract - Token standard
✅ PaymentSplitter Contract - Revenue distribution

### **Page Structure**
- `/login` - Authentication page (email + wallet)
- `/` - Landing/home page
- `/marketplace` - Browse and buy tokens
- `/dashboard` - User portfolio and holdings
- `/issuer` - Issuer dashboard (create tokens)
- `/admin` - Admin panel (approve requests, manage users)
- `/manager` - Manager dashboard (settlements)

**End of Frontend Specification. This document reflects the current implementation as of December 11, 2025.**
