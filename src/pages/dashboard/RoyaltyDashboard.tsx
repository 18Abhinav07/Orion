import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useWallet } from '../../context/WalletContext';
import { royaltyService } from '../../services/royaltyService';
import { toast } from 'sonner';
import { Loader2, Coins, TrendingUp } from 'lucide-react';
import { ethers } from 'ethers';

interface IPAsset {
  ipId: string;
  tokenId: number;
  contentHash: string;
  ipMetadataURI: string;
  createdAt: string;
  claimableRevenue?: string;
  walletBalance?: string; // Direct wallet balance (not vault)
  loading?: boolean;
}

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';
const ROYALTY_TOKEN_ADDRESS = '0x1514000000000000000000000000000000000000'; // WIP token on Aeneid testnet
const MERC20_TOKEN_ADDRESS = '0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E'; // MERC20 token on Aeneid testnet

const RoyaltyDashboard: React.FC = () => {
  const { signer, address } = useWallet();
  const [assets, setAssets] = useState<IPAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState('0');

  useEffect(() => {
    if (signer && address) {
      fetchUserAssets();
    }
  }, [signer, address]);

  const fetchUserAssets = async () => {
    if (!address) return;
    setLoading(true);
    try {
      // Fetch user's registered IP assets from backend
      const response = await fetch(`${BACKEND_API_URL}/verification/user/${address}/assets`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      const result = await response.json();
      
      // Check if we have data.assets or assets directly
      const assetsArray = result.data?.assets || result.assets || [];
      
      // Helper to validate Ethereum address format
      const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
      
      // Filter and map assets - looking for storyIpId field with valid full addresses
      // Only include IPs with license terms attached (they can earn royalties)
      const userAssets: IPAsset[] = assetsArray
        .filter((asset: any) => {
          const hasIpId = asset.storyIpId && isValidAddress(asset.storyIpId);
          const hasValidStatus = asset.status === 'registered' || asset.status === 'used';
          const hasLicense = asset.licenseTermsId || asset.licenseTxHash; // Only IPs with licenses can earn royalties
          return hasIpId && hasValidStatus && hasLicense;
        })
        .map((asset: any) => ({
          ipId: asset.storyIpId,
          tokenId: asset.storyTokenId,
          contentHash: asset.sha256Hash,
          ipMetadataURI: asset.ipfsUrl,
          createdAt: asset.createdAt,
          claimableRevenue: '0',
          loading: true
        }));

      setAssets(userAssets);

      // Fetch royalty data for each asset
      if (userAssets.length > 0) {
        await fetchRoyaltiesForAssets(userAssets);
      } else {
        toast.info('No registered IP assets found. Register an asset to start earning royalties!');
      }
    } catch (error) {
      console.error('Error fetching user assets:', error);
      toast.error('Failed to fetch your IP assets.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoyaltiesForAssets = async (userAssets: IPAsset[]) => {
    if (!signer || !address) return;

    let total = ethers.BigNumber.from(0);
    
    // ERC20 ABI for checking balances
    const ERC20_ABI = ['function balanceOf(address account) view returns (uint256)'];
    const provider = signer.provider;

    for (const asset of userAssets) {
      try {
        console.log('🔍 Querying claimable revenue for:', {
          ipId: asset.ipId,
          claimer: address,
          token: ROYALTY_TOKEN_ADDRESS
        });
        
        // Query Story Protocol vault balance
        const revenue = await royaltyService.getClaimableRevenue(
          asset.ipId,
          address,
          ROYALTY_TOKEN_ADDRESS,
          signer
        );

        console.log('✅ Vault claimable revenue:', {
          ipId: asset.ipId,
          revenue: revenue,
          formatted: ethers.utils.formatEther(revenue)
        });
        
        // Also check direct wallet balance (MERC20)
        let walletBalance = '0';
        try {
          const merc20Contract = new ethers.Contract(MERC20_TOKEN_ADDRESS, ERC20_ABI, provider);
          const balance = await merc20Contract.balanceOf(asset.ipId);
          walletBalance = balance.toString();
          console.log('💰 Direct wallet balance (MERC20):', {
            ipId: asset.ipId,
            balance: ethers.utils.formatEther(balance)
          });
        } catch (balanceError) {
          console.log('Could not fetch wallet balance:', balanceError);
        }

        // Update individual asset revenue
        setAssets(prev => prev.map(a => 
          a.ipId === asset.ipId 
            ? { ...a, claimableRevenue: revenue, walletBalance, loading: false }
            : a
        ));

        // Add to total
        total = total.add(ethers.BigNumber.from(revenue));
      } catch (error: any) {
        // Check if it's a "no royalty vault" error - this is normal for IPs without royalties yet
        const isNoVault = error?.message?.includes('is not registered') || 
                          error?.message?.includes('royalty vault');
        
        if (isNoVault) {
          console.log(`ℹ️ IP ${asset.ipId} has no royalty vault yet (no royalties earned)`);
        } else {
          console.error(`Error fetching royalty for IP ${asset.ipId}:`, error);
        }
        
        // Still try to get wallet balance even if vault query fails
        let walletBalance = '0';
        try {
          const merc20Contract = new ethers.Contract(MERC20_TOKEN_ADDRESS, ERC20_ABI, provider);
          const balance = await merc20Contract.balanceOf(asset.ipId);
          walletBalance = balance.toString();
        } catch (balanceError) {
          // Ignore
        }
        
        // Set to 0 either way
        setAssets(prev => prev.map(a => 
          a.ipId === asset.ipId 
            ? { ...a, claimableRevenue: '0', walletBalance, loading: false }
            : a
        ));
      }
    }

    setTotalRevenue(ethers.utils.formatEther(total));
  };


  const handleClaimRevenue = async (asset: IPAsset) => {
    if (!signer || !address) return;
    
    const claimableAmount = asset.claimableRevenue || '0';
    if (ethers.BigNumber.from(claimableAmount).eq(0)) {
      toast.warning('No claimable royalties for this IP.');
      return;
    }
    
    setAssets(prev => prev.map(a => 
      a.ipId === asset.ipId ? { ...a, loading: true } : a
    ));

    try {
      console.log('💎 Claiming revenue:', {
        ipId: asset.ipId,
        claimer: address,
        amount: ethers.utils.formatEther(claimableAmount),
        tokenAddress: ROYALTY_TOKEN_ADDRESS
      });
      
      await royaltyService.claimRevenue(
        asset.ipId,
        address,
        ROYALTY_TOKEN_ADDRESS,
        signer
      );
      
      toast.success(`Successfully claimed ${ethers.utils.formatEther(claimableAmount)} WIP tokens!`);
      
      // Refresh royalty data
      await fetchRoyaltiesForAssets(assets);
    } catch (error: any) {
      console.error('Error claiming revenue:', error);
      
      if (error?.message?.includes('user rejected')) {
        toast.error('Transaction rejected by user.');
      } else if (error?.message?.includes('not registered') || error?.message?.includes('vault')) {
        toast.error('This IP has no royalty vault. Royalties may need time to settle.');
      } else {
        toast.error(`Failed to claim revenue: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setAssets(prev => prev.map(a => 
        a.ipId === asset.ipId ? { ...a, loading: false } : a
      ));
    }
  };

  const handleClaimAll = async () => {
    const claimableAssets = assets.filter(a => 
      a.claimableRevenue && ethers.BigNumber.from(a.claimableRevenue).gt(0)
    );

    if (claimableAssets.length === 0) {
      toast.warning('No claimable royalties available.');
      return;
    }

    setLoading(true);
    
    for (const asset of claimableAssets) {
      await handleClaimRevenue(asset);
    }

    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Royalty Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track and claim royalties from your registered IP assets
          </p>
        </div>
        <Button 
          onClick={fetchUserAssets} 
          variant="outline" 
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {/* Total Revenue Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-blue-600" />
            Total Claimable Revenue
          </CardTitle>
          <CardDescription>Across all your IP assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-4xl font-bold text-blue-600">
                {loading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  `${parseFloat(totalRevenue).toFixed(6)} IP`
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {assets.length} registered assets
              </p>
            </div>
            <Button 
              onClick={handleClaimAll}
              disabled={loading || parseFloat(totalRevenue) === 0}
              size="lg"
            >
              Claim All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Assets */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Your IP Assets
        </h2>
        
        {loading && assets.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : assets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                No IP assets found. Register your first IP asset to start earning royalties!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <Card key={asset.ipId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base truncate" title={asset.ipId}>
                    IP Asset #{asset.tokenId}
                  </CardTitle>
                  <CardDescription className="truncate" title={asset.ipId}>
                    {asset.ipId.slice(0, 10)}...{asset.ipId.slice(-8)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Vault Balance (WIP)</p>
                      <p className="text-xl font-bold text-green-600">
                        {asset.loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          `${ethers.utils.formatEther(asset.claimableRevenue || '0')} WIP`
                        )}
                      </p>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Wallet Balance (MERC20)</p>
                      <p className="text-xl font-bold text-blue-600">
                        {asset.loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          `${ethers.utils.formatEther(asset.walletBalance || '0')} MERC20`
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Direct payments sent to this IP
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => handleClaimRevenue(asset)}
                    disabled={
                      asset.loading || 
                      !asset.claimableRevenue ||
                      ethers.BigNumber.from(asset.claimableRevenue).eq(0)
                    }
                    className="w-full"
                  >
                    {asset.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Claim from Vault'
                    )}
                  </Button>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Registered: {new Date(asset.createdAt).toLocaleDateString()}</p>
                    <p className="truncate" title={asset.contentHash}>
                      Hash: {asset.contentHash.slice(0, 12)}...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoyaltyDashboard;
