// Quick test to verify signature generation matches contract expectations
// This uses ethers v5 syntax (frontend)
import { ethers } from 'ethers';

const BACKEND_PRIVATE_KEY = '0x1d12932a5c3a7aa8d4f50662caa679bb2e53321e11bc5df2af9298e2ace59305';
const wallet = new ethers.Wallet(BACKEND_PRIVATE_KEY);

// Test data from logs
const creatorAddress = "0x23e67597f0898f747Fa3291C8920168adF9455D0";
const contentHash = "0xa820dff6d433ffc0d14229acbf07ab3fe4110a1080635883a2c2d77687e1ba5d";
const ipMetadataURI = "ipfs://QmTestIP1765495424853";
const nftMetadataURI = "ipfs://QmTestNFT1765495424853";
const nonce = 17;
const expiryTimestamp = 1765496324;

console.log('\n🔍 Testing Signature Generation (ethers v5)\n');
console.log('Wallet address:', wallet.address);

// Hash URIs (like contract does) - v5 syntax
const ipMetadataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipMetadataURI));
const nftMetadataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(nftMetadataURI));

console.log('\n1️⃣ URI Hashes:');
console.log('IP URI:', ipMetadataURI);
console.log('IP Hash:', ipMetadataHash);
console.log('NFT URI:', nftMetadataURI);
console.log('NFT Hash:', nftMetadataHash);

// Create message hash (matching Solidity) - v5 syntax
const messageHash = ethers.utils.solidityKeccak256(
  ['address', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256'],
  [creatorAddress, contentHash, ipMetadataHash, nftMetadataHash, nonce, expiryTimestamp]
);

console.log('\n2️⃣ Message Hash:');
console.log(messageHash);

// Method 1: Using signMessage (adds Ethereum prefix automatically)
const messageBytes = ethers.utils.arrayify(messageHash);
const signature1 = await wallet.signMessage(messageBytes);

console.log('\n3️⃣ Signature (using signMessage - WITH prefix):');
console.log(signature1);

// Verify we can recover the signer
const recovered1 = ethers.utils.verifyMessage(messageBytes, signature1);
console.log('Recovered address:', recovered1);
console.log('Match:', recovered1.toLowerCase() === wallet.address.toLowerCase());

// Method 2: Using _signingKey().signDigest directly (NO prefix - raw signature)
// This is what the contract expects if it's NOT adding the prefix itself
const signature2 = wallet._signingKey().signDigest(messageHash);
const signature2Joined = ethers.utils.joinSignature(signature2);

console.log('\n4️⃣ Signature (using signDigest - NO prefix):');
console.log(signature2Joined);

// Try to recover from this signature (contract-style - no prefix)
const recovered2 = ethers.utils.recoverAddress(messageHash, signature2Joined);
console.log('Recovered address (no prefix):', recovered2);
console.log('Match:', recovered2.toLowerCase() === wallet.address.toLowerCase());

// Check which signature was actually sent
const actualSignature = "0xc9065acbe97d26589bbf938ffbd47179bfda172a385f947b6ddc8a407b4be77e6adb32de1552906bee1d0fba6b5e61f78bb087855dfe19a2ffe276839b2e6f561b";
console.log('\n5️⃣ Actual signature from backend logs:');
console.log(actualSignature);
console.log('Matches method 1 (with prefix):', actualSignature === signature1);
console.log('Matches method 2 (no prefix):', actualSignature === signature2Joined);

console.log('\n💡 Recommendation: The contract needs to match the signing method used by the backend.');
