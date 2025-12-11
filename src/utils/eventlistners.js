// Event Listeners for Invoice Financing Contracts
// Real-time event monitoring and handling

import { EVENTS, CONTRACT_ADDRESSES } from './contractConfig.js';
import { formatCurrency, formatTimestamp, formatAddress } from './contractUtils.js';

export class EventMonitor {
  constructor(invoiceService) {
    this.service = invoiceService;
    this.listeners = new Map();
    this.callbacks = new Map();
    this.isMonitoring = false;
  }

  // ============ START/STOP MONITORING ============

  /**
   * Start monitoring all events
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn('Event monitoring already started');
      return;
    }

    this.setupAllEventListeners();
    this.isMonitoring = true;
    console.log('✅ Event monitoring started');
  }

  /**
   * Stop monitoring all events
   */
  stopMonitoring() {
    this.removeAllListeners();
    this.isMonitoring = false;
    console.log('🛑 Event monitoring stopped');
  }

  /**
   * Setup all event listeners
   */
  setupAllEventListeners() {
    // Admin Contract Events
    this.setupAdminEvents();
    
    // Token Contract Events  
    this.setupTokenEvents();
    
    // TokenManagement Contract Events
    this.setupTokenManagementEvents();
    
    // Marketplace Contract Events
    this.setupMarketplaceEvents();
    
    // PaymentSplitter Contract Events
    this.setupPaymentSplitterEvents();
  }

  // ============ ADMIN CONTRACT EVENTS ============

  setupAdminEvents() {
    const contract = this.service.contracts.admin;

    // Issuer Added
    this.addListener('issuerAdded', contract, EVENTS.ISSUER_ADDED, (issuer, metadataURI) => {
      this.handleEvent('Issuer Added', {
        issuer: formatAddress(issuer),
        metadataURI: metadataURI,
        message: `New issuer ${formatAddress(issuer)} has been added`,
        type: 'success'
      });
    });

    // Manager Added
    this.addListener('managerAdded', contract, EVENTS.MANAGER_ADDED, (manager, metadataURI) => {
      this.handleEvent('Manager Added', {
        manager: formatAddress(manager),
        metadataURI: metadataURI,
        message: `New manager ${formatAddress(manager)} has been added`,
        type: 'success'
      });
    });

    // Marketplace Paused
    this.addListener('marketplacePaused', contract, EVENTS.MARKETPLACE_PAUSED, (paused) => {
      this.handleEvent('Marketplace Status Changed', {
        paused: paused,
        message: `Marketplace has been ${paused ? 'paused' : 'unpaused'}`,
        type: paused ? 'warning' : 'success'
      });
    });

    // Invoice Settled by Admin
    this.addListener('invoiceSettledByAdmin', contract, EVENTS.INVOICE_SETTLED_BY_ADMIN, (tokenId, amount, timestamp) => {
      this.handleEvent('Invoice Settled by Admin', {
        tokenId: tokenId.toString(),
        amount: formatCurrency(amount),
        timestamp: formatTimestamp(timestamp),
        message: `Invoice for token ${tokenId} manually settled by admin`,
        type: 'info'
      });
    });
  }

  // ============ TOKEN CONTRACT EVENTS ============

  setupTokenEvents() {
    const contract = this.service.contracts.tokenContract;

    // Token Minted
    this.addListener('tokenMinted', contract, EVENTS.TOKEN_MINTED, (issuer, tokenId, amount, price, metadataURI) => {
      this.handleEvent('Token Minted', {
        issuer: formatAddress(issuer),
        tokenId: tokenId.toString(),
        amount: amount.toString(),
        price: formatCurrency(price),
        metadataURI: metadataURI,
        message: `New token ${tokenId} minted by ${formatAddress(issuer)}`,
        type: 'success'
      });
    });

    // Invoice Settled
    this.addListener('invoiceSettled', contract, EVENTS.INVOICE_SETTLED, (tokenId, settlementAmount, timestamp) => {
      this.handleEvent('Invoice Settled', {
        tokenId: tokenId.toString(),
        settlementAmount: formatCurrency(settlementAmount),
        timestamp: formatTimestamp(timestamp),
        message: `Invoice for token ${tokenId} has been settled`,
        type: 'success'
      });
    });

    // Token Burned
    this.addListener('tokenBurned', contract, EVENTS.TOKEN_BURNED, (tokenId, timestamp) => {
      this.handleEvent('Tokens Burned', {
        tokenId: tokenId.toString(),
        timestamp: formatTimestamp(timestamp),
        message: `All tokens for token ID ${tokenId} have been burned`,
        type: 'info'
      });
    });

    // Lifecycle Changed
    this.addListener('lifecycleChanged', contract, EVENTS.LIFECYCLE_CHANGED, (tokenId, newStatus) => {
      const statusNames = ['Active', 'Settled', 'Burned'];
      this.handleEvent('Token Lifecycle Changed', {
        tokenId: tokenId.toString(),
        newStatus: statusNames[newStatus] || 'Unknown',
        statusCode: newStatus,
        message: `Token ${tokenId} status changed to ${statusNames[newStatus]}`,
        type: 'info'
      });
    });
  }

  // ============ TOKEN MANAGEMENT EVENTS ============

  setupTokenManagementEvents() {
    const contract = this.service.contracts.tokenManagement;

    // Token Request Submitted
    this.addListener('tokenRequestSubmitted', contract, EVENTS.TOKEN_REQUEST_SUBMITTED, (requestId, issuer, metadataURI, amount, price, timestamp) => {
      this.handleEvent('Token Request Submitted', {
        requestId: requestId,
        issuer: formatAddress(issuer),
        metadataURI: metadataURI,
        amount: amount.toString(),
        price: formatCurrency(price),
        timestamp: formatTimestamp(timestamp),
        message: `New token request submitted by ${formatAddress(issuer)}`,
        type: 'info'
      });
    });

    // Token Request Approved
    this.addListener('tokenRequestApproved', contract, EVENTS.TOKEN_REQUEST_APPROVED, (requestId, admin, timestamp) => {
      this.handleEvent('Token Request Approved', {
        requestId: requestId,
        admin: formatAddress(admin),
        timestamp: formatTimestamp(timestamp),
        message: `Token request approved by admin`,
        type: 'success'
      });
    });

    // Token Request Rejected
    this.addListener('tokenRequestRejected', contract, EVENTS.TOKEN_REQUEST_REJECTED, (requestId, admin, reason, timestamp) => {
      this.handleEvent('Token Request Rejected', {
        requestId: requestId,
        admin: formatAddress(admin),
        reason: reason,
        timestamp: formatTimestamp(timestamp),
        message: `Token request rejected: ${reason}`,
        type: 'error'
      });
    });

    // Token Deployed
    this.addListener('tokenDeployed', contract, EVENTS.TOKEN_DEPLOYED, (requestId, tokenId, issuer, amount, price, timestamp) => {
      this.handleEvent('Token Deployed', {
        requestId: requestId,
        tokenId: tokenId.toString(),
        issuer: formatAddress(issuer),
        amount: amount.toString(),
        price: formatCurrency(price),
        timestamp: formatTimestamp(timestamp),
        message: `Token ${tokenId} successfully deployed`,
        type: 'success'
      });
    });

    // Token Listed on Marketplace
    this.addListener('tokenListedOnMarketplace', contract, EVENTS.TOKEN_LISTED_ON_MARKETPLACE, (tokenId, issuer, amount, price, timestamp) => {
      this.handleEvent('Token Listed on Marketplace', {
        tokenId: tokenId.toString(),
        issuer: formatAddress(issuer),
        amount: amount.toString(),
        price: formatCurrency(price),
        timestamp: formatTimestamp(timestamp),
        message: `Token ${tokenId} listed on marketplace`,
        type: 'success'
      });
    });

    // Token Request Settled
    this.addListener('tokenRequestSettled', contract, EVENTS.TOKEN_REQUEST_SETTLED, (requestId, tokenId, settlementAmount, timestamp) => {
      this.handleEvent('Token Request Settled', {
        requestId: requestId,
        tokenId: tokenId.toString(),
        settlementAmount: formatCurrency(settlementAmount),
        timestamp: formatTimestamp(timestamp),
        message: `Token request completed with settlement`,
        type: 'success'
      });
    });
  }

  // ============ MARKETPLACE EVENTS ============

  setupMarketplaceEvents() {
    const contract = this.service.contracts.marketplace;

    // Asset Listed
    this.addListener('assetListed', contract, EVENTS.ASSET_LISTED, (tokenId, issuer, amount, price) => {
      this.handleEvent('Asset Listed', {
        tokenId: tokenId.toString(),
        issuer: formatAddress(issuer),
        amount: amount.toString(),
        price: formatCurrency(price),
        message: `${amount} tokens of ID ${tokenId} listed for ${formatCurrency(price)} each`,
        type: 'info'
      });
    });

    // Asset Bought
    this.addListener('assetBought', contract, EVENTS.ASSET_BOUGHT, (tokenId, buyer, amount, platformFee) => {
      this.handleEvent('Asset Bought', {
        tokenId: tokenId.toString(),
        buyer: formatAddress(buyer),
        amount: amount.toString(),
        platformFee: formatCurrency(platformFee),
        message: `${formatAddress(buyer)} bought ${amount} tokens of ID ${tokenId}`,
        type: 'success'
      });
    });

    // Asset Sold
    this.addListener('assetSold', contract, EVENTS.ASSET_SOLD, (tokenId, seller, amount, platformFee) => {
      this.handleEvent('Asset Sold', {
        tokenId: tokenId.toString(),
        seller: formatAddress(seller),
        amount: amount.toString(),
        platformFee: formatCurrency(platformFee),
        message: `${formatAddress(seller)} sold ${amount} tokens of ID ${tokenId}`,
        type: 'info'
      });
    });

    // Asset Withdrawn
    this.addListener('assetWithdrawn', contract, EVENTS.ASSET_WITHDRAWN, (tokenId, holder, amount) => {
      this.handleEvent('Asset Withdrawn', {
        tokenId: tokenId.toString(),
        holder: formatAddress(holder),
        amount: amount.toString(),
        message: `${formatAddress(holder)} withdrew ${amount} tokens of ID ${tokenId}`,
        type: 'info'
      });
    });

    // Earnings Withdrawn
    this.addListener('earningsWithdrawn', contract, EVENTS.EARNINGS_WITHDRAWN, (admin, amount) => {
      this.handleEvent('Platform Earnings Withdrawn', {
        admin: formatAddress(admin),
        amount: formatCurrency(amount),
        message: `Platform earnings ${formatCurrency(amount)} withdrawn`,
        type: 'info'
      });
    });

    // Listing Removed
    this.addListener('listingRemoved', contract, EVENTS.LISTING_REMOVED, (tokenId, issuer, amount) => {
      this.handleEvent('Listing Removed', {
        tokenId: tokenId.toString(),
        issuer: formatAddress(issuer),
        amount: amount.toString(),
        message: `Listing for token ${tokenId} removed by issuer`,
        type: 'warning'
      });
    });

    // Listing Updated
    this.addListener('listingUpdated', contract, EVENTS.LISTING_UPDATED, (tokenId, newMetadataURI) => {
      this.handleEvent('Listing Updated', {
        tokenId: tokenId.toString(),
        newMetadataURI: newMetadataURI,
        message: `Listing metadata updated for token ${tokenId}`,
        type: 'info'
      });
    });
  }

  // ============ PAYMENT SPLITTER EVENTS ============

  setupPaymentSplitterEvents() {
    const contract = this.service.contracts.paymentSplitter;

    // Rental Distributed
    this.addListener('rentalDistributed', contract, EVENTS.RENTAL_DISTRIBUTED, (tokenId, totalAmount, toHolders, toPlatform) => {
      this.handleEvent('Rental Payment Distributed', {
        tokenId: tokenId.toString(),
        totalAmount: formatCurrency(totalAmount),
        toHolders: formatCurrency(toHolders),
        toPlatform: formatCurrency(toPlatform),
        message: `Rental payment ${formatCurrency(totalAmount)} distributed for token ${tokenId}`,
        type: 'success'
      });
    });

    // Token Burn Initiated
    this.addListener('tokenBurnInitiated', contract, EVENTS.TOKEN_BURN_INITIATED, (tokenId, settlementAmount) => {
      this.handleEvent('Token Burn Initiated', {
        tokenId: tokenId.toString(),
        settlementAmount: formatCurrency(settlementAmount),
        message: `Token burning initiated for token ${tokenId} after settlement`,
        type: 'warning'
      });
    });
  }

  // ============ EVENT HANDLING UTILITIES ============

  /**
   * Add event listener with automatic cleanup
   */
  addListener(name, contract, eventName, handler) {
    try {
      contract.on(eventName, handler);
      this.listeners.set(name, { contract, eventName, handler });
      console.log(`📡 Listening to ${eventName} events`);
    } catch (error) {
      console.error(`❌ Failed to setup ${eventName} listener:`, error);
    }
  }

  /**
   * Remove specific listener
   */
  removeListener(name) {
    const listener = this.listeners.get(name);
    if (listener) {
      listener.contract.off(listener.eventName, listener.handler);
      this.listeners.delete(name);
      console.log(`🔌 Removed ${listener.eventName} listener`);
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    for (const [name, listener] of this.listeners) {
      listener.contract.off(listener.eventName, listener.handler);
    }
    this.listeners.clear();
    console.log('🔌 All event listeners removed');
  }

  /**
   * Handle event with standardized format
   */
  handleEvent(eventType, data) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data: data,
      source: 'InvoiceFinancingContract'
    };

    // Log event
    console.log(`📡 ${eventType}:`, data);

    // Emit custom event for UI components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('invoiceFinancingEvent', { detail: event }));
    }

    // Call registered callbacks
    this.notifyCallbacks(eventType, event);
  }

  // ============ CALLBACK MANAGEMENT ============

  /**
   * Register callback for specific event type
   */
  onEvent(eventType, callback) {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, []);
    }
    this.callbacks.get(eventType).push(callback);
  }

  /**
   * Remove callback for specific event type
   */
  offEvent(eventType, callback) {
    if (this.callbacks.has(eventType)) {
      const callbacks = this.callbacks.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify all registered callbacks
   */
  notifyCallbacks(eventType, event) {
    const callbacks = this.callbacks.get(eventType) || [];
    callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error in event callback for ${eventType}:`, error);
      }
    });

    // Also notify generic 'all' callbacks
    const allCallbacks = this.callbacks.get('all') || [];
    allCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in generic event callback:', error);
      }
    });
  }

  // ============ CONVENIENCE METHODS ============

  /**
   * Listen to all token-related events
   */
  onTokenEvents(callback) {
    this.onEvent('Token Minted', callback);
    this.onEvent('Token Deployed', callback);
    this.onEvent('Token Listed on Marketplace', callback);
    this.onEvent('Token Lifecycle Changed', callback);
  }

  /**
   * Listen to all settlement-related events
   */
  onSettlementEvents(callback) {
    this.onEvent('Invoice Settled', callback);
    this.onEvent('Invoice Settled by Admin', callback);
    this.onEvent('Tokens Burned', callback);
    this.onEvent('Token Burn Initiated', callback);
  }

  /**
   * Listen to all trading-related events
   */
  onTradingEvents(callback) {
    this.onEvent('Asset Listed', callback);
    this.onEvent('Asset Bought', callback);
    this.onEvent('Asset Sold', callback);
    this.onEvent('Asset Withdrawn', callback);
  }

  /**
   * Listen to all admin-related events
   */
  onAdminEvents(callback) {
    this.onEvent('Issuer Added', callback);
    this.onEvent('Manager Added', callback);
    this.onEvent('Token Request Approved', callback);
    this.onEvent('Token Request Rejected', callback);
    this.onEvent('Marketplace Status Changed', callback);
  }

  /**
   * Listen to all events
   */
  onAllEvents(callback) {
    this.onEvent('all', callback);
  }

  // ============ HISTORICAL EVENTS ============

  /**
   * Get historical events for a specific contract
   */
  async getHistoricalEvents(contractName, eventName, fromBlock = 0, toBlock = 'latest') {
    try {
      const contract = this.service.contracts[contractName];
      if (!contract) {
        throw new Error(`Contract ${contractName} not found`);
      }

      const filter = contract.filters[eventName]();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);
      
      return events.map(event => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        event: eventName,
        args: event.args,
        timestamp: null // Would need to fetch block to get timestamp
      }));
    } catch (error) {
      console.error(`Error fetching historical events:`, error);
      return [];
    }
  }

  /**
   * Get all historical events for a token
   */
  async getTokenHistory(tokenId, fromBlock = 0) {
    const events = [];
    
    try {
      // Get token lifecycle events
      const lifecycleEvents = await this.getHistoricalEvents('tokenContract', 'LifecycleChanged', fromBlock);
      const tokenEvents = lifecycleEvents.filter(event => event.args.tokenId.toString() === tokenId.toString());
      
      // Get marketplace events
      const tradingEvents = await this.getHistoricalEvents('marketplace', 'AssetBought', fromBlock);
      const tokenTradingEvents = tradingEvents.filter(event => event.args.tokenId.toString() === tokenId.toString());
      
      events.push(...tokenEvents, ...tokenTradingEvents);
      
      // Sort by block number
      events.sort((a, b) => a.blockNumber - b.blockNumber);
      
      return events;
    } catch (error) {
      console.error(`Error fetching token history:`, error);
      return [];
    }
  }
}

// Export convenience function to create event monitor
export function createEventMonitor(invoiceService) {
  return new EventMonitor(invoiceService);
}

export default EventMonitor;