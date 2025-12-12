import { ethers } from 'ethers';

const REGISTRATION_WORKFLOWS = '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424';
const SPG_NFT_CONTRACT = '0x78AD3d22E62824945DED384a5542Ad65de16E637';
const RPC_URL = 'https://aeneid.storyrpc.io';
const PRIVATE_KEY = '0x1d12932a5c3a7aa8d4f50662caa679bb2e53321e11bc5df2af9298e2ace59305';

// RegistrationWorkflows ABI
const WORKFLOWS_ABI = [
  "function mintAndRegisterIp(address spgNftContract, address recipient, tuple(string ipMetadataURI, bytes32 ipMetadataHash, string nftMetadataURI, bytes32 nftMetadataHash) ipMetadata) returns (address ipId, uint256 tokenId)"
];

// SPG NFT ABI to check if it's valid
const SPG_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)"
];

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

console.log('\n🔍 Testing Registration Workflows\n');

// First, check if SPG NFT contract is valid
console.log('1️⃣ Checking SPG NFT Contract:', SPG_NFT_CONTRACT);
const spgContract = new ethers.Contract(SPG_NFT_CONTRACT, SPG_ABI, provider);

try {
  const name = await spgContract.name();
  const symbol = await spgContract.symbol();
  const totalSupply = await spgContract.totalSupply();

  console.log('  Name:', name);
  console.log('  Symbol:', symbol);
  console.log('  Total Supply:', totalSupply.toString());
  console.log('  ✅ SPG NFT contract is valid\n');
} catch (error) {
  console.log('  ❌ SPG NFT contract check failed:', error.message, '\n');
}

// Now try to call RegistrationWorkflows directly
console.log('2️⃣ Testing RegistrationWorkflows.mintAndRegisterIp');
console.log('  Address:', REGISTRATION_WORKFLOWS, '\n');

const workflowsContract = new ethers.Contract(REGISTRATION_WORKFLOWS, WORKFLOWS_ABI, wallet);

const recipient = wallet.address;
const ipMetadataURI = "ipfs://QmTestIP1765497109043";
const nftMetadataURI = "ipfs://QmTestNFT1765497109043";

const ipMetadata = {
  ipMetadataURI: ipMetadataURI,
  ipMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipMetadataURI)),
  nftMetadataURI: nftMetadataURI,
  nftMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(nftMetadataURI))
};

console.log('  Calling with:');
console.log('    SPG NFT:', SPG_NFT_CONTRACT);
console.log('    Recipient:', recipient);
console.log('    IP URI:', ipMetadataURI);
console.log('    NFT URI:', nftMetadataURI);
console.log('');

try {
  const result = await workflowsContract.callStatic.mintAndRegisterIp(
    SPG_NFT_CONTRACT,
    recipient,
    ipMetadata
  );

  console.log('  ✅ Call would succeed!');
  console.log('  Result:', result);
} catch (error) {
  console.log('  ❌ Call would fail!');
  console.log('  Error:', error.message);

  if (error.error) {
    console.log('  Error details:', error.error);
  }

  if (error.reason) {
    console.log('  Reason:', error.reason);
  }
}
