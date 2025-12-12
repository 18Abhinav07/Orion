import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export interface LicensedIp {
    nonce: number;
    ipId: string;
    tokenId: number;
    creatorAddress: string;
    contentHash: string;
    status: string;
    metadata: {
        ipMetadataURI: string;
        nftMetadataURI: string;
    };
    license: {
        licenseTermsId: string;
        licenseTxHash: string;
        licenseAttachedAt: number;
    };
    registeredAt: number;
}

export const marketplaceService = {
  async getLicensedIps(commercialUse?: boolean, maxRoyalty?: number, licenseType?: string): Promise<LicensedIp[]> {
    try {
      const params = new URLSearchParams();
      if (commercialUse !== undefined) {
        params.append('commercialUse', String(commercialUse));
      }
      if (maxRoyalty !== undefined) {
        params.append('maxRoyalty', String(maxRoyalty));
      }
      if (licenseType) {
        params.append('licenseType', licenseType);
      }

      const response = await axios.get(`${API_BASE_URL}/marketplace/licensed`, { params });
      console.log('📡 Backend response:', response.data);
      
      // The backend returns data under data.ips
      const ips = response.data?.data?.ips || [];
      console.log(`✅ Extracted ${ips.length} licensed IPs from backend`);
      
      return ips;
    } catch (error) {
      console.error('Error fetching licensed IPs:', error);
      return [];
    }
  },
};
