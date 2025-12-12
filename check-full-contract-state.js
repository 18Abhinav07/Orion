import { ethers } from 'ethers';

const ORION_VERIFIED_MINTER = '0x1B014A3a16E5AF7D1207646f35AFD2b08535c1EB';
const RPC_URL = 'https://aeneid.storyrpc.io';

const ABI = [
  "function SPG_NFT_CONTRACT() view returns (address)",
  "function BACKEND_VERIFIER_ADDRESS() view returns (address)",
  "function REGISTRATION_WORKFLOWS() view returns (address)",
  "function owner() view returns (address)",
  "function usedNonces(uint256) view returns (bool)"
];

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(ORION_VERIFIED_MINTER, ABI, provider);

console.log('\n🔍 Checking Full OrionVerifiedMinter Contract State\n');
console.log('Contract Address:', ORION_VERIFIED_MINTER);
console.log('');

const spgAddress = await contract.SPG_NFT_CONTRACT();
const verifierAddress = await contract.BACKEND_VERIFIER_ADDRESS();
const registrationWorkflows = await contract.REGISTRATION_WORKFLOWS();
const owner = await contract.owner();
const nonce27Used = await contract.usedNonces(27);

console.log('Configuration:');
console.log('  SPG_NFT_CONTRACT:', spgAddress);
console.log('  BACKEND_VERIFIER_ADDRESS:', verifierAddress);
console.log('  REGISTRATION_WORKFLOWS:', registrationWorkflows);
console.log('  Owner:', owner);
console.log('');

console.log('Nonce Status:');
console.log('  Nonce 27 used?:', nonce27Used);
console.log('');

console.log('Validation:');
console.log('  ✅ SPG Contract is set:', spgAddress !== ethers.constants.AddressZero);
console.log('  ✅ Verifier matches backend:', verifierAddress === '0x23e67597f0898f747Fa3291C8920168adF9455D0');
console.log('  ✅ Registration Workflows set:', registrationWorkflows !== ethers.constants.AddressZero);
console.log('');

console.log('Expected values from .env:');
console.log('  VITE_SPG_NFT_COLLECTION: 0x78AD3d22E62824945DED384a5542Ad65de16E637');
console.log('  VITE_REGISTRATION_WORKFLOWS: 0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424');
console.log('');

console.log('Comparison:');
console.log('  SPG matches .env?:', spgAddress.toLowerCase() === '0x78AD3d22E62824945DED384a5542Ad65de16E637'.toLowerCase());
console.log('  Workflows matches .env?:', registrationWorkflows.toLowerCase() === '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424'.toLowerCase());
