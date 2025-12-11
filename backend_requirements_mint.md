💋 **Backend To-Do List: Don't Fuck It Up** 💋

Alright boys, listen up. Daddy and I need a backend system, and we're not getting our hands dirty. This is your job. Get it done right, and get it done fast.

---

### **1. The Database Thingy (MongoDB)**

I need a new collection called `mint_tokens`. I don't care how you make it, just make sure it has these fields. And don't mess up the types.

- **`nonce`**: A number. Make it special and unique. It should go up by one every time.
- **`creatorAddress`**: A string. You know, the `0x...` thing.
- **`contentHash`**: A string. Also a `0x...` thing.
- **`ipMetadataURI`**: A string. Should be an IPFS link.
- **`nftMetadataURI`**: A string. Also an IPFS link.
- **`signature`**: A string. The super-secret signature you're gonna make.
- **`expiresAt`**: A date. Set it for 15 minutes after you create it. Don't make me wait forever.
- **`status`**: A string. It can be `'pending'`, `'used'`, `'expired'`, or `'revoked'`. It should start as `'pending'`.
- **`ipId`**: A string. For the Story Protocol IP ID.
- **`tokenId`**: A number. The NFT token ID.
- **`txHash`**: A string. The transaction hash.
- **`usedAt`**: A date. The time the token was used.

Make sure you put indexes on `nonce`, `creatorAddress`, `contentHash`, `expiresAt`, and `status`. I want this shit to be fast.

---

### **2. The API Endpoints**

I need three little endpoints to play with. Build them in your Express app.

#### **Endpoint #1: Give Me a Signature**

- **Route**: `POST /api/verification/generate-mint-token`
- **What it needs (Request Body)**:
  - `creatorAddress` (string)
  - `contentHash` (string)
  - `ipMetadataURI` (string)
  - `nftMetadataURI` (string)

- **What it does**:
  1.  **Check for duplicates**: Look in your dirty database. If you find something with the same `contentHash` that's already been `'used'`, send an error. We don't do repeats.
  2.  **Make a nonce**: Give me a new number, one higher than the last one.
  3.  **Set an expiry**: 15 minutes. Clock's ticking.
  4.  **Make a hash**: Use `ethers.solidityPackedKeccak256` just like in the big plan. Mash these things together in this order: `creatorAddress`, `contentHash`, `ipMetadataURI`, `nftMetadataURI`, `nonce`, `expiresAt`.
  5.  **Sign it**: Use that secret `BACKEND_VERIFIER_PRIVATE_KEY` to sign the hash.
  6.  **Save it**: Shove all this into your `mint_tokens` collection.
  7.  **Give it to me (Response Body)**:
      ```json
      {
        "success": true,
        "data": {
          "signature": "0xYourSignature...",
          "nonce": 42,
          "expiresAt": 1702394125,
          "expiresIn": 900
        }
      }
      ```

#### **Endpoint #2: Is It Still Good?**

- **Route**: `GET /api/verification/token/:nonce/status`

- **What it does**:
  1.  Find the token with the `nonce` I give you.
  2.  If it's expired and still `'pending'`, change its status to `'expired'`. Clean up your own messes.
  3.  Tell me everything about it. I want to see the `status`, if it's `isExpired`, and if it's still pending, tell me how many `remainingSeconds` I have. If it's used, show me the `ipId`, `tokenId`, and `txHash`.

#### **Endpoint #3: I'm Done With It**

- **Route**: `PATCH /api/verification/token/:nonce/update`
- **What it needs (Request Body)**:
  - `ipId` (string)
  - `tokenId` (number)
  - `txHash` (string)

- **What it does**:
  1.  Find the token by its `nonce`.
  2.  If it's already `'used'`, tell me. Don't let anyone use my things twice.
  3.  Update the status to `'used'`.
  4.  Save the `ipId`, `tokenId`, `txHash`, and the time it was `usedAt`.
  5.  Send me back a success message so I know you did your job.

---

That's it. Don't disappoint me or Daddy. Get it done. 💅
