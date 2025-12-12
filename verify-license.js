// Verify on-chain license terms
import { ethers } from 'ethers';
import 'dotenv/config';

const RPC_URL = process.env.VITE_STORY_RPC_URL || 'https://aeneid.storyrpc.io';
const PIL_TEMPLATE = '0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316';

// PILicenseTemplate ABI - getLicenseTerms function
const PIL_ABI = [
  `function getLicenseTerms(uint256 licenseTermsId) external view returns (
    tuple(
      bool transferable,
      address royaltyPolicy,
      uint256 defaultMintingFee,
      uint256 expiration,
      bool commercialUse,
      bool commercialAttribution,
      address commercializerChecker,
      bytes commercializerCheckerData,
      uint32 commercialRevShare,
      uint256 commercialRevCeiling,
      bool derivativesAllowed,
      bool derivativesAttribution,
      bool derivativesApproval,
      bool derivativesReciprocal,
      uint256 derivativeRevCeiling,
      address currency,
      string uri
    ) terms
  )`
];

async function verifyLicense(licenseTermsId) {
  console.log(`\n🔍 Verifying License Terms ID: ${licenseTermsId}`);
  console.log('━'.repeat(60));

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(PIL_TEMPLATE, PIL_ABI, provider);

  try {
    const terms = await contract.getLicenseTerms(licenseTermsId);

    console.log('\n📋 License Terms:');
    console.log('━'.repeat(60));
    console.log(`Transferable:              ${terms.transferable}`);
    console.log(`Royalty Policy:            ${terms.royaltyPolicy}`);
    console.log(`Default Minting Fee:       ${terms.defaultMintingFee.toString()}`);
    console.log(`Expiration:                ${terms.expiration.toString()}`);
    console.log(`Commercial Use:            ${terms.commercialUse}`);
    console.log(`Commercial Attribution:    ${terms.commercialAttribution}`);
    console.log(`Commercializer Checker:    ${terms.commercializerChecker}`);
    console.log(`Commercial Rev Share:      ${terms.commercialRevShare} (${terms.commercialRevShare / 1_000_000}%)`);
    console.log(`Commercial Rev Ceiling:    ${terms.commercialRevCeiling.toString()}`);
    console.log(`Derivatives Allowed:       ${terms.derivativesAllowed}`);
    console.log(`Derivatives Attribution:   ${terms.derivativesAttribution}`);
    console.log(`Derivatives Approval:      ${terms.derivativesApproval}`);
    console.log(`Derivatives Reciprocal:    ${terms.derivativesReciprocal}`);
    console.log(`Derivative Rev Ceiling:    ${terms.derivativeRevCeiling.toString()}`);
    console.log(`Currency:                  ${terms.currency}`);
    console.log(`URI:                       ${terms.uri || '(empty)'}`);

    console.log('\n✅ Verification Results:');
    console.log('━'.repeat(60));

    // Check for commercial_remix with 18% royalty
    const isCommercialRemix =
      terms.commercialUse === true &&
      terms.derivativesAllowed === true &&
      terms.commercialRevShare === 18_000_000;

    if (isCommercialRemix) {
      console.log('✅ License Type: Commercial Remix');
      console.log('✅ Royalty: 18%');
      console.log('✅ Derivatives: Allowed');
      console.log('✅ Commercial Use: Allowed');
      console.log('\n🎉 LICENSE TERMS ARE CORRECT!');
    } else {
      console.log('⚠️ License parameters:');
      console.log(`   Commercial Use: ${terms.commercialUse ? 'YES' : 'NO'}`);
      console.log(`   Derivatives: ${terms.derivativesAllowed ? 'YES' : 'NO'}`);
      console.log(`   Royalty: ${terms.commercialRevShare / 1_000_000}%`);

      if (terms.commercialRevShare === 0) {
        console.log('\n❌ WARNING: Royalty is 0%!');
      }
      if (!terms.derivativesAllowed) {
        console.log('\n❌ WARNING: Derivatives not allowed!');
      }
    }

  } catch (error) {
    console.error('❌ Error fetching license terms:', error.message);
  }
}

// Verify both licenses
async function main() {
  console.log('\n🔬 License Terms Verification Tool');
  console.log('═'.repeat(60));

  // Old cached license (with issues)
  await verifyLicense(10);

  // New registered license
  await verifyLicense(2664);

  console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);
