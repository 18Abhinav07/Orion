import { ethers } from 'ethers';

const ORION_VERIFIED_MINTER = '0x9cb153775B639DCa50F1BA7a6daa34af12466450';
const RPC_URL = 'https://aeneid.storyrpc.io';

const ABI = [
  "function SPG_NFT_CONTRACT() view returns (address)",
  "function BACKEND_VERIFIER_ADDRESS() view returns (address)",
  "function usedNonces(uint256) view returns (bool)"
];

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(ORION_VERIFIED_MINTER, ABI, provider);

console.log('\n🔍 Checking Contract State\n');

const spgAddress = await contract.SPG_NFT_CONTRACT();
const verifierAddress = await contract.BACKEND_VERIFIER_ADDRESS();
const nonce11Used = await contract.usedNonces(11);

console.log('SPG_NFT_CONTRACT:', spgAddress);
console.log('BACKEND_VERIFIER_ADDRESS:', verifierAddress);
console.log('Nonce 11 used?:', nonce11Used);

console.log('\n✅ SPG Contract is set:', spgAddress !== ethers.ZeroAddress);
console.log('✅ Verifier matches:', verifierAddress === '0x23e67597f0898f747Fa3291C8920168adF9455D0');
