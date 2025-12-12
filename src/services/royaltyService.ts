import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { http, custom } from 'viem';
import { ethers } from 'ethers';

const STORY_RPC_URL = 'https://aeneid.storyrpc.io';

export const royaltyService = {
  async getClaimableRevenue(
    ipId: string,
    claimerAddress: string,
    tokenAddress: string,
    signer: any
  ): Promise<string> {
    const config: StoryConfig = {
      account: await signer.getAddress(),
      transport: http(STORY_RPC_URL),
      chainId: 'aeneid'
    };
    const client = StoryClient.newClient(config);

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
    // Get the EIP-1193 provider from the signer (MetaMask)
    const account = await signer.getAddress();
    
    // Use window.ethereum directly for transaction signing
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }
    
    const config: StoryConfig = {
      account,
      transport: custom(window.ethereum),
      chainId: 'aeneid'
    };
    const client = StoryClient.newClient(config);

    const response = await client.royalty.claimRevenue({
        ipId,
        token: tokenAddress,
        txOptions: { waitForTransaction: true }
    });
    
    return response;
  },

  async payRoyaltyOnBehalf(
    payerIpId: string,
    receiverIpId: string,
    tokenAddress: string,
    amount: string,
    signer: any
    ): Promise<void> {
    // Get the EIP-1193 provider from the signer (MetaMask)
    const account = await signer.getAddress();
    
    // Use window.ethereum directly for transaction signing
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }
    
    const config: StoryConfig = {
      account,
      transport: custom(window.ethereum),
      chainId: 'aeneid'
    };
    const client = StoryClient.newClient(config);
    
    const response = await client.royalty.payRoyaltyOnBehalf({
        payerIpId,
        receiverIpId,
        token: tokenAddress,
        amount,
        txOptions: { waitForTransaction: true }
    });
    
    return response;
    },
};
