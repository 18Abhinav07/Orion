import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { ethers } from 'ethers';
import { StoryClient } from '@story-protocol/core-sdk';
import { defineChain, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';

// --- CONFIGURATION ---
const CONTRACT_PATH = path.resolve('contracts', 'OrionVerifiedMinter.sol');
const CONTRACT_NAME = 'OrionVerifiedMinter';
const RPC_URL = 'https://aeneid.storyrpc.io';
const REGISTRATION_WORKFLOWS_ADDRESS = '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424'; // Story Protocol's RegistrationWorkflows

// Read private keys from .env
const DEPLOYER_PRIVATE_KEY = process.env.STORY_PRIVATE_KEY;
const BACKEND_VERIFIER_PRIVATE_KEY = process.env.PLATFORM_WALLET_PRIVATE_KEY;

// Define the Story Aeneid testnet for viem
const aeneidChain = defineChain({
    id: 1315,
    name: 'Story Aeneid Testnet',
    network: 'aeneid',
    nativeCurrency: {
      decimals: 18,
      name: 'IP Token',
      symbol: 'IP',
    },
    rpcUrls: {
      default: { http: [RPC_URL] },
      public: { http: [RPC_URL] },
    },
});


// --- SCRIPT ---

async function main() {
  console.log('Starting deployment script...');

  if (!DEPLOYER_PRIVATE_KEY || !BACKEND_VERIFIER_PRIVATE_KEY) {
    console.error('Error: Please make sure STORY_PRIVATE_KEY and PLATFORM_WALLET_PRIVATE_KEY are set in your .env file.');
    process.exit(1);
  }

  // 1. Compile the contract
  console.log(`Reading contract file from: ${CONTRACT_PATH}`);
  const sourceCode = fs.readFileSync(CONTRACT_PATH, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      [path.basename(CONTRACT_PATH)]: {
        content: sourceCode,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  console.log('Compiling contract...');
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    console.error('Compilation errors:');
    output.errors.forEach(err => {
      console.error(err.formattedMessage);
    });
    process.exit(1);
  }

  const compiledContract = output.contracts[path.basename(CONTRACT_PATH)][CONTRACT_NAME];
  const abi = compiledContract.abi;
  const bytecode = '0x' + compiledContract.evm.bytecode.object;
  console.log('Contract compiled successfully.');

  // 2. Set up provider, wallets and Story client
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const verifierWallet = new ethers.Wallet(BACKEND_VERIFIER_PRIVATE_KEY);
  const backendVerifierAddress = verifierWallet.address;

  const account = privateKeyToAccount(`0x${DEPLOYER_PRIVATE_KEY.startsWith('0x') ? DEPLOYER_PRIVATE_KEY.slice(2) : DEPLOYER_PRIVATE_KEY}`);
  
  const config = {
    chain: aeneidChain,
    transport: http(RPC_URL),
    account: account,
  };

  const storyClient = StoryClient.newClient(config);

  console.log(`Deployer address: ${deployerWallet.address}`);
  console.log(`Backend Verifier address: ${backendVerifierAddress}`);
  
  const balance = await provider.getBalance(deployerWallet.address);
  console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} IP`);

  if (balance.isZero()) {
    console.warn('Warning: Deployer wallet has a zero balance. You might need to fund it using the Aeneid testnet faucet.');
  }

  // 3. Deploy OrionVerifiedMinter (now requires RegistrationWorkflows address)
  console.log('Deploying OrionVerifiedMinter...');
  const contractFactory = new ethers.ContractFactory(abi, bytecode, deployerWallet);
  
  const orionVerifiedMinter = await contractFactory.deploy(
    backendVerifierAddress,
    REGISTRATION_WORKFLOWS_ADDRESS // Pass RegistrationWorkflows address to constructor
  );

  console.log(`Deployment transaction sent. Hash: ${orionVerifiedMinter.deployTransaction.hash}`);
  await orionVerifiedMinter.deployed();
  console.log(`OrionVerifiedMinter deployed to: ${orionVerifiedMinter.address}`);
  
  // 4. Create SPG collection via RegistrationWorkflows contract
  console.log('Creating SPG NFT Collection via RegistrationWorkflows...');
  
  // ABI for createCollection function
  const registrationWorkflowsABI = [
    {
      "inputs": [
        {
          "components": [
            { "internalType": "string", "name": "name", "type": "string" },
            { "internalType": "string", "name": "symbol", "type": "string" },
            { "internalType": "string", "name": "baseURI", "type": "string" },
            { "internalType": "string", "name": "contractURI", "type": "string" },
            { "internalType": "uint32", "name": "maxSupply", "type": "uint32" },
            { "internalType": "uint256", "name": "mintFee", "type": "uint256" },
            { "internalType": "address", "name": "mintFeeToken", "type": "address" },
            { "internalType": "address", "name": "mintFeeRecipient", "type": "address" },
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "bool", "name": "mintOpen", "type": "bool" },
            { "internalType": "bool", "name": "isPublicMinting", "type": "bool" }
          ],
          "internalType": "struct ISPGNFT.InitParams",
          "name": "spgNftInitParams",
          "type": "tuple"
        }
      ],
      "name": "createCollection",
      "outputs": [{ "internalType": "address", "name": "spgNftContract", "type": "address" }],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
  
  const registrationWorkflows = new ethers.Contract(
    REGISTRATION_WORKFLOWS_ADDRESS,
    registrationWorkflowsABI,
    deployerWallet
  );
  
  const collectionParams = {
    name: "Orion IP-OPS Assets",
    symbol: "ORION",
    baseURI: "",
    contractURI: "", // Empty like in Story test examples
    maxSupply: 100, // Match test example
    mintFee: 0,
    mintFeeToken: ethers.constants.AddressZero,
    mintFeeRecipient: deployerWallet.address,
    owner: deployerWallet.address,
    mintOpen: true,
    isPublicMinting: true // ✅ Allow wrapper contract to mint
  };

  console.log('Creating SPG NFT Collection with params:', {
    ...collectionParams,
    mintFee: ethers.utils.formatEther(collectionParams.mintFee) + ' IP'
  });
  
  const createCollectionTx = await registrationWorkflows.createCollection(collectionParams);
  console.log(`Collection creation transaction sent. Hash: ${createCollectionTx.hash}`);
  
  const receipt = await createCollectionTx.wait();
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  
  // The createCollection function returns the address directly, check the transaction logs
  // Story Protocol doesn't emit a standard event, so we need to decode the logs manually
  // The SPG NFT contract should be in the logs - let's look for contract creation
  let spgNftContract = null;
  
  // Try to find the collection address in the logs
  // The RegistrationWorkflows contract should have created a new SPG NFT
  // Look for a Transfer event from address(0) which indicates NFT contract deployment
  for (const log of receipt.logs) {
    try {
      // SPG NFT contracts emit events during initialization
      // We're looking for the newly created contract address
      if (log.address && log.address !== REGISTRATION_WORKFLOWS_ADDRESS) {
        // This is likely the SPG NFT contract address
        spgNftContract = log.address;
        break;
      }
    } catch (e) {
      // Skip logs we can't parse
      continue;
    }
  }
  
  if (!spgNftContract) {
    console.error('Could not find SPG NFT contract address in logs. Check transaction:', createCollectionTx.hash);
    console.error('Receipt logs:', JSON.stringify(receipt.logs, null, 2));
    throw new Error("SPG Collection address not found in transaction receipt");
  }
  
  console.log(`SPG NFT Collection created at: ${spgNftContract}`);

  // Note: SPG NFT contracts don't allow transferring ownership to another contract
  // The wrapper contract will call mintAndRegisterIp on behalf of users instead
  // Owner remains the EOA for admin functions

  // 5. Set the SPG NFT contract address on the OrionVerifiedMinter
  // 6. Set the SPG NFT contract address on the OrionVerifiedMinter
  // 5. Set the SPG NFT contract address on the OrionVerifiedMinter
  console.log('Setting SPG NFT contract address on OrionVerifiedMinter...');
  const setAddressTx = await orionVerifiedMinter.setSpgNftContract(spgNftContract);
  await setAddressTx.wait();
  console.log(`setSpgNftContract transaction hash: ${setAddressTx.hash}`);

  console.log('\n========================================');
  console.log('🎉 DEPLOYMENT COMPLETE 🎉');
  console.log('========================================');
  console.log(`OrionVerifiedMinter: ${orionVerifiedMinter.address}`);
  console.log(`SPG NFT Collection: ${spgNftContract}`);
  console.log(`Collection Owner: ${deployerWallet.address} (EOA)`);
  console.log('========================================');
  console.log('\n📝 TODO: Update frontend config with these addresses');
  console.log('========================================\n');
}

main().catch((error) => {
  console.error('An error occurred during deployment:', error);
  process.exit(1);
});
