// src/services/licenseService.ts
import { ethers } from 'ethers';
import { verificationService } from './verificationService';

// Story Protocol Aeneid Testnet Contract Addresses (Updated from docs)
const PIL_TEMPLATE = '0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316'; // PILicenseTemplate
const LICENSING_MODULE = '0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f'; // LicensingModule  
const ROYALTY_POLICY_LAP = '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E'; // RoyaltyPolicyLAP
const CURRENCY_TOKEN = '0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E'; // MERC20 token

// For backwards compatibility with plan variable names
const LICENSE_REGISTRY_ADDRESS = PIL_TEMPLATE;
const LAP_ROYALTY_POLICY = ROYALTY_POLICY_LAP;
const WIP_TOKEN_ADDRESS = CURRENCY_TOKEN;
const PIL_TEMPLATE_ADDRESS = PIL_TEMPLATE;
const LICENSE_ATTACHMENT_ADDRESS = LICENSING_MODULE;

// ABIs - Updated to match Story Protocol docs
const LICENSE_REGISTRY_ABI = [
  "function registerLicenseTerms((bool transferable, address royaltyPolicy, uint256 defaultMintingFee, uint256 expiration, bool commercialUse, bool commercialAttribution, address commercializerChecker, bytes commercializerCheckerData, uint32 commercialRevShare, uint256 commercialRevCeiling, bool derivativesAllowed, bool derivativesAttribution, bool derivativesApproval, bool derivativesReciprocal, uint256 derivativeRevCeiling, address currency, string uri) terms) external returns (uint256 licenseTermsId)"
];
const LICENSE_ATTACHMENT_ABI = [
  "function attachLicenseTerms(address ipId, address licenseTemplate, uint256 licenseTermsId) external"
];

/**
 * Get license terms ID (reuses presets or registers custom)
 */
export async function getLicenseTermsId(
  licenseType: 'commercial_remix' | 'non_commercial',
  royaltyPercent: number
): Promise<string> {
  
  // Story Protocol has preset license terms that don't need registration
  // Non-commercial social remixing: ID 1
  // Commercial use: ID 2
  // Commercial remix: ID 3 and up (depending on royalty %)
  
  // For common presets, return known IDs without blockchain call
  if (licenseType === 'non_commercial' && royaltyPercent === 0) {
    console.log('✅ Using preset non-commercial license (ID: 1)');
    return '1';
  }
  
  // Check backend cache first
  const cached = await verificationService.findLicenseTerms(licenseType, royaltyPercent);
  
  if (cached.licenseTermsId) {
    console.log(`✅ Using cached license terms: ${cached.licenseTermsId}`);
    return cached.licenseTermsId;
  }
  
  // Register new terms
  console.log(`⚙️ Registering license terms: ${licenseType} ${royaltyPercent}%`);
  
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const registry = new ethers.Contract(
    LICENSE_REGISTRY_ADDRESS,
    LICENSE_REGISTRY_ABI,
    signer
  );
  
  // Create PILTerms struct as per Story Protocol docs
  // commercialRevShare is in parts per million (1% = 1_000_000, so 10% = 10_000_000)
  const pilTerms = {
    transferable: true,
    royaltyPolicy: LAP_ROYALTY_POLICY,
    defaultMintingFee: 0,
    expiration: 0,
    commercialUse: licenseType === 'commercial_remix',
    commercialAttribution: true,
    commercializerChecker: ethers.constants.AddressZero,
    commercializerCheckerData: '0x', // Empty bytes
    commercialRevShare: royaltyPercent * 1_000_000, // Convert % to parts per million
    commercialRevCeiling: 0,
    derivativesAllowed: true,
    derivativesAttribution: true,
    derivativesApproval: false,
    derivativesReciprocal: false,
    derivativeRevCeiling: 0,
    currency: WIP_TOKEN_ADDRESS,
    uri: ''
  };
  
  // First, simulate the call to get the return value (license terms ID)
  console.log('🔍 Simulating call to get license terms ID...');
  const licenseTermsId = await registry.callStatic.registerLicenseTerms(pilTerms);
  console.log('📋 Will register license terms ID:', licenseTermsId.toString());
  
  // Now execute the actual transaction
  console.log('⏳ Executing license registration transaction...');
  const tx = await registry.registerLicenseTerms(pilTerms);
  const receipt = await tx.wait();
  console.log('✅ License registered! TX:', receipt.transactionHash);
  console.log('✅ License Terms ID:', licenseTermsId.toString());
  
  const finalLicenseTermsId = licenseTermsId.toString();
  
  // Cache in backend
  await verificationService.cacheLicenseTerms({
    licenseType,
    royaltyPercent,
    licenseTermsId: finalLicenseTermsId,
    transactionHash: receipt.transactionHash
  });
  
  return finalLicenseTermsId;
}

/**
 * Attach license terms to IP Asset
 */
export async function attachLicenseTermsToIp(
  ipId: string,
  licenseTermsId: string
): Promise<{ txHash: string }> {
  
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  const contract = new ethers.Contract(
    LICENSE_ATTACHMENT_ADDRESS,
    LICENSE_ATTACHMENT_ABI,
    signer
  );
  
  // Parameters: ipId, licenseTemplate, licenseTermsId
  console.log('📎 Attaching license terms...');
  console.log('  IP ID:', ipId);
  console.log('  License Template:', PIL_TEMPLATE_ADDRESS);
  console.log('  License Terms ID:', licenseTermsId);
  
  const tx = await contract.attachLicenseTerms(
    ipId,
    PIL_TEMPLATE_ADDRESS,
    licenseTermsId
  );
  
  console.log('⏳ Waiting for attach transaction...');
  const receipt = await tx.wait();
  console.log('✅ License attached! TX:', receipt.transactionHash);
  
  return { txHash: receipt.transactionHash };
}
