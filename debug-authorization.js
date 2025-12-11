#!/usr/bin/env node

/**
 * Debug Authorization Issue
 * Tests both TokenManagementService and LegacyIssuerService authorization
 */

import { ethers } from 'ethers';

// Contract addresses
const ADMIN_CONTRACT = "0x1e7D5f9c9f59dDaf39B31dC9e136E3e0Aae204d5";
const TOKEN_CONTRACT = "0xf52D58076D1cC8e9f744c0c845cc6A6E57419032";
const MARKETPLACE_CONTRACT = "0xD9a3900cdF48f551a221d6F59a86F042248359B1";
const TOKEN_MANAGEMENT_CONTRACT = "0x7455E48f489Df52de5116C6bEF7dED7B8d5C6D5B";

// Test wallet address
const TEST_WALLET = "0x1616FC9e47624bC69ff684b799491e6077333685";

// Admin ABI (minimal)
const ADMIN_ABI = [
  "function isIssuer(address _address) external view returns (bool)"
];

async function debugAuthorization() {
  console.log('🔍 DEBUGGING AUTHORIZATION ISSUE');
  console.log('='.repeat(50));
  
  try {
    // Setup provider
    const provider = new ethers.providers.JsonRpcProvider('https://rpc-mainnet.u2u.xyz/');
    console.log('✅ Provider connected');
    
    // Test admin contract
    console.log('\n📋 Testing Admin Contract Authorization:');
    console.log('Admin Contract:', ADMIN_CONTRACT);
    console.log('Test Wallet:', TEST_WALLET);
    
    const adminContract = new ethers.Contract(ADMIN_CONTRACT, ADMIN_ABI, provider);
    
    // Check if contract exists
    const contractCode = await provider.getCode(ADMIN_CONTRACT);
    console.log('Contract Code Length:', contractCode.length);
    
    if (contractCode === '0x') {
      console.log('❌ Admin contract not found at address');
      return;
    }
    
    // Test authorization
    console.log('\n🔄 Checking isIssuer...');
    const isAuthorized = await adminContract.isIssuer(TEST_WALLET);
    console.log('✅ Authorization Result:', isAuthorized);
    
    if (isAuthorized) {
      console.log('🎉 WALLET IS AUTHORIZED!');
    } else {
      console.log('❌ WALLET IS NOT AUTHORIZED');
      console.log('\n🔍 Possible reasons:');
      console.log('1. Wallet was not added as issuer');
      console.log('2. Wrong admin contract address');
      console.log('3. Admin contract state changed');
      console.log('4. Network connection issue');
    }
    
    // Test contract call details
    console.log('\n📊 Contract Call Details:');
    try {
      const result = await adminContract.callStatic.isIssuer(TEST_WALLET);
      console.log('Static Call Result:', result);
    } catch (error) {
      console.log('❌ Static Call Failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run debug
debugAuthorization();