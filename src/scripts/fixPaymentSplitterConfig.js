// Fix PaymentSplitter Contract Configuration
import { ethers } from 'ethers';

const CONTRACT_ADDRESSES = {
  PAYMENT_SPLITTER_CONTRACT: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91",
  MARKETPLACE_CONTRACT: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF",
  TOKEN_CONTRACT: "0x7C082010BcF338675508E2FD9d6C0dD2E43b37d8",
  ADMIN_CONTRACT: "0xFC53E7A6b94173D82d07a127A38d9D852bf478d4"
};

async function fixPaymentSplitterConfig() {
  console.log("🔧 FIXING PAYMENTSPLITTER CONTRACT CONFIGURATION");
  console.log("=".repeat(60));
  console.log(`📋 PaymentSplitter: ${CONTRACT_ADDRESSES.PAYMENT_SPLITTER_CONTRACT}`);
  console.log(`🏪 Marketplace: ${CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT}`);
  console.log(`🪙 Token Contract: ${CONTRACT_ADDRESSES.TOKEN_CONTRACT}`);
  console.log("=".repeat(60));

  try {
    // Connect to MetaMask
    if (!window.ethereum) {
      throw new Error("MetaMask not found. Please install MetaMask.");
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();
    
    console.log(`👤 Connected address: ${userAddress}`);

    // Create contract instance
    const paymentSplitterContract = new ethers.Contract(
      CONTRACT_ADDRESSES.PAYMENT_SPLITTER_CONTRACT,
      [
        "function setMarketplace(address _marketplaceContract) external",
        "function setTokenContract(address _tokenContract) external",
        "function tokenContract() external view returns (address)",
        "function marketplaceContract() external view returns (address)"
      ],
      signer
    );

    // Check current configuration
    console.log("\n1️⃣ CHECKING CURRENT CONFIGURATION:");
    const currentTokenContract = await paymentSplitterContract.tokenContract();
    const currentMarketplaceContract = await paymentSplitterContract.marketplaceContract();
    
    console.log(`   Current token contract: ${currentTokenContract}`);
    console.log(`   Current marketplace contract: ${currentMarketplaceContract}`);
    
    const needsTokenFix = currentTokenContract === "0x0000000000000000000000000000000000000000";
    const needsMarketplaceFix = currentMarketplaceContract === "0x0000000000000000000000000000000000000000";
    
    if (!needsTokenFix && !needsMarketplaceFix) {
      console.log("   ✅ Configuration is already correct!");
      return;
    }

    // Fix token contract address
    if (needsTokenFix) {
      console.log("\n2️⃣ SETTING TOKEN CONTRACT ADDRESS:");
      console.log(`   Setting to: ${CONTRACT_ADDRESSES.TOKEN_CONTRACT}`);
      
      try {
        const tx1 = await paymentSplitterContract.setTokenContract(CONTRACT_ADDRESSES.TOKEN_CONTRACT);
        console.log(`   Transaction sent: ${tx1.hash}`);
        console.log(`   Waiting for confirmation...`);
        
        const receipt1 = await tx1.wait();
        console.log(`   ✅ Token contract set successfully in block ${receipt1.blockNumber}`);
      } catch (error) {
        console.log(`   ❌ Failed to set token contract: ${error.message}`);
        throw error;
      }
    }

    // Fix marketplace contract address
    if (needsMarketplaceFix) {
      console.log("\n3️⃣ SETTING MARKETPLACE CONTRACT ADDRESS:");
      console.log(`   Setting to: ${CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT}`);
      
      try {
        const tx2 = await paymentSplitterContract.setMarketplace(CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT);
        console.log(`   Transaction sent: ${tx2.hash}`);
        console.log(`   Waiting for confirmation...`);
        
        const receipt2 = await tx2.wait();
        console.log(`   ✅ Marketplace contract set successfully in block ${receipt2.blockNumber}`);
      } catch (error) {
        console.log(`   ❌ Failed to set marketplace contract: ${error.message}`);
        throw error;
      }
    }

    // Verify final configuration
    console.log("\n4️⃣ VERIFYING FINAL CONFIGURATION:");
    const finalTokenContract = await paymentSplitterContract.tokenContract();
    const finalMarketplaceContract = await paymentSplitterContract.marketplaceContract();
    
    console.log(`   Final token contract: ${finalTokenContract}`);
    console.log(`   Expected: ${CONTRACT_ADDRESSES.TOKEN_CONTRACT}`);
    console.log(`   ✅ Token contract correct: ${finalTokenContract.toLowerCase() === CONTRACT_ADDRESSES.TOKEN_CONTRACT.toLowerCase()}`);
    
    console.log(`   Final marketplace contract: ${finalMarketplaceContract}`);
    console.log(`   Expected: ${CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT}`);
    console.log(`   ✅ Marketplace contract correct: ${finalMarketplaceContract.toLowerCase() === CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT.toLowerCase()}`);

    console.log("\n🎉 PAYMENTSPLITTER CONFIGURATION COMPLETE!");
    console.log("Settlement transactions should now work correctly.");

  } catch (error) {
    console.error("❌ Error during configuration fix:", error);
    
    if (error.message.includes("user rejected")) {
      console.log("User rejected the transaction in MetaMask");
    } else if (error.message.includes("insufficient funds")) {
      console.log("Insufficient FLOW for gas fees");
    } else if (error.code === "UNAUTHORIZED") {
      console.log("Unauthorized: Only contract owner can call these functions");
    }
  }
}

// Run if in browser environment
if (typeof window !== 'undefined' && window.ethereum) {
  // Export for browser console use
  window.fixPaymentSplitterConfig = fixPaymentSplitterConfig;
  console.log("Run fixPaymentSplitterConfig() in the browser console to fix the configuration");
} else {
  console.log("This script needs to be run in a browser with MetaMask");
}

export default fixPaymentSplitterConfig;