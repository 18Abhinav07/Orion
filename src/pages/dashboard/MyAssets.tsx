import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useWallet } from '../../context/WalletContext';
import { toast } from 'sonner';
import { Loader2, Send, Info, ArrowLeft, Wallet } from 'lucide-react';
import { ethers } from 'ethers';
import HeroBackground from '../../components/HeroBackground';

interface LicenseToken {
  _id?: string;
  licenseTokenId?: string;
  tokenId?: string;
  ipId: string;
  ipName?: string;
  licenseTermsId?: string;
  amount?: number;
  createdAt?: string;
  updatedAt?: string;
}

const TOKENS = {
  WIP: {
    address: '0x1514000000000000000000000000000000000000',
    name: 'WIP',
    symbol: 'WIP'
  },
  MERC20: {
    address: '0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E',
    name: 'MERC20',
    symbol: 'MERC20'
  }
};

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';

const MyAssets: React.FC = () => {
  const navigate = useNavigate();
  const { signer, address } = useWallet();
  const [licenses, setLicenses] = useState<LicenseToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState<{ [key: string]: string }>({});
  const [selectedTokens, setSelectedTokens] = useState<{ [key: string]: 'WIP' | 'MERC20' }>({});
  const [processingPayments, setProcessingPayments] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (signer && address) {
      fetchUserLicenses();
    }
  }, [signer, address]);

  const fetchUserLicenses = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_API_URL}/license-tokens/user/${address}`);

      if (!response.ok) {
        throw new Error('Failed to fetch license tokens');
      }

      const result = await response.json();
      const licenseData: LicenseToken[] = result.data?.licenses || result.licenses || [];

      setLicenses(licenseData);

      // Initialize default token selection for each license
      const defaultTokens: { [key: string]: 'WIP' | 'MERC20' } = {};
      licenseData.forEach(license => {
        const tokenId = license.tokenId || license.licenseTokenId || license._id || '';
        defaultTokens[tokenId] = 'MERC20';
      });
      setSelectedTokens(defaultTokens);

      if (licenseData.length === 0) {
        toast.info('No license tokens found. Visit the marketplace to mint a license token!');
      }
    } catch (error) {
      console.error('Error fetching license tokens:', error);
      toast.error('Failed to fetch your license tokens.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAmountChange = (tokenId: string, value: string) => {
    setPaymentAmounts(prev => ({
      ...prev,
      [tokenId]: value
    }));
  };

  const handleTokenSelectionChange = (tokenId: string, value: 'WIP' | 'MERC20') => {
    setSelectedTokens(prev => ({
      ...prev,
      [tokenId]: value
    }));
  };

  const handlePayRoyalty = async (license: LicenseToken) => {
    if (!signer || !address) {
      toast.error('Please connect your wallet to pay royalties.');
      return;
    }

    const tokenId = license.tokenId || license.licenseTokenId || license._id || '';
    const amount = paymentAmounts[tokenId];
    const selectedToken = selectedTokens[tokenId] || 'MERC20';

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setProcessingPayments(prev => ({ ...prev, [tokenId]: true }));

    try {
      const tokenConfig = TOKENS[selectedToken];

      // ERC20 Token contract ABI
      const ERC20_ABI = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const tokenContract = new ethers.Contract(tokenConfig.address, ERC20_ABI, signer);

      // Get decimals
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.utils.parseUnits(amount, decimals);

      // Check balance
      const balance = await tokenContract.balanceOf(address);
      if (balance.lt(amountInWei)) {
        toast.error(`Insufficient ${tokenConfig.symbol} balance. You have ${ethers.utils.formatUnits(balance, decimals)} ${tokenConfig.symbol}`);
        setProcessingPayments(prev => ({ ...prev, [tokenId]: false }));
        return;
      }

      console.log(`💰 Sending ${tokenConfig.symbol} royalty payment:`, {
        from: address,
        to: license.ipId,
        amount: amount,
        token: tokenConfig.address
      });

      toast.info('Please approve the transaction in your wallet...');

      // Direct transfer to IP address
      const tx = await tokenContract.transfer(license.ipId, amountInWei);

      toast.info('Transaction sent! Waiting for confirmation...');
      console.log('📝 Transaction hash:', tx.hash);

      await tx.wait();

      toast.success(`Successfully paid ${amount} ${tokenConfig.symbol} as royalty!`);

      // Clear the input
      setPaymentAmounts(prev => ({ ...prev, [tokenId]: '' }));

    } catch (error: any) {
      console.error('Error paying royalty:', error);

      if (error?.code === 4001 || error?.message?.includes('user rejected')) {
        toast.error('Transaction rejected by user.');
      } else if (error?.message?.includes('insufficient funds')) {
        toast.error(`Insufficient ${selectedTokens[tokenId]} tokens. Get testnet tokens from Story faucet.`);
      } else {
        toast.error(`Failed to pay royalty: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setProcessingPayments(prev => ({ ...prev, [tokenId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <HeroBackground />

      <div className="container mx-auto p-6 space-y-6 relative z-10">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/marketplace')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Marketplace
            </Button>
            <div>
              <h1 className="text-3xl font-bold">My Licensed Assets</h1>
              <p className="text-muted-foreground mt-1">
                Manage and pay royalties for your licensed IP assets
              </p>
            </div>
          </div>
          <Button
            onClick={fetchUserLicenses}
            variant="outline"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔄 Refresh'}
          </Button>
        </div>

        {/* Info Card */}
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200 text-base flex items-center gap-2">
              <Info className="w-4 h-4" />
              How Royalty Payments Work
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
            <p>
              When you license an IP asset, you can use it in your derivative works. Pay royalties directly to the IP owner to support creators and maintain your license in good standing.
            </p>
            <p>
              <strong>Payment Options:</strong> You can pay royalties using WIP or MERC20 tokens. The tokens are sent directly to the IP owner's wallet.
            </p>
            <p className="text-xs mt-2">
              Need testnet tokens? Get them from the <a href="https://faucet.story.foundation/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Story Faucet</a>.
            </p>
          </CardContent>
        </Card>

        {/* License Tokens List */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Your Licensed IP Assets ({licenses.length})
          </h2>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : licenses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">No Licensed Assets Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Visit the marketplace to mint a license token and start using IP assets!
                </p>
                <Button
                  onClick={() => navigate('/marketplace')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Go to Marketplace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {licenses.map((license) => {
                const tokenId = license.tokenId || license.licenseTokenId || license._id || '';
                const selectedToken = selectedTokens[tokenId] || 'MERC20';
                return (
                  <Card key={tokenId} className="hover:shadow-xl transition-shadow border-2">
                    <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>License #{tokenId.slice(-8)}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {license.createdAt && new Date(license.createdAt).toLocaleDateString()}
                        </span>
                      </CardTitle>
                      <CardDescription className="truncate" title={license.ipId}>
                        <span className="font-semibold">IP:</span> {license.ipId.slice(0, 10)}...{license.ipId.slice(-8)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      {/* Token Selection */}
                      <div className="space-y-2">
                        <Label htmlFor={`token-${tokenId}`}>
                          Payment Token
                        </Label>
                        <Select
                          value={selectedToken}
                          onValueChange={(value: 'WIP' | 'MERC20') => handleTokenSelectionChange(tokenId, value)}
                        >
                          <SelectTrigger id={`token-${tokenId}`}>
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WIP">WIP Token</SelectItem>
                            <SelectItem value="MERC20">MERC20 Token</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Payment Amount */}
                      <div className="space-y-2">
                        <Label htmlFor={`amount-${tokenId}`}>
                          Payment Amount ({selectedToken})
                        </Label>
                        <Input
                          id={`amount-${tokenId}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.1"
                          value={paymentAmounts[tokenId] || ''}
                          onChange={(e) => handlePaymentAmountChange(tokenId, e.target.value)}
                          disabled={processingPayments[tokenId]}
                        />
                      </div>

                      {/* Pay Button */}
                      <Button
                        onClick={() => handlePayRoyalty(license)}
                        disabled={
                          processingPayments[tokenId] ||
                          !paymentAmounts[tokenId] ||
                          parseFloat(paymentAmounts[tokenId]) <= 0
                        }
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        {processingPayments[tokenId] ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Pay {paymentAmounts[tokenId] || '0'} {selectedToken}
                          </>
                        )}
                      </Button>

                      {/* Additional Info */}
                      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                        {license.licenseTermsId && (
                          <p className="truncate" title={license.licenseTermsId}>
                            <strong>License Terms:</strong> {license.licenseTermsId.slice(0, 10)}...
                          </p>
                        )}
                        {license.amount && <p><strong>Amount:</strong> {license.amount}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Helpful Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Need Testnet Tokens?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get free testnet tokens to pay royalties:
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => window.open('https://faucet.story.foundation/', '_blank')}
              >
                Get WIP Tokens
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://faucet.story.foundation/', '_blank')}
              >
                Get MERC20 Tokens
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyAssets;
