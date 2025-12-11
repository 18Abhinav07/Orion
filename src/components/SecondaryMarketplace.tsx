import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
// Permissionless trading - no KYC/compliance required
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  User,
  DollarSign,
  Clock,
  ArrowUpDown,
  Eye,
  Zap,
  Activity,
  Plus,
  Minus
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  totalSupply: number;
  userBalance: number;
}

interface Order {
  orderId: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  total: number;
  timestamp: number;
  user: string;
  filled: number;
  status: 'active' | 'filled' | 'cancelled';
}

interface Trade {
  tradeId: string;
  price: number;
  amount: number;
  timestamp: number;
  side: 'buy' | 'sell';
}

interface SecondaryMarketplaceProps {
  selectedToken: TokenInfo;
  onClose: () => void;
  userWallet: string;
}

const SecondaryMarketplace: React.FC<SecondaryMarketplaceProps> = ({
  selectedToken,
  onClose,
  userWallet
}) => {
  // Wallet context
  const { provider, signer, isConnected } = useWallet();
  
  // State management for permissionless trading
  const [orderBook, setOrderBook] = useState<{ buys: Order[], sells: Order[] }>({
    buys: [],
    sells: []
  });
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [volumeHistory, setVolumeHistory] = useState<number[]>([]);
  
  // Trading form state
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('sell');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('limit');
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  // Always enabled for permissionless trading
  const kycVerified = true;

  // Initialize marketplace with mock data for permissionless trading
  useEffect(() => {
    const initializeMarketplace = async () => {
      try {
        // Generate mock trading data for demonstration
        generateMockData();
        
        // Toast notification for permissionless trading
        toast.success('Marketplace loaded! Permissionless trading is enabled.');
      } catch (error) {
        console.error('Error initializing marketplace:', error);
        generateMockData(); // Fallback to mock data
      }
    };
    
    initializeMarketplace();
  }, [selectedToken]);
  
  // Generate mock market data for demonstration
  const generateMockData = () => {
    // Mock order book
    const mockSellOrders: Order[] = [
      { orderId: '1', side: 'sell', price: 1.05, amount: 100, total: 105, timestamp: Date.now(), user: '0x123...', filled: 0, status: 'active' },
      { orderId: '2', side: 'sell', price: 1.04, amount: 250, total: 260, timestamp: Date.now(), user: '0x456...', filled: 0, status: 'active' },
      { orderId: '3', side: 'sell', price: 1.03, amount: 150, total: 154.5, timestamp: Date.now(), user: '0x789...', filled: 0, status: 'active' },
      { orderId: '4', side: 'sell', price: 1.02, amount: 300, total: 306, timestamp: Date.now(), user: '0xabc...', filled: 0, status: 'active' },
      { orderId: '5', side: 'sell', price: 1.01, amount: 200, total: 202, timestamp: Date.now(), user: '0xdef...', filled: 0, status: 'active' },
    ];

    const mockBuyOrders: Order[] = [
      { orderId: '6', side: 'buy', price: 0.99, amount: 150, total: 148.5, timestamp: Date.now(), user: '0x111...', filled: 0, status: 'active' },
      { orderId: '7', side: 'buy', price: 0.98, amount: 200, total: 196, timestamp: Date.now(), user: '0x222...', filled: 0, status: 'active' },
      { orderId: '8', side: 'buy', price: 0.97, amount: 100, total: 97, timestamp: Date.now(), user: '0x333...', filled: 0, status: 'active' },
      { orderId: '9', side: 'buy', price: 0.96, amount: 300, total: 288, timestamp: Date.now(), user: '0x444...', filled: 0, status: 'active' },
      { orderId: '10', side: 'buy', price: 0.95, amount: 250, total: 237.5, timestamp: Date.now(), user: '0x555...', filled: 0, status: 'active' },
    ];

    setOrderBook({
      sells: mockSellOrders.sort((a, b) => a.price - b.price),
      buys: mockBuyOrders.sort((a, b) => b.price - a.price)
    });

    // Mock recent trades
    const mockTrades: Trade[] = [
      { tradeId: '1', price: 1.00, amount: 50, timestamp: Date.now() - 300000, side: 'buy' },
      { tradeId: '2', price: 0.99, amount: 75, timestamp: Date.now() - 600000, side: 'sell' },
      { tradeId: '3', price: 1.01, amount: 25, timestamp: Date.now() - 900000, side: 'buy' },
      { tradeId: '4', price: 1.00, amount: 100, timestamp: Date.now() - 1200000, side: 'sell' },
      { tradeId: '5', price: 1.02, amount: 60, timestamp: Date.now() - 1500000, side: 'buy' },
    ];

    setRecentTrades(mockTrades);

    // Mock price history for chart
    const mockPriceHistory = Array.from({ length: 24 }, (_, i) => {
      return selectedToken.currentPrice + (Math.random() - 0.5) * 0.1;
    });
    setPriceHistory(mockPriceHistory);

    // Mock volume history
    const mockVolumeHistory = Array.from({ length: 24 }, () => Math.random() * 1000 + 500);
    setVolumeHistory(mockVolumeHistory);
  };

  // Simplified order creation for permissionless trading
  const handleCreateOrder = async () => {
    if (!price || !amount) {
      toast.error('Please enter valid price and amount');
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    
    // Redirect to OrderBook page for advanced trading
    toast.info('Redirecting to OrderBook for advanced trading...');
    // This component now serves as a simple demo, real trading happens in OrderBook
    
    // Mock order creation for demonstration
    setLoading(true);
    try {
      const priceNum = parseFloat(price);
      const amountNum = parseInt(amount);
      
      // Simulate order creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (activeTab === 'sell') {
        toast.success(`Mock sell order created: ${amountNum} tokens at ${priceNum} U2U each`);
      } else {
        toast.success(`Mock buy order created: ${amountNum} tokens at ${priceNum} U2U each`);
      }
      
      // Refresh mock data
      generateMockData();
      
      // Reset form
      setPrice('');
      setAmount('');
      
    } catch (error: any) {
      console.error('Mock order creation:', error);
      toast.error('Mock order creation demonstration completed');
    } finally {
      setLoading(false);
    }
  };

  // Handle buying from a specific sell order (mock)
  const handleBuyFromOrder = async (order: Order) => {
    if (!kycVerified) {
      toast.error('This is a demo - use OrderBook page for real trading');
      return;
    }
    
    try {
      setLoading(true);
      toast.info('Mock purchase from P2P order...');
      
      // Simulate purchase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Mock purchase completed: ${order.amount} tokens at ${order.price} U2U each`);
      
      // Refresh mock data
      generateMockData();
      
    } catch (error: any) {
      console.error('Mock purchase:', error);
      toast.error('Mock purchase demonstration completed');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancelling an order (mock)
  const handleCancelOrder = async (orderId: string) => {
    try {
      setLoading(true);
      toast.info('Mock order cancellation...');
      
      // Simulate cancellation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Mock order cancelled: ${orderId}`);
      
      // Refresh mock data
      generateMockData();
      
    } catch (error: any) {
      console.error('Mock cancellation:', error);
      toast.error('Mock cancellation demonstration completed');
    } finally {
      setLoading(false);
    }
  };

  const priceChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Price (ETH)',
        data: priceHistory,
        borderColor: selectedToken.priceChange24h >= 0 ? '#10B981' : '#EF4444',
        backgroundColor: selectedToken.priceChange24h >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const volumeChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Volume',
        data: volumeHistory,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-7xl w-full h-[90vh] overflow-hidden flex flex-col">
        {/* Demo Notice */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">📊 Trading Demo Interface</p>
                <p className="text-sm text-blue-700">This is a demonstration interface with mock data.</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('/orderbook', '_blank')}
                className="bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                🚀 Open Real OrderBook
              </Button>
              <p className="text-xs text-blue-600">Use OrderBook for actual trading</p>
            </div>
          </div>
        </div>
        
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedToken.name}</h1>
                <p className="text-sm text-gray-600">#{selectedToken.tokenId} • Secondary Market</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {selectedToken.currentPrice.toFixed(4)} ETH
                </p>
                <div className={`flex items-center justify-center space-x-1 ${
                  selectedToken.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedToken.priceChange24h >= 0 ? 
                    <TrendingUp className="w-4 h-4" /> : 
                    <TrendingDown className="w-4 h-4" />
                  }
                  <span className="text-sm font-medium">
                    {selectedToken.priceChange24h >= 0 ? '+' : ''}{selectedToken.priceChange24h.toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">24h Volume</p>
                  <p className="font-bold">{selectedToken.volume24h.toFixed(2)} ETH</p>
                </div>
                <div>
                  <p className="text-gray-600">Market Cap</p>
                  <p className="font-bold">{(selectedToken.marketCap / 1000).toFixed(1)}K ETH</p>
                </div>
                <div>
                  <p className="text-gray-600">Your Balance</p>
                  <p className="font-bold text-blue-600">{selectedToken.userBalance}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Trading enabled for all users - permissionless */}
          <div className="mx-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">✅ Trading Enabled</h3>
              <p className="text-sm text-green-600">Permissionless trading is active. No KYC required.</p>
            </div>
          </div>
          
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Chart & Trading */}
          <div className="flex-1 flex flex-col">
            {/* Price Chart */}
            <div className="h-80 p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Price Chart (24h)</h3>
                <div className="flex space-x-2">
                  <Badge variant="outline">1H</Badge>
                  <Badge variant="default">24H</Badge>
                  <Badge variant="outline">7D</Badge>
                  <Badge variant="outline">30D</Badge>
                </div>
              </div>
              <div className="h-64">
                <Line data={priceChartData} options={chartOptions} />
              </div>
            </div>

            {/* Trading Interface */}
            <div className="flex-1 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">P2P Trading</h2>
                <p className="text-sm text-gray-600">
                  List your tokens for sale or buy from other users in the peer-to-peer marketplace
                </p>
              </div>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'buy' | 'sell')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sell" className="text-red-600 font-semibold">📤 List Tokens for Sale</TabsTrigger>
                  <TabsTrigger value="buy" className="text-green-600">💰 Buy from Market</TabsTrigger>
                </TabsList>
                
                <TabsContent value="sell" className="space-y-4">
                  <TradingForm 
                    side="sell"
                    orderType={orderType}
                    setOrderType={setOrderType}
                    price={price}
                    setPrice={setPrice}
                    amount={amount}
                    setAmount={setAmount}
                    onSubmit={handleCreateOrder}
                    loading={loading}
                    tokenInfo={selectedToken}
                    kycVerified={true} // Permissionless trading
                  />
                </TabsContent>
                
                <TabsContent value="buy" className="space-y-4">
                  <TradingForm 
                    side="buy"
                    orderType={orderType}
                    setOrderType={setOrderType}
                    price={price}
                    setPrice={setPrice}
                    amount={amount}
                    setAmount={setAmount}
                    onSubmit={handleCreateOrder}
                    loading={loading}
                    tokenInfo={selectedToken}
                    kycVerified={true} // Permissionless trading
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Panel - Order Book & Trade History */}
          <div className="w-96 border-l flex flex-col">
            {/* Order Book */}
            <div className="flex-1 p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Order Book
              </h3>
              
              <OrderBook 
                orderBook={orderBook} 
                currentPrice={selectedToken.currentPrice}
                onBuyFromOrder={handleBuyFromOrder}
                onCancelOrder={handleCancelOrder}
                userWallet={userWallet}
                kycVerified={kycVerified}
              />
            </div>

            {/* Recent Trades & My Orders */}
            <div className="h-64 p-4 border-t">
              <Tabs defaultValue="trades" className="h-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="trades">Recent Trades</TabsTrigger>
                  <TabsTrigger value="myorders">My Orders</TabsTrigger>
                </TabsList>
                
                <TabsContent value="trades" className="h-44">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {recentTrades.map((trade) => (
                      <div key={trade.tradeId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            trade.side === 'buy' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="font-mono">{trade.price.toFixed(4)}</span>
                        </div>
                        <span className="text-gray-600">{trade.amount}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="myorders" className="h-44">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userOrders.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">
                        No active orders
                      </div>
                    ) : (
                      userOrders.map((order) => (
                        <div key={order.orderId} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">{order.price.toFixed(4)} ETH</span>
                            <span className="text-gray-500 text-xs">{order.amount} tokens</span>
                          </div>
                          <Badge variant={order.status === 'active' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                          {order.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6 px-2 border-red-300 text-red-600 hover:bg-red-100"
                              onClick={() => handleCancelOrder(order.orderId)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Bottom Panel - Volume Chart */}
        <div className="h-32 p-4 border-t">
          <h3 className="text-sm font-semibold mb-2">Volume (24h)</h3>
          <div className="h-20">
            <Bar data={volumeChartData} options={{
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: {
                  display: false,
                },
              },
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Trading Form Component
interface TradingFormProps {
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  setOrderType: (type: 'market' | 'limit') => void;
  price: string;
  setPrice: (price: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  onSubmit: () => void;
  loading: boolean;
  tokenInfo: TokenInfo;
  kycVerified: boolean;
}

const TradingForm: React.FC<TradingFormProps> = ({
  side,
  orderType,
  setOrderType,
  price,
  setPrice,
  amount,
  setAmount,
  onSubmit,
  loading,
  tokenInfo,
  kycVerified
}) => {
  const total = price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(6) : '0';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center ${
          side === 'buy' ? 'text-green-600' : 'text-red-600'
        }`}>
          {side === 'buy' ? <Plus className="w-5 h-5 mr-2" /> : <Minus className="w-5 h-5 mr-2" />}
          {side === 'buy' ? 'Buy' : 'List for Sale'} {tokenInfo.symbol}
        </CardTitle>
        {side === 'sell' && (
          <p className="text-sm text-gray-600 mt-2">
            Create a sell order to list your {tokenInfo.symbol} tokens for sale in the P2P marketplace
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Type Toggle */}
        <div className="flex space-x-2">
          <Button
            variant={orderType === 'limit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOrderType('limit')}
            className="flex-1"
          >
            Limit Order
          </Button>
          <Button
            variant={orderType === 'market' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOrderType('market')}
            className="flex-1"
          >
            Market Order
          </Button>
        </div>

        {/* Price Input (only for limit orders) */}
        {orderType === 'limit' && (
          <div className="space-y-2">
            <Label htmlFor="price">Price (ETH)</Label>
            <Input
              id="price"
              type="number"
              placeholder="0.0000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.0001"
            />
          </div>
        )}

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount">Amount</Label>
            {side === 'sell' && (
              <span className="text-xs text-gray-500">
                Available: {tokenInfo.userBalance}
              </span>
            )}
          </div>
          <Input
            id="amount"
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="1"
          />
          {side === 'sell' && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount((tokenInfo.userBalance * 0.25).toString())}
              >
                25%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount((tokenInfo.userBalance * 0.5).toString())}
              >
                50%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount((tokenInfo.userBalance * 0.75).toString())}
              >
                75%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount(tokenInfo.userBalance.toString())}
              >
                Max
              </Button>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total</span>
            <span className="font-bold">{total} ETH</span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={onSubmit}
          disabled={loading || !amount || (orderType === 'limit' && !price) || !kycVerified}
          className={`w-full ${
            side === 'buy' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'
          } ${!kycVerified ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Order...
            </div>
          ) : !kycVerified ? (
            'KYC Verification Required'
          ) : (
            `${side === 'buy' ? 'Buy' : 'List for Sale'} ${tokenInfo.symbol}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

// Order Book Component
interface OrderBookProps {
  orderBook: { buys: Order[], sells: Order[] };
  currentPrice: number;
  onBuyFromOrder?: (order: Order) => void;
  onCancelOrder?: (orderId: string) => void;
  userWallet?: string;
  kycVerified?: boolean;
}

const OrderBook: React.FC<OrderBookProps> = ({ 
  orderBook, 
  currentPrice, 
  onBuyFromOrder, 
  onCancelOrder, 
  userWallet = '',
  kycVerified = false 
}) => {
  return (
    <div className="space-y-4">
      {/* Sell Orders (Asks) */}
      <div>
        <h4 className="text-sm font-medium text-red-600 mb-2">Sell Orders</h4>
        <div className="space-y-1">
          {orderBook.sells.slice(0, 8).map((order) => {
            const isOwnOrder = order.user.startsWith(userWallet.substring(0, 6));
            return (
              <div key={order.orderId} className="flex justify-between items-center text-xs bg-red-50 p-2 rounded">
                <div className="flex flex-col">
                  <span className="text-red-600 font-mono">{order.price.toFixed(4)} ETH</span>
                  <span className="text-gray-500 text-xs">{order.user}</span>
                </div>
                <span className="text-gray-600 font-medium">{order.amount}</span>
                <div className="flex flex-col items-end">
                  <span className="text-gray-900 font-medium">{order.total.toFixed(4)}</span>
                  {isOwnOrder ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-6 px-2 mt-1 border-red-300 text-red-600 hover:bg-red-100"
                      onClick={() => onCancelOrder?.(order.orderId)}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      className="text-xs h-6 px-2 mt-1 bg-green-600 hover:bg-green-700"
                      onClick={() => onBuyFromOrder?.(order)}
                      disabled={!kycVerified}
                    >
                      Buy
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {orderBook.sells.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No sell orders available
            </div>
          )}
        </div>
      </div>

      {/* Current Price */}
      <div className="py-2 px-3 bg-gray-100 rounded text-center">
        <span className="font-bold text-gray-900">{currentPrice.toFixed(4)} ETH</span>
      </div>

      {/* Buy Orders (Bids) */}
      <div>
        <h4 className="text-sm font-medium text-green-600 mb-2">Buy Orders</h4>
        <div className="space-y-1">
          {orderBook.buys.slice(0, 5).map((order) => (
            <div key={order.orderId} className="flex justify-between text-xs">
              <span className="text-green-600 font-mono">{order.price.toFixed(4)}</span>
              <span className="text-gray-600">{order.amount}</span>
              <span className="text-gray-500">{order.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SecondaryMarketplace;