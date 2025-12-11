// Types for dashboard data and caching

export interface UserAsset {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  price: string; // in token units
  amount: number;
  seller: string;
  metadataURI: string;
  metadata?: any;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  type: string;
  source?: 'marketplace' | 'wallet'; // Track where the asset was found
}

export interface PortfolioData {
  totalInvestment: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
  monthlyIncome: number;
  totalAssets: number;
  activeInvestments: number;
}

// Transaction history interface
export interface TransactionHistory {
  hash: string;
  blockNumber: number;
  timestamp: number;
  type: 'buy' | 'sell' | 'listing' | 'transfer';
  tokenId: string;
  amount: number;
  price: string; // in Wei
  from: string;
  to: string;
  gasUsed: string;
  gasPrice: string;
  status: 'success' | 'failed' | 'pending';
  assetName?: string;
  platformFee?: string;
}

// Notification interface for trading activities
export interface TradingNotification {
  id: string;
  timestamp: number;
  type: 'order_created' | 'order_filled' | 'order_cancelled' | 'escrow_released' | 'trade_completed';
  title: string;
  message: string;
  status: 'pending' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  orderData?: {
    orderId: string;
    tokenId: string;
    assetName: string;
    amount: number;
    price: string; // in U2U
    orderType: 'buy' | 'sell';
    escrowAmount?: string;
  };
  transactionHash?: string;
}

// Cache-related types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  walletAddress: string;
}

export interface CacheConfig {
  KEYS: {
    USER_ASSETS: string;
    PORTFOLIO_DATA: string;
    TRANSACTION_HISTORY: string;
    NOTIFICATIONS: string;
    LAST_REFRESH: string;
  };
  EXPIRATION: {
    USER_ASSETS: number;
    PORTFOLIO_DATA: number;
    TRANSACTION_HISTORY: number;
    NOTIFICATIONS: number;
  };
}

export interface LoadingState {
  isLoading: boolean;
  isFromCache: boolean;
  lastUpdated?: number;
}