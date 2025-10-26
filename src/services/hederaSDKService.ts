import {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenMintTransaction,
  TokenInfoQuery,
  TokenNftInfoQuery,
  AccountBalanceQuery,
  TransferTransaction
} from "@hashgraph/sdk";

export interface HederaTokenData {
  name: string;
  symbol: string;
  supply: number;
  metadataURI?: string;
  treasuryAccountId?: string;
  supplyKey?: string;
  decimals?: number;
  tokenType?: 'FUNGIBLE' | 'NFT' | 'ERC1155'; // alias ERC1155 -> NFT
}

export class HederaSDKService {
  private client: Client;
  private operatorAccountId: AccountId;
  private operatorPrivateKey: PrivateKey;

  constructor(accountId?: string, privateKey?: string) {
    this.client = Client.forTestnet();
    try {
      // Use provided credentials or hardcoded issuer account
      const hederaAccountId = accountId || "0.0.6498605";
      const hederaPrivateKey = privateKey || "0x7ea592ad2bf4db5e006b39dfc60f3ab9f17f6b548fba1fc5d89d4a38f8211acd";
      
      if(!hederaAccountId || !hederaPrivateKey) {
        throw new Error('Missing Hedera credentials');
      }
      
      this.operatorAccountId = AccountId.fromString(hederaAccountId.trim());
      // Accept both with or without 0x prefix
      const pk = hederaPrivateKey.trim();
      this.operatorPrivateKey = pk.startsWith('0x') && pk.length === 66 ? PrivateKey.fromStringECDSA(pk) : PrivateKey.fromString(pk);
      this.client.setOperator(this.operatorAccountId, this.operatorPrivateKey);
      console.log('✅ Hedera SDK initialized with operator', this.operatorAccountId.toString());
    } catch (error) {
      console.error('Failed to initialize Hedera client:', error);
      throw new Error(`Failed to initialize Hedera SDK: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create an ERC20 fungible token using Hedera Token Service
   */
  async createFungibleToken(tokenData: HederaTokenData): Promise<{ tokenId: string; transactionId: string }> {
    try {
      console.log("Creating fungible token:", tokenData);

      // Create the fungible token
      const txTokenCreate = await new TokenCreateTransaction()
        .setTokenName(tokenData.name)
        .setTokenSymbol(tokenData.symbol)
        .setTokenType(TokenType.FungibleCommon)
        .setTreasuryAccountId(this.operatorAccountId)
        .setInitialSupply(tokenData.supply)
        .setDecimals(tokenData.decimals || 0) // Default to 0 decimal places for whole number tokens
        .setSupplyKey(this.operatorPrivateKey)
        .setAdminKey(this.operatorPrivateKey)
        .freezeWith(this.client);

      // Sign the transaction
      const signTxTokenCreate = await txTokenCreate.sign(this.operatorPrivateKey);

      // Execute the transaction
      const txTokenCreateResponse = await signTxTokenCreate.execute(this.client);

      // Get the receipt
      const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(this.client);

      // Get the token ID
      const tokenId = receiptTokenCreateTx.tokenId;
      const transactionId = txTokenCreateResponse.transactionId.toString();

      console.log("✅ Fungible Token Created Successfully!");
      console.log("Token ID:", tokenId?.toString());
      console.log("Transaction ID:", transactionId);
      console.log("HashScan URL:", `https://hashscan.io/testnet/tx/${transactionId}`);

      if (!tokenId) {
        throw new Error("Failed to get token ID from receipt");
      }

      return {
        tokenId: tokenId.toString(),
        transactionId: transactionId
      };

    } catch (error) {
      console.error("Error creating fungible token:", error);
      throw error;
    }
  }

  /**
   * Create an NFT collection using Hedera Token Service
   */
  async createNFTCollection(tokenData: HederaTokenData): Promise<{ tokenId: string; transactionId: string; serials: number[] }> {
    try {
      console.log("Creating NFT / 1155 style collection:", tokenData);
      const maxSupply = tokenData.supply; // treat as max / planned mint amount
      const txTokenCreate = await new TokenCreateTransaction()
        .setTokenName(tokenData.name)
        .setTokenSymbol(tokenData.symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setTreasuryAccountId(this.operatorAccountId)
        .setSupplyKey(this.operatorPrivateKey)
        .setMaxSupply(maxSupply)
        .freezeWith(this.client);
      const signTxTokenCreate = await txTokenCreate.sign(this.operatorPrivateKey);
      const txTokenCreateResponse = await signTxTokenCreate.execute(this.client);
      const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(this.client);
      const tokenId = receiptTokenCreateTx.tokenId;
      const transactionId = txTokenCreateResponse.transactionId.toString();
      if (!tokenId) throw new Error('Failed to get token ID from receipt');
      let serials: number[] = [];
      if (tokenData.metadataURI) {
        serials = await this.mintNFTs(tokenId.toString(), tokenData.supply, tokenData.metadataURI);
      }
      return { tokenId: tokenId.toString(), transactionId, serials };
    } catch (error) {
      console.error('Error creating NFT collection:', error);
      throw error;
    }
  }

  // Alias for clarity when user says "1155"
  async create1155Token(tokenData: HederaTokenData) {
    return this.createNFTCollection({ ...tokenData, tokenType: 'ERC1155' });
  }

  /**
   * Mint NFTs to the treasury account
   */
  async mintNFTs(tokenId: string, quantity: number, metadataURI: string): Promise<number[]> {
    try {
      console.log(`Minting ${quantity} NFTs (ERC1155-style serials) for token ${tokenId}`);
      const metadata: Buffer[] = [];
      for (let i = 0; i < quantity; i++) {
        metadata.push(Buffer.from(`${metadataURI}#${i + 1}`));
      }
      const txMint = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata(metadata)
        .freezeWith(this.client);
      const signTxMint = await txMint.sign(this.operatorPrivateKey);
      const txMintResponse = await signTxMint.execute(this.client);
      const receiptMint = await txMintResponse.getReceipt(this.client);
      const serials = receiptMint.serials.map(s => Number(s));
      console.log('✅ Minted serials:', serials);
      return serials;
    } catch (error) {
      console.error('Error minting NFTs:', error);
      throw error;
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenId: string): Promise<any> {
    try {
      const tokenInfoQuery = new TokenInfoQuery()
        .setTokenId(tokenId);

      const tokenInfo = await tokenInfoQuery.execute(this.client);
      return tokenInfo;
    } catch (error) {
      console.error("Error getting token info:", error);
      return null;
    }
  }

  /**
   * Get account balance for a specific token
   */
  async getTokenBalance(accountId: string, tokenId: string): Promise<number> {
    try {
      const balanceQuery = new AccountBalanceQuery()
        .setAccountId(accountId);

      const balance = await balanceQuery.execute(this.client);
      const tokenBalance = balance.tokens.get(tokenId);
      
      return tokenBalance ? tokenBalance.toNumber() : 0;
    } catch (error) {
      console.error("Error getting token balance:", error);
      return 0;
    }
  }

  /**
   * Transfer tokens directly to marketplace using Hedera's native TransferTransaction
   */
  async transferTokensToMarketplace(tokenId: string, marketplaceAccountId: string, amount: number): Promise<{ success: boolean; transactionId: string }> {
    try {
      console.log(`Transferring ${amount} of token ${tokenId} to marketplace ${marketplaceAccountId}`);
      
      // Ensure token ID is in correct Hedera format (0.0.XXXXXX)
      let hederaTokenId = tokenId;
      if (tokenId.startsWith('0x')) {
        // Convert hex to decimal and format as Hedera token ID
        const tokenNumber = parseInt(tokenId, 16);
        hederaTokenId = `0.0.${tokenNumber}`;
        console.log(`Converted hex token ID ${tokenId} to Hedera format: ${hederaTokenId}`);
      }
      
      // Create the transfer transaction
      const transferTx = await new TransferTransaction()
        .addTokenTransfer(hederaTokenId, this.operatorAccountId, -amount) // Deduct from operator
        .addTokenTransfer(hederaTokenId, marketplaceAccountId, amount)     // Add to marketplace
        .freezeWith(this.client);

      // Sign with the operator private key
      const signTx = await transferTx.sign(this.operatorPrivateKey);

      // Execute the transaction
      const txResponse = await signTx.execute(this.client);

      // Get the receipt
      const receipt = await txResponse.getReceipt(this.client);
      const transactionId = txResponse.transactionId.toString();

      console.log('✅ Token transfer successful!');
      console.log('Transaction ID:', transactionId);
      console.log('Transaction Status:', receipt.status.toString());

      return {
        success: true,
        transactionId: transactionId
      };

    } catch (error) {
      console.error("Error transferring tokens:", error);
      throw error;
    }
  }

  /**
   * Approve marketplace to spend tokens on behalf of the operator
   */
  async approveMarketplace(tokenId: string, marketplaceAddress: string, amount: number): Promise<{ success: boolean; transactionId: string }> {
    try {
      console.log(`Approving marketplace ${marketplaceAddress} with unlimited allowance for token ${tokenId}`);
      
      // For HTS tokens, we need to use the Hedera precompiled contract
      // Import ethers for contract interaction
      const ethers = await import('ethers');
      
      // Create a provider connected to Hedera testnet
      const provider = new ethers.ethers.providers.JsonRpcProvider('https://testnet.hashio.io/api');
      
      // Create wallet from private key
      const wallet = new ethers.ethers.Wallet(this.operatorPrivateKey.toStringRaw(), provider);
      
      // HTS precompiled contract ABI for approve function
      const htsABI = [
        "function approve(address token, address spender, uint256 amount) external returns (int responseCode)"
      ];
      
      // HTS precompiled contract address
      const HTS_ADDRESS = "0x0000000000000000000000000000000000000167";
      
      // Create contract instance
      const htsContract = new ethers.ethers.Contract(HTS_ADDRESS, htsABI, wallet);
      
      // Call approve function with manual gas limit and higher gas price
      const tx = await htsContract.approve(tokenId, marketplaceAddress, ethers.ethers.constants.MaxUint256, {
        gasLimit: 3000000, // Manual gas limit to avoid estimation failures
        gasPrice: ethers.ethers.utils.parseUnits('340', 'gwei') // Use minimum required gas price
      });
      const receipt = await tx.wait();
      
      console.log('✅ Marketplace approval successful!');
      console.log('Transaction ID:', receipt.transactionHash);
      
      return {
        success: true,
        transactionId: receipt.transactionHash
      };
      
    } catch (error) {
      console.error("Error approving marketplace:", error);
      throw error;
    }
  }

  /**
   * Close the client connection
   */
  close(): void {
    if (this.client) {
      this.client.close();
    }
  }
}
