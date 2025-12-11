import { ethers } from 'ethers';
import { ORDER_BOOK_ESCROW_ABI } from './orderBookEscrowABI';

export interface EscrowOrder {
  orderId: string;
  maker: string;
  tokenId: string;
  amount: number;
  pricePerTokenU2U: number;
  isBuyOrder: boolean;
  isActive: boolean;
  isFilled: boolean;
  timestamp: number;
  expiryTimestamp: number;
}

export interface OrderBookData {
  sellOrders: EscrowOrder[];  // Asks
  buyOrders: EscrowOrder[];   // Bids
}

export class OrderBookEscrowService {
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private contractAddress: string;

  constructor(provider: ethers.providers.Provider, contractAddress: string, signer?: ethers.Signer) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    this.signer = signer;
  }

  private getContract(withSigner = false) {
    return new ethers.Contract(
      this.contractAddress,
      ORDER_BOOK_ESCROW_ABI,
      withSigner && this.signer ? this.signer : this.provider
    );
  }

  /**
   * MAKER: Create Sell Order (Escrow Asset Tokens)
   * User must have already approved the OrderBookEscrow contract via setApprovalForAll
   */
  async createSellOrder(
    tokenId: string,
    amount: number,
    pricePerTokenU2U: string
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error('Signer required');
    
    const contract = this.getContract(true);
    const priceInWei = ethers.utils.parseEther(pricePerTokenU2U);
    
    const tx = await contract.createSellOrder(tokenId, amount, priceInWei);
    return tx;
  }

  /**
   * MAKER: Create Buy Order (Escrow U2U Payment)
   * User sends U2U currency with the transaction
   */
  async createBuyOrder(
    tokenId: string,
    amount: number,
    pricePerTokenU2U: string
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error('Signer required');
    
    const contract = this.getContract(true);
    const priceInWei = ethers.utils.parseEther(pricePerTokenU2U);
    const totalCost = priceInWei.mul(amount);
    
    const tx = await contract.createBuyOrder(tokenId, amount, priceInWei, { value: totalCost });
    return tx;
  }

  /**
   * TAKER: Fill Order (Atomic Execution)
   * Automatically detects if filling a buy or sell order and handles payment accordingly
   */
  async fillOrder(orderId: string, amountToFill: number, orderData: EscrowOrder): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error('Signer required');
    
    const contract = this.getContract(true);
    
    if (orderData.isBuyOrder) {
      // Filling a BUY order - taker provides tokens, no payment needed
      const tx = await contract.fillOrder(orderId, amountToFill);
      return tx;
    } else {
      // Filling a SELL order - taker provides U2U payment
      const totalCost = ethers.utils.parseEther(orderData.pricePerTokenU2U.toString()).mul(amountToFill);
      const platformFee = totalCost.div(100); // 1%
      const totalRequired = totalCost.add(platformFee);
      
      const tx = await contract.fillOrder(orderId, amountToFill, { value: totalRequired });
      return tx;
    }
  }

  /**
   * Get Order Book for Token (Both Buy and Sell Orders)
   */
  async getOrderBook(tokenId: string): Promise<OrderBookData> {
    const contract = this.getContract();
    const [sellOrderIds, buyOrderIds] = await contract.getActiveOrders(tokenId);
    
    const sellOrders: EscrowOrder[] = [];
    const buyOrders: EscrowOrder[] = [];
    
    // Fetch sell orders (asks)
    for (const orderId of sellOrderIds) {
      try {
        const orderData = await contract.activeOrders(orderId);
        if (orderData.isActive && !orderData.isBuyOrder) {
          sellOrders.push({
            orderId: orderId.toString(),
            maker: orderData.maker,
            tokenId: orderData.tokenId.toString(),
            amount: orderData.amount.toNumber(),
            pricePerTokenU2U: parseFloat(ethers.utils.formatEther(orderData.pricePerTokenU2U)),
            isBuyOrder: orderData.isBuyOrder,
            isActive: orderData.isActive,
            isFilled: orderData.isFilled,
            timestamp: orderData.timestamp.toNumber(),
            expiryTimestamp: orderData.expiryTimestamp.toNumber()
          });
        }
      } catch (error) {
        console.warn(`Error fetching sell order ${orderId}:`, error);
      }
    }
    
    // Fetch buy orders (bids)
    for (const orderId of buyOrderIds) {
      try {
        const orderData = await contract.activeOrders(orderId);
        if (orderData.isActive && orderData.isBuyOrder) {
          buyOrders.push({
            orderId: orderId.toString(),
            maker: orderData.maker,
            tokenId: orderData.tokenId.toString(),
            amount: orderData.amount.toNumber(),
            pricePerTokenU2U: parseFloat(ethers.utils.formatEther(orderData.pricePerTokenU2U)),
            isBuyOrder: orderData.isBuyOrder,
            isActive: orderData.isActive,
            isFilled: orderData.isFilled,
            timestamp: orderData.timestamp.toNumber(),
            expiryTimestamp: orderData.expiryTimestamp.toNumber()
          });
        }
      } catch (error) {
        console.warn(`Error fetching buy order ${orderId}:`, error);
      }
    }
    
    // Sort orders: sell orders by price (lowest first), buy orders by price (highest first)
    sellOrders.sort((a, b) => a.pricePerTokenU2U - b.pricePerTokenU2U);
    buyOrders.sort((a, b) => b.pricePerTokenU2U - a.pricePerTokenU2U);
    
    return { sellOrders, buyOrders };
  }

  /**
   * Cancel Order and Return Escrow
   */
  async cancelOrder(orderId: string): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error('Signer required');
    
    const contract = this.getContract(true);
    const tx = await contract.cancelOrder(orderId);
    return tx;
  }

  /**
   * Get User's Escrow Balances
   */
  async getEscrowBalances(userAddress: string): Promise<{u2u: number, tokens: {[tokenId: string]: number}}> {
    const contract = this.getContract();
    
    const escrowedU2U = await contract.getEscrowedU2U(userAddress);
    
    // Note: To get all escrowed tokens, you'd need to track tokenIds from user's orders
    // This is a simplified version - in practice, you'd maintain this data from events
    
    return {
      u2u: parseFloat(ethers.utils.formatEther(escrowedU2U)),
      tokens: {} // Would be populated from user's order history
    };
  }

  /**
   * Get User's Order History
   */
  async getUserOrders(userAddress: string): Promise<string[]> {
    const contract = this.getContract();
    const orderIds = await contract.getUserOrders(userAddress);
    return orderIds.map((id: ethers.BigNumber) => id.toString());
  }

  /**
   * Get Best Ask Price (Lowest Sell Order)
   */
  async getBestAskPrice(tokenId: string): Promise<{price: number, amount: number}> {
    const contract = this.getContract();
    const [price, amount] = await contract.getBestAskPrice(tokenId);
    
    return {
      price: parseFloat(ethers.utils.formatEther(price)),
      amount: amount.toNumber()
    };
  }

  /**
   * Get Best Bid Price (Highest Buy Order)
   */
  async getBestBidPrice(tokenId: string): Promise<{price: number, amount: number}> {
    const contract = this.getContract();
    const [price, amount] = await contract.getBestBidPrice(tokenId);
    
    return {
      price: parseFloat(ethers.utils.formatEther(price)),
      amount: amount.toNumber()
    };
  }

  /**
   * Get Order Details
   */
  async getOrderDetails(orderId: string): Promise<EscrowOrder | null> {
    try {
      const contract = this.getContract();
      const orderData = await contract.activeOrders(orderId);
      
      return {
        orderId: orderId,
        maker: orderData.maker,
        tokenId: orderData.tokenId.toString(),
        amount: orderData.amount.toNumber(),
        pricePerTokenU2U: parseFloat(ethers.utils.formatEther(orderData.pricePerTokenU2U)),
        isBuyOrder: orderData.isBuyOrder,
        isActive: orderData.isActive,
        isFilled: orderData.isFilled,
        timestamp: orderData.timestamp.toNumber(),
        expiryTimestamp: orderData.expiryTimestamp.toNumber()
      };
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Check if user has approved the OrderBookEscrow contract
   */
  async checkApproval(userAddress: string, tokenContractAddress: string): Promise<boolean> {
    const tokenContract = new ethers.Contract(
      tokenContractAddress,
      [
        "function isApprovedForAll(address owner, address operator) external view returns (bool)"
      ],
      this.provider
    );
    
    return await tokenContract.isApprovedForAll(userAddress, this.contractAddress);
  }

  /**
   * Approve OrderBookEscrow contract to manage user's tokens
   */
  async approveContract(tokenContractAddress: string): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error('Signer required');
    
    const tokenContract = new ethers.Contract(
      tokenContractAddress,
      [
        "function setApprovalForAll(address operator, bool approved) external"
      ],
      this.signer
    );
    
    const tx = await tokenContract.setApprovalForAll(this.contractAddress, true);
    return tx;
  }
}