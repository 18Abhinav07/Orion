export interface Asset {
  _id: string;
  sha256Hash: string;
  perceptualHash: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  duration?: number;
  ipfsCid: string;
  ipfsUrl: string;
  storyIpId: string | null;
  storyTokenId: number | null;
  licenseTermsId: string | null;
  creatorWallet: string;
  status: 'pending' | 'registered' | 'disputed' | 'rejected';
  isDerivative: boolean;
  parentIpId: string | null;
  highestSimilarityScore: number;
  registeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseTerms {
  licenseTermsId: string;
  type: 'commercial_remix' | 'non_commercial';
  royalty: number;
  currency: string;
}
