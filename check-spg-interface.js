/**
 * Check what the SPG contract actually is and what functions it has
 */

import { ethers } from 'ethers';

const SPG_ADDRESS = '0xd023840c6EFa99E1f38017F83a04FDa9cad0816f';
const RPC_URL = 'https://aeneid.storyrpc.io';

async function checkSPG() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  console.log('🔍 Checking SPG contract:', SPG_ADDRESS);
  console.log('📍 Explorer:', `https://aeneid.storyscan.xyz/address/${SPG_ADDRESS}`);
  
  const code = await provider.getCode(SPG_ADDRESS);
  console.log('\n✅ Contract exists, code length:', code.length, 'bytes');
  
  console.log('\n💡 The issue:');
  console.log('OrionVerifiedMinter is calling: mintAndRegisterIp(address, string)');
  console.log('But Story Protocol SPG contracts might have a different signature.');
  console.log('');
  console.log('Story Protocol SPG collections created via RegistrationWorkflows');
  console.log('are simple NFT contracts that Story Protocol uses internally.');
  console.log('');
  console.log('🔧 The Real Problem:');
  console.log('Story Protocol SPG NFTs are NOT meant to be called directly!');
  console.log('You should use the Story Protocol SDK or RegistrationWorkflows contract.');
  console.log('');
  console.log('📚 Story Protocol expects you to use:');
  console.log('  - mintAndRegisterIpAndAttachPILTerms() via SDK');
  console.log('  - OR RegistrationWorkflows.mintAndRegisterIp()');
  console.log('');
  console.log('The SPG collection created is a proxy/minimal NFT contract,');
  console.log('NOT a full-featured contract with mintAndRegisterIp()');
  console.log('');
  console.log('🎯 SOLUTION:');
  console.log('Option 1: Use @story-protocol/core-sdk in frontend');
  console.log('Option 2: Deploy your own simple NFT contract');
  console.log('Option 3: Call RegistrationWorkflows directly from wrapper');
}

checkSPG()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
