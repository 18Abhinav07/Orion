import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Simple test to see what SDK functions are available
const account = privateKeyToAccount('0x1d12932a5c3a7aa8d4f50662caa679bb2e53321e11bc5df2af9298e2ace59305');

const config: StoryConfig = {
  account: account,
  transport: http('https://aeneid.storyrpc.io'),
  chainId: 'aeneid',
};

const client = StoryClient.newClient(config);

console.log('Story Client Methods:');
console.log('IPAsset methods:', Object.keys(client.ipAsset));
console.log('NFTClient methods:', Object.keys(client.nftClient));

// The SDK provides:
// client.ipAsset.mintAndRegisterIpAssetWithPilTerms()
// client.ipAsset.registerDerivativeIp()
// etc.
