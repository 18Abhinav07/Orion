# 💅 Frontend To-Do List: Make It Pretty 💅

Alright, now for the fun part. The backend boys are doing their boring database stuff, so it's our turn to make things happen on the screen. We need two new services to make our minting magic work.

Pay attention, because I only want to say this once.

---

### **1. The "Talk to the Backend" Service (`VerificationService.ts`)**

We need a way to sweet-talk our new backend. Create a new service file, `src/services/verificationService.ts`. It needs to know how to do three things:

#### **A. Get Our Golden Ticket**
- **Method**: `generateMintToken(params)`
- **What it needs**: An object with `creatorAddress`, `contentHash`, `ipMetadataURI`, and `nftMetadataURI`.
- **What it does**: Hits our backend `POST /api/verification/generate-mint-token` endpoint with the params.
- **What it gives back**: The `signature`, `nonce`, and `expiresAt` from the backend. Don't come back empty-handed.

#### **B. Check if the Ticket is Still Hot**
- **Method**: `checkTokenStatus(nonce)`
- **What it needs**: The `nonce` (a number).
- **What it does**: Hits the `GET /api/verification/token/:nonce/status` endpoint.
- **What it gives back**: The full status of the token. I want to know if it's pending, used, or expired. All the juicy details.

#### **C. Tell the Backend We're Done**
- **Method**: `updateTokenAfterMint(params)`
- **What it needs**: An object with the `nonce`, `ipId`, `tokenId`, and `txHash`.
- **What it does**: Hits the `PATCH /api/verification/token/:nonce/update` endpoint.
- **What it gives back**: Nothing. Just make sure it works.

Also, add a little helper method `hashContent(content)` that takes a string and gives us back a SHA256 hash. We'll need it.

---

### **2. The "Talk to the Blockchain" Service (`StoryProtocolService.ts`)**

This one is for talking to our new smart contract on the Story Protocol testnet. Create a new service file, `src/services/storyProtocolService.ts`.

**Contract Details (Don't fuck this up):**
- **Contract**: `OrionVerifiedMinter`
- **Address**: `0x9cb153775B639DCa50F1BA7a6daa34af12466450` (from the plan)
- **ABI**: You only need the `verifyAndMint`, `usedNonces`, and `getBackendVerifier` functions in the ABI. Keep it clean.

This service needs to do these things:

#### **A. Make the Magic Happen**
- **Method**: `verifyAndMint(params)`
- **What it needs**: An object with `contentHash`, `ipMetadataURI`, `nftMetadataURI`, `nonce`, `expiryTimestamp`, and that precious `signature` we got from the backend.
- **What it does**:
  1.  Make sure the user's wallet is connected. No wallet, no magic.
  2.  Get the `OrionVerifiedMinter` contract instance.
  3.  Call the `verifyAndMint` function on the contract with all the params.
  4.  Wait for the transaction to be confirmed. Don't be impatient.
  5.  Get the `ipId` and `tokenId` from the transaction events.
- **What it gives back**: An object with the `ipId`, `tokenId`, and `txHash`.

#### **B. Check for Replays**
- **Method**: `isNonceUsed(nonce)`
- **What it needs**: The `nonce`.
- **What it does**: Calls the `usedNonces` view function on the contract to see if a nonce has already been used.
- **What it gives back**: `true` or `false`. Simple.

#### **C. Get the Verifier Address**
- **Method**: `getBackendVerifier()`
- **What it does**: Calls the `backendVerifier` view function on the contract.
- **What it gives back**: The address of our backend's verifier.

---

That's your list. Get it done, and make it look good. Daddy's watching. 😘
