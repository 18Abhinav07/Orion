import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { OrderBookEscrowService, EscrowOrder, OrderBookData } from '../utils/orderBookEscrowService';
import { ORDER_BOOK_ESCROW_CONTRACT, TOKEN_CONTRACT } from '../lib/contractAddress';
import { useWallet } from '../context/WalletContext';

export interface UseOrderBookReturn {
  orderBookData: OrderBookData | null;
  loading: boolean;
  error: string | null;
  refreshOrderBook: () => Promise<void>;
  isApproved: boolean;
  approveContract: () => Promise<void>;
  createSellOrder: (tokenId: string, amount: number, pricePerTokenU2U: string) => Promise<void>;
  createBuyOrder: (tokenId: string, amount: number, pricePerTokenU2U: string) => Promise<void>;
  fillOrder: (orderId: string, amountToFill: number, orderData: EscrowOrder) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  userOrders: EscrowOrder[];
}

export const useOrderBook = (tokenId: string): UseOrderBookReturn => {
  const { provider, signer, address } = useWallet();
  const [orderBookService, setOrderBookService] = useState<OrderBookEscrowService | null>(null);
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
  const [userOrders, setUserOrders] = useState<EscrowOrder[]>([]);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize service
  useEffect(() => {
    if (provider && ORDER_BOOK_ESCROW_CONTRACT) {
      const service = new OrderBookEscrowService(provider, ORDER_BOOK_ESCROW_CONTRACT, signer);
      setOrderBookService(service);
    }
  }, [provider, signer]);

  // Load order book data
  const refreshOrderBook = useCallback(async () => {
    if (!orderBookService || !tokenId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await orderBookService.getOrderBook(tokenId);
      setOrderBookData(data);
      
      // Filter user orders if address is available
      if (address) {
        const allOrders = [...data.sellOrders, ...data.buyOrders];
        const userOrdersFiltered = allOrders.filter(order => 
          order.maker.toLowerCase() === address.toLowerCase()
        );
        setUserOrders(userOrdersFiltered);
      }
    } catch (err) {
      console.error('Error loading order book:', err);
      setError('Failed to load order book data');
    } finally {
      setLoading(false);
    }
  }, [orderBookService, tokenId, address]);

  // Check approval status
  const checkApproval = useCallback(async () => {
    if (!orderBookService || !address) return;
    
    try {
      const approved = await orderBookService.checkApproval(address, TOKEN_CONTRACT);
      setIsApproved(approved);
    } catch (err) {
      console.error('Error checking approval:', err);
    }
  }, [orderBookService, address]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (orderBookService && tokenId) {
      refreshOrderBook();
      checkApproval();
      
      const interval = setInterval(() => {
        refreshOrderBook();
      }, 10000); // Refresh every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [orderBookService, tokenId, refreshOrderBook, checkApproval]);

  // Approve contract
  const approveContract = useCallback(async () => {
    if (!orderBookService) throw new Error('Service not initialized');
    
    setLoading(true);
    try {
      const tx = await orderBookService.approveContract(TOKEN_CONTRACT);
      await tx.wait();
      setIsApproved(true);
      await refreshOrderBook();
    } catch (err) {
      console.error('Error approving contract:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orderBookService, refreshOrderBook]);

  // Create sell order with immediate cache update
  const createSellOrder = useCallback(async (tokenId: string, amount: number, pricePerTokenU2U: string) => {
    if (!orderBookService) throw new Error('Service not initialized');
    
    setLoading(true);
    try {
      // Immediately add a pending transaction to cache for instant feedback
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        const pendingTransaction = {
          hash: `pending_${Date.now()}`, // Temporary hash
          blockNumber: 0,
          timestamp: Date.now(),
          type: 'sell' as const,
          tokenId: tokenId,
          amount: amount,
          price: ethers.utils.parseEther(pricePerTokenU2U).toString(),
          from: address,
          to: ORDER_BOOK_ESCROW_CONTRACT,
          gasUsed: '0',
          gasPrice: '0',
          status: 'pending' as const,
          assetName: `Asset #${tokenId} (Sell Order)`,
          platformFee: '0'
        };
        
        // Get existing cached transactions and add the pending one
        const existingTransactions = dashboardCache.getCachedTransactionHistory(address) || [];
        const updatedTransactions = [pendingTransaction, ...existingTransactions];
        dashboardCache.cacheTransactionHistory(updatedTransactions, address);
        console.log('📝 Added pending sell order to transaction cache');
        
        // Also add an immediate notification for better UX
        const pendingNotification = {
          id: `sell_order_pending_${Date.now()}`,
          timestamp: Date.now(),
          type: 'order_created' as const,
          title: 'Sell Order Creating...',
          message: `Creating sell order for ${amount} tokens of Asset #${tokenId} at ${pricePerTokenU2U} U2U each. Waiting for blockchain confirmation...`,
          status: 'pending' as const,
          priority: 'medium' as const,
          read: false,
          orderData: {
            orderId: `pending_${Date.now()}`,
            tokenId: tokenId,
            assetName: `Asset #${tokenId}`,
            amount: amount,
            price: pricePerTokenU2U,
            orderType: 'sell' as const
          }
        };
        
        const existingNotifications = dashboardCache.getCachedNotifications(address) || [];
        const updatedNotifications = [pendingNotification, ...existingNotifications];
        dashboardCache.cacheNotifications(updatedNotifications, address);
        console.log('🔔 Added pending sell order notification');
      }
      
      const tx = await orderBookService.createSellOrder(tokenId, amount, pricePerTokenU2U);
      
      // Update the pending transaction with real transaction hash
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        const existingTransactions = dashboardCache.getCachedTransactionHistory(address) || [];
        const updatedTransactions = existingTransactions.map(txn => 
          txn.hash.startsWith('pending_') && txn.tokenId === tokenId && txn.type === 'sell'
            ? { ...txn, hash: tx.hash, status: 'pending' as const }
            : txn
        );
        dashboardCache.cacheTransactionHistory(updatedTransactions, address);
        console.log('🔄 Updated pending sell order with real tx hash:', tx.hash);
      }
      
      await tx.wait();
      
      // Update notifications after successful confirmation
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        const existingNotifications = dashboardCache.getCachedNotifications(address) || [];
        const updatedNotifications = existingNotifications.map(notification => {
          if (notification.id.includes('sell_order_pending_') && notification.orderData?.tokenId === tokenId) {
            return {
              ...notification,
              id: `sell_order_confirmed_${tx.hash}`,
              title: 'Sell Order Created Successfully',
              message: `Your sell order for ${amount} tokens of Asset #${tokenId} at ${pricePerTokenU2U} U2U each is now active in the OrderBook.`,
              status: 'completed' as const,
              priority: 'high' as const,
              transactionHash: tx.hash,
              orderData: {
                ...notification.orderData!,
                orderId: tx.hash
              }
            };
          }
          return notification;
        });
        dashboardCache.cacheNotifications(updatedNotifications, address);
        console.log('✅ Updated sell order notification with success status');
      }
      
      await refreshOrderBook();
    } catch (err) {
      console.error('Error creating sell order:', err);
      
      // Remove the pending transaction and notification if creation failed
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        
        // Remove pending transaction
        const existingTransactions = dashboardCache.getCachedTransactionHistory(address) || [];
        const updatedTransactions = existingTransactions.filter(txn => 
          !(txn.hash.startsWith('pending_') && txn.tokenId === tokenId && txn.type === 'sell')
        );
        dashboardCache.cacheTransactionHistory(updatedTransactions, address);
        
        // Remove/update pending notification
        const existingNotifications = dashboardCache.getCachedNotifications(address) || [];
        const updatedNotifications = existingNotifications.map(notification => {
          if (notification.id.includes('sell_order_pending_') && notification.orderData?.tokenId === tokenId) {
            return {
              ...notification,
              title: 'Sell Order Failed',
              message: `Failed to create sell order for Asset #${tokenId}. Please try again.`,
              status: 'failed' as const,
              priority: 'high' as const
            };
          }
          return notification;
        });
        dashboardCache.cacheNotifications(updatedNotifications, address);
        
        console.log('❌ Removed failed pending sell order from cache and updated notification');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orderBookService, refreshOrderBook, address]);

  // Create buy order with immediate cache update
  const createBuyOrder = useCallback(async (tokenId: string, amount: number, pricePerTokenU2U: string) => {
    if (!orderBookService) throw new Error('Service not initialized');
    
    setLoading(true);
    try {
      // Immediately add a pending transaction to cache for instant feedback
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        const pendingTransaction = {
          hash: `pending_${Date.now()}`, // Temporary hash
          blockNumber: 0,
          timestamp: Date.now(),
          type: 'buy' as const,
          tokenId: tokenId,
          amount: amount,
          price: ethers.utils.parseEther(pricePerTokenU2U).toString(),
          from: address,
          to: ORDER_BOOK_ESCROW_CONTRACT,
          gasUsed: '0',
          gasPrice: '0',
          status: 'pending' as const,
          assetName: `Asset #${tokenId} (Buy Order)`,
          platformFee: '0'
        };
        
        // Get existing cached transactions and add the pending one
        const existingTransactions = dashboardCache.getCachedTransactionHistory(address) || [];
        const updatedTransactions = [pendingTransaction, ...existingTransactions];
        dashboardCache.cacheTransactionHistory(updatedTransactions, address);
        console.log('📝 Added pending buy order to transaction cache');
        
        // Also add an immediate notification for better UX
        const pendingNotification = {
          id: `buy_order_pending_${Date.now()}`,
          timestamp: Date.now(),
          type: 'order_created' as const,
          title: 'Buy Order Creating...',
          message: `Creating buy order for ${amount} tokens of Asset #${tokenId} at ${pricePerTokenU2U} U2U each. Funds will be escrowed upon confirmation...`,
          status: 'pending' as const,
          priority: 'medium' as const,
          read: false,
          orderData: {
            orderId: `pending_${Date.now()}`,
            tokenId: tokenId,
            assetName: `Asset #${tokenId}`,
            amount: amount,
            price: pricePerTokenU2U,
            orderType: 'buy' as const
          }
        };
        
        const existingNotifications = dashboardCache.getCachedNotifications(address) || [];
        const updatedNotifications = [pendingNotification, ...existingNotifications];
        dashboardCache.cacheNotifications(updatedNotifications, address);
        console.log('🔔 Added pending buy order notification');
      }
      
      const tx = await orderBookService.createBuyOrder(tokenId, amount, pricePerTokenU2U);
      
      // Update the pending transaction with real transaction hash
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        const existingTransactions = dashboardCache.getCachedTransactionHistory(address) || [];
        const updatedTransactions = existingTransactions.map(txn => 
          txn.hash.startsWith('pending_') && txn.tokenId === tokenId && txn.type === 'buy'
            ? { ...txn, hash: tx.hash, status: 'pending' as const }
            : txn
        );
        dashboardCache.cacheTransactionHistory(updatedTransactions, address);
        console.log('🔄 Updated pending buy order with real tx hash:', tx.hash);
      }
      
      await tx.wait();
      
      // Update notifications after successful confirmation
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        const existingNotifications = dashboardCache.getCachedNotifications(address) || [];
        const updatedNotifications = existingNotifications.map(notification => {
          if (notification.id.includes('buy_order_pending_') && notification.orderData?.tokenId === tokenId) {
            return {
              ...notification,
              id: `buy_order_confirmed_${tx.hash}`,
              title: 'Buy Order Created & Funds Escrowed',
              message: `Your buy order for ${amount} tokens of Asset #${tokenId} at ${pricePerTokenU2U} U2U each is now active. ${(amount * parseFloat(pricePerTokenU2U)).toFixed(2)} U2U has been escrowed.`,
              status: 'completed' as const,
              priority: 'high' as const,
              transactionHash: tx.hash,
              orderData: {
                ...notification.orderData!,
                orderId: tx.hash,
                escrowAmount: (amount * parseFloat(pricePerTokenU2U)).toFixed(2)
              }
            };
          }
          return notification;
        });
        dashboardCache.cacheNotifications(updatedNotifications, address);
        console.log('✅ Updated buy order notification with success status');
      }
      
      await refreshOrderBook();
    } catch (err) {
      console.error('Error creating buy order:', err);
      
      // Remove the pending transaction and notification if creation failed
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        
        // Remove pending transaction
        const existingTransactions = dashboardCache.getCachedTransactionHistory(address) || [];
        const updatedTransactions = existingTransactions.filter(txn => 
          !(txn.hash.startsWith('pending_') && txn.tokenId === tokenId && txn.type === 'buy')
        );
        dashboardCache.cacheTransactionHistory(updatedTransactions, address);
        
        // Remove/update pending notification
        const existingNotifications = dashboardCache.getCachedNotifications(address) || [];
        const updatedNotifications = existingNotifications.map(notification => {
          if (notification.id.includes('buy_order_pending_') && notification.orderData?.tokenId === tokenId) {
            return {
              ...notification,
              title: 'Buy Order Failed',
              message: `Failed to create sell order for Asset #${tokenId}. Please try again.`,
              status: 'failed' as const,
              priority: 'high' as const
            };
          }
          return notification;
        });
        dashboardCache.cacheNotifications(updatedNotifications, address);
        
        console.log('❌ Removed failed pending buy order from cache and updated notification');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orderBookService, refreshOrderBook, address]);

  // Fill order with immediate cache update
  const fillOrder = useCallback(async (orderId: string, amountToFill: number, orderData: EscrowOrder) => {
    if (!orderBookService) throw new Error('Service not initialized');
    
    setLoading(true);
    try {
      // Immediately add a pending transaction for order fill
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        const pendingTransaction = {
          hash: `pending_fill_${Date.now()}`,
          blockNumber: 0,
          timestamp: Date.now(),
          type: (orderData.isBuyOrder ? 'sell' : 'buy') as 'buy' | 'sell',
          tokenId: orderData.tokenId,
          amount: amountToFill,
          price: ethers.utils.parseEther(orderData.pricePerTokenU2U.toString()).toString(),
          from: address,
          to: orderData.maker,
          gasUsed: '0',
          gasPrice: '0',
          status: 'pending' as const,
          assetName: `Asset #${orderData.tokenId} (P2P Trade)`,
          platformFee: '0'
        };
        
        const existingTransactions = dashboardCache.getCachedTransactionHistory(address) || [];
        const updatedTransactions = [pendingTransaction, ...existingTransactions];
        dashboardCache.cacheTransactionHistory(updatedTransactions, address);
        
        // Add immediate notification for order fill
        const pendingNotification = {
          id: `order_fill_pending_${Date.now()}`,
          timestamp: Date.now(),
          type: 'order_filled' as const,
          title: 'Executing Trade...',
          message: `Executing ${orderData.isBuyOrder ? 'sell' : 'buy'} trade for ${amountToFill} tokens of Asset #${orderData.tokenId}. Waiting for confirmation...`,
          status: 'pending' as const,
          priority: 'high' as const,
          read: false,
          orderData: {
            orderId: orderId,
            tokenId: orderData.tokenId,
            assetName: `Asset #${orderData.tokenId}`,
            amount: amountToFill,
            price: orderData.pricePerTokenU2U.toString(),
            orderType: (orderData.isBuyOrder ? 'sell' : 'buy') as 'buy' | 'sell'
          }
        };
        
        const existingNotifications = dashboardCache.getCachedNotifications(address) || [];
        const updatedNotifications = [pendingNotification, ...existingNotifications];
        dashboardCache.cacheNotifications(updatedNotifications, address);
        console.log('🔄 Added pending order fill transaction and notification');
      }
      
      const tx = await orderBookService.fillOrder(orderId, amountToFill, orderData);
      
      // Update with real transaction hash
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        const existingTransactions = dashboardCache.getCachedTransactionHistory(address) || [];
        const updatedTransactions = existingTransactions.map(txn => 
          txn.hash.startsWith('pending_fill_') && txn.tokenId === orderData.tokenId
            ? { ...txn, hash: tx.hash, status: 'pending' as const }
            : txn
        );
        dashboardCache.cacheTransactionHistory(updatedTransactions, address);
      }
      
      await tx.wait();
      
      // Update notification after successful trade
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        const existingNotifications = dashboardCache.getCachedNotifications(address) || [];
        const updatedNotifications = existingNotifications.map(notification => {
          if (notification.id.includes('order_fill_pending_') && notification.orderData?.tokenId === orderData.tokenId) {
            return {
              ...notification,
              id: `order_filled_success_${tx.hash}`,
              title: 'Trade Executed Successfully',
              message: `Successfully ${orderData.isBuyOrder ? 'sold' : 'bought'} ${amountToFill} tokens of Asset #${orderData.tokenId} for ${(amountToFill * orderData.pricePerTokenU2U).toFixed(2)} U2U. Trade completed!`,
              status: 'completed' as const,
              transactionHash: tx.hash
            };
          }
          return notification;
        });
        dashboardCache.cacheNotifications(updatedNotifications, address);
        console.log('✅ Updated order fill notification with success status');
      }
      
      await refreshOrderBook();
    } catch (err) {
      console.error('Error filling order:', err);
      
      // Handle failed order fill
      if (address) {
        const { dashboardCache } = await import('../utils/dashboardCache');
        
        // Remove pending transaction
        const existingTransactions = dashboardCache.getCachedTransactionHistory(address) || [];
        const updatedTransactions = existingTransactions.filter(txn => 
          !txn.hash.startsWith('pending_fill_')
        );
        dashboardCache.cacheTransactionHistory(updatedTransactions, address);
        
        // Update notification to show failure
        const existingNotifications = dashboardCache.getCachedNotifications(address) || [];
        const updatedNotifications = existingNotifications.map(notification => {
          if (notification.id.includes('order_fill_pending_')) {
            return {
              ...notification,
              title: 'Trade Failed',
              message: `Failed to execute trade for Asset #${orderData.tokenId}. Please try again.`,
              status: 'failed' as const
            };
          }
          return notification;
        });
        dashboardCache.cacheNotifications(updatedNotifications, address);
        console.log('❌ Updated order fill notification with failure status');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orderBookService, refreshOrderBook, address]);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string) => {
    if (!orderBookService) throw new Error('Service not initialized');
    
    setLoading(true);
    try {
      const tx = await orderBookService.cancelOrder(orderId);
      await tx.wait();
      await refreshOrderBook();
    } catch (err) {
      console.error('Error cancelling order:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [orderBookService, refreshOrderBook]);

  return {
    orderBookData,
    loading,
    error,
    refreshOrderBook,
    isApproved,
    approveContract,
    createSellOrder,
    createBuyOrder,
    fillOrder,
    cancelOrder,
    userOrders
  };
};