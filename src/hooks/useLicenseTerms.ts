import { useQuery } from '@tanstack/react-query';
import { LicenseTerms } from '../types/asset';

// Mock data for license terms
const mockLicenseTerms: LicenseTerms[] = [
  {
    licenseTermsId: '1',
    type: 'commercial_remix',
    royalty: 10,
    currency: 'ETH',
  },
  {
    licenseTermsId: '2',
    type: 'non_commercial',
    royalty: 0,
    currency: 'ETH',
  },
  {
    licenseTermsId: '55',
    type: 'commercial_remix',
    royalty: 15,
    currency: 'USDC',
  },
];

export const useLicenseTerms = () => {
  return useQuery<LicenseTerms[]>({
    queryKey: ['licenseTerms'],
    queryFn: async () => {
      // In a real application, you would fetch this from an API
      return Promise.resolve(mockLicenseTerms);
    },
    staleTime: Infinity, // These are unlikely to change often
  });
};
