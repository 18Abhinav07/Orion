import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { toast } from 'react-hot-toast';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Flame,
  CheckCircle,
  Search,
  Download,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { InvoiceFinancingService } from '../../../services/invoiceFinancingService';
import { useWallet } from '../../../context/WalletContext';
import TokenStatusCard from './TokenStatusCard';

interface PortfolioSummary {
  totalInvested: string;
  totalRealized: string;
  totalUnrealized: string;
  totalYieldEarned: string;
  averageYieldRate: number;
  activeTokens: number;
  settledTokens: number;
  burnedTokens: number;
}

interface SettlementRecord {
  tokenId: string;
  tokenName: string;
  invoiceNumber: string;
  settlementDate: string;
  investmentAmount: string;
  settlementAmount: string;
  yieldEarned: string;
  yieldRate: number;
  holdingPeriod: number; // days
  status: 'completed' | 'pending';
}

interface TokenHolding {
  tokenId: string;
  name: string;
  issuer: string;
  userBalance: string;
  totalSupply: string;
  pricePerToken: string;
  lifecycle: number;
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

const PortfolioSettlements: React.FC = () => {
  const { signer, isConnected, address } = useWallet();
  const [service, setService] = useState<InvoiceFinancingService | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSummary>({
    totalInvested: '0',
    totalRealized: '0',
    totalUnrealized: '0',
    totalYieldEarned: '0',
    averageYieldRate: 0,
    activeTokens: 0,
    settledTokens: 0,
    burnedTokens: 0
  });
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [filteredSettlements, setFilteredSettlements] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'settlements'>('overview');

  // Initialize service
  useEffect(() => {
    if (isConnected && signer && address) {
      const financingService = new InvoiceFinancingService(window.ethereum);
      financingService.connect().then(() => {
        setService(financingService);
        loadPortfolioData(financingService);
      }).catch(console.error);
    }
  }, [isConnected, signer, address]);

  const loadPortfolioData = async (serviceInstance: InvoiceFinancingService) => {
    try {
      setLoading(true);

      // Mock portfolio data
      const mockHoldings: TokenHolding[] = [
        {
          tokenId: '1',
          name: 'Invoice Token #1',
          issuer: '0x123...',
          userBalance: '100',
          totalSupply: '1000',
          pricePerToken: '100',
          lifecycle: 0,
          purchaseDate: '2024-10-15',
          purchasePrice: '95',
          currentValue: '100',
          invoiceInfo: {
            invoiceNumber: 'INV-2024-001',
            dueDate: '2024-12-31',
            originalAmount: '105000'
          },
          metadataURI: 'ipfs://...'
        },
        {
          tokenId: '2',
          name: 'Invoice Token #2',
          issuer: '0x456...',
          userBalance: '50',
          totalSupply: '500',
          pricePerToken: '200',
          lifecycle: 2,
          purchaseDate: '2024-10-01',
          purchasePrice: '190',
          currentValue: '0',
          settlementInfo: {
            settlementAmount: '52500',
            settlementDate: '2024-10-25',
            yieldEarned: '2500',
            yieldRate: 5.0
          },
          metadataURI: 'ipfs://...'
        }
      ];

      const mockSettlements: SettlementRecord[] = [
        {
          tokenId: '2',
          tokenName: 'Invoice Token #2',
          invoiceNumber: 'INV-2024-002',
          settlementDate: '2024-10-25',
          investmentAmount: '9500',
          settlementAmount: '10500',
          yieldEarned: '1000',
          yieldRate: 5.0,
          holdingPeriod: 24,
          status: 'completed'
        }
      ];

      setHoldings(mockHoldings);
      setSettlements(mockSettlements);
      setFilteredSettlements(mockSettlements);

      // Calculate portfolio summary
      const totalInvested = mockHoldings.reduce((sum, h) => 
        sum + (parseFloat(h.purchasePrice) * parseFloat(h.userBalance)), 0
      );
      
      const totalRealized = mockSettlements.reduce((sum, s) => 
        sum + parseFloat(s.settlementAmount), 0
      );

      const activeCount = mockHoldings.filter(h => h.lifecycle === 0).length;
      const settledCount = mockHoldings.filter(h => h.lifecycle === 1).length;
      const burnedCount = mockHoldings.filter(h => h.lifecycle === 2).length;

      const totalYield = mockSettlements.reduce((sum, s) => 
        sum + parseFloat(s.yieldEarned), 0
      );

      const avgYield = mockSettlements.length > 0 
        ? mockSettlements.reduce((sum, s) => sum + s.yieldRate, 0) / mockSettlements.length 
        : 0;

      setPortfolio({
        totalInvested: totalInvested.toString(),
        totalRealized: totalRealized.toString(),
        totalUnrealized: (totalInvested - totalRealized).toString(),
        totalYieldEarned: totalYield.toString(),
        averageYieldRate: avgYield,
        activeTokens: activeCount,
        settledTokens: settledCount,
        burnedTokens: burnedCount
      });

    } catch (error) {
      console.error('Failed to load portfolio data:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  // Filter settlements based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredSettlements(settlements);
    } else {
      const filtered = settlements.filter(settlement =>
        settlement.tokenName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        settlement.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        settlement.tokenId.includes(searchTerm)
      );
      setFilteredSettlements(filtered);
    }
  }, [searchTerm, settlements]);

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

  const calculateTotalReturn = () => {
    const invested = parseFloat(portfolio.totalInvested);
    const realized = parseFloat(portfolio.totalRealized);
    const unrealized = parseFloat(portfolio.totalUnrealized);
    
    if (invested === 0) return { amount: 0, percentage: 0 };
    
    const totalReturn = (realized - invested) + unrealized;
    const returnPercentage = (totalReturn / invested) * 100;
    
    return { amount: totalReturn, percentage: returnPercentage };
  };

  const totalReturn = calculateTotalReturn();

  const exportToCSV = () => {
    const csvData = filteredSettlements.map(settlement => ({
      'Token ID': settlement.tokenId,
      'Token Name': settlement.tokenName,
      'Invoice Number': settlement.invoiceNumber,
      'Settlement Date': settlement.settlementDate,
      'Investment (FLOW)': settlement.investmentAmount,
      'Settlement (FLOW)': settlement.settlementAmount,
      'Yield Earned (FLOW)': settlement.yieldEarned,
      'Yield Rate (%)': settlement.yieldRate,
      'Holding Period (Days)': settlement.holdingPeriod,
      'Status': settlement.status
    }));

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-settlements-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Portfolio data exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Invested</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(portfolio.totalInvested)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Realized</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(portfolio.totalRealized)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Return</p>
                <p className={`text-2xl font-bold ${
                  totalReturn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {totalReturn.amount >= 0 ? '+' : ''}{totalReturn.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Avg Yield</p>
                <p className="text-2xl font-bold text-orange-600">
                  {portfolio.averageYieldRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Status */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Status</CardTitle>
          <CardDescription>Overview of your invoice financing investments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{portfolio.activeTokens}</p>
              <p className="text-sm text-gray-600">Active Investments</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{portfolio.settledTokens}</p>
              <p className="text-sm text-gray-600">Settled</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-2">
                <Flame className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{portfolio.burnedTokens}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('holdings')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'holdings'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Current Holdings
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'settlements'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Settlement History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Investment Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Investments</span>
                  <span className="font-medium">{formatCurrency(portfolio.totalUnrealized)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed Settlements</span>
                  <span className="font-medium">{formatCurrency(portfolio.totalRealized)}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="font-medium">Total Portfolio Value</span>
                  <span className="font-bold">
                    {formatCurrency((parseFloat(portfolio.totalUnrealized) + parseFloat(portfolio.totalRealized)).toString())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Yield Earned</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(portfolio.totalYieldEarned)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Yield Rate</span>
                  <span className="font-medium">{portfolio.averageYieldRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="font-medium">Overall Return</span>
                  <span className={`font-bold ${
                    totalReturn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {totalReturn.amount >= 0 ? '+' : ''}{totalReturn.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'holdings' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : holdings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No token holdings found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {holdings.map((token) => (
                <TokenStatusCard
                  key={token.tokenId}
                  token={token}
                  onViewDetails={(token) => {
                    toast.success(`Viewing details for ${token.name}`);
                  }}
                  onTrade={(token) => {
                    toast.success(`Opening trade interface for ${token.name}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settlements' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Settlement History</CardTitle>
                <CardDescription>Your completed invoice settlements and payouts</CardDescription>
              </div>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search settlements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredSettlements.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No settlements found</p>
            ) : (
              <div className="space-y-4">
                {filteredSettlements.map((settlement) => (
                  <Card key={settlement.tokenId} className="border-l-4 border-l-green-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">{settlement.tokenName}</span>
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Settlement Date</p>
                              <p className="font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(settlement.settlementDate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Investment</p>
                              <p className="font-medium">{formatCurrency(settlement.investmentAmount)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Settlement</p>
                              <p className="font-medium">{formatCurrency(settlement.settlementAmount)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Yield Earned</p>
                              <p className="font-medium text-green-600">
                                {formatCurrency(settlement.yieldEarned)} ({settlement.yieldRate}%)
                              </p>
                            </div>
                          </div>

                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Holding Period:</span>
                              <span className="font-medium">{settlement.holdingPeriod} days</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            +{((parseFloat(settlement.yieldEarned) / parseFloat(settlement.investmentAmount)) * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-500">Return</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortfolioSettlements;