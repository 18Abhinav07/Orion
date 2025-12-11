// Contract Utility Functions
// Helper functions for contract interactions and data formatting

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG, TOKEN_LIFECYCLE, REQUEST_STATUS } from './contractConfig.js';

// ============ WALLET UTILITIES ============

/**
 * Check if wallet is installed
 */
export function isWalletInstalled() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Get wallet provider
 */
export function getWalletProvider() {
  if (!isWalletInstalled()) {
    throw new Error('No wallet provider found. Please install MetaMask or another Web3 wallet.');
  }
  return window.ethereum;
}

/**
 * Check if connected to correct network
 */
export async function checkNetwork(provider) {
  const network = await provider.getNetwork();
  const expectedChainId = NETWORK_CONFIG.TESTNET.chainId;
  
  if (network.chainId !== BigInt(expectedChainId)) {
    return {
      isCorrect: false,
      currentChainId: Number(network.chainId),
      expectedChainId: expectedChainId,
      networkName: network.name
    };
  }
  
  return { isCorrect: true };
}

/**
 * Switch to Flow Testnet
 */
export async function switchToFlowTestnet() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${NETWORK_CONFIG.TESTNET.chainId.toString(16)}` }],
    });
  } catch (switchError) {
    // Network not added to wallet, add it
    if (switchError.code === 4902) {
      await addFlowTestnetToWallet();
    } else {
      throw switchError;
    }
  }
}

/**
 * Add Flow Testnet to wallet
 */
export async function addFlowTestnetToWallet() {
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${NETWORK_CONFIG.TESTNET.chainId.toString(16)}`,
        chainName: NETWORK_CONFIG.TESTNET.name,
        rpcUrls: [NETWORK_CONFIG.TESTNET.rpcUrl],
        blockExplorerUrls: [NETWORK_CONFIG.TESTNET.blockExplorer],
        nativeCurrency: NETWORK_CONFIG.TESTNET.nativeCurrency
      }],
    });
  } catch (addError) {
    throw addError;
  }
}

// ============ DATA FORMATTING UTILITIES ============

/**
 * Format token amount with proper decimals
 */
export function formatTokenAmount(amount, decimals = 18, precision = 4) {
  try {
    const formatted = ethers.formatUnits(amount, decimals);
    return parseFloat(formatted).toFixed(precision);
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
}

/**
 * Format currency amount (ETH/FLOW)
 */
export function formatCurrency(amount, symbol = 'FLOW', precision = 4) {
  try {
    const formatted = ethers.formatEther(amount);
    return `${parseFloat(formatted).toFixed(precision)} ${symbol}`;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `0 ${symbol}`;
  }
}

/**
 * Parse user input to contract amount
 */
export function parseUserAmount(amount, decimals = 18) {
  try {
    return ethers.parseUnits(amount.toString(), decimals);
  } catch (error) {
    throw new Error(`Invalid amount: ${amount}`);
  }
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp, includeTime = true) {
  try {
    const date = new Date(Number(timestamp) * 1000);
    if (includeTime) {
      return date.toLocaleString();
    }
    return date.toLocaleDateString();
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format address for display
 */
export function formatAddress(address, chars = 4) {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Convert bytes32 to string
 */
export function bytes32ToString(bytes32) {
  return ethers.decodeBytes32String(bytes32);
}

/**
 * Convert string to bytes32
 */
export function stringToBytes32(str) {
  return ethers.encodeBytes32String(str);
}

// ============ STATUS UTILITIES ============

/**
 * Get token lifecycle status info
 */
export function getTokenLifecycleInfo(status) {
  const statuses = {
    [TOKEN_LIFECYCLE.ACTIVE]: {
      name: 'Active',
      color: 'green',
      description: 'Token is active and tradeable',
      icon: '🟢'
    },
    [TOKEN_LIFECYCLE.SETTLED]: {
      name: 'Settled',
      color: 'blue', 
      description: 'Invoice has been settled, tokens will be burned',
      icon: '🔵'
    },
    [TOKEN_LIFECYCLE.BURNED]: {
      name: 'Burned',
      color: 'gray',
      description: 'Tokens have been burned after settlement',
      icon: '⚫'
    }
  };
  
  return statuses[status] || { name: 'Unknown', color: 'gray', description: 'Unknown status', icon: '❓' };
}

/**
 * Get request status info
 */
export function getRequestStatusInfo(status) {
  const statuses = {
    [REQUEST_STATUS.PENDING]: {
      name: 'Pending',
      color: 'yellow',
      description: 'Waiting for admin approval',
      icon: '🟡'
    },
    [REQUEST_STATUS.APPROVED]: {
      name: 'Approved',
      color: 'green',
      description: 'Ready for deployment',
      icon: '✅'
    },
    [REQUEST_STATUS.REJECTED]: {
      name: 'Rejected',
      color: 'red',
      description: 'Request was rejected',
      icon: '❌'
    },
    [REQUEST_STATUS.DEPLOYED]: {
      name: 'Deployed',
      color: 'blue',
      description: 'Token has been deployed',
      icon: '🚀'
    },
    [REQUEST_STATUS.LISTED]: {
      name: 'Listed',
      color: 'purple',
      description: 'Listed on marketplace',
      icon: '🏪'
    },
    [REQUEST_STATUS.SETTLED]: {
      name: 'Settled',
      color: 'gray',
      description: 'Invoice settled and completed',
      icon: '✔️'
    }
  };
  
  return statuses[status] || { name: 'Unknown', color: 'gray', description: 'Unknown status', icon: '❓' };
}

// ============ VALIDATION UTILITIES ============

/**
 * Validate Ethereum address
 */
export function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Validate amount input
 */
export function validateAmount(amount, min = 0, max = null) {
  const num = parseFloat(amount);
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Invalid number format' };
  }
  
  if (num < min) {
    return { isValid: false, error: `Amount must be at least ${min}` };
  }
  
  if (max !== null && num > max) {
    return { isValid: false, error: `Amount cannot exceed ${max}` };
  }
  
  return { isValid: true };
}

/**
 * Validate IPFS URI
 */
export function validateIPFSURI(uri) {
  const ipfsPattern = /^ipfs:\/\/[a-zA-Z0-9]+$/;
  return ipfsPattern.test(uri);
}

/**
 * Validate metadata URI
 */
export function validateMetadataURI(uri) {
  try {
    new URL(uri);
    return true;
  } catch {
    return validateIPFSURI(uri);
  }
}

// ============ CALCULATION UTILITIES ============

/**
 * Calculate platform fee
 */
export function calculatePlatformFee(amount, feePercent = 1) {
  try {
    const amountBN = typeof amount === 'string' ? ethers.parseEther(amount) : amount;
    const fee = (amountBN * BigInt(feePercent)) / BigInt(100);
    return fee;
  } catch (error) {
    console.error('Error calculating platform fee:', error);
    return BigInt(0);
  }
}

/**
 * Calculate total cost including platform fee
 */
export function calculateTotalCost(baseAmount, feePercent = 1) {
  try {
    const base = typeof baseAmount === 'string' ? ethers.parseEther(baseAmount) : baseAmount;
    const fee = calculatePlatformFee(base, feePercent);
    return base + fee;
  } catch (error) {
    console.error('Error calculating total cost:', error);
    return BigInt(0);
  }
}

/**
 * Calculate proportional distribution
 */
export function calculateProportionalDistribution(totalAmount, holderBalance, totalSupply) {
  try {
    const total = typeof totalAmount === 'string' ? ethers.parseEther(totalAmount) : totalAmount;
    const balance = typeof holderBalance === 'string' ? ethers.parseEther(holderBalance) : holderBalance;
    const supply = typeof totalSupply === 'string' ? ethers.parseEther(totalSupply) : totalSupply;
    
    if (supply === BigInt(0)) return BigInt(0);
    
    return (total * balance) / supply;
  } catch (error) {
    console.error('Error calculating proportional distribution:', error);
    return BigInt(0);
  }
}

// ============ ERROR HANDLING UTILITIES ============

/**
 * Parse contract error message
 */
export function parseContractError(error) {
  const errorMessage = error.message || error.toString();
  
  // Common error patterns
  const patterns = {
    'user rejected': 'Transaction was rejected by user',
    'insufficient funds': 'Insufficient balance for this transaction',
    'execution reverted': 'Transaction failed - check requirements',
    'network changed': 'Network was changed during transaction',
    'already an issuer': 'Address is already registered as issuer',
    'already a manager': 'Address is already registered as manager', 
    'not authorized': 'You are not authorized for this action',
    'already settled': 'This invoice has already been settled',
    'token not tradeable': 'This token cannot be traded (settled or burned)',
    'invalid token': 'Invalid token ID or token not found'
  };
  
  for (const [pattern, message] of Object.entries(patterns)) {
    if (errorMessage.toLowerCase().includes(pattern)) {
      return message;
    }
  }
  
  return 'Transaction failed. Please try again.';
}

/**
 * Get transaction error details
 */
export function getTransactionErrorDetails(error) {
  return {
    message: parseContractError(error),
    code: error.code || 'UNKNOWN',
    data: error.data || null,
    originalError: error.message || error.toString()
  };
}

// ============ STORAGE UTILITIES ============

/**
 * Save data to localStorage
 */
export function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Load data from localStorage
 */
export function loadFromLocalStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
}

/**
 * Remove data from localStorage
 */
export function removeFromLocalStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

// ============ URL UTILITIES ============

/**
 * Get transaction URL on block explorer
 */
export function getTransactionURL(txHash, network = 'testnet') {
  const baseURL = network === 'mainnet' 
    ? NETWORK_CONFIG.MAINNET.blockExplorer 
    : NETWORK_CONFIG.TESTNET.blockExplorer;
  return `${baseURL}/tx/${txHash}`;
}

/**
 * Get address URL on block explorer
 */
export function getAddressURL(address, network = 'testnet') {
  const baseURL = network === 'mainnet'
    ? NETWORK_CONFIG.MAINNET.blockExplorer
    : NETWORK_CONFIG.TESTNET.blockExplorer;
  return `${baseURL}/address/${address}`;
}

/**
 * Get contract URL on block explorer
 */
export function getContractURL(contractAddress, network = 'testnet') {
  return getAddressURL(contractAddress, network);
}

// ============ PERFORMANCE UTILITIES ============

/**
 * Debounce function for search inputs
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function for frequent updates
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Retry async function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ============ CONSTANTS ============

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

// Export all utilities
export default {
  // Wallet utilities
  isWalletInstalled,
  getWalletProvider,
  checkNetwork,
  switchToFlowTestnet,
  addFlowTestnetToWallet,
  
  // Data formatting
  formatTokenAmount,
  formatCurrency,
  parseUserAmount,
  formatTimestamp,
  formatAddress,
  bytes32ToString,
  stringToBytes32,
  
  // Status utilities
  getTokenLifecycleInfo,
  getRequestStatusInfo,
  
  // Validation
  isValidAddress,
  validateAmount,
  validateIPFSURI,
  validateMetadataURI,
  
  // Calculations
  calculatePlatformFee,
  calculateTotalCost,
  calculateProportionalDistribution,
  
  // Error handling
  parseContractError,
  getTransactionErrorDetails,
  
  // Storage
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,
  
  // URLs
  getTransactionURL,
  getAddressURL,
  getContractURL,
  
  // Performance
  debounce,
  throttle,
  retryWithBackoff,
  
  // Constants
  ZERO_ADDRESS,
  MAX_UINT256
};