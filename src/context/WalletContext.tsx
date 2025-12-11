import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { NETWORK_CONFIG, ACTIVE_NETWORK } from '../lib/contractAddress';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  network: string | null;
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToRequiredNetwork: () => Promise<boolean>;
  isCorrectNetwork: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const requiredChainId = NETWORK_CONFIG[ACTIVE_NETWORK].chainId;
  const isCorrectNetwork = chainId === requiredChainId;

  const switchToRequiredNetwork = async (): Promise<boolean> => {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found');
      }

      const networkConfig = NETWORK_CONFIG[ACTIVE_NETWORK];
      
      try {
        // Try to switch to the network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${networkConfig.chainId.toString(16)}` }],
        });
        return true;
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${networkConfig.chainId.toString(16)}`,
                chainName: networkConfig.name,
                nativeCurrency: networkConfig.nativeCurrency,
                rpcUrls: [networkConfig.rpcUrl],
                blockExplorerUrls: [networkConfig.blockExplorer]
              }],
            });
            return true;
          } catch (addError) {
            console.error('Failed to add network:', addError);
            return false;
          }
        }
        console.error('Failed to switch network:', switchError);
        return false;
      }
    } catch (error) {
      console.error('Network switch error:', error);
      return false;
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found. Please install MetaMask.');
      }

      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      await web3Provider.send("eth_requestAccounts", []);
      
      const web3Signer = web3Provider.getSigner();
      const walletAddress = await web3Signer.getAddress();
      
      // Get network information
      const networkInfo = await web3Provider.getNetwork();
      setChainId(networkInfo.chainId);
      setNetwork(networkInfo.name);

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAddress(walletAddress);
      setIsConnected(true);

      // Store connection state
      localStorage.setItem('walletConnected', 'true');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setIsConnected(false);
    setNetwork(null);
    setChainId(null);
    localStorage.removeItem('walletConnected');
  };

  // Auto-connect on load if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      const wasConnected = localStorage.getItem('walletConnected');
      if (wasConnected && window.ethereum) {
        try {
          const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
          const accounts = await web3Provider.listAccounts();
          
          if (accounts.length > 0) {
            const web3Signer = web3Provider.getSigner();
            const walletAddress = await web3Signer.getAddress();
            
            // Get network information
            const networkInfo = await web3Provider.getNetwork();
            setChainId(networkInfo.chainId);
            setNetwork(networkInfo.name);

            setProvider(web3Provider);
            setSigner(web3Signer);
            setAddress(walletAddress);
            setIsConnected(true);
          }
        } catch (error) {
          console.error('Auto-connect failed:', error);
          localStorage.removeItem('walletConnected');
        }
      }
    };

    autoConnect();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== address) {
          connectWallet();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [address]);

  const value: WalletContextType = {
    address,
    isConnected,
    provider,
    signer,
    network,
    chainId,
    connectWallet,
    disconnectWallet,
    switchToRequiredNetwork,
    isCorrectNetwork,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
