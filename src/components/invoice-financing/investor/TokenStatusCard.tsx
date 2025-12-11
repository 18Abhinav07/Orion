import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'react-hot-toast';
import { 
  Clock, 
  CheckCircle, 
  Flame, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  Eye,
  ArrowUpRight,
  AlertCircle,
  Coins
} from 'lucide-react';

interface TokenData {
  tokenId: string;
  name: string;
  issuer: string;
  userBalance: string;
  totalSupply: string;
  pricePerToken: string;
  lifecycle: number; // 0=Active, 1=Settled, 2=Burned
  purchaseDate: string;
  purchasePrice: string;
  currentValue: string;
  settlementInfo?: {
    settlementAmount: string;
    settlementDate: string;
    yieldEarned: string;
    yieldRate: number;
  };
  invoiceInfo?: {
    invoiceNumber: string;
    dueDate: string;
    originalAmount: string;
  };
  metadataURI: string;
  imageUrl?: string;
}

interface TokenStatusCardProps {
  token: TokenData;
  onViewDetails?: (token: TokenData) => void;
  onTrade?: (token: TokenData) => void;
  compact?: boolean;
}

const TokenStatusCard: React.FC<TokenStatusCardProps> = ({ 
  token, 
  onViewDetails, 
  onTrade, 
  compact = false 
}) => {
  const [loading, setLoading] = useState(false);

  const getLifecycleBadge = (lifecycle: number) => {
    switch (lifecycle) {
      case 0:
        return (
          <Badge variant="default" className="bg-green-500">
            <Clock className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 1:
        return (
          <Badge variant="secondary" className="bg-yellow-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Settled
          </Badge>
        );
      case 2:
        return (
          <Badge variant="destructive">
            <Flame className="w-3 h-3 mr-1" />
            Burned
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  const getLifecycleColor = (lifecycle: number) => {
    switch (lifecycle) {
      case 0: return 'border-l-green-500';
      case 1: return 'border-l-yellow-500';
      case 2: return 'border-l-red-500';
      default: return 'border-l-gray-400';
    }
  };

  const formatCurrency = (amount: string) => {
    return `${parseFloat(amount).toLocaleString()} FLOW`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateProfitLoss = () => {
    const purchaseValue = parseFloat(token.purchasePrice) * parseFloat(token.userBalance);
    let currentValue = 0;

    if (token.lifecycle === 2 && token.settlementInfo) {
      // Token is burned, use settlement amount
      const userPercentage = parseFloat(token.userBalance) / parseFloat(token.totalSupply);
      currentValue = parseFloat(token.settlementInfo.settlementAmount) * userPercentage;
    } else if (token.lifecycle === 0) {
      // Token is active, use current market value
      currentValue = parseFloat(token.currentValue) * parseFloat(token.userBalance);
    } else {
      // Token is settled but not burned yet
      currentValue = parseFloat(token.currentValue) * parseFloat(token.userBalance);
    }

    const profitLoss = currentValue - purchaseValue;
    const profitLossPercentage = (profitLoss / purchaseValue) * 100;

    return {
      amount: profitLoss,
      percentage: profitLossPercentage,
      isProfit: profitLoss >= 0
    };
  };

  const profitLoss = calculateProfitLoss();

  if (compact) {
    return (
      <Card className={`border-l-4 ${getLifecycleColor(token.lifecycle)} hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{token.name || `Token #${token.tokenId}`}</span>
                {getLifecycleBadge(token.lifecycle)}
              </div>
              <div className="text-sm text-gray-600">
                <p>Balance: {token.userBalance} tokens</p>
                <p>Value: {formatCurrency(token.currentValue)}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${
                profitLoss.isProfit ? 'text-green-600' : 'text-red-600'
              }`}>
                {profitLoss.isProfit ? '+' : ''}{profitLoss.percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {profitLoss.isProfit ? '+' : ''}{formatCurrency(profitLoss.amount.toString())}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 ${getLifecycleColor(token.lifecycle)} hover:shadow-lg transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{token.name || `Token #${token.tokenId}`}</CardTitle>
            <CardDescription>
              {token.invoiceInfo?.invoiceNumber || `Issued by ${token.issuer.slice(0, 10)}...`}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getLifecycleBadge(token.lifecycle)}
            {token.imageUrl && (
              <img 
                src={token.imageUrl} 
                alt={token.name}
                className="w-12 h-12 rounded object-cover"
              />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Holdings Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Your Holdings</p>
            <p className="text-lg font-semibold flex items-center gap-1">
              <Coins className="w-4 h-4" />
              {token.userBalance} tokens
            </p>
            <p className="text-xs text-gray-500">
              {((parseFloat(token.userBalance) / parseFloat(token.totalSupply)) * 100).toFixed(1)}% of supply
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Value</p>
            <p className="text-lg font-semibold">{formatCurrency(token.currentValue)}</p>
            <p className="text-xs text-gray-500">per token</p>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Performance</p>
              <p className="text-xs text-gray-500">
                Purchased: {formatDate(token.purchaseDate)} at {formatCurrency(token.purchasePrice)}
              </p>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${
                profitLoss.isProfit ? 'text-green-600' : 'text-red-600'
              }`}>
                {profitLoss.isProfit ? '+' : ''}{profitLoss.percentage.toFixed(1)}%
              </p>
              <p className={`text-sm ${
                profitLoss.isProfit ? 'text-green-600' : 'text-red-600'
              }`}>
                {profitLoss.isProfit ? '+' : ''}{formatCurrency(profitLoss.amount.toString())}
              </p>
            </div>
          </div>
        </div>

        {/* Settlement Information */}
        {token.settlementInfo && (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">Settlement Completed</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Settlement Date</p>
                <p className="font-medium">{formatDate(token.settlementInfo.settlementDate)}</p>
              </div>
              <div>
                <p className="text-gray-600">Your Payout</p>
                <p className="font-medium text-green-600">
                  {formatCurrency(token.settlementInfo.yieldEarned)}
                </p>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Yield Rate: {token.settlementInfo.yieldRate}% • 
              Total Settlement: {formatCurrency(token.settlementInfo.settlementAmount)}
            </div>
          </div>
        )}

        {/* Invoice Information */}
        {token.invoiceInfo && token.lifecycle === 0 && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Invoice Details</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Invoice Number</p>
                <p className="font-medium">{token.invoiceInfo.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-gray-600">Due Date</p>
                <p className="font-medium">{formatDate(token.invoiceInfo.dueDate)}</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Original Amount: {formatCurrency(token.invoiceInfo.originalAmount)}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(token)}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              Details
            </Button>
          )}
          
          {token.lifecycle === 0 && onTrade && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onTrade(token)}
              className="flex-1"
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Trade
            </Button>
          )}

          {token.lifecycle === 2 && (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex-1"
            >
              <Flame className="w-4 h-4 mr-2" />
              Burned
            </Button>
          )}
        </div>

        {/* Status Message */}
        {token.lifecycle === 0 && (
          <div className="text-xs text-gray-500 text-center">
            🔄 Active token - can be traded on marketplace
          </div>
        )}
        {token.lifecycle === 1 && (
          <div className="text-xs text-orange-600 text-center">
            ⏳ Invoice settled - tokens will be burned soon
          </div>
        )}
        {token.lifecycle === 2 && (
          <div className="text-xs text-red-600 text-center">
            🔥 Token burned - settlement completed
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenStatusCard;