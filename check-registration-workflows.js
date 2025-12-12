/**
 * Check RegistrationWorkflows contract interface
 * We need to find the exact function signature it expects
 */

import { ethers } from 'ethers';

const REGISTRATION_WORKFLOWS = '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424';
const RPC_URL = 'https://aeneid.storyrpc.io';

// Try different possible function signatures
const POSSIBLE_ABIS = [
  // Possibility 1: Simple signature
  ['function mintAndRegisterIp(address spgNftContract, address recipient, tuple(string ipMetadataURI, bytes32 ipMetadataHash, string nftMetadataURI, bytes32 nftMetadataHash) ipMetadata) returns (address ipId, uint256 tokenId)'],
  
  // Possibility 2: With licenseTermsId
  ['function mintAndRegisterIp(address spgNftContract, address recipient, tuple(string ipMetadataURI, bytes32 ipMetadataHash, string nftMetadataURI, bytes32 nftMetadataHash) ipMetadata, uint256 licenseTermsId) returns (address ipId, uint256 tokenId)'],
  
  // Possibility 3: mintAndRegisterIpAndAttachPILTerms
  ['function mintAndRegisterIpAndAttachPILTerms(address spgNftContract, address recipient, tuple(string ipMetadataURI, bytes32 ipMetadataHash, string nftMetadataURI, bytes32 nftMetadataHash) ipMetadata, tuple(bool transferable, address royaltyPolicy, uint256 mintingFee, uint256 commercialRevShare, address currency) terms) returns (address ipId, uint256 tokenId)']
];

async function checkRegistrationWorkflows() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  console.log('🔍 Checking RegistrationWorkflows at:', REGISTRATION_WORKFLOWS);
  console.log('📍 Explorer:', `https://aeneid.storyscan.xyz/address/${REGISTRATION_WORKFLOWS}`);
  
  const code = await provider.getCode(REGISTRATION_WORKFLOWS);
  console.log('✅ Contract exists, code length:', code.length, 'bytes\n');
  
  console.log('💡 The Issue:');
  console.log('Our contract is calling mintAndRegisterIp() but it might be reverting because:');
  console.log('1. Wrong function signature');
  console.log('2. Missing parameters (like licenseTermsId)');
  console.log('3. SPG collection not properly configured\n');
  
  console.log('📚 Story Protocol typically uses:');
  console.log('  mintAndRegisterIpAndAttachPILTerms() - Most common');
  console.log('  OR mintAndRegisterIp() with license terms\n');
  
  console.log('🎯 SOLUTION:');
  console.log('Check Story Protocol docs for exact signature.');
  console.log('Likely need to use mintAndRegisterIpAndAttachPILTerms instead.\n');
  
  console.log('📖 Story Protocol Docs:');
  console.log('https://docs.story.foundation/docs/register-an-nft-as-an-ip-asset');
  console.log('https://github.com/storyprotocol/protocol-core');
}

checkRegistrationWorkflows()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
