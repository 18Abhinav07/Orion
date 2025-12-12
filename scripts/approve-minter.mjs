import { ethers } from 'ethers';
import 'dotenv/config';

const RPC_URL = 'https://aeneid.storyrpc.io';
const SPG_NFT_CONTRACT = '0x78AD3d22E62824945DED384a5542Ad65de16E637';
const ORION_VERIFIED_MINTER = '0x1B014A3a16E5AF7D1207646f35AFD2b08535c1EB';
const OWNER_PRIVATE_KEY = process.env.STORY_PRIVATE_KEY;

// SPG NFT ABI (functions we might need)
const SPG_NFT_ABI = [
  "function setMinter(address minter) external",
  "function approveMinter(address minter) external",
  "function setMintOpen(bool open) external",
  "function owner() view returns (address)",
  "function minters(address) view returns (bool)",
  "function mintOpen() view returns (bool)"
];

async function main() {
  console.log('\n🔧 Approving OrionVerifiedMinter as authorized minter\n');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

  console.log('Owner address:', ownerWallet.address);
  console.log('SPG NFT Contract:', SPG_NFT_CONTRACT);
  console.log('OrionVerifiedMinter:', ORION_VERIFIED_MINTER);
  console.log('');

  const spgNft = new ethers.Contract(SPG_NFT_CONTRACT, SPG_NFT_ABI, ownerWallet);

  // Check current state
  try {
    const owner = await spgNft.owner();
    console.log('Current owner:', owner);
    console.log('Owner matches?:', owner.toLowerCase() === ownerWallet.address.toLowerCase());
    console.log('');
  } catch (e) {
    console.log('Could not check owner:', e.message);
  }

  // Check if mintOpen
  try {
    const mintOpen = await spgNft.mintOpen();
    console.log('Mint open?:', mintOpen);

    if (!mintOpen) {
      console.log('Opening mint...');
      const tx = await spgNft.setMintOpen(true);
      await tx.wait();
      console.log('✅ Mint opened!');
    }
    console.log('');
  } catch (e) {
    console.log('Could not check/set mintOpen:', e.message);
  }

  // Try to approve minter
  try {
    console.log('Attempting to approve OrionVerifiedMinter as minter...');
    const tx = await spgNft.approveMinter(ORION_VERIFIED_MINTER);
    console.log('Transaction sent:', tx.hash);
    await tx.wait();
    console.log('✅ OrionVerifiedMinter approved as minter!');
  } catch (e) {
    console.log('approveMinter failed:', e.message);

    // Try alternative method
    try {
      console.log('Trying setMinter instead...');
      const tx = await spgNft.setMinter(ORION_VERIFIED_MINTER);
      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ OrionVerifiedMinter set as minter!');
    } catch (e2) {
      console.log('setMinter also failed:', e2.message);
      console.log('');
      console.log('The SPG NFT contract might not have minter approval functions.');
      console.log('This could mean:');
      console.log('1. Public minting should already work (isPublicMinting: true)');
      console.log('2. There\'s a different issue preventing minting');
    }
  }

  // Check minter status
  try {
    const isMinter = await spgNft.minters(ORION_VERIFIED_MINTER);
    console.log('');
    console.log('Is OrionVerifiedMinter approved?:', isMinter);
  } catch (e) {
    console.log('Could not check minter status:', e.message);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
