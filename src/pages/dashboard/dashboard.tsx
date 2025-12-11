import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import { dashboardCache } from '../../utils/dashboardCache';
import { marketplaceCache } from '../../utils/marketplaceCache';
import { UserAsset, PortfolioData, TransactionHistory, TradingNotification, LoadingState } from '../../types/dashboardTypes';
import { MARKETPLACE_ABI } from '../../utils/marketplaceABI';
import { ORDER_BOOK_ESCROW_ABI } from '../../utils/orderBookEscrowABI';
import { MARKETPLACE_CONTRACT, TOKEN_CONTRACT, ORDER_BOOK_ESCROW_CONTRACT } from '../../lib/contractAddress';
import { metadataService } from '../../services/metadataService';
import { processImageURL as processPinataImageURL } from '../../utils/pinataImageFetcher';
import { getUniqueAssetImage, getDeterministicAssetImage } from '../../utils/assetFallbackImages';
import { CachedImage } from '../../components/CachedImage';
import { imageCacheService } from '../../services/imageCacheService';

// Token ABI for metadata and price fetching
const TOKEN_ABI = [
  "function uri(uint256 tokenId) external view returns (string memory)",
  "function tokenMetadata(uint256 tokenId) external view returns (string memory)",
  "function tokenPrice(uint256 tokenId) external view returns (uint256)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)"
];
import { toast } from 'sonner';
import YieldIncomeReport from '../../components/income/YieldIncomeReport';
import { 
  BarChart3, 
  Wallet, 
  User, 
  DollarSign, 
  TrendingUp, 
  Bell, 
  Settings, 
  LogOut,
  Home,
  ChevronRight,
  Eye,
  EyeOff,
  Calendar,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  Building,
  FileText,
  Coins,
  Leaf,
  Download,
  Filter,
  RefreshCw,
  Check,
  Star,
  Award,
  Menu,
  HelpCircle,
  Briefcase,
  X,
  Lightbulb,
  CheckCircle,
  Lock,
  Unlock,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Separator } from '../../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import SecondaryMarketplace from '../../components/SecondaryMarketplace';
import ComplianceGuard from '../../components/ComplianceGuard';
import ComplianceCheck from '../../components/ComplianceCheck';
import { fetchTokenPrice, formatPriceInUSD } from '../../utils/priceService';

// Invoice Financing Components
import TokenStatusCard from '../../components/invoice-financing/investor/TokenStatusCard';
import PortfolioSettlements from '../../components/invoice-financing/investor/PortfolioSettlements';

// Mock data for sections not yet converted to real data
const MOCK_INCOME_HISTORY = [
  { date: "2024-03-01", asset: "Manhattan Luxury Apartment", amount: 1850, type: "Rental" },
  { date: "2024-03-01", asset: "Tech Startup Invoice #1847", amount: 425, type: "Interest" },
  { date: "2024-03-01", asset: "Carbon Credit Portfolio", amount: 315, type: "Dividend" },
  { date: "2024-02-01", asset: "Manhattan Luxury Apartment", amount: 1850, type: "Rental" },
  { date: "2024-02-01", asset: "Tech Startup Invoice #1847", amount: 425, type: "Interest" },
  { date: "2024-02-01", asset: "Carbon Credit Portfolio", amount: 315, type: "Dividend" },
];

const MOCK_TRANSACTIONS = [
  { 
    date: "2024-03-15", 
    time: "09:30 AM",
    asset: "Manhattan Luxury Apartment", 
    location: "New York, NY",
    amount: 125000, 
    type: "buy", 
    shares: 250,
    status: "completed"
  },
  { 
    date: "2024-03-10", 
    time: "11:45 AM",
    asset: "Tech Startup Invoice #1847", 
    location: "San Francisco, CA",
    amount: 8500, 
    type: "buy", 
    shares: 85,
    status: "completed"
  },
  { 
    date: "2024-03-05", 
    time: "02:15 PM",
    asset: "Gold Bullion Reserve", 
    location: "London, UK",
    amount: 45000, 
    type: "buy", 
    shares: 90,
    status: "completed"
  },
  { 
    date: "2024-02-28", 
    time: "10:20 AM",
    asset: "Carbon Credit Portfolio", 
    location: "Toronto, CA",
    amount: 15000, 
    type: "buy", 
    shares: 150,
    status: "completed"
  },
  { 
    date: "2024-02-20", 
    time: "03:45 PM",
    asset: "Previous Investment", 
    location: "Chicago, IL",
    amount: 25000, 
    type: "sell", 
    shares: 50,
    status: "completed"
  },
  { 
    date: "2024-02-15", 
    time: "12:00 PM",
    asset: "Manhattan Luxury Apartment", 
    location: "New York, NY",
    amount: 1850, 
    type: "dividend", 
    shares: 0,
    status: "completed"
  },
  { 
    date: "2024-01-25", 
    time: "01:30 PM",
    asset: "Real Estate Fund REIT", 
    location: "Miami, FL",
    amount: 35000, 
    type: "buy", 
    shares: 175,
    status: "completed"
  },
  { 
    date: "2024-01-18", 
    time: "04:20 PM",
    asset: "Green Energy Bonds", 
    location: "Austin, TX",
    amount: 22000, 
    type: "buy", 
    shares: 110,
    status: "pending"
  },
];

const SIDEBAR_ITEMS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'portfolio', label: 'Owned Assets', icon: Wallet },
  { id: 'income', label: 'My Income', icon: DollarSign },
  { id: 'transactions', label: 'Transactions', icon: Activity },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('analytics');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Wallet context
  const { provider, signer, address, isConnected } = useWallet();
  
  // Auth context
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Profile states
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  
  // Combined user data - prioritize profileData from API, fallback to auth context user
  const currentUser = profileData || user;
  
  // Asset states
  const [userAssets, setUserAssets] = useState<UserAsset[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    totalInvestment: 0,
    currentValue: 0,
    totalReturn: 0,
    returnPercentage: 0,
    monthlyIncome: 0,
    totalAssets: 0,
    activeInvestments: 0
  });
  const [loading, setLoading] = useState(false);

  // Transaction history states
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState<TradingNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Secondary marketplace states
  const [secondaryMarketOpen, setSecondaryMarketOpen] = useState(false);
  const [selectedTokenForTrading, setSelectedTokenForTrading] = useState<UserAsset | null>(null);
  
  // Legacy sell modal states (deprecated - will be removed)
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<UserAsset | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [sellLoading, setSellLoading] = useState(false);

  // Asset details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<UserAsset | null>(null);

  // Cache-related loading states
  const [loadingStates, setLoadingStates] = useState<{
    assets: LoadingState;
    portfolio: LoadingState;
    transactions: LoadingState;
    notifications: LoadingState;
  }>({
    assets: { isLoading: false, isFromCache: false },
    portfolio: { isLoading: false, isFromCache: false },
    transactions: { isLoading: false, isFromCache: false },
    notifications: { isLoading: false, isFromCache: false }
  });

  // Function to update loading states
  const updateLoadingState = (
    key: 'assets' | 'portfolio' | 'transactions' | 'notifications',
    updates: Partial<LoadingState>
  ) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  };

  // Refresh transaction history when switching to transactions tab
  useEffect(() => {
    if (activeSection === 'transactions' && isConnected && provider && address) {
      fetchTransactionHistory();
    }
  }, [activeSection, isConnected, provider, address]);

  // Refresh notifications when switching to notifications tab
  useEffect(() => {
    if (activeSection === 'notifications' && isConnected && provider && address) {
      generateNotificationsFromEvents();
    }
  }, [activeSection, isConnected, provider, address, userAssets]);

  // Auto-refresh notifications every 30 seconds when connected
  useEffect(() => {
    if (isConnected && provider && address) {
      const interval = setInterval(() => {
        generateNotificationsFromEvents();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [isConnected, provider, address, userAssets]);

  // Fetch user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchUserProfile();
    }
  }, [isAuthenticated, authLoading]);

  // Refresh profile when switching to profile tab
  useEffect(() => {
    if (activeSection === 'profile' && isAuthenticated && !profileData) {
      fetchUserProfile();
    }
  }, [activeSection, isAuthenticated, profileData]);

  // Connect wallet function
  const connectWallet = async () => {
    try {
      setLoading(true);
      
      if (!isConnected) {
        toast.error('Please connect your wallet first');
        return;
      }
      
      toast.success('Wallet connected successfully!');
      
      // Load real assets from blockchain
      await fetchUserAssetsFromBlockchain();
      
      // Load transaction history
      await fetchTransactionHistory();
      
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user profile data from API
  const fetchUserProfile = async () => {
    if (!isAuthenticated) {
      console.log('User not authenticated');
      return;
    }

    try {
      setProfileLoading(true);
      setProfileError(null);
      
      const response = await authApi.getProfile();
      
      if (response.success) {
        setProfileData(response.data.user);
        toast.success('Profile data loaded successfully');
      } else {
        throw new Error('Failed to fetch profile data');
      }
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      setProfileError(error.message || 'Failed to load profile data');
      toast.error(`Failed to load profile: ${error.message || 'Unknown error'}`);
    } finally {
      setProfileLoading(false);
    }
  };

  // Fetch user assets from blockchain with proper metadata and images
  // Enhanced function to fetch assets from both marketplace AND wallet as fallback WITH CACHING
  const fetchUserAssetsFromBlockchain = async (forceRefresh: boolean = false) => {
    if (!isConnected || !provider || !address || !signer) {
      console.log('Wallet not connected or signer not available');
      return;
    }

    try {
      // First, try to load from cache if not forcing refresh
      if (!forceRefresh) {
        console.log('🎯 Checking cache for user assets...');
        updateLoadingState('assets', { isLoading: true, isFromCache: true });
        
        const cachedAssets = dashboardCache.getCachedUserAssets(address);
        const cachedPortfolio = dashboardCache.getCachedPortfolioData(address);
        
        if (cachedAssets && cachedPortfolio) {
          console.log(`✅ Loaded ${cachedAssets.length} assets from cache instantly!`);
          setUserAssets(cachedAssets);
          setPortfolioData(cachedPortfolio);
          updateLoadingState('assets', { 
            isLoading: false, 
            isFromCache: true, 
            lastUpdated: Date.now() 
          });
          
          // Only show toast if there are assets to display
          if (cachedAssets.length > 0) {
            toast.success(`Portfolio loaded with ${cachedAssets.length} assets`);
          }
          
          // Optionally refresh in background after 30 seconds for updated data
          setTimeout(() => {
            console.log('🔄 Background refresh starting...');
            fetchUserAssetsFromBlockchain(true);
          }, 30000);
          
          return;
        } else {
          console.log('📭 No valid cache found, fetching from blockchain...');
        }
      }

      // Set loading state for blockchain fetch
      updateLoadingState('assets', { isLoading: true, isFromCache: false });
      setLoading(true);
      console.log('🔄 Loading assets from blockchain for:', address);

      // Create marketplace contract instance with SIGNER (not just provider)
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signer);
      
      // STEP 1: Get user's assets from marketplace (tokens owned via marketplace)
      console.log('📞 Step 1: Calling getMyAssets from marketplace...');
      const myAssetsResult = await marketplaceContract.getMyAssets();
      const [myTokenIds, myAmounts] = myAssetsResult;
      console.log('✅ Marketplace assets:', { 
        tokenIds: myTokenIds.map((id: ethers.BigNumber) => id.toString()), 
        amounts: myAmounts.map((amt: ethers.BigNumber) => amt.toString()) 
      });

      // STEP 2: Get all listings to get prices for both marketplace and wallet tokens
      console.log('📞 Step 2: Calling getAllListings...');
      const allListingsResult = await marketplaceContract.getAllListings();
      const [allTokenIds, allIssuers, allAmounts, allPrices] = allListingsResult;
      console.log('✅ All listings:', { 
        tokenIds: allTokenIds.map((id: ethers.BigNumber) => id.toString()),
        prices: allPrices.map((price: ethers.BigNumber) => price.toString())
      });

      // STEP 3: FALLBACK - Check user's wallet directly for withdrawn tokens
      console.log('� Step 3: Checking wallet directly for withdrawn tokens...');
      const TOKEN_ABI = [
        "function uri(uint256 tokenId) external view returns (string memory)",
        "function tokenMetadata(uint256 tokenId) external view returns (string memory)",
        "function tokenPrice(uint256 tokenId) external view returns (uint256)",
        "function balanceOf(address account, uint256 id) external view returns (uint256)"
      ];
      
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT, TOKEN_ABI, signer);
      
      // Check both current and legacy token contracts
      const tokensToCheck = [
        { address: TOKEN_CONTRACT, name: "Current ERC1155" },
        { address: "0xf52D58076D1cC8e9f744c0c845cc6A6E57419032", name: "Legacy ERC1155" }
      ];
      
      // Collect all unique token IDs to check (from marketplace + expanded ranges)
      const tokenIdsToCheck = new Set<string>();
      
      // Add marketplace token IDs
      allTokenIds.forEach((id: ethers.BigNumber) => {
        tokenIdsToCheck.add(id.toString());
      });
      
      // Expanded token ID ranges to catch more tokens (1-100)
      for (let i = 1; i <= 100; i++) {
        tokenIdsToCheck.add(i.toString());
      }
      
      // Check wallet balances for all potential tokens across all contracts
      const walletTokenBalances = new Map<string, { amount: number; contract: string }>();
      
      for (const tokenContract of tokensToCheck) {
        console.log(`🔍 Checking ${tokenContract.name} contract: ${tokenContract.address}`);
        try {
          const contract = new ethers.Contract(tokenContract.address, TOKEN_ABI, signer);
          
          for (const tokenId of tokenIdsToCheck) {
            try {
              const balance = await contract.balanceOf(address, tokenId);
              const balanceNumber = balance.toNumber();
              if (balanceNumber > 0) {
                const key = `${tokenContract.address}-${tokenId}`;
                walletTokenBalances.set(key, { 
                  amount: balanceNumber, 
                  contract: tokenContract.address 
                });
                console.log(`💰 Found wallet balance for token ${tokenId} on ${tokenContract.name}: ${balanceNumber}`);
              }
            } catch (err) {
              // Token doesn't exist or error - skip silently
            }
          }
        } catch (contractError) {
          console.warn(`⚠️ Failed to check contract ${tokenContract.name}:`, contractError);
        }
      }

      // STEP 4: Create combined mapping of all owned tokens
      const allOwnedTokens = new Map<string, { amount: number; source: 'marketplace' | 'wallet'; contract?: string }>();
      
      // Add marketplace tokens
      for (let i = 0; i < myTokenIds.length; i++) {
        const tokenId = myTokenIds[i].toString();
        const amount = myAmounts[i].toNumber();
        if (amount > 0) {
          allOwnedTokens.set(tokenId, { amount, source: 'marketplace' });
        }
      }
      
      // Add wallet tokens (withdrawn tokens) from all contracts
      for (const [key, tokenInfo] of walletTokenBalances) {
        const [contractAddress, tokenId] = key.split('-');
        const { amount, contract } = tokenInfo;
        
        if (!allOwnedTokens.has(tokenId)) {
          allOwnedTokens.set(tokenId, { 
            amount, 
            source: 'wallet',
            contract: contract
          });
          console.log(`🔄 Adding withdrawn token ${tokenId} from wallet with balance: ${amount} (contract: ${contract})`);
        } else {
          // If token exists in marketplace, add wallet balance to it
          const existing = allOwnedTokens.get(tokenId)!;
          allOwnedTokens.set(tokenId, {
            amount: existing.amount + amount,
            source: 'marketplace', // Keep as marketplace since it has both
            contract: existing.contract || contract
          });
          console.log(`🔄 Adding additional wallet balance for token ${tokenId}: +${amount} (total: ${existing.amount + amount})`);
        }
      }

      console.log(`📊 Total owned tokens found: ${allOwnedTokens.size}`);

      // STEP 5: Initialize metadata token contract for price and metadata fetching
      const METADATA_TOKEN_ABI = [
        "function uri(uint256 tokenId) external view returns (string memory)",
        "function tokenMetadata(uint256 tokenId) external view returns (string memory)",
        "function tokenPrice(uint256 tokenId) external view returns (uint256)"
      ];
      
      let metadataTokenContract;
      try {
        const signerOrProvider = signer || provider;
        metadataTokenContract = new ethers.Contract(TOKEN_CONTRACT, METADATA_TOKEN_ABI, signerOrProvider);
      } catch (tokenContractError) {
        console.error('❌ Failed to initialize metadata token contract:', tokenContractError);
      }

      // STEP 6: Create price mapping for easy lookup and fetch missing prices
      const priceMap = new Map();
      for (let i = 0; i < allTokenIds.length; i++) {
        priceMap.set(allTokenIds[i].toString(), allPrices[i]);
      }

      // STEP 6.5: Fetch prices for withdrawn tokens not in marketplace
      console.log('🔄 Fetching prices for withdrawn tokens...');
      for (const [tokenId, tokenInfo] of allOwnedTokens) {
        if (!priceMap.has(tokenId)) {
          try {
            console.log(`💰 Fetching price for withdrawn token ${tokenId}...`);
            
            // Try the token's specific contract first, then fallback to default
            const contractToUse = tokenInfo.contract || TOKEN_CONTRACT;
            const priceContract = new ethers.Contract(contractToUse, METADATA_TOKEN_ABI, signer || provider);
            
            const tokenPrice = await priceContract.tokenPrice(tokenId);
            priceMap.set(tokenId, tokenPrice);
            console.log(`✅ Fetched price for token ${tokenId}: ${ethers.utils.formatEther(tokenPrice)} U2U`);
          } catch (priceError) {
            console.warn(`⚠️ Could not fetch price for token ${tokenId}:`, priceError);
            // Set a default price of 1000 U2U
            priceMap.set(tokenId, ethers.utils.parseEther("1000"));
          }
        }
      }

      // STEP 7: Process metadata and images for each owned asset
      // Process metadata and images for each owned asset
      const processAssetMetadata = async (tokenId: string, contractAddress?: string): Promise<{ imageUrl: string; metadata: any; assetType: string }> => {
        try {
          // Use specific contract if provided, otherwise use default
          const contractToUse = contractAddress || TOKEN_CONTRACT;
          const tokenContract = new ethers.Contract(contractToUse, METADATA_TOKEN_ABI, signer || provider);
          
          // Fetch metadata URI from token contract
          let metadataURI = '';
          try {
            // Try tokenMetadata first, then fallback to uri
            metadataURI = await tokenContract.tokenMetadata(tokenId);
            console.log(`📋 Metadata URI for token ${tokenId} (${contractToUse}):`, metadataURI);
          } catch (e) {
            try {
              metadataURI = await tokenContract.uri(tokenId);
              console.log(`📋 Metadata URI (fallback) for token ${tokenId} (${contractToUse}):`, metadataURI);
            } catch (e2) {
              console.warn(`⚠️ Failed to get metadata URI for token ${tokenId} on ${contractToUse}:`, e2);
            }
          }

          // Fetch metadata from IPFS using marketplace cache for consistency
          let metadata = null;
          if (metadataURI) {
            try {
              console.log(`🔄 Fetching metadata from: ${metadataURI}`);
              
              // Use marketplace cache's enhanced metadata fetching with caching
              const metadataResult = await marketplaceCache.fetchMetadataWithCache(tokenId, metadataURI);
              metadata = metadataResult.metadata;
              
              console.log(`✅ Metadata fetched for token ${tokenId}:`, metadata);
            } catch (e) {
              console.warn(`⚠️ Failed to fetch metadata for token ${tokenId}:`, e);
            }
          }

          // Determine asset type from metadata or use fallback (SAME AS MARKETPLACE)
          let assetType = 'Unknown';
          if (metadata?.attributes) {
            const assetTypeAttr = metadata.attributes.find((attr: any) => 
              attr.trait_type === 'Asset Type'
            );
            assetType = assetTypeAttr?.value || assetType;
          } else if (metadata?.assetDetails) {
            assetType = metadata.assetDetails.assetType || assetType;
          }
          
          // Use unique asset-specific fallback images (BETTER THAN MARKETPLACE)
          const fallbackImage = getDeterministicAssetImage(assetType, tokenId, contractToUse);
          console.log(`🎨 Selected unique fallback image for token ${tokenId} (${assetType}):`, fallbackImage);
          
          // Process image using enhanced Pinata utilities (SAME AS MARKETPLACE)
          const imageUrl = processPinataImageURL(metadata?.image || '', metadata);
          console.log(`🖼️ Enhanced image processing for token ${tokenId}: ${metadata?.image} → ${imageUrl}`);

          return { imageUrl, metadata, assetType };
        } catch (error) {
          console.error(`❌ Error processing metadata for token ${tokenId}:`, error);
          return {
            imageUrl: getDeterministicAssetImage('Real Estate', tokenId),
            metadata: null,
            assetType: 'Real World Asset'
          };
        }
      };

      // STEP 7: Build user assets array with real metadata and images (including withdrawn tokens)
      const userAssetsArray: UserAsset[] = [];
      const processedTokenIds = new Set<string>(); // Track processed tokens to prevent duplicates
      
      console.log('🔄 Processing all owned tokens (marketplace + wallet)...');
      
      for (const [tokenId, tokenInfo] of allOwnedTokens) {
        const { amount, source } = tokenInfo;
        const price = priceMap.get(tokenId) || ethers.BigNumber.from(0);

        // Skip if amount is 0 or token already processed
        if (amount <= 0) {
          console.log(`⏭️ Skipping token ${tokenId} - zero balance`);
          continue;
        }
        
        if (processedTokenIds.has(tokenId)) {
          console.log(`⏭️ Skipping duplicate token ${tokenId} - already processed`);
          continue;
        }

        // Skip burned tokens by checking lifecycle status
        try {
          const lifecycle = await tokenContract.getTokenLifecycleStatus(tokenId);
          if (lifecycle === 2) { // 2 = Burned
            console.log(`🔥 Skipping burned token ${tokenId} in user dashboard`);
            continue;
          }
        } catch (lifecycleError) {
          console.warn(`⚠️ Could not check lifecycle for token ${tokenId}, including in user dashboard`);
        }

        console.log(`🔍 Processing token ${tokenId} from ${source} with amount: ${amount}`);
        
        // Mark token as processed
        processedTokenIds.add(tokenId);
        console.log(`🔄 Processing metadata for token ${tokenId}...`);
        
        const { imageUrl, metadata, assetType } = await processAssetMetadata(tokenId, tokenInfo.contract);

        // Extract asset name with multiple fallback strategies
        let assetName = `${assetType} Asset #${tokenId}`; // Default fallback with asset type
        
        if (metadata?.name) {
          assetName = metadata.name;
        } else if (metadata?.title) {
          assetName = metadata.title;
        } else if (metadata?.assetDetails?.location) {
          // For real estate, try to use location
          assetName = `${assetType} in ${metadata.assetDetails.location}`;
        } else if (metadata?.attributes) {
          // Try to build name from attributes
          const locationAttr = metadata.attributes.find((attr: any) => attr.trait_type.toLowerCase().includes('location'));
          const typeAttr = metadata.attributes.find((attr: any) => attr.trait_type === 'Asset Type');
          
          if (locationAttr) {
            assetName = `${typeAttr?.value || assetType} in ${locationAttr.value}`;
          } else {
            assetName = `${typeAttr?.value || assetType} Token #${tokenId}`;
          }
        }

        console.log(`✅ Extracted asset name: "${assetName}" for token ${tokenId}`);

        userAssetsArray.push({
          tokenId: tokenId,
          name: assetName,
          description: metadata?.description || metadata?.desc || `A tokenized ${assetType.toLowerCase()} asset with ID ${tokenId}`,
          image: imageUrl,
          price: price.toString(), // Price in Wei
          amount: amount,
          seller: allIssuers[allTokenIds.findIndex((id: ethers.BigNumber) => id.toString() === tokenId)] || address,
          metadataURI: metadata ? `ipfs://token${tokenId}` : '',
          metadata: metadata || {
            name: assetName,
            description: `A tokenized ${assetType.toLowerCase()} asset with ID ${tokenId}`
          },
          attributes: metadata?.attributes || [
            { trait_type: "Asset Type", value: assetType },
            { trait_type: "Token ID", value: tokenId },
            { trait_type: "Source", value: source } // Add source info (marketplace vs wallet)
          ],
          type: assetType,
          source: source // Add source to the main object
        });
      }

      setUserAssets(userAssetsArray);
      console.log('✅ Loaded', userAssetsArray.length, 'assets from blockchain with metadata (including withdrawn tokens)');
      
      // Preload images for faster future access
      console.log('🚀 Preloading dashboard images...');
      const imageRequests = userAssetsArray.map(asset => ({
        url: asset.image,
        assetType: asset.type || 'Real Estate',
        tokenId: asset.tokenId
      }));
      
      // Preload images in background (don't await to avoid blocking UI)
      imageCacheService.preloadImages(imageRequests).catch(error => {
        console.warn('⚠️ Image preloading failed:', error);
      });
      
      // Calculate portfolio data with real blockchain data
      calculatePortfolioDataFromBlockchain(userAssetsArray, priceMap);
      
      // Cache the freshly fetched data
      console.log('💾 Caching assets and portfolio data...');
      dashboardCache.cacheUserAssets(userAssetsArray, address);
      // Portfolio data will be cached after calculatePortfolioDataFromBlockchain updates it
      dashboardCache.recordLastRefresh(address);
      
      // Update loading state
      updateLoadingState('assets', { 
        isLoading: false, 
        isFromCache: false, 
        lastUpdated: Date.now() 
      });
      
      if (userAssetsArray.length === 0) {
        toast.info('No assets found. Make sure you have purchased tokens and the transaction is confirmed.');
      } else {
        const isBackgroundRefresh = loadingStates.assets.isFromCache && loadingStates.assets.lastUpdated;
        if (isBackgroundRefresh) {
          // Silent background refresh - no toast needed for better UX
          console.log(`✅ Background refresh: Updated ${userAssetsArray.length} assets`);
        } else {
          toast.success(`Loaded ${userAssetsArray.length} assets`);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to load assets from blockchain:', error);
      setUserAssets([]);
      calculatePortfolioDataFromBlockchain([], new Map());
      updateLoadingState('assets', { isLoading: false, isFromCache: false });
    } finally {
      setLoading(false);
    }
  };

  // Calculate portfolio analytics from blockchain data
  const calculatePortfolioDataFromBlockchain = (assets: UserAsset[], priceMap: Map<string, ethers.BigNumber>) => {
    if (assets.length === 0) {
      setPortfolioData({
        totalInvestment: 0,
        currentValue: 0,
        totalReturn: 0,
        returnPercentage: 0,
        monthlyIncome: 0,
        totalAssets: 0,
        activeInvestments: 0
      });
      return;
    }

    // Calculate total value by summing (amount * price) for all assets
    // Price is in Wei, convert to U2U by dividing by 10^18
    const totalValueETH = assets.reduce((sum, asset) => {
      const pricePerTokenWei = ethers.BigNumber.from(asset.price);
      const pricePerTokenETH = parseFloat(ethers.utils.formatEther(pricePerTokenWei)); // Convert Wei to U2U
      const assetTotalValue = pricePerTokenETH * asset.amount;
      console.log(`Asset ${asset.tokenId}: ${asset.amount} tokens × ${pricePerTokenETH.toFixed(6)} U2U = ${assetTotalValue.toFixed(6)} U2U`);
      return sum + assetTotalValue;
    }, 0);

    console.log(`Total portfolio value: ${totalValueETH.toFixed(6)} U2U`);

    // Use total value as current investment (real portfolio value)
    const totalInvestment = totalValueETH;
    const currentValue = totalValueETH;
    
    // For now, assume no gains/losses (can be updated later with historical data)
    const totalReturn = 0;
    const returnPercentage = 0;
    
    // Yearly income = 8% of current value per year
    const yearlyIncome = currentValue * 0.08;

    console.log(`Yearly income calculation: ${currentValue.toFixed(6)} U2U × 0.08 = ${yearlyIncome.toFixed(6)} U2U`);

    const portfolioData = {
      totalInvestment,
      currentValue,
      totalReturn,
      returnPercentage,
      monthlyIncome: yearlyIncome, // We'll rename this to yearlyIncome in the UI
      totalAssets: assets.length,
      activeInvestments: assets.filter(asset => parseFloat(asset.price) > 0).length
    };

    setPortfolioData(portfolioData);
    
    // Cache the portfolio data if connected
    if (address) {
      dashboardCache.cachePortfolioData(portfolioData, address);
      console.log('💾 Cached portfolio data');
    }
  };

  // Calculate transaction statistics from real blockchain data
  const calculateTransactionStats = () => {
    if (!transactionHistory || transactionHistory.length === 0) {
      return {
        totalBought: 0,
        totalSold: 0,
        dividendIncome: 0,
        buyTransactions: 0,
        sellTransactions: 0,
        dividendPayments: 0
      };
    }

    // Calculate total bought (sum all buy transaction prices in U2U)
    const buyTransactions = transactionHistory.filter(tx => tx.type === 'buy');
    const totalBought = buyTransactions.reduce((sum, tx) => {
      const price = parseFloat(tx.price) || 0;
      return sum + price;
    }, 0);

    // Calculate total sold (sum all sell transaction prices in U2U)
    const sellTransactions = transactionHistory.filter(tx => tx.type === 'sell');
    const totalSold = sellTransactions.reduce((sum, tx) => {
      const price = parseFloat(tx.price) || 0;
      return sum + price;
    }, 0);

    // Calculate estimated dividend income (8% annual return on current portfolio value)
    // Since we don't have actual dividend transactions yet, we'll calculate an estimated annual return
    const estimatedAnnualDividend = portfolioData.currentValue * 0.08;
    
    // For display purposes, we'll show this as accumulated dividend income
    // In a real implementation, this would come from actual dividend transaction events
    const dividendIncome = estimatedAnnualDividend;

    console.log('📊 Transaction Statistics:', {
      totalBought: totalBought.toFixed(4),
      totalSold: totalSold.toFixed(4),
      dividendIncome: dividendIncome.toFixed(4),
      buyTransactions: buyTransactions.length,
      sellTransactions: sellTransactions.length
    });

    return {
      totalBought,
      totalSold,
      dividendIncome,
      buyTransactions: buyTransactions.length,
      sellTransactions: sellTransactions.length,
      dividendPayments: 1 // Placeholder for estimated payments
    };
  };

  // Generate notifications from trading events and escrow activities WITH CACHING
  const generateNotificationsFromEvents = async (forceRefresh: boolean = false) => {
    if (!isConnected || !provider || !address) {
      console.log('❌ Wallet not connected, cannot fetch notifications');
      return;
    }

    try {
      // First, try to load from cache if not forcing refresh
      if (!forceRefresh) {
        console.log('🎯 Checking cache for notifications...');
        updateLoadingState('notifications', { isLoading: true, isFromCache: true });
        
        const cachedNotifications = dashboardCache.getCachedNotifications(address);
        if (cachedNotifications) {
          console.log(`✅ Loaded ${cachedNotifications.length} notifications from cache instantly!`);
          setNotifications(cachedNotifications);
          setUnreadNotifications(cachedNotifications.filter(n => !n.read).length);
          updateLoadingState('notifications', { 
            isLoading: false, 
            isFromCache: true, 
            lastUpdated: Date.now() 
          });
          
          // Don't show toast for notifications loading - keep it silent for better UX
          
          // Optionally refresh in background for updated notifications
          setTimeout(() => {
            console.log('🔄 Background notification refresh starting...');
            generateNotificationsFromEvents(true);
          }, 20000); // 20 seconds delay for notifications
          
          return cachedNotifications;
        } else {
          console.log('📭 No valid notification cache found, fetching from blockchain...');
        }
      }

      // Set loading state for blockchain fetch
      updateLoadingState('notifications', { isLoading: true, isFromCache: false });
      console.log('🔔 Generating notifications from trading events...');
      
      const tradingNotifications: TradingNotification[] = [];
      const currentTime = Date.now();

      // Get current block for recent events (last 24 hours worth of blocks)
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 7200); // ~24 hours on most networks

      // ===== ORDERBOOK NOTIFICATIONS =====
      const orderBookContract = new ethers.Contract(ORDER_BOOK_ESCROW_CONTRACT, ORDER_BOOK_ESCROW_ABI, provider);

      // 1. Sell Order Created notifications (when user creates sell orders)
      const sellOrderFilter = orderBookContract.filters.SellOrderCreated(null, address);
      const sellOrderEvents = await orderBookContract.queryFilter(sellOrderFilter, fromBlock, currentBlock);

      for (const event of sellOrderEvents) {
        const args = event.args;
        const block = await provider.getBlock(event.blockNumber);
        
        let assetName = `Asset #${args!.tokenId.toString()}`;
        try {
          const existingAsset = userAssets.find(asset => asset.tokenId === args!.tokenId.toString());
          if (existingAsset) {
            assetName = existingAsset.name;
          }
        } catch (error) {
          console.log('Could not resolve asset name for notification');
        }

        tradingNotifications.push({
          id: `sell_order_${event.transactionHash}_${event.logIndex}`,
          timestamp: block.timestamp * 1000,
          type: 'order_created',
          title: 'Buy Order Created',
          message: `Your buy order for ${args!.amount.toString()} tokens of ${assetName} at ${ethers.utils.formatEther(args!.pricePerToken)} U2U each is now active in the OrderBook.`,
          status: 'pending',
          priority: 'medium',
          read: false,
          orderData: {
            orderId: args!.orderId.toString(),
            tokenId: args!.tokenId.toString(),
            assetName,
            amount: args!.amount.toNumber(),
            price: ethers.utils.formatEther(args!.pricePerToken),
            orderType: 'sell',
            escrowAmount: ethers.utils.formatEther(args!.pricePerToken.mul(args!.amount))
          },
          transactionHash: event.transactionHash
        });
      }

      // 2. Buy Order Created notifications (when user creates buy orders)
      const buyOrderFilter = orderBookContract.filters.BuyOrderCreated(null, address);
      const buyOrderEvents = await orderBookContract.queryFilter(buyOrderFilter, fromBlock, currentBlock);

      for (const event of buyOrderEvents) {
        const args = event.args;
        const block = await provider.getBlock(event.blockNumber);
        
        let assetName = `Asset #${args!.tokenId.toString()}`;
        try {
          const existingAsset = userAssets.find(asset => asset.tokenId === args!.tokenId.toString());
          if (existingAsset) {
            assetName = existingAsset.name;
          }
        } catch (error) {
          console.log('Could not resolve asset name for notification');
        }

        const escrowAmount = ethers.utils.formatEther(args!.pricePerToken.mul(args!.amount));

        tradingNotifications.push({
          id: `buy_order_${event.transactionHash}_${event.logIndex}`,
          timestamp: block.timestamp * 1000,
          type: 'order_created',
          title: 'Sell Order Created & Funds Escrowed',
          message: `Your sell order for ${args!.amount.toString()} tokens of ${assetName} at ${ethers.utils.formatEther(args!.pricePerToken)} Flow each is active. ${escrowAmount} Flow has been escrowed.`,
          status: 'pending',
          priority: 'high',
          read: false,
          orderData: {
            orderId: args!.orderId.toString(),
            tokenId: args!.tokenId.toString(),
            assetName,
            amount: args!.amount.toNumber(),
            price: ethers.utils.formatEther(args!.pricePerToken),
            orderType: 'buy',
            escrowAmount: escrowAmount
          },
          transactionHash: event.transactionHash
        });
      }

      // 3. Order Filled notifications (when orders are executed)
      const orderFilledFilter = orderBookContract.filters.OrderFilled(null, address);
      const orderFilledEvents = await orderBookContract.queryFilter(orderFilledFilter, fromBlock, currentBlock);

      for (const event of orderFilledEvents) {
        const args = event.args;
        const block = await provider.getBlock(event.blockNumber);

        tradingNotifications.push({
          id: `order_filled_${event.transactionHash}_${event.logIndex}`,
          timestamp: block.timestamp * 1000,
          type: 'order_filled',
          title: 'Order Executed Successfully',
          message: `Your order #${args!.orderId.toString()} has been filled! ${args!.amount.toString()} tokens traded for ${ethers.utils.formatEther(args!.totalPrice)} Flow. Escrow released.`,
          status: 'completed',
          priority: 'high',
          read: false,
          orderData: {
            orderId: args!.orderId.toString(),
            tokenId: 'unknown', // Would need to fetch from order details
            assetName: 'P2P Trade',
            amount: args!.amount.toNumber(),
            price: ethers.utils.formatEther(args!.totalPrice),
            orderType: 'buy', // User was the taker/buyer
            escrowAmount: ethers.utils.formatEther(args!.totalPrice)
          },
          transactionHash: event.transactionHash
        });
      }

      // ===== MARKETPLACE NOTIFICATIONS =====
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);

      // Asset purchase notifications
      const assetBoughtFilter = marketplaceContract.filters.AssetBought(null, address);
      const assetBoughtEvents = await marketplaceContract.queryFilter(assetBoughtFilter, fromBlock, currentBlock);

      for (const event of assetBoughtEvents) {
        const args = event.args;
        const block = await provider.getBlock(event.blockNumber);
        
        let assetName = `Asset #${args!.tokenId.toString()}`;
        try {
          const existingAsset = userAssets.find(asset => asset.tokenId === args!.tokenId.toString());
          if (existingAsset) {
            assetName = existingAsset.name;
          }
        } catch (error) {
          console.log('Could not resolve asset name for notification');
        }

        tradingNotifications.push({
          id: `asset_bought_${event.transactionHash}_${event.logIndex}`,
          timestamp: block.timestamp * 1000,
          type: 'trade_completed',
          title: 'Asset Purchase Completed',
          message: `Successfully purchased ${args!.amount.toString()} tokens of ${assetName} from the primary marketplace.`,
          status: 'completed',
          priority: 'medium',
          read: false,
          orderData: {
            orderId: event.transactionHash,
            tokenId: args!.tokenId.toString(),
            assetName,
            amount: args!.amount.toNumber(),
            price: '0', // Would need transaction value
            orderType: 'buy'
          },
          transactionHash: event.transactionHash
        });
      }

      // Sort notifications by timestamp (newest first)
      tradingNotifications.sort((a, b) => b.timestamp - a.timestamp);

      // Limit to recent notifications (last 50)
      const recentNotifications = tradingNotifications.slice(0, 50);

      console.log(`🔔 Generated ${recentNotifications.length} trading notifications`);
      setNotifications(recentNotifications);
      setUnreadNotifications(recentNotifications.filter(n => !n.read).length);

      // Cache the notifications
      console.log('💾 Caching notifications...');
      dashboardCache.cacheNotifications(recentNotifications, address);
      
      // Update loading state
      updateLoadingState('notifications', { 
        isLoading: false, 
        isFromCache: false, 
        lastUpdated: Date.now() 
      });

      return recentNotifications;

    } catch (error: any) {
      console.error('❌ Error generating notifications:', error);
      updateLoadingState('notifications', { isLoading: false, isFromCache: false });
      toast.error(`Failed to load notifications: ${error.message || 'Unknown error'}`);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadNotifications(prev => Math.max(0, prev - 1));
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadNotifications(0);
  };

  // Fetch transaction history from both marketplace and OrderBook contract events WITH CACHING
  const fetchTransactionHistory = async (forceRefresh: boolean = false) => {
    if (!isConnected || !address) {
      console.log('❌ Wallet not connected, cannot fetch transaction history');
      console.log('Debug - Connection status:', { isConnected, address });
      return;
    }

    // Use the same provider approach as notifications (which work successfully)
    if (!provider) {
      console.log('❌ No provider available for transaction history');
      return;
    }
    
    const providerToUse = provider;
    console.log('✅ Using wallet provider for transaction history (same as working notifications)');

    try {
      // First, try to load from cache if not forcing refresh
      if (!forceRefresh) {
        console.log('🎯 Checking cache for transaction history...');
        updateLoadingState('transactions', { isLoading: true, isFromCache: true });
        
        const cachedTransactions = dashboardCache.getCachedTransactionHistory(address);
        if (cachedTransactions) {
          console.log(`✅ Loaded ${cachedTransactions.length} transactions from cache instantly!`);
          setTransactionHistory(cachedTransactions);
          updateLoadingState('transactions', { 
            isLoading: false, 
            isFromCache: true, 
            lastUpdated: Date.now() 
          });
          
          // Only show toast if there are transactions to display
          if (cachedTransactions.length > 0) {
            toast.success(`Transaction history loaded`);
          }
          
          // Optionally refresh in background for updated data
          setTimeout(() => {
            console.log('🔄 Background transaction refresh starting...');
            fetchTransactionHistory(true);
          }, 45000); // 45 seconds delay for transactions
          
          return;
        } else {
          console.log('📭 No valid transaction cache found, fetching from blockchain...');
        }
      }

      // Set loading state for blockchain fetch
      updateLoadingState('transactions', { isLoading: true, isFromCache: false });
      setTransactionLoading(true);
      console.log('🔄 Loading comprehensive transaction history for wallet:', address);

      // Get current block number for filtering
      const currentBlock = await providerToUse.getBlockNumber();
      console.log('📊 Current blockchain block:', currentBlock);
      
      // Use the same block range as notifications (which work successfully) - ~24 hours
      const fromBlock = Math.max(0, currentBlock - 7200); 
      
      console.log(`📊 Searching events from block ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock} blocks)`);

      // Process events into transaction history
      const transactions: TransactionHistory[] = [];

      // ===== PRIMARY MARKETPLACE EVENTS =====
      console.log('🏪 Checking Primary Marketplace Contract:', MARKETPLACE_CONTRACT);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, providerToUse);
      
      try {
        // Verify contract exists
        const marketplaceCode = await providerToUse.getCode(MARKETPLACE_CONTRACT);
        console.log('📄 Marketplace contract code length:', marketplaceCode.length);
        
        if (marketplaceCode === '0x') {
          console.warn('⚠️ Marketplace contract not found at address:', MARKETPLACE_CONTRACT);
        }
      } catch (error) {
        console.error('❌ Error checking marketplace contract:', error);
      }
      
      // Query marketplace events with error handling (like notifications)
      let boughtEvents = [];
      let soldEvents = [];
      
      try {
        console.log('🔍 Searching for AssetBought events for buyer:', address);
        const boughtFilter = marketplaceContract.filters.AssetBought(null, address);
        boughtEvents = await marketplaceContract.queryFilter(boughtFilter, fromBlock, currentBlock);
        console.log(`✅ Found ${boughtEvents.length} buy events`);
      } catch (error) {
        console.warn('⚠️ Failed to fetch buy events:', error);
      }
      
      try {
        console.log('🔍 Searching for AssetSold events for seller:', address);
        const soldFilter = marketplaceContract.filters.AssetSold(null, address);
        soldEvents = await marketplaceContract.queryFilter(soldFilter, fromBlock, currentBlock);
        console.log(`✅ Found ${soldEvents.length} sell events`);
      } catch (error) {
        console.warn('⚠️ Failed to fetch sell events:', error);
      }

      console.log(`📊 Primary Marketplace Results: ${boughtEvents.length} buy events, ${soldEvents.length} sell events`);

      // ===== SECONDARY MARKET (ORDER BOOK) EVENTS =====
      console.log('📚 Checking OrderBook Contract:', ORDER_BOOK_ESCROW_CONTRACT);
      const orderBookContract = new ethers.Contract(ORDER_BOOK_ESCROW_CONTRACT, ORDER_BOOK_ESCROW_ABI, providerToUse);

      try {
        // Verify contract exists
        const orderBookCode = await providerToUse.getCode(ORDER_BOOK_ESCROW_CONTRACT);
        console.log('📄 OrderBook contract code length:', orderBookCode.length);
        
        if (orderBookCode === '0x') {
          console.warn('⚠️ OrderBook contract not found at address:', ORDER_BOOK_ESCROW_CONTRACT);
        }
      } catch (error) {
        console.error('❌ Error checking OrderBook contract:', error);
      }

      // Query OrderBook events with error handling (like notifications)
      let orderFilledAsBuyerEvents = [];
      let sellOrderCreatedEvents = [];
      let buyOrderCreatedEvents = [];
      
      try {
        console.log('🔍 Searching for OrderFilled events for taker:', address);
        const orderFilledAsBuyerFilter = orderBookContract.filters.OrderFilled(null, address);
        orderFilledAsBuyerEvents = await orderBookContract.queryFilter(orderFilledAsBuyerFilter, fromBlock, currentBlock);
        console.log(`✅ Found ${orderFilledAsBuyerEvents.length} filled orders`);
      } catch (error) {
        console.warn('⚠️ Failed to fetch OrderFilled events:', error);
      }

      try {
        console.log('🔍 Searching for SellOrderCreated events for maker:', address);
        const sellOrderCreatedFilter = orderBookContract.filters.SellOrderCreated(null, address);
        sellOrderCreatedEvents = await orderBookContract.queryFilter(sellOrderCreatedFilter, fromBlock, currentBlock);
        console.log(`✅ Found ${sellOrderCreatedEvents.length} sell orders`);
      } catch (error) {
        console.warn('⚠️ Failed to fetch SellOrderCreated events:', error);
      }

      try {
        console.log('🔍 Searching for BuyOrderCreated events for maker:', address);
        const buyOrderCreatedFilter = orderBookContract.filters.BuyOrderCreated(null, address);
        buyOrderCreatedEvents = await orderBookContract.queryFilter(buyOrderCreatedFilter, fromBlock, currentBlock);
        console.log(`✅ Found ${buyOrderCreatedEvents.length} buy orders`);
      } catch (error) {
        console.warn('⚠️ Failed to fetch BuyOrderCreated events:', error);
      }

      console.log(`📊 Secondary Market Results: ${orderFilledAsBuyerEvents.length} filled orders, ${sellOrderCreatedEvents.length} sell orders, ${buyOrderCreatedEvents.length} buy orders created`);

      // ===== ADDITIONAL DEBUGGING: FETCH ANY EVENTS FROM THESE CONTRACTS =====
      console.log('🔧 Debugging: Checking for ANY events from contracts...');
      
      try {
        // Get all events from marketplace contract for this address range
        const allMarketplaceEvents = await marketplaceContract.queryFilter({}, fromBlock, currentBlock);
        console.log(`🏪 Total marketplace events in range: ${allMarketplaceEvents.length}`);
        
        if (allMarketplaceEvents.length > 0) {
          console.log('📋 Sample marketplace events:', allMarketplaceEvents.slice(0, 3).map(e => ({
            event: e.event,
            args: e.args,
            blockNumber: e.blockNumber
          })));
        }
      } catch (error) {
        console.error('❌ Error fetching all marketplace events:', error);
      }

      try {
        // Get all events from OrderBook contract for this address range
        const allOrderBookEvents = await orderBookContract.queryFilter({}, fromBlock, currentBlock);
        console.log(`📚 Total OrderBook events in range: ${allOrderBookEvents.length}`);
        
        if (allOrderBookEvents.length > 0) {
          console.log('📋 Sample OrderBook events:', allOrderBookEvents.slice(0, 3).map(e => ({
            event: e.event,
            args: e.args,
            blockNumber: e.blockNumber
          })));
        }
      } catch (error) {
        console.error('❌ Error fetching all OrderBook events:', error);
      }

      // Process buy events
      for (const event of boughtEvents) {
        const args = event.args;
        const block = await providerToUse.getBlock(event.blockNumber);
        const transaction = await providerToUse.getTransaction(event.transactionHash);
        const receipt = await providerToUse.getTransactionReceipt(event.transactionHash);

        // Get asset name from tokenId (this could be enhanced with metadata lookup)
        let assetName = `Asset #${args!.tokenId.toString()}`;
        try {
          // Try to get asset name from our current assets
          const existingAsset = userAssets.find(asset => asset.tokenId === args!.tokenId.toString());
          if (existingAsset) {
            assetName = existingAsset.name;
          }
        } catch (error) {
          console.log('Could not resolve asset name, using default');
        }

        transactions.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp * 1000, // Convert to milliseconds
          type: 'buy',
          tokenId: args!.tokenId.toString(),
          amount: args!.amount.toNumber(),
          price: ethers.utils.formatEther(transaction.value || '0'), // Transaction value in U2U
          from: transaction.from,
          to: transaction.to || MARKETPLACE_CONTRACT,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: ethers.utils.formatUnits(transaction.gasPrice || '0', 'gwei'),
          status: receipt.status === 1 ? 'success' : 'failed',
          assetName,
          platformFee: ethers.utils.formatEther(args!.platformFee || '0')
        });
      }

      // Process sell events
      for (const event of soldEvents) {
        const args = event.args;
        const block = await providerToUse.getBlock(event.blockNumber);
        const transaction = await providerToUse.getTransaction(event.transactionHash);
        const receipt = await providerToUse.getTransactionReceipt(event.transactionHash);

        // Get asset name from tokenId
        let assetName = `Asset #${args!.tokenId.toString()}`;
        try {
          const existingAsset = userAssets.find(asset => asset.tokenId === args!.tokenId.toString());
          if (existingAsset) {
            assetName = existingAsset.name;
          }
        } catch (error) {
          console.log('Could not resolve asset name, using default');
        }

        transactions.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp * 1000, // Convert to milliseconds
          type: 'sell',
          tokenId: args!.tokenId.toString(),
          amount: args!.amount.toNumber(),
          price: '0', // For sell events, the price would need to be calculated differently
          from: transaction.from,
          to: transaction.to || MARKETPLACE_CONTRACT,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: ethers.utils.formatUnits(transaction.gasPrice || '0', 'gwei'),
          status: receipt.status === 1 ? 'success' : 'failed',
          assetName,
          platformFee: ethers.utils.formatEther(args!.platformFee || '0')
        });
      }

      // ===== PROCESS SECONDARY MARKET (ORDER BOOK) EVENTS =====
      
      // Process OrderFilled events where user is the taker (bought tokens)
      for (const event of orderFilledAsBuyerEvents) {
        const args = event.args;
        const block = await providerToUse.getBlock(event.blockNumber);
        const transaction = await providerToUse.getTransaction(event.transactionHash);
        const receipt = await providerToUse.getTransactionReceipt(event.transactionHash);

        // Get order details to extract tokenId
        let tokenId = 'Unknown';
        let assetName = 'P2P Trade';
        try {
          // Get order details from the OrderFilled event
          const orderId = args!.orderId;
          // Note: We would need to call getOrder(orderId) to get full details
          // For now, using a simplified approach
          assetName = `P2P Purchase (Order #${orderId.toString()})`;
        } catch (error) {
          console.log('Could not resolve order details');
        }

        transactions.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp * 1000,
          type: 'buy',
          tokenId: tokenId,
          amount: args!.amount.toNumber(),
          price: ethers.utils.formatEther(args!.totalPrice || '0'),
          from: transaction.from,
          to: ORDER_BOOK_ESCROW_CONTRACT,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: ethers.utils.formatUnits(transaction.gasPrice || '0', 'gwei'),
          status: receipt.status === 1 ? 'success' : 'failed',
          assetName,
          platformFee: '0' // OrderBook typically has different fee structure
        });
      }

      // Process SellOrderCreated events where user created sell orders
      for (const event of sellOrderCreatedEvents) {
        const args = event.args;
        const block = await providerToUse.getBlock(event.blockNumber);
        const transaction = await providerToUse.getTransaction(event.transactionHash);
        const receipt = await providerToUse.getTransactionReceipt(event.transactionHash);

        // Get asset name from tokenId
        let assetName = `Asset #${args!.tokenId.toString()}`;
        try {
          const existingAsset = userAssets.find(asset => asset.tokenId === args!.tokenId.toString());
          if (existingAsset) {
            assetName = existingAsset.name;
          }
        } catch (error) {
          console.log('Could not resolve asset name for sell order');
        }

        transactions.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp * 1000,
          type: 'listing',
          tokenId: args!.tokenId.toString(),
          amount: args!.amount.toNumber(),
          price: ethers.utils.formatEther(args!.pricePerToken || '0'),
          from: transaction.from,
          to: ORDER_BOOK_ESCROW_CONTRACT,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: ethers.utils.formatUnits(transaction.gasPrice || '0', 'gwei'),
          status: receipt.status === 1 ? 'success' : 'failed',
          assetName: `${assetName} (P2P Listing)`,
          platformFee: '0'
        });
      }

      // Process BuyOrderCreated events where user created buy orders
      for (const event of buyOrderCreatedEvents) {
        const args = event.args;
        const block = await providerToUse.getBlock(event.blockNumber);
        const transaction = await providerToUse.getTransaction(event.transactionHash);
        const receipt = await providerToUse.getTransactionReceipt(event.transactionHash);

        // Get asset name from tokenId
        let assetName = `Asset #${args!.tokenId.toString()}`;
        try {
          const existingAsset = userAssets.find(asset => asset.tokenId === args!.tokenId.toString());
          if (existingAsset) {
            assetName = existingAsset.name;
          }
        } catch (error) {
          console.log('Could not resolve asset name for buy order');
        }

        transactions.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp * 1000,
          type: 'listing',
          tokenId: args!.tokenId.toString(),
          amount: args!.amount.toNumber(),
          price: ethers.utils.formatEther(args!.pricePerToken || '0'),
          from: transaction.from,
          to: ORDER_BOOK_ESCROW_CONTRACT,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: ethers.utils.formatUnits(transaction.gasPrice || '0', 'gwei'),
          status: receipt.status === 1 ? 'success' : 'failed',
          assetName: `${assetName} (P2P Buy Order)`,
          platformFee: '0'
        });
      }

      // Sort transactions by timestamp (newest first)
      transactions.sort((a, b) => b.timestamp - a.timestamp);
      
      // Enhanced debugging output
      console.log('📈 FINAL TRANSACTION SUMMARY:');
      console.log(`- Total transactions found: ${transactions.length}`);
      console.log(`- Primary marketplace: ${boughtEvents.length + soldEvents.length} (${boughtEvents.length} buys, ${soldEvents.length} sells)`);
      console.log(`- Secondary market: ${orderFilledAsBuyerEvents.length + sellOrderCreatedEvents.length + buyOrderCreatedEvents.length} (${orderFilledAsBuyerEvents.length} filled, ${sellOrderCreatedEvents.length} sell orders, ${buyOrderCreatedEvents.length} buy orders)`);
      console.log(`- Block range searched: ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock} blocks)`);
      console.log(`- Wallet address: ${address}`);
      
      if (transactions.length === 0) {
        console.log('❌ NO TRANSACTIONS FOUND! Possible reasons:');
        console.log('  1. No transactions in the searched block range');
        console.log('  2. Wallet address might not have made any transactions');
        console.log('  3. Contract addresses might be incorrect');
        console.log('  4. Event signatures might not match');
        console.log('  5. Transactions might be older than 50,000 blocks');
        
        // Show user-friendly message
        toast.info('No recent transactions found. This could mean you haven\'t made any trades yet, or your transactions are older than the search range.');
      } else {
        console.log('✅ Sample transactions:', transactions.slice(0, 2));
        const isBackgroundRefresh = loadingStates.transactions.isFromCache && loadingStates.transactions.lastUpdated;
        if (isBackgroundRefresh) {
          // Silent background refresh - no toast needed for better UX
          console.log(`✅ Background refresh: Updated ${transactions.length} transactions`);
        } else {
          toast.success(`Found ${transactions.length} transaction(s) in your history`);
        }
      }
      
      setTransactionHistory(transactions);
      
      // Cache the transaction history
      console.log('💾 Caching transaction history...');
      dashboardCache.cacheTransactionHistory(transactions, address);
      
      // Update loading state
      updateLoadingState('transactions', { 
        isLoading: false, 
        isFromCache: false, 
        lastUpdated: Date.now() 
      });

    } catch (error: any) {
      console.error('❌ Error fetching transaction history:', error);
      console.log('Error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        stack: error.stack
      });
      
      updateLoadingState('transactions', { isLoading: false, isFromCache: false });
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Unknown error occurred';
      
      if (error.message?.includes('network') || error.message?.includes('RPC')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Unable to connect to Flow blockchain. Please try again later.';
      } else if (error.code === 'SERVER_ERROR') {
        errorMessage = 'Blockchain service temporarily unavailable. Please try again.';
      } else if (error.message?.includes('missing trie node') || error.message?.includes('client error')) {
        errorMessage = 'Blockchain data synchronization issue. Please try again in a few moments.';
      } else {
        errorMessage = error.message || 'Failed to load transaction history';
      }
      
      toast.error(`Failed to load transaction history: ${errorMessage}`);
    } finally {
      setTransactionLoading(false);
    }
  };

  // Manual testing function to help debug transaction issues
  const testContractsAndEvents = async () => {
    if (!isConnected || !provider || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      console.log('🧪 MANUAL CONTRACT TESTING STARTED');
      console.log('Wallet address:', address);
      console.log('Marketplace contract:', MARKETPLACE_CONTRACT);
      console.log('OrderBook contract:', ORDER_BOOK_ESCROW_CONTRACT);

      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000); // Look back 100k blocks
      
      console.log(`Testing with ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock} blocks)`);

      // Test marketplace contract
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);
      
      console.log('🏪 Testing marketplace contract...');
      
      // Check if we can fetch ANY events (not filtered by address)
      const allMarketplaceEvents = await marketplaceContract.queryFilter({}, fromBlock, currentBlock);
      console.log(`Found ${allMarketplaceEvents.length} total marketplace events`);
      
      if (allMarketplaceEvents.length > 0) {
        console.log('Sample events:', allMarketplaceEvents.slice(0, 5).map(e => ({
          event: e.event,
          blockNumber: e.blockNumber,
          args: e.args ? Object.keys(e.args) : 'no args'
        })));
      }

      // Test OrderBook contract
      const orderBookContract = new ethers.Contract(ORDER_BOOK_ESCROW_CONTRACT, ORDER_BOOK_ESCROW_ABI, provider);
      
      console.log('📚 Testing OrderBook contract...');
      
      const allOrderBookEvents = await orderBookContract.queryFilter({}, fromBlock, currentBlock);
      console.log(`Found ${allOrderBookEvents.length} total OrderBook events`);
      
      if (allOrderBookEvents.length > 0) {
        console.log('Sample events:', allOrderBookEvents.slice(0, 5).map(e => ({
          event: e.event,
          blockNumber: e.blockNumber,
          args: e.args ? Object.keys(e.args) : 'no args'
        })));
      }

      toast.success('Contract testing completed - check console for details');

    } catch (error: any) {
      console.error('❌ Contract testing failed:', error);
      toast.error(`Contract testing failed: ${error.message}`);
    }
  };

  // Sell asset function with real blockchain interaction
  const sellAsset = async () => {
    if (!selectedAsset || !sellAmount || !isConnected || !signer) {
      toast.error('Please enter a valid amount and ensure wallet is connected');
      return;
    }

    const amount = parseInt(sellAmount);
    if (amount <= 0 || amount > selectedAsset.amount) {
      toast.error(`Amount must be between 1 and ${selectedAsset.amount}`);
      return;
    }

    try {
      setSellLoading(true);
      
      console.log(`🔄 Selling ${amount} tokens of asset ${selectedAsset.tokenId} via marketplace contract...`);
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signer);
      
      // Get token price from blockchain
      const tokenPrice = ethers.BigNumber.from(selectedAsset.price); // Price in Wei
      const totalValue = tokenPrice.mul(amount); // Total value for the amount being sold
      const platformFee = totalValue.mul(1).div(100); // 1% platform fee
      
      console.log('💰 Transaction details:', {
        tokenId: selectedAsset.tokenId,
        amount: amount,
        tokenPrice: ethers.utils.formatEther(tokenPrice) + ' U2U',
        totalValue: ethers.utils.formatEther(totalValue) + ' U2U',
        platformFee: ethers.utils.formatEther(platformFee) + ' U2U'
      });
      
      // Call sellAsset function on marketplace contract
      // The user pays the platform fee as msg.value
      console.log('📞 Calling sellAsset on marketplace contract...');
      const tx = await marketplaceContract.sellAsset(
        selectedAsset.tokenId,
        amount,
        {
          value: platformFee, // Pay 1% platform fee
          gasLimit: 500000 // Set gas limit
        }
      );
      
      console.log('⏳ Transaction submitted:', tx.hash);
      toast.info(`Transaction submitted: ${tx.hash.substring(0, 10)}...`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);
      
      // Calculate final amounts
      const totalEthReceived = parseFloat(ethers.utils.formatEther(totalValue));
      const platformFeeEth = parseFloat(ethers.utils.formatEther(platformFee));
      
      toast.success(
        `Successfully sold ${amount} tokens for ${totalEthReceived.toFixed(4)} Flow
        ! Platform fee: ${platformFeeEth.toFixed(4)} Flow
        `,
        { duration: 5000 }
      );
      
      // Close modal and reset
      setSellModalOpen(false);
      setSelectedAsset(null);
      setSellAmount('');
      
      // Clear cache since state has changed due to selling
      console.log('🗑️ Clearing dashboard and marketplace cache after successful sale...');
      dashboardCache.clearCache(address);
      marketplaceCache.clearCache(); // Clear marketplace cache too since asset quantities changed
      
      // Refresh user assets to show updated portfolio (force refresh)
      console.log('🔄 Refreshing portfolio after successful sale...');
      await fetchUserAssetsFromBlockchain(true);
      
      // Refresh transaction history to show new transaction (force refresh)
      await fetchTransactionHistory(true);
      
    } catch (error: any) {
      console.error('❌ Failed to sell asset:', error);
      
      let errorMessage = 'Failed to sell asset';
      if (error.message?.includes('Insufficient balance')) {
        errorMessage = 'Insufficient token balance for this transaction';
      } else if (error.message?.includes('Insufficient marketplace funds')) {
        errorMessage = 'Marketplace has insufficient funds to buy back this asset';
      } else if (error.message?.includes('Must pay platform fee')) {
        errorMessage = 'Failed to pay platform fee. Please ensure sufficient U2U balance.';
      } else if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was cancelled by user';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient U2U for gas fees and platform fee';
      } else {
        errorMessage = `Transaction failed: ${error.message || 'Unknown error'}`;
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setSellLoading(false);
    }
  };

  // Navigate to trading terminal for P2P trading
  const navigateToTradingTerminal = (asset: UserAsset) => {
    // Convert price from Wei to U2U for proper display
    let marketplacePrice = 0;
    try {
      const priceInWei = ethers.BigNumber.from(asset.price);
      marketplacePrice = parseFloat(ethers.utils.formatEther(priceInWei));
      console.log(`🔄 Converting price for ${asset.name}: ${asset.price} Wei → ${marketplacePrice} U2U`);
    } catch (error) {
      console.warn('⚠️ Error converting price:', error);
      marketplacePrice = parseFloat(asset.price) || 0;
    }

    // Navigate to the OrderBook page with the selected token
    navigate('/orderbook', { 
      state: { 
        selectedToken: {
          tokenId: asset.tokenId,
          name: asset.name,
          image: asset.image,
          type: asset.type,
          userBalance: asset.amount,
          price: asset.price, // Keep original for compatibility
          marketplacePrice: marketplacePrice, // Add converted U2U price
          description: asset.description
        }
      } 
    });
  };

  // Open secondary marketplace for P2P trading (legacy - kept for compatibility)
  const openSecondaryMarketplace = (asset: UserAsset) => {
    // Redirect to trading terminal instead of modal
    navigateToTradingTerminal(asset);
  };

  // Close secondary marketplace
  const closeSecondaryMarketplace = () => {
    setSecondaryMarketOpen(false);
    setSelectedTokenForTrading(null);
  };

  // Legacy sell modal function (deprecated)
  const openSellModal = (asset: UserAsset) => {
    setSelectedAsset(asset);
    setSellAmount('');
    setSellModalOpen(true);
  };

  // Open details modal
  const openDetailsModal = (asset: UserAsset) => {
    setSelectedAssetForDetails(asset);
    setDetailsModalOpen(true);
  };

  // Handle withdraw asset to wallet for OrderBook trading
  const handleWithdrawAsset = async (asset: UserAsset) => {
    if (!isConnected || !signer) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      toast.info('Preparing to withdraw tokens from marketplace to your wallet...');
      
      // Import TokenService dynamically to avoid circular imports
      const { TokenService } = await import('../../utils/tokenService');
      const tokenService = new TokenService(provider, signer);
      
      // Withdraw all tokens for this asset
      await tokenService.withdrawAsset(asset.tokenId, asset.amount);
      
      toast.success(
        `Successfully withdrew ${asset.amount} tokens of ${asset.name} to your wallet! You can now use them in the OrderBook.`,
        { duration: 5000 }
      );
      
      // Clear cache since state has changed due to withdrawal
      console.log('🗑️ Clearing dashboard and marketplace cache after successful withdrawal...');
      dashboardCache.clearCache(address);
      marketplaceCache.clearCache(); // Clear marketplace cache too since asset availability changed
      
      // Refresh user assets to show updated balances (force refresh)
      console.log('🔄 Refreshing portfolio after successful withdrawal...');
      await fetchUserAssetsFromBlockchain(true);
      
    } catch (error: any) {
      console.error('❌ Failed to withdraw asset:', error);
      
      let errorMessage = 'Failed to withdraw asset';
      if (error.message?.includes('Insufficient balance')) {
        errorMessage = 'Insufficient balance in marketplace for withdrawal';
      } else if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was cancelled by user';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient U2U for gas fees';
      } else {
        errorMessage = `Withdrawal failed: ${error.message || 'Unknown error'}`;
      }
      
      toast.error(errorMessage, { duration: 5000 });
    }
  };

  // Check wallet connection on mount and load assets
  useEffect(() => {
    if (isConnected && address) {
      console.log('Wallet connected, loading assets...');
      fetchUserAssetsFromBlockchain();
    }
  }, [isConnected, address]);

  // Robust Image Component with fallbacks (same as marketplace)
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

    const handleError = () => {
      console.warn('❌ Image failed to load:', imgSrc);
      setHasError(true);
      
      // Try fallback image if available
      if (fallbackSrc && imgSrc !== fallbackSrc) {
        console.log('🔄 Trying fallback image:', fallbackSrc);
        setImgSrc(fallbackSrc);
        setHasError(false);
      } else {
        // Use a local asset fallback
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
      console.log('✅ Image loaded successfully:', imgSrc);
    };

    useEffect(() => {
      // If src is a placeholder, immediately use fallback
      const newSrc = (src === 'placeholder-for-uploaded-image' || !src) && fallbackSrc ? fallbackSrc : src;
      setImgSrc(newSrc);
      setIsLoading(true);
      setHasError(false);
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

  // Portfolio performance chart with real data visualization - RESPONSIVE
  const PortfolioChart: React.FC = () => {
    // Generate sample data points for the last 6 months
    const generateChartData = () => {
      const currentValue = portfolioData.currentValue || 1; // Fallback to 1 if 0
      const baseValue = currentValue * 0.85; // Start 15% lower to show growth
      
      const dataPoints = [];
      for (let i = 0; i < 24; i++) { // 24 points for smooth curve
        const progress = i / 23;
        const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% random variation
        const growthFactor = 1 + (progress * 0.15) + randomVariation; // 15% overall growth
        const value = Math.max(baseValue * growthFactor, 0.001); // Ensure positive values
        dataPoints.push(value);
      }
      return dataPoints;
    };

    const chartData = generateChartData();
    const maxValue = Math.max(...chartData);
    const minValue = Math.min(...chartData);
    const valueRange = maxValue - minValue || 1; // Prevent division by zero

    // Fixed SVG dimensions for proper scaling
    const width = 800;
    const height = 300;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Create SVG path
    const createPath = () => {
      let path = '';
      chartData.forEach((value, index) => {
        const x = (index / (chartData.length - 1)) * chartWidth + padding;
        const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
        
        if (index === 0) {
          path += `M ${x} ${y}`;
        } else {
          path += ` L ${x} ${y}`;
        }
      });
      return path;
    };

    // Create gradient area path
    const createAreaPath = () => {
      let path = createPath();
      const lastX = chartWidth + padding;
      const bottomY = height - padding;
      path += ` L ${lastX} ${bottomY} L ${padding} ${bottomY} Z`;
      return path;
    };

    const currentGrowth = ((chartData[chartData.length - 1] - chartData[0]) / chartData[0] * 100).toFixed(1);

    return (
      <div className="w-full h-full flex flex-col">
        {/* Chart Header - Mobile Friendly */}
        <div className="mb-3 md:mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="text-sm md:text-base font-semibold text-gray-900">Portfolio Value</h3>
            <p className="text-base md:text-xl font-bold text-gray-900">
              {chartData[chartData.length - 1].toFixed(4)} Flow
            </p>
            <p className={`text-xs md:text-sm ${parseFloat(currentGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(currentGrowth) >= 0 ? '+' : ''}{currentGrowth}% (6 months)
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs md:text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Portfolio Value</span>
          </div>
        </div>
        
        {/* Chart Container - Responsive */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${width} ${height}`}
              className="max-w-full max-h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Definitions */}
              <defs>
                <pattern id="gridPattern" width="40" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
                </pattern>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              
              {/* Grid background */}
              <rect 
                x={padding} 
                y={padding} 
                width={chartWidth} 
                height={chartHeight} 
                fill="url(#gridPattern)" 
                opacity="0.5"
              />
              
              {/* Area under curve */}
              <path
                d={createAreaPath()}
                fill="url(#areaGradient)"
              />
              
              {/* Main line */}
              <path
                d={createPath()}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {chartData.map((value, index) => {
                if (index % 4 === 0) { // Show every 4th point to avoid crowding
                  const x = (index / (chartData.length - 1)) * chartWidth + padding;
                  const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
                  
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth="2"
                      className="drop-shadow-sm"
                    >
                      <title>{value.toFixed(4)} Flow</title>
                    </circle>
                  );
                }
                return null;
              })}
              
              {/* Y-axis labels */}
              <text x={padding - 10} y={padding + 5} textAnchor="end" className="text-xs fill-gray-500 font-medium">
                {maxValue.toFixed(3)} Flow
              </text>
              <text x={padding - 10} y={height - padding + 5} textAnchor="end" className="text-xs fill-gray-500 font-medium">
                {minValue.toFixed(3)} Flow
              </text>
              
              {/* X-axis labels */}
              <text x={padding} y={height - 10} textAnchor="start" className="text-xs fill-gray-500 font-medium">
                6 months ago
              </text>
              <text x={width - padding} y={height - 10} textAnchor="end" className="text-xs fill-gray-500 font-medium">
                Today
              </text>
            </svg>
          </div>
        </div>
        
        {/* Chart Stats - Mobile Friendly Grid */}
        <div className="mt-3 md:mt-4 grid grid-cols-3 gap-2 md:gap-4 pt-3 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">HIGHEST</p>
            <p className="text-xs md:text-sm font-bold text-gray-900">{maxValue.toFixed(4)} Flow</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">LOWEST</p>
            <p className="text-xs md:text-sm font-bold text-gray-900">{minValue.toFixed(4)} Flow</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium">GROWTH</p>
            <p className={`text-xs md:text-sm font-bold ${parseFloat(currentGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(currentGrowth) >= 0 ? '+' : ''}{currentGrowth}%
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Asset allocation doughnut chart - RESPONSIVE
  const AssetAllocationChart: React.FC = () => {
    const assetTypes = userAssets.reduce((acc, asset) => {
      const type = asset.type || 'Other';
      if (!acc[type]) acc[type] = 0;
      const assetValue = parseFloat(ethers.utils.formatEther(asset.price)) * asset.amount;
      acc[type] += assetValue;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(assetTypes).reduce((sum, value) => sum + value, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    if (total === 0) {
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <PieChart className="w-12 md:w-16 h-12 md:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium text-sm md:text-base">Asset Allocation</p>
              <p className="text-gray-400 text-xs md:text-sm mt-1">No assets to display</p>
            </div>
          </div>
        </div>
      );
    }

    let cumulativePercentage = 0;
    const radius = 80;
    const centerX = 140;
    const centerY = 120;
    const width = 280;
    const height = 240;

    return (
      <div className="w-full h-full flex flex-col">
        {/* Chart Header */}
        <div className="mb-3 md:mb-4 text-center">
          <h3 className="text-sm md:text-base font-semibold text-gray-900">Asset Distribution</h3>
          <p className="text-base md:text-xl font-bold text-gray-900">{userAssets.length} Assets</p>
          <p className="text-xs md:text-sm text-gray-600">{total.toFixed(4)} Flow Total</p>
        </div>
        
        {/* Chart Container */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="relative w-full h-full max-w-xs">
            <svg 
              width="100%" 
              height="100%"
              viewBox={`0 0 ${width} ${height}`}
              className="max-w-full max-h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {Object.entries(assetTypes).map(([type, value], index) => {
                const percentage = (value / total) * 100;
                const startAngle = (cumulativePercentage / 100) * 360;
                const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
                
                const startAngleRad = (startAngle - 90) * (Math.PI / 180);
                const endAngleRad = (endAngle - 90) * (Math.PI / 180);
                
                const x1 = centerX + radius * Math.cos(startAngleRad);
                const y1 = centerY + radius * Math.sin(startAngleRad);
                const x2 = centerX + radius * Math.cos(endAngleRad);
                const y2 = centerY + radius * Math.sin(endAngleRad);
                
                const largeArcFlag = percentage > 50 ? 1 : 0;
                
                const pathData = [
                  `M ${centerX} ${centerY}`,
                  `L ${x1} ${y1}`,
                  `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  'Z'
                ].join(' ');
                
                cumulativePercentage += percentage;
                
                return (
                  <g key={type}>
                    <path
                      d={pathData}
                      fill={colors[index % colors.length]}
                      className="hover:opacity-80 transition-opacity cursor-pointer drop-shadow-sm"
                    >
                      <title>{type}: {percentage.toFixed(1)}%</title>
                    </path>
                  </g>
                );
              })}
              
              {/* Center circle */}
              <circle cx={centerX} cy={centerY} r={radius * 0.55} fill="white" className="drop-shadow-sm" />
              <text x={centerX} y={centerY - 5} textAnchor="middle" className="text-xs fill-gray-500 font-medium">
                Total Value
              </text>
              <text x={centerX} y={centerY + 8} textAnchor="middle" className="text-xs md:text-sm fill-gray-900 font-bold">
                {total.toFixed(3)} Flow
              </text>
            </svg>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-3 md:mt-4 space-y-1 md:space-y-2 pt-3 border-t border-gray-100">
          {Object.entries(assetTypes).map(([type, value], index) => {
            const percentage = (value / total) * 100;
            return (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <span className="text-xs md:text-sm font-medium text-gray-700 truncate">{type}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs md:text-sm font-bold text-gray-900">{percentage.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">{value.toFixed(3)} Flow</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics Overview</h1>
                <p className="text-gray-600 mt-1">Portfolio insights and performance metrics</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Live</span>
                </div>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Last 30 days
                </Button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">TOTAL INVESTMENT</p>
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-base md:text-lg lg:text-xl font-bold text-gray-900 truncate">
                          {balanceVisible ? `${portfolioData.totalInvestment.toFixed(4)} Flow` : '••••••'}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBalanceVisible(!balanceVisible)}
                          className="h-5 w-5 p-0 flex-shrink-0"
                        >
                          {balanceVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </Button>
                      </div>
                      <p className="text-green-600 text-xs md:text-sm">
                        {isConnected ? '+2.4% from last month' : 'Connect wallet to view'}
                      </p>
                    </div>
                    <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <TrendingUp className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">CURRENT VALUE</p>
                      <p className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2 truncate">
                        {balanceVisible ? `${portfolioData.currentValue.toFixed(4)} Flow` : '••••••'}
                      </p>
                      <p className="text-green-600 text-xs md:text-sm">
                        +{portfolioData.returnPercentage.toFixed(2)}% total return
                      </p>
                    </div>
                    <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <ArrowUpRight className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">TOTAL RETURN</p>
                      <div className="flex flex-col space-y-1 mb-2">
                        <p className="text-base md:text-lg lg:text-xl font-bold text-gray-900 truncate">
                          {balanceVisible ? `${portfolioData.totalReturn.toFixed(4)} Flow` : '••••••'}
                        </p>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs w-fit">
                          +{portfolioData.returnPercentage.toFixed(2)}%
                        </Badge>
                      </div>
                      <p className="text-green-600 text-xs md:text-sm">Above market average</p>
                    </div>
                    <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <TrendingUp className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">YEARLY INCOME</p>
                      <p className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2 truncate">
                        {balanceVisible ? `${portfolioData.monthlyIncome.toFixed(4)} Flow` : '••••••'}
                      </p>
                      <p className="text-green-600 text-xs md:text-sm">8% yield annually</p>
                    </div>
                    <div className="p-1.5 md:p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <DollarSign className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section - Improved Responsive Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2 border border-gray-200 shadow-sm flex flex-col min-h-[400px] lg:min-h-[500px]">
                <CardHeader className="pb-4 flex-shrink-0">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-lg md:text-xl font-bold text-gray-900">Portfolio Performance</span>
                      <p className="text-gray-600 text-sm">6-month growth trajectory</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600">Live</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-4 md:p-6">
                  <div className="h-full w-full">
                    <PortfolioChart />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm flex flex-col min-h-[400px] lg:min-h-[500px]">
                <CardHeader className="pb-4 flex-shrink-0">
                  <CardTitle>
                    <span className="text-lg md:text-xl font-bold text-gray-900">Asset Allocation</span>
                    <p className="text-gray-600 text-sm">Portfolio distribution</p>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-4 md:p-6">
                  <div className="h-full w-full">
                    <AssetAllocationChart />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'portfolio':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Owned Assets</h1>
                <p className="text-gray-600 mt-1">Your tokenized real-world asset portfolio</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <Badge variant="secondary" className="bg-gray-100 text-gray-900 px-3 py-1">
                  <Wallet className="w-4 h-4 mr-2" />
                  {userAssets.length} Assets
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => isConnected && fetchUserAssetsFromBlockchain()}
                  disabled={loading || !isConnected}
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {!isConnected ? (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-600 mb-6">Connect your wallet to view your owned assets</p>
                  <Button onClick={connectWallet} disabled={loading}>
                    <Wallet className="w-4 h-4 mr-2" />
                    {loading ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                </CardContent>
              </Card>
            ) : userAssets.length === 0 ? (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Assets Found</h3>
                  <p className="text-gray-600 mb-6">
                    {loading ? 'Loading your assets...' : 'You don\'t own any tokenized assets yet'}
                  </p>
                  {!loading && (
                    <Button variant="outline" onClick={() => window.open('/marketplace', '_blank')}>
                      <Building className="w-4 h-4 mr-2" />
                      Browse Marketplace
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userAssets.map((asset, index) => {
                  const assetValueETH = parseFloat(ethers.utils.formatEther(asset.price)) * asset.amount; // Convert Wei to U2U
                  const IconComponent = asset.type === 'Real Estate' ? Building : 
                                       asset.type === 'Invoice' ? FileText :
                                       asset.type === 'Commodity' ? Coins : Leaf;
                  
                  return (
                    <motion.div
                      key={asset.tokenId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      onClick={() => openDetailsModal(asset)}
                      className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-200/50 hover:border-gray-300/50 overflow-hidden hover:scale-[1.02]"
                    >
                      <div className="relative overflow-hidden">
                        {asset.image && (
                          <CachedImage
                            src={asset.image}
                            alt={asset.name}
                            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                            assetType={asset.type || 'Real Estate'}
                            tokenId={asset.tokenId}
                          />
                        )}
                        
                        {/* Asset Type Badge */}
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 border border-gray-200/50 flex items-center">
                            <IconComponent className="w-3 h-3 mr-1" />
                            {asset.type}
                          </span>
                        </div>
                        
                        {/* Token ID Badge */}
                        <div className="absolute top-4 right-4">
                          <span className="px-2 py-1 bg-blue-500/90 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-blue-400/50">
                            #{asset.tokenId}
                          </span>
                        </div>
                        
                        {/* Source Badge */}
                        <div className="absolute bottom-4 left-4">
                          <span className={`px-3 py-1 backdrop-blur-sm rounded-full text-xs font-medium border ${
                            asset.source === 'marketplace' 
                              ? 'bg-blue-500/90 text-white border-blue-400/50' 
                              : 'bg-green-500/90 text-white border-green-400/50'
                          }`}>
                            {asset.source === 'marketplace' ? '📊 Marketplace' : '💼 Wallet'}
                          </span>
                        </div>
                        
                        {/* Amount Badge */}
                        <div className="absolute bottom-4 right-4">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 border border-gray-200/50">
                            {asset.amount} tokens
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors line-clamp-1">
                          {asset.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                          {asset.description}
                        </p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-lg font-bold text-blue-600">
                              {assetValueETH.toFixed(4)} Flow
                            </p>
                            <p className="text-xs text-gray-500">Total Value</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">+5.0%</p>
                            <p className="text-xs text-gray-500">Performance</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-xs text-gray-600">Available</span>
                          </div>
                          
                          <div className="flex space-x-2">
                            {/* Show withdraw button only for marketplace assets */}
                            {asset.source === 'marketplace' && (
                              <button 
                                className="px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-md hover:shadow-lg text-xs font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWithdrawAsset(asset);
                                }}
                              >
                                <Download className="w-3 h-3 mr-1 inline" />
                                Withdraw
                              </button>
                            )}
                            
                            <ComplianceGuard
                              requiresKYC={true}
                              blockingMode={false}
                              customMessage="KYC verification required for P2P trading"
                              onComplianceVerified={() => navigateToTradingTerminal(asset)}
                            >
                              <button 
                                className="px-3 py-1 bg-gradient-to-r from-gray-800 to-black text-white rounded-lg hover:from-gray-900 hover:to-gray-800 transition-all duration-300 shadow-md hover:shadow-lg text-xs font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToTradingTerminal(asset);
                                }}
                              >
                                <DollarSign className="w-3 h-3 mr-1 inline" />
                                Trade
                              </button>
                            </ComplianceGuard>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'income':
        return <YieldIncomeReport />;

      case 'transactions':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Transaction History</h1>
                <p className="text-gray-600 mt-1">View your complete trading and investment history</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fetchTransactionHistory(true)}
                  disabled={transactionLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${transactionLoading ? 'animate-spin' : ''}`} />
                  {transactionLoading ? 'Loading...' : 'Refresh'}
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Transaction Filters */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-gray-100 text-gray-900">All Transactions</Badge>
              <Badge variant="outline">Buys</Badge>
              <Badge variant="outline">Sells</Badge>
              <Badge variant="outline">Dividends</Badge>
            </div>

            {/* Transactions List */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Date</th>
                        <th className="text-left py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Asset</th>
                        <th className="text-left py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Type</th>
                        <th className="text-right py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Amount</th>
                        <th className="text-right py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Price</th>
                        <th className="text-center py-3 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-600 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {transactionLoading ? (
                        // Loading state
                        Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index} className="animate-pulse">
                            <td className="py-3 px-4 md:px-6">
                              <div className="h-4 bg-gray-200 rounded w-20"></div>
                              <div className="h-3 bg-gray-200 rounded w-16 mt-1"></div>
                            </td>
                            <td className="py-3 px-4 md:px-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 rounded-lg"></div>
                                <div className="flex-1">
                                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                                  <div className="h-3 bg-gray-200 rounded w-16 mt-1"></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 md:px-6">
                              <div className="h-6 bg-gray-200 rounded w-12"></div>
                            </td>
                            <td className="py-3 px-4 md:px-6 text-right">
                              <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                            </td>
                            <td className="py-3 px-4 md:px-6 text-right">
                              <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
                            </td>
                            <td className="py-3 px-4 md:px-6 text-center">
                              <div className="h-6 bg-gray-200 rounded w-16 mx-auto"></div>
                            </td>
                          </tr>
                        ))
                      ) : transactionHistory.length === 0 ? (
                        // No transactions state
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500">
                            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No transactions found</p>
                            <p className="text-sm">Your transaction history will appear here once you buy or sell assets.</p>
                          </td>
                        </tr>
                      ) : (
                        // Real transaction data
                        transactionHistory.map((transaction, index) => (
                          <tr key={transaction.hash} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 md:px-6 text-xs md:text-sm text-gray-900">
                              <div>
                                <div className="font-medium">
                                  {new Date(transaction.timestamp).toLocaleDateString()}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {new Date(transaction.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 md:px-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Building className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs md:text-sm font-medium text-gray-900 truncate">
                                    {transaction.assetName}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    Token ID: {transaction.tokenId}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 md:px-6">
                              <Badge 
                                variant={transaction.type === 'buy' ? 'default' : 'secondary'}
                                className={`text-xs ${
                                  transaction.type === 'buy' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}
                              >
                                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 md:px-6 text-right text-xs md:text-sm font-medium text-gray-900">
                              {transaction.amount} {transaction.amount === 1 ? 'token' : 'tokens'}
                            </td>
                            <td className="py-3 px-4 md:px-6 text-right text-xs md:text-sm font-bold text-gray-900">
                              {parseFloat(transaction.price).toFixed(4)} Flow
                              {transaction.platformFee && parseFloat(transaction.platformFee) > 0 && (
                                <div className="text-xs text-gray-500">
                                  Fee: {parseFloat(transaction.platformFee).toFixed(4)} Flow
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 md:px-6 text-center">
                              <Badge 
                                variant="outline" 
                                className={`text-xs cursor-pointer ${
                                  transaction.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                                  'bg-red-50 text-red-700 border-red-200'
                                }`}
                                onClick={() => window.open(`https://arbiscan.io/tx/${transaction.hash}`, '_blank')}
                                title={`View on Arbiscan: ${transaction.hash}`}
                              >
                                {transaction.status === 'success' ? 'Success' : 'Failed'}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Load More */}
                <div className="border-t border-gray-200 p-4 md:p-6 text-center">
                  <Button variant="outline" size="sm">
                    Load More Transactions
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">TOTAL BOUGHT</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        {calculateTransactionStats().totalBought.toFixed(4)} Flow
                      </p>
                      <p className="text-gray-500 text-xs md:text-sm mt-1">
                        {calculateTransactionStats().buyTransactions} transactions
                      </p>
                    </div>
                    <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                      <ArrowUpRight className="w-5 md:w-6 h-5 md:h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">TOTAL SOLD</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        {calculateTransactionStats().totalSold.toFixed(4)} Flow
                      </p>
                      <p className="text-gray-500 text-xs md:text-sm mt-1">
                        {calculateTransactionStats().sellTransactions} transactions
                      </p>
                    </div>
                    <div className="p-2 md:p-3 bg-red-100 rounded-lg">
                      <ArrowDownRight className="w-5 md:w-6 h-5 md:h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">DIVIDEND INCOME</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        {calculateTransactionStats().dividendIncome.toFixed(4)} Flow
                      </p>
                      <p className="text-gray-500 text-xs md:text-sm mt-1">
                        Estimated annual return (8%)
                      </p>
                    </div>
                    <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                      <DollarSign className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-gray-600 mt-1">Manage your account and preferences</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={fetchUserProfile}
                  disabled={profileLoading}
                  variant="outline" 
                  className="w-fit"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${profileLoading ? 'animate-spin' : ''}`} />
                  Refresh Profile
                </Button>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white w-fit">
                  <Settings className="w-4 h-4 mr-2" />
                  Advanced Settings
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Info Card */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-900 rounded-lg">
                      <User className="w-5 md:w-6 h-5 md:h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-lg md:text-2xl font-bold text-gray-900">Profile Information</span>
                      <p className="text-gray-600 text-sm">Your account details</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profileLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                      <span className="text-gray-600">Loading profile...</span>
                    </div>
                  ) : profileError ? (
                    <div className="text-center p-8">
                      <div className="text-red-500 mb-4">
                        <User className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-semibold">Failed to load profile</p>
                        <p className="text-sm text-gray-600">{profileError}</p>
                      </div>
                      <Button 
                        onClick={fetchUserProfile}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <div className="relative">
                          <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-gray-200">
                            <AvatarImage src={profileData?.profilePicture || "/placeholder-avatar.jpg"} />
                            <AvatarFallback className="bg-gray-900 text-white text-xl md:text-2xl font-bold">
                              {profileData?.firstName?.charAt(0) || user?.firstName?.charAt(0) || 'U'}
                              {profileData?.lastName?.charAt(0) || user?.lastName?.charAt(0) || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-2 -right-2 p-1.5 md:p-2 bg-green-500 rounded-full shadow-lg">
                            <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                        </div>
                        <div className="space-y-2 text-center sm:text-left">
                          <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                            {profileData?.fullName || `${profileData?.firstName || user?.firstName || 'Unknown'} ${profileData?.lastName || user?.lastName || 'User'}`}
                          </h3>
                          <p className="text-gray-600">
                            {profileData?.primaryRole === 'admin' ? 'Administrator' :
                             profileData?.primaryRole === 'issuer' ? 'Asset Issuer' :
                             profileData?.primaryRole === 'manager' ? 'Portfolio Manager' :
                             'Premium Account Holder'}
                          </p>
                          <Badge className={`${
                            profileData?.isVerified || user?.isVerified ? 
                            'bg-green-50 text-green-700 border-green-200' : 
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            <Star className="w-3 h-3 mr-1" />
                            {profileData?.isVerified || user?.isVerified ? 'Verified Investor' : 'Pending Verification'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">Email Address</p>
                              <p className="text-gray-600 text-sm">{profileData?.email || user?.email || 'Not provided'}</p>
                            </div>
                            <Badge variant="outline" className={`${
                              profileData?.isVerified || user?.isVerified ? 
                              'bg-green-50 text-green-700 border-green-200' : 
                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>
                              {profileData?.isVerified || user?.isVerified ? 'Verified' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">Phone Number</p>
                              <p className="text-gray-600 text-sm">{profileData?.phone || 'Not provided'}</p>
                            </div>
                            <Badge variant="outline" className={`${
                              profileData?.phone ? 
                              'bg-green-50 text-green-700 border-green-200' : 
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {profileData?.phone ? 'Provided' : 'Not Set'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">Wallet Address</p>
                              <p className="text-gray-600 text-sm font-mono break-all">
                                {profileData?.walletAddress || user?.walletAddress || address || 'Not connected'}
                              </p>
                            </div>
                            <Badge variant="outline" className={`${
                              profileData?.walletAddress || user?.walletAddress || address ? 
                              'bg-blue-50 text-blue-700 border-blue-200' : 
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {profileData?.walletAddress || user?.walletAddress || address ? 'Connected' : 'Not Connected'}
                            </Badge>
                          </div>
                        </div>
                        
                        {profileData?.address && (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">Address</p>
                                <p className="text-gray-600 text-sm">
                                  {[
                                    profileData.address.street,
                                    profileData.address.city,
                                    profileData.address.state,
                                    profileData.address.country
                                  ].filter(Boolean).join(', ') || 'Not provided'}
                                  {profileData.address.zipCode && ` ${profileData.address.zipCode}`}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Address Set
                              </Badge>
                            </div>
                          </div>
                        )}
                        
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">Member Since</p>
                              <p className="text-gray-600 text-sm">
                                {profileData?.createdAt || user?.createdAt ? 
                                  new Date(profileData?.createdAt || user?.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long' 
                                  }) : 
                                  'Unknown'
                                }
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {profileData?.createdAt || user?.createdAt ? 
                                Math.floor((Date.now() - new Date(profileData?.createdAt || user?.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)) + ' months' :
                                'New'
                              }
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Account Stats Card */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-900 rounded-lg">
                      <BarChart3 className="w-5 md:w-6 h-5 md:h-6 text-white" />
                    </div>
                    <div>
                      <span className="text-lg md:text-2xl font-bold text-gray-900">Account Statistics</span>
                      <p className="text-gray-600 text-sm">Your investment journey</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 md:p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                      <div className="p-2 bg-green-100 rounded-lg w-fit mx-auto mb-3">
                        <TrendingUp className="w-4 md:w-5 h-4 md:h-5 text-green-600" />
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-green-600">{userAssets.length}</p>
                      <p className="text-green-700 text-xs md:text-sm font-medium">Assets Owned</p>
                    </div>
                    
                    <div className="p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                      <div className="p-2 bg-blue-100 rounded-lg w-fit mx-auto mb-3">
                        <Activity className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-blue-600">{transactionHistory.length}</p>
                      <p className="text-blue-700 text-xs md:text-sm font-medium">Transactions</p>
                    </div>
                    
                    <div className="p-3 md:p-4 bg-orange-50 rounded-lg border border-orange-200 text-center">
                      <div className="p-2 bg-orange-100 rounded-lg w-fit mx-auto mb-3">
                        <Calendar className="w-4 md:w-5 h-4 md:h-5 text-orange-600" />
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-orange-600">
                        {profileData?.createdAt || user?.createdAt ? 
                          Math.floor((Date.now() - new Date(profileData?.createdAt || user?.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)) :
                          0
                        }
                      </p>
                      <p className="text-orange-700 text-xs md:text-sm font-medium">Months Active</p>
                    </div>
                    
                    <div className="p-3 md:p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
                      <div className="p-2 bg-purple-100 rounded-lg w-fit mx-auto mb-3">
                        <Award className="w-4 md:w-5 h-4 md:h-5 text-purple-600" />
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-purple-600">
                        {profileData?.kycStatus === 'approved' || user?.kycStatus === 'approved' ? 'Gold' :
                         profileData?.kycStatus === 'pending' || user?.kycStatus === 'pending' ? 'Silver' : 
                         'Bronze'}
                      </p>
                      <p className="text-purple-700 text-xs md:text-sm font-medium">Tier Status</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">Investment Level</span>
                      <Badge className="bg-yellow-50 text-orange-700 border-orange-200">
                        <Award className="w-3 h-3 mr-1" />
                        {profileData?.kycStatus === 'approved' || user?.kycStatus === 'approved' ? 'Premium Investor' :
                         profileData?.kycStatus === 'pending' || user?.kycStatus === 'pending' ? 'Standard Investor' : 
                         'Basic Investor'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">KYC Status</span>
                      <Badge variant="outline" className={`${
                        profileData?.kycStatus === 'approved' || user?.kycStatus === 'approved' ? 
                        'bg-green-50 text-green-700 border-green-200' :
                        profileData?.kycStatus === 'pending' || user?.kycStatus === 'pending' ? 
                        'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {profileData?.kycStatus === 'approved' || user?.kycStatus === 'approved' ? 'Approved' :
                         profileData?.kycStatus === 'pending' || user?.kycStatus === 'pending' ? 'Pending' : 
                         'Not Started'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">User Roles</span>
                      <div className="flex gap-1">
                        {(profileData?.roles || user?.roles || []).map((role: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settings & Preferences */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-900 rounded-lg">
                    <Settings className="w-5 md:w-6 h-5 md:h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-lg md:text-2xl font-bold text-gray-900">Preferences & Settings</span>
                    <p className="text-gray-600 text-sm">Customize your experience</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 text-base md:text-lg">Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Email Notifications</p>
                          <p className="text-sm text-gray-600">Receive updates via email</p>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative ${
                          profileData?.preferences?.notifications?.email !== false ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${
                            profileData?.preferences?.notifications?.email !== false ? 'right-0.5' : 'left-0.5'
                          }`}></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Push Notifications</p>
                          <p className="text-sm text-gray-600">Real-time alerts</p>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative ${
                          profileData?.preferences?.notifications?.push ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${
                            profileData?.preferences?.notifications?.push ? 'right-0.5' : 'left-0.5'
                          }`}></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">SMS Notifications</p>
                          <p className="text-sm text-gray-600">Text message alerts</p>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative ${
                          profileData?.preferences?.notifications?.sms ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${
                            profileData?.preferences?.notifications?.sms ? 'right-0.5' : 'left-0.5'
                          }`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 text-base md:text-lg">Account Settings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Currency Preference</p>
                          <p className="text-sm text-gray-600">Display currency</p>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {profileData?.preferences?.currency || 'USD'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Language</p>
                          <p className="text-sm text-gray-600">Interface language</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {profileData?.preferences?.language === 'en' ? 'English' :
                           profileData?.preferences?.language === 'es' ? 'Spanish' :
                           profileData?.preferences?.language === 'fr' ? 'French' :
                           'English'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">Last Login</p>
                          <p className="text-sm text-gray-600">Last active session</p>
                        </div>
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          {profileData?.lastLogin || user?.lastLogin ? 
                            new Date(profileData?.lastLogin || user?.lastLogin).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 
                            'Unknown'
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Trading Notifications</h1>
                <p className="text-gray-600 mt-1">
                  Your escrow status, order updates, and trading activities
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {unreadNotifications} unread
                  </span>
                </div>
                {unreadNotifications > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={markAllNotificationsAsRead}
                  >
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-0">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Your trading activities, escrow status, and order updates will appear here.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => setActiveSection('transactions')}
                    >
                      View Transaction History
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 md:p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-blue-50/30 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className={`p-2 rounded-lg ${
                                notification.type === 'order_created' ? 'bg-blue-100' :
                                notification.type === 'order_filled' ? 'bg-green-100' :
                                notification.type === 'order_cancelled' ? 'bg-red-100' :
                                notification.type === 'escrow_released' ? 'bg-yellow-100' :
                                'bg-gray-100'
                              }`}>
                                {notification.type === 'order_created' && (
                                  <Activity className={`w-4 h-4 ${
                                    notification.orderData?.orderType === 'buy' ? 'text-blue-600' : 'text-orange-600'
                                  }`} />
                                )}
                                {notification.type === 'order_filled' && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                                {notification.type === 'trade_completed' && (
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                )}
                                {notification.type === 'escrow_released' && (
                                  <Unlock className="w-4 h-4 text-yellow-600" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                                  {notification.title}
                                </h4>
                                <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                              </div>
                            </div>

                            {/* Order Details */}
                            {notification.orderData && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-sm">
                                  <div>
                                    <p className="font-medium text-gray-600">Asset</p>
                                    <p className="text-gray-900 truncate">{notification.orderData.assetName}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-600">Amount</p>
                                    <p className="text-gray-900">{notification.orderData.amount} tokens</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-600">Price</p>
                                    <p className="text-gray-900">{notification.orderData.price} Flow</p>
                                  </div>
                                  {notification.orderData.escrowAmount && (
                                    <div>
                                      <p className="font-medium text-gray-600">Escrow</p>
                                      <p className="text-gray-900">{notification.orderData.escrowAmount} Flow</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-4">
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              notification.status === 'completed' ? 'bg-green-100 text-green-800' :
                              notification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {notification.status}
                            </div>
                            
                            <div className="text-xs text-gray-500">
                              {new Date(notification.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>

                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>

                        {/* Transaction Hash Link */}
                        {notification.transactionHash && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://www.flowscan.io/tx/${notification.transactionHash}`, '_blank');
                              }}
                              className="text-xs"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Transaction
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">ACTIVE ORDERS</p>
                      <p className="text-xl md:text-2xl font-bold text-blue-600">
                        {notifications.filter(n => n.status === 'pending' && n.type === 'order_created').length}
                      </p>
                    </div>
                    <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                      <Activity className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">COMPLETED TRADES</p>
                      <p className="text-xl md:text-2xl font-bold text-green-600">
                        {notifications.filter(n => n.status === 'completed').length}
                      </p>
                    </div>
                    <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 md:w-6 h-5 md:h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">FUNDS ESCROWED</p>
                      <p className="text-xl md:text-2xl font-bold text-yellow-600">
                        {notifications
                          .filter(n => n.status === 'pending' && n.orderData?.escrowAmount)
                          .reduce((sum, n) => sum + parseFloat(n.orderData?.escrowAmount || '0'), 0)
                          .toFixed(4)} Flow
                      </p>
                    </div>
                    <div className="p-2 md:p-3 bg-yellow-100 rounded-lg">
                      <Lock className="w-5 md:w-6 h-5 md:h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {SIDEBAR_ITEMS.find(item => item.id === activeSection)?.label}
            </h1>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <p className="text-gray-600">This section is coming soon...</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        className={`fixed left-0 top-0 h-full shadow-lg z-50 transition-all duration-300 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'
        } ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        initial={false}
        animate={{ 
          width: sidebarCollapsed ? 64 : 256
        }}
      >
        {/* Logo */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-gray-100' : 'bg-gray-900'
              }`}>
                <Home className={`w-5 h-5 ${darkMode ? 'text-gray-900' : 'text-white'}`} />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>AssetDash</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Portfolio Manager</p>
                </div>
              )}
            </div>
            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <div className="space-y-2">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileMenuOpen(false); // Close mobile menu when item is selected
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors relative ${
                  activeSection === item.id
                    ? `${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`
                    : `${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
                }`}
              >
                <item.icon className="w-5 h-5" />
                {!sidebarCollapsed && (
                  <span className="font-medium flex-1 text-left">{item.label}</span>
                )}
                {!sidebarCollapsed && item.id === 'notifications' && unreadNotifications > 0 && (
                  <div className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </div>
                )}
                {sidebarCollapsed && item.id === 'notifications' && unreadNotifications > 0 && (
                  <div className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </div>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Collapse Button - Desktop Only */}
        <div className="absolute bottom-4 left-4 right-4 hidden lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full justify-center hover:bg-gray-100"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } ml-0`}>
        {/* Header */}
        <header className={`border-b px-4 md:px-6 py-4 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Welcome back,</p>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Investor'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Wallet Connection */}
              {!isConnected ? (
                <Button 
                  onClick={connectWallet}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">Connected</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUserAssetsFromBlockchain()}
                    disabled={loading}
                    className="hidden md:flex"
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setDarkMode(!darkMode)}
                className={`hidden md:flex ${
                  darkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Lightbulb className={`w-5 h-5 ${darkMode ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <Settings className="w-5 h-5" />
              </Button>
              <Separator orientation="vertical" className="h-6 hidden md:block" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-600 hover:text-red-700"
                onClick={() => navigate('/marketplace')}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`p-4 md:p-6 ${darkMode ? 'bg-gray-900' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className={darkMode ? 'text-white' : ''}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Asset Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <span>Asset Details</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAssetForDetails && (
            <div className="space-y-6">
              {/* Asset Image */}
              <div className="w-full h-48 rounded-lg overflow-hidden">
                <CachedImage
                  src={selectedAssetForDetails.image}
                  alt={selectedAssetForDetails.name}
                  className="w-full h-full object-cover"
                  assetType={selectedAssetForDetails.type || 'Real Estate'}
                  tokenId={selectedAssetForDetails.tokenId}
                />
              </div>

              {/* Basic Info */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedAssetForDetails.name}</h3>
                <p className="text-gray-600 leading-relaxed">{selectedAssetForDetails.description}</p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">TOKEN ID</p>
                  <p className="text-lg font-bold text-gray-900">#{selectedAssetForDetails.tokenId}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">OWNED TOKENS</p>
                  <p className="text-lg font-bold text-blue-600">{selectedAssetForDetails.amount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">PRICE PER TOKEN</p>
                  <p className="text-lg font-bold text-green-600">
                    {parseFloat(ethers.utils.formatEther(selectedAssetForDetails.price)).toFixed(6)} Flow
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-1">TOTAL VALUE</p>
                  <p className="text-lg font-bold text-green-600">
                    {(parseFloat(ethers.utils.formatEther(selectedAssetForDetails.price)) * selectedAssetForDetails.amount).toFixed(6)} Flow
                  </p>
                </div>
              </div>

              {/* Asset Attributes */}
              {selectedAssetForDetails.attributes && selectedAssetForDetails.attributes.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Asset Properties</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedAssetForDetails.attributes.map((attr, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm font-medium text-blue-700">{attr.trait_type}:</span>
                        <span className="text-sm font-bold text-blue-900">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blockchain Info */}
              <div className="bg-gray-900 text-white p-4 rounded-lg">
                <h4 className="text-lg font-semibold mb-3 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Blockchain Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Contract:</span>
                    <span className="font-mono bg-gray-800 px-2 py-1 rounded">
                      {selectedAssetForDetails.seller.substring(0, 10)}...{selectedAssetForDetails.seller.substring(selectedAssetForDetails.seller.length - 8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Asset Type:</span>
                    <span className="font-medium">{selectedAssetForDetails.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Network:</span>
                    <span className="font-medium">Flow Mainnet </span>
                  </div>
                  {selectedAssetForDetails.metadataURI && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Metadata:</span>
                      <span className="font-mono bg-gray-800 px-2 py-1 rounded text-xs">IPFS</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Performance & Yield
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-green-700 font-medium">Current Performance</p>
                    <p className="text-xl font-bold text-green-600">+5.2%</p>
                    <p className="text-xs text-green-600">Since purchase</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-700 font-medium">Estimated Yearly Yield</p>
                    <p className="text-xl font-bold text-green-600">8.0%</p>
                    <p className="text-xs text-green-600">Based on asset type</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-700 font-medium">Monthly Income</p>
                    <p className="text-xl font-bold text-green-600">
                      {((parseFloat(ethers.utils.formatEther(selectedAssetForDetails.price)) * selectedAssetForDetails.amount) * 0.08 / 12).toFixed(6)} S
                    </p>
                    <p className="text-xs text-green-600">Estimated</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setDetailsModalOpen(false)}
                >
                  Close
                </Button>
                <ComplianceGuard
                  requiresKYC={true}
                  blockingMode={false}
                  customMessage="KYC verification required for P2P trading"
                  onComplianceVerified={() => {
                    setDetailsModalOpen(false);
                    openSecondaryMarketplace(selectedAssetForDetails!);
                  }}
                >
                  <Button 
                    variant="default" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setDetailsModalOpen(false);
                      navigateToTradingTerminal(selectedAssetForDetails!);
                    }}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Trade P2P
                  </Button>
                </ComplianceGuard>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sell Asset Modal */}
      <Dialog open={sellModalOpen} onOpenChange={setSellModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              <span>Sell Asset</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAsset && (
            <div className="space-y-4">
              {/* Asset Info */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Building className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedAsset.name}</h3>
                    <p className="text-sm text-gray-600">Token ID: #{selectedAsset.tokenId}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Owned Tokens</p>
                    <p className="font-bold text-gray-900">{selectedAsset.amount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Price per Token</p>
                    <p className="font-bold text-green-600">
                      {(parseFloat(selectedAsset.price) / Math.pow(10, 18)).toFixed(4)} S
                    </p>
                  </div>
                </div>
              </div>

              {/* Sell Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="sellAmount">Amount to Sell</Label>
                <Input
                  id="sellAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  min="1"
                  max={selectedAsset.amount.toString()}
                />
                <p className="text-xs text-gray-500">
                  Maximum: {selectedAsset.amount} tokens
                </p>
              </div>

              {/* Transaction Summary with Platform Fee */}
              {sellAmount && parseInt(sellAmount) > 0 && parseInt(sellAmount) <= selectedAsset.amount && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-3">Transaction Summary</h4>
                  {(() => {
                    const amount = parseInt(sellAmount);
                    const tokenPrice = ethers.BigNumber.from(selectedAsset.price);
                    const totalValue = tokenPrice.mul(amount);
                    const platformFee = totalValue.mul(1).div(100); // 1% platform fee
                    const youReceive = totalValue; // User receives the full value
                    
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Selling:</span>
                          <span className="font-medium text-blue-900">{amount} tokens</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Price per token:</span>
                          <span className="font-medium text-blue-900">
                            {parseFloat(ethers.utils.formatEther(tokenPrice)).toFixed(6)} S
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Total value:</span>
                          <span className="font-medium text-blue-900">
                            {parseFloat(ethers.utils.formatEther(totalValue)).toFixed(6)} S
                          </span>
                        </div>
                        <div className="border-t border-blue-200 pt-2">
                          <div className="flex justify-between text-red-600">
                            <span>Platform fee (1%):</span>
                            <span className="font-medium">
                              -{parseFloat(ethers.utils.formatEther(platformFee)).toFixed(6)} S
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-green-600 mt-1">
                            <span>You receive:</span>
                            <span>{parseFloat(ethers.utils.formatEther(youReceive)).toFixed(6)} S</span>
                          </div>
                        </div>
                        <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-xs text-yellow-800">
                            <strong>Note:</strong> You will pay {parseFloat(ethers.utils.formatEther(platformFee)).toFixed(6)} S as platform fee when confirming this transaction.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSellModalOpen(false)}
                  disabled={sellLoading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={sellAsset}
                  disabled={sellLoading || !sellAmount || parseInt(sellAmount) <= 0 || parseInt(sellAmount) > selectedAsset.amount}
                >
                  {sellLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Selling...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Sell {sellAmount || '0'} Tokens
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Secondary Marketplace for P2P Trading */}
      {secondaryMarketOpen && selectedTokenForTrading && (
        <SecondaryMarketplace
          selectedToken={{
            tokenId: selectedTokenForTrading.tokenId.toString(),
            name: selectedTokenForTrading.name,
            symbol: selectedTokenForTrading.name.substring(0, 4).toUpperCase(), // Create a symbol from name
            currentPrice: parseFloat(ethers.utils.formatEther(selectedTokenForTrading.price)),
            priceChange24h: 0, // Default value - could be fetched from API later
            volume24h: selectedTokenForTrading.amount * parseFloat(ethers.utils.formatEther(selectedTokenForTrading.price)), // Approximate volume
            marketCap: 0, // Default value - would need total supply data
            totalSupply: 0, // Default value - would need to fetch from contract
            userBalance: selectedTokenForTrading.amount
          }}
          onClose={() => {
            setSecondaryMarketOpen(false);
            setSelectedTokenForTrading(null);
          }}
          userWallet={address || ''}
        />
      )}
    </div>
  );
};

export default Dashboard;
