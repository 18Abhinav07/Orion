// Test signature recovery to match what the contract does
import { ethers } from 'ethers';

// From latest backend logs:
const creatorAddress = "0x580F5b09765E71D64613c8F4403234f8790DD7D3";
const contentHash = "0x479cf57986d74fe8a74ee1f5b5e490d2e30418d19b4a5a5937532985cf3f4c8f";
const ipMetadataURI = "ipfs://QmTestIP1765494836932";
const nftMetadataURI = "ipfs://QmTestNFT1765494836932";
const nonce = 9;
const expiryTimestamp = 1765495736;
const signature = "0x0d94ca2552227a9f8d099516b1f13c2fac98dc3d82fa484b651ef25c2c8eb00b3f96bb9e20b26d300540a2e80a35aff16f9f6050ff732966e98b0fcb062977341b";
const expectedSigner = "0x23e67597f0898f747Fa3291C8920168adF9455D0"; // backend verifier address

console.log('\n🔍 Testing Signature Recovery\n');

// Step 1: Hash URIs (like contract does)
const ipMetadataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipMetadataURI));
const nftMetadataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(nftMetadataURI));

console.log('1️⃣ Hashed URIs:');
console.log('   ipMetadataHash:', ipMetadataHash);
console.log('   nftMetadataHash:', nftMetadataHash);

// Step 2: Create message hash (like contract's _hashMessage)
const messageHash = ethers.utils.solidityKeccak256(
  ['address', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256'],
  [creatorAddress, contentHash, ipMetadataHash, nftMetadataHash, nonce, expiryTimestamp]
);

console.log('\n2️⃣ Message Hash:');
console.log('   ', messageHash);
console.log('   Expected from logs: 0x6b378adc714fffc0d362bc633d253fdd1ebe6dfb6ac0601800d7b4b4acaf7e3a');
console.log('   Match:', messageHash === '0x6b378adc714fffc0d362bc633d253fdd1ebe6dfb6ac0601800d7b4b4acaf7e3a');

// Step 3: Add Ethereum prefix (like contract's _recoverSigner)
const prefixedHash = ethers.utils.keccak256(
  ethers.utils.concat([
    ethers.utils.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
    ethers.utils.arrayify(messageHash)
  ])
);

console.log('\n3️⃣ Prefixed Hash (with Ethereum prefix):');
console.log('   ', prefixedHash);

// Step 4: Recover signer from signature
const recoveredSigner = ethers.utils.recoverAddress(prefixedHash, signature);

console.log('\n4️⃣ Signature Recovery:');
console.log('   Signature:', signature);
console.log('   Recovered Signer:', recoveredSigner);
console.log('   Expected Signer:', expectedSigner);
console.log('   ✅ Match:', recoveredSigner.toLowerCase() === expectedSigner.toLowerCase());

// Step 5: Alternative - use verifyMessage (what backend does)
try {
  const recoveredFromMessage = ethers.utils.verifyMessage(ethers.utils.arrayify(messageHash), signature);
  console.log('\n5️⃣ Alternative Recovery (using verifyMessage):');
  console.log('   Recovered:', recoveredFromMessage);
  console.log('   ✅ Match:', recoveredFromMessage.toLowerCase() === expectedSigner.toLowerCase());
} catch (e) {
  console.log('\n5️⃣ Alternative Recovery failed:', e.message);
}
