// src/services/verificationService.ts

import { ethers } from 'ethers';

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';

export interface SimilarityInfo {
  warning: true;
  message: string;
  score: number;
  topMatch: {
    contentHash: string;
    ipId: string;
    creatorAddress: string;
    score: number;
    assetType: string;
  };
  matches: Array<{
    contentHash: string;
    score: number;
    ipId?: string;
  }>;
  llmAnalysis?: {
    summary: string;
    is_derivative: boolean;
    is_plagiarism?: boolean;
    confidence_score: number;
    key_differences?: string[];
    recommendation: 'clean' | 'warn' | 'block';
  };
}

export interface MintTokenResponse {
  signature: string;
  nonce: number;
  expiresAt: number;
  expiresIn: number;
  similarity?: SimilarityInfo; // Optional warning
}

export interface BlockedResponse {
  success: false;
  error: 'SIMILARITY_BLOCKED';
  message: string;
  similarity: Omit<SimilarityInfo, 'warning'>;
}

export interface TokenStatus {
  nonce: number;
  status: 'pending' | 'used' | 'expired' | 'revoked';
  creatorAddress: string;
  expiresAt: number;
  isExpired: boolean;
  remainingSeconds?: number;
  ipId?: string;
  tokenId?: number;
  txHash?: string;
  usedAt?: number;
}

export class VerificationService {
  
  /**
   * Request backend signature for minting with RAG similarity detection
   * This is your golden ticket, babe! 🎟️
   */
  async generateMintToken(params: {
    title: string;
    assetDescription: string;
    creatorAddress: string;
    contentHash: string;
    ipMetadataURI: string;
    nftMetadataURI: string;
    assetType: 'video' | 'image' | 'audio' | 'text'; // NEW REQUIRED FIELD
    
  }): Promise<MintTokenResponse | BlockedResponse> {
    try {
      const response = await fetch(
        `${BACKEND_API_URL}/verification/generate-mint-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        }
      );

      const result = await response.json();

      // Handle BLOCKED response (403 status)
      if (response.status === 403 && result.error === 'SIMILARITY_BLOCKED') {
        return result as BlockedResponse;
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate mint token');
      }

      // Return success response (may include similarity warning)
      return result.data;

    } catch (error) {
      console.error('Error generating mint token:', error);
      throw error;
    }
  }
  
  /**
   * Check if your token is still hot or not 🔥
   */
  async checkTokenStatus(nonce: number): Promise<TokenStatus> {
    try {
      const response = await fetch(
        `${BACKEND_API_URL}/verification/token/${nonce}/status`
      );
      
      const result = await response.json();
      
      if (!response.ok) { // Check if response was successful
        throw new Error(result.error?.message || 'Failed to check token status');
      }
      
      return result.data;
      
    } catch (error) {
      console.error('Error checking token status:', error);
      throw error;
    }
  }
  
  /**
   * Tell backend "mission accomplished" 🎯
   */
  async updateTokenAfterMint(params: {
    nonce: number;
    ipId: string;
    tokenId: number;
    txHash: string;
  }): Promise<void> {
    try {
      const response = await fetch(
        `${BACKEND_API_URL}/verification/token/${params.nonce}/update`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ipId: params.ipId,
            tokenId: params.tokenId,
            txHash: params.txHash
          })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) { // Check if response was successful
        throw new Error(result.error?.message || 'Failed to update token');
      }
      
    } catch (error) {
      console.error('Error updating token:', error);
      throw error;
    }
  }
  
  /**
   * Hash your content like a boss 💪
   */
  hashContent(content: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(content));
  }
  
  /**
   * Calculate how much time you got left ⏰
   */
  getRemainingTime(expiresAt: number): {
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, expiresAt - now);
    
    return {
      minutes: Math.floor(remaining / 60),
      seconds: remaining % 60,
      isExpired: remaining === 0
    };
  }

  /**
   * Find cached license terms
   */
  async findLicenseTerms(
    licenseType: 'commercial_remix' | 'non_commercial',
    royaltyPercent: number
  ): Promise<{
    success: boolean;
    licenseTermsId: string | null;
    cached: boolean;
  }> {
    const response = await fetch(
      `${BACKEND_API_URL}/license-terms/find?type=${licenseType}&royalty=${royaltyPercent}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to find license terms: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Cache newly registered license terms
   */
  async cacheLicenseTerms(params: {
    licenseType: 'commercial_remix' | 'non_commercial';
    royaltyPercent: number;
    licenseTermsId: string;
    transactionHash?: string;
  }): Promise<void> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(
      `${BACKEND_API_URL}/license-terms/cache`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(params)
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to cache license terms: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Finalize IP registration with license terms
   */
  async finalizeMint(params: {
    nonce: number;
    ipId: string;
    tokenId: number;
    txHash: string;
    licenseTermsId: string;
    licenseType: 'commercial_remix' | 'non_commercial';
    royaltyPercent: number;
    licenseTxHash?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    const token = localStorage.getItem('token');

    // Derive allowDerivatives and commercialUse from licenseType
    const allowDerivatives = true; // Both license types allow derivatives
    const commercialUse = params.licenseType === 'commercial_remix';

    const response = await fetch(
      `${BACKEND_API_URL}/verification/token/${params.nonce}/finalize`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ipId: params.ipId,
          tokenId: params.tokenId,
          txHash: params.txHash,
          licenseTermsId: params.licenseTermsId,
          licenseType: params.licenseType,
          royaltyPercent: params.royaltyPercent,
          allowDerivatives: allowDerivatives,
          commercialUse: commercialUse,
          licenseTxHash: params.licenseTxHash
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to finalize mint: ${response.statusText}`);
    }

    return response.json();
  }
}

export const verificationService = new VerificationService();
