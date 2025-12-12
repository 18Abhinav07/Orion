/**
 * Test script to pay royalties to your IP on Story Aeneid Testnet
 * This will create claimable revenue that you can test claiming
 */

import { ethers } from 'ethers';
import { StoryClient } from '@story-protocol/core-sdk';
import { http } from 'viem';
import dotenv from 'dotenv';

dotenv.config();

const STORY_RPC_URL = 'https://aeneid.storyrpc.io';
const YOUR_IP_ID = '0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E'; // Your IP from Mint Token #56
const ROYALTY_TOKEN = '0x1514000000000000000000000000000000000000'; // WIP token on Aeneid testnet
const AMOUNT_TO_PAY = ethers.utils.parseEther('0.1').toString(); // 0.1 WIP tokens

async function payRoyalty() {
  try {
    console.log('🚀 Starting royalty payment test...');

    // Setup wallet
    const provider = new ethers.providers.JsonRpcProvider(STORY_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const address = await wallet.getAddress();

    console.log(`\n📍 Wallet: ${address}`);
    console.log(`💰 Balance: ${ethers.utils.formatEther(await wallet.getBalance())} IP`);

    // Setup Story Client
    const config = {
      account: address,
      transport: http(STORY_RPC_URL),
      chainId: 'aeneid'
    };
    const client = StoryClient.newClient(config);

    console.log(`\n🎯 Paying ${ethers.utils.formatEther(AMOUNT_TO_PAY)} IP tokens as royalty`);
    console.log(`   From: ${address} (you)`);
    console.log(`   To IP: ${YOUR_IP_ID}`);

    // Pay royalty on behalf (simulating a derivative paying royalties)
    // In real scenario, this would be another IP paying royalties to your parent IP
    const result = await client.royalty.payRoyaltyOnBehalf({
      payerIpId: YOUR_IP_ID, // Can use same IP as both payer and receiver for testing
      receiverIpId: YOUR_IP_ID,
      token: ROYALTY_TOKEN,
      amount: AMOUNT_TO_PAY
    });

    console.log(`\n✅ Royalty payment successful!`);
    console.log(`   Transaction Hash: ${result.txHash}`);
    console.log(`\n🎉 You can now check your Royalty Dashboard to see claimable revenue!`);
    console.log(`   Expected claimable: ${ethers.utils.formatEther(AMOUNT_TO_PAY)} IP`);

  } catch (error) {
    console.error('\n❌ Error paying royalty:', error);
    
    if (error.message?.includes('insufficient funds')) {
      console.log('\n💡 Solution: Get testnet IP tokens from Story faucet:');
      console.log('   https://faucet.story.foundation/');
    }
  }
}

payRoyalty();
