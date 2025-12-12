import { ethers } from 'ethers';

const REGISTRATION_WORKFLOWS = '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424';
const SPG_NFT_CONTRACT = '0x78AD3d22E62824945DED384a5542Ad65de16E637';
const USER_ADDRESS = '0x23e67597f0898f747Fa3291C8920168adF9455D0';
const RPC_URL = 'https://aeneid.storyrpc.io';

// Extended ABI to check various things
const WORKFLOWS_ABI = [
  "function mintAndRegisterIp(address spgNftContract, address recipient, tuple(string ipMetadataURI, bytes32 ipMetadataHash, string nftMetadataURI, bytes32 nftMetadataHash) ipMetadata) returns (address ipId, uint256 tokenId)",
  "function IP_ASSET_REGISTRY() view returns (address)",
  "function LICENSING_MODULE() view returns (address)",
  "function CORE_METADATA_MODULE() view returns (address)"
];

const SPG_ABI = [
  "function mintFee() view returns (uint256)",
  "function mintOpen() view returns (bool)",
  "function isPublicMinting() view returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function publicMintLimit() view returns (uint256)",
  "function minted(address) view returns (uint256)"
];

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

console.log('\n🔍 Checking RegistrationWorkflows Requirements\n');

// Check RegistrationWorkflows
console.log('1️⃣ RegistrationWorkflows Info:');
const workflows = new ethers.Contract(REGISTRATION_WORKFLOWS, WORKFLOWS_ABI, provider);

try {
  const registry = await workflows.IP_ASSET_REGISTRY();
  console.log('  IP Asset Registry:', registry);
} catch (e) {
  console.log('  Could not get IP_ASSET_REGISTRY');
}

try {
  const licensing = await workflows.LICENSING_MODULE();
  console.log('  Licensing Module:', licensing);
} catch (e) {
  console.log('  Could not get LICENSING_MODULE');
}

console.log('');

// Check SPG NFT details
console.log('2️⃣ SPG NFT Contract Requirements:');
const spgNft = new ethers.Contract(SPG_NFT_CONTRACT, SPG_ABI, provider);

try {
  const mintFee = await spgNft.mintFee();
  console.log('  Mint Fee:', ethers.utils.formatEther(mintFee), 'IP');

  if (!mintFee.isZero()) {
    const balance = await provider.getBalance(USER_ADDRESS);
    console.log('  User Balance:', ethers.utils.formatEther(balance), 'IP');
    console.log('  Can afford fee:', balance.gte(mintFee));
  }
} catch (e) {
  console.log('  Could not check mintFee');
}

try {
  const mintOpen = await spgNft.mintOpen();
  console.log('  Mint Open:', mintOpen);
} catch (e) {
  console.log('  Could not check mintOpen');
}

try {
  const isPublic = await spgNft.isPublicMinting();
  console.log('  Is Public Minting:', isPublic);
} catch (e) {
  console.log('  Could not check isPublicMinting');
}

try {
  const totalSupply = await spgNft.totalSupply();
  console.log('  Total Supply:', totalSupply.toString());
} catch (e) {
  console.log('  Could not check totalSupply');
}

try {
  const limit = await spgNft.publicMintLimit();
  console.log('  Public Mint Limit:', limit.toString());
} catch (e) {
  console.log('  Could not check publicMintLimit');
}

try {
  const userMinted = await spgNft.minted(USER_ADDRESS);
  console.log('  User Minted Count:', userMinted.toString());
} catch (e) {
  console.log('  Could not check user minted count');
}

console.log('\n3️⃣ Potential Issues:');
console.log('  - Check if mintFee > 0 and needs to be sent with transaction');
console.log('  - Check if publicMintLimit has been reached');
console.log('  - Check if RegistrationWorkflows is whitelisted/approved');
console.log('  - Check if there are additional role requirements');
