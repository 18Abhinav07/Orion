import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

export const useAttachLicense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      licenseTermsId,
    }: {
      assetId: string;
      licenseTermsId: string;
    }) => {
      const { data } = await apiClient.post(
        '/story/attach-license-to-asset',
        { assetId, licenseTermsId }
      );
      return data.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch user assets
      queryClient.invalidateQueries({ queryKey: ['userAssets'] });
      queryClient.invalidateQueries({
        queryKey: ['asset', variables.assetId]
      });
    },
  });
};
