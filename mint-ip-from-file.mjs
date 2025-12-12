import fs from 'fs';
import { ethers } from 'ethers';
import axios from 'axios';
import 'dotenv/config';

// Configuration
const RPC_URL = 'https://aeneid.storyrpc.io';
const PRIVATE_KEY = process.env.STORY_PRIVATE_KEY;
const BACKEND_API = 'http://localhost:3001/api';
const REGISTRATION_WORKFLOWS = '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424';
const SPG_NFT_CONTRACT = '0x78AD3d22E62824945DED384a5542Ad65de16E637';

// Read markdown file
const MD_FILE_PATH = './test-content.md';

console.log('\n🎨 Minting IP Asset from Markdown File\n');
console.log('═'.repeat(60));

async function main() {
  // Step 1: Read and hash the markdown content
  console.log('\n📄 Step 1: Reading markdown file...');
  const content = fs.readFileSync(MD_FILE_PATH, 'utf-8');
  console.log('Content preview:');
  console.log(content.substring(0, 200) + '...');

  const contentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
  console.log('\n✅ Content hash:', contentHash);

  // Step 2: Setup wallet
  console.log('\n🔐 Step 2: Setting up wallet...');
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const userAddress = wallet.address;

  console.log('Wallet address:', userAddress);

  const balance = await provider.getBalance(userAddress);
  console.log('Balance:', ethers.utils.formatEther(balance), 'IP');

  // Step 3: Create metadata URIs (mock IPFS)
  console.log('\n☁️  Step 3: Creating metadata URIs...');
  const timestamp = Date.now();
  const ipMetadataURI = `ipfs://QmIPMeta${timestamp}`;
  const nftMetadataURI = `ipfs://QmNFTMeta${timestamp}`;

  console.log('IP Metadata URI:', ipMetadataURI);
  console.log('NFT Metadata URI:', nftMetadataURI);

  // Step 4: Get backend signature
  console.log('\n🔏 Step 4: Requesting backend signature...');
  try {
    const response = await axios.post(`${BACKEND_API}/verification/generate-mint-token`, {
      creatorAddress: userAddress,
      contentHash,
      ipMetadataURI,
      nftMetadataURI
    });

    const { signature, nonce, expiresAt, expiresIn } = response.data.data;
    console.log('✅ Signature received!');
    console.log('Nonce:', nonce);
    console.log('Expires in:', expiresIn, 'seconds');
    console.log('Signature:', signature.substring(0, 20) + '...');

    // Step 5: Mint via RegistrationWorkflows
    console.log('\n⛓️  Step 5: Minting IP Asset...');

    const WORKFLOWS_ABI = [
      "function mintAndRegisterIp(address spgNftContract, address recipient, tuple(string ipMetadataURI, bytes32 ipMetadataHash, string nftMetadataURI, bytes32 nftMetadataHash) ipMetadata, bool allowDuplicates) returns (address ipId, uint256 tokenId)"
    ];

    const workflowsContract = new ethers.Contract(
      REGISTRATION_WORKFLOWS,
      WORKFLOWS_ABI,
      wallet
    );

    const ipMetadata = {
      ipMetadataURI,
      ipMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipMetadataURI)),
      nftMetadataURI,
      nftMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(nftMetadataURI))
    };

    console.log('Calling mintAndRegisterIp...');
    const tx = await workflowsContract.mintAndRegisterIp(
      SPG_NFT_CONTRACT,
      userAddress,
      ipMetadata,
      true, // allowDuplicates
      {
        gasLimit: 5000000
      }
    );

    console.log('📝 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed!');
    console.log('Block number:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());

    // Parse events
    let ipId = '';
    let tokenId = 0;

    for (const log of receipt.logs) {
      if (log.topics.length >= 4) {
        tokenId = parseInt(log.topics[3], 16);
        if (tokenId > 0) break;
      }
    }

    ipId = `0x${receipt.transactionHash.slice(2, 42)}`;

    console.log('\n🎉 SUCCESS! IP Asset Minted!');
    console.log('═'.repeat(60));
    console.log('Token ID:', tokenId);
    console.log('IP ID:', ipId);
    console.log('Transaction Hash:', receipt.transactionHash);
    console.log('Explorer:', `https://aeneid.storyscan.xyz/tx/${receipt.transactionHash}`);
    console.log('═'.repeat(60));

    // Step 6: Update backend
    console.log('\n📡 Step 6: Updating backend...');
    await axios.patch(`${BACKEND_API}/verification/token/${nonce}/update`, {
      ipId,
      tokenId: tokenId.toString(),
      txHash: receipt.transactionHash
    });

    console.log('✅ Backend updated!');
    console.log('\n✨ All done! Your IP asset has been successfully registered on Story Protocol.\n');

  } catch (error) {
    if (error.response) {
      console.error('❌ Backend error:', error.response.data);
    } else if (error.transaction) {
      console.error('❌ Transaction failed');
      console.error('Error:', error.message);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

main().catch(console.error);
