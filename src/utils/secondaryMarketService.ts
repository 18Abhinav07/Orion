import { ethers } from 'ethers';
import { 
  SECONDARY_MARKET_BRIDGE_ABI, 
  ERC3643_MARKETPLACE_ABI, 
  KYC_BRIDGE_ABI,
  SECONDARY_MARKET_CONTRACTS 
} from './secondaryMarketABI';

export interface SecondaryMarketOrder {
  orderId: string;
  seller: string;
  tokenContract: string;
  amount: number;
  pricePerToken: number;
  totalPrice: number;
  isActive: boolean;
  timestamp: number;
  expiryTimestamp: number;
}

export interface SecondaryMarketTrade {
  tradeId: string;
  orderId: string;
  buyer: string;
  seller: string;
  tokenContract: string;
  amount: number;
  totalPrice: number;
  platformFee: number;
  timestamp: number;
}

export interface BridgedToken {
  tokenId: string;
  amount: number;
  wrappedAddress: string;
  name: string;
  symbol: string;
  totalBridged: number;
  isActive: boolean;
}

export interface MarketDepth {
  totalOrders: number;
  totalVolume: number;
  bestAskPrice: number;
  bestAskAmount: number;
}

export class SecondaryMarketService {
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;

  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // Get contract instances with existence checks
  private async getBridgeContract(withSigner: boolean = false) {
    const contract = new ethers.Contract(
      SECONDARY_MARKET_CONTRACTS.BRIDGE,
      SECONDARY_MARKET_BRIDGE_ABI,
      withSigner && this.signer ? this.signer : this.provider
    );
    
    // Check if contract exists
    try {
      const code = await this.provider.getCode(SECONDARY_MARKET_CONTRACTS.BRIDGE);
      if (code === '0x') {
        throw new Error('Bridge contract not deployed at specified address');
      }
    } catch (error) {
      console.error('Bridge contract validation failed:', error);
      throw error;
    }
    
    return contract;
  }

  private async getMarketplaceContract(withSigner: boolean = false) {
    const contract = new ethers.Contract(
      SECONDARY_MARKET_CONTRACTS.ERC3643_MARKETPLACE,
      ERC3643_MARKETPLACE_ABI,
      withSigner && this.signer ? this.signer : this.provider
    );
    
    // Check if contract exists
    try {
      const code = await this.provider.getCode(SECONDARY_MARKET_CONTRACTS.ERC3643_MARKETPLACE);
      if (code === '0x') {
        throw new Error('ERC3643 Marketplace contract not deployed at specified address');
      }
    } catch (error) {
      console.error('ERC3643 Marketplace contract validation failed:', error);
      throw error;
    }
    
    return contract;
  }

  private async getKYCContract(withSigner: boolean = false) {
    const contract = new ethers.Contract(
      SECONDARY_MARKET_CONTRACTS.KYC_BRIDGE,
      KYC_BRIDGE_ABI,
      withSigner && this.signer ? this.signer : this.provider
    );
    
    // Check if contract exists
    try {
      const code = await this.provider.getCode(SECONDARY_MARKET_CONTRACTS.KYC_BRIDGE);
      if (code === '0x') {
        throw new Error('KYC Bridge contract not deployed at specified address');
      }
    } catch (error) {
      console.error('KYC Bridge contract validation failed:', error);
      throw error;
    }
    
    return contract;
  }

  // KYC Functions - REMOVED FOR PERMISSIONLESS TRADING
  // Note: All KYC checks have been removed to enable permissionless P2P trading

  // Bridge Functions
  async bridgeTokensToP2P(tokenId: string, amount: number): Promise<string> {
    if (!this.signer) throw new Error('Signer required for bridging');
    
    try {
      const bridgeContract = this.getBridgeContract(true);
      const tx = await bridgeContract.bridgeToP2P(tokenId, amount);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error bridging tokens:', error);
      throw error;
    }
  }

  async getBridgedHoldings(userAddress: string): Promise<BridgedToken[]> {
    try {
      const bridgeContract = this.getBridgeContract();
      const [tokenIds, amounts, wrappedAddresses] = await bridgeContract.getBridgedHoldings(userAddress);
      
      const bridgedTokens: BridgedToken[] = [];
      
      for (let i = 0; i < tokenIds.length; i++) {
        const wrappedInfo = await bridgeContract.getWrappedTokenInfo(tokenIds[i]);
        
        bridgedTokens.push({
          tokenId: tokenIds[i].toString(),
          amount: amounts[i].toNumber(),
          wrappedAddress: wrappedAddresses[i],
          name: wrappedInfo.name,
          symbol: wrappedInfo.symbol,
          totalBridged: wrappedInfo.totalBridged.toNumber(),
          isActive: wrappedInfo.isActive
        });
      }
      
      return bridgedTokens;
    } catch (error) {
      console.error('Error getting bridged holdings:', error);
      return [];
    }
  }

  // Secondary Market Trading Functions
  async createSellOrder(
    tokenId: string,
    amount: number,
    pricePerToken: string,
    expiryHours: number = 24
  ): Promise<string> {
    if (!this.signer) throw new Error('Signer required for creating orders');
    
    try {
      // First bridge tokens if not already bridged
      await this.bridgeTokensToP2P(tokenId, amount);
      
      // Calculate expiry timestamp
      const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryHours * 3600);
      
      // Convert price to Wei
      const priceInWei = ethers.utils.parseEther(pricePerToken);
      
      // Create P2P sell order through bridge
      const bridgeContract = this.getBridgeContract(true);
      const tx = await bridgeContract.createP2PSellOrder(
        tokenId,
        amount,
        priceInWei,
        expiryTimestamp
      );
      
      const receipt = await tx.wait();
      
      // Extract order ID from events
      const orderCreatedEvent = receipt.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'P2POrderCreated'
      );
      
      if (orderCreatedEvent) {
        console.log('Order created successfully:', orderCreatedEvent.args);
      }
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error creating sell order:', error);
      throw error;
    }
  }

  async buyFromP2P(orderId: string, amountToBuy: number, totalPrice: string): Promise<string> {
    if (!this.signer) throw new Error('Signer required for buying');
    
    try {
      const bridgeContract = this.getBridgeContract(true);
      
      // Convert total price to Wei
      const totalPriceInWei = ethers.utils.parseEther(totalPrice);
      
      const tx = await bridgeContract.buyFromP2P(orderId, amountToBuy, {
        value: totalPriceInWei
      });
      
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error buying from P2P:', error);
      throw error;
    }
  }

  async getActiveOrders(tokenId: string): Promise<SecondaryMarketOrder[]> {
    try {
      const bridgeContract = this.getBridgeContract();
      const orderIds = await bridgeContract.getP2POrders(tokenId);
      
      const orders: SecondaryMarketOrder[] = [];
      const marketplaceContract = this.getMarketplaceContract();
      
      for (const orderId of orderIds) {
        try {
          const orderData = await marketplaceContract.orders(orderId);
          
          if (orderData.isActive && orderData.expiryTimestamp > Date.now() / 1000) {
            orders.push({
              orderId: orderId.toString(),
              seller: orderData.seller,
              tokenContract: orderData.tokenContract,
              amount: orderData.amount.toNumber(),
              pricePerToken: parseFloat(ethers.utils.formatEther(orderData.pricePerToken)),
              totalPrice: parseFloat(ethers.utils.formatEther(orderData.totalPrice)),
              isActive: orderData.isActive,
              timestamp: orderData.timestamp.toNumber(),
              expiryTimestamp: orderData.expiryTimestamp.toNumber()
            });
          }
        } catch (error) {
          console.warn(`Error fetching order ${orderId}:`, error);
        }
      }
      
      return orders;
    } catch (error) {
      console.error('Error getting active orders:', error);
      return [];
    }
  }

  async getUserActiveOrders(userAddress: string): Promise<SecondaryMarketOrder[]> {
    try {
      const marketplaceContract = this.getMarketplaceContract();
      const orderIds = await marketplaceContract.getUserActiveOrders(userAddress);
      
      const orders: SecondaryMarketOrder[] = [];
      
      for (const orderId of orderIds) {
        try {
          const orderData = await marketplaceContract.orders(orderId);
          
          orders.push({
            orderId: orderId.toString(),
            seller: orderData.seller,
            tokenContract: orderData.tokenContract,
            amount: orderData.amount.toNumber(),
            pricePerToken: parseFloat(ethers.utils.formatEther(orderData.pricePerToken)),
            totalPrice: parseFloat(ethers.utils.formatEther(orderData.totalPrice)),
            isActive: orderData.isActive,
            timestamp: orderData.timestamp.toNumber(),
            expiryTimestamp: orderData.expiryTimestamp.toNumber()
          });
        } catch (error) {
          console.warn(`Error fetching user order ${orderId}:`, error);
        }
      }
      
      return orders;
    } catch (error) {
      console.error('Error getting user active orders:', error);
      return [];
    }
  }

  async getMarketDepth(wrappedTokenAddress: string): Promise<MarketDepth> {
    try {
      const marketplaceContract = this.getMarketplaceContract();
      
      const [totalOrders, totalVolume] = await marketplaceContract.getOrderBookDepth(wrappedTokenAddress);
      const [bestAskPrice, bestAskAmount] = await marketplaceContract.getBestAskPrice(wrappedTokenAddress);
      
      return {
        totalOrders: totalOrders.toNumber(),
        totalVolume: totalVolume.toNumber(),
        bestAskPrice: parseFloat(ethers.utils.formatEther(bestAskPrice)),
        bestAskAmount: bestAskAmount.toNumber()
      };
    } catch (error) {
      console.error('Error getting market depth:', error);
      return {
        totalOrders: 0,
        totalVolume: 0,
        bestAskPrice: 0,
        bestAskAmount: 0
      };
    }
  }

  async cancelOrder(orderId: string): Promise<string> {
    if (!this.signer) throw new Error('Signer required for cancelling orders');
    
    try {
      const marketplaceContract = this.getMarketplaceContract(true);
      const tx = await marketplaceContract.cancelOrder(orderId);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  async getTradeHistory(userAddress: string): Promise<SecondaryMarketTrade[]> {
    try {
      // This would typically involve querying events from the marketplace contract
      // For now, we'll return empty array as this requires event filtering
      return [];
    } catch (error) {
      console.error('Error getting trade history:', error);
      return [];
    }
  }

  // Price and statistics functions
  async getTokenPriceHistory(tokenId: string, timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<number[]> {
    try {
      // Mock implementation - in reality, this would query historical price data
      // from events or an external price service
      const dataPoints = timeframe === '1h' ? 60 : timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : 30;
      const basePrice = 1.0; // Base price in ETH
      
      return Array.from({ length: dataPoints }, (_, i) => {
        const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
        return basePrice + variance;
      });
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    }
  }

  async getTokenVolumeHistory(tokenId: string, timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<number[]> {
    try {
      // Mock implementation - in reality, this would query volume data from events
      const dataPoints = timeframe === '1h' ? 60 : timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : 30;
      
      return Array.from({ length: dataPoints }, () => {
        return Math.random() * 1000 + 100; // Random volume between 100-1100
      });
    } catch (error) {
      console.error('Error getting volume history:', error);
      return [];
    }
  }
}

// Utility functions
export const formatPrice = (price: number): string => {
  return price.toFixed(6);
};

export const formatAmount = (amount: number): string => {
  return amount.toLocaleString();
};

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

export const calculatePlatformFee = (totalPrice: number, feePercent: number = 1): number => {
  return (totalPrice * feePercent) / 100;
};

export const calculateTotal = (amount: number, pricePerToken: number, includeFee: boolean = true): number => {
  const subtotal = amount * pricePerToken;
  return includeFee ? subtotal + calculatePlatformFee(subtotal) : subtotal;
};