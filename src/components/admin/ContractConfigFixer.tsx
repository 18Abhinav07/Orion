import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Settings, RefreshCw } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { ethers } from 'ethers';

interface ContractConfig {
  tokenContract: string;
  marketplaceContract: string;
  adminContract: string;
}

const ContractConfigFixer: React.FC = () => {
  const { isConnected, address, signer } = useWallet();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [config, setConfig] = useState<ContractConfig | null>(null);
  const [needsFix, setNeedsFix] = useState(false);

  const CONTRACT_ADDRESSES = {
    PAYMENT_SPLITTER: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91",
    MARKETPLACE: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF",
    TOKEN_CONTRACT: "0x7C082010BcF338675508E2FD9d6C0dD2E43b37d8",
    ADMIN: "0xFC53E7A6b94173D82d07a127A38d9D852bf478d4"
  };

  useEffect(() => {
    if (isConnected && signer) {
      checkConfiguration();
    }
  }, [isConnected, signer]);

  const checkConfiguration = async () => {
    if (!signer) return;

    try {
      setChecking(true);
      
      const paymentSplitterContract = new ethers.Contract(
        CONTRACT_ADDRESSES.PAYMENT_SPLITTER,
        [
          "function tokenContract() external view returns (address)",
          "function marketplaceContract() external view returns (address)",
          "function adminContract() external view returns (address)"
        ],
        signer
      );

      const [tokenContract, marketplaceContract, adminContract] = await Promise.all([
        paymentSplitterContract.tokenContract(),
        paymentSplitterContract.marketplaceContract(),
        paymentSplitterContract.adminContract()
      ]);

      const currentConfig = {
        tokenContract,
        marketplaceContract,
        adminContract
      };

      setConfig(currentConfig);

      // Check if configuration needs fixing
      const tokenNeedsFix = tokenContract === "0x0000000000000000000000000000000000000000";
      const marketplaceNeedsFix = marketplaceContract === "0x0000000000000000000000000000000000000000";
      
      setNeedsFix(tokenNeedsFix || marketplaceNeedsFix);

    } catch (error) {
      console.error('Failed to check configuration:', error);
      toast.error('Failed to check contract configuration');
    } finally {
      setChecking(false);
    }
  };

  const fixConfiguration = async () => {
    if (!signer || !config) return;

    try {
      setLoading(true);
      
      const paymentSplitterContract = new ethers.Contract(
        CONTRACT_ADDRESSES.PAYMENT_SPLITTER,
        [
          "function setTokenContract(address _tokenContract) external",
          "function setMarketplace(address _marketplaceContract) external"
        ],
        signer
      );

      const transactions = [];

      // Fix token contract if needed
      if (config.tokenContract === "0x0000000000000000000000000000000000000000") {
        console.log('Setting token contract...');
        const tx1 = await paymentSplitterContract.setTokenContract(CONTRACT_ADDRESSES.TOKEN_CONTRACT);
        transactions.push({ name: 'Token Contract', tx: tx1 });
      }

      // Fix marketplace contract if needed
      if (config.marketplaceContract === "0x0000000000000000000000000000000000000000") {
        console.log('Setting marketplace contract...');
        const tx2 = await paymentSplitterContract.setMarketplace(CONTRACT_ADDRESSES.MARKETPLACE);
        transactions.push({ name: 'Marketplace Contract', tx: tx2 });
      }

      // Wait for all transactions
      for (const { name, tx } of transactions) {
        console.log(`Waiting for ${name} transaction...`);
        await tx.wait();
        toast.success(`${name} configured successfully`);
      }

      // Refresh configuration
      await checkConfiguration();
      toast.success('PaymentSplitter configuration fixed successfully!');

    } catch (error: any) {
      console.error('Failed to fix configuration:', error);
      
      if (error.message.includes("user rejected")) {
        toast.error("Transaction rejected by user");
      } else if (error.message.includes("insufficient funds")) {
        toast.error("Insufficient FLOW for gas fees");
      } else if (error.code === "UNAUTHORIZED") {
        toast.error("Unauthorized: Only contract owner can perform this action");
      } else {
        toast.error("Failed to fix configuration: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Contract Configuration Fixer
          </CardTitle>
          <CardDescription>Fix PaymentSplitter contract configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-gray-500">Please connect your wallet to check contract configuration</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Contract Configuration Fixer
        </CardTitle>
        <CardDescription>
          Fix PaymentSplitter contract configuration to enable settlement transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Configuration Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Configuration Status</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={checkConfiguration}
              disabled={checking}
            >
              {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </Button>
          </div>

          {config && (
            <div className="space-y-3">
              {/* Token Contract */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Token Contract</p>
                  <p className="text-sm text-gray-600 font-mono">{config.tokenContract}</p>
                </div>
                {config.tokenContract === "0x0000000000000000000000000000000000000000" ? (
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Not Set
                  </Badge>
                ) : (
                  <Badge variant="default">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                )}
              </div>

              {/* Marketplace Contract */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Marketplace Contract</p>
                  <p className="text-sm text-gray-600 font-mono">{config.marketplaceContract}</p>
                </div>
                {config.marketplaceContract === "0x0000000000000000000000000000000000000000" ? (
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Not Set
                  </Badge>
                ) : (
                  <Badge variant="default">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                )}
              </div>

              {/* Admin Contract */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Admin Contract</p>
                  <p className="text-sm text-gray-600 font-mono">{config.adminContract}</p>
                </div>
                <Badge variant="default">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Configured
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Fix Configuration */}
        {needsFix && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="space-y-2">
                <p className="text-yellow-800 font-medium">Configuration Issue Detected</p>
                <p className="text-yellow-700 text-sm">
                  The PaymentSplitter contract is missing required contract addresses. 
                  This prevents settlement transactions from working properly.
                </p>
                <Button
                  onClick={fixConfiguration}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {loading ? "Fixing..." : "Fix Configuration"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!needsFix && config && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-medium">Configuration OK</p>
                <p className="text-green-700 text-sm">
                  PaymentSplitter contract is properly configured. Settlement transactions should work correctly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expected Configuration */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Expected Configuration</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Token Contract:</span>
              <span className="ml-2 font-mono text-gray-600">{CONTRACT_ADDRESSES.TOKEN_CONTRACT}</span>
            </div>
            <div>
              <span className="font-medium">Marketplace Contract:</span>
              <span className="ml-2 font-mono text-gray-600">{CONTRACT_ADDRESSES.MARKETPLACE}</span>
            </div>
            <div>
              <span className="font-medium">Admin Contract:</span>
              <span className="ml-2 font-mono text-gray-600">{CONTRACT_ADDRESSES.ADMIN}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractConfigFixer;