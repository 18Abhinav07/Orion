// Debug Settlement Transaction Failure
import { ethers } from 'ethers';

const CONTRACT_ADDRESSES = {
  PAYMENT_SPLITTER_CONTRACT: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91",
  MARKETPLACE_CONTRACT: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF",
  TOKEN_CONTRACT: "0x7C082010BcF338675508E2FD9d6C0dD2E43b37d8",
  ADMIN_CONTRACT: "0xFC53E7A6b94173D82d07a127A38d9D852bf478d4"
};

const TEST_ADDRESS = "0xB65B716ADe8e5B2e75AAb39a805729E96A45df27"; // Manager address from error
const TOKEN_ID = 1; // Token ID from transaction data
const SETTLEMENT_AMOUNT = "20000000000000000"; // 0.02 FLOW from error

async function debugSettlementFailure() {
  console.log("🐛 DEBUGGING SETTLEMENT TRANSACTION FAILURE");
  console.log("=".repeat(60));
  console.log(`📋 Manager Address: ${TEST_ADDRESS}`);
  console.log(`🪙 Token ID: ${TOKEN_ID}`);
  console.log(`💰 Settlement Amount: ${ethers.utils.formatEther(SETTLEMENT_AMOUNT)} FLOW`);
  console.log("=".repeat(60));

  try {
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet.evm.nodes.onflow.org");
    
    // Check 1: Is the user a manager?
    console.log("\n1️⃣ CHECKING MANAGER STATUS:");
    const adminContract = new ethers.Contract(
      CONTRACT_ADDRESSES.ADMIN_CONTRACT,
      [
        "function isManager(address _address) external view returns (bool)",
        "function isManagerForToken(address _manager, uint256 _tokenId) external view returns (bool)"
      ],
      provider
    );
    
    const isManager = await adminContract.isManager(TEST_ADDRESS);
    console.log(`   Is ${TEST_ADDRESS} a manager: ${isManager}`);
    
    if (isManager) {
      const isManagerForToken = await adminContract.isManagerForToken(TEST_ADDRESS, TOKEN_ID);
      console.log(`   Is manager for token ${TOKEN_ID}: ${isManagerForToken}`);
    } else {
      console.log("   ❌ PROBLEM: User is not a manager at all!");
    }

    // Check 2: Does the token exist and what's its status?
    console.log("\n2️⃣ CHECKING TOKEN STATUS:");
    const tokenContract = new ethers.Contract(
      CONTRACT_ADDRESSES.TOKEN_CONTRACT,
      [
        "function getTokenInfo(uint256 tokenId) external view returns (uint256 price, string memory metadataURI, address issuer, uint256 supply)",
        "function getTokenLifecycleStatus(uint256 tokenId) external view returns (uint8)",
        "function tokenSettled(uint256) external view returns (bool)"
      ],
      provider
    );
    
    try {
      const tokenInfo = await tokenContract.getTokenInfo(TOKEN_ID);
      console.log(`   Token ${TOKEN_ID} exists:`);
      console.log(`   - Price: ${ethers.utils.formatEther(tokenInfo.price)} FLOW`);
      console.log(`   - Issuer: ${tokenInfo.issuer}`);
      console.log(`   - Supply: ${tokenInfo.supply.toString()}`);
      
      const lifecycle = await tokenContract.getTokenLifecycleStatus(TOKEN_ID);
      const lifecycleNames = { 0: "Active", 1: "Settled", 2: "Burned" };
      console.log(`   - Lifecycle: ${lifecycle} (${lifecycleNames[lifecycle] || 'Unknown'})`);
      
      const isSettled = await tokenContract.tokenSettled(TOKEN_ID);
      console.log(`   - Already settled: ${isSettled}`);
      
      if (isSettled) {
        console.log("   ❌ PROBLEM: Token is already settled!");
      }
      
    } catch (error) {
      console.log(`   ❌ PROBLEM: Token ${TOKEN_ID} doesn't exist or error: ${error.message}`);
    }

    // Check 3: Are there token holders in marketplace?
    console.log("\n3️⃣ CHECKING MARKETPLACE TOKEN HOLDERS:");
    const marketplaceContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
      [
        "function getTokenHolders(uint256 _tokenId) external view returns (address[] memory holders, uint256[] memory amounts)"
      ],
      provider
    );
    
    try {
      const [holders, amounts] = await marketplaceContract.getTokenHolders(TOKEN_ID);
      console.log(`   Token ${TOKEN_ID} marketplace holders: ${holders.length}`);
      
      if (holders.length === 0) {
        console.log("   ❌ PROBLEM: No marketplace holders for this token!");
      } else {
        const totalSupply = amounts.reduce((sum, amount) => sum.add(amount), ethers.BigNumber.from(0));
        console.log(`   Total marketplace supply: ${totalSupply.toString()}`);
        
        holders.forEach((holder, i) => {
          console.log(`   ${i+1}. ${holder}: ${amounts[i].toString()} tokens`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error getting token holders: ${error.message}`);
    }

    // Check 4: Check PaymentSplitter contract setup
    console.log("\n4️⃣ CHECKING PAYMENTSPLITTER SETUP:");
    const paymentSplitterContract = new ethers.Contract(
      CONTRACT_ADDRESSES.PAYMENT_SPLITTER_CONTRACT,
      [
        "function tokenContract() external view returns (address)",
        "function marketplaceContract() external view returns (address)",
        "function adminContract() external view returns (address)",
        "function isTokenSettled(uint256 _tokenId) external view returns (bool)"
      ],
      provider
    );
    
    const tokenContractAddr = await paymentSplitterContract.tokenContract();
    const marketplaceContractAddr = await paymentSplitterContract.marketplaceContract();
    const adminContractAddr = await paymentSplitterContract.adminContract();
    
    console.log(`   Token contract: ${tokenContractAddr}`);
    console.log(`   Expected: ${CONTRACT_ADDRESSES.TOKEN_CONTRACT}`);
    console.log(`   Matches: ${tokenContractAddr.toLowerCase() === CONTRACT_ADDRESSES.TOKEN_CONTRACT.toLowerCase()}`);
    
    console.log(`   Marketplace contract: ${marketplaceContractAddr}`);
    console.log(`   Expected: ${CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT}`);
    console.log(`   Matches: ${marketplaceContractAddr.toLowerCase() === CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT.toLowerCase()}`);
    
    console.log(`   Admin contract: ${adminContractAddr}`);
    console.log(`   Expected: ${CONTRACT_ADDRESSES.ADMIN_CONTRACT}`);
    console.log(`   Matches: ${adminContractAddr.toLowerCase() === CONTRACT_ADDRESSES.ADMIN_CONTRACT.toLowerCase()}`);
    
    const paymentSplitterSettled = await paymentSplitterContract.isTokenSettled(TOKEN_ID);
    console.log(`   PaymentSplitter thinks token is settled: ${paymentSplitterSettled}`);

    // Check 5: Try to simulate the transaction
    console.log("\n5️⃣ SIMULATING TRANSACTION:");
    try {
      // Try to estimate gas for the actual function call
      const estimatedGas = await paymentSplitterContract.estimateGas.processInvoiceSettlement(TOKEN_ID, {
        value: SETTLEMENT_AMOUNT,
        from: TEST_ADDRESS
      });
      console.log(`   Estimated gas: ${estimatedGas.toString()}`);
      console.log("   ✅ Transaction simulation passed");
    } catch (error) {
      console.log(`   ❌ Transaction simulation failed: ${error.message}`);
      
      // Try to decode the revert reason
      if (error.reason) {
        console.log(`   Revert reason: ${error.reason}`);
      }
      if (error.data) {
        console.log(`   Error data: ${error.data}`);
      }
    }

  } catch (error) {
    console.error("❌ Error during debugging:", error);
  }
}

async function main() {
  await debugSettlementFailure();
  
  console.log("\n💡 LIKELY CAUSES:");
  console.log("1. User is not assigned as manager for token 1");
  console.log("2. Token 1 is already settled");
  console.log("3. Token 1 doesn't exist");
  console.log("4. No marketplace holders for token 1");
  console.log("5. Contract configuration mismatch");
}

main().catch(console.error);