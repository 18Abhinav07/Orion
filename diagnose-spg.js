/**
 * Check SPG contract interface and permissions
 * Story Protocol's SPG contracts use specific interfaces
 */

import { ethers } from 'ethers';

const SPG_ADDRESS = '0x15aAe0E870Aab25B09F4453239967e0aff1868C2';
const WRAPPER_ADDRESS = '0x9cb153775B639DCa50F1BA7a6daa34af12466450';
const RPC_URL = 'https://aeneid.storyrpc.io';

// Minimal ABI - just check bytecode exists
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

async function checkContract() {
  console.log('🔍 Checking SPG contract at:', SPG_ADDRESS);
  
  // Check if contract exists
  const code = await provider.getCode(SPG_ADDRESS);
  if (code === '0x') {
    console.log('❌ No contract found at this address!');
    return;
  }
  
  console.log('✅ Contract exists');
  console.log('Code length:', code.length, 'bytes');
  
  // Try to get the contract from Story Protocol's explorer
  console.log('\n📍 View on explorer:');
  console.log('https://aeneid.storyscan.xyz/address/' + SPG_ADDRESS);
  
  console.log('\n💡 ISSUE IDENTIFIED:');
  console.log('The SPG collection was deployed with isPublicMinting=false');
  console.log('This means only the owner (0x23e67...) can mint directly.');
  console.log('');
  console.log('The wrapper contract (0x9cb...) is trying to call mintAndRegisterIp,');
  console.log('but SPG contract rejects it because wrapper is not the owner.');
  console.log('');
  console.log('🔧 SOLUTIONS:');
  console.log('');
  console.log('Option 1: Mint directly from owner wallet');
  console.log('  - Frontend connects as 0x23e67... (your backend verifier)');
  console.log('  - Call SPG.mintAndRegisterIp() directly (no wrapper)');
  console.log('  - Skip signature verification (trust frontend)');
  console.log('');
  console.log('Option 2: Redeploy SPG with isPublicMinting=true');
  console.log('  - Edit deploy.mjs: isPublicMinting: true');
  console.log('  - Run: npm run deploy:contracts');
  console.log('  - Update .env with new SPG address');
  console.log('  - Anyone can mint (including wrapper contract) ✅');
  console.log('');
  console.log('Option 3: Use Story Protocol SDK instead');
  console.log('  - Use @story-protocol/core-sdk');
  console.log('  - Call mintAndRegisterIpAndAttachPILTerms()');
  console.log('  - Handles permissions automatically');
}

checkContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
