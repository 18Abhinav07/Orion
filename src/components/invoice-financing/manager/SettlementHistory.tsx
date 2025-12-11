import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { toast } from 'react-hot-toast';
import { History, DollarSign, Calendar, Users, Search, Download, Flame, CheckCircle } from 'lucide-react';
import { InvoiceFinancingService } from '../../../services/invoiceFinancingService';
import { useWallet } from '../../../context/WalletContext';

interface SettlementRecord {
  id: string;
  tokenId: string;
  invoiceNumber: string;
  settlementDate: string;
  totalAmount: string;
  principalAmount: string;
  yieldAmount: string;
  yieldRate: number;
  holderCount: number;
  status: 'completed' | 'pending' | 'failed';
  transactionHash: string;
  notes?: string;
  holderDistribution: {
    address: string;
    amount: string;
    percentage: number;
  }[];
}

interface PerformanceMetrics {
  totalSettlements: number;
  totalValueProcessed: string;
  averageYieldRate: number;
  averageProcessingTime: number;
  successRate: number;
}

const SettlementHistory: React.FC = () => {
  const { signer, isConnected, address } = useWallet();
  const [service, setService] = useState<InvoiceFinancingService | null>(null);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [filteredSettlements, setFilteredSettlements] = useState<SettlementRecord[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalSettlements: 0,
    totalValueProcessed: '0',
    averageYieldRate: 0,
    averageProcessingTime: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<SettlementRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Initialize service
  useEffect(() => {
    if (isConnected && signer && address) {
      const financingService = new InvoiceFinancingService(window.ethereum);
      financingService.connect().then(() => {
        setService(financingService);
        loadSettlementHistory(financingService);
      }).catch(console.error);
    }
  }, [isConnected, signer, address]);

  const loadSettlementHistory = async (serviceInstance: InvoiceFinancingService) => {
    try {
      setLoading(true);
      console.log('🔄 Loading real settlement history from blockchain...');
      
      if (!signer || !address) {
        console.log('No signer or address available');
        return;
      }

      // Import contract addresses and ABIs
      const { ADMIN_CONTRACT, TOKEN_CONTRACT, MARKETPLACE_CONTRACT, PAYMENT_SPLITTER_CONTRACT } = await import('../../../lib/contractAddress');
      const { CONTRACT_ABIS } = await import('../../../lib/contractAbis');
      const { ethers } = await import('ethers');

      const adminContract = new ethers.Contract(ADMIN_CONTRACT, CONTRACT_ABIS.ADMIN, signer);
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT, CONTRACT_ABIS.ERC1155CORE, signer);
      const paymentSplitterContract = new ethers.Contract(PAYMENT_SPLITTER_CONTRACT, CONTRACT_ABIS.PAYMENTSPLITTER, signer);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, CONTRACT_ABIS.MARKETPLACE, signer);

      // Check if user is authorized manager
      const managersData = await adminContract.getAllManagers();
      const isManager = managersData.some((managerAddr: string) => 
        managerAddr.toLowerCase() === address.toLowerCase()
      );
      
      if (!isManager) {
        console.log('❌ User is not an authorized manager');
        setSettlements([]);
        setFilteredSettlements([]);
        return;
      }

      // Get manager's assigned tokens
      const assignedTokenIds = await adminContract.getManagerTokens(address);
      const tokenIdStrings = assignedTokenIds.map((id: ethers.BigNumber) => id.toString());
      
      console.log('📋 Manager assigned tokens:', tokenIdStrings);

      if (tokenIdStrings.length === 0) {
        console.log('ℹ️ No tokens assigned to this manager');
        setSettlements([]);
        setFilteredSettlements([]);
        return;
      }

      // Get RentalDistributed events for assigned tokens
      const settlementHistory: SettlementRecord[] = [];
      
      for (const tokenId of tokenIdStrings) {
        try {
          console.log(`🔍 Fetching settlement events for token ${tokenId}...`);
          
          // Get token lifecycle and info
          const tokenInfo = await tokenContract.getTokenInfo(tokenId);
          const lifecycle = await tokenContract.getTokenLifecycleStatus(tokenId);
          
          // Fetch RentalDistributed events for this token
          const filter = paymentSplitterContract.filters.RentalDistributed(tokenId);
          const events = await paymentSplitterContract.queryFilter(filter, 0, 'latest');
          
          console.log(`📊 Found ${events.length} rental events for token ${tokenId}`);

          // Process each settlement event
          for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const { totalAmount, toHolders, toPlatform } = event.args;
            
            // Get block timestamp
            const block = await signer.provider.getBlock(event.blockNumber);
            const settlementDate = new Date(block.timestamp * 1000).toISOString().split('T')[0];
            
            // Get token holders at the time of settlement
            let holderDistribution = [];
            let holderCount = 0;
            
            try {
              const holdersData = await marketplaceContract.getTokenHolders(tokenId);
              const [holders, amounts] = holdersData;
              
              holderCount = holders.length;
              const totalHolderAmount = ethers.utils.formatEther(toHolders);
              
              holderDistribution = holders.map((holderAddr: string, index: number) => {
                const holderAmount = parseFloat(ethers.utils.formatEther(amounts[index]));
                const totalSupply = parseFloat(tokenInfo.supply.toString());
                const percentage = (holderAmount / totalSupply) * 100;
                const distributedAmount = (percentage / 100) * parseFloat(totalHolderAmount);
                
                return {
                  address: `${holderAddr.slice(0, 6)}...${holderAddr.slice(-4)}`,
                  amount: distributedAmount.toFixed(6),
                  percentage: Math.round(percentage * 100) / 100
                };
              });
            } catch (holderError) {
              console.warn(`⚠️ Could not fetch holders for token ${tokenId}:`, holderError);
              holderCount = 1;
              holderDistribution = [{
                address: `${tokenInfo.issuer.slice(0, 6)}...${tokenInfo.issuer.slice(-4)}`,
                amount: ethers.utils.formatEther(toHolders),
                percentage: 100
              }];
            }

            // Calculate yield rate (approximate)
            const principalValue = parseFloat(ethers.utils.formatEther(tokenInfo.price.mul(tokenInfo.supply)));
            const yieldAmount = parseFloat(ethers.utils.formatEther(toHolders));
            const yieldRate = principalValue > 0 ? (yieldAmount / principalValue) * 100 : 0;

            // Fetch asset name from metadata
            let assetName = `Asset #${tokenId}`;
            if (tokenInfo.metadataURI && tokenInfo.metadataURI.length > 0) {
              try {
                let fetchURL = tokenInfo.metadataURI;
                if (tokenInfo.metadataURI.startsWith('ipfs://')) {
                  const ipfsHash = tokenInfo.metadataURI.replace('ipfs://', '');
                  fetchURL = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
                } else if (tokenInfo.metadataURI.startsWith('Qm')) {
                  fetchURL = `https://gateway.pinata.cloud/ipfs/${tokenInfo.metadataURI}`;
                }
                
                const metadataResponse = await fetch(fetchURL);
                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json();
                  assetName = metadata?.name || metadata?.title || assetName;
                }
              } catch (metadataError) {
                console.warn(`⚠️ Could not fetch metadata for token ${tokenId}:`, metadataError);
              }
            }

            const settlement: SettlementRecord = {
              id: `${tokenId}-${i}`,
              tokenId: tokenId,
              invoiceNumber: `${assetName.replace(/\s+/g, '-').toUpperCase()}-${tokenId}`,
              settlementDate: settlementDate,
              totalAmount: ethers.utils.formatEther(totalAmount),
              principalAmount: ethers.utils.formatEther(totalAmount.sub(toHolders.sub(toPlatform))),
              yieldAmount: ethers.utils.formatEther(toHolders),
              yieldRate: Math.round(yieldRate * 100) / 100,
              holderCount: holderCount,
              status: 'completed' as const,
              transactionHash: event.transactionHash,
              notes: `Yield distribution for ${assetName}`,
              holderDistribution: holderDistribution
            };

            settlementHistory.push(settlement);
          }

          // If token has no settlement events yet but is active, show it as pending
          if (events.length === 0 && lifecycle === 0) {
            let assetName = `Asset #${tokenId}`;
            if (tokenInfo.metadataURI && tokenInfo.metadataURI.length > 0) {
              try {
                let fetchURL = tokenInfo.metadataURI;
                if (tokenInfo.metadataURI.startsWith('ipfs://')) {
                  const ipfsHash = tokenInfo.metadataURI.replace('ipfs://', '');
                  fetchURL = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
                } else if (tokenInfo.metadataURI.startsWith('Qm')) {
                  fetchURL = `https://gateway.pinata.cloud/ipfs/${tokenInfo.metadataURI}`;
                }
                
                const metadataResponse = await fetch(fetchURL);
                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json();
                  assetName = metadata?.name || metadata?.title || assetName;
                }
              } catch (metadataError) {
                console.warn(`⚠️ Could not fetch metadata for token ${tokenId}:`, metadataError);
              }
            }

            const pendingSettlement: SettlementRecord = {
              id: `${tokenId}-pending`,
              tokenId: tokenId,
              invoiceNumber: `${assetName.replace(/\s+/g, '-').toUpperCase()}-${tokenId}`,
              settlementDate: new Date().toISOString().split('T')[0],
              totalAmount: '0',
              principalAmount: ethers.utils.formatEther(tokenInfo.price.mul(tokenInfo.supply)),
              yieldAmount: '0',
              yieldRate: 0,
              holderCount: 0,
              status: 'pending' as const,
              transactionHash: '',
              notes: `Awaiting first yield distribution for ${assetName}`,
              holderDistribution: []
            };

            settlementHistory.push(pendingSettlement);
          }

        } catch (tokenError) {
          console.error(`❌ Error processing token ${tokenId}:`, tokenError);
        }
      }

      // Sort by settlement date (most recent first)
      settlementHistory.sort((a, b) => new Date(b.settlementDate).getTime() - new Date(a.settlementDate).getTime());

      console.log(`✅ Loaded ${settlementHistory.length} settlement records`);
      setSettlements(settlementHistory);
      setFilteredSettlements(settlementHistory);

      // Calculate real metrics
      const completedSettlements = settlementHistory.filter(s => s.status === 'completed');
      const totalValue = completedSettlements.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
      const avgYield = completedSettlements.length > 0 
        ? completedSettlements.reduce((sum, s) => sum + s.yieldRate, 0) / completedSettlements.length 
        : 0;
      const successRate = settlementHistory.length > 0 
        ? (completedSettlements.length / settlementHistory.length) * 100 
        : 0;

      setMetrics({
        totalSettlements: settlementHistory.length,
        totalValueProcessed: totalValue.toString(),
        averageYieldRate: Math.round(avgYield * 100) / 100,
        averageProcessingTime: 1, // Real-time processing
        successRate: Math.round(successRate * 100) / 100
      });

    } catch (error) {
      console.error('Failed to load settlement history:', error);
      toast.error('Failed to load settlement history from blockchain');
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
        settlement.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        settlement.tokenId.includes(searchTerm) ||
        settlement.transactionHash.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSettlements(filtered);
    }
  }, [searchTerm, settlements]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const exportToCSV = () => {
    const csvData = filteredSettlements.map(settlement => ({
      'Token ID': settlement.tokenId,
      'Invoice Number': settlement.invoiceNumber,
      'Settlement Date': settlement.settlementDate,
      'Total Amount (FLOW)': settlement.totalAmount,
      'Principal (FLOW)': settlement.principalAmount,
      'Yield (FLOW)': settlement.yieldAmount,
      'Yield Rate (%)': settlement.yieldRate,
      'Holder Count': settlement.holderCount,
      'Status': settlement.status,
      'Transaction Hash': settlement.transactionHash
    }));

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settlement-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Settlement history exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <History className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Settlements</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalSettlements}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Processed</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(metrics.totalValueProcessed)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Avg Yield Rate</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.averageYieldRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Avg Processing</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.averageProcessingTime}d</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{metrics.successRate.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settlement History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Settlement History
              </CardTitle>
              <CardDescription>
                Complete history of processed invoice settlements
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice number, token ID, or transaction hash..."
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
                <Card key={settlement.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">{settlement.invoiceNumber}</span>
                          {getStatusBadge(settlement.status)}
                          <Badge variant="outline">Token #{settlement.tokenId}</Badge>
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
                            <p className="text-gray-600">Total Amount</p>
                            <p className="font-medium">{formatCurrency(settlement.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Yield Rate</p>
                            <p className="font-medium">{settlement.yieldRate}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Holders</p>
                            <p className="font-medium flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {settlement.holderCount}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Principal</p>
                              <p className="font-medium">{formatCurrency(settlement.principalAmount)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Yield</p>
                              <p className="font-medium">{formatCurrency(settlement.yieldAmount)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Transaction</p>
                              <p className="font-mono text-xs">{settlement.transactionHash.slice(0, 10)}...</p>
                            </div>
                          </div>
                        </div>

                        {settlement.notes && (
                          <div className="text-sm text-gray-600">
                            <strong>Notes:</strong> {settlement.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRecord(settlement);
                            setShowDetails(true);
                          }}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.open(`https://www.flowscan.io/tx/${settlement.transactionHash}`, '_blank');
                          }}
                        >
                          View Tx
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlement Details Modal */}
      {selectedRecord && showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle>Settlement Details - {selectedRecord.invoiceNumber}</CardTitle>
              <CardDescription>Complete settlement breakdown and holder distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Settlement Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Token ID:</span>
                      <span className="font-medium">#{selectedRecord.tokenId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Number:</span>
                      <span className="font-medium">{selectedRecord.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Settlement Date:</span>
                      <span className="font-medium">{formatDate(selectedRecord.settlementDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      {getStatusBadge(selectedRecord.status)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Financial Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Principal Amount:</span>
                      <span className="font-medium">{formatCurrency(selectedRecord.principalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Yield Amount:</span>
                      <span className="font-medium">{formatCurrency(selectedRecord.yieldAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Yield Rate:</span>
                      <span className="font-medium">{selectedRecord.yieldRate}%</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Total Distributed:</span>
                      <span className="font-bold">{formatCurrency(selectedRecord.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Holder Distribution</h4>
                <div className="space-y-2">
                  {selectedRecord.holderDistribution.map((holder, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-mono text-sm">{holder.address}</p>
                        <p className="text-xs text-gray-600">{holder.percentage}% of total supply</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(holder.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(`https://www.flowscan.io/tx/${selectedRecord.transactionHash}`, '_blank');
                  }}
                >
                  View on Explorer
                </Button>
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

export default SettlementHistory;