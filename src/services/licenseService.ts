// src/services/licenseService.ts
import { ethers } from 'ethers';
import { verificationService } from './verificationService';

// Story Protocol Aeneid Testnet Contract Addresses
// PILicenseTemplate is used for both registry and template
const PIL_LICENSE_TEMPLATE = '0x58E2c909D557Cd23EF90D14f8fd21667A5Ae7a93'; // PILicenseTemplate
const LICENSING_MODULE = '0x5a7D9Fa17DE09350F481A53B470D798c1c1aabae'; // LicensingModule  
const ROYALTY_POLICY_LAP = '0x28b4F70ffE5ba7A26aEF979226f77Eb57fb9Fdb6'; // RoyaltyPolicyLAP
const CURRENCY_TOKEN = '0xB132A6B7AE652c974EE1557A3521D53d18F6739f'; // SUSD token

// For backwards compatibility with plan variable names
const LICENSE_REGISTRY_ADDRESS = PIL_LICENSE_TEMPLATE;
const LAP_ROYALTY_POLICY = ROYALTY_POLICY_LAP;
const WIP_TOKEN_ADDRESS = CURRENCY_TOKEN;
const PIL_TEMPLATE_ADDRESS = PIL_LICENSE_TEMPLATE;
const LICENSE_ATTACHMENT_ADDRESS = LICENSING_MODULE;

// ABIs (minimal as per the plan)
const LICENSE_REGISTRY_ABI = [
  "event LicenseTermsRegistered(uint256 indexed licenseTermsId, address indexed licenseTemplate, bytes32 indexed pil, bytes licenseTerms)",
  "function registerPILTerms(bool transferable, address royaltyPolicy, uint256 defaultMintingFee, uint256 expiration, bool commercialUse, bool commercialAttribution, address commercializerChecker, uint32 commercialRevShare, uint256 commercialRevCeiling, bool derivativesAllowed, bool derivativesAttribution, bool derivativesApproval, bool derivativesReciprocal, uint256 derivativeRevCeiling, address currency, string uri) returns (uint256 licenseTermsId)"
];
const LICENSE_ATTACHMENT_ABI = [
  "function attachLicenseTerms(address ipId, uint256 licenseTermsId, address licenseTemplate)"
];

/**
 * Get license terms ID (reuses presets or registers custom)
 */
export async function getLicenseTermsId(
  licenseType: 'commercial_remix' | 'non_commercial',
  royaltyPercent: number
): Promise<string> {
  
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
  
  // The plan has a simplified call. The actual `registerPILTerms` takes more params.
  // We'll use the full list here for correctness.
  const tx = await registry.registerPILTerms(
    true, // transferable
    LAP_ROYALTY_POLICY, // royaltyPolicy
    0, // defaultMintingFee
    0, // expiration
    licenseType === 'commercial_remix', // commercialUse
    true, // commercialAttribution
    ethers.constants.AddressZero, // commercializerChecker
    royaltyPercent, // commercialRevShare
    0, // commercialRevCeiling
    true, // derivativesAllowed
    true, // derivativesAttribution
    false, // derivativesApproval
    false, // derivativesReciprocal
    0, // derivativeRevCeiling
    WIP_TOKEN_ADDRESS, // currency
    '' // uri
  );
  
  const receipt = await tx.wait();
  const event = receipt.events?.find(e => e.event === 'LicenseTermsRegistered');
  const licenseTermsId = event?.args?.licenseTermsId.toString();

  if (!licenseTermsId) {
    throw new Error("Failed to register license terms: could not find LicenseTermsRegistered event.");
  }
  
  // Cache in backend
  await verificationService.cacheLicenseTerms({
    licenseType,
    royaltyPercent,
    licenseTermsId,
    transactionHash: tx.hash
  });
  
  return licenseTermsId;
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
  
  const tx = await contract.attachLicenseTerms(
    ipId,
    licenseTermsId,
    PIL_TEMPLATE_ADDRESS
  );
  
  const receipt = await tx.wait();
  
  return { txHash: receipt.hash };
}
