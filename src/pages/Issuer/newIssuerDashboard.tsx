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
import { FileText, Plus, Clock, CheckCircle, XCircle, Rocket, Package } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import TokenManagementService from '../../services/tokenManagementService';
import DirectMarketplaceListingService from '../../services/directMarketplaceListingService';
import { verificationService, MintTokenResponse, BlockedResponse, SimilarityInfo } from '../../services/verificationService';
import RobustAuthorizationService from '../../services/robustAuthorizationService';
import { ADMIN_CONTRACT, TOKEN_CONTRACT, MARKETPLACE_CONTRACT, TOKEN_MANAGEMENT_CONTRACT, ISSUER_CONTRACT } from '../../lib/contractAddress';
import { uploadJSONToIPFS, uploadFileToIPFS } from '../../services/pinataService';
import { getLicenseTermsId, attachLicenseTermsToIp } from '../../services/licenseService';
import { SimilarityWarningModal } from '../../components/SimilarityWarningModal';
import { SimilarityBlockedModal } from '../../components/SimilarityBlockedModal';

// Invoice Financing Components
import TokenStatusCard from '../../components/invoice-financing/investor/TokenStatusCard';
import PortfolioSettlements from '../../components/invoice-financing/investor/PortfolioSettlements';

// Aeneid testnet configuration from TestMinting.tsx
const AENEID_CHAIN_ID = '0x523'; // 1315 in hex
const AENEID_CONFIG = {
  chainId: AENEID_CHAIN_ID,
  chainName: 'Story Aeneid Testnet',
  nativeCurrency: {
    name: 'IP',
    symbol: 'IP',
    decimals: 18,
  },
  rpcUrls: ['https://aeneid.storyrpc.io'],
  blockExplorerUrls: ['https://aeneid.storyscan.xyz'],
};

const assetTypes = [
  'Invoice',
  'Artwork',
  'Codebase',
  'Document',
  'Other'
];

interface TokenRequest {
  requestId: string;
  issuer: string;
  metadataURI: string;
  amount: string;
  price: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Deployed' | 'Listed';
  submittedAt: Date;
  approvedAt?: Date;
  deployedAt?: Date;
  tokenId?: string;
  rejectionReason?: string;
}

const NewIssuerDashboard: React.FC = () => {
  const { address, isConnected, connectWallet, provider, signer } = useWallet();
  
    // Service states
  const [tokenManagementService, setTokenManagementService] = useState(null);
  const [directListingService, setDirectListingService] = useState(null);
  const [authService, setAuthService] = useState(null);
  const [legacyIssuerService, setLegacyIssuerService] = useState(null);
  const [isServiceInitialized, setIsServiceInitialized] = useState(false);
  
  // Authorization
  const [isAuthorizedIssuer, setIsAuthorizedIssuer] = useState<boolean | null>(null);
  const [authCheckLoading, setAuthCheckLoading] = useState(false);
  
  // Current view
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Token requests state
  const [tokenRequests, setTokenRequests] = useState<TokenRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // Request submission form
  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    assetType: 'Document',
    imageFiles: [] as File[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mintingStatus, setMintingStatus] = useState<string>('Ready to Register');

  // Mint token and result storage (for multi-step flow)
  const [mintToken, setMintToken] = useState<MintTokenResponse | null>(null);
  const [mintResult, setMintResult] = useState<{ ipId: string; tokenId: number; txHash: string } | null>(null);

  // Metadata state (stored for reuse in similarity modals)
  const [contentHash, setContentHash] = useState<string>('');
  const [ipMetadataURI, setIpMetadataURI] = useState<string>('');
  const [nftMetadataURI, setNftMetadataURI] = useState<string>('');

  // Similarity detection state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [similarityData, setSimilarityData] = useState<SimilarityInfo | BlockedResponse['similarity'] | null>(null);

  // License configuration state
  const [showLicenseConfig, setShowLicenseConfig] = useState(false);
  const [licenseConfig, setLicenseConfig] = useState({
    type: 'commercial_remix' as 'commercial_remix' | 'non_commercial',
    royaltyPercent: 10
  });
  const [finalResult, setFinalResult] = useState<any>(null);

  // Helper functions from TestMinting.tsx
  const hashContent = (content: string): string => {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
  };

  const switchToAeneid = async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    try {
      // Try to switch to Aeneid network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AENEID_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [AENEID_CONFIG],
        });
      } else {
        throw switchError;
      }
    }
  };

  // Initialize service and check authorization
  

  // Load token requests
  const loadTokenRequests = async (service?: TokenManagementService) => {
    const serviceToUse = service || tokenManagementService;
    if (!serviceToUse) return;
    
    setLoadingRequests(true);
    try {
      const requests = await serviceToUse.getMyRequests();
      setTokenRequests(requests);
      console.log('📋 Loaded token requests:', requests);
    } catch (error) {
      console.error('❌ Failed to load token requests:', error);
      toast.error('Failed to load your token requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  // New handler for direct minting - EXACT FLOW FROM TestMinting.tsx
  const handleRegisterIpAsset = async () => {
    if (!signer || !address) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!requestForm.title || !requestForm.description) {
      toast.error('Please fill in a title and description for your IP asset.');
      return;
    }

    setIsSubmitting(true);
    setMintingStatus('🚀 Starting...');
    setShowLicenseConfig(false);
    setShowWarningModal(false);
    setShowBlockedModal(false);

    try {
      // Step 1: Connect wallet and switch to Aeneid
      setMintingStatus('🔌 Connecting to Aeneid network...');
      await switchToAeneid();

      const provider = signer.provider;
      const network = await provider.getNetwork();
      if (network.chainId !== 1315) {
        throw new Error(`Wrong network! Please switch to Aeneid (Chain ID: 1315). Current: ${network.chainId}`);
      }
      const userAddress = address;
      console.log('Connected as:', userAddress);

      // Step 2: Prepare content & hash
      setMintingStatus('📋 Preparing content...');
      const contentToRegister = `# ${requestForm.title}\n\n${requestForm.description}`;
      const calculatedContentHash = hashContent(contentToRegister);
      setContentHash(calculatedContentHash); // Store in state
      console.log('Content hash:', calculatedContentHash);

      // Step 3: Upload metadata to IPFS (TWO SEPARATE OBJECTS!)
      setMintingStatus('☁️ Uploading metadata to IPFS...');
      let imageUrl = '';
      if (requestForm.imageFiles.length > 0) {
        try {
          imageUrl = await uploadFileToIPFS(requestForm.imageFiles[0], requestForm.title);
          console.log('✅ Image uploaded:', imageUrl);
        } catch (uploadError) {
          console.warn('⚠️ Image upload failed:', uploadError);
        }
      }

      // Create IP metadata (for Story Protocol)
      const ipMetadata = {
        title: requestForm.title,
        description: requestForm.description,
        contentHash: calculatedContentHash,
        assetType: requestForm.assetType.toLowerCase(),
        creator: userAddress,
        createdAt: new Date().toISOString()
      };

      // Create NFT metadata (for the NFT representation)
      const nftMetadata = {
        name: requestForm.title,
        description: `NFT for IP Asset - ${requestForm.assetType}`,
        image: imageUrl,
        attributes: [
          { trait_type: 'Asset Type', value: requestForm.assetType },
          { trait_type: 'Creator', value: userAddress },
          { trait_type: 'Content Hash', value: calculatedContentHash }
        ]
      };

      // Upload BOTH metadata objects to IPFS
      console.log('📤 Uploading IP metadata to Pinata...');
      console.log('IP Metadata:', ipMetadata);
      let calculatedIpMetadataURI: string;
      let calculatedNftMetadataURI: string;

      try {
        calculatedIpMetadataURI = await uploadJSONToIPFS(ipMetadata, `ip-metadata-${calculatedContentHash}`);
        console.log(`✅ IP Metadata uploaded: ${calculatedIpMetadataURI}`);
      } catch (uploadError) {
        console.error('❌ Failed to upload IP metadata:', uploadError);
        throw new Error(`IPFS upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }

      console.log('📤 Uploading NFT metadata to Pinata...');
      console.log('NFT Metadata:', nftMetadata);

      try {
        calculatedNftMetadataURI = await uploadJSONToIPFS(nftMetadata, `nft-metadata-${calculatedContentHash}`);
        console.log(`✅ NFT Metadata uploaded: ${calculatedNftMetadataURI}`);
      } catch (uploadError) {
        console.error('❌ Failed to upload NFT metadata:', uploadError);
        throw new Error(`IPFS upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }

      // Store in state for later use
      setIpMetadataURI(calculatedIpMetadataURI);
      setNftMetadataURI(calculatedNftMetadataURI);

      // Step 4: 🔥 DETECTION ENGINE - Check similarity BEFORE minting
      setMintingStatus('🔍 Checking for similar content (RAG Detection Engine)...');
      const tokenResult = await verificationService.generateMintToken({
        creatorAddress: userAddress,
        contentHash: calculatedContentHash,
        ipMetadataURI: calculatedIpMetadataURI,
        nftMetadataURI: calculatedNftMetadataURI,
        assetType: requestForm.assetType.toLowerCase() as 'video' | 'image' | 'audio' | 'text', // REQUIRED!
      });

      // Handle BLOCKED response (75%+ similarity)
      if ('error' in tokenResult && tokenResult.error === 'SIMILARITY_BLOCKED') {
        setMintingStatus('🛑 Upload blocked due to high similarity');
        setSimilarityData(tokenResult.similarity);
        setShowBlockedModal(true);
        setIsSubmitting(false);
        return;
      }

      // Success response (may include warning)
      const token = tokenResult as MintTokenResponse;
      setMintToken(token);

      // Handle WARNING response (40-75% similarity)
      if (token.similarity?.warning) {
        setMintingStatus('⚠️ Similar content detected - review required');
        setSimilarityData(token.similarity);
        setShowWarningModal(true);
        setIsSubmitting(false);
        return;
      }

      // Clean content (0-40% similarity) - proceed automatically
      setMintingStatus('✅ Content verified clean! Minting...');
      await proceedWithMint(token, userAddress, provider as ethers.providers.Web3Provider, calculatedContentHash, calculatedIpMetadataURI, calculatedNftMetadataURI);

    } catch (err: any) {
      console.error('Minting error:', err);
      const errorMessage = err.reason || err.data?.message || err.message || 'Unknown error';
      setMintingStatus(`❌ Failed: ${errorMessage}`);
      toast.error(`Minting failed: ${errorMessage}`, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Proceed with minting after similarity checks pass
  const proceedWithMint = async (
    token: MintTokenResponse,
    userAddress: string,
    providerParam: ethers.providers.JsonRpcProvider | ethers.providers.Web3Provider,
    _contentHashParam: string,
    ipMetadataURIParam: string,
    nftMetadataURIParam: string
  ) => {
    try {
      setMintingStatus('⛓️ Minting IP Asset on Story Protocol...');
      const signerInstance = (providerParam as ethers.providers.Web3Provider).getSigner();

      const REGISTRATION_WORKFLOWS_ADDRESS = import.meta.env.VITE_REGISTRATION_WORKFLOWS || '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424';
      const SPG_NFT_CONTRACT = import.meta.env.VITE_SPG_NFT_COLLECTION || '0x78AD3d22E62824945DED384a5542Ad65de16E637';

      const WORKFLOWS_ABI = [
        "function mintAndRegisterIp(address spgNftContract, address recipient, tuple(string ipMetadataURI, bytes32 ipMetadataHash, string nftMetadataURI, bytes32 nftMetadataHash) ipMetadata, bool allowDuplicates) returns (address ipId, uint256 tokenId)"
      ];

      const workflowsContract = new ethers.Contract(
        REGISTRATION_WORKFLOWS_ADDRESS,
        WORKFLOWS_ABI,
        signerInstance
      );

      // Prepare metadata with hashes
      const ipMetadata = {
        ipMetadataURI: ipMetadataURIParam,
        ipMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipMetadataURIParam)),
        nftMetadataURI: nftMetadataURIParam,
        nftMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(nftMetadataURIParam))
      };

      console.log('🎯 Calling RegistrationWorkflows.mintAndRegisterIp DIRECTLY');
      console.log('SPG NFT Contract:', SPG_NFT_CONTRACT);
      console.log('Recipient:', userAddress);
      console.log('Metadata:', ipMetadata);

      // Call RegistrationWorkflows directly with user's wallet
      const tx = await workflowsContract.mintAndRegisterIp(
        SPG_NFT_CONTRACT,
        userAddress,
        ipMetadata,
        true, // allowDuplicates
        {
          gasLimit: 5000000 // 5M gas
        }
      );

      console.log('📝 Transaction sent:', tx.hash);
      setMintingStatus('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed!', receipt);

      // Parse events to get ipId and tokenId
      let ipId = '';
      let tokenId = 0;

      for (const log of receipt.logs) {
        try {
          const parsedLog = workflowsContract.interface.parseLog(log);
          console.log('Parsed log:', parsedLog);
        } catch (e) {
          // Try to find token ID from logs
          if (log.topics.length >= 4) {
            tokenId = parseInt(log.topics[3], 16);
          }
        }
      }

      // Use transaction hash as placeholder for IP ID if not found
      ipId = receipt.contractAddress || `IP-${receipt.transactionHash.slice(0, 10)}`;

      const mintingResult = {
        ipId,
        tokenId,
        txHash: receipt.transactionHash
      };

      console.log('✅ Mint result:', mintingResult);

      // Update backend with result (non-critical)
      try {
        await verificationService.updateTokenAfterMint({
          nonce: token.nonce,
          ipId: mintingResult.ipId,
          tokenId: mintingResult.tokenId,
          txHash: mintingResult.txHash
        });
        console.log('✅ Backend updated successfully');
      } catch (backendError: any) {
        console.warn('⚠️ Backend update failed (non-critical):', backendError.message);
      }

      setMintingStatus('✅ IP Asset Registered! Configure license terms below.');
      setMintResult(mintingResult);
      setShowLicenseConfig(true);
      toast.success('🎉 IP Asset minted successfully! Please attach license terms.');

    } catch (err: any) {
      console.error('Minting failed:', err);
      throw err;
    }
  };

  // Handle user choosing to proceed as original work (from similarity warning modal)
  const handleProceedAsOriginal = async () => {
    setShowWarningModal(false);
    setIsSubmitting(true);

    try {
      if (!mintToken) throw new Error('No mint token available');
      if (!contentHash) throw new Error('No content hash available');
      if (!ipMetadataURI || !nftMetadataURI) throw new Error('Metadata URIs not available');

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signerInstance = provider.getSigner();
      const userAddress = await signerInstance.getAddress();

      setMintingStatus('✅ Proceeding as original work...');
      await proceedWithMint(mintToken, userAddress, provider, contentHash, ipMetadataURI, nftMetadataURI);

    } catch (err: any) {
      console.error('Minting error:', err);
      const errorMessage = err.reason || err.data?.message || err.message || 'Unknown error';
      setMintingStatus(`❌ Failed: ${errorMessage}`);
      toast.error(`Minting failed: ${errorMessage}`, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle user choosing to register as derivative work (from similarity warning modal)
  const handleRegisterAsDerivative = async () => {
    setShowWarningModal(false);
    setIsSubmitting(true);

    try {
      if (!mintToken || !similarityData || !('warning' in similarityData)) {
        throw new Error('No similarity data available');
      }

      if (!contentHash || !ipMetadataURI || !nftMetadataURI) {
        throw new Error('Metadata not available');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signerInstance = provider.getSigner();
      const userAddress = await signerInstance.getAddress();

      setMintingStatus('✅ Registering as derivative work...');
      await proceedWithMint(mintToken, userAddress, provider, contentHash, ipMetadataURI, nftMetadataURI);

      // Store parent IP ID for derivative linking (can be done after license attachment)
      localStorage.setItem('pendingDerivativeParent', similarityData.topMatch.ipId);

    } catch (err: any) {
      console.error('Derivative registration error:', err);
      const errorMessage = err.reason || err.data?.message || err.message || 'Unknown error';
      setMintingStatus(`❌ Failed: ${errorMessage}`);
      toast.error(`Registration failed: ${errorMessage}`, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Attach license terms to the newly minted IP Asset
  const attachLicense = async () => {
    if (!mintResult || !mintToken) {
      toast.error("No mint result to attach license to.");
      return;
    }
    setIsSubmitting(true);
    setMintingStatus('Attaching license terms...');

    try {
      setMintingStatus('Getting or registering license terms...');
      const licenseTermsId = await getLicenseTermsId(
        licenseConfig.type,
        licenseConfig.royaltyPercent
      );

      setMintingStatus('Attaching license to IP asset on-chain...');
      const attachTx = await attachLicenseTermsToIp(mintResult.ipId, licenseTermsId);

      setMintingStatus('Finalizing registration with backend...');
      await verificationService.finalizeMint({
        nonce: mintToken.nonce,
        ipId: mintResult.ipId,
        tokenId: mintResult.tokenId,
        txHash: mintResult.txHash,
        licenseTermsId,
        licenseType: licenseConfig.type,
        royaltyPercent: licenseConfig.royaltyPercent,
        licenseTxHash: attachTx.txHash
      });

      setMintingStatus('🎉 SUCCESS! IP is fully registered with license terms.');
      setFinalResult({ ...mintResult, licenseTermsId, licenseTxHash: attachTx.txHash });
      setShowLicenseConfig(false);
      toast.success('🎉 License attached successfully! IP Asset is fully registered.');

      // Clear form
      setRequestForm({ title: '', description: '', assetType: 'Document', imageFiles: [] });

    } catch (err: any) {
      console.error('License attachment failed:', err);
      const errorMessage = err.reason || err.data?.message || err.message || 'License attachment failed';
      setMintingStatus(`❌ License attachment failed: ${errorMessage}`);
      toast.error(`License attachment failed: ${errorMessage}`, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

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
  if (authCheckLoading ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Initializing issuer service...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authorized
  if (isAuthorizedIssuer === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Not Authorized</CardTitle>
            <CardDescription>Your wallet is not authorized as an issuer. Please contact the admin.</CardDescription>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Issuer Dashboard</h1>
          <p className="text-gray-600">Register new IP assets and manage legacy token requests.</p>
          <div className="mt-4">
            <Badge variant="outline" className="mr-2">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="create">Register IP Asset</TabsTrigger>
            <TabsTrigger value="requests">Legacy Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Register New IP Asset</CardTitle>
                        <CardDescription>Use the verified Story Protocol workflow to mint a new IP asset directly on-chain.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                         <Button size="lg" onClick={() => setActiveTab('create')}>
                            <Rocket className="w-5 h-5 mr-2" />
                            Go to Registration
                        </Button>
                    </CardContent>
                </Card>
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Legacy Token Requests</CardTitle>
                        <CardDescription>View and manage your requests submitted through the old admin approval system.</CardDescription>
                    </CardHeader>
                     <CardContent className="flex-grow flex items-center justify-center">
                        <Button size="lg" variant="secondary" onClick={() => setActiveTab('requests')}>
                           <FileText className="w-5 h-5 mr-2" />
                            View Legacy Requests
                        </Button>
                    </CardContent>
                </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Register New IP Asset</CardTitle>
                <CardDescription>This will register your IP directly on the Story Protocol Aeneid testnet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">IP Asset Title *</Label>
                      <Input id="title" value={requestForm.title} onChange={(e) => setRequestForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., My Awesome Sci-Fi Novel" />
                    </div>
                    <div>
                      <Label htmlFor="assetType">Asset Type *</Label>
                      <Select value={requestForm.assetType} onValueChange={(value) => setRequestForm(prev => ({ ...prev, assetType: value }))}>
                        <SelectTrigger><SelectValue placeholder="Select asset type" /></SelectTrigger>
                        <SelectContent>{assetTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea id="description" value={requestForm.description} onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))} placeholder="A brief summary of your intellectual property." rows={4} />
                    </div>
                    <div>
                      <Label htmlFor="image">Cover Image (Optional)</Label>
                      <Input id="image" type="file" accept="image/*" onChange={(e) => { const files = Array.from(e.target.files || []); setRequestForm(prev => ({ ...prev, imageFiles: files })); }} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4">
                   <Button
                      onClick={handleRegisterIpAsset}
                      disabled={isSubmitting || !requestForm.title || !requestForm.description}
                      className="w-full max-w-xs"
                      size="lg"
                    >
                      {isSubmitting ? (
                        <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>Submitting...</>
                      ) : (
                        <><Rocket className="w-5 h-5 mr-2" />Register IP Asset</>
                      )}
                    </Button>
                    <p className="text-sm text-gray-600 font-mono h-4">{isSubmitting && mintingStatus}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Legacy Token Requests</CardTitle>
                <CardDescription>History of requests submitted via the admin approval system.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div><p className="mt-2 text-gray-600">Loading requests...</p></div>
                ) : tokenRequests.length === 0 ? (
                  <div className="text-center py-8"><FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No legacy requests found</h3></div>
                ) : (
                  <div className="space-y-4">
                    {/* The display logic for legacy requests can remain unchanged */}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* License Configuration UI (shown after minting succeeds) */}
        {showLicenseConfig && !finalResult && mintResult && (
          <Card className="mt-6 border-2 border-blue-400 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-700">🎉 IP Registered! Now, Attach a License.</CardTitle>
              <CardDescription>Your IP Asset has been minted. Attach license terms to complete registration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 font-mono text-sm bg-white p-4 rounded">
                <div><span className="text-gray-600">IP ID:</span> <span className="text-blue-600 break-all">{mintResult.ipId}</span></div>
                <div><span className="text-gray-600">Token ID:</span> <span className="text-blue-600">{mintResult.tokenId}</span></div>
              </div>

              <div className="space-y-4">
                <div className="license-type-selector bg-white p-4 rounded-md space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="licenseType"
                      className="form-radio h-5 w-5 text-blue-600"
                      checked={licenseConfig.type === 'commercial_remix'}
                      onChange={() => setLicenseConfig({ ...licenseConfig, type: 'commercial_remix' })}
                    />
                    <div>
                      <span className="font-semibold">Commercial Remix</span>
                      <span className="block text-xs text-gray-600">✓ Commercial use ✓ Derivatives ✓ Attribution</span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="licenseType"
                      className="form-radio h-5 w-5 text-blue-600"
                      checked={licenseConfig.type === 'non_commercial'}
                      onChange={() => setLicenseConfig({ ...licenseConfig, type: 'non_commercial', royaltyPercent: 0 })}
                    />
                    <div>
                      <span className="font-semibold">Non-Commercial Only</span>
                      <span className="block text-xs text-gray-600">✗ No commercial use ✓ Derivatives ✓ Attribution</span>
                    </div>
                  </label>
                </div>

                {licenseConfig.type === 'commercial_remix' && (
                  <div className="royalty-slider bg-white p-4 rounded-md">
                    <label className="block mb-2 font-semibold">Royalty Percentage: {licenseConfig.royaltyPercent}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={licenseConfig.royaltyPercent}
                      onChange={(e) => setLicenseConfig({ ...licenseConfig, royaltyPercent: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}

                <Button
                  onClick={attachLicense}
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>Attaching...</>
                  ) : (
                    'Attach License & Finalize'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Final Result Display (after license is attached) */}
        {finalResult && (
          <Card className="mt-6 border-2 border-green-500 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-700">✅ IP Fully Registered!</CardTitle>
              <CardDescription>Your IP Asset is now fully registered with license terms on Story Protocol.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 font-mono text-sm bg-white p-4 rounded">
                <div><span className="text-gray-600">IP ID:</span> <span className="text-green-600 break-all">{finalResult.ipId}</span></div>
                <div><span className="text-gray-600">Token ID:</span> <span className="text-green-600">{finalResult.tokenId}</span></div>
                {finalResult.licenseTermsId && (
                  <div><span className="text-gray-600">License Terms ID:</span> <span className="text-green-600">{finalResult.licenseTermsId}</span></div>
                )}
                <div><span className="text-gray-600">Mint Tx Hash:</span> <span className="text-green-600 break-all">{finalResult.txHash}</span></div>
                {finalResult.licenseTxHash && (
                  <div><span className="text-gray-600">License Tx Hash:</span> <span className="text-green-600 break-all">{finalResult.licenseTxHash}</span></div>
                )}
              </div>
              <Button
                onClick={() => window.open(`${AENEID_CONFIG.blockExplorerUrls[0]}/tx/${finalResult.licenseTxHash || finalResult.txHash}`, '_blank')}
                variant="outline"
                className="w-full"
              >
                View on Explorer →
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Similarity Warning Modal (40-75% similarity) */}
      {showWarningModal && similarityData && 'warning' in similarityData && (
        <SimilarityWarningModal
          isOpen={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          similarityInfo={similarityData}
          onProceedAsOriginal={handleProceedAsOriginal}
          onRegisterAsDerivative={handleRegisterAsDerivative}
        />
      )}

      {/* Similarity Blocked Modal (75%+ similarity) */}
      {showBlockedModal && similarityData && !('warning' in similarityData) && (
        <SimilarityBlockedModal
          isOpen={showBlockedModal}
          onClose={() => {
            setShowBlockedModal(false);
            setRequestForm({ title: '', description: '', assetType: 'Document', imageFiles: [] });
          }}
          blockedInfo={similarityData}
        />
      )}
    </div>
  );
};

export default NewIssuerDashboard;