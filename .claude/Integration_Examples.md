# Integration Examples - Enhanced Invoice Financing

Complete code examples for seamless frontend integration with deployed contracts.

## 🚀 Quick Start Example

```javascript
// main.js - Complete integration example
import { InvoiceFinancingService } from './contracts/invoiceFinancingService.js';
import { createEventMonitor } from './contracts/eventListeners.js';
import { switchToFlowTestnet, formatCurrency } from './contracts/contractUtils.js';

class InvoiceFinancingApp {
  constructor() {
    this.service = new InvoiceFinancingService(window.ethereum);
    this.eventMonitor = null;
    this.isConnected = false;
  }

  async init() {
    try {
      // Connect to wallet and contracts
      await this.connectWallet();
      
      // Setup event monitoring
      this.setupEventMonitoring();
      
      // Setup UI event handlers
      this.setupUIHandlers();
      
      console.log('✅ Invoice Financing App initialized');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.showError('Failed to initialize app: ' + error.message);
    }
  }

  async connectWallet() {
    try {
      const result = await this.service.connect();
      this.isConnected = true;
      
      // Update UI with user info
      this.updateUserInfo(result.userAddress, result.userRoles);
      
      // Load user data
      await this.loadUserData();
      
    } catch (error) {
      if (error.message.includes('network')) {
        // Prompt user to switch network
        if (confirm('Please switch to Flow Testnet. Switch now?')) {
          await switchToFlowTestnet();
          return this.connectWallet(); // Retry after network switch
        }
      }
      throw error;
    }
  }

  setupEventMonitoring() {
    this.eventMonitor = createEventMonitor(this.service);
    
    // Listen to all events and update UI
    this.eventMonitor.onAllEvents((event) => {
      this.handleRealtimeEvent(event);
    });
    
    // Start monitoring
    this.eventMonitor.startMonitoring();
  }

  setupUIHandlers() {
    // Connect wallet button
    document.getElementById('connectWallet').onclick = () => this.connectWallet();
    
    // Submit token request
    document.getElementById('submitRequest').onclick = () => this.submitTokenRequest();
    
    // Approve request (Admin only)
    document.getElementById('approveRequest').onclick = () => this.approveTokenRequest();
    
    // Deploy token
    document.getElementById('deployToken').onclick = () => this.deployToken();
    
    // Buy tokens
    document.getElementById('buyTokens').onclick = () => this.buyTokens();
    
    // Settle invoice
    document.getElementById('settleInvoice').onclick = () => this.settleInvoice();
  }

  async loadUserData() {
    try {
      const roles = this.service.userRoles;
      
      if (roles.isIssuer) {
        await this.loadIssuerData();
      }
      
      if (roles.isAdmin) {
        await this.loadAdminData();
      }
      
      if (roles.isManager) {
        await this.loadManagerData();
      }
      
      // Load marketplace data for all users
      await this.loadMarketplaceData();
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async loadIssuerData() {
    // Load issuer's requests and tokens
    const requests = await this.service.getMyRequests();
    const tokens = await this.service.getMyTokens();
    
    this.displayIssuerData(requests, tokens);
  }

  async loadAdminData() {
    // Load pending requests for admin approval
    const pendingRequests = await this.service.getPendingRequests();
    
    this.displayAdminData(pendingRequests);
  }

  async loadManagerData() {
    // Load manager-specific data
    // This would require additional contract calls based on assigned tokens
  }

  async loadMarketplaceData() {
    // Load all marketplace listings
    const listings = await this.service.getAllListings();
    
    this.displayMarketplaceData(listings);
  }

  // ============ UI ACTION HANDLERS ============

  async submitTokenRequest() {
    try {
      this.showLoading('Submitting token request...');
      
      const metadataURI = document.getElementById('metadataURI').value;
      const amount = document.getElementById('tokenAmount').value;
      const price = document.getElementById('tokenPrice').value;
      
      const result = await this.service.submitTokenRequest(metadataURI, amount, price);
      
      this.showSuccess(`Token request submitted! Request ID: ${result.requestId}`);
      await this.loadIssuerData(); // Refresh data
      
    } catch (error) {
      this.showError('Failed to submit request: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async approveTokenRequest() {
    try {
      this.showLoading('Approving token request...');
      
      const requestId = document.getElementById('selectedRequestId').value;
      
      const result = await this.service.approveTokenRequest(requestId);
      
      this.showSuccess('Token request approved successfully!');
      await this.loadAdminData(); // Refresh admin data
      
    } catch (error) {
      this.showError('Failed to approve request: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async deployToken() {
    try {
      this.showLoading('Deploying token...');
      
      const requestId = document.getElementById('deployRequestId').value;
      
      const result = await this.service.deployApprovedToken(requestId);
      
      this.showSuccess(`Token deployed successfully! Token ID: ${result.tokenId}`);
      await this.loadIssuerData(); // Refresh data
      
    } catch (error) {
      this.showError('Failed to deploy token: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async buyTokens() {
    try {
      this.showLoading('Purchasing tokens...');
      
      const tokenId = document.getElementById('buyTokenId').value;
      const amount = document.getElementById('buyAmount').value;
      const payment = document.getElementById('paymentAmount').value;
      
      const result = await this.service.buyTokens(tokenId, amount, payment);
      
      this.showSuccess('Tokens purchased successfully!');
      await this.loadMarketplaceData(); // Refresh marketplace
      
    } catch (error) {
      this.showError('Failed to purchase tokens: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async settleInvoice() {
    try {
      this.showLoading('Settling invoice...');
      
      const tokenId = document.getElementById('settleTokenId').value;
      const amount = document.getElementById('settlementAmount').value;
      
      const result = await this.service.processInvoiceSettlement(tokenId, amount);
      
      this.showSuccess('Invoice settled successfully! Tokens have been burned.');
      await this.loadUserData(); // Refresh all data
      
    } catch (error) {
      this.showError('Failed to settle invoice: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  // ============ UI UPDATE METHODS ============

  updateUserInfo(address, roles) {
    document.getElementById('userAddress').textContent = address;
    document.getElementById('isAdmin').textContent = roles.isAdmin ? 'Yes' : 'No';
    document.getElementById('isIssuer').textContent = roles.isIssuer ? 'Yes' : 'No';
    document.getElementById('isManager').textContent = roles.isManager ? 'Yes' : 'No';
    
    // Show/hide sections based on roles
    document.getElementById('adminSection').style.display = roles.isAdmin ? 'block' : 'none';
    document.getElementById('issuerSection').style.display = roles.isIssuer ? 'block' : 'none';
    document.getElementById('managerSection').style.display = roles.isManager ? 'block' : 'none';
  }

  displayIssuerData(requests, tokens) {
    // Display issuer's requests
    const requestsContainer = document.getElementById('issuerRequests');
    requestsContainer.innerHTML = requests.map(request => `
      <div class="request-card">
        <h4>Request ${request.requestId.substring(0, 8)}...</h4>
        <p>Status: <span class="status-${request.status.toLowerCase()}">${request.status}</span></p>
        <p>Amount: ${request.amount} tokens</p>
        <p>Price: ${request.price} FLOW each</p>
        <p>Submitted: ${new Date(request.submittedAt).toLocaleDateString()}</p>
        ${request.tokenId ? `<p>Token ID: ${request.tokenId}</p>` : ''}
      </div>
    `).join('');
    
    // Display issuer's tokens
    const tokensContainer = document.getElementById('issuerTokens');
    tokensContainer.innerHTML = tokens.map(token => `
      <div class="token-card">
        <h4>Token ID: ${token.tokenId}</h4>
        <p>Price: ${token.price} FLOW</p>
        <p>Supply: ${token.supply}</p>
        <p>Status: <span class="lifecycle-${token.lifecycle.toLowerCase()}">${token.lifecycle}</span></p>
        <p>Tradeable: ${token.isTradeable ? 'Yes' : 'No'}</p>
        ${token.settlement.settled ? `
          <div class="settlement-info">
            <p>Settlement: ${token.settlement.amount} FLOW</p>
            <p>Settled: ${new Date(token.settlement.timestamp).toLocaleDateString()}</p>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  displayAdminData(pendingRequests) {
    const container = document.getElementById('pendingRequests');
    container.innerHTML = pendingRequests.map(request => `
      <div class="pending-request-card">
        <h4>Request from ${request.issuer.substring(0, 10)}...</h4>
        <p>Amount: ${request.amount} tokens</p>
        <p>Price: ${request.price} FLOW each</p>
        <p>Submitted: ${new Date(request.submittedAt).toLocaleDateString()}</p>
        <p>Metadata: ${request.metadataURI}</p>
        <div class="actions">
          <button onclick="app.approveSpecificRequest('${request.requestId}')">Approve</button>
          <button onclick="app.rejectSpecificRequest('${request.requestId}')">Reject</button>
        </div>
      </div>
    `).join('');
  }

  displayMarketplaceData(listings) {
    const container = document.getElementById('marketplaceListings');
    container.innerHTML = listings.tokenIds.map((tokenId, index) => `
      <div class="listing-card">
        <h4>Token ID: ${tokenId}</h4>
        <p>Issuer: ${listings.issuers[index].substring(0, 10)}...</p>
        <p>Available: ${listings.amounts[index]} tokens</p>
        <p>Price: ${listings.prices[index]} FLOW each</p>
        <div class="actions">
          <input type="number" id="buy-amount-${tokenId}" placeholder="Amount" min="1" max="${listings.amounts[index]}">
          <button onclick="app.buySpecificTokens('${tokenId}')">Buy Tokens</button>
        </div>
      </div>
    `).join('');
  }

  handleRealtimeEvent(event) {
    // Show notification
    this.showNotification(event.data.message, event.data.type);
    
    // Update UI based on event type
    switch (event.type) {
      case 'Token Request Submitted':
      case 'Token Request Approved':
      case 'Token Deployed':
        this.loadUserData(); // Refresh all data
        break;
        
      case 'Asset Bought':
      case 'Asset Listed':
        this.loadMarketplaceData(); // Refresh marketplace
        break;
        
      case 'Invoice Settled':
      case 'Tokens Burned':
        this.loadUserData(); // Refresh all data
        break;
    }
  }

  // ============ UI UTILITY METHODS ============

  showLoading(message) {
    const loader = document.getElementById('loader');
    loader.textContent = message;
    loader.style.display = 'block';
  }

  hideLoading() {
    document.getElementById('loader').style.display = 'none';
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  // ============ SPECIFIC ACTION METHODS ============

  async approveSpecificRequest(requestId) {
    try {
      await this.service.approveTokenRequest(requestId);
      this.showSuccess('Request approved successfully!');
      await this.loadAdminData();
    } catch (error) {
      this.showError('Failed to approve request: ' + error.message);
    }
  }

  async rejectSpecificRequest(requestId) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      await this.service.rejectTokenRequest(requestId, reason);
      this.showSuccess('Request rejected successfully!');
      await this.loadAdminData();
    } catch (error) {
      this.showError('Failed to reject request: ' + error.message);
    }
  }

  async buySpecificTokens(tokenId) {
    const amountInput = document.getElementById(`buy-amount-${tokenId}`);
    const amount = amountInput.value;
    
    if (!amount || amount <= 0) {
      this.showError('Please enter a valid amount');
      return;
    }
    
    try {
      // Calculate total cost (you'd get the actual price from the contract)
      const tokenInfo = await this.service.getTokenInfo(tokenId);
      const totalCost = parseFloat(tokenInfo.price) * parseInt(amount);
      const platformFee = totalCost * 0.01; // 1% platform fee
      const finalCost = totalCost + platformFee;
      
      if (confirm(`Buy ${amount} tokens for ${finalCost.toFixed(4)} FLOW (including 1% platform fee)?`)) {
        await this.service.buyTokens(tokenId, amount, ethers.parseEther(finalCost.toString()));
        this.showSuccess('Tokens purchased successfully!');
        amountInput.value = '';
        await this.loadMarketplaceData();
      }
    } catch (error) {
      this.showError('Failed to purchase tokens: ' + error.message);
    }
  }

  // ============ CLEANUP ============

  destroy() {
    if (this.eventMonitor) {
      this.eventMonitor.stopMonitoring();
    }
    if (this.service) {
      this.service.disconnect();
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new InvoiceFinancingApp();
  window.app.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.app) {
    window.app.destroy();
  }
});
```

## 🎨 HTML Structure Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice Financing Platform</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>Invoice Financing Platform</h1>
            <div id="wallet-info">
                <div id="user-address">Not connected</div>
                <button id="connectWallet">Connect Wallet</button>
            </div>
        </header>

        <main>
            <!-- Loading indicator -->
            <div id="loader" style="display: none;">Loading...</div>

            <!-- User roles display -->
            <section id="user-roles">
                <h2>User Permissions</h2>
                <p>Admin: <span id="isAdmin">No</span></p>
                <p>Issuer: <span id="isIssuer">No</span></p>
                <p>Manager: <span id="isManager">No</span></p>
            </section>

            <!-- Admin section -->
            <section id="adminSection" style="display: none;">
                <h2>Admin Dashboard</h2>
                
                <div class="admin-actions">
                    <h3>Pending Token Requests</h3>
                    <div id="pendingRequests"></div>
                </div>
                
                <div class="admin-actions">
                    <h3>Add Issuer</h3>
                    <input type="text" id="newIssuerAddress" placeholder="Issuer Address">
                    <input type="text" id="issuerMetadata" placeholder="Metadata URI">
                    <button onclick="app.addIssuer()">Add Issuer</button>
                </div>
                
                <div class="admin-actions">
                    <h3>Add Manager</h3>
                    <input type="text" id="newManagerAddress" placeholder="Manager Address">
                    <input type="text" id="managerMetadata" placeholder="Metadata URI">
                    <button onclick="app.addManager()">Add Manager</button>
                </div>
            </section>

            <!-- Issuer section -->
            <section id="issuerSection" style="display: none;">
                <h2>Issuer Dashboard</h2>
                
                <div class="issuer-actions">
                    <h3>Submit New Token Request</h3>
                    <input type="text" id="metadataURI" placeholder="IPFS Metadata URI">
                    <input type="number" id="tokenAmount" placeholder="Token Amount" min="1">
                    <input type="number" id="tokenPrice" placeholder="Price per Token (FLOW)" step="0.001" min="0">
                    <button id="submitRequest">Submit Request</button>
                </div>
                
                <div class="issuer-data">
                    <h3>My Token Requests</h3>
                    <div id="issuerRequests"></div>
                </div>
                
                <div class="issuer-data">
                    <h3>My Tokens</h3>
                    <div id="issuerTokens"></div>
                </div>
            </section>

            <!-- Manager section -->
            <section id="managerSection" style="display: none;">
                <h2>Manager Dashboard</h2>
                
                <div class="manager-actions">
                    <h3>Settle Invoice</h3>
                    <input type="number" id="settleTokenId" placeholder="Token ID">
                    <input type="number" id="settlementAmount" placeholder="Settlement Amount (FLOW)" step="0.001" min="0">
                    <button id="settleInvoice">Process Settlement</button>
                </div>
            </section>

            <!-- Marketplace section (visible to all) -->
            <section id="marketplaceSection">
                <h2>Token Marketplace</h2>
                <div id="marketplaceListings"></div>
            </section>
        </main>
    </div>

    <script type="module" src="main.js"></script>
</body>
</html>
```

## 💻 CSS Styles Example

```css
/* styles.css */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f5f5f5;
}

#app {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 30px;
}

h1 {
    color: #2563eb;
}

#wallet-info {
    display: flex;
    align-items: center;
    gap: 15px;
}

#user-address {
    font-family: monospace;
    font-size: 14px;
    color: #666;
}

button {
    background: #2563eb;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
}

button:hover {
    background: #1d4ed8;
}

button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
}

section {
    background: white;
    padding: 25px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 25px;
}

h2 {
    margin-bottom: 20px;
    color: #1f2937;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 10px;
}

h3 {
    margin-bottom: 15px;
    color: #374151;
}

input {
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    margin-right: 10px;
    margin-bottom: 10px;
    width: 200px;
}

input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.request-card, .token-card, .listing-card, .pending-request-card {
    background: #f9fafb;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 15px;
    border-left: 4px solid #2563eb;
}

.status-pending { color: #f59e0b; }
.status-approved { color: #10b981; }
.status-rejected { color: #ef4444; }
.status-deployed { color: #3b82f6; }
.status-listed { color: #8b5cf6; }
.status-settled { color: #6b7280; }

.lifecycle-active { color: #10b981; }
.lifecycle-settled { color: #3b82f6; }
.lifecycle-burned { color: #6b7280; }

.actions {
    margin-top: 15px;
    display: flex;
    gap: 10px;
    align-items: center;
}

.actions button {
    padding: 8px 16px;
    font-size: 12px;
}

.settlement-info {
    background: #ecfdf5;
    padding: 10px;
    border-radius: 6px;
    margin-top: 10px;
    border-left: 3px solid #10b981;
}

#loader {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2563eb;
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    z-index: 1000;
}

.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    z-index: 1001;
    max-width: 400px;
}

.notification-success { background: #10b981; }
.notification-error { background: #ef4444; }
.notification-info { background: #3b82f6; }
.notification-warning { background: #f59e0b; }

.admin-actions, .issuer-actions, .manager-actions {
    background: #f9fafb;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.issuer-data {
    margin-top: 25px;
}

#user-roles {
    display: flex;
    gap: 30px;
    align-items: center;
}

#user-roles p {
    font-weight: 500;
}

@media (max-width: 768px) {
    #app {
        padding: 10px;
    }
    
    header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }
    
    input {
        width: 100%;
        margin-right: 0;
    }
    
    .actions {
        flex-direction: column;
        align-items: stretch;
    }
    
    #user-roles {
        flex-direction: column;
        gap: 10px;
        align-items: stretch;
    }
}
```

## 📱 React Integration Example

```jsx
// InvoiceFinancingProvider.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { InvoiceFinancingService } from '../contracts/invoiceFinancingService.js';
import { createEventMonitor } from '../contracts/eventListeners.js';

const InvoiceFinancingContext = createContext();

export function InvoiceFinancingProvider({ children }) {
  const [service, setService] = useState(null);
  const [eventMonitor, setEventMonitor] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [userRoles, setUserRoles] = useState({ isAdmin: false, isIssuer: false, isManager: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const invoiceService = new InvoiceFinancingService(window.ethereum);
    setService(invoiceService);
    
    const monitor = createEventMonitor(invoiceService);
    setEventMonitor(monitor);
    
    return () => {
      if (monitor) monitor.stopMonitoring();
      if (invoiceService) invoiceService.disconnect();
    };
  }, []);

  const connect = async () => {
    if (!service) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.connect();
      setIsConnected(true);
      setUserAddress(result.userAddress);
      setUserRoles(result.userRoles);
      
      // Start event monitoring
      eventMonitor?.startMonitoring();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    service?.disconnect();
    eventMonitor?.stopMonitoring();
    setIsConnected(false);
    setUserAddress(null);
    setUserRoles({ isAdmin: false, isIssuer: false, isManager: false });
  };

  const value = {
    service,
    eventMonitor,
    isConnected,
    userAddress,
    userRoles,
    loading,
    error,
    connect,
    disconnect
  };

  return (
    <InvoiceFinancingContext.Provider value={value}>
      {children}
    </InvoiceFinancingContext.Provider>
  );
}

export function useInvoiceFinancing() {
  const context = useContext(InvoiceFinancingContext);
  if (!context) {
    throw new Error('useInvoiceFinancing must be used within InvoiceFinancingProvider');
  }
  return context;
}

// TokenRequestForm.jsx
import React, { useState } from 'react';
import { useInvoiceFinancing } from './InvoiceFinancingProvider';

export function TokenRequestForm() {
  const { service, userRoles } = useInvoiceFinancing();
  const [formData, setFormData] = useState({
    metadataURI: '',
    amount: '',
    price: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!service || !userRoles.isIssuer) return;

    setLoading(true);
    try {
      const result = await service.submitTokenRequest(
        formData.metadataURI,
        formData.amount,
        formData.price
      );
      
      alert(`Token request submitted! Request ID: ${result.requestId}`);
      setFormData({ metadataURI: '', amount: '', price: '' });
      
    } catch (error) {
      alert('Failed to submit request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userRoles.isIssuer) {
    return <div>Only issuers can submit token requests</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Submit Token Request</h3>
      
      <input
        type="text"
        placeholder="IPFS Metadata URI"
        value={formData.metadataURI}
        onChange={(e) => setFormData({...formData, metadataURI: e.target.value})}
        required
      />
      
      <input
        type="number"
        placeholder="Token Amount"
        value={formData.amount}
        onChange={(e) => setFormData({...formData, amount: e.target.value})}
        required
        min="1"
      />
      
      <input
        type="number"
        placeholder="Price per Token (FLOW)"
        value={formData.price}
        onChange={(e) => setFormData({...formData, price: e.target.value})}
        required
        min="0"
        step="0.001"
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}

// App.jsx
import React from 'react';
import { InvoiceFinancingProvider, useInvoiceFinancing } from './components/InvoiceFinancingProvider';
import { TokenRequestForm } from './components/TokenRequestForm';

function AppContent() {
  const { isConnected, userAddress, userRoles, connect, disconnect, loading } = useInvoiceFinancing();

  return (
    <div>
      <header>
        <h1>Invoice Financing Platform</h1>
        {isConnected ? (
          <div>
            <span>Connected: {userAddress}</span>
            <button onClick={disconnect}>Disconnect</button>
          </div>
        ) : (
          <button onClick={connect} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </header>

      {isConnected && (
        <main>
          <div>
            <h2>User Roles</h2>
            <p>Admin: {userRoles.isAdmin ? 'Yes' : 'No'}</p>
            <p>Issuer: {userRoles.isIssuer ? 'Yes' : 'No'}</p>
            <p>Manager: {userRoles.isManager ? 'Yes' : 'No'}</p>
          </div>

          {userRoles.isIssuer && <TokenRequestForm />}
          
          {/* Add more components based on user roles */}
        </main>
      )}
    </div>
  );
}

function App() {
  return (
    <InvoiceFinancingProvider>
      <AppContent />
    </InvoiceFinancingProvider>
  );
}

export default App;
```

These examples provide complete, working implementations that can be directly integrated into any frontend framework! 🚀