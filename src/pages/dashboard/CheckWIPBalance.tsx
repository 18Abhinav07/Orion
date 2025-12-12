import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useWallet } from '../../context/WalletContext';
import { toast } from 'sonner';
import { Loader2, Wallet, Info } from 'lucide-react';
import { ethers } from 'ethers';

const WIP_TOKEN_ADDRESS = '0x1514000000000000000000000000000000000000';

const CheckWIPBalance: React.FC = () => {
  const { signer, address } = useWallet();
  const [checkAddress, setCheckAddress] = useState('');
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckBalance = async (addrToCheck?: string) => {
    const targetAddress = addrToCheck || checkAddress || address;
    
    if (!targetAddress || !ethers.utils.isAddress(targetAddress)) {
      toast.error('Please enter a valid address');
      return;
    }

    setLoading(true);

    try {
      const WIP_ABI = ['function balanceOf(address account) view returns (uint256)'];
      
      // Use a provider (read-only, no signer needed)
      const provider = signer?.provider || new ethers.providers.JsonRpcProvider('https://aeneid.storyrpc.io');
      const wipContract = new ethers.Contract(WIP_TOKEN_ADDRESS, WIP_ABI, provider);

      console.log('🔍 Checking WIP balance for:', targetAddress);
      
      const balanceWei = await wipContract.balanceOf(targetAddress);
      const balanceFormatted = ethers.utils.formatEther(balanceWei);
      
      console.log('✅ Balance:', balanceFormatted, 'WIP');
      
      setBalance(balanceFormatted);
      toast.success(`Balance: ${balanceFormatted} WIP`);

    } catch (error: any) {
      console.error('Error checking balance:', error);
      toast.error(`Failed to check balance: ${error?.message || 'Unknown error'}`);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Check WIP Balance</h1>
          <p className="text-muted-foreground mt-1">
            Check WIP token balance for any address
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200 text-base flex items-center gap-2">
            <Info className="w-4 h-4" />
            WIP Token Balance Checker
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 dark:text-blue-100">
          <p>
            Check the WIP token balance of any Ethereum address (including IP addresses).
            IP addresses are just regular Ethereum addresses that can hold tokens.
          </p>
        </CardContent>
      </Card>

      {/* Balance Check Form */}
      <Card>
        <CardHeader>
          <CardTitle>Check Balance</CardTitle>
          <CardDescription>
            Enter an address to check its WIP token balance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Ethereum Address</Label>
            <Input
              id="address"
              type="text"
              placeholder={address || "0x..."}
              value={checkAddress}
              onChange={(e) => setCheckAddress(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to check your connected wallet
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => handleCheckBalance()}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Check Balance
                </>
              )}
            </Button>
            
            {address && (
              <Button 
                onClick={() => handleCheckBalance(address)}
                disabled={loading}
                variant="outline"
              >
                Check My Wallet
              </Button>
            )}
          </div>

          {balance !== null && (
            <Card className="bg-green-50 dark:bg-green-950 border-green-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Balance</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {balance} WIP
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {checkAddress || address}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Quick checks:</p>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCheckBalance('0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E')}
                disabled={loading}
                className="w-full justify-start font-mono text-xs"
              >
                Check IP: 0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Token:</span>
            <span className="ml-2 font-medium">WIP (Wrapped IP)</span>
          </div>
          <div>
            <span className="text-muted-foreground">Contract:</span>
            <span className="ml-2 font-mono text-xs">{WIP_TOKEN_ADDRESS}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Network:</span>
            <span className="ml-2">Story Aeneid Testnet</span>
          </div>
          <div className="pt-2 border-t">
            <a 
              href="https://faucet.story.foundation/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Get WIP from Story Faucet →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckWIPBalance;
