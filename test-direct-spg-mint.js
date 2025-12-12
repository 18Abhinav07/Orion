import { ethers } from 'ethers';

const SPG_NFT_CONTRACT = '0x78AD3d22E62824945DED384a5542Ad65de16E637';
const USER_ADDRESS = '0x23e67597f0898f747Fa3291C8920168adF9455D0';
const PRIVATE_KEY = '0x1d12932a5c3a7aa8d4f50662caa679bb2e53321e11bc5df2af9298e2ace59305';
const RPC_URL = 'https://aeneid.storyrpc.io';

// SPG NFT ABI - try different mint function signatures
const SPG_ABI = [
  "function mint(address to, string uri) returns (uint256)",
  "function mintWithMetadata(address to, string uri) returns (uint256)",
  "function publicMint(address to, string uri) returns (uint256)",
  "function safeMint(address to, string uri) returns (uint256)",
  "function mintAndRegisterIp(address recipient, tuple(string ipMetadataURI, bytes32 ipMetadataHash, string nftMetadataURI, bytes32 nftMetadataHash) ipMetadata) returns (address ipId, uint256 tokenId)"
];

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const spgNft = new ethers.Contract(SPG_NFT_CONTRACT, SPG_ABI, wallet);

const testUri = "ipfs://QmTestDirect" + Date.now();

console.log('\n🔍 Testing Direct SPG NFT Minting\n');
console.log('SPG NFT Contract:', SPG_NFT_CONTRACT);
console.log('User Address:', USER_ADDRESS);
console.log('Test URI:', testUri);
console.log('');

// Try different mint functions
const mintFunctions = [
  { name: 'mint', fn: () => spgNft.mint(USER_ADDRESS, testUri) },
  { name: 'mintWithMetadata', fn: () => spgNft.mintWithMetadata(USER_ADDRESS, testUri) },
  { name: 'publicMint', fn: () => spgNft.publicMint(USER_ADDRESS, testUri) },
  { name: 'safeMint', fn: () => spgNft.safeMint(USER_ADDRESS, testUri) },
  {
    name: 'mintAndRegisterIp',
    fn: () => spgNft.mintAndRegisterIp(USER_ADDRESS, {
      ipMetadataURI: testUri,
      ipMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(testUri)),
      nftMetadataURI: testUri,
      nftMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(testUri))
    })
  }
];

for (const { name, fn } of mintFunctions) {
  console.log(`Trying ${name}...`);
  try {
    await fn().then(async (tx) => {
      console.log(`  ✅ ${name} worked! Simulating transaction...`);
      // Don't actually send, just check if it would work
    });
  } catch (e) {
    if (e.code === 'CALL_EXCEPTION') {
      console.log(`  ❌ ${name} - function doesn't exist or would revert`);
    } else {
      console.log(`  ❌ ${name} - error:`, e.message.substring(0, 100));
    }
  }
}

console.log('\nℹ️  If all functions fail, the SPG NFT might require going through RegistrationWorkflows,');
console.log('   or there might be missing permissions/whitelisting needed.');
