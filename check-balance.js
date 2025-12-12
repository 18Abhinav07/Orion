import { ethers } from 'ethers';

const RPC_URL = 'https://aeneid.storyrpc.io';
const userAddress = '0x580F5b09765E71D64613c8F4403234f8790DD7D3';

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

console.log('\n💰 Checking Wallet Balance\n');

const balance = await provider.getBalance(userAddress);
console.log('Address:', userAddress);
console.log('Balance:', ethers.utils.formatEther(balance), 'IP');
console.log('Wei:', balance.toString());

if (balance.isZero()) {
  console.log('\n❌ NO BALANCE! You need IP tokens for gas!');
  console.log('Get testnet IP tokens from Story Protocol faucet');
} else {
  console.log('\n✅ Has balance for gas');
}
