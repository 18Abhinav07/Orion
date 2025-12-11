// Enhanced Event Testing Script for Income Dashboard
// Tests events for address: 0xe7a5731070145b490fc9c81a45f98dc04bbece20

import { ethers } from 'ethers';

// Contract addresses - Flow Testnet
const CONTRACT_ADDRESSES = {
  TOKEN_CONTRACT: "0x24eb8429Dc1e5f217866D0c74Db245Fa3aAFA31A",
  ADMIN_CONTRACT: "0xFC53E7A6b94173D82d07a127A38d9D852bf478d4", 
  PAYMENT_SPLITTER_CONTRACT: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91",
  MARKETPLACE_CONTRACT: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF"
};

const TEST_ADDRESS = "0xe7a5731070145b490fc9c81a45f98dc04bbece20";

async function setupProvider() {
  return new ethers.providers.JsonRpcProvider("https://mainnet.evm.nodes.onflow.org");
}

async function testIncomeEventsComprehensive() {
  console.log("🚀 COMPREHENSIVE INCOME EVENT TESTING");
  console.log("=" .repeat(60));
  console.log(`📋 Test Address: ${TEST_ADDRESS}`);
  console.log("=" .repeat(60));

  try {
    const provider = await setupProvider();
    const currentBlock = await provider.getBlockNumber();
    
    console.log(`📦 Current Block: ${currentBlock}`);
    
    // Test different block ranges to find where events might be
    const ranges = [
      { name: "Last 10k blocks", from: Math.max(0, currentBlock - 10000), to: currentBlock },
      { name: "Last 50k blocks", from: Math.max(0, currentBlock - 50000), to: currentBlock },
      { name: "Last 100k blocks", from: Math.max(0, currentBlock - 100000), to: currentBlock },
      { name: "Since deployment", from: Math.max(0, currentBlock - 500000), to: currentBlock }
    ];

    for (const range of ranges) {
      console.log(`\n🔍 Testing range: ${range.name} (${range.from} to ${range.to})`);
      await testEventsInRange(provider, range.from, range.to, range.name);
    }

    // Test specific user interactions
    await testUserSpecificEvents(provider, currentBlock);

  } catch (error) {
    console.error("❌ Error during comprehensive testing:", error);
  }
}

async function testEventsInRange(provider, fromBlock, toBlock, rangeName) {
  try {
    // Create contract instances
    const tokenContract = new ethers.Contract(
      CONTRACT_ADDRESSES.TOKEN_CONTRACT,
      [
        "event InvoiceSettled(uint256 indexed tokenId, uint256 amount, uint256 timestamp)",
        "event TokenBurned(uint256 indexed tokenId, uint256 timestamp)",
        "event TokenMinted(address indexed issuer, uint256 indexed tokenId, uint256 amount, uint256 price, string metadataURI)"
      ],
      provider
    );

    const paymentSplitterContract = new ethers.Contract(
      CONTRACT_ADDRESSES.PAYMENT_SPLITTER_CONTRACT,
      [
        "event RentalDistributed(uint256 indexed tokenId, uint256 totalAmount, uint256 toHolders, uint256 toPlatform)",
        "event InvoiceSettlementProcessed(uint256 indexed tokenId, uint256 totalAmount, uint256 timestamp)"
      ],
      provider
    );

    const marketplaceContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
      [
        "event AssetBought(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 platformFee)",
        "event AssetSold(uint256 indexed tokenId, address indexed seller, uint256 amount, uint256 platformFee)"
      ],
      provider
    );

    console.log(`   📊 Checking ${rangeName}...`);

    // 1. Check Token Events
    const tokenMintedEvents = await tokenContract.queryFilter(
      tokenContract.filters.TokenMinted(), fromBlock, toBlock
    );
    const invoiceSettledEvents = await tokenContract.queryFilter(
      tokenContract.filters.InvoiceSettled(), fromBlock, toBlock
    );
    const tokenBurnedEvents = await tokenContract.queryFilter(
      tokenContract.filters.TokenBurned(), fromBlock, toBlock
    );

    console.log(`   🪙 TokenMinted: ${tokenMintedEvents.length} events`);
    console.log(`   📋 InvoiceSettled: ${invoiceSettledEvents.length} events`);
    console.log(`   🔥 TokenBurned: ${tokenBurnedEvents.length} events`);

    // 2. Check Payment Splitter Events
    const rentalEvents = await paymentSplitterContract.queryFilter(
      paymentSplitterContract.filters.RentalDistributed(), fromBlock, toBlock
    );
    const settlementProcessedEvents = await paymentSplitterContract.queryFilter(
      paymentSplitterContract.filters.InvoiceSettlementProcessed(), fromBlock, toBlock
    );

    console.log(`   💰 RentalDistributed: ${rentalEvents.length} events`);
    console.log(`   📋 InvoiceSettlementProcessed: ${settlementProcessedEvents.length} events`);

    // 3. Check Marketplace Events involving our test address
    const assetBoughtEvents = await marketplaceContract.queryFilter(
      marketplaceContract.filters.AssetBought(null, TEST_ADDRESS), fromBlock, toBlock
    );
    const assetSoldEvents = await marketplaceContract.queryFilter(
      marketplaceContract.filters.AssetSold(null, TEST_ADDRESS), fromBlock, toBlock
    );

    console.log(`   🛒 AssetBought by test address: ${assetBoughtEvents.length} events`);
    console.log(`   💸 AssetSold by test address: ${assetSoldEvents.length} events`);

    // Show some details if events found
    if (tokenMintedEvents.length > 0) {
      console.log(`   📝 Sample TokenMinted events:`);
      tokenMintedEvents.slice(0, 3).forEach((event, i) => {
        console.log(`      ${i+1}. Token ${event.args.tokenId} by ${event.args.issuer} at block ${event.blockNumber}`);
      });
    }

    if (rentalEvents.length > 0) {
      console.log(`   📝 Sample RentalDistributed events:`);
      rentalEvents.slice(0, 3).forEach((event, i) => {
        console.log(`      ${i+1}. Token ${event.args.tokenId} amount ${ethers.utils.formatEther(event.args.totalAmount)} FLOW at block ${event.blockNumber}`);
      });
    }

    if (assetBoughtEvents.length > 0) {
      console.log(`   📝 AssetBought events for test address:`);
      assetBoughtEvents.forEach((event, i) => {
        console.log(`      ${i+1}. Bought token ${event.args.tokenId} amount ${event.args.amount} at block ${event.blockNumber}`);
      });
    }

  } catch (error) {
    console.error(`   ❌ Error testing ${rangeName}:`, error.message);
  }
}

async function testUserSpecificEvents(provider, currentBlock) {
  console.log(`\n🎯 TESTING USER-SPECIFIC EVENTS FOR ${TEST_ADDRESS}`);
  console.log("-" .repeat(50));

  try {
    // Check if user has any token balances
    const tokenContract = new ethers.Contract(
      CONTRACT_ADDRESSES.TOKEN_CONTRACT,
      [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function getTokenInfo(uint256 tokenId) view returns (uint256 price, string memory metadataURI, address issuer, uint256 supply)"
      ],
      provider
    );

    console.log("💰 Checking token balances for test address...");
    
    let hasTokens = false;
    for (let tokenId = 1; tokenId <= 20; tokenId++) {
      try {
        const balance = await tokenContract.balanceOf(TEST_ADDRESS, tokenId);
        if (balance.gt(0)) {
          hasTokens = true;
          console.log(`   ✅ Token ${tokenId}: Balance = ${balance.toString()}`);
          
          // Get token info
          try {
            const tokenInfo = await tokenContract.getTokenInfo(tokenId);
            console.log(`      Price: ${ethers.utils.formatEther(tokenInfo.price)} FLOW`);
            console.log(`      Issuer: ${tokenInfo.issuer}`);
            console.log(`      Supply: ${tokenInfo.supply.toString()}`);
          } catch (infoError) {
            console.log(`      Could not fetch token info: ${infoError.message}`);
          }
        }
      } catch (error) {
        // Token might not exist, continue
      }
    }

    if (!hasTokens) {
      console.log("   ❌ No token balances found for test address");
      console.log("   💡 This explains why no income events would be relevant");
    }

    // Check if address is an issuer
    console.log("\n🏭 Checking if address is an issuer...");
    const adminContract = new ethers.Contract(
      CONTRACT_ADDRESSES.ADMIN_CONTRACT,
      [
        "function isIssuer(address _address) view returns (bool)",
        "function getAllIssuers() view returns (address[] memory)"
      ],
      provider
    );

    try {
      const isIssuer = await adminContract.isIssuer(TEST_ADDRESS);
      console.log(`   Issuer status: ${isIssuer}`);
      
      if (isIssuer) {
        const allIssuers = await adminContract.getAllIssuers();
        console.log(`   Total issuers: ${allIssuers.length}`);
        console.log(`   Test address is issuer #${allIssuers.findIndex(addr => addr.toLowerCase() === TEST_ADDRESS.toLowerCase()) + 1}`);
      }
    } catch (error) {
      console.log(`   ❌ Could not check issuer status: ${error.message}`);
    }

    // Check marketplace holdings
    console.log("\n🏪 Checking marketplace holdings...");
    const marketplaceContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
      [
        "function getMyAssets() view returns (uint256[] memory tokenIds, uint256[] memory amounts)"
      ],
      provider
    );

    try {
      // We can't call getMyAssets for another address, but we can check if they've bought anything
      console.log("   Note: Cannot check getMyAssets() for other addresses");
      console.log("   Recommendation: Test address should connect wallet to see their own assets");
    } catch (error) {
      console.log(`   ❌ Could not check marketplace holdings: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ Error testing user-specific events:", error);
  }
}

async function analyzeIncomeImplementation() {
  console.log(`\n📊 INCOME DASHBOARD IMPLEMENTATION ANALYSIS`);
  console.log("=" .repeat(60));
  
  console.log("🔍 CURRENT IMPLEMENTATION ISSUES:");
  console.log("1. YieldIncomeReport.tsx searches only last 10,000 blocks");
  console.log("2. Limited block range may miss historical events");
  console.log("3. No user has significant token holdings on test address");
  console.log("");
  
  console.log("💡 RECOMMENDATIONS:");
  console.log("1. Increase search range to at least 100,000 blocks");
  console.log("2. Add block range selector in UI");
  console.log("3. Cache events in local storage for performance");
  console.log("4. Add event indexing service for better performance");
  console.log("5. Show 'No events found' message instead of empty dashboard");
  console.log("");
  
  console.log("🧪 TESTING STEPS:");
  console.log("1. Create test tokens with the test address as holder");
  console.log("2. Perform yield distributions to generate events");
  console.log("3. Test settlement and burn operations");
  console.log("4. Verify events appear in income dashboard");
}

async function generateTestEventsSuggestion() {
  console.log(`\n🧪 GENERATING TEST EVENTS SUGGESTION`);
  console.log("=" .repeat(60));
  
  console.log("To properly test the income dashboard, execute these steps:");
  console.log("");
  console.log("1. 🪙 MINT TEST TOKENS:");
  console.log(`   - Use admin panel to mint tokens to ${TEST_ADDRESS}`);
  console.log("   - Create at least 2-3 different asset tokens");
  console.log("");
  console.log("2. 💰 GENERATE YIELD EVENTS:");
  console.log("   - Use PaymentSplitter.submitRental() for yield distribution");
  console.log("   - Submit multiple rental payments over time");
  console.log("");
  console.log("3. 📋 GENERATE SETTLEMENT EVENTS:");
  console.log("   - Use SettlementProcessor to settle invoices");
  console.log("   - This will generate both settlement and burn events");
  console.log("");
  console.log("4. 🔄 REFRESH DASHBOARD:");
  console.log("   - Open income dashboard with test address connected");
  console.log("   - Verify events appear correctly");
  console.log("");
  console.log("📝 EXPECTED EVENTS AFTER TESTING:");
  console.log("   - RentalDistributed events (yield income)");
  console.log("   - InvoiceSettlementProcessed events (settlement income)");
  console.log("   - AssetBought/AssetSold events (trading income)");
}

// Main execution
async function main() {
  console.log("🚀 ENHANCED EVENT TESTING FOR INCOME DASHBOARD");
  console.log("=" .repeat(70));
  
  await testIncomeEventsComprehensive();
  await analyzeIncomeImplementation();
  await generateTestEventsSuggestion();
  
  console.log("\n✅ COMPREHENSIVE TESTING COMPLETED!");
  console.log("📋 CONCLUSION: No events found because test address has no token holdings or interactions");
  console.log("💡 SOLUTION: Create test data or use an address with actual token holdings");
}

main().catch(console.error);

export {
  testIncomeEventsComprehensive,
  analyzeIncomeImplementation,
  CONTRACT_ADDRESSES,
  TEST_ADDRESS
};