import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWallet } from '../../context/WalletContext';
import { AssetTokenSelector } from '../../components/AssetTokenSelector';
import { TradingTerminal } from './TradingTerminal';
import { EnhancedTokenInfo, EnhancedTokenService } from '../../utils/enhancedTokenService';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Loader2, Coins, Wallet, TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const OrderBookPage: React.FC = () => {
  const { address, connectWallet, provider, signer } = useWallet();
  const location = useLocation();
  const [selectedToken, setSelectedToken] = useState<EnhancedTokenInfo | null>(null);
  const [userU2UBalance, setUserU2UBalance] = useState<string>('0');
  const [showTokenSelector, setShowTokenSelector] = useState(true);

  // Check for pre-selected token from navigation state (from dashboard)
  useEffect(() => {
    if (location.state?.selectedToken) {
      const preSelectedToken = location.state.selectedToken;
      
      // Convert the dashboard token format to EnhancedTokenInfo format
      const enhancedToken: EnhancedTokenInfo = {
        id: preSelectedToken.tokenId,
        name: preSelectedToken.name,
        symbol: preSelectedToken.name?.substring(0, 3).toUpperCase() || 'TKN',
        description: preSelectedToken.description || '',
        image: preSelectedToken.image,
        totalSupply: 0, // Will be fetched by TradingTerminal
        userBalance: parseFloat(preSelectedToken.userBalance || '0'),
        isListed: true,
        marketplacePrice: parseFloat(preSelectedToken.marketplacePrice || preSelectedToken.price || '0'),
        exists: true,
        metadata: undefined,
        assetType: preSelectedToken.type || 'real-estate',
        location: 'Unknown',
        valuation: preSelectedToken.price || '0',
        attributes: [],
        lastPrice: parseFloat(preSelectedToken.marketplacePrice || preSelectedToken.price || '0'),
        priceChange24h: '0',
        volume24h: 0
      };
      
      setSelectedToken(enhancedToken);
      setShowTokenSelector(false);
      toast.success(`Selected ${enhancedToken.name} for trading`);
    }
  }, [location.state]);

  // Handle token selection
  const handleTokenSelect = (token: EnhancedTokenInfo) => {
    setSelectedToken(token);
    setShowTokenSelector(false);
    toast.success(`Selected ${token.name} for trading`);
  };

  // Fetch user U2U balance when address changes
  useEffect(() => {
    const fetchU2UBalance = async () => {
      if (!provider || !address) return;

      try {
        const enhancedTokenService = new EnhancedTokenService(provider, signer);
        const balance = await enhancedTokenService.getU2UBalance(address);
        setUserU2UBalance(balance);
      } catch (error) {
        console.error('Error fetching U2U balance:', error);
      }
    };

    fetchU2UBalance();
  }, [provider, signer, address]);

  // If no wallet connected, show connection prompt
  if (!address) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="border border-gray-200 shadow-sm p-8 text-center bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-center text-gray-900">
                <Wallet className="w-6 h-6" />
                Connect Your Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white">
              <p className="text-gray-600 mb-6">
                Connect your wallet to access the premium trading terminal and start trading tokenized assets.
              </p>
              <Button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If no token selected, show asset selector
  if (showTokenSelector || !selectedToken) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
                <BarChart3 className="w-10 h-10 text-blue-600" />
                Open Assets Exchange
              </h1>
              <p className="text-xl text-gray-600">
                Select an asset to begin professional RWA trading
              </p>
              
            </div>
            
            <AssetTokenSelector
              selectedTokenId={selectedToken?.id}
              onTokenSelect={handleTokenSelect}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show the premium trading terminal
  return (
    <>
      <TradingTerminal 
        selectedToken={selectedToken}
        onChangeAsset={() => setShowTokenSelector(true)}
      />
    </>
  );
};

export default OrderBookPage;