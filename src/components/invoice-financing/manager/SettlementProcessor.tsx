import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { toast } from 'react-hot-toast';
import { DollarSign, Clock, CheckCircle, Flame, Users, AlertTriangle, Calculator } from 'lucide-react';
import { InvoiceFinancingService } from '../../../services/invoiceFinancingService';
import { useWallet } from '../../../context/WalletContext';

interface AssignedToken {
  tokenId: string;
  name: string; // Asset name from metadata
  assetType: string; // Asset type (Real Estate, Invoice, etc.)
  issuer: string;
  supply: string;
  price: string;
  lifecycle: number; // 0=Active, 1=Settled, 2=Burned
  holderCount: number;
  totalValueLocked: string;
  metadataURI: string;
  metadata?: any; // Full metadata object
  holders?: { address: string; amount: string }[];
  invoiceDetails?: {
    invoiceNumber: string;
    dueDate: string;
    originalAmount: string;
    currentValue: string;
  };
}

interface SettlementCalculation {
  principal: string;
  yield: string;
  total: string;
  holderDistribution: { address: string; amount: string }[];
}

const SettlementProcessor: React.FC = () => {
  const { signer, isConnected, address } = useWallet();
  const [service, setService] = useState<InvoiceFinancingService | null>(null);
  const [assignedTokens, setAssignedTokens] = useState<AssignedToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<AssignedToken | null>(null);
  const [settlementForm, setSettlementForm] = useState({
    invoiceAmount: '',
    yieldRate: '5.0', // Default 5% yield
    notes: ''
  });
  const [calculation, setCalculation] = useState<SettlementCalculation | null>(null);
  const [processing, setProcessing] = useState(false);

  // Initialize service and load tokens
  useEffect(() => {
    const initializeAndLoadTokens = async () => {
      if (isConnected && signer && address) {
        try {
          // Initialize service for settlement processing
          const financingService = new InvoiceFinancingService(window.ethereum);
          await financingService.connect();
          setService(financingService);
          
          // Load assigned tokens directly (like manager dashboard)
          await loadAssignedTokens();
        } catch (error) {
          console.error('Failed to initialize settlement processor:', error);
        }
      }
    };

    initializeAndLoadTokens();
  }, [isConnected, signer, address]);

  const loadAssignedTokens = async (serviceInstance?: InvoiceFinancingService) => {
    try {
      setLoading(true);
      console.log('🔄 Loading real assigned tokens for settlement processing...');
      
      if (!signer || !address) {
        console.log('No signer or address available');
        return;
      }

      // Create direct contract instances
      const { ADMIN_CONTRACT, TOKEN_CONTRACT, MARKETPLACE_CONTRACT } = await import('../../../lib/contractAddress');
      const { CONTRACT_ABIS } = await import('../../../lib/contractAbis');
      const { ethers } = await import('ethers');

      const adminContract = new ethers.Contract(ADMIN_CONTRACT, CONTRACT_ABIS.ADMIN, signer);
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT, CONTRACT_ABIS.ERC1155CORE, signer);
      
      // First check if user is authorized manager (like manager dashboard does)
      console.log('🔍 Checking manager authorization for settlement processor...');
      let managersData;
      try {
        managersData = await adminContract.getAllManagers();
        console.log('📋 All managers from contract:', managersData);
      } catch (error) {
        console.error('❌ Error calling getAllManagers:', error);
        toast.error('Failed to fetch managers from contract');
        setAssignedTokens([]);
        return;
      }

      // Check if connected wallet is in managers list
      const managerAddresses = managersData || [];
      const isManager = managerAddresses.some((managerAddr: string) => 
        managerAddr.toLowerCase() === address.toLowerCase()
      );
      
      if (!isManager) {
        console.log('❌ User is not an authorized manager for settlement processing');
        toast.error('You are not authorized as a manager');
        setAssignedTokens([]);
        return;
      }
      
      console.log('✅ User is authorized manager for settlement processing');
      
      // Get manager's assigned token IDs
      const assignedTokenIds = await adminContract.getManagerTokens(address);
      console.log('📋 Assigned token IDs for settlement:', assignedTokenIds.map((id: ethers.BigNumber) => id.toString()));
      
      const tokenIdStrings = assignedTokenIds.map((id: ethers.BigNumber) => id.toString());
      
      if (tokenIdStrings.length === 0) {
        console.log('ℹ️ No tokens assigned to this manager for settlement');
        setAssignedTokens([]);
        return;
      }
      
      const loadedTokens: AssignedToken[] = [];
      
      // Process each assigned token
      for (const tokenId of tokenIdStrings) {
        try {
          console.log(`🔄 Processing settlement token ${tokenId}...`);
          
          // Get basic token info
          const tokenInfo = await tokenContract.getTokenInfo(tokenId);
          const lifecycle = await tokenContract.getTokenLifecycleStatus(tokenId);
          
          // Enhanced asset name extraction using marketplace approach
          let assetName = `Asset #${tokenId}`;
          let assetType = 'Investment Asset';
          let metadata = null;
          
          // Comprehensive metadata fetching with multiple fallbacks
          if (tokenInfo.metadataURI && tokenInfo.metadataURI.length > 0) {
            try {
              console.log(`🔍 Fetching metadata for token ${tokenId} from URI: ${tokenInfo.metadataURI}`);
              
              // Try multiple IPFS gateways for reliability
              const gateways = [
                { name: 'Pinata', url: 'https://gateway.pinata.cloud/ipfs/' },
                { name: 'IPFS', url: 'https://ipfs.io/ipfs/' },
                { name: 'Cloudflare', url: 'https://cloudflare-ipfs.com/ipfs/' },
                { name: 'Dweb', url: 'https://dweb.link/ipfs/' }
              ];
              
              let fetchURL = tokenInfo.metadataURI;
              
              // Convert IPFS URI to HTTP URL
              if (tokenInfo.metadataURI.startsWith('ipfs://')) {
                const ipfsHash = tokenInfo.metadataURI.replace('ipfs://', '');
                fetchURL = `${gateways[0].url}${ipfsHash}`;
              } else if (tokenInfo.metadataURI.startsWith('Qm')) {
                fetchURL = `${gateways[0].url}${tokenInfo.metadataURI}`;
              }
              
              // Try each gateway until one works
              for (const gateway of gateways) {
                try {
                  let gatewayURL = fetchURL;
                  if (tokenInfo.metadataURI.startsWith('ipfs://') || tokenInfo.metadataURI.startsWith('Qm')) {
                    const hash = tokenInfo.metadataURI.replace('ipfs://', '');
                    gatewayURL = `${gateway.url}${hash}`;
                  }
                  
                  console.log(`🔄 Trying ${gateway.name} gateway: ${gatewayURL}`);
                  
                  const response = await fetch(gatewayURL, { 
                    timeout: 10000,
                    headers: {
                      'Accept': 'application/json',
                      'Cache-Control': 'no-cache'
                    }
                  });
                  
                  if (response.ok) {
                    metadata = await response.json();
                    console.log(`✅ Metadata fetched successfully from ${gateway.name}:`, metadata);
                    break;
                  }
                } catch (gatewayError) {
                  console.warn(`⚠️ ${gateway.name} gateway failed:`, gatewayError);
                  continue;
                }
              }
              
              if (metadata) {
                // Extract asset name with multiple fallback strategies (like dashboard)
                if (metadata.name && metadata.name.trim() && !metadata.name.trim().startsWith('Asset Token #')) {
                  assetName = metadata.name.trim();
                } else if (metadata.title && metadata.title.trim()) {
                  assetName = metadata.title.trim();
                } else if (metadata.assetName && metadata.assetName.trim()) {
                  assetName = metadata.assetName.trim();
                } else if (metadata.assetDetails?.name) {
                  assetName = metadata.assetDetails.name.trim();
                } else if (metadata.assetDetails?.title) {
                  assetName = metadata.assetDetails.title.trim();
                } else if (metadata.assetDetails?.location) {
                  // For real estate, try to use location
                  assetType = metadata.assetDetails?.type || 'Real Estate';
                  assetName = `${assetType} in ${metadata.assetDetails.location}`;
                } else if (metadata.attributes) {
                  // Try to build name from attributes
                  const locationAttr = metadata.attributes.find((attr: any) => 
                    attr.trait_type && attr.trait_type.toLowerCase().includes('location')
                  );
                  const typeAttr = metadata.attributes.find((attr: any) => 
                    attr.trait_type === 'Asset Type'
                  );
                  
                  if (typeAttr?.value) {
                    assetType = typeAttr.value;
                  }
                  
                  if (locationAttr?.value) {
                    assetName = `${assetType} in ${locationAttr.value}`;
                  } else if (typeAttr?.value) {
                    assetName = `${typeAttr.value} Token #${tokenId}`;
                  }
                }
                
                // Extract asset type
                if (metadata.assetDetails?.type) {
                  assetType = metadata.assetDetails.type;
                } else if (metadata.attributes) {
                  const typeAttr = metadata.attributes.find((attr: any) => 
                    attr.trait_type === 'Asset Type'
                  );
                  if (typeAttr?.value) {
                    assetType = typeAttr.value;
                  }
                } else if (metadata.type) {
                  assetType = metadata.type;
                }
                
                console.log(`✅ Extracted asset details - Name: "${assetName}", Type: "${assetType}"`);
              }
            } catch (metadataError) {
              console.warn(`⚠️ Could not fetch metadata for token ${tokenId}:`, metadataError);
              // Use enhanced fallback with asset type
              assetName = `${assetType} Asset #${tokenId}`;
            }
          } else {
            console.log(`ℹ️ No metadata URI for token ${tokenId}, using fallback name`);
            assetName = `${assetType} Asset #${tokenId}`;
          }
          
          // Get real token holders from marketplace contract
          let holderCount = 0;
          let realHolders = [];
          const totalValueLocked = ethers.utils.formatEther(tokenInfo.price.mul(tokenInfo.supply));
          
          try {
            const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, CONTRACT_ABIS.MARKETPLACE, signer);
            const holdersData = await marketplaceContract.getTokenHolders(tokenId);
            const [holders, amounts] = holdersData;
            
            holderCount = holders.length;
            realHolders = holders.map((address: string, index: number) => ({
              address: address,
              amount: ethers.utils.formatEther(amounts[index])
            }));
            
            console.log(`✅ Found ${holderCount} real holders for token ${tokenId}`);
          } catch (holderError) {
            console.warn(`⚠️ Could not fetch holders for token ${tokenId}, using fallback:`, holderError);
            holderCount = 1; // At least issuer
            realHolders = [{ address: tokenInfo.issuer, amount: totalValueLocked }];
          }
          
          // Create invoice details from token metadata
          const invoiceDetails = {
            invoiceNumber: `INV-${tokenId}-2024`,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            originalAmount: ethers.utils.formatEther(tokenInfo.price.mul(tokenInfo.supply)),
            currentValue: ethers.utils.formatEther(tokenInfo.price.mul(tokenInfo.supply))
          };
          
          loadedTokens.push({
            tokenId: tokenId,
            name: assetName,
            assetType: assetType,
            issuer: tokenInfo.issuer,
            supply: tokenInfo.supply.toString(),
            price: ethers.utils.formatEther(tokenInfo.price),
            lifecycle: lifecycle,
            holderCount: holderCount,
            totalValueLocked: totalValueLocked,
            metadataURI: tokenInfo.metadataURI,
            metadata: metadata,
            holders: realHolders,
            invoiceDetails: invoiceDetails
          });
          
          console.log(`✅ Loaded settlement token ${tokenId}: ${assetName}`);
        } catch (tokenError) {
          console.warn(`Could not load settlement data for token ${tokenId}:`, tokenError);
        }
      }
      
      setAssignedTokens(loadedTokens);
      console.log(`✅ Settlement Processor: Loaded ${loadedTokens.length} tokens for settlement processing`);
      console.log('📋 Settlement Processor: Token details:', loadedTokens.map(t => ({
        tokenId: t.tokenId,
        name: t.name,
        assetType: t.assetType,
        lifecycle: t.lifecycle,
        holderCount: t.holderCount
      })));
      
    } catch (error) {
      console.error('Failed to load assigned tokens:', error);
      toast.error('Failed to load assigned tokens');
    } finally {
      setLoading(false);
    }
  };

  const calculateSettlement = () => {
    if (!selectedToken || !settlementForm.invoiceAmount || !settlementForm.yieldRate) {
      return;
    }

    const invoiceAmount = parseFloat(settlementForm.invoiceAmount);
    const yieldRate = parseFloat(settlementForm.yieldRate) / 100;
    const principal = invoiceAmount / (1 + yieldRate);
    const yieldAmount = invoiceAmount - principal;

    // Use real token holders for distribution calculation
    let holderDistribution = [];
    
    if (selectedToken.holders && selectedToken.holders.length > 0) {
      // Calculate proportional distribution based on current holdings
      const totalHoldings = selectedToken.holders.reduce((sum, holder) => 
        sum + parseFloat(holder.amount), 0
      );
      
      holderDistribution = selectedToken.holders.map(holder => {
        const proportion = parseFloat(holder.amount) / totalHoldings;
        const distributionAmount = invoiceAmount * proportion;
        return {
          address: holder.address,
          amount: distributionAmount.toFixed(6)
        };
      });
    } else {
      // Fallback to issuer if no holders found
      holderDistribution = [
        { address: selectedToken.issuer, amount: invoiceAmount.toString() }
      ];
    }

    setCalculation({
      principal: principal.toFixed(2),
      yield: yieldAmount.toFixed(2),
      total: invoiceAmount.toFixed(2),
      holderDistribution: holderDistribution
    });
  };

  useEffect(() => {
    if (selectedToken && settlementForm.invoiceAmount && settlementForm.yieldRate) {
      calculateSettlement();
    }
  }, [selectedToken, settlementForm.invoiceAmount, settlementForm.yieldRate]);

  const handleProcessSettlement = async () => {
    if (!service || !selectedToken || !calculation) {
      toast.error('Please complete settlement calculation first');
      return;
    }

    try {
      setProcessing(true);
      console.log('🔄 Starting settlement process with yield distribution...');
      
      // Process the settlement - convert to Wei for contract call
      const { ethers } = await import('ethers');
      const settlementAmountWei = ethers.utils.parseEther(calculation.total);
      
      // Step 1: Process the invoice settlement (records settlement)
      console.log('📋 Step 1: Recording invoice settlement...');
      console.log('💰 Settlement amount:', calculation.total, 'FLOW');
      console.log('💰 Settlement amount (Wei):', settlementAmountWei.toString());
      
      const settlementResult = await service.processInvoiceSettlement(
        selectedToken.tokenId,
        settlementAmountWei
      );
      
      if (settlementResult.success) {
        console.log('✅ Settlement recorded successfully');
        
        // Step 2: Distribute yield to token holders using submitRental
        console.log('💰 Step 2: Distributing yield to token holders...');
        
        try {
          // Create direct contract instance for yield distribution
          const { PAYMENT_SPLITTER_CONTRACT } = await import('../../../lib/contractAddress');
          const { CONTRACT_ABIS } = await import('../../../lib/contractAbis');
          
          const paymentSplitterContract = new ethers.Contract(
            PAYMENT_SPLITTER_CONTRACT, 
            CONTRACT_ABIS.PAYMENTSPLITTER, 
            signer
          );
          
          // Distribute the settlement amount as yield to token holders
          const yieldDistributionTx = await paymentSplitterContract.submitRental(
            selectedToken.tokenId,
            { 
              value: settlementAmountWei,
              gasLimit: 500000
            }
          );
          
          console.log('📤 Yield distribution transaction sent:', yieldDistributionTx.hash);
          toast.info('Distributing yield to token holders...');
          
          const yieldReceipt = await yieldDistributionTx.wait();
          console.log('✅ Yield distribution confirmed:', yieldReceipt.transactionHash);
          
          toast.success(`🎉 Settlement completed for ${selectedToken.name} and yield distributed to all token holders!`);
          
        } catch (yieldError) {
          console.error('Yield distribution failed:', yieldError);
          toast.error('Settlement recorded but yield distribution failed. Please try distributing manually.');
        }
        
        // Step 3: Mark invoice as settled and burn tokens
        console.log('🔥 Step 3: Burning tokens and updating lifecycle...');
        
        try {
          const { TOKEN_CONTRACT } = await import('../../../lib/contractAddress');
          const { CONTRACT_ABIS } = await import('../../../lib/contractAbis');
          
          const tokenContract = new ethers.Contract(TOKEN_CONTRACT, CONTRACT_ABIS.ERC1155CORE, signer);
          
          // Mark invoice as settled
          console.log('📋 Marking invoice as settled...');
          const markSettledTx = await tokenContract.markInvoiceSettled(
            selectedToken.tokenId, 
            settlementAmountWei,
            { gasLimit: 300000 }
          );
          await markSettledTx.wait();
          console.log('✅ Invoice marked as settled');
          
          // Burn all tokens for this invoice
          console.log('🔥 Burning all tokens...');
          const burnTx = await tokenContract.burnAllTokens(selectedToken.tokenId, { gasLimit: 300000 });
          await burnTx.wait();
          console.log('✅ All tokens burned successfully');
          
          toast.success(`🔥 ${selectedToken.name} tokens burned successfully! Asset lifecycle completed.`);
          
        } catch (burnError) {
          console.error('Token burning failed:', burnError);
          toast.error('Settlement completed but token burning failed. Please burn manually.');
        }
        
        // Refresh data
        await loadAssignedTokens(service);
        setSelectedToken(null);
        setSettlementForm({ invoiceAmount: '', yieldRate: '5.0', notes: '' });
        setCalculation(null);
        
      } else {
        throw new Error('Settlement recording failed');
      }
    } catch (error: any) {
      console.error('Settlement failed:', error);
      toast.error(error.message || 'Settlement processing failed');
    } finally {
      setProcessing(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Invoice Settlement Processor
          </CardTitle>
          <CardDescription>
            Process invoice settlements and distribute payments to token holders
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Tokens</CardTitle>
            <CardDescription>Tokens assigned to you for settlement management</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : assignedTokens.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No tokens assigned</p>
            ) : (
              <div className="space-y-3">
                {assignedTokens.map((token) => (
                  <Card 
                    key={token.tokenId} 
                    className={`cursor-pointer transition-colors ${
                      selectedToken?.tokenId === token.tokenId 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedToken(token)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{token.name}</span>
                            {getLifecycleBadge(token.lifecycle)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {token.assetType} • Token #{token.tokenId}
                          </div>
                          
                          {token.invoiceDetails && (
                            <div className="text-sm text-gray-600">
                              <p><strong>Invoice:</strong> {token.invoiceDetails.invoiceNumber}</p>
                              <p><strong>Due:</strong> {token.invoiceDetails.dueDate}</p>
                              <p><strong>Value:</strong> {formatCurrency(token.invoiceDetails.currentValue)}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {token.holderCount} holders
                            </span>
                            <span>{formatCurrency(token.totalValueLocked)} locked</span>
                          </div>
                        </div>
                        
                        {token.lifecycle === 0 && (
                          <Button
                            size="sm"
                            variant={selectedToken?.tokenId === token.tokenId ? "default" : "outline"}
                          >
                            {selectedToken?.tokenId === token.tokenId ? 'Selected' : 'Select'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settlement Form */}
        <Card>
          <CardHeader>
            <CardTitle>Settlement Processing</CardTitle>
            <CardDescription>
              {selectedToken 
                ? `Processing settlement for ${selectedToken.name} (Token #${selectedToken.tokenId})`
                : 'Select a token to begin settlement'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedToken ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p>Please select a token from the list to begin settlement processing</p>
              </div>
            ) : selectedToken.lifecycle !== 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                <p>This token has already been processed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Settlement Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invoiceAmount">Invoice Settlement Amount (FLOW)</Label>
                    <Input
                      id="invoiceAmount"
                      type="number"
                      step="0.01"
                      placeholder="Enter received invoice amount"
                      value={settlementForm.invoiceAmount}
                      onChange={(e) => setSettlementForm(prev => ({ 
                        ...prev, 
                        invoiceAmount: e.target.value 
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="yieldRate">Yield Rate (%)</Label>
                    <Input
                      id="yieldRate"
                      type="number"
                      step="0.1"
                      placeholder="5.0"
                      value={settlementForm.yieldRate}
                      onChange={(e) => setSettlementForm(prev => ({ 
                        ...prev, 
                        yieldRate: e.target.value 
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Settlement Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Add any settlement notes"
                      value={settlementForm.notes}
                      onChange={(e) => setSettlementForm(prev => ({ 
                        ...prev, 
                        notes: e.target.value 
                      }))}
                    />
                  </div>
                </div>

                {/* Settlement Calculation */}
                {calculation && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Settlement Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Principal</p>
                          <p className="font-medium">{formatCurrency(calculation.principal)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Yield ({settlementForm.yieldRate}%)</p>
                          <p className="font-medium">{formatCurrency(calculation.yield)}</p>
                        </div>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold">Total Distribution:</span>
                          <span className="font-semibold">{formatCurrency(calculation.total)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Holder Distribution:</p>
                        <div className="space-y-1 text-xs">
                          {calculation.holderDistribution.map((holder, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="font-mono">{holder.address}</span>
                              <span>{formatCurrency(holder.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Process Button */}
                <Button
                  onClick={handleProcessSettlement}
                  disabled={!calculation || processing}
                  className="w-full"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing Settlement...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Process Settlement & Burn Tokens
                    </>
                  )}
                </Button>

                {calculation && (
                  <div className="text-xs text-gray-500 text-center">
                    ⚠️ This will distribute {formatCurrency(calculation.total)} to all token holders
                    and permanently burn all tokens for this invoice.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettlementProcessor;