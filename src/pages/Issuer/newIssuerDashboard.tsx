import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'react-hot-toast';
import { FileText, Plus, Clock, CheckCircle, XCircle, Rocket, Package, AlertTriangle } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

// ❌ OLD: Flow blockchain services (COMMENTED OUT - NOT DELETED)
// import TokenManagementService from '../../services/tokenManagementService';
// import DirectMarketplaceListingService from '../../services/directMarketplaceListingService';
// import RobustAuthorizationService from '../../services/robustAuthorizationService';
// import { ADMIN_CONTRACT, TOKEN_CONTRACT, MARKETPLACE_CONTRACT, TOKEN_MANAGEMENT_CONTRACT, ISSUER_CONTRACT } from '../../lib/contractAddress';

// ✅ NEW: Story Protocol SDK and services
import { storyProtocolService } from '../../services/storyProtocolService';
import { STORY_CONFIG, SIMILARITY_THRESHOLDS } from '../../lib/storyProtocolConfig';

// ❌ OLD: Pinata IPFS upload (NO LONGER USED - Backend handles IPFS uploads)
// import { uploadJSONToPinata, uploadToPinata } from '../../utils/pinata';

// Invoice Financing Components
import TokenStatusCard from '../../components/invoice-financing/investor/TokenStatusCard';
import PortfolioSettlements from '../../components/invoice-financing/investor/PortfolioSettlements';

// ❌ OLD: Real estate/invoice asset types
// const assetTypes = ['Invoice'];

// ✅ NEW: IP asset types for Story Protocol
const assetTypes = ['Text', 'Image', 'Video', 'Audio'];

// ❌ OLD: Flow blockchain token request interface
// interface TokenRequest {
//   requestId: string;
//   issuer: string;
//   metadataURI: string;
//   amount: string;
//   price: string;
//   status: 'Pending' | 'Approved' | 'Rejected' | 'Deployed' | 'Listed';
//   submittedAt: Date;
//   approvedAt?: Date;
//   deployedAt?: Date;
//   tokenId?: string;
//   rejectionReason?: string;
// }

// ✅ NEW: Story Protocol IP registration interface
interface IPRegistration {
  ipId: string;
  creator: string;
  title: string;
  ipType: 'Text' | 'Image' | 'Video' | 'Audio';
  contentHash: string;
  ipfsCid: string;
  metadataURI: string;
  licenseTermsId?: string;
  royaltyRate: number;
  status: 'Registered' | 'Derivative' | 'Pending_Review';
  registeredAt: Date;
  tokenId?: string;
  txHash?: string;
}

const NewIssuerDashboard: React.FC = () => {
  const { address, isConnected, connectWallet, provider, signer } = useWallet();

  // ❌ OLD: Flow blockchain service states (COMMENTED OUT)
  // const [tokenManagementService, setTokenManagementService] = useState(null);
  // const [directListingService, setDirectListingService] = useState(null);
  // const [authService, setAuthService] = useState(null);
  // const [legacyIssuerService, setLegacyIssuerService] = useState(null);
  // const [isServiceInitialized, setIsServiceInitialized] = useState(false);

  // ✅ NEW: Story Protocol SDK initialization state
  const [isStorySDKInitialized, setIsStorySDKInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Authorization (keep similar structure)
  const [isAuthorizedCreator, setIsAuthorizedCreator] = useState<boolean | null>(null);
  const [authCheckLoading, setAuthCheckLoading] = useState(false);

  // Current view
  const [activeTab, setActiveTab] = useState('dashboard');

  // ❌ OLD: Token requests state (COMMENTED OUT)
  // const [tokenRequests, setTokenRequests] = useState<TokenRequest[]>([]);
  // const [loadingRequests, setLoadingRequests] = useState(false);

  // ✅ NEW: IP registrations state
  const [ipRegistrations, setIpRegistrations] = useState<IPRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  // ❌ OLD: Request submission form (COMMENTED OUT - will replace)
  // const [showRequestDialog, setShowRequestDialog] = useState(false);
  // const [requestForm, setRequestForm] = useState({
  //   title: '',
  //   description: '',
  //   assetType: '',
  //   amount: '',
  //   pricePerToken: '',
  //   imageFiles: [] as File[]
  // });

  // ✅ NEW: IP registration form
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    title: '',
    description: '',
    ipType: '',
    royaltyPercent: '10',
    contentFiles: [] as File[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ NEW: Derivative detection state
  const [showDerivativeDialog, setShowDerivativeDialog] = useState(false);
  const [detectedParent, setDetectedParent] = useState<any>(null);
  const [similarityScore, setSimilarityScore] = useState(0);
  const [currentContentHash, setCurrentContentHash] = useState('');

  // ❌ OLD: Initialize Flow blockchain services (COMMENTED OUT)
  // useEffect(() => {
  //   const initializeService = async () => {
  //     if (!isConnected || !address || !signer) {
  //       setIsAuthorizedIssuer(null);
  //       setIsServiceInitialized(false);
  //       return;
  //     }
  //     setAuthCheckLoading(true);
  //     console.log('🔄 Initializing TokenManagement service...');
  //     try {
  //       const service = new TokenManagementService();
  //       await service.initialize(signer.provider, { ... });
  //       // ... (Flow service initialization code)
  //     } catch (error) {
  //       console.error('❌ Failed to initialize TokenManagement service:', error);
  //     }
  //   };
  //   initializeService();
  // }, [isConnected, address, signer]);

  // ✅ NEW: Initialize Story Protocol SDK
  useEffect(() => {
    const initializeStoryProtocol = async () => {
      if (!isConnected || !address || !signer) {
        setIsAuthorizedCreator(null);
        setIsStorySDKInitialized(false);
        return;
      }

      setIsInitializing(true);
      setAuthCheckLoading(true);
      console.log('🔄 Initializing Story Protocol SDK...');

      try {
        // Initialize Story Protocol SDK with user's wallet
        await storyProtocolService.initialize(address, signer);

        setIsStorySDKInitialized(true);

        // For MVP: Auto-approve all connected users as creators
        // Later: Can add backend API check or on-chain registry
        const isAuthorized = true; // For now, all users can be creators
        setIsAuthorizedCreator(isAuthorized);

        if (isAuthorized) {
          console.log('✅ Story Protocol SDK initialized successfully');
          toast.success('Welcome, Creator! Ready to register IP assets.');

          // Load user's registered IP assets from backend cache
          await loadIPRegistrations();
        }

      } catch (error: any) {
        console.error('❌ Failed to initialize Story Protocol SDK:', error);
        toast.error(`Failed to connect to Story Protocol: ${error.message}`);
        setIsAuthorizedCreator(false);
        setIsStorySDKInitialized(false);
      } finally {
        setIsInitializing(false);
        setAuthCheckLoading(false);
      }
    };

    initializeStoryProtocol();
  }, [isConnected, address, signer]);

  // ❌ OLD: Load token requests from Flow blockchain (COMMENTED OUT)
  // const loadTokenRequests = async (service?: TokenManagementService) => {
  //   const serviceToUse = service || tokenManagementService;
  //   if (!serviceToUse) return;
  //   setLoadingRequests(true);
  //   try {
  //     const requests = await serviceToUse.getMyRequests();
  //     setTokenRequests(requests);
  //     console.log('📋 Loaded token requests:', requests);
  //   } catch (error) {
  //     console.error('❌ Failed to load token requests:', error);
  //     toast.error('Failed to load your token requests');
  //   } finally {
  //     setLoadingRequests(false);
  //   }
  // };

  // ✅ NEW: Load IP registrations from backend cache
  const loadIPRegistrations = async () => {
    if (!address) return;

    setLoadingRegistrations(true);
    try {
      // Call backend API to get cached IP registrations
      const response = await fetch(`/api/assets?walletAddress=${address}`);

      if (!response.ok) {
        throw new Error('Failed to fetch IP registrations');
      }

      const data = await response.json();
      setIpRegistrations(data);
      console.log('📋 Loaded IP registrations:', data);
    } catch (error: any) {
      console.error('❌ Failed to load IP registrations:', error);
      // Don't show error toast if backend not ready (for development)
      if (error.message !== 'Failed to fetch') {
        toast.error('Failed to load your IP registrations');
      }
    } finally {
      setLoadingRegistrations(false);
    }
  };

  // ❌ OLD: Handle Flow blockchain token request submission (COMMENTED OUT)
  // const handleSubmitRequest = async () => {
  //   if (!tokenManagementService || !requestForm.title || !requestForm.amount || !requestForm.pricePerToken) {
  //     toast.error('Please fill in all required fields');
  //     return;
  //   }
  //   setIsSubmitting(true);
  //   try {
  //     // Upload metadata to IPFS
  //     const metadataHash = await uploadJSONToPinata(metadata);
  //     const metadataURI = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
  //     // Submit token request for approval
  //     const result = await tokenManagementService.submitTokenRequest(...);
  //     toast.success('🎉 Token request submitted for admin approval!');
  //     await loadTokenRequests();
  //   } catch (error) {
  //     console.error('❌ Failed to submit token request:', error);
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  // ✅ NEW: Handle Story Protocol IP registration
  const handleRegisterIP = async () => {
    if (!registerForm.title || !registerForm.ipType || !registerForm.contentFiles.length) {
      toast.error('Please fill in all required fields and upload content');
      return;
    }

    if (!isStorySDKInitialized) {
      toast.error('Story Protocol SDK not initialized. Please reconnect wallet.');
      return;
    }

    setIsSubmitting(true);
    try {
      // STEP 1: Upload content to backend for fingerprinting + IPFS metadata upload
      console.log('🔄 Step 1: Fingerprinting content and uploading to IPFS...');
      const formData = new FormData();

      // File content
      formData.append('file', registerForm.contentFiles[0]);

      // IP Asset metadata
      formData.append('title', registerForm.title);
      formData.append('description', registerForm.description || '');
      formData.append('walletAddress', address!);
      formData.append('ipType', registerForm.ipType);
      formData.append('royaltyPercent', registerForm.royaltyPercent);

      // Additional metadata attributes for IPFS
      const metadataAttributes = JSON.stringify([
        { trait_type: 'IP Type', value: registerForm.ipType },
        { trait_type: 'Royalty Rate', value: `${registerForm.royaltyPercent}%` },
        { trait_type: 'Creator', value: address },
        { trait_type: 'Blockchain', value: 'Story Protocol' },
        { trait_type: 'Network', value: STORY_CONFIG.name }
      ]);
      formData.append('attributes', metadataAttributes);

      const fingerprintResponse = await fetch('/api/fingerprint', {
        method: 'POST',
        body: formData
      });

      if (!fingerprintResponse.ok) {
        throw new Error('Failed to fingerprint content');
      }

      const {
        hash,
        ipfsCid,
        ipMetadataURI,
        ipMetadataHash,
        nftMetadataURI,
        nftMetadataHash
      } = await fingerprintResponse.json();

      console.log('✅ Content fingerprinted and metadata uploaded:', {
        hash,
        ipfsCid,
        ipMetadataURI
      });

      // STEP 2: Check similarity against existing IPs
      console.log('🔄 Step 2: Checking similarity...');
      const similarityResponse = await fetch('/api/check-similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentHash: hash })
      });

      if (!similarityResponse.ok) {
        throw new Error('Failed to check similarity');
      }

      const { score, status, isMatch, parentIpId, parentMetadata } = await similarityResponse.json();
      console.log('🔍 Similarity check:', { score, status });

      // STEP 3: Branch logic based on similarity score
      if (score >= SIMILARITY_THRESHOLDS.DERIVATIVE) {
        // Score >= 90%: FORCE DERIVATIVE REGISTRATION
        console.log('🛑 Derivative detected (score >= 90%)');
        setCurrentContentHash(hash);
        setSimilarityScore(score);
        setDetectedParent(parentMetadata);
        setShowDerivativeDialog(true);
        setIsSubmitting(false);
        return;
      } else if (score >= SIMILARITY_THRESHOLDS.REVIEW_REQUIRED) {
        // Score 70-90%: SEND TO ADMIN REVIEW
        console.log('⚠️ Admin review required (score 70-90%)');
        await fetch('/api/disputes/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submittedBy: address,
            contentHash: hash,
            contentTitle: registerForm.title,
            contentDescription: registerForm.description,
            ipType: registerForm.ipType,
            ipfsCid: ipfsCid,
            parentIpId: parentIpId,
            parentContentHash: parentMetadata?.contentHash,
            parentTitle: parentMetadata?.title,
            similarityScore: score,
            // Include metadata URIs for potential approval
            ipMetadataURI: ipMetadataURI,
            ipMetadataHash: ipMetadataHash,
            nftMetadataURI: nftMetadataURI,
            nftMetadataHash: nftMetadataHash
          })
        });
        toast('⏳ Content sent for admin review due to similarity.', {
          icon: 'ℹ️',
          duration: 5000
        });
        setIsSubmitting(false);
        setShowRegisterDialog(false);
        return;
      } else if (score >= SIMILARITY_THRESHOLDS.WARNING) {
        // Score 40-70%: SHOW WARNING, LET USER PROCEED
        console.log('⚠️ Similarity warning (score 40-70%)');
        const proceed = window.confirm(
          `⚠️ Similar content found (${score}% match).\n\nAre you sure this is your original work?`
        );
        if (!proceed) {
          setIsSubmitting(false);
          return;
        }
      }

      // STEP 4: Register IP on Story Protocol
      // Metadata is already uploaded to IPFS by backend, use returned URIs
      console.log('🔄 Step 3: Registering IP on Story Protocol...');
      const ipMetadata = {
        ipMetadataURI: ipMetadataURI,
        ipMetadataHash: ipMetadataHash as `0x${string}`,
        nftMetadataURI: nftMetadataURI,
        nftMetadataHash: nftMetadataHash as `0x${string}`
      };

      const result = await storyProtocolService.registerIpAssetWithLicense(
        ipMetadata,
        parseInt(registerForm.royaltyPercent)
      );

      console.log('✅ IP registered on Story Protocol:', result);

      // STEP 5: Send results to backend for caching
      console.log('🔄 Step 4: Caching registration in backend...');
      await fetch('/api/cache/ip-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentHash: hash,
          ipfsCid: ipfsCid,
          walletAddress: address,
          storyIpId: result.ipId,
          tokenId: result.tokenId.toString(),
          licenseTermsId: result.licenseTermsId.toString(),
          txHash: result.txHash,
          title: registerForm.title,
          description: registerForm.description,
          ipType: registerForm.ipType,
          royaltyPercent: parseInt(registerForm.royaltyPercent),
          commercialRevShare: parseInt(registerForm.royaltyPercent) * 100,
          metadata: {
            ipMetadataURI: ipMetadataURI,
            ipMetadataHash: ipMetadataHash,
            nftMetadataURI: nftMetadataURI,
            nftMetadataHash: nftMetadataHash
          }
        })
      });

      toast.success('🎉 IP Asset registered successfully!');
      console.log('✅ Registration complete and cached');

      // Reset form and reload registrations
      setRegisterForm({
        title: '',
        description: '',
        ipType: '',
        royaltyPercent: '10',
        contentFiles: []
      });
      setShowRegisterDialog(false);
      await loadIPRegistrations();

    } catch (error: any) {
      console.error('❌ Failed to register IP:', error);
      toast.error(`Failed to register IP: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================
  // ✅ NEW: Handle Derivative Registration (Similarity >= 90%)
  // ========================================

  /**
   * Register content as derivative when similarity score >= 90%
   * User is forced to link to parent IP
   */
  const handleRegisterAsDerivative = async () => {
    if (!currentContentHash || !detectedParent) {
      toast.error('Missing derivative information');
      return;
    }

    setIsSubmitting(true);
    try {
      // STEP 1: Upload derivative metadata to IPFS via backend
      console.log('🔄 Step 1: Uploading derivative metadata to IPFS...');
      const derivativeMetadataResponse = await fetch('/api/upload-derivative-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: registerForm.title,
          description: registerForm.description,
          ipType: registerForm.ipType,
          contentHash: currentContentHash,
          walletAddress: address,
          isDerivative: true,
          parentIpId: detectedParent.ipId,
          similarityScore: similarityScore,
          attributes: [
            { trait_type: 'IP Type', value: registerForm.ipType },
            { trait_type: 'Is Derivative', value: 'true' },
            { trait_type: 'Parent IP', value: detectedParent.ipId },
            { trait_type: 'Parent Title', value: detectedParent.title },
            { trait_type: 'Similarity Score', value: `${similarityScore}%` },
            { trait_type: 'Creator', value: address },
            { trait_type: 'Blockchain', value: 'Story Protocol' },
            { trait_type: 'Network', value: STORY_CONFIG.name }
          ]
        })
      });

      if (!derivativeMetadataResponse.ok) {
        throw new Error('Failed to upload derivative metadata');
      }

      const {
        ipMetadataURI,
        ipMetadataHash,
        nftMetadataURI,
        nftMetadataHash
      } = await derivativeMetadataResponse.json();

      console.log('✅ Derivative metadata uploaded:', ipMetadataURI);

      // STEP 2: Register derivative IP on Story Protocol (without license)
      console.log('🔄 Step 2: Registering derivative IP on Story Protocol...');
      const ipMetadata = {
        ipMetadataURI: ipMetadataURI,
        ipMetadataHash: ipMetadataHash as `0x${string}`,
        nftMetadataURI: nftMetadataURI,
        nftMetadataHash: nftMetadataHash as `0x${string}`
      };
      const childResult = await storyProtocolService.registerIpAsset(ipMetadata);

      // STEP 3: Link derivative to parent using registerDerivative
      console.log('🔄 Step 3: Linking derivative to parent IP...');
      const parentIpIds = [detectedParent.ipId];
      const licenseTermsIds = [detectedParent.licenseTermsId];

      const derivativeResult = await storyProtocolService.registerDerivative(
        childResult.ipId,
        parentIpIds,
        licenseTermsIds
      );

      console.log('✅ Derivative linked to parent:', derivativeResult.txHash);

      // STEP 4: Cache derivative registration in backend
      console.log('🔄 Step 4: Caching derivative registration...');
      await fetch('/api/cache/derivative-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childIpId: childResult.ipId,
          childTokenId: childResult.tokenId.toString(),
          childTxHash: childResult.txHash,
          parentIpIds: parentIpIds,
          licenseTermsIds: licenseTermsIds,
          linkTxHash: derivativeResult.txHash,
          contentHash: currentContentHash,
          walletAddress: address,
          title: registerForm.title,
          description: registerForm.description,
          ipType: registerForm.ipType,
          similarityScore: similarityScore,
          metadata: {
            ipMetadataURI: ipMetadataURI,
            ipMetadataHash: ipMetadataHash,
            nftMetadataURI: nftMetadataURI,
            nftMetadataHash: nftMetadataHash
          }
        })
      });

      toast.success('🎉 Derivative IP registered and linked to parent!');
      setShowDerivativeDialog(false);
      setRegisterForm({
        title: '',
        description: '',
        ipType: '',
        royaltyPercent: '10',
        contentFiles: []
      });
      setCurrentContentHash('');
      setSimilarityScore(0);
      setDetectedParent(null);
      setShowRegisterDialog(false);
      await loadIPRegistrations();

    } catch (error: any) {
      console.error('❌ Failed to register derivative:', error);
      toast.error(`Failed to register derivative: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================
  // ❌ OLD: Flow blockchain handler functions (COMMENTED OUT)
  // ========================================

  // ❌ OLD: Handle token deployment (Flow blockchain)
  // const handleDeployToken = async (requestId: string) => {
  //   if (!tokenManagementService) return;
  //
  //   try {
  //     console.log('🔄 Deploying approved token...');
  //     const result = await tokenManagementService.deployApprovedToken(requestId);
  //     console.log('✅ Token deployed successfully:', result);
  //     toast.success(`🚀 Token deployed! Token ID: ${result.tokenId}`);
  //     await loadTokenRequests();
  //   } catch (error) {
  //     console.error('❌ Failed to deploy token:', error);
  //     toast.error('Failed to deploy token');
  //   }
  // };

  // ❌ OLD: Handle marketplace listing (Flow blockchain)
  // const handleListOnMarketplace = async (requestId: string, amount: number) => {
  //   if (!directListingService) {
  //     toast.error('Direct listing service not initialized');
  //     return;
  //   }
  //
  //   try {
  //     console.log('🔄 Listing token on marketplace using direct approach...');
  //     console.log('📝 Using successful terminal script method');
  //
  //     const result = await directListingService.listTokenWithAutoApproval(requestId, amount);
  //     console.log('✅ Token listed on marketplace:', result);
  //     toast.success('🎉 Token listed on marketplace successfully!');
  //     await loadTokenRequests();
  //   } catch (error) {
  //     console.error('❌ Failed to list token on marketplace:', error);
  //     toast.error(`Failed to list token: ${error.message}`);
  //   }
  // };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
      case 'Approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'Deployed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Rocket className="w-3 h-3 mr-1" />Deployed</Badge>;
      case 'Listed':
        return <Badge variant="default" className="bg-purple-100 text-purple-800"><Package className="w-3 h-3 mr-1" />Listed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Connect wallet if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to access the issuer dashboard</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={connectWallet} className="w-full">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (authCheckLoading || !isStorySDKInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Initializing Story Protocol SDK...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authorized (should rarely happen in MVP - all users auto-approved)
  if (isAuthorizedCreator === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Not Authorized</CardTitle>
            <CardDescription>Your wallet is not authorized as a creator. Please try reconnecting.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">Wallet: {address}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Creator Dashboard</h1>
          <p className="text-gray-600">Register and manage your IP assets on Story Protocol</p>
          <div className="mt-4">
            <Badge variant="outline" className="mr-2">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </Badge>
            <Badge variant="default">Authorized Creator</Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests">IP Registrations</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="create">Register IP</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total IP Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ipRegistrations.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Registered IPs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {ipRegistrations.filter(r => r.status === 'Registered').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Derivative IPs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {ipRegistrations.filter(r => r.status === 'Derivative').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent IP Registrations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent IP Registrations</CardTitle>
                <CardDescription>Your latest IP assets registered on Story Protocol</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRegistrations ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading IP registrations...</p>
                  </div>
                ) : ipRegistrations.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No IP assets yet</h3>
                    <p className="text-gray-600 mb-4">Register your first IP asset to get started</p>
                    <Button onClick={() => setActiveTab('create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Register IP
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ipRegistrations.slice(0, 5).map((registration) => (
                      <div key={registration.ipId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{registration.title}</p>
                          <p className="text-sm text-gray-600">
                            {registration.ipType} | Royalty: {registration.royaltyRate}%
                          </p>
                          <p className="text-xs text-gray-500">
                            Registered {registration.registeredAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={registration.status === 'Registered' ? 'default' : 'secondary'}
                            className={registration.status === 'Derivative' ? 'bg-blue-100 text-blue-800' : ''}
                          >
                            {registration.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* IP Registrations Tab */}
          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All IP Registrations</CardTitle>
                <CardDescription>Complete history of your IP assets on Story Protocol</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRegistrations ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading IP registrations...</p>
                  </div>
                ) : ipRegistrations.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No IP assets found</h3>
                    <p className="text-gray-600">You haven't registered any IP assets yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ipRegistrations.map((registration) => (
                      <Card key={registration.ipId}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium">{registration.title}</h3>
                                <Badge
                                  variant={registration.status === 'Registered' ? 'default' : 'secondary'}
                                  className={registration.status === 'Derivative' ? 'bg-blue-100 text-blue-800' : ''}
                                >
                                  {registration.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                IP Type: {registration.ipType} | Royalty: {registration.royaltyRate}%
                              </p>
                              <p className="text-xs text-gray-500">
                                Registered: {registration.registeredAt.toLocaleDateString()}
                              </p>
                              {registration.ipId && (
                                <p className="text-xs text-blue-600">
                                  IP ID: {registration.ipId.slice(0, 10)}...{registration.ipId.slice(-8)}
                                </p>
                              )}
                              {registration.tokenId && (
                                <p className="text-xs text-blue-600">Token ID: {registration.tokenId}</p>
                              )}
                              {registration.txHash && (
                                <a
                                  href={`${STORY_CONFIG.blockExplorer}/tx/${registration.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-purple-600 hover:underline"
                                >
                                  View Transaction →
                                </a>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Investment Portfolio</h2>
                  <p className="text-gray-600">Track your token holdings and settlement history</p>
                </div>
              </div>
              
              <PortfolioSettlements />
            </div>
          </TabsContent>

          {/* Register IP Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Register IP Asset</CardTitle>
                <CardDescription>Register your original content on Story Protocol blockchain</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">IP Title *</Label>
                      <Input
                        id="title"
                        value={registerForm.title}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter your IP asset title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ipType">IP Type *</Label>
                      <Select value={registerForm.ipType} onValueChange={(value) => setRegisterForm(prev => ({ ...prev, ipType: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select IP type" />
                        </SelectTrigger>
                        <SelectContent>
                          {assetTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="royaltyPercent">Royalty Percentage (%) *</Label>
                      <Input
                        id="royaltyPercent"
                        type="number"
                        min="0"
                        max="100"
                        value={registerForm.royaltyPercent}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, royaltyPercent: e.target.value }))}
                        placeholder="Enter royalty percentage (default: 10%)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Royalty you'll earn when others create derivatives
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="contentFiles">Upload Content *</Label>
                      <Input
                        id="contentFiles"
                        type="file"
                        accept={
                          registerForm.ipType === 'Text' ? '.txt,.doc,.docx,.pdf' :
                          registerForm.ipType === 'Image' ? 'image/*' :
                          registerForm.ipType === 'Video' ? 'video/*' :
                          registerForm.ipType === 'Audio' ? 'audio/*' :
                          '*'
                        }
                        onChange={(e) => {
                          const files = e.target.files ? Array.from(e.target.files) : [];
                          setRegisterForm(prev => ({ ...prev, contentFiles: files }));
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Upload your original content for fingerprinting
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={registerForm.description}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your IP asset"
                        rows={4}
                      />
                    </div>

                    {/* Info Box */}
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
                      <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li>Your content will be fingerprinted for similarity detection</li>
                        <li>If similar content exists ({'>'}= 90%), you'll register as a derivative</li>
                        <li>Original works are minted as NFTs on Story Protocol</li>
                        <li>License terms allow others to create derivatives with royalties</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setRegisterForm({
                      title: '',
                      description: '',
                      ipType: '',
                      royaltyPercent: '10',
                      contentFiles: []
                    })}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={handleRegisterIP}
                    disabled={isSubmitting || !registerForm.title || !registerForm.ipType || !registerForm.contentFiles.length}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Registering...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Register IP Asset
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ========================================
            ✅ NEW: Derivative Detection Dialog (Similarity >= 90%)
            ======================================== */}
        <Dialog open={showDerivativeDialog} onOpenChange={setShowDerivativeDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-red-600">⚠️ Similar Content Detected</DialogTitle>
              <DialogDescription>
                Your content is {similarityScore}% similar to existing IP. You must register as a derivative.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Parent IP Information */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-3">Parent IP Asset</h3>
                {detectedParent && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Title:</span> {detectedParent.title}
                    </div>
                    <div>
                      <span className="font-medium">IP ID:</span>{' '}
                      <code className="text-xs bg-white px-2 py-1 rounded">
                        {detectedParent.ipId?.slice(0, 10)}...{detectedParent.ipId?.slice(-8)}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Creator:</span>{' '}
                      <code className="text-xs bg-white px-2 py-1 rounded">
                        {detectedParent.creator?.slice(0, 6)}...{detectedParent.creator?.slice(-4)}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">IP Type:</span> {detectedParent.ipType}
                    </div>
                    <div>
                      <span className="font-medium">Royalty Rate:</span> {detectedParent.royaltyRate}%
                    </div>
                  </div>
                )}
              </div>

              {/* Similarity Score */}
              <div className="border rounded-lg p-4 bg-red-50">
                <h3 className="font-medium text-red-900 mb-2">Similarity Analysis</h3>
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="h-3 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${similarityScore}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-bold text-red-600">{similarityScore}%</span>
                </div>
                <p className="text-xs text-red-700 mt-2">
                  Content with {'>'}= 90% similarity must be registered as a derivative work.
                </p>
              </div>

              {/* Derivative Registration Info */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Your work will be registered as a derivative of the parent IP</li>
                  <li>You will automatically inherit the parent's license terms</li>
                  <li>Parent creator will receive {detectedParent?.royaltyRate || 10}% royalty from your earnings</li>
                  <li>You will receive {100 - (detectedParent?.royaltyRate || 10)}% of revenues</li>
                  <li>This creates a transparent on-chain lineage</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDerivativeDialog(false);
                    setCurrentContentHash('');
                    setSimilarityScore(0);
                    setDetectedParent(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegisterAsDerivative}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      Register as Derivative
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default NewIssuerDashboard;