/**
 * Check the royalty vault for an IP and see what's in it
 */

import { StoryClient } from '@story-protocol/core-sdk';
import { http } from 'viem';
import { ethers } from 'ethers';

const STORY_RPC_URL = 'https://aeneid.storyrpc.io';
const IP_ID = '0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E';
const CLAIMER = '0x23e67597f0898f747Fa3291C8920168adF9455D0';
const WIP_TOKEN = '0x1514000000000000000000000000000000000000';

async function checkVault() {
  try {
    const config = {
      account: CLAIMER,
      transport: http(STORY_RPC_URL),
      chainId: 'aeneid'
    };
    
    const client = StoryClient.newClient(config);
    
    console.log('🔍 Checking royalty vault for IP:', IP_ID);
    console.log('👤 Claimer address:', CLAIMER);
    console.log('💰 Token:', WIP_TOKEN);
    console.log('');
    
    // Query claimable revenue
    const revenue = await client.royalty.claimableRevenue({
      ipId: IP_ID,
      claimer: CLAIMER,
      token: WIP_TOKEN,
    });
    
    console.log('✅ Claimable Revenue:', revenue.toString());
    console.log('📊 Formatted:', ethers.utils.formatEther(revenue.toString()), 'WIP');
    console.log('');
    
    if (revenue.toString() === '0') {
      console.log('⚠️ No claimable revenue found!');
      console.log('');
      console.log('Possible reasons:');
      console.log('1. Royalty vault not created yet for this IP');
      console.log('2. Payment went to wrong address/vault');
      console.log('3. payRoyaltyOnBehalf used same IP as payer & receiver (might not work)');
      console.log('4. Need to wait for blockchain settlement');
      console.log('');
      console.log('📝 Transaction hash that paid: 0x8f0299f2b84327f77ccd771f894ed06019c5441a9ddd697c842943e5cef9fb1f');
      console.log('🔗 Check: https://aeneid.storyscan.xyz/tx/0x8f0299f2b84327f77ccd771f894ed06019c5441a9ddd697c842943e5cef9fb1f');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('not registered') || error.message.includes('vault')) {
      console.log('');
      console.log('⚠️ This IP does not have a royalty vault registered.');
      console.log('This usually means:');
      console.log('- IP has never received any royalty payments');
      console.log('- OR payRoyaltyOnBehalf needs proper payer/receiver setup');
    }
  }
}

checkVault()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
