// src/services/storyProtocolService.ts

import { ethers } from 'ethers';
// We'll need to define CONTRACT_ADDRESSES or get the address from a config
// For now, hardcode the address from the plan
const ORION_VERIFIED_MINTER_ADDRESS = '0x9cb153775B639DCa50F1BA7a6daa34af12466450';

// OrionVerifiedMinter ABI (just the functions we need)
const ORION_VERIFIED_MINTER_ABI = [
  "function verifyAndMint(address to, bytes32 contentHash, string ipMetadataURI, string nftMetadataURI, uint256 nonce, uint256 expiryTimestamp, bytes signature) returns (address ipId, uint256 tokenId)",
  "function backendVerifier() view returns (address)",
  "function spgNftContract() view returns (address)",
  "function usedNonces(uint256) view returns (bool)"
];

export interface MintResult {
  ipId: string;
  tokenId: number;
  txHash: string;
}

export class StoryProtocolService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contractInstance: ethers.Contract | null = null;
  
  /**
   * Initialize with MetaMask, baby! 🦊
   */
  async initialize(provider: ethers.BrowserProvider) {
    this.provider = provider;
    this.signer = await provider.getSigner();
    this.contractInstance = new ethers.Contract(
      ORION_VERIFIED_MINTER_ADDRESS,
      ORION_VERIFIED_MINTER_ABI,
      this.signer
    );
  }
  
  /**
   * The main event - mint that IP asset! 🎉
   */
  async verifyAndMint(params: {
    contentHash: string;
    ipMetadataURI: string;
    nftMetadataURI: string;
    nonce: number;
    expiryTimestamp: number;
    signature: string;
  }): Promise<MintResult> {
    
    if (!this.signer || !this.contractInstance) {
      throw new Error('Service not initialized. Connect wallet first!');
    }
    
    const userAddress = await this.signer.getAddress();
    
    console.log('🎯 Calling verifyAndMint...');
    console.log('To:', userAddress);
    console.log('Content Hash:', params.contentHash);
    console.log('Nonce:', params.nonce);
    console.log('Expiry:', params.expiryTimestamp);
    
    // Call the contract
    const tx = await this.contractInstance.verifyAndMint(
      userAddress,
      params.contentHash,
      params.ipMetadataURI,
      params.nftMetadataURI,
      params.nonce,
      params.expiryTimestamp,
      params.signature
    );
    
    console.log('📝 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    console.log('✅ Transaction confirmed!');
    
    // Parse events to get ipId and tokenId
    // The OrionVerifiedMinter contract emits an IpAssetMinted event
    // IpAssetMinted(address indexed recipient, address indexed ipId, uint256 indexed tokenId, address signer)
    let ipId = '0x';
    let tokenId = 0;

    for (const log of receipt.logs) {
      try {
        const parsedLog = this.contractInstance.interface.parseLog(log);
        if (parsedLog && parsedLog.name === 'IpAssetMinted') {
          ipId = parsedLog.args.ipId;
          tokenId = parsedLog.args.tokenId.toNumber();
          break;
        }
      } catch (e) {
        // Not all logs will be from this contract or this event, so just ignore parsing errors
      }
    }

    if (ipId === '0x' || tokenId === 0) {
        console.warn("Could not parse IpAssetMinted event from transaction receipt. Returning default values.");
    }
    
    return {
      ipId,
      tokenId,
      txHash: receipt.hash
    };
  }
  
  /**
   * Check if a nonce has been used (anti-replay protection) 🛡️
   */
  async isNonceUsed(nonce: number): Promise<boolean> {
    if (!this.provider || !this.contractInstance) {
      throw new Error('Service not initialized');
    }
    
    return await this.contractInstance.usedNonces(nonce);
  }
  
  /**
   * Get the backend verifier address (for verification) ✅
   */
  async getBackendVerifier(): Promise<string> {
    if (!this.provider || !this.contractInstance) {
      throw new Error('Service not initialized');
    }
    
    return await this.contractInstance.backendVerifier();
  }
}

export const storyProtocolService = new StoryProtocolService();
