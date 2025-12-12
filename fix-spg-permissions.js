/**
 * Enable public minting on SPG collection
 * This allows OrionVerifiedMinter to call mintAndRegisterIp
 */

import { ethers } from 'ethers';

// Configuration
const SPG_ADDRESS = '0x15aAe0E870Aab25B09F4453239967e0aff1868C2';
const OWNER_PRIVATE_KEY = process.env.STORY_PRIVATE_KEY || '0x1d12932a5c3a7aa8d4f50662caa679bb2e53321e11bc5df2af9298e2ace59305';
const RPC_URL = 'https://aeneid.storyrpc.io';

// SPG NFT interface (simplified)
const SPG_ABI = [
  'function setMintOpen(bool mintOpen) external',
  'function setPublicMinting(bool isPublic) external',
  'function isPublicMinting() view returns (bool)',
  'function mintOpen() view returns (bool)',
  'function owner() view returns (address)'
];

async function enablePublicMinting() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const spg = new ethers.Contract(SPG_ADDRESS, SPG_ABI, signer);

  console.log('🔍 Checking current state...');
  console.log('Owner:', await spg.owner());
  console.log('Mint Open:', await spg.mintOpen());
  console.log('Public Minting:', await spg.isPublicMinting());

  console.log('\n📝 Enabling public minting...');
  
  // Enable public minting so wrapper contract can mint
  const tx = await spg.setPublicMinting(true);
  console.log('Transaction sent:', tx.hash);
  
  await tx.wait();
  console.log('✅ Transaction confirmed!');

  console.log('\n🎉 New state:');
  console.log('Public Minting:', await spg.isPublicMinting());
}

enablePublicMinting()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
