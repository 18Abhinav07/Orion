import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useWallet } from '../../context/WalletContext';
import { royaltyService } from '../../services/royaltyService';
import { toast } from 'sonner';
import { Loader2, Coins, Send, FileText } from 'lucide-react';
import { ethers } from 'ethers';

interface LicenseToken {
  _id?: string;
  licenseTokenId?: string;
  tokenId?: string; // The actual license token ID
  ipId: string; // The parent IP we licensed from
  ipName?: string;
  licenseTermsId?: string;
  amount?: number;
  createdAt?: string;
  updatedAt?: string;
}

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';
const ROYALTY_TOKEN_ADDRESS = '0x1514000000000000000000000000000000000000'; // WIP token on Aeneid testnet

const PayRoyalties: React.FC = () => {
  const { signer, address } = useWallet();
  const [licenses, setLicenses] = useState<LicenseToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState<{ [key: string]: string }>({});
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
      // Fetch license tokens minted by this user
      const response = await fetch(`${BACKEND_API_URL}/license-tokens/user/${address}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch license tokens');
      }

      const result = await response.json();
      
      // Handle the actual API response structure: result.data.licenses
      const licenseData: LicenseToken[] = result.data?.licenses || result.licenses || [];
      
      setLicenses(licenseData);
      
      if (licenseData.length === 0) {
        toast.info('No license tokens found. Mint a license token to start using IPs!');
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

  const handlePayRoyalty = async (license: LicenseToken) => {
    if (!signer || !address) return;

    const tokenId = license.tokenId || license.licenseTokenId || license._id || '';
    const amount = paymentAmounts[tokenId];
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setProcessingPayments(prev => ({ ...prev, [tokenId]: true }));

    try {
      const amountInWei = ethers.utils.parseEther(amount).toString();

      console.log('💰 Paying royalty:', {
        from: address,
        toIpId: license.ipId,
        amount: amount,
        tokenAddress: ROYALTY_TOKEN_ADDRESS
      });

      console.warn('⚠️ IMPORTANT: payRoyaltyOnBehalf requires a derivative IP as payer!');
      console.warn('Using the same IP as payer and receiver will NOT credit the vault properly.');
      console.warn('For proper testing, you need to:');
      console.warn('1. Create a derivative IP using this license token');
      console.warn('2. Pay from the derivative IP to the parent IP');
      
      toast.warning('Note: You need a derivative IP to pay royalties. Using same IP as test.');

      // Pay royalty to the parent IP owner
      // NOTE: This is a limitation - Story Protocol requires payer to be a different IP (derivative)
      // Using same IP for testing, but this won't credit vault properly
      await royaltyService.payRoyaltyOnBehalf(
        license.ipId, // Payer IP ID (should be derivative IP in production)
        license.ipId, // Receiver IP ID (the parent IP receiving royalties)
        ROYALTY_TOKEN_ADDRESS,
        amountInWei,
        signer
      );

      toast.info(`Transaction sent! Note: Same IP used as payer/receiver - vault may not be credited.`);
      toast.info(`For proper testing, create a derivative IP first.`);
      
      // Clear the input
      setPaymentAmounts(prev => ({ ...prev, [tokenId]: '' }));
      
    } catch (error: any) {
      console.error('Error paying royalty:', error);
      
      if (error?.message?.includes('insufficient funds')) {
        toast.error('Insufficient WIP tokens. Get testnet tokens from Story faucet.');
      } else if (error?.message?.includes('user rejected')) {
        toast.error('Transaction rejected by user.');
      } else {
        toast.error(`Failed to pay royalty: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setProcessingPayments(prev => ({ ...prev, [tokenId]: false }));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pay Royalties</h1>
          <p className="text-muted-foreground mt-1">
            Pay royalties for the license tokens you've minted
          </p>
        </div>
        <Button 
          onClick={fetchUserLicenses} 
          variant="outline" 
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {/* Important Notice about Royalty Requirements */}
      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle className="text-yellow-800 dark:text-yellow-200 text-base flex items-center gap-2">
            ⚠️ Royalty Payment Requires Derivative IP
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-900 dark:text-yellow-100 space-y-2">
          <p><strong>Important:</strong> Story Protocol requires royalties to be paid from a <strong>derivative IP</strong> to its parent IP.</p>
          <p className="text-xs">Currently, payments use the same IP as both payer and receiver, which completes the transaction but <strong>does not credit the royalty vault</strong>.</p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium">Proper royalty flow (click to expand)</summary>
            <ol className="list-decimal ml-5 mt-2 space-y-1 text-xs">
              <li>Register parent IP and attach license terms</li>
              <li>Mint license token from parent IP (✅ you have these)</li>
              <li><strong>Create derivative IP</strong> using the license token (missing step)</li>
              <li>Pay royalties from derivative IP to parent IP</li>
              <li>Parent IP owner can claim from vault</li>
            </ol>
          </details>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            How Royalties Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            When you mint a license token for an IP, you can use that IP in derivative works.
            Pay royalties to support the original creators and maintain your license in good standing.
            The creator can then claim these royalties from their Royalty Dashboard.
          </p>
        </CardContent>
      </Card>

      {/* License Tokens List */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Your License Tokens
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
              <p className="text-muted-foreground">
                No license tokens found. Visit the marketplace to mint a license token!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {licenses.map((license) => {
              const tokenId = license.tokenId || license.licenseTokenId || license._id || '';
              return (
              <Card key={tokenId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">
                    License Token #{tokenId.slice(-8)}
                  </CardTitle>
                  <CardDescription className="truncate" title={license.ipId}>
                    Parent IP: {license.ipId.slice(0, 10)}...{license.ipId.slice(-8)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`amount-${tokenId}`}>
                      Payment Amount (IP tokens)
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

                  <Button 
                    onClick={() => handlePayRoyalty(license)}
                    disabled={
                      processingPayments[tokenId] ||
                      !paymentAmounts[tokenId] ||
                      parseFloat(paymentAmounts[tokenId]) <= 0
                    }
                    className="w-full"
                  >
                    {processingPayments[tokenId] ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Pay Royalty
                      </>
                    )}
                  </Button>

                  <div className="text-xs text-muted-foreground space-y-1">
                    {license.licenseTermsId && <p>License Terms: {license.licenseTermsId}</p>}
                    {license.amount && <p>Amount: {license.amount}</p>}
                    {license.createdAt && <p>Minted: {new Date(license.createdAt).toLocaleDateString()}</p>}
                  </div>
                </CardContent>
              </Card>
            )})}
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
            Get free testnet IP tokens to pay royalties:
          </p>
          <Button
            variant="outline"
            onClick={() => window.open('https://faucet.story.foundation/', '_blank')}
          >
            Open Story Faucet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayRoyalties;
