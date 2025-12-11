import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  Download,
  Calendar,
  Activity,
  ArrowUpRight,
  Wallet,
  FileText,
  BarChart3
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { ethers } from 'ethers';

interface YieldTransaction {
  tokenId: string;
  assetName: string;
  amount: string;
  timestamp: string;
  type: 'rental' | 'settlement';
  transactionHash: string;
  blockNumber: number;
}

interface YieldSummary {
  totalYieldReceived: string;
  totalPrincipalInvested: string;
  currentPortfolioValue: string;
  totalReturn: string;
  returnPercentage: number;
  activeAssets: number;
  lastPaymentDate: string;
  monthlyAverageYield: string;
  yearlyProjectedYield: string;
}

interface AssetYieldBreakdown {
  tokenId: string;
  assetName: string;
  principalInvested: string;
  totalYieldReceived: string;
  currentValue: string;
  yieldPercentage: number;
  lastPaymentDate: string;
  paymentCount: number;
}

const YieldIncomeReport: React.FC = () => {
  const { isConnected, address, signer } = useWallet();
  const [loading, setLoading] = useState(false);
  const [yieldTransactions, setYieldTransactions] = useState<YieldTransaction[]>([]);
  const [yieldSummary, setYieldSummary] = useState<YieldSummary>({
    totalYieldReceived: '0',
    totalPrincipalInvested: '0',
    currentPortfolioValue: '0',
    totalReturn: '0',
    returnPercentage: 0,
    activeAssets: 0,
    lastPaymentDate: '',
    monthlyAverageYield: '0',
    yearlyProjectedYield: '0'
  });
  const [assetBreakdown, setAssetBreakdown] = useState<AssetYieldBreakdown[]>([]);

  useEffect(() => {
    if (isConnected && address && signer) {
      loadYieldData();
    }
  }, [isConnected, address, signer]);

  const loadYieldData = async () => {
    try {
      setLoading(true);
      console.log('Loading real yield and principal data...');
      if (!signer || !address) return;

      const { MARKETPLACE_CONTRACT, TOKEN_CONTRACT, PAYMENT_SPLITTER_CONTRACT } = await import('../../lib/contractAddress');
      const { CONTRACT_ABIS } = await import('../../lib/contractAbis');

      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, CONTRACT_ABIS.MARKETPLACE, signer);
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT, CONTRACT_ABIS.ERC1155CORE, signer);
      const paymentSplitterContract = new ethers.Contract(PAYMENT_SPLITTER_CONTRACT, CONTRACT_ABIS.PAYMENTSPLITTER, signer);

      const userAssets = await getUserTokenHoldings(marketplaceContract, tokenContract);
      const yieldHistory = await getYieldTransactionHistory(paymentSplitterContract, userAssets);
      const summary = calculateYieldSummary(userAssets, yieldHistory);
      const breakdown = calculateAssetBreakdown(userAssets, yieldHistory);

      setYieldTransactions(yieldHistory);
      setYieldSummary(summary);
      setAssetBreakdown(breakdown);
      console.log('Yield data loaded successfully');
    } catch (error) {
      console.error('Failed to load yield data:', error);
      toast.error('Failed to load yield data');
    } finally {
      setLoading(false);
    }
  };

  const getUserTokenHoldings = async (marketplaceContract: ethers.Contract, tokenContract: ethers.Contract) => {
    console.log('Fetching user token holdings...');
    const marketplaceData = await marketplaceContract.getAllListings();
    const [tokenIds, , amounts, prices] = marketplaceData;

    const userAssets = [];

    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i].toString();
      try {
        const walletBalance = await tokenContract.balanceOf(address, tokenId);
        const marketplaceBalance = await marketplaceContract.getUserBalance(address, tokenId);
        const totalBalance = walletBalance.add(marketplaceBalance);

        if (totalBalance.gt(0)) {
          const tokenInfo = await tokenContract.getTokenInfo(tokenId);
          let assetName = `Asset #${tokenId}`;
          if (tokenInfo.metadataURI) {
            try {
              let fetchURL = tokenInfo.metadataURI;
              if (tokenInfo.metadataURI.startsWith('ipfs://')) {
                const ipfsHash = tokenInfo.metadataURI.replace('ipfs://', '');
                fetchURL = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
              }
              const metadataResponse = await fetch(fetchURL);
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                assetName = metadata?.name || assetName;
              }
            } catch (metadataError) {
              console.warn(`Could not fetch metadata for token ${tokenId}`);
            }
          }
          userAssets.push({
            tokenId,
            assetName,
            balance: totalBalance.toString(),
            walletBalance: walletBalance.toString(),
            marketplaceBalance: marketplaceBalance.toString(),
            price: ethers.utils.formatEther(tokenInfo.price),
            totalInvested: ethers.utils.formatEther(tokenInfo.price.mul(totalBalance))
          });
        }
      } catch (error) {
        console.warn(`Error checking balance for token ${tokenId}:`, error);
      }
    }
    console.log(`Found ${userAssets.length} user assets`);
    return userAssets;
  };

  const getYieldTransactionHistory = async (paymentSplitterContract: ethers.Contract, userAssets: any[]) => {
    console.log('Fetching yield transaction history...');
    const yieldTransactions: YieldTransaction[] = [];

    try {
      const currentBlock = await paymentSplitterContract.provider.getBlockNumber();
      const blockRanges = [];
      const rangeSize = 5000;
      for (let i = 0; i < 10; i++) {
        const toBlock = currentBlock - (i * rangeSize);
        const fromBlock = Math.max(1, toBlock - rangeSize);
        if (fromBlock < toBlock) blockRanges.push({ from: fromBlock, to: toBlock });
      }

      // Process InvoiceSettled
      let allSettlementEvents = [];
      for (const range of blockRanges) {
        try {
          const filter = paymentSplitterContract.filters.InvoiceSettled();
          const events = await paymentSplitterContract.queryFilter(filter, range.from, range.to);
          allSettlementEvents = allSettlementEvents.concat(events);
        } catch (error) {
          console.warn(`Error in settlement range ${range.from}-${range.to}`, error);
        }
      }

      for (const event of allSettlementEvents) {
        const tokenId = event.args?.tokenId?.toString();
        const toHolders = event.args?.toHolders;
        if (!tokenId || !toHolders) continue;

        const { MARKETPLACE_CONTRACT } = await import('../../lib/contractAddress');
        const { CONTRACT_ABIS } = await import('../../lib/contractAbis');
        const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, CONTRACT_ABIS.MARKETPLACE, signer);

        const holdersData = await marketplaceContract.getTokenHolders(tokenId);
        const [holders, amounts] = holdersData;
        const userIndex = holders.findIndex((h: string) => h.toLowerCase() === address?.toLowerCase());

        if (userIndex >= 0) {
          const userBalance = parseFloat(ethers.utils.formatUnits(amounts[userIndex], 0));
          const totalSupply = amounts.reduce((s: number, a: any) => s + parseFloat(ethers.utils.formatUnits(a, 0)), 0);
          if (userBalance > 0 && totalSupply > 0) {
            const proportion = userBalance / totalSupply;
            const share = (parseFloat(ethers.utils.formatEther(toHolders)) * proportion).toFixed(6);
            if (parseFloat(share) > 0) {
              const block = await event.getBlock();
              const assetName = userAssets.find(a => a.tokenId === tokenId)?.assetName || `Asset #${tokenId}`;
              yieldTransactions.push({
                tokenId,
                assetName,
                amount: share,
                timestamp: new Date(block.timestamp * 1000).toISOString(),
                type: 'settlement',
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
              });
            }
          }
        }
      }

      // Process RentalDistributed (current holdings only)
      let allRentalEvents = [];
      for (const range of blockRanges) {
        try {
          const filter = paymentSplitterContract.filters.RentalDistributed();
          const events = await paymentSplitterContract.queryFilter(filter, range.from, range.to);
          allRentalEvents = allRentalEvents.concat(events);
        } catch (error) {
          console.warn(`Error in rental range ${range.from}-${range.to}`, error);
        }
      }

      for (const event of allRentalEvents) {
        const tokenId = event.args?.tokenId?.toString();
        const toHolders = event.args?.toHolders;
        const asset = userAssets.find(a => a.tokenId === tokenId);
        if (asset && parseFloat(asset.marketplaceBalance) > 0 && toHolders) {
          const { MARKETPLACE_CONTRACT } = await import('../../lib/contractAddress');
          const { CONTRACT_ABIS } = await import('../../lib/contractAbis');
          const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, CONTRACT_ABIS.MARKETPLACE, signer);
          const holdersData = await marketplaceContract.getTokenHolders(tokenId);
          const [, amounts] = holdersData;
          const totalSupply = amounts.reduce((s: number, a: any) => s + parseFloat(ethers.utils.formatUnits(a, 0)), 0);
          const proportion = parseFloat(asset.marketplaceBalance) / totalSupply;
          const share = (parseFloat(ethers.utils.formatEther(toHolders)) * proportion).toFixed(6);
          if (parseFloat(share) > 0) {
            const block = await event.getBlock();
            yieldTransactions.push({
              tokenId,
              assetName: asset.assetName,
              amount: share,
              timestamp: new Date(block.timestamp * 1000).toISOString(),
              type: 'rental',
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber
            });
          }
        }
      }

      yieldTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.warn('Could not fetch yield events:', error);
    }

    console.log(`Found ${yieldTransactions.length} yield transactions`);
    return yieldTransactions;
  };

  const calculateYieldSummary = (userAssets: any[], yieldHistory: YieldTransaction[]): YieldSummary => {
    const totalPrincipalInvested = userAssets.reduce((sum, asset) => sum + parseFloat(asset.totalInvested), 0);
    const totalYieldReceived = yieldHistory.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const returnPercentage = totalPrincipalInvested > 0 ? (totalYieldReceived / totalPrincipalInvested) * 100 : 0;
    const lastPaymentDate = yieldHistory.length > 0 ? yieldHistory[0].timestamp : '';

    const monthsActive = Math.max(1, Math.ceil(yieldHistory.length / 4));
    const monthlyAverageYield = totalYieldReceived / monthsActive;
    const yearlyProjectedYield = monthlyAverageYield * 12;

    return {
      totalYieldReceived: totalYieldReceived.toFixed(6),
      totalPrincipalInvested: totalPrincipalInvested.toFixed(6),
      currentPortfolioValue: totalPrincipalInvested.toFixed(6),
      totalReturn: totalYieldReceived.toFixed(6),
      returnPercentage,
      activeAssets: userAssets.length,
      lastPaymentDate,
      monthlyAverageYield: monthlyAverageYield.toFixed(6),
      yearlyProjectedYield: yearlyProjectedYield.toFixed(6)
    };
  };

  const calculateAssetBreakdown = (userAssets: any[], yieldHistory: YieldTransaction[]): AssetYieldBreakdown[] => {
    return userAssets.map(asset => {
      const assetYields = yieldHistory.filter(tx => tx.tokenId === asset.tokenId);
      const totalYieldReceived = assetYields.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      const yieldPercentage = parseFloat(asset.totalInvested) > 0 ? (totalYieldReceived / parseFloat(asset.totalInvested)) * 100 : 0;
      const lastPaymentDate = assetYields.length > 0 ? assetYields[0].timestamp : '';

      return {
        tokenId: asset.tokenId,
        assetName: asset.assetName,
        principalInvested: asset.totalInvested,
        totalYieldReceived: totalYieldReceived.toFixed(6),
        currentValue: asset.totalInvested,
        yieldPercentage,
        lastPaymentDate,
        paymentCount: assetYields.length
      };
    });
  };

  // === PROFESSIONAL PDF REPORT GENERATOR ===
  const downloadReport = () => {
    console.log('Generating professional PDF report...');

    const reportData = {
      generatedAt: new Date().toISOString(),
      address,
      summary: yieldSummary,
      transactions: yieldTransactions,
      assetBreakdown: assetBreakdown,
    };

    const htmlReport = generateProfessionalPDFReport(reportData);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlReport);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }

    toast.success('Report opened. Use "Save as PDF" in print dialog.');
  };

  const generateProfessionalPDFReport = (data: any) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatCurrency = (amount: string) => {
      return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Yield & Income Statement</title>
  <style>
    @page { size: A4; margin: 0.8in; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #000; background: #fff; margin: 0; padding: 0; }
    .container { width: 100%; max-width: 8.5in; margin: 0 auto; }
    .header { border-bottom: 2px solid #003087; padding-bottom: 12px; margin-bottom: 20px; }
    .logo { font-size: 18pt; font-weight: bold; color: #003087; margin: 0; }
    .subtitle { font-size: 14pt; margin: 4px 0 0; color: #000; }
    .report-info { font-size: 9pt; margin-top: 8px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 12pt; font-weight: bold; color: #003087; border-bottom: 1px solid #003087; padding-bottom: 4px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9pt; }
    th { background-color: #f0f4f8; color: #003087; font-weight: bold; text-align: left; padding: 8px 10px; border-bottom: 2px solid #003087; }
    td { padding: 8px 10px; border-bottom: 1px solid #d0d7e0; }
    tr:nth-child(even) { background-color: #f9fbfd; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .text-blue { color: #003087; }
    .summary-grid { display: table; width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .summary-row { display: table-row; }
    .summary-cell { display: table-cell; padding: 12px; border: 1px solid #d0d7e0; background-color: #f0f4f8; }
    .summary-label { font-weight: bold; color: #003087; }
    .summary-value { font-size: 11pt; font-weight: bold; color: #000; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #d0d7e0; font-size: 8pt; color: #555; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header" style="display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #003087; padding-bottom: 12px; margin-bottom: 20px;">
  <img src="/Orion.png" alt="OpenAsset Logo" style="height: 40px; width: auto;" />
  <div>
    <h1 class="logo" style="margin: 0; font-size: 18pt; color: #003087; line-height: 1.2;">OpenAsset RWA Platform</h1>
    <p class="subtitle" style="margin: 4px 0 0; font-size: 14pt; color: #000;">Yield & Income Statement</p>
  </div>
</div>
<div class="report-info" style="font-size: 9pt; margin-top: 8px;">
  <div><strong>Account Holder:</strong> ${data.address}</div>
  <div><strong>Statement Date:</strong> ${formatDate(data.generatedAt)}</div>
  <div><strong>Generated On:</strong> ${new Date().toLocaleString('en-US')}</div>
</div>

    <div class="section">
      <h2 class="section-title">Portfolio Summary</h2>
      <table class="summary-grid">
        <tr class="summary-row">
          <td class="summary-cell"><div class="summary-label">Total Principal Invested</div><div class="summary-value">${formatCurrency(data.summary.totalPrincipalInvested)} FLOW</div></td>
          <td class="summary-cell"><div class="summary-label">Total Yield Received</div><div class="summary-value text-blue">${formatCurrency(data.summary.totalYieldReceived)} FLOW</div></td>
        </tr>
        <tr class="summary-row">
          <td class="summary-cell"><div class="summary-label">Total Return</div><div class="summary-value">${data.summary.returnPercentage.toFixed(2)}%</div></td>
          <td class="summary-cell"><div class="summary-label">Active Assets</div><div class="summary-value">${data.summary.activeAssets}</div></td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">Asset Yield Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th class="text-right">Principal</th>
            <th class="text-right">Yield Received</th>
            <th class="text-right">Return (%)</th>
            <th class="text-right">Payments</th>
            <th>Last Payment</th>
          </tr>
        </thead>
        <tbody>
          ${data.assetBreakdown.map((asset: any) => `
            <tr>
              <td class="font-bold">${asset.assetName}</td>
              <td class="text-right">${formatCurrency(asset.principalInvested)} FLOW</td>
              <td class="text-right text-blue">${formatCurrency(asset.totalYieldReceived)} FLOW</td>
              <td class="text-right">${asset.yieldPercentage.toFixed(2)}%</td>
              <td class="text-right">${asset.paymentCount}</td>
              <td>${asset.lastPaymentDate ? formatDate(asset.lastPaymentDate) : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">Recent Yield Transactions (Last 10)</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Asset</th>
            <th>Type</th>
            <th class="text-right">Amount (FLOW)</th>
          </tr>
        </thead>
        <tbody>
          ${data.transactions.slice(0, 10).map((tx: any) => `
            <tr>
              <td>${formatDate(tx.timestamp)}</td>
              <td>${tx.assetName}</td>
              <td><span style="text-transform: capitalize;">${tx.type}</span></td>
              <td class="text-right text-blue">+${formatCurrency(tx.amount)}</td>
            </tr>
          `).join('')}
          ${data.transactions.length === 0 ? `<tr><td colspan="4" class="text-center" style="color: #666;">No transactions recorded</td></tr>` : ''}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p><strong>Confidential Financial Statement</strong> • Generated from verified on-chain data.</p>
      <p>OpenAsset RWA Platform • Report ID: YIELD-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}</p>
    </div>
  </div>
</body>
</html>`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string) => {
    return `${parseFloat(amount).toLocaleString()} FLOW`;
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">Connect your wallet to view your yield and income report</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Yield & Income Report</h1>
          <p className="text-gray-600 mt-1">Track your real yield and principal returns from tokenized assets</p>
        </div>
        <Button onClick={downloadReport} className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Principal</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(yieldSummary.totalPrincipalInvested)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Yield Received</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(yieldSummary.totalYieldReceived)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Return</p>
                <p className="text-2xl font-bold text-purple-600">{yieldSummary.returnPercentage.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <PieChart className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Active Assets</p>
                <p className="text-2xl font-bold text-orange-600">{yieldSummary.activeAssets}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Asset Yield Breakdown
          </CardTitle>
          <CardDescription>Individual asset performance and yield history</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : assetBreakdown.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No asset data available</p>
          ) : (
            <div className="space-y-4">
              {assetBreakdown.map((asset) => (
                <Card key={asset.tokenId} className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">{asset.assetName}</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {asset.yieldPercentage.toFixed(2)}% Return
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Principal Invested</p>
                            <p className="font-medium">{formatCurrency(asset.principalInvested)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Yield Received</p>
                            <p className="font-medium text-green-600">{formatCurrency(asset.totalYieldReceived)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Payments Count</p>
                            <p className="font-medium">{asset.paymentCount} payments</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Last Payment</p>
                            <p className="font-medium">{asset.lastPaymentDate ? formatDate(asset.lastPaymentDate) : 'None'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Yield Transactions
          </CardTitle>
          <CardDescription>Latest yield payments received from your assets</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : yieldTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No yield transactions found</p>
          ) : (
            <div className="space-y-3">
              {yieldTransactions.slice(0, 10).map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.assetName}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {tx.type}
                        </Badge>
                        <span className="text-sm text-gray-500">{formatDate(tx.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">+{formatCurrency(tx.amount)}</p>
                    <div className="flex items-center justify-end space-x-1">
                      <ArrowUpRight className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500">Credited</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YieldIncomeReport;