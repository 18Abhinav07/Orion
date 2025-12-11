# Frontend Integration Guide - Enhanced Invoice Financing Contracts

## 🎯 Complete Integration Package

This guide provides everything needed for seamless frontend integration with the deployed enhanced invoice financing contracts on Flow Testnet.

## 📋 Contract Information

### **Network**: Flow Testnet
- **Chain ID**: 747
- **RPC URL**: `https://mainnet.evm.nodes.onflow.org`
- **Explorer**: `https://www.flowscan.io/`

### **Deployed Contract Addresses**

```javascript
export const CONTRACT_ADDRESSES = {
  ADMIN: "0xFC53E7A6b94173D82d07a127A38d9D852bf478d4",
  TOKEN_CONTRACT: "0x24eb8429Dc1e5f217866D0c74Db245Fa3aAFA31A",
  MARKETPLACE: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF",
  PAYMENT_SPLITTER: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91",
  TOKEN_MANAGEMENT: "0xA632A492cCd898De4a4B17DC786B381d099F5815"
};

export const NETWORK_CONFIG = {
  chainId: 747,
  name: "Flow Testnet",
  rpcUrl: "https://mainnet.evm.nodes.onflow.org",
  blockExplorer: "https://www.flowscan.io/",
  nativeCurrency: {
    name: "Flow",
    symbol: "FLOW",
    decimals: 18
  }
};
```

## 📦 Required Files for Integration

1. **`contractConfig.js`** - Contract addresses and network configuration
2. **`contractABIs.js`** - All contract ABIs
3. **`invoiceFinancingService.js`** - Service layer for contract interactions
4. **`contractUtils.js`** - Utility functions and helpers
5. **`eventListeners.js`** - Event monitoring setup

## 🔧 Quick Setup Instructions

### 1. Install Dependencies
```bash
npm install ethers @ethersproject/providers @ethersproject/contracts
```

### 2. Add Contract Files to Your Project
Copy these files to your project's contract integration folder:
- `contractConfig.js`
- `contractABIs.js` 
- `invoiceFinancingService.js`
- `contractUtils.js`
- `eventListeners.js`

### 3. Initialize in Your App
```javascript
import { InvoiceFinancingService } from './contracts/invoiceFinancingService.js';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from './contracts/contractConfig.js';

// Initialize the service
const invoiceService = new InvoiceFinancingService(window.ethereum);

// Connect wallet and setup contracts
await invoiceService.connect();
```

## 🎯 Core Integration Features

### **1. Token Lifecycle Management**
- Create and track invoice tokens from Active → Settled → Burned
- Real-time status monitoring
- Lifecycle event notifications

### **2. Invoice Settlement System**
- Process invoice settlements with automatic token burning
- Proportional payment distribution to token holders
- Settlement history tracking

### **3. Admin Dashboard Integration**
- User role management (Issuers, Managers, Admins)
- Token request approval workflow
- Settlement oversight and manual processing

### **4. Marketplace Integration**
- Token listing and trading
- Automatic trading restrictions for settled tokens
- Real-time balance updates

## 📊 Key Functions Available

### **Admin Operations**
```javascript
// Add issuer
await invoiceService.addIssuer(address, metadataURI);

// Add manager  
await invoiceService.addManager(address, metadataURI);

// Approve token request
await invoiceService.approveTokenRequest(requestId);

// Settle invoice manually
await invoiceService.settleInvoice(tokenId, amount);
```

### **Issuer Operations**
```javascript
// Submit token request
const requestId = await invoiceService.submitTokenRequest(metadataURI, amount, price);

// Deploy approved token
const tokenId = await invoiceService.deployApprovedToken(requestId);

// List token on marketplace
await invoiceService.listTokenOnMarketplace(requestId, amount);
```

### **Trading Operations**
```javascript
// Buy tokens
await invoiceService.buyTokens(tokenId, amount, paymentAmount);

// Sell tokens back
await invoiceService.sellTokens(tokenId, amount, platformFee);

// Check if token is tradeable
const tradeable = await invoiceService.isTokenTradeable(tokenId);
```

### **Settlement Operations**
```javascript
// Process invoice settlement (Manager only)
await invoiceService.processInvoiceSettlement(tokenId, settlementAmount);

// Check settlement status
const settlementInfo = await invoiceService.getSettlementInfo(tokenId);

// Get token lifecycle status
const lifecycle = await invoiceService.getTokenLifecycle(tokenId);
```

## 📡 Event Monitoring

The system emits comprehensive events for real-time updates:

```javascript
// Listen to all invoice financing events
invoiceService.onTokenRequestSubmitted((event) => {
  console.log('New token request:', event);
});

invoiceService.onTokenDeployed((event) => {
  console.log('Token deployed:', event);
});

invoiceService.onInvoiceSettled((event) => {
  console.log('Invoice settled:', event);
});

invoiceService.onTokenBurned((event) => {
  console.log('Tokens burned:', event);
});
```

## 🔐 Security Features

- **Role-based access control** - Automatic permission checking
- **Settlement validation** - Prevents double settlements
- **Trading restrictions** - Automatic enforcement for settled tokens
- **Burn authorization** - Only authorized contracts can burn tokens

## 🎨 UI Integration Examples

### Token Status Component
```javascript
const TokenStatus = ({ tokenId }) => {
  const [lifecycle, setLifecycle] = useState('Loading...');
  
  useEffect(() => {
    const fetchStatus = async () => {
      const status = await invoiceService.getTokenLifecycle(tokenId);
      setLifecycle(status); // Returns: 'Active', 'Settled', or 'Burned'
    };
    fetchStatus();
  }, [tokenId]);
  
  return (
    <div className={`status-${lifecycle.toLowerCase()}`}>
      Status: {lifecycle}
    </div>
  );
};
```

### Settlement Dashboard
```javascript
const SettlementDashboard = () => {
  const [settlements, setSettlements] = useState([]);
  
  useEffect(() => {
    const loadSettlements = async () => {
      const settledTokens = await invoiceService.getSettledTokens();
      setSettlements(settledTokens);
    };
    loadSettlements();
  }, []);
  
  return (
    <div>
      {settlements.map(settlement => (
        <SettlementCard key={settlement.tokenId} settlement={settlement} />
      ))}
    </div>
  );
};
```

## 🚀 Production Deployment

When moving to production:

1. Update `NETWORK_CONFIG` to Flow Mainnet:
   ```javascript
   export const NETWORK_CONFIG = {
     chainId: 747,
     name: "Flow Mainnet", 
     rpcUrl: "https://mainnet.evm.nodes.onflow.org",
     blockExplorer: "https://evm.flowscan.io/"
   };
   ```

2. Deploy contracts to mainnet and update `CONTRACT_ADDRESSES`

3. Test all functionality thoroughly on mainnet

## 📞 Support

For integration support or questions:
- Review the detailed service documentation in `invoiceFinancingService.js`
- Check utility functions in `contractUtils.js`
- Examine event handling in `eventListeners.js`

## ✅ Integration Checklist

- [ ] Add contract files to project
- [ ] Install required dependencies
- [ ] Configure wallet connection
- [ ] Test basic contract interactions
- [ ] Implement event listeners
- [ ] Add error handling
- [ ] Test with real transactions
- [ ] Implement UI components
- [ ] Add loading states
- [ ] Test settlement workflow
- [ ] Verify security permissions

**The enhanced invoice financing system is ready for immediate frontend integration!** 🎉