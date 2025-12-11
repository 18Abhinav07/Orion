# 🖥️ BACKEND API SPECIFICATION
## RWA Tokenization Platform - Authentication & Asset Management Service

**Version:** 1.0 (Current Implementation)
**Date:** December 11, 2025
**Platform:** Real Estate & Invoice Tokenization on Flow Blockchain
**Tech Stack:** Node.js + Express + MongoDB + JWT Authentication

---

## 📋 OVERVIEW

The backend serves as the authentication and asset management layer for the RWA tokenization platform. It provides:

1. **User Authentication:** JWT-based authentication with role management
2. **Multi-Role System:** Support for admin, issuer, manager, and user roles
3. **Wallet Integration:** Link wallet addresses to user accounts
4. **Asset Metadata Storage:** Store and manage tokenized asset metadata
5. **Role-Based Access Control:** Enforce permissions for different user types

**Architecture:**
- **Frontend:** React + ethers.js for blockchain interaction
- **Backend:** Node.js + Express for authentication and business logic
- **Blockchain:** Flow Testnet (Chain ID: 747) for smart contracts
- **Database:** MongoDB for user data and asset metadata

---

## 🔧 TECH STACK

### **Current Implementation**
```json
{
  "runtime": "Node.js 18+",
  "framework": "Express.js 4.18+",
  "database": "MongoDB 6+",
  "authentication": "JWT (jsonwebtoken)",
  "encryption": "bcryptjs for password hashing",
  "validation": "express-validator",
  "cors": "cors middleware",
  "fileUpload": "multer (for IPFS uploads)",
  "ipfs": "pinata-sdk",
  "environment": "dotenv",
  "blockchain": "ethers.js for Flow EVM interaction"
}
```

### **Database Structure**
```javascript
// MongoDB Collections:
{
  "users": {
    "schema": "User accounts with roles and wallet addresses",
    "indexes": ["email", "walletAddress", "roles"]
  },
  "assets": {
    "schema": "Tokenized asset metadata",
    "indexes": ["tokenId", "issuer", "status"]
  },
  "transactions": {
    "schema": "Transaction history tracking",
    "indexes": ["txHash", "user", "timestamp"]
  }
}
```

---

## 🗄️ DATABASE SCHEMA (MongoDB)

### **User Collection**

```javascript
// Collection: users
{
  _id: ObjectId,

  // Basic Info
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique, indexed),
  password: String (required, hashed with bcrypt),

  // Blockchain Integration
  walletAddress: String (required, unique, indexed),

  // Role Management
  roles: Array<String>, // ['admin', 'issuer', 'manager', 'user']
  primaryRole: String, // Default role for the user

  // KYC & Verification
  isVerified: Boolean (default: false),
  kycStatus: String (default: 'pending'), // pending, approved, rejected

  // Contact Info
  phone: String (optional),
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },

  // User Preferences
  preferences: {
    notifications: {
      email: Boolean (default: true),
      sms: Boolean (default: false),
      push: Boolean (default: true)
    },
    currency: String (default: 'USD'),
    language: String (default: 'en')
  },

  // Timestamps
  createdAt: Date (default: Now),
  updatedAt: Date (default: Now),
  lastLogin: Date
}
```

### **Asset Collection**

```javascript
// Collection: assets (Tokenized RWA metadata)
{
  _id: ObjectId,

  // Blockchain Data
  tokenId: String (indexed),
  contractAddress: String,
  chainId: Number (default: 747), // Flow Testnet

  // Asset Information
  name: String (required),
  description: String,
  assetType: String, // 'Invoice', 'RealEstate', 'Commodity', etc.

  // IPFS Metadata
  metadataURI: String, // IPFS URI (ipfs://...)
  ipfsCid: String, // Pinata CID
  imageURIs: Array<String>, // Asset images

  // Ownership & Issuer
  issuer: String (indexed), // Wallet address of issuer
  owner: String (indexed), // Current owner address

  // Token Economics
  totalSupply: Number,
  pricePerToken: String, // Wei format
  availableAmount: Number,

  // Status Tracking
  status: String (indexed), // 'pending', 'approved', 'deployed', 'listed', 'settled'
  approved: Boolean (default: false),
  deployed: Boolean (default: false),
  listedOnMarketplace: Boolean (default: false),

  // Settlement (for invoices)
  isSettled: Boolean (default: false),
  settlementAmount: String,
  settlementDate: Date,

  // Asset Attributes (flexible metadata)
  attributes: Array<{
    trait_type: String,
    value: String
  }>,

  // Timestamps
  createdAt: Date (default: Now),
  updatedAt: Date (default: Now),
  approvedAt: Date,
  deployedAt: Date,
  listedAt: Date
}
```

### **Transaction Collection**

```javascript
// Collection: transactions (Activity tracking)
{
  _id: ObjectId,

  // Transaction Details
  txHash: String (indexed, unique),
  blockNumber: Number,
  chainId: Number (default: 747),

  // Transaction Type
  type: String, // 'register', 'approve', 'deploy', 'list', 'buy', 'sell', 'settle'

  // Participants
  from: String (indexed), // Sender wallet address
  to: String (indexed), // Receiver wallet address

  // Asset Reference
  tokenId: String (indexed),
  amount: Number,
  price: String, // Wei format

  // Status
  status: String, // 'pending', 'confirmed', 'failed'

  // Timestamps
  timestamp: Date (default: Now),
  confirmedAt: Date
}
```

### **Indexes for Performance**
```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ walletAddress: 1 }, { unique: true });
db.users.createIndex({ roles: 1 });

// Assets collection
db.assets.createIndex({ tokenId: 1 });
db.assets.createIndex({ issuer: 1 });
db.assets.createIndex({ status: 1 });
db.assets.createIndex({ assetType: 1 });

// Transactions collection
db.transactions.createIndex({ txHash: 1 }, { unique: true });
db.transactions.createIndex({ from: 1 });
db.transactions.createIndex({ to: 1 });
db.transactions.createIndex({ tokenId: 1 });
db.transactions.createIndex({ timestamp: -1 });
```

---

## 📡 API ENDPOINTS

### **Base URL:** `http://localhost:3001/api` (Backend Server)
### **Auth Base:** `http://localhost:3001/auth` (Authentication Endpoints)

---

## 🔐 AUTHENTICATION ENDPOINTS

### **1. POST `/auth/register`**

**Purpose:** Register new user account with wallet address

**Authentication:** None (public endpoint)

**Request:**
```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "role": "user" // Optional: 'admin', 'issuer', 'manager', 'user' (default: 'user')
}
```

**Processing Steps:**
1. Validate input data (email format, password strength, wallet address format)
2. Check if email or wallet address already exists
3. Hash password using bcrypt
4. Create user document in MongoDB
5. Generate JWT token with user data and roles
6. Return user data and token

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "walletAddress": "0x1234567890123456789012345678901234567890",
      "roles": ["user"],
      "primaryRole": "user",
      "isVerified": false,
      "kycStatus": "pending",
      "createdAt": "2025-12-11T10:00:00.000Z",
      "fullName": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "currentRole": "user",
    "availableRoles": ["user"],
    "dashboardRoute": "/marketplace"
  }
}
```

**Error Cases:**
- 400: Invalid input data (missing fields, invalid format)
- 409: Email or wallet address already exists
- 422: Password validation failed
- 500: Database error

---

### **2. POST `/auth/login`**

**Purpose:** Authenticate user with email/password or wallet address

**Authentication:** None (public endpoint)

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  // Option 1: Email + Password
  "email": "john@example.com",
  "password": "securePassword123",
  "preferredRole": "issuer" // Optional: If user has multiple roles

  // Option 2: Wallet Address (for wallet-only auth)
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Processing Steps:**
1. Find user by email or wallet address
2. Verify password (if email login)
3. Generate JWT token with user ID, roles, and current role
4. Update lastLogin timestamp
5. Return user data and token

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "walletAddress": "0x1234567890123456789012345678901234567890",
      "roles": ["user", "issuer"],
      "primaryRole": "issuer",
      "isVerified": true,
      "kycStatus": "approved",
      "lastLogin": "2025-12-11T10:30:00.000Z",
      "fullName": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "currentRole": "issuer",
    "availableRoles": ["user", "issuer"],
    "dashboardRoute": "/issuer",
    "hasMultipleRoles": true
  }
}
```

**Error Cases:**
- 400: Missing credentials
- 401: Invalid email or password
- 404: User not found
- 500: Server error

---

### **3. POST `/auth/verify-wallet`**

**Purpose:** Check if wallet address is registered and get available roles

**Authentication:** None (public endpoint)

**Request:**
```http
POST /auth/verify-wallet
Content-Type: application/json

{
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "walletExists": true,
    "availableRoles": ["user", "issuer"],
    "userInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
}
```

---

### **4. POST `/auth/switch-role`**

**Purpose:** Switch between available user roles (for users with multiple roles)

**Authentication:** Required (Bearer token)

**Request:**
```http
POST /auth/switch-role
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "newRole": "manager"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role switched successfully",
  "data": {
    "user": { /* updated user object */ },
    "token": "newJWTtoken...",
    "currentRole": "manager",
    "availableRoles": ["user", "issuer", "manager"],
    "dashboardRoute": "/manager"
  }
}
```

---

### **5. GET `/auth/profile`**

**Purpose:** Get current user profile information

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "walletAddress": "0x1234567890123456789012345678901234567890",
      "roles": ["user", "issuer"],
      "primaryRole": "issuer",
      "isVerified": true,
      "kycStatus": "approved",
      "fullName": "John Doe"
    }
  }
}
```

---

### **6. POST `/auth/logout`**

**Purpose:** Logout user and invalidate token

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## 🔐 AUTHENTICATION & SECURITY

### **JWT Token Structure**
```javascript
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "roles": ["user", "issuer"],
  "currentRole": "issuer",
  "primaryRole": "issuer",
  "iat": 1702300800, // Issued at
  "exp": 1702387200  // Expiration (24 hours)
}
```

### **Token Storage**
- **Frontend:** Stored in localStorage as `authToken`
- **Header Format:** `Authorization: Bearer <token>`
- **Expiration:** 24 hours (configurable)

### **Protected Routes**
All API endpoints except `/auth/register`, `/auth/login`, `/auth/verify-wallet`, and `/auth/health` require JWT authentication.

### **Role-Based Access Control (RBAC)**

| Role | Permissions |
|------|-------------|
| **admin** | Full system access, manage all users, approve/reject token requests, settlement oversight |
| **issuer** | Create token requests, deploy tokens, list on marketplace, view own assets |
| **manager** | Process settlements, manage token lifecycle, view all assets |
| **user** | Buy/sell tokens, view marketplace, manage portfolio |

### **Wallet Signature Verification** (Optional Enhancement)
```javascript
// For additional security, verify wallet ownership
function verifyWalletSignature(address, signature, message) {
  const recoveredAddress = ethers.utils.verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === address.toLowerCase();
}
```

---

## 🚀 FRONTEND AUTHENTICATION FLOW

### **1. User Registration Flow**
```
User fills registration form
  → Frontend validates input
  → POST /auth/register with user data + wallet address
  → Backend creates user + generates JWT
  → Frontend stores token in localStorage
  → Redirect to appropriate dashboard based on role
```

### **2. User Login Flow**
```
User enters email + password (or connects wallet)
  → Frontend validates input
  → POST /auth/login
  → Backend verifies credentials + generates JWT
  → Frontend stores token + user data in localStorage
  → Initialize WalletContext (connect MetaMask)
  → Initialize AuthContext (decode JWT)
  → Redirect to dashboard based on currentRole
```

### **3. Wallet Connection Flow**
```
User clicks "Connect Wallet"
  → WalletContext.connectWallet()
  → Request accounts from MetaMask via window.ethereum
  → ethers.js creates Web3Provider
  → Get signer and wallet address
  → Verify network (Flow Testnet - Chain ID: 747)
  → Switch network if needed
  → Store connection state in localStorage
  → Initialize contract instances with signer
```

### **4. Contract Authorization Flow**
```
User attempts action (e.g., create token request)
  → Frontend checks JWT role (AuthContext)
  → Frontend checks wallet connection (WalletContext)
  → Frontend calls robustAuthorizationService.isAuthorizedIssuer()
  → Service queries Admin contract: contract.isIssuer(address)
  → If authorized, proceed with action
  → If not authorized, show error
```

### **5. Buy/Sell Flow**
```
User clicks "Buy" on marketplace listing
  → BuyModal opens with listing details
  → User enters quantity
  → Frontend calculates total price
  → Check marketplace approval: token.isApprovedForAll()
  → If not approved, request approval: token.setApprovalForAll()
  → Execute buy: marketplace.buyToken(tokenId, amount, { value: price })
  → Wait for transaction confirmation
  → Update UI with new balances
  → Store transaction in backend
```

---

## ✅ IMPLEMENTATION SUMMARY

### **Current Authentication Stack**
✅ JWT-based authentication with bcrypt password hashing
✅ Multi-role system (admin, issuer, manager, user)
✅ Wallet address integration (MetaMask via ethers.js)
✅ Role switching for users with multiple roles
✅ On-chain authorization via Admin contract
✅ Network validation (Flow Testnet - Chain ID: 747)

### **Blockchain Integration**
✅ Flow EVM Testnet (Chain ID: 747)
✅ Smart contracts: Admin, TokenManagement, Marketplace, PaymentSplitter, ERC1155Core
✅ Direct marketplace listing service
✅ Token buy/sell functionality
✅ Invoice settlement with automatic token burning

### **Data Flow**
```
User Authentication → JWT Token → Role Verification → Wallet Connection →
Contract Authorization → Transaction Execution → Backend Logging
```

**End of Backend Specification. This document reflects the current implementation as of December 11, 2025.**
