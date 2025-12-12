import { ethers } from 'ethers';

const ORION_VERIFIED_MINTER = '0x1B014A3a16E5AF7D1207646f35AFD2b08535c1EB';
const RPC_URL = 'https://aeneid.storyrpc.io';
const PRIVATE_KEY = '0x1d12932a5c3a7aa8d4f50662caa679bb2e53321e11bc5df2af9298e2ace59305';

const ABI = [
  "function verifyAndMint(address to, bytes32 contentHash, string ipMetadataURI, string nftMetadataURI, uint256 nonce, uint256 expiryTimestamp, bytes signature) returns (address ipId, uint256 tokenId)"
];

// Test data from latest logs
const recipient = "0x23e67597f0898f747Fa3291C8920168adF9455D0";
const contentHash = "0xb8df96346ca1b8be49dcc46e12a139d86510e4293dd4620993f28fc416ad4826";
const ipMetadataURI = "ipfs://QmTestIP1765497109043";
const nftMetadataURI = "ipfs://QmTestNFT1765497109043";
const nonce = 27;
const expiryTimestamp = 1765498009;
const signature = "0x1f932d7420362719f10489b8bdeccd3a5357d1f4391377fd33b010d5ee43d3d336de0927f0dae2c8d3831493ee31dad75f057adbee2adc392793bf2e5d9defb01c";

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(ORION_VERIFIED_MINTER, ABI, wallet);

console.log('\n🔍 Debug Contract Call with callStatic\n');
console.log('Attempting to call verifyAndMint with:');
console.log('  Recipient:', recipient);
console.log('  Content Hash:', contentHash);
console.log('  IP URI:', ipMetadataURI);
console.log('  NFT URI:', nftMetadataURI);
console.log('  Nonce:', nonce);
console.log('  Expiry:', expiryTimestamp);
console.log('  Signature:', signature);
console.log('');

try {
  // Use callStatic to simulate the transaction and get the error
  const result = await contract.callStatic.verifyAndMint(
    recipient,
    contentHash,
    ipMetadataURI,
    nftMetadataURI,
    nonce,
    expiryTimestamp,
    signature
  );

  console.log('✅ Call would succeed!');
  console.log('Result:', result);
} catch (error) {
  console.log('❌ Call would fail!');
  console.log('Error message:', error.message);
  console.log('');

  if (error.error) {
    console.log('Error details:', error.error);
  }

  // Try to decode the error
  if (error.data) {
    console.log('Error data:', error.data);
  }

  // Print full error for inspection
  console.log('\nFull error object:');
  console.log(JSON.stringify(error, null, 2));
}
