/**
 * Trading Service
 * Handles real-time trade tracking and historical blockchain data
 */

import { ethers } from 'ethers';

export interface TradeData {
  tokenId: string;
  price: number;
  amount: number;
  timestamp: number;
  buyer: string;
  seller: string;
  txHash: string;
  type: 'buy' | 'sell';
}

export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isGreen: boolean;
}

export interface PriceStats {
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  avgTradeSize: number;
}

class TradingService {
  private provider: ethers.providers.Provider | null = null;
  private tradeCache = new Map<string, TradeData[]>();
  private priceCache = new Map<string, PriceStats>();

  constructor() {
    // Initialize with default provider if available
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      this.provider = new ethers.providers.Web3Provider((window as any).ethereum);
    }
  }

  /**
   * Set the provider for blockchain interactions
   */
  setProvider(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Fetch historical trades for a specific token
   */
  async fetchHistoricalTrades(
    tokenId: string, 
    fromTimestamp?: number, 
    toTimestamp?: number
  ): Promise<TradeData[]> {
    try {
      console.log(`🔍 Fetching historical trades for token ${tokenId}...`);

      // Check cache first
      const cacheKey = `${tokenId}_${fromTimestamp || 0}_${toTimestamp || Date.now()}`;
      if (this.tradeCache.has(cacheKey)) {
        console.log('📋 Returning cached trade data');
        return this.tradeCache.get(cacheKey)!;
      }

      if (!this.provider) {
        console.warn('⚠️ No provider available for fetching trades');
        return this.generateFallbackTrades(tokenId);
      }

      // In a real implementation, you would:
      // 1. Query marketplace contract events
      // 2. Query orderbook contract events
      // 3. Parse transaction logs for trades
      
      // For now, generate realistic demo data based on current market conditions
      const trades = await this.generateRealisticTrades(tokenId, fromTimestamp, toTimestamp);
      
      // Cache the results
      this.tradeCache.set(cacheKey, trades);
      
      console.log(`✅ Generated ${trades.length} historical trades`);
      return trades;

    } catch (error) {
      console.error('❌ Error fetching historical trades:', error);
      return this.generateFallbackTrades(tokenId);
    }
  }

  /**
   * Generate realistic trade data for demonstration
   */
  private async generateRealisticTrades(
    tokenId: string, 
    fromTimestamp?: number, 
    toTimestamp?: number
  ): Promise<TradeData[]> {
    const now = Date.now();
    const from = fromTimestamp || (now - 24 * 60 * 60 * 1000); // 24 hours ago
    const to = toTimestamp || now;
    
    const trades: TradeData[] = [];
    const basePrice = 100 + Math.random() * 900; // Base price between 100-1000
    
    // Generate 20-100 trades over the time period
    const tradeCount = 20 + Math.floor(Math.random() * 80);
    
    for (let i = 0; i < tradeCount; i++) {
      const timestamp = from + (i / tradeCount) * (to - from);
      
      // Create price movements with realistic volatility
      const timeProgress = i / tradeCount;
      const trend = Math.sin(timeProgress * Math.PI * 2) * 0.1; // Sine wave trend
      const volatility = (Math.random() - 0.5) * 0.05; // ±2.5% volatility
      const priceMultiplier = 1 + trend + volatility;
      
      const price = basePrice * priceMultiplier;
      const amount = 1 + Math.floor(Math.random() * 10); // 1-10 tokens
      const type = Math.random() > 0.5 ? 'buy' : 'sell';
      
      trades.push({
        tokenId,
        price,
        amount,
        timestamp,
        buyer: this.generateRandomAddress(),
        seller: this.generateRandomAddress(),
        txHash: this.generateRandomTxHash(),
        type
      });
    }

    // Sort by timestamp
    return trades.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Generate fallback trades when no real data is available
   */
  private generateFallbackTrades(tokenId: string): TradeData[] {
    const now = Date.now();
    const trades: TradeData[] = [];
    const basePrice = 100;
    
    // Generate minimal demo data
    for (let i = 0; i < 10; i++) {
      const timestamp = now - (9 - i) * 60 * 60 * 1000; // Last 10 hours
      const priceVariation = 1 + (Math.random() - 0.5) * 0.02; // ±1% variation
      
      trades.push({
        tokenId,
        price: basePrice * priceVariation,
        amount: 1 + Math.floor(Math.random() * 5),
        timestamp,
        buyer: this.generateRandomAddress(),
        seller: this.generateRandomAddress(),
        txHash: this.generateRandomTxHash(),
        type: Math.random() > 0.5 ? 'buy' : 'sell'
      });
    }

    return trades;
  }

  /**
   * Convert trade data to candlestick format
   */
  generateCandlestickData(
    trades: TradeData[], 
    timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' = '1h'
  ): CandlestickData[] {
    if (trades.length === 0) return [];

    const timeframes = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };

    const intervalMs = timeframes[timeframe];
    const candlesticks: CandlestickData[] = [];
    
    // Group trades by time intervals
    const oldestTrade = Math.min(...trades.map(t => t.timestamp));
    const newestTrade = Math.max(...trades.map(t => t.timestamp));
    
    for (let time = oldestTrade; time <= newestTrade; time += intervalMs) {
      const periodTrades = trades.filter(
        t => t.timestamp >= time && t.timestamp < time + intervalMs
      );

      if (periodTrades.length === 0) continue;

      const prices = periodTrades.map(t => t.price);
      const volume = periodTrades.reduce((sum, t) => sum + (t.price * t.amount), 0);
      
      const open = periodTrades[0].price;
      const close = periodTrades[periodTrades.length - 1].price;
      const high = Math.max(...prices);
      const low = Math.min(...prices);

      candlesticks.push({
        timestamp: time,
        open,
        high,
        low,
        close,
        volume,
        isGreen: close >= open
      });
    }

    return candlesticks;
  }

  /**
   * Calculate current price statistics
   */
  async calculatePriceStats(tokenId: string, totalSupply: number = 1000000): Promise<PriceStats> {
    try {
      const cacheKey = `stats_${tokenId}`;
      if (this.priceCache.has(cacheKey)) {
        return this.priceCache.get(cacheKey)!;
      }

      const trades = await this.fetchHistoricalTrades(tokenId);
      if (trades.length === 0) {
        return {
          currentPrice: 100,
          priceChange24h: 0,
          volume24h: 0,
          marketCap: 100 * totalSupply,
          avgTradeSize: 0
        };
      }

      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      
      const recentTrades = trades.filter(t => t.timestamp >= dayAgo);
      const currentPrice = trades[trades.length - 1].price;
      
      let priceChange24h = 0;
      if (trades.length > 1) {
        const dayAgoTrades = trades.filter(t => t.timestamp <= dayAgo);
        if (dayAgoTrades.length > 0) {
          const oldPrice = dayAgoTrades[dayAgoTrades.length - 1].price;
          priceChange24h = ((currentPrice - oldPrice) / oldPrice) * 100;
        }
      }

      const volume24h = recentTrades.reduce((sum, t) => sum + (t.price * t.amount), 0);
      const avgTradeSize = recentTrades.length > 0 ? 
        recentTrades.reduce((sum, t) => sum + t.amount, 0) / recentTrades.length : 0;

      const stats: PriceStats = {
        currentPrice,
        priceChange24h,
        volume24h,
        marketCap: currentPrice * totalSupply,
        avgTradeSize
      };

      this.priceCache.set(cacheKey, stats);
      return stats;

    } catch (error) {
      console.error('❌ Error calculating price stats:', error);
      return {
        currentPrice: 100,
        priceChange24h: 0,
        volume24h: 0,
        marketCap: 100 * totalSupply,
        avgTradeSize: 0
      };
    }
  }

  /**
   * Monitor real-time trades (would connect to blockchain events in production)
   */
  startRealTimeMonitoring(tokenId: string, callback: (trade: TradeData) => void) {
    console.log(`🔴 Starting real-time monitoring for token ${tokenId}`);
    
    // In production, this would:
    // 1. Subscribe to marketplace contract events
    // 2. Listen for OrderFilled events
    // 3. Parse transaction data and call callback
    
    // For demo, simulate occasional trades
    const interval = setInterval(() => {
      if (Math.random() > 0.95) { // 5% chance every interval
        const mockTrade: TradeData = {
          tokenId,
          price: 100 + (Math.random() - 0.5) * 20,
          amount: 1 + Math.floor(Math.random() * 5),
          timestamp: Date.now(),
          buyer: this.generateRandomAddress(),
          seller: this.generateRandomAddress(),
          txHash: this.generateRandomTxHash(),
          type: Math.random() > 0.5 ? 'buy' : 'sell'
        };
        callback(mockTrade);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }

  /**
   * Clear cached data
   */
  clearCache() {
    this.tradeCache.clear();
    this.priceCache.clear();
    console.log('🧹 Trading service cache cleared');
  }

  // Utility methods
  private generateRandomAddress(): string {
    return '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private generateRandomTxHash(): string {
    return '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}

export const tradingService = new TradingService();