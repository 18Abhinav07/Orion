// Final Test for Corrected Yield Calculation
import { ethers } from 'ethers';

const CONTRACT_ADDRESSES = {
  PAYMENT_SPLITTER_CONTRACT: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91",
  MARKETPLACE_CONTRACT: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF",
  TOKEN_CONTRACT: "0x24eb8429Dc1e5f217866D0c74Db245Fa3aAFA31A"
};

const TEST_ADDRESS = "0xe7a5731070145b490fc9c81a45f98dc04bbece20";
const TOKEN_ID = 7;
const SETTLEMENT_BLOCK = 76560865;

async function testCorrectedYieldCalculation() {
  console.log("🎯 TESTING CORRECTED YIELD CALCULATION");
  console.log("=" .repeat(60));
  console.log(`📋 Test Address: ${TEST_ADDRESS}`);
  console.log(`🪙 Token ID: ${TOKEN_ID}`);
  console.log("=" .repeat(60));

  try {
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet.evm.nodes.onflow.org");
    
    // Step 1: Check marketplace balance (what income dashboard now checks)
    console.log("\n1️⃣ MARKETPLACE BALANCE CHECK:");
    const marketplaceContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
      [
        "function getUserBalance(address _user, uint256 _tokenId) view returns (uint256)",
        "function getTokenHolders(uint256 _tokenId) view returns (address[] memory holders, uint256[] memory amounts)"
      ],
      provider
    );
    
    const userMarketplaceBalance = await marketplaceContract.getUserBalance(TEST_ADDRESS, TOKEN_ID);
    console.log(`   User marketplace balance: ${userMarketplaceBalance.toString()}`);
    
    const holdersData = await marketplaceContract.getTokenHolders(TOKEN_ID);
    const [holders, amounts] = holdersData;
    const totalMarketplaceSupply = amounts.reduce((sum, amount) => sum.add(amount), ethers.BigNumber.from(0));
    
    console.log(`   Total marketplace supply: ${totalMarketplaceSupply.toString()}`);
    console.log(`   User proportion: ${userMarketplaceBalance.toString()}/${totalMarketplaceSupply.toString()}`);

    // Step 2: Get actual InvoiceSettled event with correct structure
    console.log("\n2️⃣ INVOICE SETTLED EVENT CHECK:");
    const paymentSplitterContract = new ethers.Contract(
      CONTRACT_ADDRESSES.PAYMENT_SPLITTER_CONTRACT,
      [
        "event InvoiceSettled(uint256 indexed tokenId, uint256 totalAmount, uint256 toHolders, uint256 toPlatform)"
      ],
      provider
    );

    const settlementFilter = paymentSplitterContract.filters.InvoiceSettled(TOKEN_ID);
    const settlementEvents = await paymentSplitterContract.queryFilter(
      settlementFilter, 
      SETTLEMENT_BLOCK - 10, 
      SETTLEMENT_BLOCK + 10
    );
    
    console.log(`   InvoiceSettled events found: ${settlementEvents.length}`);
    
    if (settlementEvents.length > 0) {
      const event = settlementEvents[0];
      const tokenId = event.args.tokenId.toString();
      const totalAmount = event.args.totalAmount;
      const toHolders = event.args.toHolders;
      const toPlatform = event.args.toPlatform;
      
      console.log(`   Event details:`);
      console.log(`   - Token ID: ${tokenId}`);
      console.log(`   - Total Amount: ${ethers.utils.formatEther(totalAmount)} FLOW`);
      console.log(`   - To Holders: ${ethers.utils.formatEther(toHolders)} FLOW`);
      console.log(`   - To Platform: ${ethers.utils.formatEther(toPlatform)} FLOW`);
      console.log(`   - Block: ${event.blockNumber}`);

      // Step 3: Calculate user's yield share (what income dashboard should calculate)
      console.log("\n3️⃣ YIELD CALCULATION:");
      
      if (userMarketplaceBalance.gt(0) && totalMarketplaceSupply.gt(0)) {
        const userProportion = parseFloat(userMarketplaceBalance.toString()) / parseFloat(totalMarketplaceSupply.toString());
        const userYield = parseFloat(ethers.utils.formatEther(toHolders)) * userProportion;
        
        console.log(`   User marketplace balance: ${userMarketplaceBalance.toString()} tokens`);
        console.log(`   Total marketplace supply: ${totalMarketplaceSupply.toString()} tokens`);
        console.log(`   User proportion: ${(userProportion * 100).toFixed(2)}%`);
        console.log(`   Amount to holders: ${ethers.utils.formatEther(toHolders)} FLOW`);
        console.log(`   User's yield share: ${userYield.toFixed(6)} FLOW`);
        
        if (userYield > 0) {
          console.log(`   ✅ USER SHOULD RECEIVE: ${userYield.toFixed(6)} FLOW`);
        } else {
          console.log(`   ❌ User yield is 0`);
        }
      } else {
        console.log(`   ❌ User has no marketplace balance or total supply is 0`);
      }

      // Step 4: Verify income dashboard logic
      console.log("\n4️⃣ INCOME DASHBOARD VERIFICATION:");
      
      // Simulate what income dashboard does
      const userAssets = [{
        tokenId: TOKEN_ID.toString(),
        marketplaceBalance: userMarketplaceBalance.toString(),
        balance: userMarketplaceBalance.toString()
      }];
      
      console.log(`   User assets found: ${userAssets.length}`);
      console.log(`   Asset ${TOKEN_ID} marketplace balance: ${userAssets[0].marketplaceBalance}`);
      
      // Check if event would be processed
      const hasRelevantAsset = userAssets.some(asset => asset.tokenId === tokenId);
      console.log(`   Event would be processed: ${hasRelevantAsset}`);
      
      if (hasRelevantAsset) {
        const asset = userAssets.find(a => a.tokenId === tokenId);
        const userMarketplaceBalanceFromAsset = parseFloat(asset.marketplaceBalance);
        
        if (userMarketplaceBalanceFromAsset > 0) {
          const userProportion = userMarketplaceBalanceFromAsset / parseFloat(totalMarketplaceSupply.toString());
          const userShare = (parseFloat(ethers.utils.formatEther(toHolders)) * userProportion).toFixed(6);
          
          console.log(`   ✅ Income dashboard would calculate: ${userShare} FLOW yield`);
          console.log(`   ✅ This should appear in Recent Yield Transactions`);
        } else {
          console.log(`   ❌ No marketplace balance, no yield would be calculated`);
        }
      } else {
        console.log(`   ❌ No relevant assets, event would be ignored`);
      }
    } else {
      console.log(`   ❌ No InvoiceSettled events found for token ${TOKEN_ID}`);
    }

  } catch (error) {
    console.error("❌ Error during testing:", error);
  }
}

async function main() {
  await testCorrectedYieldCalculation();
  
  console.log("\n💡 EXPECTED RESULT:");
  console.log("After fixes, income dashboard should show:");
  console.log("1. ✅ Principal: Token #7 with marketplace balance");
  console.log("2. ✅ Yield: Settlement income from InvoiceSettled event");
  console.log("3. ✅ Recent Transactions: Settlement transaction appears");
  console.log("4. ✅ Asset Breakdown: Shows yield received for Token #7");
}

main().catch(console.error);