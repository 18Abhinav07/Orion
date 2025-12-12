// Test the latest signature from the logs
import { ethers } from 'ethers';

// From latest backend logs
const creatorAddress = "0x23e67597f0898f747Fa3291C8920168adF9455D0";
const contentHash = "0xb8df96346ca1b8be49dcc46e12a139d86510e4293dd4620993f28fc416ad4826";
const ipMetadataURI = "ipfs://QmTestIP1765497109043";
const nftMetadataURI = "ipfs://QmTestNFT1765497109043";
const nonce = 27;
const expiryTimestamp = 1765498009;
const signature = "0x1f932d7420362719f10489b8bdeccd3a5357d1f4391377fd33b010d5ee43d3d336de0927f0dae2c8d3831493ee31dad75f057adbee2adc392793bf2e5d9defb01c";
const expectedSigner = "0x23e67597f0898f747Fa3291C8920168adF9455D0";

console.log('\n🔍 Testing Latest Signature from Logs\n');

// Step 1: Hash URIs (like contract does)
const ipMetadataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipMetadataURI));
const nftMetadataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(nftMetadataURI));

console.log('1️⃣ URI Hashes (ethers v5):');
console.log('   IP Hash:', ipMetadataHash);
console.log('   NFT Hash:', nftMetadataHash);
console.log('   Expected IP Hash from logs: 0x220703b00882c4e442a0b0bf5935364e6db28aab5295823dffd925f3cef6f18b');
console.log('   Expected NFT Hash from logs: 0x4763f8fc3d4aba7eeb13e194e16d6af69f7ab5b41cf9e05836557079a3b9ed93');
console.log('   IP Match:', ipMetadataHash === '0x220703b00882c4e442a0b0bf5935364e6db28aab5295823dffd925f3cef6f18b');
console.log('   NFT Match:', nftMetadataHash === '0x4763f8fc3d4aba7eeb13e194e16d6af69f7ab5b41cf9e05836557079a3b9ed93');

// Step 2: Create message hash (like contract's _hashMessage)
const messageHash = ethers.utils.solidityKeccak256(
  ['address', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256'],
  [creatorAddress, contentHash, ipMetadataHash, nftMetadataHash, nonce, expiryTimestamp]
);

console.log('\n2️⃣ Message Hash (ethers v5):');
console.log('   ', messageHash);
console.log('   Expected from logs: 0x095129697d49d96493e6e5a0df896d6194fba85f3aed44721c55439290c3a106');
console.log('   Match:', messageHash === '0x095129697d49d96493e6e5a0df896d6194fba85f3aed44721c55439290c3a106');

// Step 3: Add Ethereum prefix (like contract's _recoverSigner)
const prefixedHash = ethers.utils.hashMessage(ethers.utils.arrayify(messageHash));

console.log('\n3️⃣ Prefixed Hash (with Ethereum prefix):');
console.log('   ', prefixedHash);

// Step 4: Recover signer from signature
const recoveredSigner = ethers.utils.recoverAddress(prefixedHash, signature);

console.log('\n4️⃣ Signature Recovery:');
console.log('   Signature:', signature);
console.log('   Recovered Signer:', recoveredSigner);
console.log('   Expected Signer:', expectedSigner);
console.log('   ✅ Match:', recoveredSigner.toLowerCase() === expectedSigner.toLowerCase());

// Alternative: use verifyMessage
const recoveredFromMessage = ethers.utils.verifyMessage(ethers.utils.arrayify(messageHash), signature);
console.log('\n5️⃣ Alternative Recovery (using verifyMessage):');
console.log('   Recovered:', recoveredFromMessage);
console.log('   ✅ Match:', recoveredFromMessage.toLowerCase() === expectedSigner.toLowerCase());
