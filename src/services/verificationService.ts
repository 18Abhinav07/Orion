// src/services/verificationService.ts

import { ethers } from 'ethers';

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';

export interface MintTokenResponse {
  signature: string;
  nonce: number;
  expiresAt: number;
  expiresIn: number;
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
   * Request backend signature for minting
   * This is your golden ticket, babe! 🎟️
   */
  async generateMintToken(params: {
    creatorAddress: string;
    contentHash: string;
    ipMetadataURI: string;
    nftMetadataURI: string;
  }): Promise<MintTokenResponse> {
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
      
      if (!response.ok) { // Check if response was successful
        throw new Error(result.error?.message || 'Failed to generate mint token');
      }
      
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
}

export const verificationService = new VerificationService();
