// Helper service to fetch IP IDs from Story Protocol
import { ethers } from 'ethers';

const SPG_NFT_CONTRACT = import.meta.env.VITE_SPG_NFT_COLLECTION || '0x78AD3d22E62824945DED384a5542Ad65de16E637';
const IP_ASSET_REGISTRY = import.meta.env.VITE_IP_ASSET_REGISTRY || '0x77319B4031e6eF1250907aa00018B8B1c67a244b';
const RPC_URL = import.meta.env.VITE_STORY_RPC_URL || 'https://aeneid.storyrpc.io';

// Simple ABI for getting IP ID from tokenId
const IP_REGISTRY_ABI = [
  'function ipId(uint256 chainId, address tokenContract, uint256 tokenId) view returns (address)'
];

// NFT ABI to get owner and token URI
const NFT_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)'
];

/**
 * Get IP ID from a token ID
 */
export async function getIpIdFromTokenId(tokenId: number): Promise<string> {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const registry = new ethers.Contract(IP_ASSET_REGISTRY, IP_REGISTRY_ABI, provider);
  
  const chainId = Number(import.meta.env.VITE_STORY_CHAIN_ID || 1315);
  const ipId = await registry.ipId(chainId, SPG_NFT_CONTRACT, tokenId);
  
  return ipId;
}

/**
 * Get IP ID from transaction hash by parsing events
 */
export async function getIpIdFromTxHash(txHash: string): Promise<{ ipId: string; tokenId: number } | null> {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.error('Transaction receipt not found');
    return null;
  }

  // Try to parse IPRegistered event
  const ipRegistryInterface = new ethers.utils.Interface([
    'event IPRegistered(address ipId, uint256 chainId, address tokenContract, uint256 tokenId, string name, string uri, uint256 registrationDate)'
  ]);

  for (const log of receipt.logs) {
    try {
      const parsed = ipRegistryInterface.parseLog(log);
      if (parsed.name === 'IPRegistered') {
        return {
          ipId: parsed.args.ipId,
          tokenId: parsed.args.tokenId.toNumber()
        };
      }
    } catch (e) {
      // Not this event, continue
    }
  }

  // Fallback: look for Transfer event from SPG NFT
  const transferInterface = new ethers.utils.Interface([
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
  ]);

  for (const log of receipt.logs) {
    try {
      if (log.address.toLowerCase() === SPG_NFT_CONTRACT.toLowerCase()) {
        const parsed = transferInterface.parseLog(log);
        if (parsed.name === 'Transfer' && parsed.args.from === ethers.constants.AddressZero) {
          const tokenId = parsed.args.tokenId.toNumber();
          const ipId = await getIpIdFromTokenId(tokenId);
          return { ipId, tokenId };
        }
      }
    } catch (e) {
      // Not this event, continue
    }
  }

  console.warn('Could not find IP registration in transaction logs');
  return null;
}

/**
 * Get all tokens owned by an address
 */
export async function getTokensOwnedBy(address: string): Promise<number[]> {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const nftContract = new ethers.Contract(SPG_NFT_CONTRACT, NFT_ABI, provider);
  
  try {
    const totalSupply = await nftContract.totalSupply();
    const tokens: number[] = [];
    
    // Check each token (this is inefficient for large collections, but works for testing)
    for (let i = 1; i <= totalSupply.toNumber(); i++) {
      try {
        const owner = await nftContract.ownerOf(i);
        if (owner.toLowerCase() === address.toLowerCase()) {
          tokens.push(i);
        }
      } catch (e) {
        // Token doesn't exist or error, skip
      }
    }
    
    return tokens;
  } catch (err) {
    console.error('Error fetching owned tokens:', err);
    return [];
  }
}

/**
 * Get IP IDs for all tokens owned by an address
 */
export async function getIpIdsForAddress(address: string): Promise<Array<{ tokenId: number; ipId: string }>> {
  const tokenIds = await getTokensOwnedBy(address);
  const results = [];
  
  for (const tokenId of tokenIds) {
    try {
      const ipId = await getIpIdFromTokenId(tokenId);
      results.push({ tokenId, ipId });
    } catch (err) {
      console.error(`Error getting IP ID for token ${tokenId}:`, err);
    }
  }
  
  return results;
}
