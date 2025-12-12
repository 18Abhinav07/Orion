import { StoryClient } from '@story-protocol/core-sdk';
import { ethers } from 'ethers';

export const royaltyService = {
  async getClaimableRevenue(
    ipId: string,
    claimerAddress: string,
    tokenAddress: string,
    signer: any
  ): Promise<string> {
    const client = StoryClient.newClient({
      environment: Environment.TEST, // Assuming Sepolia testnet
      signer,
    });

    const claimableRevenue = await client.royalty.claimableRevenue({
      ipId,
      claimer: claimerAddress,
      token: tokenAddress,
    });

    return claimableRevenue.toString();
  },

  async claimRevenue(
    ipId: string,
    claimerAddress: string,
    tokenAddress: string,
    signer: any
  ): Promise<void> {
    const client = StoryClient.newClient({
      environment: Environment.TEST,
      signer,
    });

    await client.royalty.claimRevenue({
        ipId,
        token: tokenAddress,
    });
  },

  async payRoyaltyOnBehalf(
    payerIpId: string,
    receiverIpId: string,
    tokenAddress: string,
    amount: string,
    signer: any
    ): Promise<void> {
    const client = StoryClient.newClient({
        environment: Environment.TEST,
        signer,
    });
    
    await client.royalty.payRoyaltyOnBehalf({
        payerIpId,
        receiverIpId,
        token: tokenAddress,
        amount,
    });
    },
};
