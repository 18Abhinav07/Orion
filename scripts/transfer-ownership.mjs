import { ethers } from 'ethers';
import 'dotenv/config';

const RPC_URL = 'https://aeneid.storyrpc.io';
const SPG_NFT_CONTRACT = '0x78AD3d22E62824945DED384a5542Ad65de16E637';
const ORION_VERIFIED_MINTER = '0x1B014A3a16E5AF7D1207646f35AFD2b08535c1EB';
const OWNER_PRIVATE_KEY = process.env.STORY_PRIVATE_KEY;

// SPG NFT ABI
const SPG_NFT_ABI = [
  "function transferOwnership(address newOwner) external",
  "function owner() view returns (address)"
];

async function main() {
  console.log('\n🔧 Transferring SPG NFT ownership to OrionVerifiedMinter\n');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

  console.log('Current owner address:', ownerWallet.address);
  console.log('SPG NFT Contract:', SPG_NFT_CONTRACT);
  console.log('New owner (OrionVerifiedMinter):', ORION_VERIFIED_MINTER);
  console.log('');

  const spgNft = new ethers.Contract(SPG_NFT_CONTRACT, SPG_NFT_ABI, ownerWallet);

  // Check current owner
  try {
    const currentOwner = await spgNft.owner();
    console.log('Current SPG NFT owner:', currentOwner);

    if (currentOwner.toLowerCase() === ORION_VERIFIED_MINTER.toLowerCase()) {
      console.log('✅ OrionVerifiedMinter is already the owner!');
      return;
    }
  } catch (e) {
    console.log('❌ Could not check current owner:', e.message);
    console.log('The SPG NFT contract might not have an owner() function.');
    console.log('Proceeding with transfer attempt anyway...\n');
  }

  // Transfer ownership
  try {
    console.log('Transferring ownership...');
    const tx = await spgNft.transferOwnership(ORION_VERIFIED_MINTER);
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for confirmation...');

    await tx.wait();
    console.log('✅ Ownership transferred successfully!');
    console.log('');

    // Verify
    try {
      const newOwner = await spgNft.owner();
      console.log('New owner:', newOwner);
      console.log('Verified:', newOwner.toLowerCase() === ORION_VERIFIED_MINTER.toLowerCase());
    } catch (e) {
      console.log('Could not verify new owner');
    }
  } catch (e) {
    console.log('❌ Transfer failed:', e.message);
    console.log('');
    console.log('This might mean:');
    console.log('1. The SPG NFT contract doesnt support transferOwnership');
    console.log('2. You might need to use a different approach');
    console.log('3. The contract might already be owned by OrionVerifiedMinter');
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
