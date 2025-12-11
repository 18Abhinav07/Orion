import React, { useState } from 'react';
import { EscrowOrder } from '../utils/orderBookEscrowService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Trash2, Edit3, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface OrderManagementProps {
  userOrders: EscrowOrder[];
  onCancelOrder: (orderId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  loading: boolean;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({
  userOrders,
  onCancelOrder,
  onRefresh,
  loading
}) => {
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrder(orderId);
    try {
      await onCancelOrder(orderId);
      toast.success('Order cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    } finally {
      setCancellingOrder(null);
    }
  };

  const formatOrderType = (isBuyOrder: boolean) => {
    return isBuyOrder ? 'Buy Order' : 'Sell Order';
  };

  const formatOrderStatus = (order: EscrowOrder) => {
    if (order.filled) return 'Filled';
    if (order.cancelled) return 'Cancelled';
    return 'Active';
  };

  const getStatusColor = (order: EscrowOrder) => {
    if (order.filled) return 'bg-green-100 text-green-800';
    if (order.cancelled) return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>My Orders</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Manage your active and completed orders
        </p>
      </CardHeader>
      <CardContent>
        {userOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No orders found</p>
            <p className="text-sm text-gray-400 mt-1">
              Create your first order to start trading
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {userOrders.map((order) => (
              <div
                key={order.orderId}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={order.isBuyOrder ? "default" : "secondary"}
                        className={order.isBuyOrder ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
                      >
                        {formatOrderType(order.isBuyOrder)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={getStatusColor(order)}
                      >
                        {formatOrderStatus(order)}
                      </Badge>
                    </div>
                    <p className="font-medium">Order #{order.orderId}</p>
                    <p className="text-sm text-gray-600">
                      Token ID: {order.tokenId}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium">{order.amount} tokens</p>
                    <p className="text-sm text-gray-600">
                      {order.pricePerTokenU2U} Flow each
                    </p>
                    <p className="text-xs text-gray-500">
                      Total: {(parseFloat(order.amount) * parseFloat(order.pricePerTokenU2U)).toFixed(4)} Flow
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-gray-500">
                    Created: {new Date(parseInt(order.timestamp) * 1000).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2">
                    {!order.filled && !order.cancelled && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelOrder(order.orderId)}
                        disabled={cancellingOrder === order.orderId}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        {cancellingOrder === order.orderId ? 'Cancelling...' : 'Cancel'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Order Details */}
                <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                  <div className="flex justify-between">
                    <span>Maker:</span>
                    <span className="font-mono">{order.maker.slice(0, 6)}...{order.maker.slice(-4)}</span>
                  </div>
                  {order.filled && (
                    <div className="flex justify-between">
                      <span>Filled Amount:</span>
                      <span>{order.filledAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Remaining:</span>
                    <span>{order.remainingAmount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};