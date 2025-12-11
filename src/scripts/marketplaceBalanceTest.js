// Test Marketplace Balance vs Wallet Balance
import { ethers } from 'ethers';

const CONTRACT_ADDRESSES = {
  TOKEN_CONTRACT: "0x24eb8429Dc1e5f217866D0c74Db245Fa3aAFA31A",
  MARKETPLACE_CONTRACT: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF"
};

const TEST_ADDRESS = "0xe7a5731070145b490fc9c81a45f98dc04bbece20";
const TOKEN_ID = 7; // From the settlement transaction

async function testBalances() {
  console.log("🔍 TESTING MARKETPLACE VS WALLET BALANCES");
  console.log("=" .repeat(60));
  console.log(`📋 Test Address: ${TEST_ADDRESS}`);
  console.log(`🪙 Token ID: ${TOKEN_ID}`);
  console.log("=" .repeat(60));

  try {
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet.evm.nodes.onflow.org");
    
    // Test 1: Check wallet balance (what income dashboard currently checks)
    console.log("\n1️⃣ WALLET BALANCE CHECK (Current Income Dashboard):");
    const tokenContract = new ethers.Contract(
      CONTRACT_ADDRESSES.TOKEN_CONTRACT,
      ["function balanceOf(address account, uint256 id) view returns (uint256)"],
      provider
    );
    
    const walletBalance = await tokenContract.balanceOf(TEST_ADDRESS, TOKEN_ID);
    console.log(`   Wallet Balance: ${walletBalance.toString()}`);
    
    // Test 2: Check marketplace balance (what should be checked)
    console.log("\n2️⃣ MARKETPLACE BALANCE CHECK (What Should Be Checked):");
    const marketplaceContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
      [
        "function getUserBalance(address _user, uint256 _tokenId) view returns (uint256)",
        "function getTokenHolders(uint256 _tokenId) view returns (address[] memory holders, uint256[] memory amounts)"
      ],
      provider
    );
    
    const marketplaceBalance = await marketplaceContract.getUserBalance(TEST_ADDRESS, TOKEN_ID);
    console.log(`   Marketplace Balance: ${marketplaceBalance.toString()}`);
    
    // Test 3: Get all token holders for Token ID 7
    console.log("\n3️⃣ ALL TOKEN HOLDERS FOR TOKEN ID 7:");
    const holdersData = await marketplaceContract.getTokenHolders(TOKEN_ID);
    const [holders, amounts] = holdersData;
    
    console.log(`   Total holders: ${holders.length}`);
    holders.forEach((holder, index) => {
      console.log(`   ${index + 1}. ${holder}: ${amounts[index].toString()} tokens`);
      if (holder.toLowerCase() === TEST_ADDRESS.toLowerCase()) {
        console.log(`      ✅ TEST ADDRESS FOUND IN MARKETPLACE HOLDERS!`);
      }
    });
    
    // Test 4: Check if test address is in holders list
    const isInMarketplace = holders.some(h => h.toLowerCase() === TEST_ADDRESS.toLowerCase());
    console.log(`\n4️⃣ ANALYSIS:`);
    console.log(`   Test address in marketplace holders: ${isInMarketplace}`);
    console.log(`   Wallet balance: ${walletBalance.toString()}`);
    console.log(`   Marketplace balance: ${marketplaceBalance.toString()}`);
    
    if (isInMarketplace && marketplaceBalance.gt(0)) {
      console.log(`   🎯 SOLUTION: Income dashboard should check marketplace balance!`);
    } else {
      console.log(`   ❌ Test address has no holdings in either location`);
    }

    // Test 5: Check what happens with settlement events for this address
    console.log("\n5️⃣ SETTLEMENT VERIFICATION:");
    console.log(`   If settlement happened for Token ID ${TOKEN_ID}:`);
    console.log(`   - Payment would go to: Marketplace holders`);
    console.log(`   - Test address would receive: ${isInMarketplace ? 'YES' : 'NO'}`);
    console.log(`   - Income dashboard would show: ${walletBalance.gt(0) ? 'Events checked' : 'No events checked'}`);
    
  } catch (error) {
    console.error("❌ Error testing balances:", error);
  }
}

async function main() {
  await testBalances();
  
  console.log("\n💡 CONCLUSION:");
  console.log("If marketplace balance > 0 and wallet balance = 0:");
  console.log("- User has tokens in marketplace custody");
  console.log("- User receives yield from settlements"); 
  console.log("- Income dashboard doesn't show it (checks wrong balance)");
  console.log("- FIX: Check marketplace balance instead of wallet balance");
}

main().catch(console.error);