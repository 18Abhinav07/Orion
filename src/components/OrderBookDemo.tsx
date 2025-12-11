import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { EscrowOrder } from '../utils/orderBookEscrowService';
import { TokenService } from '../utils/tokenService';
import { ORDER_BOOK_ESCROW_CONTRACT } from '../lib/contractAddress';
import { useOrderBook } from '../hooks/useOrderBook';
import { OrderManagement } from './OrderManagement';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Wallet, Coins } from 'lucide-react';

interface OrderBookDemoProps {
  tokenId: string;
  tokenName: string;
}

export const OrderBookDemo: React.FC<OrderBookDemoProps> = ({ tokenId, tokenName }) => {
  const { address, provider, signer } = useWallet();
  
  // Use the custom hook for order book functionality
  const {
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
  } = useOrderBook(tokenId);

  // Form states
  const [sellAmount, setSellAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  // Balance states
  const [userTokenBalance, setUserTokenBalance] = useState<number>(0);
  const [userU2UBalance, setUserU2UBalance] = useState<string>('0');
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Fetch user balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!provider || !address) return;

      try {
        setBalanceLoading(true);
        const tokenService = new TokenService(provider, signer);
        
        // Fetch token balance
        const tokenBalance = await tokenService.getTokenBalance(tokenId, address);
        setUserTokenBalance(tokenBalance);
        
        // Fetch U2U balance
        const u2uBalance = await tokenService.getU2UBalance(address);
        setUserU2UBalance(u2uBalance);
      } catch (error) {
        console.error('Error fetching balances:', error);
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalances();
    
    // Refresh balances when order book data changes
    const interval = setInterval(fetchBalances, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [provider, signer, address, tokenId, orderBookData]);

  const handleApprove = async () => {
    try {
      toast.info('Approval transaction submitted...');
      await approveContract();
      toast.success('OrderBook contract approved!');
    } catch (error) {
      console.error('Error approving contract:', error);
      toast.error('Failed to approve contract');
    }
  };

  const handleCreateSellOrder = async () => {
    if (!sellAmount || !sellPrice) {
      toast.error('Please enter both amount and price');
      return;
    }
    
    const amountNum = parseInt(sellAmount);
    const priceNum = parseFloat(sellPrice);
    
    // Validate seller has sufficient tokens
    if (amountNum > userTokenBalance) {
      toast.error(`Insufficient token balance. You have ${userTokenBalance} tokens, but trying to sell ${amountNum}`);
      return;
    }
    
    if (amountNum <= 0 || priceNum <= 0) {
      toast.error('Amount and price must be greater than 0');
      return;
    }
    
    try {
      toast.info('Creating sell order...');
      await createSellOrder(tokenId, amountNum, sellPrice);
      toast.success(`Sell order created: ${amountNum} tokens at ${priceNum} U2U each`);
      setSellAmount('');
      setSellPrice('');
    } catch (error) {
      console.error('❌ Error creating sell order:', error);
      toast.error('Failed to create sell order - Please check console for details');
    }
  };

  const handleCreateBuyOrder = async () => {
    if (!buyAmount || !buyPrice) {
      toast.error('Please enter both amount and price');
      return;
    }
    
    const amountNum = parseInt(buyAmount);
    const priceNum = parseFloat(buyPrice);
    const totalCost = amountNum * priceNum;
    const userU2UNum = parseFloat(userU2UBalance);
    
    // Validate buyer has sufficient U2U tokens
    if (totalCost > userU2UNum) {
      toast.error(`Insufficient U2U balance. You need ${totalCost.toFixed(4)} U2U but have ${userU2UNum.toFixed(4)} U2U`);
      return;
    }
    
    if (amountNum <= 0 || priceNum <= 0) {
      toast.error('Amount and price must be greater than 0');
      return;
    }
    
    try {
      toast.info('Creating buy order...');
      await createBuyOrder(tokenId, amountNum, buyPrice);
      toast.success(`Buy order created: ${amountNum} tokens at ${priceNum} U2U each (Total: ${totalCost.toFixed(4)} U2U)`);
      setBuyAmount('');
      setBuyPrice('');
    } catch (error) {
      console.error('Error creating buy order:', error);
      toast.error('Failed to create sell order');
    }
  };

  const handleFillOrder = async (order: EscrowOrder, amountToFill: number) => {
    try {
      toast.info('Fill order transaction submitted...');
      await fillOrder(order.orderId, amountToFill, order);
      toast.success('Order filled successfully!');
    } catch (error) {
      console.error('Error filling order:', error);
      toast.error('Failed to fill order');
    }
  };

  // Check if user has sufficient balance for order
  const getBalanceValidation = (type: 'sell' | 'buy', amount: string, price: string) => {
    if (!amount || !price) return { isValid: true, message: '' };
    
    const amountNum = parseInt(amount);
    const priceNum = parseFloat(price);
    
    if (type === 'sell') {
      const isValid = amountNum <= userTokenBalance;
      return {
        isValid,
        message: isValid ? '' : `Insufficient tokens. You have ${userTokenBalance} tokens.`
      };
    } else {
      const totalCost = amountNum * priceNum;
      const userU2UNum = parseFloat(userU2UBalance);
      const isValid = totalCost <= userU2UNum;
      return {
        isValid,
        message: isValid ? '' : `Insufficient U2U. Need ${totalCost.toFixed(4)} U2U, have ${userU2UNum.toFixed(4)} U2U.`
      };
    }
  };

  const sellValidation = getBalanceValidation('sell', sellAmount, sellPrice);
  const buyValidation = getBalanceValidation('buy', buyAmount, buyPrice);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>OrderBook Demo - {tokenName}</CardTitle>
              <p className="text-sm text-gray-400">Permissionless P2P Trading with Escrow</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshOrderBook}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {error}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!isApproved && (
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                You need to approve the OrderBook contract to trade your tokens.
              </p>
              <Button onClick={handleApprove} disabled={loading}>
                {loading ? 'Approving...' : 'Approve OrderBook Contract'}
              </Button>
            </div>
          )}

          <Tabs defaultValue="orders" className="w-full">
            <TabsList>
              <TabsTrigger value="orders">View Orders</TabsTrigger>
              <TabsTrigger value="create">Create Orders</TabsTrigger>
              <TabsTrigger value="manage">My Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              {/* Order Book Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 bg-gray-900 border-gray-800">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm text-gray-400">Best Ask</p>
                      <p className="font-medium text-white">
                        {orderBookData?.sellOrders[0]?.pricePerTokenU2U || 'N/A'} U2U
                      </p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-gray-900 border-gray-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-400">Best Bid</p>
                      <p className="font-medium text-white">
                        {orderBookData?.buyOrders[0]?.pricePerTokenU2U || 'N/A'} U2U
                      </p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-gray-900 border-gray-800">
                  <div>
                    <p className="text-sm text-gray-400">Total Asks</p>
                    <p className="font-medium text-white">{orderBookData?.sellOrders.length || 0}</p>
                  </div>
                </Card>
                <Card className="p-4 bg-gray-900 border-gray-800">
                  <div>
                    <p className="text-sm text-gray-400">Total Bids</p>
                    <p className="font-medium text-white">{orderBookData?.buyOrders.length || 0}</p>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sell Orders (Asks) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      Sell Orders (Asks)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderBookData?.sellOrders.length === 0 ? (
                      <p className="text-gray-500">No sell orders</p>
                    ) : (
                      <div className="space-y-2">
                        {orderBookData?.sellOrders.map((order) => (
                          <div key={order.orderId} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{order.amount} tokens</p>
                                <p className="text-sm text-gray-400">{order.pricePerTokenU2U} U2U each</p>
                              </div>
                              {order.maker !== address && (
                                <Button
                                  size="sm"
                                  onClick={() => handleFillOrder(order, order.amount)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Buy
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Buy Orders (Bids) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Buy Orders (Bids)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderBookData?.buyOrders.length === 0 ? (
                      <p className="text-gray-500">No buy orders</p>
                    ) : (
                      <div className="space-y-2">
                        {orderBookData?.buyOrders.map((order) => (
                          <div key={order.orderId} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{order.amount} tokens</p>
                                <p className="text-sm text-gray-400">{order.pricePerTokenU2U} U2U each</p>
                              </div>
                              {order.maker !== address && (
                                <Button
                                  size="sm"
                                  onClick={() => handleFillOrder(order, order.amount)}
                                  disabled={loading}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Sell
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              {/* Balance Display */}
              <Card className="mb-4 bg-gray-900 border-gray-800">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-900/20 rounded-lg">
                      <Coins className="h-6 w-6 text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-400">Your Token Balance</p>
                        <p className="font-bold text-blue-400">
                          {balanceLoading ? '...' : userTokenBalance} {tokenName.split(' ')[0]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-900/20 rounded-lg">
                      <Wallet className="h-6 w-6 text-green-400" />
                      <div>
                        <p className="text-sm text-gray-400">Your U2U Balance</p>
                        <p className="font-bold text-green-400">
                          {balanceLoading ? '...' : parseFloat(userU2UBalance).toFixed(4)} U2U
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Create Sell Order */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create Sell Order</CardTitle>
                    <p className="text-sm text-gray-400">Tokens will be escrowed until filled</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="sellAmount">Amount</Label>
                      <Input
                        id="sellAmount"
                        type="number"
                        value={sellAmount}
                        onChange={(e) => setSellAmount(e.target.value)}
                        placeholder="Number of tokens"
                        className={!sellValidation.isValid ? 'border-red-300' : ''}
                      />
                      {sellAmount && sellPrice && !sellValidation.isValid && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          {sellValidation.message}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="sellPrice">Price per Token (U2U)</Label>
                      <Input
                        id="sellPrice"
                        type="number"
                        step="0.01"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                        placeholder="Price in U2U"
                      />
                      {sellAmount && sellPrice && (
                        <p className="text-sm text-gray-400 mt-1">
                          Total: {(parseInt(sellAmount || '0') * parseFloat(sellPrice || '0')).toFixed(4)} U2U
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleCreateSellOrder}
                      disabled={loading || !isApproved || !sellAmount || !sellPrice || !sellValidation.isValid}
                      className="w-full"
                    >
                      {loading ? 'Creating...' : 'Create Sell Order'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Create Buy Order */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create Buy Order</CardTitle>
                    <p className="text-sm text-gray-400">U2U payment will be escrowed until filled</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="buyAmount">Amount</Label>
                      <Input
                        id="buyAmount"
                        type="number"
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(e.target.value)}
                        placeholder="Number of tokens"
                        className={!buyValidation.isValid ? 'border-red-300' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="buyPrice">Price per Token (U2U)</Label>
                      <Input
                        id="buyPrice"
                        type="number"
                        step="0.01"
                        value={buyPrice}
                        onChange={(e) => setBuyPrice(e.target.value)}
                        placeholder="Price in U2U"
                        className={!buyValidation.isValid ? 'border-red-300' : ''}
                      />
                    </div>
                    {buyAmount && buyPrice && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-400">
                          Total Cost: {(parseFloat(buyAmount || '0') * parseFloat(buyPrice || '0')).toFixed(4)} U2U
                        </p>
                        {!buyValidation.isValid && (
                          <div className="flex items-center gap-1 text-sm text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            {buyValidation.message}
                          </div>
                        )}
                      </div>
                    )}
                    <Button
                      onClick={handleCreateBuyOrder}
                      disabled={loading || !isApproved || !buyAmount || !buyPrice || !buyValidation.isValid}
                      className="w-full"
                    >
                      {loading ? 'Creating...' : 'Create Buy Order'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="manage" className="space-y-4">
              <OrderManagement
                userOrders={userOrders}
                onCancelOrder={cancelOrder}
                onRefresh={refreshOrderBook}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};