// Test component for Story Protocol minting - with License Attachment & Similarity Detection
import { useState } from 'react';
import { ethers } from 'ethers';
import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { http, createWalletClient, custom, type Address, defineChain } from 'viem';
import { verificationService, MintTokenResponse, BlockedResponse, SimilarityInfo } from '../services/verificationService';
import { getLicenseTermsId, attachLicenseTermsToIp } from '../services/licenseService';
import { SimilarityWarningModal } from '../components/SimilarityWarningModal';
import { SimilarityBlockedModal } from '../components/SimilarityBlockedModal';
import { uploadJSONToIPFS } from '../services/pinataService';
import { useAccount } from 'wagmi';
import { useUserAssets } from '../hooks/useUserAssets';
import { AssetCard } from '../components/AssetCard';

// Type for mint result since we're not using storyProtocolService anymore
interface MintResult {
  ipId: string;
  tokenId: number;
  txHash: string;
}

// Aeneid testnet configuration - using environment variables
const CHAIN_ID_DECIMAL = Number(import.meta.env.VITE_STORY_CHAIN_ID) || 1315;
const AENEID_CHAIN_ID = `0x${CHAIN_ID_DECIMAL.toString(16)}`; // Convert to hex
const AENEID_CONFIG = {
  chainId: AENEID_CHAIN_ID,
  chainName: 'Story Aeneid Testnet',
  nativeCurrency: {
    name: 'IP',
    symbol: 'IP',
    decimals: 18,
  },
  rpcUrls: [import.meta.env.VITE_STORY_RPC_URL || 'https://aeneid.storyrpc.io'],
  blockExplorerUrls: [import.meta.env.VITE_STORY_EXPLORER || 'https://aeneid.storyscan.xyz'],
};

// Define Aeneid chain for viem (Story Protocol SDK)
const aeneidChain = defineChain({
  id: CHAIN_ID_DECIMAL,
  name: 'Story Aeneid Testnet',
  network: 'aeneid',
  nativeCurrency: {
    name: 'IP',
    symbol: 'IP',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_STORY_RPC_URL || 'https://aeneid.storyrpc.io'],
    },
    public: {
      http: [import.meta.env.VITE_STORY_RPC_URL || 'https://aeneid.storyrpc.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'StoryScan',
      url: import.meta.env.VITE_STORY_EXPLORER || 'https://aeneid.storyscan.xyz',
    },
  },
});

export default function TestMinting() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mintToken, setMintToken] = useState<MintTokenResponse | null>(null);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  
  // Metadata state (stored for reuse in warning modal)
  const [contentHash, setContentHash] = useState<string>('');
  const [ipMetadataURI, setIpMetadataURI] = useState<string>('');
  const [nftMetadataURI, setNftMetadataURI] = useState<string>('');

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [assetType, setAssetType] = useState<'video' | 'image' | 'audio' | 'text'>('text');

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

  const hashContent = (content: string): string => {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
  };

  const hashFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    return ethers.utils.keccak256(uint8Array);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-detect asset type
      if (selectedFile.type.startsWith('video/')) setAssetType('video');
      else if (selectedFile.type.startsWith('image/')) setAssetType('image');
      else if (selectedFile.type.startsWith('audio/')) setAssetType('audio');
      else setAssetType('text');
    }
  };

  const switchToAeneid = async () => {
    if (!window.ethereum) throw new Error('MetaMask not found');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AENEID_CHAIN_ID }],
      });
    } catch (switchError: any) {
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

  const testMinting = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowLicenseConfig(false);
    setShowWarningModal(false);
    setShowBlockedModal(false);

    try {
      setStatus('🔌 Connecting to Aeneid network...');
      await switchToAeneid();

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      const network = await provider.getNetwork();
      if (network.chainId !== CHAIN_ID_DECIMAL) throw new Error(`Wrong network! Please switch to Aeneid.`);

      setStatus('📋 Preparing content...');
      let calculatedContentHash: string;

      if (file) {
        // Hash uploaded file
        calculatedContentHash = await hashFile(file);
      } else {
        // Use default test content
        const testContent = `# Test IP Asset\n\nCreated at: ${new Date().toISOString()}`;
        calculatedContentHash = hashContent(testContent);
      }
      
      setContentHash(calculatedContentHash); // Store in state for later use

      setStatus('☁️ Uploading metadata to IPFS...');
      
      // Create real metadata objects
      const ipMetadata = {
        title: file?.name || 'Test IP Asset',
        description: `IP Asset created on ${new Date().toISOString()}`,
        contentHash: calculatedContentHash,
        assetType,
        creator: userAddress,
        createdAt: new Date().toISOString()
      };
      
      const nftMetadata = {
        name: file?.name || 'Test IP Asset NFT',
        description: `NFT for IP Asset - ${assetType}`,
        image: '', // TODO: Add thumbnail/preview
        attributes: [
          { trait_type: 'Asset Type', value: assetType },
          { trait_type: 'Creator', value: userAddress },
          { trait_type: 'Content Hash', value: calculatedContentHash }
        ]
      };
      
      // Upload metadata to IPFS via Pinata
      console.log('📤 Uploading IP metadata to Pinata...');
      console.log('IP Metadata:', ipMetadata);
      let calculatedIpMetadataURI: string;
      let calculatedNftMetadataURI: string;
      
      try {
        calculatedIpMetadataURI = await uploadJSONToIPFS(ipMetadata, `ip-metadata-${calculatedContentHash}`);
        console.log(`✅ IP Metadata uploaded: ${calculatedIpMetadataURI}`);
      } catch (uploadError) {
        console.error('❌ Failed to upload IP metadata to Pinata:', uploadError);
        throw new Error(`IPFS upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }
      
      console.log('📤 Uploading NFT metadata to Pinata...');
      console.log('NFT Metadata:', nftMetadata);
      
      try {
        calculatedNftMetadataURI = await uploadJSONToIPFS(nftMetadata, `nft-metadata-${calculatedContentHash}`);
        console.log(`✅ NFT Metadata uploaded: ${calculatedNftMetadataURI}`);
      } catch (uploadError) {
        console.error('❌ Failed to upload NFT metadata to Pinata:', uploadError);
        throw new Error(`IPFS upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }
      
      // Store in state for later use
      setIpMetadataURI(calculatedIpMetadataURI);
      setNftMetadataURI(calculatedNftMetadataURI);

      // 🔥 DETECTION ENGINE: Check similarity BEFORE minting
      setStatus('🔍 Checking for similar content (RAG Detection Engine)...');
      const tokenResult = await verificationService.generateMintToken({
        creatorAddress: userAddress,
        contentHash: calculatedContentHash,
        ipMetadataURI: calculatedIpMetadataURI,
        nftMetadataURI: calculatedNftMetadataURI,
        assetType, // NEW: Required for similarity detection
      });

      // Handle BLOCKED response (75%+ similarity)
      if ('error' in tokenResult && tokenResult.error === 'SIMILARITY_BLOCKED') {
        setStatus('🛑 Upload blocked due to high similarity');
        setSimilarityData(tokenResult.similarity);
        setShowBlockedModal(true);
        setLoading(false);
        return;
      }

      // Success response (may include warning)
      const token = tokenResult as MintTokenResponse;
      setMintToken(token);

      // Handle WARNING response (40-75% similarity)
      if (token.similarity?.warning) {
        setStatus('⚠️ Similar content detected - review required');
        setSimilarityData(token.similarity);
        setShowWarningModal(true);
        setLoading(false);
        return;
      }

      // Clean content (0-40% similarity) - proceed automatically
      setStatus('✅ Content verified clean! Minting...');
      await proceedWithMint(token, userAddress, provider, calculatedContentHash, calculatedIpMetadataURI, calculatedNftMetadataURI);

    } catch (err: any) {
      console.error('Minting error:', err);
      setError(err.message || 'Unknown error');
      setStatus('❌ Failed');
    } finally {
      setLoading(false);
    }
  };

  const proceedWithMint = async (
    token: MintTokenResponse,
    userAddress: string,
    provider: ethers.providers.Web3Provider,
    contentHash: string,
    ipMetadataURI: string,
    nftMetadataURI: string
  ) => {
    try {
      setStatus('⛓️ Minting IP Asset on Story Protocol...');
      const signer = provider.getSigner();

      const REGISTRATION_WORKFLOWS_ADDRESS = import.meta.env.VITE_REGISTRATION_WORKFLOWS || '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424';
      const SPG_NFT_CONTRACT = import.meta.env.VITE_SPG_NFT_COLLECTION || '0x78AD3d22E62824945DED384a5542Ad65de16E637';

      // RegistrationWorkflows ABI - Call DIRECTLY (not through contract)
      const WORKFLOWS_ABI = [
        "function mintAndRegisterIp(address spgNftContract, address recipient, tuple(string ipMetadataURI, bytes32 ipMetadataHash, string nftMetadataURI, bytes32 nftMetadataHash) ipMetadata, bool allowDuplicates) returns (address ipId, uint256 tokenId)"
      ];

      const workflowsContract = new ethers.Contract(
        REGISTRATION_WORKFLOWS_ADDRESS,
        WORKFLOWS_ABI,
        signer
      );

      // Prepare metadata with hashes
      const ipMetadata = {
        ipMetadataURI,
        ipMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipMetadataURI)),
        nftMetadataURI,
        nftMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(nftMetadataURI))
      };

      console.log('🎯 Calling RegistrationWorkflows.mintAndRegisterIp DIRECTLY');
      console.log('SPG NFT Contract:', SPG_NFT_CONTRACT);
      console.log('Recipient:', userAddress);
      console.log('Metadata:', ipMetadata);

      // STEP 1: Use callStatic to predict return values (ipId, tokenId)
      // This simulates the transaction without sending it
      setStatus('🔮 Simulating transaction to get return values...');
      const { ipId: predictedIpId, tokenId: predictedTokenId } = await workflowsContract.callStatic.mintAndRegisterIp(
        SPG_NFT_CONTRACT,
        userAddress,
        ipMetadata,
        true // allowDuplicates
      );

      console.log('✅ Predicted return values:', {
        ipId: predictedIpId,
        tokenId: predictedTokenId.toString()
      });

      // STEP 2: Send the actual transaction
      setStatus('⛓️ Sending transaction to blockchain...');
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
      setStatus('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed!', receipt);

      // Use the predicted values (they're deterministic)
      const ipId = predictedIpId;
      const tokenId = predictedTokenId.toNumber();

      const mintingResult = {
        ipId,
        tokenId,
        txHash: receipt.transactionHash
      };

      console.log('✅ Mint result:', mintingResult);

      // Update backend with result - THIS IS CRITICAL for asset tracking
      try {
        setStatus('💾 Updating backend with IP ID...');
        await verificationService.updateTokenAfterMint({
          nonce: token.nonce,
          ipId: mintingResult.ipId,
          tokenId: mintingResult.tokenId,
          txHash: mintingResult.txHash
        });
        console.log('✅ Backend updated successfully with IP ID and token ID');
        setStatus('✅ Backend updated! IP Asset registered successfully.');
      } catch (backendError: any) {
        console.error('❌ Backend update failed:', backendError);
        setStatus('⚠️ IP minted but backend update failed. Asset may show as pending.');
        // Don't throw - allow user to continue with license attachment
        // They can use the "Find Missing IP IDs" tool later
      }

      setStatus('✅ IP Asset Registered! Configure license terms below.');
      setMintResult(mintingResult);
      setShowLicenseConfig(true);

    } catch (err: any) {
      console.error('Minting failed:', err);
      throw err;
    }
  };

  const handleProceedAsOriginal = async () => {
    setShowWarningModal(false);
    setLoading(true);

    try {
      if (!mintToken) throw new Error('No mint token available');
      if (!contentHash) throw new Error('No content hash available');
      if (!ipMetadataURI || !nftMetadataURI) throw new Error('Metadata URIs not available');

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      setStatus('✅ Proceeding as original work...');
      await proceedWithMint(mintToken, userAddress, provider, contentHash, ipMetadataURI, nftMetadataURI);

    } catch (err: any) {
      console.error('Minting error:', err);
      setError(err.message || 'Unknown error');
      setStatus('❌ Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAsDerivative = async () => {
    setShowWarningModal(false);
    setLoading(true);

    try {
      if (!mintToken || !similarityData || !('warning' in similarityData)) {
        throw new Error('No similarity data available');
      }

      if (!contentHash || !ipMetadataURI || !nftMetadataURI) {
        throw new Error('Metadata not available');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      setStatus('✅ Registering as derivative work...');
      await proceedWithMint(mintToken, userAddress, provider, contentHash, ipMetadataURI, nftMetadataURI);

      // Store parent IP ID for derivative linking (can be done after license attachment)
      localStorage.setItem('pendingDerivativeParent', similarityData.topMatch.ipId);

    } catch (err: any) {
      console.error('Derivative registration error:', err);
      setError(err.message || 'Unknown error');
      setStatus('❌ Failed');
    } finally {
      setLoading(false);
    }
  };

  async function attachLicense() {
    if (!mintResult || !mintToken) {
      setError("No mint result to attach license to.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStatus('Attaching license terms...');
      
      setStatus('Getting or registering license terms...');
      const licenseTermsId = await getLicenseTermsId(
        licenseConfig.type,
        licenseConfig.royaltyPercent
      );
      
      setStatus('Attaching license to IP asset on-chain...');
      const attachTx = await attachLicenseTermsToIp(mintResult.ipId, licenseTermsId);
      
      console.log('✅ License attached on-chain! TX:', attachTx.txHash);
      
      setStatus('💾 Finalizing registration with backend...');
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
      
      console.log('✅ Backend finalized successfully with license info');
      setStatus('🎉 SUCCESS! IP fully registered with license terms in backend.');
      setResult({ ...mintResult, licenseTermsId, licenseTxHash: attachTx.txHash });
      setShowLicenseConfig(false);
      
    } catch (err: any) {
      console.error('License attachment failed:', err);
      setError(err.message || 'License attachment failed');
      setStatus('❌ License attachment failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🧪 Story Protocol Minting Test</h1>

        {/* File Upload Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Upload Content (Optional)</h2>

          {/* File Input */}
          <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center mb-4">
            <input
              type="file"
              accept="video/*,image/*,audio/*,text/*,.md,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-white">
                {file ? (
                  <>
                    <p className="font-medium text-lg mb-2">📁 {file.name}</p>
                    <p className="text-sm text-gray-300">
                      {(file.size / 1024).toFixed(2)} KB • {file.type || 'Unknown type'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg mb-2">📁 Click to upload</p>
                    <p className="text-sm text-gray-300">
                      Video, Image, Audio, or Text file
                    </p>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Asset Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Asset Type
            </label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as any)}
              className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-white"
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {file ? 'Auto-detected from file' : 'Select the type of content you\'re minting'}
            </p>
          </div>
        </div>

        {/* Main Action Button */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Full E2E Minting Flow</h2>
          <p className="text-gray-300 mb-4">
            Tests: Wallet Connect → <strong>RAG Similarity Check</strong> → Backend Auth → Mint IP → Attach License
          </p>

          <button
            onClick={testMinting}
            disabled={loading || showLicenseConfig}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            {loading ? '⏳ Processing...' : file ? '🚀 Upload & Mint IP Asset' : '🚀 Start Full Minting Flow'}
          </button>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-2">Status</h3>
          <p className="text-lg font-mono">{status}</p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold mb-2 text-red-400">❌ Error</h3>
            <p className="font-mono text-red-300">{error}</p>
          </div>
        )}

        {showLicenseConfig && !result && (
          <div className="bg-blue-500/20 border-2 border-blue-400 rounded-lg p-6 mb-6">
            <h3 className="text-2xl font-semibold mb-4 text-blue-300">🎉 IP Registered! Now, Attach a License.</h3>
            <div className="space-y-2 font-mono text-sm mb-6">
              <div><span className="text-gray-400">IP ID:</span> <p className="text-blue-200 break-all">{mintResult?.ipId}</p></div>
              <div><span className="text-gray-400">Token ID:</span> <p className="text-blue-200">{mintResult?.tokenId}</p></div>
            </div>

            <div className="space-y-4">
              <div className="license-type-selector bg-black/20 p-4 rounded-md">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="radio" name="licenseType" className="form-radio h-5 w-5 text-blue-400 bg-gray-700 border-gray-600 focus:ring-blue-500" checked={licenseConfig.type === 'commercial_remix'} onChange={() => setLicenseConfig({ ...licenseConfig, type: 'commercial_remix' })} />
                  <div>
                    <span className="font-semibold">Commercial Remix</span>
                    <span className="block text-xs text-gray-400">✓ Commercial use ✓ Derivatives ✓ Attribution</span>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer mt-2">
                  <input type="radio" name="licenseType" className="form-radio h-5 w-5 text-blue-400 bg-gray-700 border-gray-600 focus:ring-blue-500" checked={licenseConfig.type === 'non_commercial'} onChange={() => setLicenseConfig({ ...licenseConfig, type: 'non_commercial', royaltyPercent: 0 })} />
                  <div>
                    <span className="font-semibold">Non-Commercial Only</span>
                    <span className="block text-xs text-gray-400">✗ No commercial use ✓ Derivatives ✓ Attribution</span>
                  </div>
                </label>
              </div>

              {licenseConfig.type === 'commercial_remix' && (
                <div className="royalty-slider bg-black/20 p-4 rounded-md">
                  <label className="block mb-2 font-semibold">Royalty Percentage: {licenseConfig.royaltyPercent}%</label>
                  <input type="range" min="0" max="100" value={licenseConfig.royaltyPercent} onChange={(e) => setLicenseConfig({ ...licenseConfig, royaltyPercent: parseInt(e.target.value) })} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
              )}

              <button
                onClick={attachLicense}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                {loading ? '⏳ Attaching...' : 'Attach License & Finalize'}
              </button>
            </div>
          </div>
        )}
        
        {result && (
          <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-green-400">✅ IP Fully Registered!</h3>
            <div className="space-y-2 font-mono text-sm">
              <div><span className="text-gray-400">IP ID:</span><p className="text-green-300 break-all">{result.ipId}</p></div>
              <div><span className="text-gray-400">Token ID:</span><p className="text-green-300">{result.tokenId}</p></div>
              {result.licenseTermsId && <div><span className="text-gray-400">License Terms ID:</span><p className="text-green-300">{result.licenseTermsId}</p></div>}
              <div><span className="text-gray-400">Mint Tx Hash:</span><p className="text-green-300 break-all">{result.txHash}</p></div>
              {result.licenseTxHash && <div><span className="text-gray-400">License Tx Hash:</span><p className="text-green-300 break-all">{result.licenseTxHash}</p></div>}
            </div>
            <a href={`${AENEID_CONFIG.blockExplorerUrls[0]}/tx/${result.licenseTxHash || result.txHash}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors">
              View on Explorer →
            </a>
          </div>
        )}

        <MintedAssets />

        {/* Info Section */}
        <div className="mt-8 bg-white/5 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">ℹ️ What This Tests:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>🔥 <strong>RAG-Powered Similarity Detection</strong> (NEW!)</li>
            <li>File upload support for real content</li>
            <li>Aeneid network connection and switching</li>
            <li>Backend signature authorization</li>
            <li>Direct user wallet call to RegistrationWorkflows</li>
            <li>Story Protocol IP registration</li>
            <li>License attachment with user choice</li>
            <li>Complete end-to-end flow (upload → detect → mint → license)</li>
          </ul>
        </div>
      </div>

      {/* Similarity Modals */}
      {showWarningModal && similarityData && 'warning' in similarityData && (
        <SimilarityWarningModal
          isOpen={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          similarityInfo={similarityData}
          onProceedAsOriginal={handleProceedAsOriginal}
          onRegisterAsDerivative={handleRegisterAsDerivative}
        />
      )}

      {showBlockedModal && similarityData && !('warning' in similarityData) && (
        <SimilarityBlockedModal
          isOpen={showBlockedModal}
          onClose={() => {
            setShowBlockedModal(false);
            setFile(null); // Clear file on close
          }}
          blockedInfo={similarityData}
        />
      )}
    </div>
  );
}

function MintedAssets() {
  const { address } = useAccount();
  const { data, isLoading, error } = useUserAssets({ walletAddress: address as string });

  if (!address) {
    return (
      <div className="mt-8 bg-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">Your Minted Assets</h3>
        <p>Please connect your wallet to see your minted assets.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white/5 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-2">Your Minted Assets</h3>
      {isLoading && <p>Loading your assets...</p>}
      {error && <p>Error loading assets: {error.message}</p>}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.assets.map((asset) => (
            <AssetCard key={asset._id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
