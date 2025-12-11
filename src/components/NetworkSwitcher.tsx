import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { NetworkDetectionService, showNetworkWarning } from '../utils/networkDetection';
import { NETWORK_CONFIG, ACTIVE_NETWORK } from '../lib/contractAddress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle, Network, ExternalLink } from 'lucide-react';

interface NetworkSwitcherProps {
  onNetworkSwitched?: () => void;
}

export const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ onNetworkSwitched }) => {
  const { isConnected, chainId } = useWallet();
  const [networkStatus, setNetworkStatus] = useState<{
    isConnected: boolean;
    isCorrectNetwork: boolean;
    currentChainId?: number;
    targetChainId: number;
    networkName: string;
  } | null>(null);
  const [switching, setSwitching] = useState(false);

  const targetNetwork = NETWORK_CONFIG[ACTIVE_NETWORK];

  useEffect(() => {
    const checkNetwork = async () => {
      const status = await NetworkDetectionService.getNetworkStatus();
      setNetworkStatus(status);
    };

    if (isConnected) {
      checkNetwork();
    }
  }, [isConnected, chainId]);

  const handleSwitchNetwork = async () => {
    setSwitching(true);
    try {
      const success = await NetworkDetectionService.checkAndSwitchNetwork();
      if (success && onNetworkSwitched) {
        onNetworkSwitched();
      }
    } catch (error) {
      console.error('Network switch failed:', error);
    } finally {
      setSwitching(false);
    }
  };

  if (!isConnected) {
    return (
      <Alert>
        <Network className="h-4 w-4" />
        <AlertDescription>
          Please connect your wallet to check network status.
        </AlertDescription>
      </Alert>
    );
  }

  if (!networkStatus) {
    return (
      <Alert>
        <Network className="h-4 w-4" />
        <AlertDescription>
          Checking network status...
        </AlertDescription>
      </Alert>
    );
  }

  if (networkStatus.isCorrectNetwork) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Connected to {targetNetwork.name} - ERC-3643 features available
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Network Switch Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-orange-700">Current Network:</span>
            <Badge variant="outline" className="border-orange-300 text-orange-700">
              Chain ID: {networkStatus.currentChainId}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-orange-700">Required Network:</span>
            <Badge className="bg-green-600 text-white">
              {targetNetwork.name} (Chain ID: {targetNetwork.chainId})
            </Badge>
          </div>
        </div>

        <Alert className="border-orange-300 bg-orange-100">
          <AlertDescription className="text-orange-800 text-sm">
            ERC-3643 compliance features require connection to {targetNetwork.name}. 
            Your existing dApp features will continue to work on any network.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleSwitchNetwork}
            disabled={switching}
            className="flex-1"
            variant="default"
          >
            {switching ? 'Switching...' : `Switch to ${targetNetwork.name}`}
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open(targetNetwork.blockExplorer, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Explorer
          </Button>
        </div>

        <div className="text-xs text-orange-600 space-y-1">
          <p><strong>Network Details:</strong></p>
          <p>• RPC URL: {targetNetwork.rpcUrl}</p>
          <p>• Chain ID: {targetNetwork.chainId}</p>
          <p>• Currency: {targetNetwork.nativeCurrency.symbol}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkSwitcher;