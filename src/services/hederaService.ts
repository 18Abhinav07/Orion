import { 
  Client, 
  PrivateKey, 
  AccountId, 
  TokenCreateTransaction, 
  TokenMintTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  TokenType,
  TokenSupplyType,
  Hbar
} from "@hashgraph/sdk";
import { ethers } from "ethers";

// Helper function to convert string to Uint8Array for browser compatibility
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Helper function to convert Uint8Array to string for browser compatibility
function uint8ArrayToString(uint8Array: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(uint8Array);
}

export interface TokenCreationData {
  name: string;
  description: string;
  metadataURI: string;
  amount: number;
  price: number;
  assetType: string;
}

export interface HederaConfig {
  network: 'testnet' | 'mainnet';
  operatorId?: string;
  operatorKey?: string;
}

class HederaTokenService {
  private client: Client;
  private config: HederaConfig;

  constructor(config: HederaConfig = { network: 'testnet' }) {
    this.config = config;
    
    if (config.network === 'testnet') {
      this.client = Client.forTestnet();
    } else {
      this.client = Client.forMainnet();
    }

    // Set operator if provided (for platform operations)
    if (config.operatorId && config.operatorKey) {
      this.client.setOperator(
        AccountId.fromString(config.operatorId),
        PrivateKey.fromString(config.operatorKey)
      );
    }
  }

  /**
   * Verify if an Ethereum address is authorized issuer via smart contract
   */
  async verifyIssuerAuthorization(
    issuerAddress: string, 
    adminContractAddress: string, 
    web3Provider: any
  ): Promise<boolean> {
    try {
      const adminABI = [
        "function isIssuer(address) external view returns (bool)"
      ];
      
      const contract = new ethers.Contract(adminContractAddress, adminABI, web3Provider);
      const isAuthorized = await contract.isIssuer(issuerAddress);
      
      return isAuthorized;
    } catch (error) {
      console.error('Error verifying issuer authorization:', error);
      return false;
    }
  }

  /**
   * Request user signature for token creation
   */
  async requestTokenCreationSignature(
    tokenData: TokenCreationData, 
    issuerAddress: string, 
    web3Provider: any
  ): Promise<{ signature: string; message: string }> {
    try {
      const timestamp = Date.now();
      
      const message = `Create HTS Token:
Name: ${tokenData.name}
Description: ${tokenData.description}
Asset Type: ${tokenData.assetType}
Amount: ${tokenData.amount}
Price: ${tokenData.price}
Metadata URI: ${tokenData.metadataURI}
Timestamp: ${timestamp}
I authorize this token creation on Hedera.`;

      const signer = web3Provider.getSigner();
      const signature = await signer.signMessage(message);
      
      // Verify signature matches issuer address
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== issuerAddress.toLowerCase()) {
        throw new Error('Signature verification failed');
      }

      return { signature, message };
    } catch (error) {
      console.error('Error requesting signature:', error);
      throw error;
    }
  }

  /**
   * Create HTS token with platform account (gas paid by platform)
   * This is called after signature verification
   */
  async createToken(
    tokenData: TokenCreationData,
    issuerAddress: string,
    signature: string,
    message: string
  ): Promise<{ tokenId: string; serialNumbers: number[] }> {
    try {
      // Verify signature one more time
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== issuerAddress.toLowerCase()) {
        throw new Error('Invalid signature');
      }

      // Check timestamp (prevent replay attacks)
      const messageLines = message.split('\n');
      const timestampLine = messageLines.find(line => line.startsWith('Timestamp:'));
      if (timestampLine) {
        const timestamp = parseInt(timestampLine.split(': ')[1]);
        const currentTime = Date.now();
        if (currentTime - timestamp > 300000) { // 5 minutes expiry
          throw new Error('Signature expired');
        }
      }

      // Create token
      const operatorKey = PrivateKey.fromString(this.config.operatorKey!);
      const operatorId = AccountId.fromString(this.config.operatorId!);
      
      const tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName(tokenData.name)
        .setTokenSymbol("OA") // Could be dynamic based on asset type
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(tokenData.amount)
        .setSupplyKey(operatorKey)
        .setTreasuryAccountId(operatorId)
        .setTokenMemo(JSON.stringify({
          metadataURI: tokenData.metadataURI,
          price: tokenData.price,
          amount: tokenData.amount,
          assetType: tokenData.assetType,
          issuer: issuerAddress,
          createdAt: Date.now()
        }))
        .setMaxTransactionFee(new Hbar(2))
        .execute(this.client);

      const receipt = await tokenCreateTx.getReceipt(this.client);
      const tokenId = receipt.tokenId;
      if (!tokenId) {
        throw new Error('Failed to create token');
      }

      // For NFTs, we need to mint individual tokens with metadata
      const serialNumbers: number[] = [];
      for (let i = 0; i < tokenData.amount; i++) {
        const mintTx = await new TokenMintTransaction()
          .setTokenId(tokenId)
          .setMetadata([stringToUint8Array(tokenData.metadataURI)])
          .setMaxTransactionFee(new Hbar(2))
          .execute(this.client);

        const mintReceipt = await mintTx.getReceipt(this.client);
        if (mintReceipt.serials && mintReceipt.serials.length > 0) {
          serialNumbers.push(mintReceipt.serials[0].toNumber());
        }
      }

      return {
        tokenId: tokenId.toString(),
        serialNumbers
      };

    } catch (error) {
      console.error('Error creating HTS token:', error);
      throw error;
    }
  }

  /**
   * Transfer HTS token to marketplace
   */
  async transferToMarketplace(
    tokenId: string,
    amount: number,
    price: number,
    userAddress: string,
    ethereumProvider: any
  ): Promise<{ transactionId: string }> {
    try {
      // For simplicity, we'll use the platform account to handle the transfer
      // In production, you might want to implement a more complex mechanism
      // where users associate tokens and approve transfers
      
      const serialNumbers = Array.from({ length: amount }, (_, i) => i + 1);
      const marketplaceAccountId = AccountId.fromString(this.config.operatorId!);
      const userAccountId = AccountId.fromString(userAddress); // This would need mapping from ETH to Hedera
      
      const transferTx = await new TransferTransaction()
        .addNftTransfer(tokenId, serialNumbers[0], userAccountId, marketplaceAccountId)
        .setMaxTransactionFee(new Hbar(1))
        .execute(this.client);

      return { transactionId: transferTx.transactionId.toString() };
    } catch (error) {
      console.error('Error transferring token to marketplace:', error);
      throw error;
    }
  }

  /**
   * Get token metadata from Hedera Mirror Node
   */
  async getTokenMetadata(tokenId: string, serialNumber?: number): Promise<any> {
    try {
      const mirrorNodeUrl = this.config.network === 'testnet' 
        ? 'https://testnet.mirrornode.hedera.com'
        : 'https://mainnet-public.mirrornode.hedera.com';

      let url = `${mirrorNodeUrl}/api/v1/tokens/${tokenId}`;
      if (serialNumber) {
        url += `/nfts/${serialNumber}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (serialNumber && data.metadata) {
        // Parse NFT metadata - handle base64 encoded metadata
        try {
          // Try to decode base64 if it's encoded, otherwise use as string
          let metadataString = data.metadata;
          if (typeof data.metadata === 'string') {
            try {
              // Try to decode from base64
              const decoded = atob(data.metadata);
              metadataString = decoded;
            } catch {
              // If base64 decode fails, use as is
              metadataString = data.metadata;
            }
          }
          const metadata = JSON.parse(metadataString);
          return metadata;
        } catch (error) {
          console.error('Error parsing NFT metadata:', error);
          return data.metadata;
        }
      }

      return data;
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      throw error;
    }
  }

  /**
   * Check token balance
   */
  async getTokenBalance(accountId: string, tokenId: string): Promise<number> {
    try {
      const mirrorNodeUrl = this.config.network === 'testnet' 
        ? 'https://testnet.mirrornode.hedera.com'
        : 'https://mainnet-public.mirrornode.hedera.com';

      const response = await fetch(
        `${mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`
      );
      const data = await response.json();

      if (data.tokens && data.tokens.length > 0) {
        return parseInt(data.tokens[0].balance);
      }

      return 0;
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0;
    }
  }
}

export default HederaTokenService;
