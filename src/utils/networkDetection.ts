import { toast } from 'sonner';
import { NETWORK_CONFIG, ACTIVE_NETWORK } from '../lib/contractAddress';

export class NetworkDetectionService {
  static async checkAndSwitchNetwork(provider?: any): Promise<boolean> {
    try {
      if (!window.ethereum) {
        toast.error('Please install MetaMask to continue');
        return false;
      }

      const targetNetwork = NETWORK_CONFIG[ACTIVE_NETWORK];
      
      // Get current network
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainIdDecimal = parseInt(currentChainId, 16);

      // Check if already on correct network
      if (currentChainIdDecimal === targetNetwork.chainId) {
        return true;
      }

      // Ask user to switch network
      const confirmed = window.confirm(
        `You need to switch to ${targetNetwork.name} (Chain ID: ${targetNetwork.chainId}) to use ERC-3643 features. Switch now?`
      );

      if (!confirmed) {
        toast.error('Please switch to the correct network to continue');
        return false;
      }

      try {
        // Try to switch to the target network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetNetwork.chainId.toString(16)}` }],
        });
        
        toast.success(`Switched to ${targetNetwork.name}`);
        return true;
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${targetNetwork.chainId.toString(16)}`,
                chainName: targetNetwork.name,
                nativeCurrency: targetNetwork.nativeCurrency,
                rpcUrls: [targetNetwork.rpcUrl],
                blockExplorerUrls: [targetNetwork.blockExplorer]
              }],
            });
            
            toast.success(`Added and switched to ${targetNetwork.name}`);
            return true;
          } catch (addError) {
            console.error('Failed to add network:', addError);
            toast.error('Failed to add network. Please add it manually.');
            return false;
          }
        } else {
          console.error('Failed to switch network:', switchError);
          toast.error('Failed to switch network. Please switch manually.');
          return false;
        }
      }
    } catch (error) {
      console.error('Network detection error:', error);
      toast.error('Network detection failed');
      return false;
    }
  }

  static isCorrectNetwork(chainId?: number): boolean {
    if (!chainId) return false;
    return chainId === NETWORK_CONFIG[ACTIVE_NETWORK].chainId;
  }

  static getCurrentNetworkInfo() {
    return NETWORK_CONFIG[ACTIVE_NETWORK];
  }

  static async getNetworkStatus(): Promise<{
    isConnected: boolean;
    isCorrectNetwork: boolean;
    currentChainId?: number;
    targetChainId: number;
    networkName: string;
  }> {
    try {
      if (!window.ethereum) {
        return {
          isConnected: false,
          isCorrectNetwork: false,
          targetChainId: NETWORK_CONFIG[ACTIVE_NETWORK].chainId,
          networkName: NETWORK_CONFIG[ACTIVE_NETWORK].name
        };
      }

      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainIdDecimal = parseInt(currentChainId, 16);
      const targetChainId = NETWORK_CONFIG[ACTIVE_NETWORK].chainId;

      return {
        isConnected: true,
        isCorrectNetwork: currentChainIdDecimal === targetChainId,
        currentChainId: currentChainIdDecimal,
        targetChainId,
        networkName: NETWORK_CONFIG[ACTIVE_NETWORK].name
      };
    } catch (error) {
      console.error('Failed to get network status:', error);
      return {
        isConnected: false,
        isCorrectNetwork: false,
        targetChainId: NETWORK_CONFIG[ACTIVE_NETWORK].chainId,
        networkName: NETWORK_CONFIG[ACTIVE_NETWORK].name
      };
    }
  }
}

// Helper function to show network warning
export const showNetworkWarning = () => {
  const targetNetwork = NETWORK_CONFIG[ACTIVE_NETWORK];
  toast.error(
    `Please switch to ${targetNetwork.name} (Chain ID: ${targetNetwork.chainId}) to use ERC-3643 features`,
    {
      duration: 5000,
      action: {
        label: 'Switch Network',
        onClick: () => NetworkDetectionService.checkAndSwitchNetwork()
      }
    }
  );
};

export default NetworkDetectionService;