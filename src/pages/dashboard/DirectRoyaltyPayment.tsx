import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useWallet } from '../../context/WalletContext';
import { toast } from 'sonner';
import { Loader2, Send, Info } from 'lucide-react';
import { ethers } from 'ethers';

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

const ROYALTY_MODULE_ADDRESS = '0xd2f60c40febccf6311f8b47c4f2ec6b040400086'; // Story Protocol RoyaltyModule

const DirectRoyaltyPayment: React.FC = () => {
  const { signer, address } = useWallet();
  const [ipId, setIpId] = useState('0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<'WIP' | 'MERC20'>('MERC20');
  const [processing, setProcessing] = useState(false);

  const handleDirectPayment = async () => {
    if (!signer || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!ipId || !ethers.utils.isAddress(ipId)) {
      toast.error('Please enter a valid IP address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);

    try {
      const tokenConfig = TOKENS[selectedToken];
      
      // ERC20 Token contract ABI (minimal for transfer)
      const ERC20_ABI = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address account) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)'
      ];

      const tokenContract = new ethers.Contract(tokenConfig.address, ERC20_ABI, signer);
      
      // Get decimals (most tokens use 18, but check to be sure)
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.utils.parseUnits(amount, decimals);

      // Check balance
      const balance = await tokenContract.balanceOf(address);
      if (balance.lt(amountInWei)) {
        toast.error(`Insufficient ${tokenConfig.symbol} balance. You have ${ethers.utils.formatUnits(balance, decimals)} ${tokenConfig.symbol}`);
        setProcessing(false);
        return;
      }

      console.log(`💰 Sending direct ${tokenConfig.symbol} transfer:`, {
        from: address,
        to: ipId,
        amount: amount,
        amountWei: amountInWei.toString(),
        token: tokenConfig.address
      });

      toast.info('Please approve the transaction in MetaMask...');

      // Direct transfer to IP address
      const tx = await tokenContract.transfer(ipId, amountInWei);
      
      toast.info('Transaction sent! Waiting for confirmation...');
      console.log('📝 Transaction hash:', tx.hash);

      await tx.wait();

      toast.success(`Successfully sent ${amount} ${tokenConfig.symbol} to IP ${ipId.slice(0, 10)}...${ipId.slice(-8)}!`);
      toast.info('The IP owner can now claim these tokens from their dashboard.');
      
      // Clear the input
      setAmount('');

    } catch (error: any) {
      console.error(`Error sending ${selectedToken}:`, error);
      
      if (error?.code === 4001 || error?.message?.includes('user rejected')) {
        toast.error('Transaction rejected by user.');
      } else if (error?.message?.includes('insufficient funds')) {
        toast.error(`Insufficient ${selectedToken} tokens. Get testnet tokens from Story faucet.`);
      } else {
        toast.error(`Failed to send ${selectedToken}: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Direct Royalty Payment</h1>
          <p className="text-muted-foreground mt-1">
            Send tokens directly to an IP address for testing
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200 text-base flex items-center gap-2">
            <Info className="w-4 h-4" />
            Testing Mode - Direct Token Transfer
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
          <p>
            This sends tokens (WIP or MERC20) directly to an IP address (which is just an Ethereum address).
          </p>
          <p>
            <strong>Note:</strong> This bypasses Story Protocol's royalty vault system but lets you test
            the wallet balance. The IP owner will receive tokens directly in their wallet.
          </p>
          <p className="text-xs mt-2">
            For production royalty flows, use the proper derivative IP → parent IP payment system.
          </p>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Tokens</CardTitle>
          <CardDescription>
            Transfer tokens directly to an IP address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Token</Label>
            <Select value={selectedToken} onValueChange={(value: 'WIP' | 'MERC20') => setSelectedToken(value)}>
              <SelectTrigger id="token">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WIP">WIP - 0x1514...0000</SelectItem>
                <SelectItem value="MERC20">MERC20 - 0xF210...E38E</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose which token to send as royalty payment
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipId">Recipient IP Address</Label>
            <Input
              id="ipId"
              type="text"
              placeholder="0x..."
              value={ipId}
              onChange={(e) => setIpId(e.target.value)}
              disabled={processing}
            />
            <p className="text-xs text-muted-foreground">
              The Ethereum address of the IP that will receive the tokens
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({selectedToken} tokens)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={processing}
            />
            <p className="text-xs text-muted-foreground">
              Amount of {selectedToken} tokens to send (e.g., 0.1)
            </p>
          </div>

          <Button 
            onClick={handleDirectPayment}
            disabled={processing || !ipId || !amount || parseFloat(amount) <= 0}
            className="w-full"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send {amount || '0'} {selectedToken}
              </>
            )}
          </Button>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Need testnet tokens?</p>
            <div className="space-y-1">
              <a 
                href="https://faucet.story.foundation/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline block"
              >
                Get WIP from Story Aeneid Testnet Faucet →
              </a>
              <a 
                href="https://faucet.story.foundation/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline block"
              >
                Mint MERC20 from Story Faucet →
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Wallet Info */}
      {address && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono">
              {address}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DirectRoyaltyPayment;
