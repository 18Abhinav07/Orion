// Debug Income Dashboard - Exact Replica of Dashboard Logic
import { ethers } from 'ethers';

const CONTRACT_ADDRESSES = {
  PAYMENT_SPLITTER_CONTRACT: "0x6f2db3e628879ee72B455a946C1d6cfBa51aac91",
  MARKETPLACE_CONTRACT: "0xE8DE43BD00370F48db7Ac139146AC27B1AfEd7aF",
  TOKEN_CONTRACT: "0x24eb8429Dc1e5f217866D0c74Db245Fa3aAFA31A"
};

const TEST_ADDRESS = "0xe7a5731070145b490fc9c81a45f98dc04bbece20";
const TOKEN_ID = 7;

async function debugIncomeDashboardLogic() {
  console.log("🐛 DEBUGGING INCOME DASHBOARD EXACT LOGIC");
  console.log("=" .repeat(60));
  console.log(`📋 Test Address: ${TEST_ADDRESS}`);
  console.log("=" .repeat(60));

  try {
    const provider = new ethers.providers.JsonRpcProvider("https://mainnet.evm.nodes.onflow.org");
    const currentBlock = await provider.getBlockNumber();
    console.log(`📦 Current Block: ${currentBlock}`);

    // Step 1: Replicate getUserTokenHoldings exactly as income dashboard does
    console.log("\n1️⃣ REPLICATING getUserTokenHoldings():");
    
    const marketplaceContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MARKETPLACE_CONTRACT,
      [
        "function getAllListings() view returns (uint256[] memory tokenIds, address[] memory issuers, uint256[] memory amounts, uint256[] memory prices)",
        "function getUserBalance(address _user, uint256 _tokenId) view returns (uint256)"
      ],
      provider
    );

    const tokenContract = new ethers.Contract(
      CONTRACT_ADDRESSES.TOKEN_CONTRACT,
      [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function getTokenInfo(uint256 tokenId) view returns (uint256 price, string memory metadataURI, address issuer, uint256 supply)"
      ],
      provider
    );

    // Get all marketplace listings (like income dashboard does)
    console.log("   Getting getAllListings()...");
    const marketplaceData = await marketplaceContract.getAllListings();
    const [tokenIds, issuers, amounts, prices] = marketplaceData;
    
    console.log(`   Found ${tokenIds.length} total listings`);
    
    const userAssets = [];
    
    // Process each token like income dashboard does
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i].toString();
      console.log(`   Processing token ${tokenId}...`);
      
      try {
        // Check HYBRID balance (wallet + marketplace) like our fix
        const walletBalance = await tokenContract.balanceOf(TEST_ADDRESS, tokenId);
        const marketplaceBalance = await marketplaceContract.getUserBalance(TEST_ADDRESS, tokenId);
        const totalBalance = walletBalance.add(marketplaceBalance);
        
        console.log(`   Token ${tokenId} - Wallet: ${walletBalance.toString()}, Marketplace: ${marketplaceBalance.toString()}, Total: ${totalBalance.toString()}`);
        
        if (totalBalance.gt(0)) {
          console.log(`   ✅ Token ${tokenId} has balance, adding to userAssets`);
          
          const tokenInfo = await tokenContract.getTokenInfo(tokenId);
          
          userAssets.push({
            tokenId,
            assetName: `Asset #${tokenId}`,
            balance: totalBalance.toString(),
            walletBalance: walletBalance.toString(),
            marketplaceBalance: marketplaceBalance.toString(),
            price: ethers.utils.formatEther(tokenInfo.price),
            totalInvested: ethers.utils.formatEther(tokenInfo.price.mul(totalBalance))
          });
        } else {
          console.log(`   ❌ Token ${tokenId} has no balance, skipping`);
        }
      } catch (error) {
        console.log(`   ❌ Error processing token ${tokenId}:`, error.message);
      }
    }
    
    console.log(`   Final userAssets: ${userAssets.length} assets found`);
    userAssets.forEach((asset, i) => {
      console.log(`   ${i+1}. Token ${asset.tokenId}: ${asset.marketplaceBalance} marketplace balance`);
    });

    // Step 2: Replicate getYieldTransactionHistory exactly
    console.log("\n2️⃣ REPLICATING getYieldTransactionHistory():");
    
    const paymentSplitterContract = new ethers.Contract(
      CONTRACT_ADDRESSES.PAYMENT_SPLITTER_CONTRACT,
      [
        "event RentalDistributed(uint256 indexed tokenId, uint256 totalAmount, uint256 toHolders, uint256 toPlatform)",
        "event InvoiceSettled(uint256 indexed tokenId, uint256 totalAmount, uint256 toHolders, uint256 toPlatform)"
      ],
      provider
    );

    const yieldTransactions = [];
    
    // Check current search range (-10000 blocks like dashboard)
    const searchFromBlock = currentBlock - 10000;
    console.log(`   Searching from block: ${searchFromBlock} to ${currentBlock}`);
    console.log(`   Settlement was at block: 76560865`);
    console.log(`   Settlement in range: ${76560865 >= searchFromBlock ? 'YES' : 'NO'}`);

    try {
      // Get RentalDistributed events
      console.log("   Fetching RentalDistributed events...");
      const rentalFilter = paymentSplitterContract.filters.RentalDistributed();
      const rentalEvents = await paymentSplitterContract.queryFilter(rentalFilter, -10000);
      console.log(`   Found ${rentalEvents.length} RentalDistributed events`);

      // Get InvoiceSettled events
      console.log("   Fetching InvoiceSettled events...");
      const settlementFilter = paymentSplitterContract.filters.InvoiceSettled();
      const settlementEvents = await paymentSplitterContract.queryFilter(settlementFilter, -10000);
      console.log(`   Found ${settlementEvents.length} InvoiceSettled events`);

      // Process settlement events
      for (const event of settlementEvents) {
        const tokenId = event.args?.tokenId?.toString();
        const totalAmount = event.args?.totalAmount;
        const toHolders = event.args?.toHolders;
        const toPlatform = event.args?.toPlatform;
        
        console.log(`   Processing settlement event for token ${tokenId}...`);
        console.log(`     Total: ${ethers.utils.formatEther(totalAmount)} FLOW`);
        console.log(`     To Holders: ${ethers.utils.formatEther(toHolders)} FLOW`);
        console.log(`     Block: ${event.blockNumber}`);
        
        // Check if user has this asset
        const hasAsset = userAssets.some(asset => asset.tokenId === tokenId);
        console.log(`     User has asset: ${hasAsset}`);
        
        if (tokenId && hasAsset) {
          const asset = userAssets.find(a => a.tokenId === tokenId);
          console.log(`     Asset found: Token ${asset.tokenId}, marketplace balance: ${asset.marketplaceBalance}`);
          
          // Calculate user share (replicate exact dashboard logic)
          const userMarketplaceBalance = parseFloat(asset.marketplaceBalance || '0');
          
          if (userMarketplaceBalance > 0) {
            try {
              // Get marketplace holdings for proportion calculation
              const holdersData = await marketplaceContract.getTokenHolders(tokenId);
              const [holders, amounts] = holdersData;
              const totalMarketplaceSupply = amounts.reduce((sum, amount) => sum + parseFloat(ethers.utils.formatUnits(amount, 0)), 0);
              
              console.log(`     User marketplace balance: ${userMarketplaceBalance}`);
              console.log(`     Total marketplace supply: ${totalMarketplaceSupply}`);
              
              if (totalMarketplaceSupply > 0) {
                const userProportion = userMarketplaceBalance / totalMarketplaceSupply;
                const userShare = (parseFloat(ethers.utils.formatEther(toHolders)) * userProportion).toFixed(6);
                
                console.log(`     User proportion: ${(userProportion * 100).toFixed(2)}%`);
                console.log(`     User share: ${userShare} FLOW`);
                
                if (parseFloat(userShare) > 0) {
                  const block = await event.getBlock();
                  yieldTransactions.push({
                    tokenId,
                    assetName: asset.assetName,
                    amount: userShare,
                    timestamp: new Date(block.timestamp * 1000).toISOString(),
                    type: 'settlement',
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber
                  });
                  
                  console.log(`     ✅ Added yield transaction: ${userShare} FLOW`);
                } else {
                  console.log(`     ❌ User share is 0`);
                }
              } else {
                console.log(`     ❌ Total marketplace supply is 0`);
              }
            } catch (error) {
              console.log(`     ❌ Error calculating share:`, error.message);
            }
          } else {
            console.log(`     ❌ User has no marketplace balance`);
          }
        } else {
          console.log(`     ❌ User doesn't have this asset or tokenId missing`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Error fetching events:`, error.message);
    }

    console.log(`\n   Final yield transactions: ${yieldTransactions.length}`);
    yieldTransactions.forEach((tx, i) => {
      console.log(`   ${i+1}. ${tx.assetName}: ${tx.amount} FLOW (${tx.type})`);
    });

    // Step 3: Calculate summary
    console.log("\n3️⃣ SUMMARY CALCULATION:");
    const totalYieldReceived = yieldTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    console.log(`   Total yield received: ${totalYieldReceived.toFixed(6)} FLOW`);
    
    if (totalYieldReceived > 0) {
      console.log(`   ✅ SUCCESS: Income dashboard should show ${totalYieldReceived.toFixed(6)} FLOW yield`);
    } else {
      console.log(`   ❌ PROBLEM: No yield calculated, investigating...`);
      
      // Debug why no yield
      if (userAssets.length === 0) {
        console.log(`     Issue: No user assets found`);
      } else if (settlementEvents.length === 0) {
        console.log(`     Issue: No settlement events in search range`);
      } else {
        console.log(`     Issue: Events found but yield calculation failed`);
      }
    }

  } catch (error) {
    console.error("❌ Error during debugging:", error);
  }
}

async function main() {
  await debugIncomeDashboardLogic();
}

main().catch(console.error);