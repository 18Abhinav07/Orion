
import { useQuery } from '@tanstack/react-query';
import { Asset } from '../types/asset';
import apiClient from '../lib/apiClient';

interface UseUserAssetsOptions {
  walletAddress: string;
  status?: 'pending' | 'registered' | 'disputed' | 'rejected';
  page?: number;
  limit?: number;
}

interface UserAssetsResponse {
  assets: Asset[];
  summary: {
    total: number;
    minted: number;
    pending: number;
    disputed: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const useUserAssets = ({
  walletAddress,
  status,
  page = 1,
  limit = 50,
}: UseUserAssetsOptions) => {
  return useQuery<UserAssetsResponse>({
    queryKey: ['userAssets', walletAddress, status, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const { data } = await apiClient.get(
        `/assets/wallet/${walletAddress}?${params}`
      );
      return data.data;
    },
    enabled: !!walletAddress,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};
