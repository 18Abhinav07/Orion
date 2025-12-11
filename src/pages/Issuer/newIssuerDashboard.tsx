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
import { STORY_CONFIG, STORY_CONTRACTS, IP_TYPES, SIMILARITY_THRESHOLDS } from '../../lib/storyProtocolConfig';

// ✅ KEEP: Pinata IPFS upload (still used for Story Protocol metadata)
import { uploadJSONToPinata, uploadToPinata } from '../../utils/pinata';

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

  // Handle request submission
  const handleSubmitRequest = async () => {
    if (!tokenManagementService || !requestForm.title || !requestForm.amount || !requestForm.pricePerToken) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔄 Step 1: Uploading metadata to IPFS...');
      
      // Upload images to IPFS
      let imageUrl = '';
      if (requestForm.imageFiles.length > 0) {
        // Create basic metadata for image upload
        const basicMetadata = {
          name: requestForm.title,
          description: requestForm.description,
          attributes: [
            { trait_type: 'Asset Type', value: requestForm.assetType },
            { trait_type: 'Total Supply', value: requestForm.amount },
            { trait_type: 'Price Per Token', value: `${requestForm.pricePerToken} Flow` }
          ]
        };
        
        const imageHash = await uploadToPinata(requestForm.imageFiles[0], basicMetadata);
        imageUrl = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
      }

      // Create metadata
      const metadata = {
        name: requestForm.title,
        description: requestForm.description,
        image: imageUrl,
        attributes: [
          { trait_type: 'Asset Type', value: requestForm.assetType },
          { trait_type: 'Total Supply', value: requestForm.amount },
          { trait_type: 'Price Per Token', value: `${requestForm.pricePerToken} Flow` }
        ]
      };

      // Upload metadata to IPFS
      const metadataHash = await uploadJSONToPinata(metadata);
      const metadataURI = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
      
      console.log('✅ Metadata uploaded to IPFS:', metadataURI);

      // Submit token request for approval
      console.log('🔄 Step 2: Submitting token request for admin approval...');
      const result = await tokenManagementService.submitTokenRequest(
        metadataURI,
        parseInt(requestForm.amount),
        parseFloat(requestForm.pricePerToken)
      );

      console.log('✅ Token request submitted successfully:', result);
      toast.success('🎉 Token request submitted for admin approval!');
      
      // Reset form and reload requests
      setRequestForm({
        title: '',
        description: '',
        assetType: '',
        amount: '',
        pricePerToken: '',
        imageFiles: []
      });
      setShowRequestDialog(false);
      await loadTokenRequests();
      
    } catch (error) {
      console.error('❌ Failed to submit token request:', error);
      toast.error('Failed to submit token request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle token deployment
  const handleDeployToken = async (requestId: string) => {
    if (!tokenManagementService) return;
    
    try {
      console.log('🔄 Deploying approved token...');
      const result = await tokenManagementService.deployApprovedToken(requestId);
      console.log('✅ Token deployed successfully:', result);
      toast.success(`🚀 Token deployed! Token ID: ${result.tokenId}`);
      await loadTokenRequests();
    } catch (error) {
      console.error('❌ Failed to deploy token:', error);
      toast.error('Failed to deploy token');
    }
  };

  // Handle marketplace listing
  const handleListOnMarketplace = async (requestId: string, amount: number) => {
    if (!directListingService) {
      toast.error('Direct listing service not initialized');
      return;
    }
    
    try {
      console.log('🔄 Listing token on marketplace using direct approach...');
      console.log('📝 Using successful terminal script method');
      
      const result = await directListingService.listTokenWithAutoApproval(requestId, amount);
      console.log('✅ Token listed on marketplace:', result);
      toast.success('🎉 Token listed on marketplace successfully!');
      await loadTokenRequests();
    } catch (error) {
      console.error('❌ Failed to list token on marketplace:', error);
      toast.error(`Failed to list token: ${error.message}`);
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
  if (authCheckLoading || !isServiceInitialized) {
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Issuer Dashboard</h1>
          <p className="text-gray-600">Manage your token requests and deployments</p>
          <div className="mt-4">
            <Badge variant="outline" className="mr-2">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </Badge>
            <Badge variant="default">Authorized Issuer</Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests">Token Requests</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="create">Create Request</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tokenRequests.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pending Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {tokenRequests.filter(r => r.status === 'Pending').length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Deployed Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {tokenRequests.filter(r => r.status === 'Deployed' || r.status === 'Listed').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Requests</CardTitle>
                <CardDescription>Your latest token requests and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {tokenRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
                    <p className="text-gray-600 mb-4">Create your first token request to get started</p>
                    <Button onClick={() => setActiveTab('create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Request
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tokenRequests.slice(0, 5).map((request) => (
                      <div key={request.requestId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Request {request.requestId.slice(0, 8)}...</p>
                          <p className="text-sm text-gray-600">
                            {request.amount} tokens at {request.price} Flow each
                          </p>
                          <p className="text-xs text-gray-500">
                            Submitted {request.submittedAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(request.status)}
                          {request.status === 'Approved' && (
                            <Button
                              size="sm"
                              className="mt-2 ml-2"
                              onClick={() => handleDeployToken(request.requestId)}
                            >
                              Deploy Token
                            </Button>
                          )}
                          {request.status === 'Deployed' && (
                            <Button
                              size="sm"
                              className="mt-2 ml-2"
                              onClick={() => handleListOnMarketplace(request.requestId, parseInt(request.amount))}
                            >
                              List on Marketplace
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Token Requests</CardTitle>
                <CardDescription>Complete history of your token requests</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading requests...</p>
                  </div>
                ) : tokenRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                    <p className="text-gray-600">You haven't submitted any token requests yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tokenRequests.map((request) => (
                      <Card key={request.requestId}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium">Request {request.requestId.slice(0, 8)}...</h3>
                                {getStatusBadge(request.status)}
                              </div>
                              <p className="text-sm text-gray-600">
                                Amount: {request.amount} tokens | Price: {request.price} Flow each
                              </p>
                              <p className="text-xs text-gray-500">
                                Submitted: {request.submittedAt.toLocaleDateString()}
                                {request.approvedAt && ` | Approved: ${request.approvedAt.toLocaleDateString()}`}
                                {request.deployedAt && ` | Deployed: ${request.deployedAt.toLocaleDateString()}`}
                              </p>
                              {request.tokenId && (
                                <p className="text-xs text-blue-600">Token ID: {request.tokenId}</p>
                              )}
                              {request.rejectionReason && (
                                <p className="text-xs text-red-600">Rejection Reason: {request.rejectionReason}</p>
                              )}
                            </div>
                            <div className="flex flex-col space-y-2">
                              {request.status === 'Approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleDeployToken(request.requestId)}
                                >
                                  <Rocket className="w-4 h-4 mr-1" />
                                  Deploy Token
                                </Button>
                              )}
                              {request.status === 'Deployed' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleListOnMarketplace(request.requestId, parseInt(request.amount))}
                                >
                                  <Package className="w-4 h-4 mr-1" />
                                  List on Marketplace
                                </Button>
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

          {/* Create Request Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Token Request</CardTitle>
                <CardDescription>Submit a new token for admin approval</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Token Title *</Label>
                      <Input
                        id="title"
                        value={requestForm.title}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter token title"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="assetType">Asset Type *</Label>
                      <Select value={requestForm.assetType} onValueChange={(value) => setRequestForm(prev => ({ ...prev, assetType: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset type" />
                        </SelectTrigger>
                        <SelectContent>
                          {assetTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="amount">Token Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={requestForm.amount}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="Enter number of tokens"
                      />
                    </div>

                    <div>
                      <Label htmlFor="price">Price per Token (Flow) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.001"
                        value={requestForm.pricePerToken}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, pricePerToken: e.target.value }))}
                        placeholder="Enter price per token"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={requestForm.description}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter token description"
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label htmlFor="image">Token Image</Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setRequestForm(prev => ({ ...prev, imageFiles: files }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setRequestForm({
                      title: '',
                      description: '',
                      assetType: '',
                      amount: '',
                      pricePerToken: '',
                      imageFiles: []
                    })}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={isSubmitting || !requestForm.title || !requestForm.amount || !requestForm.pricePerToken}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NewIssuerDashboard;