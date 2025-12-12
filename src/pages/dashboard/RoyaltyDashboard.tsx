import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { useWallet } from '../../context/WalletContext';
import { royaltyService } from '../../services/royaltyService';
import { toast } from 'sonner';

const RoyaltyDashboard: React.FC = () => {
  const { signer, provider } = useWallet();
  const [claimableRevenue, setClaimableRevenue] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (signer) {
      fetchClaimableRevenue();
    }
  }, [signer]);

  const fetchClaimableRevenue = async () => {
    if (!signer) return;
    setLoading(true);
    try {
      // TODO: Get IP ID and token address from somewhere
      const ipId = '0x1234567890123456789012345678901234567890'; // Placeholder
      const tokenAddress = '0x0000000000000000000000000000000000000000'; // Placeholder for WIP token
      const revenue = await royaltyService.getClaimableRevenue(
        ipId,
        await signer.getAddress(),
        tokenAddress,
        signer
      );
      setClaimableRevenue(revenue);
    } catch (error) {
      console.error('Error fetching claimable revenue:', error);
      toast.error('Failed to fetch claimable revenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRevenue = async () => {
    if (!signer) return;
    setLoading(true);
    try {
      // TODO: Get IP ID and token address from somewhere
      const ipId = '0x1234567890123456789012345678901234567890'; // Placeholder
      const tokenAddress = '0x0000000000000000000000000000000000000000'; // Placeholder for WIP token
      await royaltyService.claimRevenue(
        ipId,
        await signer.getAddress(),
        tokenAddress,
        signer
      );
      toast.success('Revenue claimed successfully!');
      fetchClaimableRevenue(); // Refresh claimable revenue
    } catch (error) {
      console.error('Error claiming revenue:', error);
      toast.error('Failed to claim revenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Royalty Dashboard</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Claimable Revenue</h2>
        <div className="text-3xl font-bold text-blue-600 mb-4">
          {loading ? 'Loading...' : `${claimableRevenue} WIP`}
        </div>
        <Button onClick={handleClaimRevenue} disabled={loading || claimableRevenue === '0'}>
          {loading ? 'Claiming...' : 'Claim Now'}
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Claim History</h2>
        {/* TODO: Implement claim history */}
        <p className="text-gray-500">Claim history will be displayed here.</p>
      </div>
    </div>
  );
};

export default RoyaltyDashboard;
