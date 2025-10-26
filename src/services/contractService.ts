import { ethers } from 'ethers';
import adminABI from '../utils/adminABI.json';

const CONTRACT_ADDRESS = "0xC57D9378F54A2cA9ED87822E9922c79F684B2a2c";
const RPC_URL = "https://testnet.hashio.io/api";

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, adminABI, provider);

export const getAllIssuers = async () => {
  try {
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 50000); // Last ~7 days on Hedera
    
    // Create filter for IssuerAdded events
    const filter = contract.filters.IssuerAdded();
    const events = await contract.queryFilter(filter, fromBlock, "latest");
    
    console.log(`Found ${events.length} IssuerAdded events from block ${fromBlock} to ${currentBlock}`);
    
    // Get current issuers from contract directly
    let currentIssuers: string[] = [];
    try {
      currentIssuers = await contract.getAllIssuers();
    } catch (error) {
      console.log('getAllIssuers function not available, using events only');
    }
    
    // Extract issuer data from events
    const eventIssuers = events.map(event => ({
      address: event.args.issuer,
      metadata: event.args.metadataURI,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    }));
    
    // If we have current issuers from contract, filter events to only include current ones
    const activeIssuers = currentIssuers.length > 0 
      ? eventIssuers.filter(issuer => currentIssuers.includes(issuer.address))
      : eventIssuers;
    
    // Log each active issuer found
    activeIssuers.forEach((issuer, index) => {
      console.log(`Active Issuer ${index + 1}: ${issuer.address} (metadata: ${issuer.metadata})`);
    });
    
    const addresses = activeIssuers.map(issuer => issuer.address);
    const metadata = {};
    activeIssuers.forEach(issuer => {
      metadata[issuer.address] = issuer.metadata;
    });
    
    return {
      addresses,
      count: addresses.length,
      metadata
    };
  } catch (error) {
    console.error('Error fetching issuers from events:', error);
    return { addresses: [], count: 0, metadata: {} };
  }
};

export const getAllManagers = async () => {
  try {
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 50000); // Last ~7 days on Hedera
    
    // Create filter for ManagerAdded events
    const filter = contract.filters.ManagerAdded();
    const events = await contract.queryFilter(filter, fromBlock, "latest");
    
    console.log(`Found ${events.length} ManagerAdded events from block ${fromBlock} to ${currentBlock}`);
    
    // Get current managers from contract directly
    let currentManagers: string[] = [];
    try {
      currentManagers = await contract.getAllManagers();
    } catch (error) {
      console.log('getAllManagers function not available, using events only');
    }
    
    // Extract manager data from events
    const eventManagers = events.map(event => ({
      address: event.args.manager,
      metadata: event.args.metadataURI,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    }));
    
    // If we have current managers from contract, filter events to only include current ones
    const activeManagers = currentManagers.length > 0 
      ? eventManagers.filter(manager => currentManagers.includes(manager.address))
      : eventManagers;
    
    // Log each active manager found
    activeManagers.forEach((manager, index) => {
      console.log(`Active Manager ${index + 1}: ${manager.address} (metadata: ${manager.metadata})`);
    });
    
    const addresses = activeManagers.map(manager => manager.address);
    const metadata = {};
    activeManagers.forEach(manager => {
      metadata[manager.address] = manager.metadata;
    });
    
    return {
      addresses,
      count: addresses.length,
      metadata
    };
  } catch (error) {
    console.error('Error fetching managers from events:', error);
    return { addresses: [], count: 0, metadata: {} };
  }
};

export const isIssuer = async (address: string) => {
  try {
    return await contract.isIssuer(address);
  } catch (error) {
    console.error('Error checking issuer status:', error);
    return false;
  }
};

export const addIssuer = async (address: string, metadataURI: string, signer: ethers.Signer) => {
  try {
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.addIssuer(address, metadataURI, {
      gasLimit: 3000000
    });
    await tx.wait();
    console.log('Issuer added successfully:', tx.hash);
    return tx;
  } catch (error) {
    console.error('Error adding issuer:', error);
    throw error;
  }
};

export const addManager = async (address: string, metadataURI: string, signer: ethers.Signer) => {
  try {
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.addManager(address, metadataURI, {
      gasLimit: 3000000
    });
    await tx.wait();
    console.log('Manager added successfully:', tx.hash);
    return tx;
  } catch (error) {
    console.error('Error adding manager:', error);
    throw error;
  }
};

export const removeIssuer = async (address: string, signer: ethers.Signer) => {
  try {
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.removeIssuer(address, {
      gasLimit: 3000000
    });
    await tx.wait();
    console.log('Issuer removed successfully:', tx.hash);
    return tx;
  } catch (error) {
    console.error('Error removing issuer:', error);
    throw error;
  }
};

export const removeManager = async (address: string, signer: ethers.Signer) => {
  try {
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.removeManager(address, {
      gasLimit: 3000000
    });
    await tx.wait();
    console.log('Manager removed successfully:', tx.hash);
    return tx;
  } catch (error) {
    console.error('Error removing manager:', error);
    throw error;
  }
};

export const pauseMarketplace = async (signer: ethers.Signer) => {
  try {
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.pauseMarketplace({
      gasLimit: 3000000
    });
    await tx.wait();
    console.log('Marketplace pause status toggled successfully:', tx.hash);
    return tx;
  } catch (error) {
    console.error('Error toggling marketplace pause status:', error);
    throw error;
  }
};

export const getMarketplacePaused = async () => {
  try {
    const isPaused = await contract.marketplacePaused();
    console.log('Marketplace paused status:', isPaused);
    return isPaused;
  } catch (error) {
    console.error('Error getting marketplace paused status:', error);
    return false;
  }
};

export const assignManager = async (managerAddress: string, tokenId: string, signer: ethers.Signer) => {
  try {
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.assignManager(managerAddress, tokenId, {
      gasLimit: 3000000
    });
    await tx.wait();
    console.log('Manager assigned to token successfully:', tx.hash);
    return tx;
  } catch (error) {
    console.error('Error assigning manager to token:', error);
    throw error;
  }
};

export const getManagerTokens = async (managerAddress: string) => {
  try {
    // First check if the function exists in the contract
    if (!contract.getManagerTokens) {
      console.log('getManagerTokens function not available in contract');
      return [];
    }

    console.log(`Attempting to get tokens for manager: ${managerAddress}`);

    // First check if manager exists to avoid contract reverts
    try {
      const managers = await getAllManagers();
      const isValidManager = managers.addresses.includes(managerAddress);
      console.log(`Manager ${managerAddress} is valid: ${isValidManager}`);
      
      if (!isValidManager) {
        console.log(`Address ${managerAddress} is not a registered manager`);
        return [];
      }
    } catch (managerCheckError) {
      console.log('Could not verify manager status, proceeding with contract call:', managerCheckError);
    }

    // Try to call the contract function
    const tokens = await contract.getManagerTokens(managerAddress);
    console.log(`Raw contract response for manager ${managerAddress}:`, tokens);
    
    if (!tokens || tokens.length === 0) {
      console.log(`Manager ${managerAddress} has no assigned tokens`);
      return [];
    }

    const tokenStrings = tokens.map(token => token.toString());
    console.log(`Manager ${managerAddress} has ${tokenStrings.length} assigned tokens:`, tokenStrings);
    return tokenStrings;
  } catch (error) {
    console.error(`Error getting manager tokens for ${managerAddress}:`, error);
    
    // Check if it's a call revert exception
    if (error.message && error.message.includes('call revert exception')) {
      console.log(`Contract call reverted for manager ${managerAddress} - likely no tokens assigned or manager doesn't exist in contract`);
    }
    
    // Return empty array if function fails - manager might have no tokens assigned yet
    return [];
  }
};
