// Service to find IP IDs by matching IPFS metadata
import { ethers } from 'ethers';

const SPG_NFT_CONTRACT = import.meta.env.VITE_SPG_NFT_COLLECTION || '0x78AD3d22E62824945DED384a5542Ad65de16E637';
const IP_ASSET_REGISTRY = import.meta.env.VITE_IP_ASSET_REGISTRY || '0x77319B4031e6eF1250907aa00018B8B1c67a244b';
const RPC_URL = import.meta.env.VITE_STORY_RPC_URL || 'https://aeneid.storyrpc.io';

const NFT_ABI = [
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function totalSupply() view returns (uint256)'
];

const IP_REGISTRY_ABI = [
  'function ipId(uint256 chainId, address tokenContract, uint256 tokenId) view returns (address)'
];

/**
 * Find IP ID by matching IPFS CID in NFT metadata
 */
export async function findIpIdByIpfsCid(
  ipfsCid: string,
  ownerAddress: string
): Promise<{ ipId: string; tokenId: number } | null> {
  
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const nftContract = new ethers.Contract(SPG_NFT_CONTRACT, NFT_ABI, provider);
  const ipRegistry = new ethers.Contract(IP_ASSET_REGISTRY, IP_REGISTRY_ABI, provider);
  
  try {
    console.log(`🔍 Searching for IPFS CID: ${ipfsCid} owned by ${ownerAddress}`);
    
    const totalSupply = await nftContract.totalSupply();
    console.log(`📊 Total NFTs minted: ${totalSupply.toString()}`);
    
    // Check each token owned by the user
    for (let i = 1; i <= totalSupply.toNumber(); i++) {
      try {
        const owner = await nftContract.ownerOf(i);
        
        // Only check tokens owned by this user
        if (owner.toLowerCase() !== ownerAddress.toLowerCase()) {
          continue;
        }
        
        console.log(`✓ Checking Token #${i} (owned by user)`);
        
        // Get token URI (NFT metadata)
        const tokenURI = await nftContract.tokenURI(i);
        console.log(`  Token URI: ${tokenURI}`);
        
        // Check if this token URI matches the IPFS CID we're looking for
        // The backend stores the IP metadata CID, which might be in the token's metadata
        if (tokenURI.includes(ipfsCid)) {
          console.log(`✅ MATCH! Token #${i} has matching IPFS CID`);
          
          // Get IP ID for this token
          const chainId = Number(import.meta.env.VITE_STORY_CHAIN_ID || 1315);
          const ipIdAddress = await ipRegistry.ipId(chainId, SPG_NFT_CONTRACT, i);
          
          return {
            ipId: ipIdAddress,
            tokenId: i
          };
        }
        
        // Also try fetching and parsing the metadata JSON
        try {
          const metadataUrl = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          const response = await fetch(metadataUrl);
          const metadata = await response.json();
          
          // Check if the metadata references our IPFS CID anywhere
          const metadataStr = JSON.stringify(metadata).toLowerCase();
          if (metadataStr.includes(ipfsCid.toLowerCase())) {
            console.log(`✅ MATCH in metadata! Token #${i}`);
            
            const chainId = Number(import.meta.env.VITE_STORY_CHAIN_ID || 1315);
            const ipIdAddress = await ipRegistry.ipId(chainId, SPG_NFT_CONTRACT, i);
            
            return {
              ipId: ipIdAddress,
              tokenId: i
            };
          }
        } catch (metadataErr) {
          // Couldn't fetch metadata, continue
          console.log(`  Could not fetch metadata for token #${i}`);
        }
        
      } catch (tokenErr) {
        // Token doesn't exist or error, skip
        continue;
      }
    }
    
    console.log('❌ No matching token found');
    return null;
    
  } catch (err) {
    console.error('Error searching for IP:', err);
    return null;
  }
}

/**
 * Batch lookup IP IDs for multiple backend assets
 */
export async function batchLookupIpIds(
  assets: Array<{ _id: string; ipfsCid: string; creatorWallet: string }>
): Promise<Map<string, { ipId: string; tokenId: number }>> {
  
  const results = new Map();
  
  for (const asset of assets) {
    console.log(`\n🔍 Looking up asset: ${asset._id}`);
    
    const match = await findIpIdByIpfsCid(asset.ipfsCid, asset.creatorWallet);
    
    if (match) {
      results.set(asset._id, match);
      console.log(`✅ Found: ${asset._id} → Token #${match.tokenId}`);
    } else {
      console.log(`❌ Not found: ${asset._id}`);
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}
