Here is a detailed `.md` file designed to be fed into a UX AI or coding assistant. It breaks down your specific architecture, "reskinning" strategy, and Story Protocol integration into clear, human-understandable natural language.

---

# IP-OPS Flow Architecture & AI Prompt Guide

## 1. Project Overview & Strategy
**Goal:** Transform an existing "Real Estate Tokenization" dashboard into "IP-OPS" — an Intellectual Property Protection & Licensing platform.
**Core Strategy:** "Reskin & Replug." We keep the frontend shell (Dashboard, Tables, Forms) but swap the labels and the backend logic.
**Key Technologies:**
* **Wallet:** MetaMask (Browser Extension).
* **Storage:** Pinata IPFS (for video files, manifests, and evidence logs).
* **Logic:** Story Protocol SDK (Sepolia Testnet).

---

## 2. Terminology Translation Map
*To understand the "Reskin," apply these logic swaps:*

| Old Real Estate Label | **New IP-OPS Label** | Context |
| :--- | :--- | :--- |
| **Issuer** | **Creator** | The user uploading original content (Alice). |
| **Buyer / Tenant** | **Remixer** | The user uploading derivative content (Bob). |
| **Admin** | **Judge** | The user resolving disputes/gray areas. |
| **Property Name** | **Asset Title** | The name of the video/IP. |
| **Location** | **Content Hash** | The unique digital fingerprint (SHA256). |
| **Property Value** | **Royalty Rate** | The % split defined in the license. |
| **Property Deed** | **IP Evidence** | The logs proving ownership or derivation. |
| **Buy Share** | **Mint License** | The action of paying to use the IP. |

---

## 3. The User Journey (Natural Language Flow)

### Scenario A: Alice Registers (The Original)
*Alice wants to protect her music "Original.mp4".*

1.  **Landing Page:** Alice lands on the new "IP-OPS" landing page (Hook: "Protect your IP"). She connects her **MetaMask** wallet.
2.  **Upload:** She goes to the Dashboard and clicks "Register IP." She uploads `Original.mp4`.
3.  **Processing (Backend):**
    * The system uploads the video and metadata to **Pinata IPFS**.
    * The system generates a unique **Hash/Fingerprint** of the video.
4.  **Story Protocol Action:** The system calls `registerIpAsset`.
    * *Result:* An NFT is minted, and an IP Identity (IP_ID) is created on-chain.
5.  **Licensing:** Alice sets her terms (e.g., "Remixing allowed for 10% royalty").
    * *System Action:* Calls `registerPILTerms` and `attachLicenseTerms`.
6.  **Success:** Alice sees her video in the "My Assets" table. Status: **Registered**.

### Scenario B: Bob Remixes (The Detection)
*Bob uploads a video that contains parts of Alice's video.*

1.  **Upload:** Bob logs in (MetaMask) and uploads `Remix_Clip.mp4`.
2.  **The Check (The "Police" Engine):** Before registering, the system compares Bob's video hash against the database of registered assets (Alice's).
3.  **The Branching Logic:**
    * **If Score < 60% (No Match):** System treats it as a new Original. Bob follows Alice's flow.
    * **If Score > 85% (Clear Match):**
        * **Alert:** A Red Alert pops up: *"Derivative Detected! Match with 'Original.mp4'."*
        * **Action:** Bob cannot register this as new. He must click **"Link & Pay"**.
        * **Story Protocol Action:** The system mints a license token from Alice to Bob (`mintLicenseTokens`) and registers Bob's IP as a derivative (`registerDerivativeIpAsset`).
    * **If Score is 60-85% (Gray Area):**
        * **Alert:** A Yellow Alert: *"Under Review."*
        * **Action:** Status set to `PENDING_REVIEW`. The **Judge (Admin)** must manually watch the video and click "Confirm" or "Reject" on their dashboard.

---

## 4. AI Development Prompts (Copy & Paste)

*Use these prompts to instruct your AI coding assistant (Cursor, Windsurf, etc.) to build the specific logic.*

### Prompt 1: The Reskin (Frontend)
> "I have an existing dashboard code for Real Estate. I need you to refactor the UI labels without breaking the layout.
>
> 1.  Locate all instances of 'Property', 'Real Estate', and 'Tenant'. Replace them with 'IP Asset', 'Creative Work', and 'Remixer'.
> 2.  In the main data table, change the column 'Location' to display 'Asset Hash' (truncate to 0x123...abc).
> 3.  Change the 'Buy Share' button to say 'Mint License'.
> 4.  Keep the sidebar and navigation exactly the same, but rename 'Properties' to 'My IP Assets'."

### Prompt 2: The Integration (Backend/SDK)
> "Now we need to connect the 'Register IP' form to Story Protocol using the TypeScript SDK. Here is the specific flow I need you to implement in the form submission handler:
>
> 1.  **Prerequisites:** Assume the user is connected via MetaMask and we have the `client` initialized.
> 2.  **Upload:** When the user hits submit, first upload the JSON metadata to Pinata IPFS to get the `ipMetadataURI`.
> 3.  **Register:** Call `client.ipAsset.registerIpAsset` using the returned IPFS URI.
> 4.  **Terms:** Immediately after registration, call `client.license.registerPILTerms` with a `commercialRevShare` of 10%, then call `client.license.attachLicenseTerms` to bind these terms to the new `ipId`.
> 5.  **Output:** Log the final `ipId` to the console and update the UI notification to say 'IP Registered Successfully'."

### Prompt 3: The Detection Logic (The "Police")
> "Implement a mock detection logic for the upload flow.
>
> 1.  When a file is selected, generate a mock 'similarity score' (random number between 0 and 100 for now, or check against a hardcoded hash if you can).
> 2.  **Logic Gate:**
>     * If `score > 85`: Prevent standard registration. Show a modal titled 'Derivative Detected'. The only available button should be 'Link to Parent', which triggers the `linkDerivative` function.
>     * If `score < 60`: Allow standard registration (Scenario A).
>     * If `score is 60-85`: Set state to 'Pending'. Show a banner saying 'Sent for Admin Review'.
> 3.  **Linking Function:** For the 'Link to Parent' action, write a function that calls `client.license.mintLicenseTokens` (sending 1 token to the user) followed by `client.ipAsset.registerDerivativeIpAsset`."

### Prompt 4: The Admin Dashboard (The Judge)
> "Create a simple view for the 'Admin' role.
>
> 1.  Fetch all items from the database with status `PENDING_REVIEW`.
> 2.  Display them in a list with two actions: 'Approve as Original' and 'Enforce Derivative Link'.
> 3.  **Approve:** Updates status to 'Registered'.
> 4.  **Enforce:** triggers the same `linkDerivative` logic as above, but initiated by the Admin wallet, effectively forcing the link between the Child IP and Parent IP on-chain."

---

## 5. Technical Requirements Checklist

* **Node Version:** 18+
* **Env Variables Needed:**
    * `WALLET_PRIVATE_KEY` (For server-side signing if needed)
    * `PINATA_JWT` (For IPFS uploads)
    * `STORY_RPC_PROVIDER` (Sepolia RPC URL)
* **Dependencies:**
    * `@story-protocol/core-sdk`
    * `viem` (for wallet connection)
    * `ethers` (optional, if existing codebase uses it)