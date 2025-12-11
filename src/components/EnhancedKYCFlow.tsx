import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { ComplianceService, getComplianceService } from '../services/complianceService';
import { PinataService, getPinataService, KYCUserData, MerkleTreeData } from '../services/pinataService';
import NetworkSwitcher from './NetworkSwitcher';
import { NetworkDetectionService } from '../utils/networkDetection';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Upload,
  Download,
  Key,
  Users,
  FileText,
  Clock,
  ExternalLink,
  Copy,
  RefreshCw,
  Database,
  Lock,
  Eye
} from 'lucide-react';

interface EnhancedKYCFlowProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress?: string;
  onKYCComplete?: (success: boolean, data?: any) => void;
  isAdmin?: boolean;
}

interface KYCFormData {
  fullName: string;
  email: string;
  dateOfBirth: string;
  nationality: string;
  documentType: string;
  documentNumber: string;
  documentExpiry: string;
  verificationLevel: 'basic' | 'enhanced' | 'premium';
}

interface KYCState {
  step: 'form' | 'upload' | 'verify' | 'complete';
  loading: boolean;
  ipfsHash?: string;
  merkleProof?: string[];
  transactionHash?: string;
  error?: string;
}

const PINATA_CONFIG = {
  apiKey: import.meta.env.VITE_PINATA_API_KEY || '',
  apiSecret: import.meta.env.VITE_PINATA_SECRET || '',
};


// MerkleKYC Contract Address (from deployment)
const MERKLE_KYC_CONTRACT = '0x...'; // To be filled with actual deployed contract address

const MERKLE_KYC_ABI = [
  'function publishMerkleTree(bytes32 root, string calldata ipfsCID, uint256 expiryTimestamp) external returns (bytes32 treeId)',
  'function verifyKYC(bytes32 treeId, bytes32[] calldata proof) external returns (bool)',
  'function verifyKYCForUser(address user, bytes32 treeId, bytes32[] calldata proof) external view returns (bool)',
  'function isKYCVerified(address user) external view returns (bool)',
  'function getLeafHash(address user) external view returns (bytes32)',
  'function getActiveTreeIds() external view returns (bytes32[] memory)',
  'function getTreeData(bytes32 treeId) external view returns (tuple(bytes32 root, string ipfsCID, uint256 timestamp, uint256 expiryTimestamp, bool isActive, address issuer))'
];

export const EnhancedKYCFlow: React.FC<EnhancedKYCFlowProps> = ({
  isOpen,
  onClose,
  userAddress,
  onKYCComplete,
  isAdmin = false
}) => {
  const { provider, signer, address } = useWallet();
  const [complianceService, setComplianceService] = useState<ComplianceService | null>(null);
  const [pinataService, setPinataService] = useState<PinataService | null>(null);
  const [merkleContract, setMerkleContract] = useState<ethers.Contract | null>(null);
  const [networkStatus, setNetworkStatus] = useState<{isCorrectNetwork: boolean} | null>(null);
  
  const targetAddress = userAddress || address;

  // Form state
  const [formData, setFormData] = useState<KYCFormData>({
    fullName: '',
    email: '',
    dateOfBirth: '',
    nationality: '',
    documentType: 'passport',
    documentNumber: '',
    documentExpiry: '',
    verificationLevel: 'basic'
  });

  // KYC process state
  const [kycState, setKycState] = useState<KYCState>({
    step: 'form',
    loading: false
  });

  // Admin state for batch KYC
  const [batchUsers, setBatchUsers] = useState<string>('');
  const [activeTrees, setActiveTrees] = useState<any[]>([]);

  useEffect(() => {
    const initializeServices = async () => {
      if (provider) {
        // Check network status
        const status = await NetworkDetectionService.getNetworkStatus();
        setNetworkStatus(status);

        const compliance = getComplianceService(provider, signer);
        setComplianceService(compliance);

        if (PINATA_CONFIG.apiKey && PINATA_CONFIG.apiSecret) {
          const pinata = getPinataService(PINATA_CONFIG);
          setPinataService(pinata);
        }

        if (signer && MERKLE_KYC_CONTRACT) {
          const contract = new ethers.Contract(MERKLE_KYC_CONTRACT, MERKLE_KYC_ABI, signer);
          setMerkleContract(contract);
        }
      }
    };

    initializeServices();
  }, [provider, signer]);

  useEffect(() => {
    if (isOpen && merkleContract) {
      loadActiveTrees();
    }
  }, [isOpen, merkleContract]);

  const loadActiveTrees = async () => {
    if (!merkleContract) return;

    try {
      const treeIds = await merkleContract.getActiveTreeIds();
      const trees = await Promise.all(
        treeIds.map(async (treeId: string) => {
          const treeData = await merkleContract.getTreeData(treeId);
          return {
            id: treeId,
            ...treeData
          };
        })
      );
      setActiveTrees(trees);
    } catch (error) {
      console.error('Failed to load active trees:', error);
    }
  };

  const handleFormSubmit = async () => {
    if (!pinataService || !targetAddress) {
      toast.error('Service not initialized or address missing');
      return;
    }

    setKycState(prev => ({ ...prev, loading: true, step: 'upload' }));

    try {
      // Create KYC user data
      const kycData: KYCUserData = {
        address: targetAddress,
        ...formData,
        timestamp: Math.floor(Date.now() / 1000),
        ipAddress: 'masked', // For privacy
        userAgent: 'masked'  // For privacy
      };

      // Upload to Pinata IPFS
      const ipfsHash = await pinataService.uploadKYCData(kycData, {
        name: `KYC-${targetAddress}-${Date.now()}`,
        keyvalues: {
          address: targetAddress,
          verificationLevel: formData.verificationLevel,
          type: 'individual-kyc'
        }
      });

      setKycState(prev => ({ 
        ...prev, 
        ipfsHash, 
        step: 'verify',
        loading: false 
      }));

      toast.success('KYC data uploaded to IPFS successfully!');

    } catch (error: any) {
      console.error('KYC upload failed:', error);
      setKycState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message,
        step: 'form'
      }));
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  const handleBatchKYCSubmit = async () => {
    if (!pinataService || !merkleContract || !batchUsers.trim()) {
      toast.error('Missing required data for batch KYC');
      return;
    }

    setKycState(prev => ({ ...prev, loading: true }));

    try {
      // Parse user addresses
      const addresses = batchUsers
        .split('\n')
        .map(addr => addr.trim())
        .filter(addr => addr && ethers.utils.isAddress(addr));

      if (addresses.length === 0) {
        throw new Error('No valid addresses provided');
      }

      // Generate Merkle tree
      const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`kyc-salt-${Date.now()}`));
      const merkleTree = pinataService.generateMerkleTree(
        addresses,
        address || '',
        salt
      );

      // Upload Merkle tree to IPFS
      const ipfsHash = await pinataService.uploadMerkleTree(merkleTree, {
        name: `MerkleKYC-Batch-${Date.now()}`,
        keyvalues: {
          type: 'merkle-kyc-tree',
          userCount: addresses.length.toString(),
          issuer: address || ''
        }
      });

      // Publish to blockchain
      const expiryTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
      const tx = await merkleContract.publishMerkleTree(
        merkleTree.root,
        ipfsHash,
        expiryTimestamp
      );

      const receipt = await tx.wait();

      setKycState(prev => ({ 
        ...prev, 
        loading: false,
        ipfsHash,
        transactionHash: receipt.transactionHash,
        step: 'complete'
      }));

      toast.success(`Batch KYC published! ${addresses.length} users can now verify.`);
      
      // Refresh active trees
      loadActiveTrees();

    } catch (error: any) {
      console.error('Batch KYC failed:', error);
      setKycState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      toast.error(`Batch KYC failed: ${error.message}`);
    }
  };

  const handleIndividualVerification = async (treeId: string) => {
    if (!merkleContract || !pinataService || !targetAddress) {
      toast.error('Service not initialized');
      return;
    }

    setKycState(prev => ({ ...prev, loading: true }));

    try {
      // Get tree data
      const treeData = await merkleContract.getTreeData(treeId);
      
      // Retrieve Merkle tree from IPFS
      const merkleTree: MerkleTreeData = await pinataService.retrieveFromIPFS(treeData.ipfsCID);
      
      // Get proof for user
      const proof = merkleTree.proofs[targetAddress];
      
      if (!proof) {
        throw new Error('User not found in this KYC batch');
      }

      // Verify on-chain
      const tx = await merkleContract.verifyKYC(treeId, proof);
      const receipt = await tx.wait();

      setKycState(prev => ({ 
        ...prev, 
        loading: false,
        transactionHash: receipt.transactionHash,
        merkleProof: proof,
        step: 'complete'
      }));

      toast.success('KYC verification successful!');
      
      if (onKYCComplete) {
        onKYCComplete(true, { treeId, proof, txHash: receipt.transactionHash });
      }

    } catch (error: any) {
      console.error('KYC verification failed:', error);
      setKycState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      toast.error(`Verification failed: ${error.message}`);
    }
  };

  const resetFlow = () => {
    setKycState({
      step: 'form',
      loading: false
    });
    setFormData({
      fullName: '',
      email: '',
      dateOfBirth: '',
      nationality: '',
      documentType: 'passport',
      documentNumber: '',
      documentExpiry: '',
      verificationLevel: 'basic'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (!pinataService && PINATA_CONFIG.apiKey) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
              Configuration Required
            </DialogTitle>
          </DialogHeader>
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Pinata API credentials are required for enhanced KYC flow. Please configure REACT_APP_PINATA_API_KEY and REACT_APP_PINATA_SECRET environment variables.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Enhanced KYC Verification
          </DialogTitle>
          <DialogDescription>
            Privacy-preserving KYC using IPFS storage and Merkle proof verification
          </DialogDescription>
        </DialogHeader>

        {/* Network Status and Switcher */}
        <NetworkSwitcher onNetworkSwitched={() => {
          // Refresh services when network switches
          if (provider && signer) {
            const newComplianceService = getComplianceService(provider, signer);
            setComplianceService(newComplianceService);
          }
        }} />

        <Tabs defaultValue={isAdmin ? "admin" : "user"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user">Individual KYC</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Batch KYC (Admin)</TabsTrigger>}
          </TabsList>

          {/* Individual KYC Flow */}
          <TabsContent value="user" className="space-y-6">
            {kycState.step === 'form' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    KYC Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        id="nationality"
                        value={formData.nationality}
                        onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                        placeholder="Your nationality"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="documentType">Document Type</Label>
                      <Select 
                        value={formData.documentType} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, documentType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="passport">Passport</SelectItem>
                          <SelectItem value="national_id">National ID</SelectItem>
                          <SelectItem value="drivers_license">Driver's License</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="documentNumber">Document Number</Label>
                      <Input
                        id="documentNumber"
                        value={formData.documentNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                        placeholder="Document number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="documentExpiry">Document Expiry</Label>
                      <Input
                        id="documentExpiry"
                        type="date"
                        value={formData.documentExpiry}
                        onChange={(e) => setFormData(prev => ({ ...prev, documentExpiry: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="verificationLevel">Verification Level</Label>
                    <Select 
                      value={formData.verificationLevel} 
                      onValueChange={(value: 'basic' | 'enhanced' | 'premium') => setFormData(prev => ({ ...prev, verificationLevel: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic (Identity + Email)</SelectItem>
                        <SelectItem value="enhanced">Enhanced (+ Address Verification)</SelectItem>
                        <SelectItem value="premium">Premium (+ Income Verification)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <Lock className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Your personal data will be encrypted and stored on IPFS. Only verification status will be recorded on-chain.
                    </AlertDescription>
                  </Alert>

                  <Button 
                    onClick={handleFormSubmit}
                    disabled={kycState.loading || !formData.fullName || !formData.email}
                    className="w-full"
                  >
                    {kycState.loading ? (
                      <div className="flex items-center">
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Uploading to IPFS...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Upload className="w-4 h-4 mr-2" />
                        Submit KYC Data
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {kycState.step === 'verify' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                    Data Uploaded Successfully
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <Database className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Your KYC data has been uploaded to IPFS. You can now verify against available Merkle trees.
                    </AlertDescription>
                  </Alert>

                  {kycState.ipfsHash && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Label className="text-sm font-medium">IPFS Hash:</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <code className="text-xs bg-white p-2 rounded border flex-1 truncate">
                          {kycState.ipfsHash}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(kycState.ipfsHash!)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${kycState.ipfsHash}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-medium">Available KYC Trees:</h4>
                    {activeTrees.length === 0 ? (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          No active KYC trees available. Please wait for an admin to publish a batch.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      activeTrees.map((tree, index) => (
                        <Card key={tree.id} className="border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Tree #{index + 1}</p>
                                <p className="text-sm text-gray-600">
                                  Issued: {new Date(tree.timestamp * 1000).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Expires: {new Date(tree.expiryTimestamp * 1000).toLocaleDateString()}
                                </p>
                              </div>
                              <Button
                                onClick={() => handleIndividualVerification(tree.id)}
                                disabled={kycState.loading}
                              >
                                {kycState.loading ? 'Verifying...' : 'Verify KYC'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {kycState.step === 'complete' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                    KYC Verification Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Your KYC verification has been successfully recorded on-chain. You can now participate in compliant trading.
                    </AlertDescription>
                  </Alert>

                  {kycState.transactionHash && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Label className="text-sm font-medium">Transaction Hash:</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <code className="text-xs bg-white p-2 rounded border flex-1 truncate">
                          {kycState.transactionHash}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(kycState.transactionHash!)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://Flowscan.xyz/tx/${kycState.transactionHash}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button onClick={resetFlow} variant="outline" className="flex-1">
                      Start New KYC
                    </Button>
                    <Button onClick={onClose} className="flex-1">
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Admin Batch KYC */}
          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Batch KYC Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="batchUsers">User Addresses (one per line)</Label>
                    <Textarea
                      id="batchUsers"
                      placeholder="0x1234...&#10;0x5678...&#10;0x9abc..."
                      value={batchUsers}
                      onChange={(e) => setBatchUsers(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Enter Ethereum addresses that have completed KYC verification
                    </p>
                  </div>

                  <Button 
                    onClick={handleBatchKYCSubmit}
                    disabled={kycState.loading || !batchUsers.trim()}
                    className="w-full"
                  >
                    {kycState.loading ? (
                      <div className="flex items-center">
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Publishing Batch KYC...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Key className="w-4 h-4 mr-2" />
                        Publish Batch KYC Tree
                      </div>
                    )}
                  </Button>

                  {activeTrees.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Active KYC Trees:</h4>
                      {activeTrees.map((tree, index) => (
                        <Card key={tree.id} className="border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Tree #{index + 1}</p>
                                <p className="text-sm text-gray-600">Root: {tree.root.substring(0, 20)}...</p>
                                <p className="text-sm text-gray-600">IPFS: {tree.ipfsCID}</p>
                              </div>
                              <Badge variant={tree.isActive ? "default" : "secondary"}>
                                {tree.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {kycState.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {kycState.error}
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedKYCFlow;