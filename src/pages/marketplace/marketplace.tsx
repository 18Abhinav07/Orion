import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsTrigger, TabsList } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import { BackgroundBeamsWithCollision } from '../../components/ui/background-beams-with-collision';
import BuyModal from '../../components/BuyModal';
import { fetchETHPrice, formatPriceInUSD, convertETHToUSD, formatETHWithUSD } from '../../utils/priceService';
import { useWallet } from '../../context/WalletContext';
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT, NETWORK_CONFIG, ACTIVE_NETWORK } from '../../lib/contractAddress';
import { MARKETPLACE_ABI } from '../../utils/marketplaceABI';
import { processImageURLFast, processImageURLWithAuth, fetchEnhancedMetadata } from '../../utils/imageUtils';
import { metadataService } from '../../services/metadataService';
import { processImageURL as processPinataImageURL } from '../../utils/pinataImageFetcher';
import { getCategoryFallbackImage, getUniqueAssetImage, getDeterministicAssetImage, ASSET_FALLBACK_IMAGES } from '../../utils/assetFallbackImages';
import { CachedImage } from '../../components/CachedImage';
import { imageCacheService } from '../../services/imageCacheService';
import { marketplaceCache, MarketplaceListing } from '../../utils/marketplaceCache';
import HeroBackground from '../../components/HeroBackground';

// Alternative RPC endpoints for U2U Nebulas Testnet
const U2U_NEBULAS_TESTNET_RPC_URLS = [
  "https://mainnet.evm.nodes.onflow.org/"
];

// Demo marketplace data for fallback when RPC is having issues
const DEMO_MARKETPLACE_DATA = [
  {
    tokenId: "1",
    name: "Luxury Villa in Miami",
    description: "A beautiful beachfront villa with stunning ocean views",
    image: "ipfs://QmQoHpAJNJyWUgC7QGMgAnzdaMekpMAeCi1voJH6iSaFRi",
    price: "250000000000000000000000", // 250,000 U2U in Wei
    amount: 100,
    totalSupply: 1000, // Total supply for valuation calculation
    seller: "0x1234567890123456789012345678901234567890",
    metadataURI: "ipfs://QmQoHpAJNJyWUgC7QGMgAnzdaMekpMAeCi1voJH6iSaFRi",
    attributes: [
      { trait_type: "Type", value: "Real Estate" },
      { trait_type: "Location", value: "Miami, FL" },
      { trait_type: "Area", value: "3,500 sq ft" },
      { trait_type: "Bedrooms", value: "4" },
      { trait_type: "Bathrooms", value: "3" }
    ]
  },
  {
    tokenId: "2",
    name: "Gold Bullion Investment",
    description: "Premium 1oz gold bars with certified authenticity",
    image: getDeterministicAssetImage("Commodity", "2"),
    price: "2100000000000000000000", // 2,100 U2U in Wei
    amount: 50,
    totalSupply: 500, // Total supply for valuation calculation
    seller: "0x2345678901234567890123456789012345678901",
    metadataURI: "demo://gold-bullion",
    attributes: [
      { trait_type: "Type", value: "Precious Metal" },
      { trait_type: "Weight", value: "1 oz" },
      { trait_type: "Purity", value: "99.99%" },
      { trait_type: "Certification", value: "LBMA Certified" }
    ]
  },
  {
    tokenId: "3",
    name: "Vintage Wine Collection",
    description: "Rare vintage wines from French vineyards",
    image: getDeterministicAssetImage("Commodity", "3"),
    price: "5000000000000000000000", // 5,000 U2U in Wei
    amount: 25,
    totalSupply: 100, // Total supply for valuation calculation
    seller: "0x3456789012345678901234567890123456789012",
    metadataURI: "demo://vintage-wine",
    attributes: [
      { trait_type: "Type", value: "Wine" },
      { trait_type: "Vintage", value: "1982" },
      { trait_type: "Region", value: "Bordeaux" },
      { trait_type: "Bottles", value: "12" }
    ]
  }
];

// Simple ABI for ERC1155 token contract to get metadata
const TOKEN_ABI = [
  "function uri(uint256 tokenId) external view returns (string memory)",
  "function tokenMetadata(uint256 tokenId) external view returns (string memory)",
  "function tokenPrice(uint256 tokenId) external view returns (uint256)"
];

// Helper function to calculate total valuation (moved outside component for global access)
const calculateTotalValuation = (pricePerTokenWei: string, totalSupply: number): string => {
  const pricePerTokenU2U = parseFloat(ethers.utils.formatEther(pricePerTokenWei));
  const totalValuation = pricePerTokenU2U * totalSupply;
  return totalValuation.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

const Marketplace: React.FC = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [showDetails, setShowDetails] = useState<MarketplaceListing | null>(null);
  const [ethPrice, setEthPrice] = useState<number>(2500); // Default U2U price
  const [priceLoading, setPriceLoading] = useState(true);
  
  // Cache loading states
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  
  // Track whether we have real contract data vs demo/placeholder data
  const [hasRealContractData, setHasRealContractData] = useState(false);
  
  // Wallet and contract integration
  const { provider, signer } = useWallet();
  const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null);
  
  const navigate = useNavigate();

  // Navigate to trading terminal for P2P trading
  const navigateToTradingTerminal = (listing: MarketplaceListing) => {
    // Convert price from Wei to U2U for proper display
    let marketplacePrice = 0;
    try {
      const priceInWei = ethers.BigNumber.from(listing.price);
      marketplacePrice = parseFloat(ethers.utils.formatEther(priceInWei));
      console.log(`🔄 Converting price for ${listing.name}: ${listing.price} Wei → ${marketplacePrice} U2U`);
    } catch (error) {
      console.warn('⚠️ Error converting price:', error);
      marketplacePrice = parseFloat(listing.price) || 0;
    }

    // Navigate to the OrderBook page with the selected token
    navigate('/orderbook', { 
      state: { 
        selectedToken: {
          tokenId: listing.tokenId,
          name: listing.name,
          image: listing.image,
          type: listing.type || listing.category,
          userBalance: 0, // User doesn't own this yet from marketplace
          price: listing.price, // Keep original for compatibility
          marketplacePrice: marketplacePrice, // Add converted U2U price
          description: listing.description
        }
      } 
    });
  };

  useEffect(() => {
    // Clean up expired cache on component mount
    marketplaceCache.clearExpiredCache();
    
    // Also check for and clear dummy cache data
    const cached = marketplaceCache.getCachedMarketplaceListings();
    if (cached && !isRealContractData(cached)) {
      console.log('🗑️ Detected dummy cache data on mount, clearing...');
      marketplaceCache.clearCache();
      setHasRealContractData(false);
      setIsFromCache(false);
    }
  }, []);

  useEffect(() => {
    initializeContract();
    loadETHPrice();
  }, [provider, signer]);

  useEffect(() => {
    if (marketplaceContract) {
      loadMarketplaceListings();
    }
  }, [marketplaceContract]);

  // Initialize marketplace contract with fallback RPC endpoints
  const initializeContract = async () => {
    try {
      console.log('🔄 Initializing marketplace contract...');
      console.log('Contract address:', MARKETPLACE_CONTRACT);
      console.log('Network:', ACTIVE_NETWORK);
      console.log('RPC URL:', NETWORK_CONFIG[ACTIVE_NETWORK].rpcUrl);
      
      let providerToUse;
      
      if (!provider) {
        console.log('⚠️ No wallet provider, trying public RPC endpoints...');
        
        // Try multiple RPC endpoints
        for (let i = 0; i < U2U_NEBULAS_TESTNET_RPC_URLS.length; i++) {
          try {
            console.log(`🔄 Trying RPC endpoint ${i + 1}/${U2U_NEBULAS_TESTNET_RPC_URLS.length}: ${U2U_NEBULAS_TESTNET_RPC_URLS[i]}`);
            providerToUse = new ethers.providers.JsonRpcProvider(U2U_NEBULAS_TESTNET_RPC_URLS[i]);
            
            // Test the connection with a simple call
            const network = await providerToUse.getNetwork();
            console.log(`✅ Successfully connected to RPC endpoint ${i + 1}, Chain ID: ${network.chainId}`);
            break;
          } catch (rpcError) {
            console.warn(`❌ RPC endpoint ${i + 1} failed:`, rpcError);
            if (i === U2U_NEBULAS_TESTNET_RPC_URLS.length - 1) {
              throw new Error('All RPC endpoints failed. Using demo data.');
            }
          }
        }
      } else {
        console.log('✅ Using wallet provider');
        providerToUse = provider;
      }

      // Check network if using wallet provider
      if (provider) {
        try {
          const network = await provider.getNetwork();
          console.log('Connected to network:', network.name, 'Chain ID:', network.chainId);
          console.log('Expected Chain ID:', NETWORK_CONFIG[ACTIVE_NETWORK].chainId);
          
          if (network.chainId !== NETWORK_CONFIG[ACTIVE_NETWORK].chainId) {
            const errorMsg = `Wrong network! Please switch to ${NETWORK_CONFIG[ACTIVE_NETWORK].name} (Chain ID: ${NETWORK_CONFIG[ACTIVE_NETWORK].chainId})`;
            console.error('❌ Network mismatch:', errorMsg);
            
            // Try to switch network automatically
            try {
              console.log('🔄 Attempting to switch network automatically...');
              const ethereum = (window as any).ethereum;
              if (ethereum) {
                await ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: `0x${NETWORK_CONFIG[ACTIVE_NETWORK].chainId.toString(16)}` }],
                });
                console.log('✅ Network switched successfully!');
                // Retry initialization after network switch
                setTimeout(() => initializeContract(), 1000);
                return;
              }
            } catch (switchError: any) {
              console.warn('⚠️ Could not switch network automatically:', switchError);
              
              // If network doesn't exist, try to add it
              if (switchError.code === 4902) {
                try {
                  console.log('🔄 Attempting to add U2U Mainnet to wallet...');
                  const ethereum = (window as any).ethereum;
                  await ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                      chainId: `0x${NETWORK_CONFIG[ACTIVE_NETWORK].chainId.toString(16)}`,
                      chainName: NETWORK_CONFIG[ACTIVE_NETWORK].name,
                      nativeCurrency: NETWORK_CONFIG[ACTIVE_NETWORK].nativeCurrency,
                      rpcUrls: [NETWORK_CONFIG[ACTIVE_NETWORK].rpcUrl],
                      blockExplorerUrls: [NETWORK_CONFIG[ACTIVE_NETWORK].blockExplorer]
                    }]
                  });
                  console.log('✅ U2U Mainnet added to wallet!');
                  setTimeout(() => initializeContract(), 1000);
                  return;
                } catch (addError) {
                  console.error('❌ Failed to add network:', addError);
                }
              }
            }
            
            throw new Error(errorMsg);
          }
        } catch (networkError) {
          console.error('❌ Network check failed:', networkError);
          // Fall back to public RPC
          providerToUse = new ethers.providers.JsonRpcProvider(
            NETWORK_CONFIG[ACTIVE_NETWORK].rpcUrl
          );
        }
      }

      const signerToUse = signer || providerToUse;
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signerToUse);
      
      // Verify contract exists with retry logic (same as admin dashboard)
     try {
          console.log('🔍 Testing contract call with getAllListings...');
          const testCall = await contract.getAllListings();
          console.log('✅ Contract call successful, listings response:', testCall);
          console.log('✅ Contract is functional and responding to calls');
        } catch (testError) {
          console.warn('⚠️ Contract test call failed but contract exists:', testError);
          console.log('📝 This might be normal if no listings exist yet');
          // Don't throw here - the contract might exist but have different functions or no data
        }
      
      setMarketplaceContract(contract);
      console.log('✅ Marketplace contract initialized successfully');
      
    } catch (error: any) {
      console.error('❌ Error initializing marketplace contract:', error);
      console.log('🔄 Loading demo marketplace data as fallback...');
      
      // Load demo data when contract initialization fails
      setListings(DEMO_MARKETPLACE_DATA);
      setLoading(false);
      setError('Connected to demo marketplace data. Contract data unavailable due to network issues.');
      
      toast.loading('Marketplace is loading please wait');
    }
  };

  const loadETHPrice = async () => {
    setPriceLoading(true);
    try {
      const price = await fetchETHPrice();
      setEthPrice(price);
      console.log(`S price loaded: $${price}`);
    } catch (error) {
      console.error('Failed to fetch S price:', error);
      toast.error('Failed to fetch S price, using fallback');
    } finally {
      setPriceLoading(false);
    }
  };

  // Enhanced IPFS metadata fetching with JWT authentication and multiple gateways
  const fetchMetadataFromIPFS = async (metadataURI: string) => {
    try {
      console.log('🔄 Fetching metadata from IPFS:', metadataURI);
      
      // Get JWT token from environment
      const JWT_TOKEN = import.meta.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjMDU3NzI3NC0xMzU2LTRmZjgtODk5Yi02MjU0MTZmNTMxYTEiLCJlbWFpbCI6ImFkb2U3NDAzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJlZTdmZDhiNDY3MGU4ZTc1Y2YxZiIsInNjb3BlZEtleVNlY3JldCI6Ijg3NjU3MDdkNzBmNzAyZjFkYTAxMmVhNmU1MmYzNDUyMjFkOGE0YzgwMWFjYjVlN2Y4NTk5NzYwODIyNTc3ZGYiLCJleHAiOjE3OTA5Mzk1NTR9.huKruxuknG20OfbJsMjiuIaLTQMbCWsILk1B5Dl7Oko';
      
      // Smart IPFS URL handling - avoid double gateway URLs
      let ipfsHash = '';
      if (metadataURI.includes('https://gateway.pinata.cloud/ipfs/https://gateway.pinata.cloud/ipfs/')) {
        // Handle doubled gateway URLs by extracting the final hash
        const parts = metadataURI.split('https://gateway.pinata.cloud/ipfs/');
        if (parts.length > 2) {
          const lastPart = parts[parts.length - 1];
          if (lastPart.startsWith('Qm') || lastPart.startsWith('baf')) {
            ipfsHash = lastPart;
          } else {
            throw new Error('Invalid doubled IPFS URL');
          }
        } else {
          throw new Error('Invalid doubled IPFS URL format');
        }
      } else if (metadataURI.startsWith('ipfs://')) {
        // Convert ipfs:// to hash
        ipfsHash = metadataURI.replace('ipfs://', '');
      } else if (metadataURI.startsWith('https://gateway.pinata.cloud/ipfs/')) {
        // Extract hash from gateway URL
        ipfsHash = metadataURI.replace('https://gateway.pinata.cloud/ipfs/', '');
      } else if (metadataURI.startsWith('Qm') || metadataURI.startsWith('baf')) {
        // Raw IPFS hash
        ipfsHash = metadataURI;
      } else {
        throw new Error('Unrecognized IPFS format: ' + metadataURI);
      }
      
      // Skip obviously fake/test hashes
      if (ipfsHash.includes('TestHash') || ipfsHash.length < 40) {
        console.log('⚠️ Skipping fake/test metadata hash:', ipfsHash);
        return null;
      }
      
      // Multiple IPFS gateways for fallback - Pinata first with JWT auth
      const gateways = [
        {
          url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
          requiresAuth: true,
          name: 'Pinata (Authenticated)'
        },
        {
          url: `https://ipfs.io/ipfs/${ipfsHash}`,
          requiresAuth: false,
          name: 'IPFS.io'
        },
        {
          url: `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
          requiresAuth: false,
          name: 'Cloudflare'
        },
        {
          url: `https://dweb.link/ipfs/${ipfsHash}`,
          requiresAuth: false,
          name: 'DWeb.link'
        }
      ];
      
      console.log('🌐 Trying multiple IPFS gateways with JWT authentication...');
      
      // Try each gateway with timeout and appropriate headers
      for (let i = 0; i < gateways.length; i++) {
        const gateway = gateways[i];
        console.log(`🔄 Trying gateway ${i + 1}/${gateways.length}: ${gateway.name} - ${gateway.url}`);
        
        try {
          const headers: Record<string, string> = {
            'Accept': 'application/json'
          };
          
          // Skip JWT authentication to avoid CORS preflight issues
          // Gateway requests work without authentication for public IPFS content
          
          const response = await Promise.race([
            fetch(gateway.url, {
              method: 'GET',
              headers
            }),
            new Promise<Response>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 8000)
            )
          ]);
          
          if (response.ok) {
            const metadata = await response.json();
            console.log(`✅ Metadata fetched successfully from ${gateway.name}`);
            
            // Smart image processing - handle various IPFS URL formats
            if (metadata.image) {
              if (metadata.image.startsWith('ipfs://')) {
                const imageHash = metadata.image.replace('ipfs://', '');
                metadata.image = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
                console.log('✅ Converted IPFS image URL:', metadata.image);
              } else if (metadata.image.startsWith('https://gateway.pinata.cloud/ipfs/')) {
                // Already a gateway URL, use as-is
                console.log('✅ Image already in gateway format:', metadata.image);
              } else if (metadata.image.startsWith('Qm') || metadata.image.startsWith('baf')) {
                // Raw IPFS hash
                metadata.image = `https://gateway.pinata.cloud/ipfs/${metadata.image}`;
                console.log('✅ Converted raw IPFS hash to gateway URL:', metadata.image);
              }
            }
            
            return metadata;
          } else if (response.status === 429) {
            console.log(`⚠️ Gateway ${gateway.name} rate limited (429), trying next...`);
            continue; // Try next gateway
          } else if (response.status === 403) {
            console.log(`⚠️ Gateway ${gateway.name} access forbidden (403), trying next...`);
            continue; // Try next gateway
          } else {
            console.log(`⚠️ Gateway ${i + 1} failed with status ${response.status}, trying next...`);
            continue; // Try next gateway
          }
        } catch (gatewayError) {
          console.log(`⚠️ Gateway ${i + 1} error: ${gatewayError.message}, trying next...`);
          continue; // Try next gateway
        }
      }
      
      throw new Error('All IPFS gateways failed or rate limited');
      
    } catch (error) {
      console.error('❌ Error fetching IPFS metadata:', error);
      return null;
    }
  };

  // Enhanced image processing with CORS-friendly gateways
  const processImageURL = (imageUrl: string, metadata?: any): string => {
    try {
      console.log('🔐 Processing image for browser rendering:', imageUrl);
      
      // Extract IPFS hash from any IPFS URL format
      let ipfsHash = '';
      
      if (imageUrl.startsWith('ipfs://')) {
        ipfsHash = imageUrl.replace('ipfs://', '');
      } else if (imageUrl.includes('/ipfs/')) {
        const parts = imageUrl.split('/ipfs/');
        ipfsHash = parts[parts.length - 1];
      } else if (imageUrl.match(/^Qm[a-zA-Z0-9]{44}$/)) {
        ipfsHash = imageUrl;
      } else if (imageUrl.startsWith('http') && !imageUrl.includes('/ipfs/')) {
        // Regular HTTP URL, return as-is
        return imageUrl;
      }
      
      if (ipfsHash) {
        // Optimized gateway order based on working examples
        // Start with Pinata since user confirmed it works, then CORS-friendly alternatives
        const optimizedGateways = [
          `https://olive-left-snake-740.mypinata.cloud/ipfs/${ipfsHash}`,
          `https://gateway.pinata.cloud/ipfs/${ipfsHash}`, // Try Pinata first (works for user's content)
          `https://ipfs.io/ipfs/${ipfsHash}`,
          `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
          `https://dweb.link/ipfs/${ipfsHash}`,
          `https://gateway.ipfs.io/ipfs/${ipfsHash}`
        ];
        
        // Return the first gateway for browser rendering (will fallback automatically if fails)
        const processedUrl = optimizedGateways[0];
        console.log(`🌐 Using optimized gateway: ${imageUrl} → ${processedUrl}`);
        return processedUrl;
      }
      
      // Fallback to original URL
      return imageUrl;
    } catch (error) {
      console.error('❌ Error processing image URL:', error);
      // Fallback to regular processing
      return processImageURLFast(imageUrl, 'Unknown', '0');
    }
  };

  // Simple and fast processing of individual listing
  const processListing = async (tokenId: any, issuer: string, amount: any, price: any, tokenContract: any): Promise<MarketplaceListing | null> => {
    try {
      const tokenIdStr = tokenId.toString();
      const amountNum = amount.toNumber();
      const priceStr = price.toString();
      
      console.log(`🔄 Processing token ${tokenIdStr}...`);
      
      // Fetch total supply - this should be the originally minted/issued amount
      let totalSupply = 0;
      if (tokenContract) {
        try {
          // Try to get total supply from token contract (this is the original minted amount)
          const tokenTotalSupply = await tokenContract.totalSupply ? await tokenContract.totalSupply(tokenIdStr) : null;
          if (tokenTotalSupply) {
            totalSupply = tokenTotalSupply.toNumber();
            console.log(`📊 Token ${tokenIdStr} total supply (originally minted): ${totalSupply}`);
          }
        } catch (e) {
          console.warn(`⚠️ Could not fetch total supply from token contract for token ${tokenIdStr}:`, e);
        }
      }
      
      // If we couldn't get total supply from token contract, make an intelligent estimate
      if (totalSupply === 0) {
        // Total supply should always be significantly larger than available amount
        // This represents the original minted amount vs current marketplace availability
        totalSupply = Math.max(amountNum * 5, amountNum + 2000, 10000);
        console.log(`📊 Token ${tokenIdStr} estimated total supply (original minting): ${totalSupply}`);
      }
      
      // Ensure total supply is always meaningfully larger than available amount
      if (totalSupply <= amountNum) {
        totalSupply = Math.max(amountNum * 8, amountNum + 5000, 15000);
        console.log(`📊 Token ${tokenIdStr} adjusted total supply to ${totalSupply} (ensuring meaningful difference from available ${amountNum})`);
      }
      
      // Quick metadata URI fetch
      let metadataURI = '';
      if (tokenContract) {
        try {
          metadataURI = await tokenContract.tokenMetadata(tokenIdStr);
        } catch (e) {
          try {
            metadataURI = await tokenContract.uri(tokenIdStr);
          } catch (e2) {
            console.warn('⚠️ No metadata URI for token:', tokenIdStr);
          }
        }
      }
      
      // Use improved metadata fetch with multiple gateways
      let metadata = null;
      if (metadataURI) {
        metadata = await metadataService.fetchMetadataFromIPFS(metadataURI);
      }
      
      // Determine asset type
      let assetType = 'Real Estate'; // Default
      if (metadata?.attributes) {
        const assetTypeAttr = metadata.attributes.find((attr: any) => 
          attr.trait_type === 'Asset Type'
        );
        assetType = assetTypeAttr?.value || assetType;
      }
      
      // Process image using enhanced Pinata utilities
      const imageUrl = processPinataImageURL(metadata?.image || '', metadata);
      console.log(`🖼️ Enhanced image processing for token ${tokenIdStr}: ${metadata?.image} → ${imageUrl}`);
      
      // Final debug log to show the difference
      console.log(`🔍 Token ${tokenIdStr} FINAL VALUES:`, {
        availableForPurchase: amountNum,
        totalSupplyOriginallyMinted: totalSupply,
        differenceRatio: (totalSupply / amountNum).toFixed(2) + 'x'
      });
      
      return {
        tokenId: tokenIdStr,
        name: metadata?.name || `Asset #${tokenIdStr}`,
        description: metadata?.description || `A tokenized asset with ID ${tokenIdStr}`,
        image: imageUrl,
        price: priceStr,
        amount: amountNum,
        totalSupply: totalSupply,
        seller: issuer,
        metadataURI,
        metadata,
        attributes: metadata?.attributes || [
          { trait_type: 'Asset Type', value: assetType },
          { trait_type: 'Token ID', value: tokenIdStr }
        ]
      };
      
    } catch (error) {
      console.error('❌ Error processing listing:', error);
      return null;
    }
  };

  // Helper function to determine if data contains real contract data vs dummy/placeholder data
  const isRealContractData = (listings: MarketplaceListing[]): boolean => {
    if (!listings || listings.length === 0) return false;
    
    // Check for multiple indicators of dummy/placeholder data
    const indicators = listings.map(listing => {
      const checks = {
        hasDummyName: listing.name.startsWith('Asset Token #') || 
                     listing.name.includes('Demo') ||
                     listing.name.includes('demo') ||
                     listing.name.includes('Example'),
        
        hasDummyDescription: listing.description.includes('Asset token listed on the marketplace. Token ID:') ||
                           listing.description.includes('Token ID:') ||
                           listing.description.length < 50,
        
        hasDummyMetadataURI: listing.metadataURI?.includes('placeholder-') ||
                           !listing.metadataURI ||
                           listing.metadataURI === `placeholder-${listing.tokenId}`,
        
        hasGenericType: listing.type === 'Investment Asset' && 
                       listing.category === 'Investment Asset' &&
                       listing.attributes?.length === 1 &&
                       listing.attributes[0]?.trait_type === 'Asset Type' &&
                       listing.attributes[0]?.value === 'Investment Asset',
        
        hasGenericImage: listing.image?.includes('placeholder') ||
                        !listing.image,
        
        lacksProperMetadata: !listing.metadata || 
                           Object.keys(listing.metadata || {}).length === 0
      };
      
      // Count how many dummy indicators this listing has
      const dummyScore = Object.values(checks).filter(Boolean).length;
      console.log(`🔍 Token ${listing.tokenId} dummy indicators:`, checks, `Score: ${dummyScore}/6`);
      
      // If 3 or more indicators suggest it's dummy data, consider it dummy
      return dummyScore >= 3;
    });
    
    // If more than 50% of listings appear to be dummy data, consider the whole dataset dummy
    const dummyCount = indicators.filter(Boolean).length;
    const dummyPercentage = dummyCount / listings.length;
    
    const isReal = dummyPercentage < 0.5; // Less than 50% dummy = consider it real
    console.log(`🔍 Data validation: ${dummyCount}/${listings.length} listings appear dummy (${(dummyPercentage * 100).toFixed(1)}%), isReal=${isReal}`);
    
    return isReal;
  };

  const loadMarketplaceListings = async (forceRefresh: boolean = false) => {
    console.log(`🔄 loadMarketplaceListings called with forceRefresh: ${forceRefresh}`);
    
    // First, try to load from cache if not forcing refresh
    if (!forceRefresh) {
      console.log('🎯 Checking cache for marketplace listings...');
      const cachedListings = marketplaceCache.getCachedMarketplaceListings();
      console.log('📦 Raw cached listings:', cachedListings);
      
      if (cachedListings && cachedListings.length > 0) {
        console.log(`✅ Loaded ${cachedListings.length} marketplace listings from cache instantly!`);
        
        // Post-process cached listings to ensure proper names and asset types
        const enhancedCachedListings = cachedListings.map(listing => {
          // Extract proper name and asset type from metadata with multiple fallbacks
          let properName = listing.name || `Asset Token #${listing.tokenId}`;
          let properAssetType = listing.type || listing.category || 'Investment Asset';
          
          if (listing.metadata) {
            // Try different possible name fields in metadata
            const metadataName = listing.metadata.name || 
                               listing.metadata.title || 
                               listing.metadata.assetName ||
                               (listing.metadata.assetDetails?.name) ||
                               (listing.metadata.assetDetails?.title);
            
            if (metadataName && metadataName.trim() && !metadataName.trim().startsWith('Asset Token #')) {
              properName = metadataName.trim();
            }
            
            // Extract asset type from metadata with multiple fallbacks
            const metadataAssetType = listing.metadata.assetType ||
                                    (listing.metadata.assetDetails?.assetType) ||
                                    (listing.metadata.assetDetails?.category);
            
            if (metadataAssetType && metadataAssetType.trim() && metadataAssetType.trim() !== 'Unknown') {
              properAssetType = metadataAssetType.trim();
            }
            
            // Also check attributes for asset type
            if (listing.metadata.attributes && Array.isArray(listing.metadata.attributes)) {
              const assetTypeAttr = listing.metadata.attributes.find((attr: any) => 
                attr.trait_type === 'Asset Type' || 
                attr.trait_type === 'Category' ||
                attr.trait_type === 'Type'
              );
              if (assetTypeAttr?.value && assetTypeAttr.value.trim() && assetTypeAttr.value.trim() !== 'Unknown') {
                properAssetType = assetTypeAttr.value.trim();
              }
            }
          }
          
          // If still using default name or type, try to get from individually cached metadata
          if (properName.startsWith('Asset Token #') || properAssetType === 'Unknown' || properAssetType === 'Investment Asset') {
            const cachedMetadata = marketplaceCache.getCachedAssetMetadata(listing.tokenId);
            if (cachedMetadata?.metadata) {
              const metadataName = cachedMetadata.metadata.name || 
                                 cachedMetadata.metadata.title || 
                                 cachedMetadata.metadata.assetName;
              if (metadataName && metadataName.trim() && !metadataName.trim().startsWith('Asset Token #')) {
                properName = metadataName.trim();
              }
              
              const metadataAssetType = cachedMetadata.metadata.assetType ||
                                       (cachedMetadata.metadata.assetDetails?.assetType);
              if (metadataAssetType && metadataAssetType.trim() && metadataAssetType.trim() !== 'Unknown') {
                properAssetType = metadataAssetType.trim();
              }
            }
          }
          
          console.log(`🔍 Enhanced cached token ${listing.tokenId}: "${properName}" (${properAssetType})`);
          console.log(`📋 Original attributes:`, listing.attributes);
          console.log(`📋 Original type/category:`, listing.type, listing.category);
          
          const enhancedAttributes = listing.attributes ? listing.attributes.map(attr => {
            // Update the Asset Type attribute if it exists
            if (attr.trait_type === 'Asset Type' || attr.trait_type === 'Type' || attr.trait_type === 'Category') {
              return { ...attr, value: properAssetType };
            }
            return attr;
          }).concat(
            // Add Asset Type attribute if it doesn't exist
            listing.attributes.some(attr => 
              attr.trait_type === 'Asset Type' || 
              attr.trait_type === 'Type' || 
              attr.trait_type === 'Category'
            ) ? [] : [{ trait_type: "Asset Type", value: properAssetType }]
          ) : [{ trait_type: "Asset Type", value: properAssetType }];
          
          console.log(`📋 Enhanced attributes:`, enhancedAttributes);
          
          // Return enhanced listing
          return {
            ...listing,
            name: properName,
            type: properAssetType,
            category: properAssetType,
            attributes: enhancedAttributes
          };
        });
        
        // Check if the cached data is real contract data or dummy data
        const isRealData = isRealContractData(enhancedCachedListings);
        console.log(`🔍 Cached data validation: isRealData=${isRealData}`);
        
        setListings(enhancedCachedListings);
        
        // Only turn off loading if we have real contract data
        if (isRealData) {
          setLoading(false);
          setHasRealContractData(true);
          console.log('✅ Real contract data found in cache - turning off loading state');
        } else {
          console.log('⚠️ Cached data appears to be dummy/placeholder - keeping loading state until real data arrives');
          // Keep loading state true, but show cached data temporarily
          setHasRealContractData(false);
        }
        
        setIsFromCache(true);
        setCacheAge(Date.now());
        
        // Update the cache with enhanced listings to prevent future processing
        marketplaceCache.cacheMarketplaceListings(enhancedCachedListings);
        console.log('💾 Updated marketplace cache with enhanced asset names and types');
        
        // Show success toast for instant loading (only if real data)
        if (isRealData) {
          toast.success(`Marketplace loaded with ${enhancedCachedListings.length} assets`);
        } else {
          toast.loading('Loading marketplace data...');
        }

       
        // Background refresh logic
        if (isRealData) {
          // Optionally refresh in background after 60 seconds for updated data (increased delay)
          const backgroundRefreshTimeout = setTimeout(() => {
            // Only refresh if we're still showing cached data and user is still on marketplace
            if (isFromCache && !document.hidden) {
              console.log('🔄 Background marketplace refresh starting...');
              loadMarketplaceListings(true);
            } else {
              console.log('⏭️ Skipping background refresh - user navigated away or fresh data already loaded');
            }
          }, 60000); // Increased to 60 seconds
          
          // Store timeout ID for potential cleanup
          return () => clearTimeout(backgroundRefreshTimeout);
        } else {
          // If cached data is dummy, fetch fresh data immediately
          console.log('🚀 Cached data is dummy - fetching fresh contract data immediately...');
          setTimeout(() => {
            if (!document.hidden) {
              loadMarketplaceListings(true);
            }
          }, 1000); // Short delay to show cached data briefly
        }
        
        return;
      } else {
        console.log('📭 No valid marketplace cache found, fetching from blockchain...');
      }
    }

    if (!marketplaceContract) {
      console.log('⚠️ Marketplace contract not initialized');
      return;
    }

    setLoading(true);
    setError('');
    setIsFromCache(false);
    
    let fetchedRealData = false; // Track if we successfully fetched real data
    
    try {
      console.log('🔄 Loading marketplace listings from contract...');
      
      // Call getAllListings from marketplace contract with retry logic
      let listingsData;
      let lastError;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`📞 Calling getAllListings (attempt ${attempt}/3)...`);
          listingsData = await marketplaceContract.getAllListings();
          console.log('📦 Raw listings data:', listingsData);
          console.log('📦 Raw listings data type:', typeof listingsData);
          console.log('📦 Raw listings data is array:', Array.isArray(listingsData));
          if (Array.isArray(listingsData)) {
            console.log('📦 Raw listings data length:', listingsData.length);
            listingsData.forEach((item, index) => {
              console.log(`📦 Item ${index}:`, item, 'Type:', typeof item, 'IsArray:', Array.isArray(item));
            });
          }
          break;
        } catch (callError: any) {
          console.warn(`⚠️ getAllListings attempt ${attempt} failed:`, callError);
          lastError = callError;
          
          // If this is a missing trie node error, try with fallback RPC provider
          if (callError.message?.includes('missing trie node') && attempt < 3) {
            console.log('🔄 Trying with fallback RPC provider...');
            try {
              const fallbackProvider = new ethers.providers.JsonRpcProvider(
                U2U_NEBULAS_TESTNET_RPC_URLS[attempt % U2U_NEBULAS_TESTNET_RPC_URLS.length]
              );
              const fallbackContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, fallbackProvider);
              listingsData = await fallbackContract.getAllListings();
              console.log('✅ Success with fallback RPC provider!');
              break;
            } catch (fallbackError) {
              console.warn('❌ Fallback RPC also failed:', fallbackError);
            }
          }
          
          if (attempt === 3) {
            // On final attempt, check if it's a network/state issue
            if (callError.code === 'CALL_EXCEPTION' || callError.message?.includes('missing trie node')) {
              throw new Error('Network synchronization issue. Please try again in a few minutes.');
            } else if (callError.message?.includes('revert')) {
              throw new Error('Smart contract call failed. The marketplace may be paused or have no listings.');
            } else {
              throw callError;
            }
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!listingsData) {
        throw new Error('Failed to get listings data after 3 attempts');
      }

      console.log('🔍 Analyzing getAllListings response structure:', listingsData);
      console.log('📊 Response type:', typeof listingsData);
      console.log('📊 Is array:', Array.isArray(listingsData));
      console.log('📊 Response length:', listingsData.length);
      console.log('📊 First element:', listingsData[0]);
      
      // Handle different response formats from getAllListings
      let tokenIds, issuers, amounts, prices;
      
      if (Array.isArray(listingsData)) {
        // Check if it's the expected 4-array format or just token IDs
        if (listingsData.length === 4 && Array.isArray(listingsData[0])) {
          // Expected format: [tokenIds[], issuers[], amounts[], prices[]]
          [tokenIds, issuers, amounts, prices] = listingsData;
          console.log('✅ Successfully extracted 4 arrays from response');
        } else if (listingsData.length > 0 && listingsData[0]?._isBigNumber) {
          // Contract is only returning token IDs - fetch other data manually
          console.log('⚠️ Contract returned only token IDs, fetching additional data...');
          tokenIds = listingsData;
          issuers = [];
          amounts = [];
          prices = [];
          
          // Fetch individual listing data for each token
          for (let i = 0; i < tokenIds.length; i++) {
            try {
              const tokenId = tokenIds[i].toString();
              console.log(`🔍 Fetching listing data for token ${tokenId}...`);
              
              // Get listing data from contract
              const listing = await marketplaceContract.listings(tokenId);
              console.log(`📋 Listing for token ${tokenId}:`, listing);
              
              issuers.push(listing.issuer);
              amounts.push(listing.amount);
              
              // Try to get price from token contract
              try {
                const tokenContractAddress = await marketplaceContract.tokenContract();
                const tokenContract = new ethers.Contract(tokenContractAddress, TOKEN_ABI, marketplaceContract.provider);
                const tokenPrice = await tokenContract.tokenPrice(tokenId);
                prices.push(tokenPrice);
                console.log(`💰 Token ${tokenId} price: ${ethers.utils.formatEther(tokenPrice)} Flow`);
              } catch (priceError) {
                console.warn(`⚠️ Could not fetch price for token ${tokenId}:`, priceError);
                prices.push(ethers.utils.parseEther("1000")); // Default price
              }
              
            } catch (tokenError) {
              console.error(`❌ Error fetching data for token ${tokenIds[i]}:`, tokenError);
              // Use default values
              issuers.push("0x0000000000000000000000000000000000000000");
              amounts.push(ethers.BigNumber.from(0));
              prices.push(ethers.utils.parseEther("1000"));
            }
          }
        } else {
          console.error('❌ Unexpected response structure from getAllListings');
          console.log('Expected: 4 arrays [tokenIds, issuers, amounts, prices] or array of token IDs');
          console.log('Received:', listingsData);
          throw new Error('Invalid response structure from marketplace contract');
        }
      } else {
        throw new Error('getAllListings did not return an array');
      }
      
      console.log('📊 Extracted data:');
      console.log('- Token IDs:', tokenIds);
      console.log('- Issuers:', issuers);
      console.log('- Amounts:', amounts);
      console.log('- Prices:', prices);

      if (!tokenIds || tokenIds.length === 0) {
        console.log('ℹ️ No listings found in marketplace');
        setListings([]);
        setLoading(false);
        toast.info('No assets currently listed on the marketplace');
        return;
      }

      console.log(`📊 Found ${tokenIds.length} listings in marketplace`);
      
      // Initialize token contract for metadata fetching with fallback
      let tokenContract;
      try {
        const signerOrProvider = signer || provider || new ethers.providers.JsonRpcProvider(
          NETWORK_CONFIG[ACTIVE_NETWORK].rpcUrl
        );
        tokenContract = new ethers.Contract(TOKEN_CONTRACT, TOKEN_ABI, signerOrProvider);
      } catch (tokenContractError) {
        console.error('❌ Failed to initialize token contract:', tokenContractError);
        // Continue without token contract - use fallback metadata
      }
      
      // Process each listing and fetch metadata
      const processedListings: MarketplaceListing[] = [];
      
      // First, collect all metadata URIs for batch processing
      const metadataRequests: Array<{ tokenId: string; metadataURI: string; index: number }> = [];
      const listingData: Array<{
        tokenId: string;
        issuer: string;
        amount: number;
        price: string;
        index: number;
      }> = [];
      
      // Prepare data and collect metadata URIs
      for (let i = 0; i < tokenIds.length; i++) {
        try {
          // Safely convert BigNumbers to appropriate types
          const tokenId = ethers.BigNumber.isBigNumber(tokenIds[i]) ? tokenIds[i].toString() : tokenIds[i].toString();
          const issuer = issuers[i];
          const amount = ethers.BigNumber.isBigNumber(amounts[i]) ? amounts[i].toNumber() : Number(amounts[i]);
          const price = ethers.BigNumber.isBigNumber(prices[i]) ? prices[i].toString() : prices[i].toString();
          
          // Skip burned tokens by checking lifecycle status
          if (tokenContract) {
            try {
              const lifecycle = await tokenContract.getTokenLifecycleStatus(tokenId);
              if (lifecycle === 2) { // 2 = Burned
                console.log(`🔥 Skipping burned token ${tokenId}`);
                continue;
              }
            } catch (lifecycleError) {
              console.warn(`⚠️ Could not check lifecycle for token ${tokenId}, including in listings`);
            }
          }
          
          console.log(`🔄 Preparing listing ${i + 1}/${tokenIds.length}:`, {
            tokenId,
            issuer,
            amount,
            priceInETH: ethers.utils.formatEther(price),
            priceInWei: price
          });
          
          // Store listing data
          listingData.push({
            tokenId,
            issuer,
            amount,
            price,
            index: i
          });
          
          // Get token metadata URI from token contract with fallback
          let metadataURI = '';
          if (tokenContract) {
            try {
              // Try tokenMetadata first (custom function)
              metadataURI = await tokenContract.tokenMetadata(tokenId);
              console.log('✅ Got metadata URI from tokenMetadata:', metadataURI);
            } catch (e) {
              try {
                // Fallback to uri function (standard ERC1155)
                metadataURI = await tokenContract.uri(tokenId);
                console.log('✅ Got metadata URI from uri:', metadataURI);
              } catch (e2) {
                console.warn('⚠️ Could not get metadata URI for token:', tokenId);
                metadataURI = ''; // Will use fallback data
              }
            }
          }
          
          if (metadataURI) {
            metadataRequests.push({ tokenId, metadataURI, index: i });
          }
          
        } catch (preparationError) {
          console.error(`❌ Error preparing listing ${i}:`, preparationError);
          // Continue with next listing
        }
      }
      
      console.log(`📊 Prepared ${listingData.length} listings, ${metadataRequests.length} metadata requests`);
      
      // Batch fetch metadata with caching
      const metadataResults = await marketplaceCache.batchFetchMetadataWithCache(metadataRequests);
      
      // Now process all listings with cached metadata
      for (const data of listingData) {
        try {
          const { tokenId, issuer, amount, price, index } = data;
          
          // Get cached metadata result
          const metadataResult = metadataResults.get(tokenId);
          const metadata = metadataResult?.metadata;
          const imageUrl = metadataResult?.processedImageUrl || '';
          
          // Enhanced asset type detection (matching AssetTokenSelector logic)
          let assetType = 'Investment Asset'; // Better default than 'Unknown'
          
          // Check metadata for asset type with multiple fallbacks
          if (metadata) {
            // Check direct assetType field
            const metadataAssetType = metadata.assetType ||
                                    (metadata.assetDetails?.assetType) ||
                                    (metadata.assetDetails?.category);
            if (metadataAssetType && metadataAssetType.trim() && metadataAssetType.trim() !== 'Unknown') {
              assetType = metadataAssetType.trim();
            }
            
            // Check attributes for asset type
            if (metadata.attributes && Array.isArray(metadata.attributes)) {
              const assetTypeAttr = metadata.attributes.find((attr: any) => 
                attr.trait_type === 'Asset Type' || 
                attr.trait_type === 'Category' ||
                attr.trait_type === 'Type'
              );
              if (assetTypeAttr?.value && assetTypeAttr.value.trim() && assetTypeAttr.value.trim() !== 'Unknown') {
                assetType = assetTypeAttr.value.trim();
              }
            }
          }
          
          // Use unique asset-specific fallback images if no processed image
          const finalImageUrl = imageUrl || getDeterministicAssetImage(assetType, tokenId);
          console.log(`🎨 Final unique image for token ${tokenId} (${assetType}):`, finalImageUrl);
          
          // Fetch total supply for valuation calculation
          let totalSupply = 0;
          try {
            // Use the mapping directly instead of calling a function
            const totalListed = await marketplaceContract.totalTokensListed(tokenId);
            totalSupply = parseInt(totalListed.toString());
            console.log(`📊 Token ${tokenId} total supply: ${totalSupply}`);
          } catch (e) {
            console.warn(`⚠️ Could not fetch total supply for token ${tokenId}:`, e);
            totalSupply = amount; // Fallback to available amount
          }
          
          // Extract proper name and asset type from metadata with multiple fallbacks
          let properName = `Asset Token #${tokenId}`;
          let properAssetType = assetType;
          
          if (metadata) {
            // Try different possible name fields in metadata
            const metadataName = metadata.name || 
                               metadata.title || 
                               metadata.assetName ||
                               (metadata.assetDetails?.name) ||
                               (metadata.assetDetails?.title);
            
            if (metadataName && metadataName.trim()) {
              properName = metadataName.trim();
            }
            
            // Extract asset type from metadata with multiple fallbacks
            const metadataAssetType = metadata.assetType ||
                                    (metadata.assetDetails?.assetType) ||
                                    (metadata.assetDetails?.category);
            
            if (metadataAssetType && metadataAssetType.trim()) {
              properAssetType = metadataAssetType.trim();
            }
            
            // Also check attributes for asset type
            if (metadata.attributes && Array.isArray(metadata.attributes)) {
              const assetTypeAttr = metadata.attributes.find((attr: any) => 
                attr.trait_type === 'Asset Type' || 
                attr.trait_type === 'Category' ||
                attr.trait_type === 'Type'
              );
              if (assetTypeAttr?.value && assetTypeAttr.value.trim()) {
                properAssetType = assetTypeAttr.value.trim();
              }
            }
          }
          
          console.log(`📝 Token ${tokenId} processed with name: "${properName}", type: "${properAssetType}"`);
          
          const listing: MarketplaceListing = {
            tokenId,
            name: properName,
            description: metadata?.description || `Asset token listed on the marketplace. Token ID: ${tokenId}`,
            image: finalImageUrl,
            price,
            amount,
            totalSupply,
            seller: issuer,
            metadataURI: metadataRequests.find(req => req.tokenId === tokenId)?.metadataURI || `placeholder-${tokenId}`,
            metadata,
            attributes: metadata?.attributes || [
              { trait_type: "Asset Type", value: properAssetType }
            ],
            type: properAssetType,
            category: properAssetType
          };
          
          processedListings.push(listing);
          
        } catch (listingError) {
          console.error(`❌ Error processing listing for token ${data.tokenId}:`, listingError);
          // Continue with next listing - don't fail entire load
        }
      }
      
      setListings(processedListings);
      console.log('✅ Marketplace listings loaded:', processedListings.length);
      
      // Preload images for faster future access
      console.log('🚀 Preloading marketplace images...');
      const imageRequests = processedListings.map(listing => ({
        url: listing.image,
        assetType: listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value || 'Real Estate',
        tokenId: listing.tokenId
      }));
      
      // Preload images in background (don't await to avoid blocking UI)
      imageCacheService.preloadImages(imageRequests).catch(error => {
        console.warn('⚠️ Image preloading failed:', error);
      });
      
      // Mark that we now have real contract data
      setHasRealContractData(true);
      fetchedRealData = true; // Local flag for finally block
      console.log('✅ Real contract data fetched and marked');
      
      // Cache the marketplace listings
      console.log('💾 Caching marketplace listings...');
      marketplaceCache.cacheMarketplaceListings(processedListings);
      
      if (processedListings.length === 0) {
        toast.info('No assets could be loaded from the marketplace');
      } else {
        const isBackgroundRefresh = isFromCache;
        if (isBackgroundRefresh) {
          // Silent background refresh - no toast needed for better UX
          console.log(`✅ Background refresh: Updated ${processedListings.length} marketplace listings`);
        } else {
          toast.success(`${processedListings.length} assets loaded from marketplace`);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error loading marketplace listings:', error);
      
      let errorMessage = 'Failed to load marketplace listings';
      if (error.message?.includes('Network synchronization')) {
        errorMessage = 'Network synchronization issue. Loading demo data as fallback.';
      } else if (error.message?.includes('Smart contract call failed')) {
        errorMessage = 'Marketplace contract unavailable. Loading demo data as fallback.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection issue. Loading demo data as fallback.';
      } else {
        errorMessage = 'Contract data unavailable. Loading demo data as fallback.';
      }
      
      // Load demo data as fallback
      console.log('🔄 Loading demo marketplace data as fallback...');
      setListings(DEMO_MARKETPLACE_DATA);
      setError(errorMessage);
      setHasRealContractData(false);
      console.log('⚠️ Demo data loaded - keeping loading state active');
      
      toast.error(errorMessage);
    } finally {
      // Only turn off loading if we successfully fetched real contract data
      if (fetchedRealData) {
        setLoading(false);
        console.log('✅ Turning off loading - real contract data fetched successfully');
      } else {
        console.log('⚠️ Keeping loading state - no real contract data fetched yet');
        // Keep loading state active to show spinner instead of dummy cards
      }
    }
  };

  // Debug helper functions
  const debugMarketplaceCache = () => {
    const cached = marketplaceCache.getCachedMarketplaceListings();
    console.log('🔍 Debug: Current marketplace cache:', cached);
    if (cached) {
      const isReal = isRealContractData(cached);
      console.log('🔍 Debug: Cache contains real data:', isReal);
    }
    return cached;
  };

  const clearMarketplaceCacheDebug = () => {
    console.log('🗑️ Debug: Clearing marketplace cache...');
    marketplaceCache.clearCache();
    console.log('✅ Debug: Marketplace cache cleared');
    // Reset states
    setHasRealContractData(false);
    setIsFromCache(false);
    // Reload from network
    loadMarketplaceListings(true);
  };

  const clearDummyCacheData = () => {
    const cached = marketplaceCache.getCachedMarketplaceListings();
    if (cached && !isRealContractData(cached)) {
      console.log('🗑️ Clearing dummy cache data...');
      marketplaceCache.clearCache();
      setHasRealContractData(false);
      setIsFromCache(false);
      console.log('✅ Dummy cache data cleared');
      return true;
    }
    return false;
  };

  // Make debug functions available globally for testing
  React.useEffect(() => {
    (window as any).debugMarketplaceCache = debugMarketplaceCache;
    (window as any).clearMarketplaceCacheDebug = clearMarketplaceCacheDebug;
    (window as any).clearDummyCacheData = clearDummyCacheData;
  }, []);

  const handlePurchaseSuccess = () => {
    // Clear marketplace cache since listings have changed
    console.log('🗑️ Clearing marketplace cache after successful purchase...');
    marketplaceCache.clearCache();
    
    // Reload listings after successful purchase (force refresh)
    loadMarketplaceListings(true);
    toast.success('Purchase completed! Refreshing marketplace...');
  };

 if (loading) {
  return (
    // Main container with a positioning context
    <div className="relative min-h-screen h-screen w-full bg-white">
      
      {/* Background layer with the beams */}
      <div className="absolute inset-0 z-0">
        <BackgroundBeamsWithCollision>
          {/* ✅ We must pass children to satisfy TypeScript.
            An empty fragment is perfect here since we don't need to render anything inside it.
          */}
          <></>
        </BackgroundBeamsWithCollision>
      </div>

      {/* Foreground layer with the spinner, guaranteed to be on top */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <div className="text-black text-xl font-medium">
            {hasRealContractData ? 'Loading marketplace...' : 'Fetching contract data...'}
          </div>
          <div className="text-gray-600 text-sm">
            {hasRealContractData ? 'Please wait' : 'Getting real asset data from blockchain'}
          </div>
        </div>
      </div>

    </div>
  );
}

  if (error) {
    return (
      <div className="min-h-screen h-screen w-full bg-white flex items-center justify-center">
        <BackgroundBeamsWithCollision>
          <div className="flex flex-col items-center h-screen space-y-4 text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="text-black text-xl font-medium">Connection Error</div>
            <div className="text-gray-600 text-sm">{error}</div>
            <div className="flex flex-col space-y-2">
              {error.includes('Wrong network') && (
                <button 
                  onClick={async () => {
                    try {
                      const ethereum = (window as any).ethereum;
                      if (ethereum) {
                        // Try to switch to Flow Nebulas Testnet
                        try {
                          await ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: `0x${NETWORK_CONFIG[ACTIVE_NETWORK].chainId.toString(16)}` }],
                          });
                          toast.success('Switched to Flow Mainnet!');
                          setError('');
                          initializeContract();
                        } catch (switchError: any) {
                          // If network doesn't exist, add it
                          if (switchError.code === 4902) {
                            await ethereum.request({
                              method: 'wallet_addEthereumChain',
                              params: [{
                                chainId: `0x${NETWORK_CONFIG[ACTIVE_NETWORK].chainId.toString(16)}`,
                                chainName: NETWORK_CONFIG[ACTIVE_NETWORK].name,
                                nativeCurrency: NETWORK_CONFIG[ACTIVE_NETWORK].nativeCurrency,
                                rpcUrls: [NETWORK_CONFIG[ACTIVE_NETWORK].rpcUrl],
                                blockExplorerUrls: [NETWORK_CONFIG[ACTIVE_NETWORK].blockExplorer]
                              }]
                            });
                            toast.success('Flow Mainnet added to wallet!');
                            setError('');
                            initializeContract();
                          }
                        }
                      }
                    } catch (error) {
                      console.error('Failed to switch network:', error);
                      toast.error('Failed to switch network. Please switch manually.');
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Switch to Flow Mainnet</span>
                </button>
              )}
              
              {/* Debug button to check contract manually */}
              <button 
                onClick={() => {
                  const explorerUrl = `${NETWORK_CONFIG[ACTIVE_NETWORK].blockExplorer}/address/${MARKETPLACE_CONTRACT}`;
                  console.log('🔗 Opening contract in explorer:', explorerUrl);
                  window.open(explorerUrl, '_blank');
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Verify Contract on Explorer</span>
              </button>
              
              <button 
                onClick={() => {
                  setError('');
                  initializeContract();
                }} 
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Retry Connection
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </BackgroundBeamsWithCollision>
      </div>
    );
  }

  // Filter listings by category
  const realEstateListings = listings?.filter(listing => {
    const assetType = listing.attributes?.find(attr => 
      attr.trait_type === 'Asset Type'
    )?.value;
    return assetType?.toLowerCase() === 'real estate';
  }) || [];

  const invoiceListings = listings?.filter(listing => {
    const assetType = listing.attributes?.find(attr => 
      attr.trait_type === 'Asset Type'
    )?.value;
    return assetType?.toLowerCase() === 'invoice';
  }) || [];

  const commodityListings = listings?.filter(listing => {
    const assetType = listing.attributes?.find(attr => 
      attr.trait_type === 'Asset Type'
    )?.value;
    return assetType?.toLowerCase() === 'commodity';
  }) || [];

  const stockListings = listings?.filter(listing => {
    const assetType = listing.attributes?.find(attr => 
      attr.trait_type === 'Asset Type'
    )?.value;
    return assetType?.toLowerCase() === 'stocks';
  }) || [];

  const carbonCreditListings = listings?.filter(listing => {
    const assetType = listing.attributes?.find(attr => 
      attr.trait_type === 'Asset Type'
    )?.value;
    return assetType?.toLowerCase() === 'carboncredit';
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50/30 to-gray-100">
      {/* Professional Header */}
                        <HeroBackground />

      <header className="backdrop-blur-lg bg-white/90 border-b border-gray-200/60 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-black rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              
            </div>
            
            <div className="flex items-center space-x-4">
  {/* Register Asset Button */}
  <button
    onClick={() => navigate('/issuer', { state: { from: '/marketplace' } })}
    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
    <span className="font-medium">Register Asset</span>
  </button>

  {/* Dashboard Button */}
  <button
    onClick={() => navigate('/dashboard')}
    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
    <span className="font-medium">My Dashboard</span>
  </button>
</div>

          </div>
        </div>
      </header>

      {/* Demo Data Warning Banner */}
      {error && error.includes('demo') && (
        <div className="bg-yellow-50 border border-yellow-200 px-6 py-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-yellow-800 font-medium">Demo Mode Active</h3>
                  <p className="text-yellow-700 text-sm">{error}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setError('');
                    initializeContract();
                  }}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retry Live Data</span>
                </button>
                <button
                  onClick={() => setError('')}
                  className="p-2 text-yellow-600 hover:text-yellow-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Properties Carousel */}
      <div className="container mx-auto px-6 pt-8 pb-12">
        <FeaturedPropertiesCarousel 
          listings={listings.slice(0, 3)} 
          onSelectListing={setSelectedListing}
          onViewDetails={setShowDetails}
          tokenPrice={ethPrice}
        />
        
        {/* See All Listings Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">See All Listings</h2>
              <p className="text-gray-600">Explore our complete collection of tokenized real-world assets</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => loadMarketplaceListings(true)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-2"
                title="Refresh listings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Professional Tabs */}
        <Tabs defaultValue="invoices" className="w-full">
          

        
          <TabsContent value="invoices">
            <ProfessionalListingsGrid 
              listings={invoiceListings} 
              category="Invoices"
              onSelectListing={setSelectedListing}
              onNavigateToTrading={navigateToTradingTerminal}
              tokenPrice={ethPrice}
              loading={loading}
            />
          </TabsContent>
          
        </Tabs>
      </div>

      {/* Buy Modal */}
      {selectedListing && (
        <BuyModal
          asset={{
            tokenId: selectedListing.tokenId,
            name: selectedListing.name,
            description: selectedListing.description,
            price: selectedListing.price, // Price in Wei
            amount: selectedListing.amount,
            image: selectedListing.image,
            seller: selectedListing.seller,
            metadata: selectedListing.metadata
          }}
          onClose={() => setSelectedListing(null)}
          onSuccess={handlePurchaseSuccess}
          tokenPrice={ethPrice}
        />
      )}

      {/* Details Modal */}
      {showDetails && (
        <ProfessionalExpandedDetail 
          listing={showDetails} 
          onClose={() => setShowDetails(null)}
          onBuy={(listing) => {
            setShowDetails(null);
            setSelectedListing(listing);
          }}
          onNavigateToTrading={navigateToTradingTerminal}
          tokenPrice={ethPrice}
        />
      )}
    </div>
  );
}

// Robust Image Component with fallbacks
const RobustImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}> = ({ src, alt, className = '', fallbackSrc }) => {
  // If src is a placeholder, immediately use fallback
  const initialSrc = (src === 'placeholder-for-uploaded-image' || !src) && fallbackSrc ? fallbackSrc : src;
  
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [gatewayAttempts, setGatewayAttempts] = useState(0);

  // Extract IPFS hash and create multiple gateway URLs
  const getIPFSGateways = (imageUrl: string) => {
    let ipfsHash = '';
    
    if (imageUrl.startsWith('ipfs://')) {
      ipfsHash = imageUrl.replace('ipfs://', '');
    } else if (imageUrl.includes('/ipfs/')) {
      const parts = imageUrl.split('/ipfs/');
      ipfsHash = parts[parts.length - 1];
    } else if (imageUrl.match(/^Qm[a-zA-Z0-9]{44}$/)) {
      ipfsHash = imageUrl;
    }
    
    if (ipfsHash) {
      return [
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`, // Try Pinata first (user confirmed working)
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
        `https://dweb.link/ipfs/${ipfsHash}`,
        `https://gateway.ipfs.io/ipfs/${ipfsHash}`
      ];
    }
    
    return [imageUrl];
  };

  const handleError = () => {
    console.warn('❌ Image failed to load:', imgSrc);
    
    // Special debugging for user's confirmed working image
    if (imgSrc.includes('QmQoHpAJNJyWUgC7QGMgAnzdaMekpMAeCi1voJH6iSaFRi')) {
      console.log('🔍 DEBUG: User confirmed this image works at Pinata gateway');
      console.log('🔍 DEBUG: Current attempt:', imgSrc);
      console.log('🔍 DEBUG: Gateway attempts so far:', gatewayAttempts);
    }
    
    setHasError(true);
    
    // If this is an IPFS URL, try alternative gateways
    if (imgSrc.includes('/ipfs/') && gatewayAttempts < 3) {
      const gateways = getIPFSGateways(src);
      const nextGateway = gateways[gatewayAttempts + 1];
      
      if (nextGateway && nextGateway !== imgSrc) {
        console.log(`🔄 Trying IPFS gateway ${gatewayAttempts + 2}/${gateways.length}:`, nextGateway);
        setImgSrc(nextGateway);
        setGatewayAttempts(prev => prev + 1);
        setHasError(false);
        return;
      }
    }
    
    // Try fallback image if available
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      console.log('🔄 Trying fallback image:', fallbackSrc);
      setImgSrc(fallbackSrc);
      setHasError(false);
    } else {
      // Use a local asset fallback based on context
      const localFallback = getDeterministicAssetImage('Real Estate', '1'); // Default to real estate
      if (imgSrc !== localFallback) {
        console.log('🔄 Using local asset fallback image');
        setImgSrc(localFallback);
        setHasError(false);
      }
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    
    // Log successful gateway for debugging
    if (imgSrc.includes('/ipfs/')) {
      const gatewayUsed = imgSrc.split('/ipfs/')[0];
      console.log(`✅ Image loaded successfully from gateway: ${gatewayUsed}`);
      
      // Special tracking for user's confirmed image
      if (imgSrc.includes('QmQoHpAJNJyWUgC7QGMgAnzdaMekpMAeCi1voJH6iSaFRi')) {
        console.log('🎯 SUCCESS: User\'s confirmed image loaded successfully!');
        console.log('🎯 Successful gateway:', gatewayUsed);
      }
    } else {
      console.log('✅ Image loaded successfully:', imgSrc);
    }
  };

  useEffect(() => {
    // If src is a placeholder, immediately use fallback
    const newSrc = (src === 'placeholder-for-uploaded-image' || !src) && fallbackSrc ? fallbackSrc : src;
    setImgSrc(newSrc);
    setIsLoading(true);
    setHasError(false);
    setGatewayAttempts(0); // Reset gateway attempts for new image
  }, [src, fallbackSrc]);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
      />
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs">Image unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Featured Properties Carousel Component
const FeaturedPropertiesCarousel: React.FC<{ 
  listings: MarketplaceListing[];
  onSelectListing: (listing: MarketplaceListing) => void;
  onViewDetails: (listing: MarketplaceListing) => void;
  tokenPrice: number;
}> = ({ listings, onSelectListing, onViewDetails, tokenPrice }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % listings.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [listings.length]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % listings.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + listings.length) % listings.length);
  };

  if (listings.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-black shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(75,85,99,0.2),transparent_50%)]"></div>
      
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex flex-col lg:flex-row"
          >
            {/* Image Section */}
            <div className="lg:w-1/2 relative">
              <CachedImage
                src={listings[currentIndex].image}
                alt={listings[currentIndex].name}
                className="w-full h-64 lg:h-96 object-cover"
                assetType={listings[currentIndex].attributes?.find(attr => attr.trait_type === 'Asset Type')?.value || 'Real Estate'}
                tokenId={listings[currentIndex].tokenId}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              
              {/* Featured Badge */}
              <div className="absolute top-6 left-6">
                <span className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-full text-sm font-bold shadow-lg">
                  ⭐ FEATURED
                </span>
              </div>
            </div>

            {/* Content Section */}
            <div className="lg:w-1/2 p-8 lg:p-12 text-white flex flex-col justify-center">
              <div className="mb-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  {listings[currentIndex].attributes.find(attr => attr.trait_type === 'Asset Type')?.value}
                </span>
              </div>
              
              <h3 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                {listings[currentIndex].name}
              </h3>
              
              <p className="text-lg text-gray-100 mb-6 leading-relaxed">
                {listings[currentIndex].description}
              </p>
              
              <div className="flex items-center justify-between mb-8">
                <div>
        
                  <div className="text-gray-200 text-sm">
                    Price per token ({(parseFloat(listings[currentIndex].price) / Math.pow(10, 18)).toFixed(4)} Flow)
                  </div>
                  <div className="text-yellow-400 text-sm mt-1 font-semibold">
                    Total Valuation: {calculateTotalValuation(listings[currentIndex].price, listings[currentIndex].totalSupply)} Flow
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold">Token #{listings[currentIndex].tokenId}</div>
                  <div className="text-gray-200 text-sm">{listings[currentIndex].amount} Available</div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button 
                  onClick={() => onViewDetails(listings[currentIndex])}
                  className="flex-1 px-6 py-3 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold shadow-lg"
                >
                  View Details
                </button>
                <button 
                  onClick={() => onSelectListing(listings[currentIndex])}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-900 transition-all duration-300 font-semibold shadow-lg"
                >
                  Invest Now
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {listings.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white shadow-lg' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Professional Tab Component
const ProfessionalTab: React.FC<{
  title: string;
  icon: string;
  value: string;
}> = ({ title, icon, value }) => (
  <TabsTrigger 
    value={value}
    className="px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300 font-medium text-gray-700 data-[state=active]:text-gray-900"
  >
    <span className="mr-2 text-lg">{icon}</span>
    {title}
  </TabsTrigger>
);


// Professional Listings Grid
const ProfessionalListingsGrid: React.FC<{ 
  listings: MarketplaceListing[];
  category: string;
  onSelectListing: (listing: MarketplaceListing) => void;
  onNavigateToTrading: (listing: MarketplaceListing) => void;
  tokenPrice: number;
  loading?: boolean;
}> = ({ listings, category, onSelectListing, onNavigateToTrading, tokenPrice, loading = false }) => {
  const [activeListing, setActiveListing] = useState<MarketplaceListing | null>(null);

  // Show loading state
  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg className="w-12 h-12 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading {category}...</h3>
        <p className="text-gray-600">Please wait while we fetch the latest listings from the blockchain.</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No {category} Available</h3>
        <p className="text-gray-600">Check back later for new listings in this category.</p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {activeListing && (
          <ProfessionalExpandedDetail 
            listing={activeListing} 
            onClose={() => setActiveListing(null)}
            onBuy={(listing) => onSelectListing(listing)}
            onNavigateToTrading={onNavigateToTrading}
            tokenPrice={tokenPrice}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings.map((listing, index) => (
          <motion.div
            key={listing.tokenId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            layoutId={`listing-${listing.tokenId}`}
            onClick={() => setActiveListing(listing)}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-200/50 hover:border-gray-300/50 overflow-hidden hover:scale-[1.02] min-h-[520px] flex flex-col"
          >
            <div className="relative overflow-hidden">
              <CachedImage
                src={listing.image} 
                alt={listing.name}
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                assetType={listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value || 'Real Estate'}
                tokenId={listing.tokenId}
              />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 border border-gray-200/50">
                  {(() => {
                    // Enhanced asset type detection logic (similar to AssetTokenSelector)
                    let assetType = 'Investment Asset'; // Better default than 'Unknown'
                    
                    // First check attributes for Asset Type
                    if (listing.attributes && Array.isArray(listing.attributes)) {
                      const assetTypeAttr = listing.attributes.find(attr => 
                        attr.trait_type === 'Asset Type' || 
                        attr.trait_type === 'Category' ||
                        attr.trait_type === 'Type'
                      );
                      if (assetTypeAttr?.value && assetTypeAttr.value.trim() && assetTypeAttr.value.trim() !== 'Unknown') {
                        assetType = assetTypeAttr.value.trim();
                      }
                    }
                    
                    // Fallback to listing properties
                    if (assetType === 'Investment Asset' || assetType === 'Unknown') {
                      if (listing.type && listing.type.trim() && listing.type.trim() !== 'Unknown') {
                        assetType = listing.type.trim();
                      } else if (listing.category && listing.category.trim() && listing.category.trim() !== 'Unknown') {
                        assetType = listing.category.trim();
                      }
                    }
                    
                    // Final check in metadata
                    if ((assetType === 'Investment Asset' || assetType === 'Unknown') && listing.metadata) {
                      const metadataAssetType = listing.metadata.assetType ||
                                               (listing.metadata.assetDetails?.assetType) ||
                                               (listing.metadata.assetDetails?.category);
                      if (metadataAssetType && metadataAssetType.trim() && metadataAssetType.trim() !== 'Unknown') {
                        assetType = metadataAssetType.trim();
                      }
                    }
                    
                    console.log(`🏷️ Token ${listing.tokenId} asset type resolution:`, {
                      attributes: listing.attributes,
                      listingType: listing.type,
                      listingCategory: listing.category,
                      metadataAssetType: listing.metadata?.assetType,
                      finalAssetType: assetType
                    });
                    
                    return assetType;
                  })()}
                </span>
              </div>
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 bg-blue-500/90 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-blue-400/50">
                  #{listing.tokenId}
                </span>
              </div>
            </div>
            
            <div className="p-6 flex-grow flex flex-col">
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors line-clamp-1">
                {listing.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                {listing.description}
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500">Price per token ({(parseFloat(listing.price) / Math.pow(10, 18)).toFixed(4)} Flow)</p>
                  <p className="text-sm font-semibold text-blue-600 mt-1">
                    Total Valuation: {calculateTotalValuation(listing.price, listing.totalSupply)} Flow
                  </p>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div>
                      <p className="text-sm font-medium text-green-600">{listing.amount} Available</p>
                      <p className="text-xs text-gray-500">For Purchase</p>
                    </div>
                    
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-gray-600">Available Now</span>
                </div>
                <div className="flex items-center space-x-2">
                 
                    <button 
                      className="px-4 py-2 bg-gradient-to-r from-gray-800 to-black text-white rounded-lg hover:from-gray-900 hover:to-gray-800 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToTrading(listing);
                    }}
                    >
                      <DollarSign className="w-4 h-4 mr-1 inline" />
                      Trade P2P
                    </button>
                  
                  <button 
                    className="px-4 py-2 bg-gradient-to-r from-gray-800 to-black text-white rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 shadow-md hover:shadow-lg text-sm font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectListing(listing);
                    }}
                  >
                    Buy Asset
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
};

// Professional Expanded Detail Component
const ProfessionalExpandedDetail: React.FC<{
  listing: MarketplaceListing;
  onClose: () => void;
  onBuy: (listing: MarketplaceListing) => void;
  onNavigateToTrading: (listing: MarketplaceListing) => void;
  tokenPrice: number;
}> = ({ listing, onClose, onBuy, onNavigateToTrading, tokenPrice }) => (
  <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex flex-col lg:flex-row h-full max-h-[90vh] overflow-y-auto">
        <div className="lg:w-1/2 relative">
          <CachedImage
            src={listing.image}
            alt={listing.name}
            className="w-full h-64 lg:h-full object-cover"
            assetType={listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value || 'Real Estate'}
            tokenId={listing.tokenId}
          />
          <div className="absolute bottom-6 left-6">
            <span className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 border border-gray-200/50">
              {listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value || 
               listing.type || 
               listing.category || 
               'Unknown'}
            </span>
          </div>
        </div>

        <div className="lg:w-1/2 p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{listing.name}</h2>
            
            <div className="mb-6">
              <div className="flex items-baseline space-x-4 mb-2">
                
                <span className="text-lg text-gray-500">Price per token</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Available Now</span>
                </div>
                <span>•</span>
                <span>{(parseFloat(listing.price) / Math.pow(10, 18)).toFixed(4)} Flow per token</span>
                <span>•</span>
                <span>Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</span>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Total Asset Valuation</p>
                <p className="text-2xl font-bold text-blue-800">
                  {calculateTotalValuation(listing.price, listing.totalSupply)} Flow
                </p>
                <p className="text-xs text-blue-500">
                  ({listing.totalSupply.toLocaleString()} tokens × {(parseFloat(listing.price) / Math.pow(10, 18)).toFixed(4)} Flow)
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-600 leading-relaxed">{listing.description}</p>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Token ID - Always show first */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200/50">
                  <div className="text-blue-600 text-sm font-medium">Platform ID</div>
                  <div className="text-blue-900 font-semibold mt-1">#{listing.tokenId}</div>
                </div>
                {/* Available Amount */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-200/50">
                  <div className="text-green-600 text-sm font-medium">Available Amount</div>
                  <div className="text-green-900 font-semibold mt-1">{listing.amount} tokens</div>
                </div>
              
                {/* Asset-specific details from metadata.assetDetails */}
                {listing.metadata?.assetDetails && (() => {
                  const assetType = listing.attributes?.find(attr => attr.trait_type === 'Asset Type')?.value;
                  const assetDetails = listing.metadata.assetDetails;
                  
                  // Real Estate specific fields
                  if (assetType === 'Real Estate') {
                    return (
                      <>
                        {assetDetails.size && (
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200/50">
                            <div className="text-purple-600 text-sm font-medium">Size</div>
                            <div className="text-purple-900 font-semibold mt-1">{assetDetails.size} sq ft</div>
                          </div>
                        )}
                        {assetDetails.bedrooms && (
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200/50">
                            <div className="text-purple-600 text-sm font-medium">Bedrooms</div>
                            <div className="text-purple-900 font-semibold mt-1">{assetDetails.bedrooms}</div>
                          </div>
                        )}
                        {assetDetails.location && (
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200/50 sm:col-span-2">
                            <div className="text-purple-600 text-sm font-medium">Location</div>
                            <div className="text-purple-900 font-semibold mt-1">{assetDetails.location}</div>
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  // Invoice specific fields
                  if (assetType === 'Invoice') {
                    return (
                      <>
                        {assetDetails.issuer && (
                          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200/50">
                            <div className="text-orange-600 text-sm font-medium">Issuer Company</div>
                            <div className="text-orange-900 font-semibold mt-1">{assetDetails.issuer}</div>
                          </div>
                        )}
                        {assetDetails.dueDate && (
                          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200/50">
                            <div className="text-orange-600 text-sm font-medium">Due Date</div>
                            <div className="text-orange-900 font-semibold mt-1">{assetDetails.dueDate}</div>
                          </div>
                        )}
                        {assetDetails.riskRating && (
                          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200/50">
                            <div className="text-orange-600 text-sm font-medium">Risk Rating</div>
                            <div className="text-orange-900 font-semibold mt-1">{assetDetails.riskRating}</div>
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  // Commodity specific fields
                  if (assetType === 'Commodity') {
                    return (
                      <>
                        {assetDetails.weight && (
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200/50">
                            <div className="text-yellow-600 text-sm font-medium">Weight</div>
                            <div className="text-yellow-900 font-semibold mt-1">{assetDetails.weight}</div>
                          </div>
                        )}
                        {assetDetails.purity && (
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200/50">
                            <div className="text-yellow-600 text-sm font-medium">Purity</div>
                            <div className="text-yellow-900 font-semibold mt-1">{assetDetails.purity}</div>
                          </div>
                        )}
                        {assetDetails.storage && (
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200/50 sm:col-span-2">
                            <div className="text-yellow-600 text-sm font-medium">Storage Location</div>
                            <div className="text-yellow-900 font-semibold mt-1">{assetDetails.storage}</div>
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  // Stocks specific fields
                  if (assetType === 'Stocks') {
                    return (
                      <>
                        {assetDetails.symbol && (
                          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200/50">
                            <div className="text-indigo-600 text-sm font-medium">Stock Symbol</div>
                            <div className="text-indigo-900 font-semibold mt-1">{assetDetails.symbol}</div>
                          </div>
                        )}
                        {assetDetails.exchange && (
                          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200/50">
                            <div className="text-indigo-600 text-sm font-medium">Exchange</div>
                            <div className="text-indigo-900 font-semibold mt-1">{assetDetails.exchange}</div>
                          </div>
                        )}
                        {assetDetails.sector && (
                          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200/50">
                            <div className="text-indigo-600 text-sm font-medium">Sector</div>
                            <div className="text-indigo-900 font-semibold mt-1">{assetDetails.sector}</div>
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  // Carbon Credits specific fields
                  
                  
                  return null;
                })()}
                
                {/* Other general attributes */}
                {listing.attributes?.map((attr) => (
                  <div key={attr.trait_type} className="bg-gray-50 rounded-xl p-4 border border-gray-200/50">
                    <div className="text-gray-500 text-sm font-medium">{attr.trait_type}</div>
                    <div className="text-gray-900 font-semibold mt-1">{attr.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
            <button 
              className="px-3 py-1 bg-gradient-to-r from-gray-800 to-black text-white rounded-lg hover:from-gray-900 hover:to-gray-800 transition-all duration-300 shadow-md hover:shadow-lg text-xs font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToTrading(listing);
              }}
            >
              <DollarSign className="w-3 h-3 mr-1 inline" />
              Trade
            </button>
            <button 
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-800 to-black text-white rounded-xl hover:from-gray-900 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
              onClick={() => onBuy(listing)}
            >
              Buy Asset
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

export default Marketplace;