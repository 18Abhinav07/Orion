# License Attachment Flow - Debugging Guide

## Overview

This guide explains the complete license attachment flow in Orion and how to debug common issues.

## License Registration Flow

### 1. License Terms Parameters

When registering `commercial_remix` with 18% royalty, the system creates:

```typescript
{
  transferable: true,
  royaltyPolicy: 0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E, // LAP Royalty Policy
  defaultMintingFee: 0,
  expiration: 0,
  commercialUse: true,              // ✅ Allows commercial use
  commercialAttribution: true,
  commercializerChecker: 0x0000...0000,
  commercializerCheckerData: '0x',
  commercialRevShare: 18_000_000,   // ✅ 18% royalty (parts per million)
  commercialRevCeiling: 0,
  derivativesAllowed: true,         // ✅ Allows derivatives/remixes
  derivativesAttribution: true,
  derivativesApproval: false,
  derivativesReciprocal: false,
  derivativeRevCeiling: 0,
  currency: 0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E, // MERC20 token
  uri: ''
}
```

### 2. Royalty Percentage Conversion

Story Protocol uses **parts per million** for royalty percentages:

- 1% = 1,000,000
- 10% = 10,000,000
- 18% = 18,000,000
- 100% = 100,000,000

**Formula**: `royaltyPercent * 1_000_000`

### 3. License Types

| Type | Commercial Use | Derivatives | Royalties |
|------|---------------|-------------|-----------|
| `commercial_remix` | ✅ YES | ✅ YES | ✅ Configurable |
| `non_commercial` | ❌ NO | ✅ YES | ❌ 0% |

## Common Issues & Solutions

### Issue 1: Wrong Cached License Used

**Symptom**: Royalty shows 0% on-chain even though you selected 18%

**Cause**: Backend cache returned license terms that matched TYPE but not ROYALTY percentage

**Solution**:
- Fixed by registering new license terms with correct royalty
- Cache now properly matches both type AND royalty percentage

**Example**:
```
❌ Bad: License ID 10 (0% royalty, no derivatives)
✅ Good: License ID 2664 (18% royalty, derivatives allowed)
```

### Issue 2: License Already Attached Error

**Error Code**: `0x55d48f8d` (LicenseTermsAlreadyAttached)

**Symptom**: Transaction reverts with "execution reverted" when attaching license

**Cause**: The IP asset already has license terms attached

**Solution**:
- Check if license is already attached before calling `attachLicenseTerms`
- Show user-friendly message instead of error
- Frontend now detects this error and displays: "ℹ️ License terms are already attached to this IP!"

**Error Detection**:
```typescript
if (errorMessage.includes('execution reverted') && errorData.includes('55d48f8d')) {
  // License already attached - show info message
}
```

### Issue 3: Multiple License Attachments

**Important**: An IP asset can have **multiple** license terms attached, but:
- Each unique license terms ID can only be attached **once**
- You CAN attach different license terms to the same IP
- You CANNOT attach the same license terms ID twice

**Example**:
```
IP: 0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E

✅ Attach License ID 10 (commercial only)     → Success
❌ Attach License ID 10 again                 → Fails (already attached)
✅ Attach License ID 2664 (commercial remix)  → Success (different terms)
```

## Verification Tools

### 1. Verify License On-Chain

Use the verification script to check actual on-chain parameters:

```bash
node verify-license.js
```

This will show:
- All license parameters (commercial use, derivatives, royalty %)
- Whether parameters match expected values
- Comparison between different license IDs

### 2. Check License Terms via Explorer

Visit Story Protocol Explorer:
```
https://aeneid.storyscan.xyz/license-terms/{licenseTermsId}
```

Look for:
- **COMMERCIALREVSHARE**: Should show your royalty percentage
- **DERIVATIVESALLOWED**: Should be TRUE for commercial_remix
- **COMMERCIALUSE**: Should be TRUE for commercial licenses

## License Attachment Workflow

### Complete Flow:

1. **Mint IP Asset** (via TestMinting.tsx)
   - Creates NFT + registers IP on Story Protocol
   - Returns: `ipId`, `tokenId`, `txHash`
   - Backend stores: nonce, contentHash, metadata URIs

2. **Select License Type** (in minting UI or LicenseAttachment.tsx)
   - Choose: commercial_remix or non_commercial
   - Set royalty percentage (0-100%)

3. **Get/Register License Terms** (licenseService.ts)
   - Check cache for existing license with same type + royalty
   - If not found: Register new license terms on-chain
   - Returns: `licenseTermsId`

4. **Attach License to IP** (licenseService.ts)
   - Call `LicensingModule.attachLicenseTerms(ipId, template, termsId)`
   - Check for "already attached" error
   - Returns: `txHash`

5. **Update Backend** (verificationService.ts)
   - Store: licenseTermsId, licenseTxHash
   - Mark asset status as 'registered'

## Files Modified

### [licenseService.ts](src/services/licenseService.ts)
- License registration with correct royalty conversion
- Attach license to IP with proper error handling

### [LicenseAttachment.tsx](src/pages/LicenseAttachment.tsx)
- Detects "already attached" error (0x55d48f8d)
- Shows user-friendly message instead of generic error
- Updated UI to display "already licensed" state

### [verify-license.js](verify-license.js)
- Utility to verify on-chain license parameters
- Compares expected vs actual values
- Helps debug royalty and derivative settings

## Testing Checklist

- [ ] License registered with correct royalty percentage
- [ ] Derivatives allowed for commercial_remix
- [ ] Commercial use enabled for commercial licenses
- [ ] Backend cache returns correct license terms
- [ ] "Already attached" error handled gracefully
- [ ] Frontend shows license details correctly
- [ ] Explorer shows correct on-chain parameters

## Contract Addresses (Aeneid Testnet)

```
PIL Template:        0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316
Licensing Module:    0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f
Royalty Policy LAP:  0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E
Currency (MERC20):   0xF2104833d386a2734a4eB3B8ad6FC6812F29E38E
```

## Success Indicators

✅ **License ID 2664** - Commercial Remix 18%
- Commercial Use: TRUE
- Derivatives: TRUE
- Royalty: 18,000,000 (18%)
- Status: ✅ CORRECT

❌ **License ID 10** - Commercial Only 0%
- Commercial Use: TRUE
- Derivatives: FALSE
- Royalty: 0 (0%)
- Status: ❌ WRONG (not commercial_remix)

## Troubleshooting Commands

```bash
# Verify license terms on-chain
node verify-license.js

# Check transaction details
curl https://aeneid.storyrpc.io \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"method":"eth_getTransactionReceipt","params":["0x...txhash"],"id":1,"jsonrpc":"2.0"}'

# Check IP asset details
# Visit: https://aeneid.storyscan.xyz/address/{ipId}
```

---

**Last Updated**: December 12, 2025
**Maintainer**: Orion Development Team
