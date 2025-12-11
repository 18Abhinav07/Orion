// Test Script for Settlement and Burn Events
// Tests events emitted for address: 0xe7a5731070145b490fc9c81a45f98dc04bbece20

import { ethers } from 'ethers';

// Contract addresses - Flow Testnet
const CONTRACT_ADDRESSES = {
  TOKEN_CONTRACT: "0x24eb8429Dc1e5f217866D0c74Db245Fa3aAFA31A", // Flow testnet ERC1155Core
  ADMIN_CONTRACT: "0xFC53E7A6b94173D82d07a127A38d9D852bf478d4", // Flow testnet Admin contract
  PAYMENT_SPLITTER_CONTRACT: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91", // Flow testnet PaymentSplitter
  MARKETPLACE_CONTRACT: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF" // Flow testnet Marketplace
};

// Test address
const TEST_ADDRESS = "0xe7a5731070145b490fc9c81a45f98dc04bbece20";

// Contract ABIs for events
const EVENT_ABIS = {
  ERC1155CORE: [
    "event InvoiceSettled(uint256 indexed tokenId, uint256 amount, uint256 timestamp)",
    "event TokenBurned(uint256 indexed tokenId, uint256 timestamp)",
    "event TokenMinted(address indexed issuer, uint256 indexed tokenId, uint256 amount, uint256 price, string metadataURI)"
  ],
  ADMIN: [
    "event InvoiceSettledByAdmin(uint256 indexed tokenId, uint256 amount, uint256 timestamp)"
  ],
  PAYMENTSPLITTER: [
    "event RentalDistributed(uint256 indexed tokenId, uint256 totalAmount, uint256 toHolders, uint256 toPlatform)",
    "event InvoiceSettlementProcessed(uint256 indexed tokenId, uint256 totalAmount, uint256 timestamp)"
  ],
  MARKETPLACE: [
    "event AssetBought(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 platformFee)",
    "event AssetSold(uint256 indexed tokenId, address indexed seller, uint256 amount, uint256 platformFee)"
  ]
};

async function setupProvider() {
  // Setup provider for Flow testnet
  const provider = new ethers.providers.JsonRpcProvider("https://mainnet.evm.nodes.onflow.org");
  
  return provider;
}

async function testSettlementAndBurnEvents() {
  console.log("🔍 Testing Settlement and Burn Events");
  console.log("=" .repeat(50));
  console.log(`📋 Test Address: ${TEST_ADDRESS}`);
  console.log("=" .repeat(50));

  try {
    const provider = await setupProvider();
    
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    console.log(`📦 Current Block: ${currentBlock}`);
    
    // Define block range for search (last 10000 blocks)
    const fromBlock = Math.max(0, currentBlock - 10000);
    const toBlock = currentBlock;
    
    console.log(`🔍 Searching blocks ${fromBlock} to ${toBlock}`);
    console.log("");

    // Test 1: ERC1155CORE Contract Events
    await testERC1155CoreEvents(provider, fromBlock, toBlock);
    
    // Test 2: Admin Contract Events  
    await testAdminEvents(provider, fromBlock, toBlock);
    
    // Test 3: Payment Splitter Events
    await testPaymentSplitterEvents(provider, fromBlock, toBlock);
    
    // Test 4: Marketplace Events (for income tracking)
    await testMarketplaceEvents(provider, fromBlock, toBlock);
    
    // Test 5: Check if address holds any tokens
    await checkTokenHoldings(provider);
    
    console.log("\n✅ Event testing completed!");
    
  } catch (error) {
    console.error("❌ Error during event testing:", error);
  }
}

async function testERC1155CoreEvents(provider, fromBlock, toBlock) {
  console.log("🔍 Testing ERC1155CORE Contract Events");
  console.log("-".repeat(40));
  
  try {
    const tokenContract = new ethers.Contract(
      CONTRACT_ADDRESSES.TOKEN_CONTRACT,
      EVENT_ABIS.ERC1155CORE,
      provider
    );

    // Test InvoiceSettled events
    console.log("📋 Checking InvoiceSettled events...");
    const invoiceSettledFilter = tokenContract.filters.InvoiceSettled();
    const invoiceSettledEvents = await tokenContract.queryFilter(invoiceSettledFilter, fromBlock, toBlock);
    
    console.log(`   Found ${invoiceSettledEvents.length} InvoiceSettled events`);
    invoiceSettledEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. TokenId: ${event.args.tokenId}, Amount: ${ethers.utils.formatEther(event.args.amount)} FLOW, Block: ${event.blockNumber}`);
    });

    // Test TokenBurned events  
    console.log("🔥 Checking TokenBurned events...");
    const tokenBurnedFilter = tokenContract.filters.TokenBurned();
    const tokenBurnedEvents = await tokenContract.queryFilter(tokenBurnedFilter, fromBlock, toBlock);
    
    console.log(`   Found ${tokenBurnedEvents.length} TokenBurned events`);
    tokenBurnedEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. TokenId: ${event.args.tokenId}, Block: ${event.blockNumber}`);
    });

    // Test TokenMinted events (to see what tokens exist)
    console.log("🪙 Checking TokenMinted events...");
    const tokenMintedFilter = tokenContract.filters.TokenMinted();
    const tokenMintedEvents = await tokenContract.queryFilter(tokenMintedFilter, fromBlock, toBlock);
    
    console.log(`   Found ${tokenMintedEvents.length} TokenMinted events`);
    tokenMintedEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. TokenId: ${event.args.tokenId}, Issuer: ${event.args.issuer}, Amount: ${event.args.amount}, Block: ${event.blockNumber}`);
    });

    // Check events related to our test address
    console.log(`🎯 Filtering events for address ${TEST_ADDRESS}...`);
    const relevantEvents = [
      ...invoiceSettledEvents,
      ...tokenBurnedEvents,
      ...tokenMintedEvents.filter(e => e.args.issuer.toLowerCase() === TEST_ADDRESS.toLowerCase())
    ];
    
    console.log(`   Found ${relevantEvents.length} events relevant to test address`);
    
  } catch (error) {
    console.error("❌ Error testing ERC1155CORE events:", error);
  }
  
  console.log("");
}

async function testAdminEvents(provider, fromBlock, toBlock) {
  console.log("🔍 Testing Admin Contract Events");
  console.log("-".repeat(40));
  
  try {
    const adminContract = new ethers.Contract(
      CONTRACT_ADDRESSES.ADMIN_CONTRACT,
      EVENT_ABIS.ADMIN,
      provider
    );

    // Test InvoiceSettledByAdmin events
    console.log("📋 Checking InvoiceSettledByAdmin events...");
    const settledByAdminFilter = adminContract.filters.InvoiceSettledByAdmin();
    const settledByAdminEvents = await adminContract.queryFilter(settledByAdminFilter, fromBlock, toBlock);
    
    console.log(`   Found ${settledByAdminEvents.length} InvoiceSettledByAdmin events`);
    settledByAdminEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. TokenId: ${event.args.tokenId}, Amount: ${ethers.utils.formatEther(event.args.amount)} FLOW, Block: ${event.blockNumber}`);
    });
    
  } catch (error) {
    console.error("❌ Error testing Admin events:", error);
  }
  
  console.log("");
}

async function testPaymentSplitterEvents(provider, fromBlock, toBlock) {
  console.log("🔍 Testing Payment Splitter Events");
  console.log("-".repeat(40));
  
  try {
    const paymentSplitterContract = new ethers.Contract(
      CONTRACT_ADDRESSES.PAYMENT_SPLITTER_CONTRACT,
      EVENT_ABIS.PAYMENTSPLITTER,
      provider
    );

    // Test RentalDistributed events (yield payments)
    console.log("💰 Checking RentalDistributed events...");
    const rentalDistributedFilter = paymentSplitterContract.filters.RentalDistributed();
    const rentalDistributedEvents = await paymentSplitterContract.queryFilter(rentalDistributedFilter, fromBlock, toBlock);
    
    console.log(`   Found ${rentalDistributedEvents.length} RentalDistributed events`);
    rentalDistributedEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. TokenId: ${event.args.tokenId}, Total: ${ethers.utils.formatEther(event.args.totalAmount)} FLOW, Block: ${event.blockNumber}`);
    });

    // Test InvoiceSettlementProcessed events
    console.log("📋 Checking InvoiceSettlementProcessed events...");
    const settlementProcessedFilter = paymentSplitterContract.filters.InvoiceSettlementProcessed();
    const settlementProcessedEvents = await paymentSplitterContract.queryFilter(settlementProcessedFilter, fromBlock, toBlock);
    
    console.log(`   Found ${settlementProcessedEvents.length} InvoiceSettlementProcessed events`);
    settlementProcessedEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. TokenId: ${event.args.tokenId}, Amount: ${ethers.utils.formatEther(event.args.totalAmount)} FLOW, Block: ${event.blockNumber}`);
    });
    
  } catch (error) {
    console.error("❌ Error testing Payment Splitter events:", error);
  }
  
  console.log("");
}

async function testMarketplaceEvents(provider, fromBlock, toBlock) {
  console.log("🔍 Testing Marketplace Events (for income tracking)");
  console.log("-".repeat(40));
  
  try {
    const marketplaceContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT || "0x123", // Placeholder
      EVENT_ABIS.MARKETPLACE,
      provider
    );

    // Test AssetBought events where test address is buyer
    console.log("🛒 Checking AssetBought events...");
    const assetBoughtFilter = marketplaceContract.filters.AssetBought(null, TEST_ADDRESS);
    const assetBoughtEvents = await marketplaceContract.queryFilter(assetBoughtFilter, fromBlock, toBlock);
    
    console.log(`   Found ${assetBoughtEvents.length} AssetBought events for test address`);
    assetBoughtEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. TokenId: ${event.args.tokenId}, Amount: ${event.args.amount}, Fee: ${event.args.platformFee}, Block: ${event.blockNumber}`);
    });

    // Test AssetSold events where test address is seller
    console.log("💸 Checking AssetSold events...");
    const assetSoldFilter = marketplaceContract.filters.AssetSold(null, TEST_ADDRESS);
    const assetSoldEvents = await marketplaceContract.queryFilter(assetSoldFilter, fromBlock, toBlock);
    
    console.log(`   Found ${assetSoldEvents.length} AssetSold events for test address`);
    assetSoldEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. TokenId: ${event.args.tokenId}, Amount: ${event.args.amount}, Fee: ${event.args.platformFee}, Block: ${event.blockNumber}`);
    });
    
  } catch (error) {
    console.error("❌ Error testing Marketplace events (this may be expected if contract addresses are not set):", error.message);
  }
  
  console.log("");
}

async function checkTokenHoldings(provider) {
  console.log("🔍 Checking Token Holdings for Test Address");
  console.log("-".repeat(40));
  
  try {
    const tokenContract = new ethers.Contract(
      CONTRACT_ADDRESSES.TOKEN_CONTRACT,
      [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function getTokenInfo(uint256 tokenId) view returns (uint256 price, string memory metadataURI, address issuer, uint256 supply)"
      ],
      provider
    );

    // Check balances for token IDs 1-10 (adjust range as needed)
    console.log(`💰 Checking token balances for ${TEST_ADDRESS}...`);
    
    for (let tokenId = 1; tokenId <= 10; tokenId++) {
      try {
        const balance = await tokenContract.balanceOf(TEST_ADDRESS, tokenId);
        if (balance.gt(0)) {
          console.log(`   Token ${tokenId}: Balance = ${balance.toString()}`);
          
          // Get token info
          try {
            const tokenInfo = await tokenContract.getTokenInfo(tokenId);
            console.log(`     Price: ${ethers.utils.formatEther(tokenInfo.price)} FLOW`);
            console.log(`     Issuer: ${tokenInfo.issuer}`);
            console.log(`     Supply: ${tokenInfo.supply.toString()}`);
          } catch (infoError) {
            console.log(`     Could not fetch token info: ${infoError.message}`);
          }
        }
      } catch (error) {
        // Token might not exist, continue
      }
    }
    
  } catch (error) {
    console.error("❌ Error checking token holdings:", error);
  }
  
  console.log("");
}

// Summary function to analyze income implications
function analyzeIncomeImplications() {
  console.log("📊 Income Dashboard Implications");
  console.log("=" .repeat(50));
  console.log("For the income dashboard to show data for address", TEST_ADDRESS);
  console.log("the following events should be tracked:");
  console.log("");
  console.log("1. 💰 YIELD INCOME:");
  console.log("   - RentalDistributed events (from PaymentSplitter)");
  console.log("   - Filter where user received portion of yield");
  console.log("");
  console.log("2. 🎯 SETTLEMENT INCOME:");
  console.log("   - InvoiceSettled events (from ERC1155Core)");
  console.log("   - InvoiceSettlementProcessed events (from PaymentSplitter)");
  console.log("   - Filter for tokens where user had holdings");
  console.log("");
  console.log("3. 🛒 TRADING INCOME:");
  console.log("   - AssetSold events where user is seller");
  console.log("   - Calculate profit/loss from buy vs sell prices");
  console.log("");
  console.log("4. 🔍 DATA REQUIREMENTS:");
  console.log("   - User must have token balances > 0 at time of income events");
  console.log("   - Events must be properly indexed by tokenId and addresses");
  console.log("   - Historical balance tracking for accurate calculations");
  console.log("");
}

// Run the tests
async function main() {
  console.log("🚀 Starting Settlement and Burn Events Test");
  console.log("=" .repeat(60));
  
  // First show what we're looking for
  analyzeIncomeImplications();
  
  // Then run the actual tests
  await testSettlementAndBurnEvents();
  
  console.log("📋 NEXT STEPS:");
  console.log("1. Update CONTRACT_ADDRESSES with real contract addresses");
  console.log("2. Update RPC URL in setupProvider()");
  console.log("3. Run: node src/scripts/testSettlementBurnEvents.js");
  console.log("4. Analyze results to verify income dashboard implementation");
}

// Handle script execution
main().catch(console.error);

export {
  testSettlementAndBurnEvents,
  analyzeIncomeImplications,
  TEST_ADDRESS,
  CONTRACT_ADDRESSES
};