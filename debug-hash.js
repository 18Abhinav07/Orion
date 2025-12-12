// Debug script to compare backend vs contract hash generation
const ethers = require('ethers');

// From the logs:
const creatorAddress = "0x580F5b09765E71D64613c8F4403234f8790DD7D3";
const contentHash = "0x07110807e064cdc23ea7ecda51a1701ee8edbd7fa35f560b2a20405adcd574fa";
const ipMetadataURI = "ipfs://QmTestIP1765494685861";
const nftMetadataURI = "ipfs://QmTestNFT1765494685861";
const nonce = 8;
const expiryTimestamp = 1765495585;

console.log('\n🔍 Debugging Hash Generation\n');
console.log('Parameters:');
console.log('  creatorAddress:', creatorAddress);
console.log('  contentHash:', contentHash);
console.log('  ipMetadataURI:', ipMetadataURI);
console.log('  nftMetadataURI:', nftMetadataURI);
console.log('  nonce:', nonce);
console.log('  expiryTimestamp:', expiryTimestamp);

// Backend method (ethers v6 - solidityPackedKeccak256)
const backendHash = ethers.solidityPackedKeccak256(
  ['address', 'bytes32', 'string', 'string', 'uint256', 'uint256'],
  [creatorAddress, contentHash, ipMetadataURI, nftMetadataURI, nonce, expiryTimestamp]
);

console.log('\n📦 Backend Hash (solidityPackedKeccak256):');
console.log('  ', backendHash);

// Contract method (Solidity keccak256(abi.encodePacked(...)))
// This should match the backend hash
const contractHash = ethers.solidityPackedKeccak256(
  ['address', 'bytes32', 'string', 'string', 'uint256', 'uint256'],
  [creatorAddress, contentHash, ipMetadataURI, nftMetadataURI, nonce, expiryTimestamp]
);

console.log('\n⛓️  Contract Hash (same method):');
console.log('  ', contractHash);

console.log('\n✅ Hashes match:', backendHash === contractHash);

console.log('\n📝 Expected backend signature hash from logs:');
console.log('   0x0928d7e8de712c5813176966e2978d4ce924a388b9853c92ac3b6c76c5107fb3');

console.log('\n🔍 Comparison:');
console.log('  Generated:', backendHash);
console.log('  From logs: 0x0928d7e8de712c5813176966e2978d4ce924a388b9853c92ac3b6c76c5107fb3');
console.log('  Match:', backendHash === '0x0928d7e8de712c5813176966e2978d4ce924a388b9853c92ac3b6c76c5107fb3');
