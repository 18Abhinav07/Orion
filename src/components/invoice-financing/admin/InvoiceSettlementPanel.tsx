import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { toast } from 'react-hot-toast';
import { CheckCircle, Clock, AlertCircle, Flame } from 'lucide-react';
import { InvoiceFinancingService } from '../../../services/invoiceFinancingService';
import { useWallet } from '../../../context/WalletContext';

interface TokenInfo {
  tokenId: string;
  issuer: string;
  supply: string;
  price: string;
  metadataURI: string;
  lifecycle: number; // 0=Active, 1=Settled, 2=Burned
  settlementAmount?: string;
  settlementTimestamp?: string;
  assetName?: string;
}

const InvoiceSettlementPanel: React.FC = () => {
  const { signer, isConnected } = useWallet();
  const [service, setService] = useState<InvoiceFinancingService | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [settlementForm, setSettlementForm] = useState({
    tokenId: '',
    amount: ''
  });
  const [processing, setProcessing] = useState<string | null>(null);

  // Initialize service
  useEffect(() => {
    if (isConnected && signer) {
      const financingService = new InvoiceFinancingService(window.ethereum);
      financingService.connect().then(() => {
        setService(financingService);
        loadActiveTokens(financingService);
      }).catch(console.error);
    }
  }, [isConnected, signer]);

  const loadActiveTokens = async (serviceInstance?: InvoiceFinancingService) => {
    try {
      setLoading(true);
      console.log('🔄 Loading marketplace tokens for settlement...');
      
      if (!signer) {
        console.log('No signer available');
        return;
      }

      // Create direct contract instances like in admin dashboard
      const { ADMIN_CONTRACT, TOKEN_CONTRACT, MARKETPLACE_CONTRACT } = await import('../../../lib/contractAddress');
      const { CONTRACT_ABIS } = await import('../../../lib/contractAbis');
      const { ethers } = await import('ethers');

      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, CONTRACT_ABIS.MARKETPLACE, signer);
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT, CONTRACT_ABIS.ERC1155CORE, signer);
      
      // Get marketplace listings
      const marketplaceData = await marketplaceContract.getAllListings();
      const [tokenIds, issuers, amounts, prices] = marketplaceData;
      
      const loadedTokens: TokenInfo[] = [];
      
      // Process each token
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i].toString();
        try {
          // Get basic token info directly
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
          
          // Fetch metadata for asset name
          let assetName = `Asset #${tokenId}`;
          if (tokenInfo.metadataURI && tokenInfo.metadataURI.startsWith('ipfs://')) {
            try {
              const ipfsHash = tokenInfo.metadataURI.replace('ipfs://', '');
              const metadataResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                assetName = metadata.name || assetName;
              }
            } catch (metadataError) {
              console.warn(`Could not fetch metadata for token ${tokenId}`);
            }
          }
          
          loadedTokens.push({
            tokenId: tokenId,
            issuer: tokenInfo.issuer,
            supply: tokenInfo.supply.toString(),
            price: ethers.utils.formatEther(tokenInfo.price),
            metadataURI: tokenInfo.metadataURI,
            lifecycle: lifecycle,
            settlementAmount: settlementAmount,
            settlementTimestamp: settlementTimestamp,
            assetName: assetName
          });
          
          console.log(`✅ Loaded token ${tokenId}: ${assetName}`);
        } catch (tokenError) {
          console.warn(`Could not load details for token ${tokenId}:`, tokenError);
        }
      }
      
      setTokens(loadedTokens);
      console.log(`✅ Loaded ${loadedTokens.length} tokens for settlement management`);
      
    } catch (error) {
      console.error('Failed to load tokens:', error);
      toast.error('Failed to load marketplace tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleSettleInvoice = async (tokenId: string) => {
    if (!settlementForm.amount) {
      toast.error('Please enter settlement amount');
      return;
    }

    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setProcessing(tokenId);
      
      // Create admin contract instance directly
      const { ADMIN_CONTRACT } = await import('../../../lib/contractAddress');
      const { CONTRACT_ABIS } = await import('../../../lib/contractAbis');
      const { ethers } = await import('ethers');

      const adminContract = new ethers.Contract(ADMIN_CONTRACT, CONTRACT_ABIS.ADMIN, signer);
      
      // Call settlement function directly
      console.log(`🔄 Settling invoice for token ${tokenId} with amount ${settlementForm.amount}...`);
      const tx = await adminContract.settleInvoice(tokenId, ethers.utils.parseEther(settlementForm.amount));
      
      console.log('⏳ Settlement transaction sent:', tx.hash);
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('✅ Settlement transaction confirmed:', receipt.transactionHash);
      
      toast.success('Invoice settled successfully!');
      
      // Refresh tokens
      await loadActiveTokens();
      setSettlementForm({ tokenId: '', amount: '' });
      
    } catch (error: any) {
      console.error('Settlement failed:', error);
      
      let errorMessage = 'Settlement failed';
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.reason) {
        errorMessage = `Transaction failed: ${error.reason}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  const handleBurnTokens = async (tokenId: string) => {
    if (!signer) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setProcessing(tokenId);
      
      // Create admin contract instance directly
      const { ADMIN_CONTRACT } = await import('../../../lib/contractAddress');
      const { CONTRACT_ABIS } = await import('../../../lib/contractAbis');
      const { ethers } = await import('ethers');

      const adminContract = new ethers.Contract(ADMIN_CONTRACT, CONTRACT_ABIS.ADMIN, signer);
      
      // Call burn function directly
      console.log(`🔄 Burning all tokens for token ID ${tokenId}...`);
      const tx = await adminContract.burnAllTokens(tokenId);
      
      console.log('⏳ Burn transaction sent:', tx.hash);
      toast.info('Burn transaction submitted. Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('✅ Burn transaction confirmed:', receipt.transactionHash);
      
      toast.success('Tokens burned successfully!');
      
      // Refresh tokens
      await loadActiveTokens();
      
    } catch (error: any) {
      console.error('Burn failed:', error);
      
      let errorMessage = 'Token burn failed';
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.reason) {
        errorMessage = `Transaction failed: ${error.reason}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setProcessing(null);
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
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const formatPrice = (price: string) => {
    return `${price} FLOW`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Invoice Settlement Panel
        </CardTitle>
        <CardDescription>
          Manually settle invoices and manage token lifecycle
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Settlement Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="tokenId">Token ID</Label>
                <Input
                  id="tokenId"
                  placeholder="Enter token ID"
                  value={settlementForm.tokenId}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, tokenId: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="amount">Settlement Amount (FLOW)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={settlementForm.amount}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => handleSettleInvoice(settlementForm.tokenId)}
                  disabled={!settlementForm.tokenId || !settlementForm.amount || processing !== null}
                  className="w-full"
                >
                  {processing === settlementForm.tokenId ? 'Settling...' : 'Settle Invoice'}
                </Button>
              </div>
            </div>

            {/* Tokens List */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Active Tokens</h3>
              {tokens.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No tokens found</p>
              ) : (
                tokens.map((token) => (
                  <Card key={token.tokenId} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{token.assetName || `Token #${token.tokenId}`}</span>
                            {getLifecycleBadge(token.lifecycle)}
                          </div>
                          <div className="text-sm text-gray-600">
                            <p><strong>Token ID:</strong> {token.tokenId}</p>
                            <p><strong>Issuer:</strong> {token.issuer.slice(0, 10)}...</p>
                            <p><strong>Supply:</strong> {token.supply} tokens</p>
                            <p><strong>Price:</strong> {formatPrice(token.price)}</p>
                            {token.settlementAmount && token.settlementAmount !== '0' && (
                              <p><strong>Settlement:</strong> {formatPrice(token.settlementAmount)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {token.lifecycle === 0 && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSettlementForm(prev => ({ ...prev, tokenId: token.tokenId }));
                              }}
                              disabled={processing !== null}
                            >
                              Select for Settlement
                            </Button>
                          )}
                          {token.lifecycle === 1 && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleBurnTokens(token.tokenId)}
                              disabled={processing !== null}
                            >
                              {processing === token.tokenId ? 'Burning...' : 'Burn Tokens'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceSettlementPanel;