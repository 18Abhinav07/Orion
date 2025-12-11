// Test Yield Event Detection for Income Dashboard
import { ethers } from 'ethers';

const CONTRACT_ADDRESSES = {
  PAYMENT_SPLITTER_CONTRACT: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91",
  MARKETPLACE_CONTRACT: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF"
};

const TEST_ADDRESS = "0xe7a5731070145b490fc9c81a45f98dc04bbece20";
const TOKEN_ID = 7;
const SETTLEMENT_BLOCK = 76560865; // Block where settlement happened

async function testYieldEventDetection() {
  console.log("🔍 TESTING YIELD EVENT DETECTION");
  console.log("=" .repeat(60));
  console.log(`📋 Test Address: ${TEST_ADDRESS}`);
  console.log(`🪙 Token ID: ${TOKEN_ID}`);
  console.log(`📦 Settlement Block: ${SETTLEMENT_BLOCK}`);
  console.log("=" .repeat(60));

  try {
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet.evm.nodes.onflow.org");
    
    // Test 1: Check what events exist in PaymentSplitter around settlement block
    console.log("\n1️⃣ CHECKING PAYMENTSPLITTER EVENTS AROUND SETTLEMENT:");
    const paymentSplitterContract = new ethers.Contract(
      CONTRACT_ADDRESSES.PAYMENT_SPLITTER_CONTRACT,
      [
        "event RentalDistributed(uint256 indexed tokenId, uint256 totalAmount, uint256 toHolders, uint256 toPlatform)",
        "event InvoiceSettlementProcessed(uint256 indexed tokenId, uint256 totalAmount, uint256 timestamp)",
        "event InvoiceSettled(uint256 indexed tokenId, uint256 totalAmount, uint256 distributed, uint256 platformEarnings)",
        "event TokenBurnInitiated(uint256 indexed tokenId, uint256 amount)"
      ],
      provider
    );

    // Check events in a window around the settlement block
    const fromBlock = SETTLEMENT_BLOCK - 100;
    const toBlock = SETTLEMENT_BLOCK + 100;
    
    console.log(`   Searching blocks ${fromBlock} to ${toBlock}...`);

    // Test RentalDistributed events
    try {
      const rentalFilter = paymentSplitterContract.filters.RentalDistributed();
      const rentalEvents = await paymentSplitterContract.queryFilter(rentalFilter, fromBlock, toBlock);
      console.log(`   RentalDistributed events: ${rentalEvents.length}`);
      
      rentalEvents.forEach((event, i) => {
        console.log(`   ${i+1}. TokenId: ${event.args.tokenId}, Total: ${ethers.utils.formatEther(event.args.totalAmount)} FLOW, Block: ${event.blockNumber}`);
      });
    } catch (error) {
      console.log(`   ❌ Error fetching RentalDistributed: ${error.message}`);
    }

    // Test InvoiceSettlementProcessed events
    try {
      const settlementFilter = paymentSplitterContract.filters.InvoiceSettlementProcessed();
      const settlementEvents = await paymentSplitterContract.queryFilter(settlementFilter, fromBlock, toBlock);
      console.log(`   InvoiceSettlementProcessed events: ${settlementEvents.length}`);
      
      settlementEvents.forEach((event, i) => {
        console.log(`   ${i+1}. TokenId: ${event.args.tokenId}, Amount: ${ethers.utils.formatEther(event.args.totalAmount)} FLOW, Block: ${event.blockNumber}`);
      });
    } catch (error) {
      console.log(`   ❌ Error fetching InvoiceSettlementProcessed: ${error.message}`);
    }

    // Test InvoiceSettled events (new event from contract)
    try {
      const invoiceSettledFilter = paymentSplitterContract.filters.InvoiceSettled();
      const invoiceSettledEvents = await paymentSplitterContract.queryFilter(invoiceSettledFilter, fromBlock, toBlock);
      console.log(`   InvoiceSettled events: ${invoiceSettledEvents.length}`);
      
      invoiceSettledEvents.forEach((event, i) => {
        console.log(`   ${i+1}. TokenId: ${event.args.tokenId}, Total: ${ethers.utils.formatEther(event.args.totalAmount)} FLOW, Distributed: ${ethers.utils.formatEther(event.args.distributed)} FLOW, Block: ${event.blockNumber}`);
      });
    } catch (error) {
      console.log(`   ❌ Error fetching InvoiceSettled: ${error.message}`);
    }

    // Test 2: Check all events emitted in the settlement block
    console.log(`\n2️⃣ ALL EVENTS IN SETTLEMENT BLOCK ${SETTLEMENT_BLOCK}:`);
    try {
      const allEvents = await paymentSplitterContract.queryFilter("*", SETTLEMENT_BLOCK, SETTLEMENT_BLOCK);
      console.log(`   Total events in block: ${allEvents.length}`);
      
      allEvents.forEach((event, i) => {
        console.log(`   ${i+1}. Event: ${event.event || 'Unknown'}, Topics: ${event.topics.length}, TokenId: ${event.args?.tokenId || 'N/A'}`);
        if (event.args?.tokenId?.toString() === TOKEN_ID.toString()) {
          console.log(`      ✅ MATCHES OUR TOKEN ID!`);
          console.log(`      Args:`, Object.keys(event.args).map(key => `${key}: ${event.args[key]}`));
        }
      });
    } catch (error) {
      console.log(`   ❌ Error fetching all events: ${error.message}`);
    }

    // Test 3: Simulate income dashboard logic
    console.log(`\n3️⃣ SIMULATING INCOME DASHBOARD LOGIC:`);
    
    // Mock user assets (like income dashboard creates)
    const userAssets = [{
      tokenId: TOKEN_ID.toString(),
      balance: "100",
      marketplaceBalance: "100",
      walletBalance: "0"
    }];

    console.log(`   User assets: ${userAssets.length}`);
    console.log(`   Asset ${TOKEN_ID}: marketplace balance = ${userAssets[0].marketplaceBalance}`);

    // Test current logic with last 10k blocks
    const currentBlock = await provider.getBlockNumber();
    const searchFromBlock = currentBlock - 10000;
    
    console.log(`   Current block: ${currentBlock}`);
    console.log(`   Searching from: ${searchFromBlock}`);
    console.log(`   Settlement was at: ${SETTLEMENT_BLOCK}`);
    console.log(`   Settlement in range: ${SETTLEMENT_BLOCK >= searchFromBlock ? 'YES' : 'NO'}`);

    if (SETTLEMENT_BLOCK < searchFromBlock) {
      console.log(`   ❌ PROBLEM: Settlement block is outside search range!`);
      console.log(`   Settlement happened ${searchFromBlock - SETTLEMENT_BLOCK} blocks before search window`);
    }

    // Test 4: Check if events would be found with broader search
    console.log(`\n4️⃣ TESTING BROADER SEARCH:`);
    const broadFromBlock = SETTLEMENT_BLOCK - 1000;
    const broadToBlock = SETTLEMENT_BLOCK + 1000;
    
    try {
      const rentalFilter = paymentSplitterContract.filters.RentalDistributed();
      const rentalEvents = await paymentSplitterContract.queryFilter(rentalFilter, broadFromBlock, broadToBlock);
      
      const settlementFilter = paymentSplitterContract.filters.InvoiceSettlementProcessed();
      const settlementEvents = await paymentSplitterContract.queryFilter(settlementFilter, broadFromBlock, broadToBlock);
      
      console.log(`   RentalDistributed in broader range: ${rentalEvents.length}`);
      console.log(`   InvoiceSettlementProcessed in broader range: ${settlementEvents.length}`);
      
      // Check if any match our token
      const relevantRental = rentalEvents.filter(e => e.args.tokenId.toString() === TOKEN_ID.toString());
      const relevantSettlement = settlementEvents.filter(e => e.args.tokenId.toString() === TOKEN_ID.toString());
      
      console.log(`   Relevant rental events for token ${TOKEN_ID}: ${relevantRental.length}`);
      console.log(`   Relevant settlement events for token ${TOKEN_ID}: ${relevantSettlement.length}`);
      
      if (relevantSettlement.length > 0) {
        console.log(`   ✅ FOUND SETTLEMENT EVENTS! Issue is search range.`);
        relevantSettlement.forEach((event, i) => {
          console.log(`   ${i+1}. Amount: ${ethers.utils.formatEther(event.args.totalAmount)} FLOW at block ${event.blockNumber}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Error in broader search: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ Error during testing:", error);
  }
}

async function main() {
  await testYieldEventDetection();
  
  console.log("\n💡 CONCLUSION:");
  console.log("If settlement events found but not in income dashboard:");
  console.log("1. Events exist but outside search range");
  console.log("2. Event filtering logic needs adjustment");
  console.log("3. Block range needs to be extended");
}

main().catch(console.error);