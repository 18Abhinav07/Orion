import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'react-hot-toast';
import { Activity, Clock, CheckCircle, Flame, DollarSign, Users, TrendingUp, Eye } from 'lucide-react';
import { InvoiceFinancingService } from '../../../services/invoiceFinancingService';
import { useWallet } from '../../../context/WalletContext';

interface TokenLifecycleData {
  tokenId: string;
  issuer: string;
  supply: string;
  price: string;
  lifecycle: number; // 0=Active, 1=Settled, 2=Burned
  settlementAmount?: string;
  settlementTimestamp?: string;
  holderCount: number;
  totalValueLocked: string;
  metadataURI: string;
}

interface LifecycleStats {
  activeTokens: number;
  settledTokens: number;
  burnedTokens: number;
  totalSettlementValue: string;
  averageSettlementTime: number;
}

const TokenLifecycleMonitor: React.FC = () => {
  const { signer, isConnected } = useWallet();
  const [service, setService] = useState<InvoiceFinancingService | null>(null);
  const [tokens, setTokens] = useState<TokenLifecycleData[]>([]);
  const [stats, setStats] = useState<LifecycleStats>({
    activeTokens: 0,
    settledTokens: 0,
    burnedTokens: 0,
    totalSettlementValue: '0',
    averageSettlementTime: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenLifecycleData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Initialize service
  useEffect(() => {
    if (isConnected && signer) {
      const financingService = new InvoiceFinancingService(window.ethereum);
      financingService.connect().then(() => {
        setService(financingService);
        loadTokenLifecycleData(financingService);
      }).catch(console.error);
    }
  }, [isConnected, signer]);

  const loadTokenLifecycleData = async (serviceInstance?: InvoiceFinancingService) => {
    try {
      setLoading(true);
      console.log('🔄 Loading real token lifecycle data...');
      
      if (!signer) {
        console.log('No signer available');
        return;
      }

      // Create direct contract instances
      const { ADMIN_CONTRACT, TOKEN_CONTRACT, MARKETPLACE_CONTRACT } = await import('../../../lib/contractAddress');
      const { CONTRACT_ABIS } = await import('../../../lib/contractAbis');
      const { ethers } = await import('ethers');

      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, CONTRACT_ABIS.MARKETPLACE, signer);
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT, CONTRACT_ABIS.ERC1155CORE, signer);
      
      // Get marketplace listings
      const marketplaceData = await marketplaceContract.getAllListings();
      const [tokenIds, issuers, amounts, prices] = marketplaceData;
      
      const loadedTokens: TokenLifecycleData[] = [];
      
      // Process each token
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i].toString();
        try {
          // Get basic token info
          const tokenInfo = await tokenContract.getTokenInfo(tokenId);
          const lifecycle = await tokenContract.getTokenLifecycleStatus(tokenId);
          
          // Get settlement info
          let settlementAmount = '0';
          let settlementTimestamp = '0';
          try {
            const amount = await tokenContract.settlementAmount(tokenId);
            const timestamp = await tokenContract.settlementTimestamp(tokenId);
            settlementAmount = amount.gt(0) ? ethers.utils.formatEther(amount) : '0';
            settlementTimestamp = timestamp.toString();
          } catch (settlementError) {
            console.warn(`Could not fetch settlement info for token ${tokenId}`);
          }
          
          // Get holder information (mock for now - would need marketplace contract methods)
          let holderCount = 0;
          let totalValueLocked = '0';
          
          try {
            // Try to get token holders if method exists
            const holders = await marketplaceContract.getTokenHolders(tokenId);
            holderCount = holders[0]?.length || 0;
            totalValueLocked = ethers.utils.formatEther(tokenInfo.price.mul(tokenInfo.supply));
          } catch (holderError) {
            console.warn(`Could not fetch holder info for token ${tokenId}`);
            // Estimate based on listing info
            totalValueLocked = ethers.utils.formatEther(tokenInfo.price.mul(tokenInfo.supply));
          }
          
          loadedTokens.push({
            tokenId: tokenId,
            issuer: tokenInfo.issuer,
            supply: tokenInfo.supply.toString(),
            price: ethers.utils.formatEther(tokenInfo.price),
            lifecycle: lifecycle,
            settlementAmount: settlementAmount,
            settlementTimestamp: settlementTimestamp,
            holderCount: holderCount,
            totalValueLocked: totalValueLocked,
            metadataURI: tokenInfo.metadataURI
          });
          
          console.log(`✅ Loaded lifecycle data for token ${tokenId}`);
        } catch (tokenError) {
          console.warn(`Could not load lifecycle data for token ${tokenId}:`, tokenError);
        }
      }
      
      setTokens(loadedTokens);
      console.log(`✅ Loaded ${loadedTokens.length} tokens for lifecycle monitoring`);
      
      // Calculate stats from real data
      const activeCount = loadedTokens.filter(t => t.lifecycle === 0).length;
      const settledCount = loadedTokens.filter(t => t.lifecycle === 1).length;
      const burnedCount = loadedTokens.filter(t => t.lifecycle === 2).length;
      
      const totalSettlement = loadedTokens
        .filter(t => t.settlementAmount && parseFloat(t.settlementAmount) > 0)
        .reduce((sum, t) => sum + parseFloat(t.settlementAmount!), 0);

      setStats({
        activeTokens: activeCount,
        settledTokens: settledCount,
        burnedTokens: burnedCount,
        totalSettlementValue: totalSettlement.toString(),
        averageSettlementTime: 2 // days - would be calculated from actual settlement timestamps
      });

    } catch (error) {
      console.error('Failed to load token lifecycle data:', error);
      toast.error('Failed to load token data');
    } finally {
      setLoading(false);
    }
  };

  const getLifecycleBadge = (lifecycle: number) => {
    switch (lifecycle) {
      case 0:
        return <Badge variant="default" className="bg-green-500"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
      case 1:
        return <Badge variant="secondary" className="bg-yellow-500"><CheckCircle className="w-3 h-3 mr-1" />Settled</Badge>;
      case 2:
        return <Badge variant="destructive"><Flame className="w-3 h-3 mr-1" />Burned</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatCurrency = (amount: string) => {
    return `${parseFloat(amount).toLocaleString()} FLOW`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(parseInt(timestamp)).toLocaleDateString();
  };

  const getLifecycleProgress = (lifecycle: number) => {
    const stages = ['Active', 'Settled', 'Burned'];
    return stages.slice(0, lifecycle + 1);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Active Tokens</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeTokens}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Settled</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.settledTokens}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Flame className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Burned</p>
                <p className="text-2xl font-bold text-red-600">{stats.burnedTokens}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Settled</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(stats.totalSettlementValue)}
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
                <p className="text-sm font-medium text-gray-600">Avg Settlement</p>
                <p className="text-2xl font-bold text-purple-600">{stats.averageSettlementTime}d</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Lifecycle Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Token Lifecycle Monitor
          </CardTitle>
          <CardDescription>
            Track the complete lifecycle of all tokens from active to settlement to burning
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tokens found</p>
              ) : (
                tokens.map((token) => (
                  <Card key={token.tokenId} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">Token #{token.tokenId}</span>
                            {getLifecycleBadge(token.lifecycle)}
                          </div>
                          
                          {/* Lifecycle Progress */}
                          <div className="flex items-center gap-2">
                            {getLifecycleProgress(token.lifecycle).map((stage, index) => (
                              <div key={stage} className="flex items-center gap-2">
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  index <= token.lifecycle 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {stage}
                                </div>
                                {index < 2 && (
                                  <div className={`w-4 h-0.5 ${
                                    index < token.lifecycle ? 'bg-green-500' : 'bg-gray-300'
                                  }`} />
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Issuer</p>
                              <p className="font-medium">{token.issuer.slice(0, 10)}...</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Supply</p>
                              <p className="font-medium">{token.supply} tokens</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Price</p>
                              <p className="font-medium">{formatCurrency(token.price)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Holders</p>
                              <p className="font-medium flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {token.holderCount}
                              </p>
                            </div>
                          </div>

                          {token.settlementAmount && (
                            <div className="bg-yellow-50 p-3 rounded-lg">
                              <p className="text-sm">
                                <strong>Settlement:</strong> {formatCurrency(token.settlementAmount)}
                                {token.settlementTimestamp && (
                                  <span className="ml-2 text-gray-600">
                                    on {formatDate(token.settlementTimestamp)}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedToken(token);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Details Modal */}
      {selectedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle>Token #{selectedToken.tokenId} Details</CardTitle>
              <CardDescription>Complete lifecycle information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Token ID</p>
                  <p className="font-medium">{selectedToken.tokenId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  {getLifecycleBadge(selectedToken.lifecycle)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Issuer</p>
                  <p className="font-medium font-mono text-xs">{selectedToken.issuer}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Supply</p>
                  <p className="font-medium">{selectedToken.supply} tokens</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Price per Token</p>
                  <p className="font-medium">{formatCurrency(selectedToken.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Holders</p>
                  <p className="font-medium">{selectedToken.holderCount}</p>
                </div>
              </div>

              {selectedToken.settlementAmount && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Settlement Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Settlement Amount</p>
                      <p className="font-medium">{formatCurrency(selectedToken.settlementAmount)}</p>
                    </div>
                    {selectedToken.settlementTimestamp && (
                      <div>
                        <p className="text-sm text-gray-600">Settlement Date</p>
                        <p className="font-medium">{formatDate(selectedToken.settlementTimestamp)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TokenLifecycleMonitor;