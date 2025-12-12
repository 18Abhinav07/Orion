// Test component for Story Protocol minting - Custom contract approach
import { useState } from 'react';
import { ethers } from 'ethers';
import { VerificationService } from '../services/verificationService';
import { storyProtocolService } from '../services/storyProtocolService';

const verificationService = new VerificationService();

// Aeneid testnet configuration
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

export default function TestMinting() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const hashContent = (content: string): string => {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
  };

  const switchToAeneid = async () => {
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

  const testMinting = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Connect wallet and switch to Aeneid
      setStatus('🔌 Connecting to Aeneid network...');
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      // Switch to Aeneid network first
      await switchToAeneid();

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      // Verify we're on the right network
      const network = await provider.getNetwork();
      if (network.chainId !== 1315) {
        throw new Error(`Wrong network! Please switch to Aeneid (Chain ID: 1315). Current: ${network.chainId}`);
      }

      console.log('Connected as:', userAddress);
      console.log('Network:', network.name, 'Chain ID:', network.chainId);
      
      // Step 2: Prepare test content
      setStatus('📝 Preparing test content...');
      const testContent = `# Test IP Asset\n\nThis is a test document for Story Protocol minting.\n\nCreated at: ${new Date().toISOString()}\nCreator: ${userAddress}`;
      const contentHash = hashContent(testContent);
      
      console.log('Content hash:', contentHash);
      
      // Step 3: Create metadata (mock IPFS URIs for now)
      setStatus('☁️ Creating metadata...');
      const ipMetadataURI = `ipfs://QmTestIP${Date.now()}`;
      const nftMetadataURI = `ipfs://QmTestNFT${Date.now()}`;
      
      console.log('Metadata URIs:', { ipMetadataURI, nftMetadataURI });
      
      // Step 4: Request backend signature (verification)
      setStatus('🔐 Requesting backend verification...');
      const mintToken = await verificationService.generateMintToken({
        creatorAddress: userAddress,
        contentHash,
        ipMetadataURI,
        nftMetadataURI
      });
      
      console.log('✅ Backend approved! Signature:', mintToken.signature);
      setStatus(`✅ Verified! Nonce: ${mintToken.nonce}, Expires in: ${mintToken.expiresIn}s`);

      // Step 5: Call RegistrationWorkflows directly with user's wallet
      setStatus('🚀 Calling RegistrationWorkflows...');

      const REGISTRATION_WORKFLOWS_ADDRESS = import.meta.env.VITE_REGISTRATION_WORKFLOWS || '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424';
      const SPG_NFT_CONTRACT = import.meta.env.VITE_SPG_NFT_COLLECTION || '0x78AD3d22E62824945DED384a5542Ad65de16E637';

      // RegistrationWorkflows ABI (with correct signature including allowDuplicates param)
      const WORKFLOWS_ABI = [
        "function mintAndRegisterIp(address spgNftContract, address recipient, tuple(string ipMetadataURI, bytes32 ipMetadataHash, string nftMetadataURI, bytes32 nftMetadataHash) ipMetadata, bool allowDuplicates) returns (address ipId, uint256 tokenId)"
      ];

      const workflowsContract = new ethers.Contract(
        REGISTRATION_WORKFLOWS_ADDRESS,
        WORKFLOWS_ABI,
        signer
      );

      // Prepare metadata
      const ipMetadata = {
        ipMetadataURI,
        ipMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ipMetadataURI)),
        nftMetadataURI,
        nftMetadataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(nftMetadataURI))
      };

      console.log('Calling mintAndRegisterIp with:', {
        spgNftContract: SPG_NFT_CONTRACT,
        recipient: userAddress,
        ipMetadata
      });

      // Step 6: Mint and register IP
      setStatus('⛓️ Minting IP Asset...');

      const tx = await workflowsContract.mintAndRegisterIp(
        SPG_NFT_CONTRACT,
        userAddress,
        ipMetadata,
        true, // allowDuplicates - allow minting even if duplicate metadata exists
        {
          gasLimit: 5000000 // 5M gas
        }
      );

      console.log('📝 Transaction sent:', tx.hash);
      setStatus('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed!', receipt);

      // Parse events to get ipId and tokenId
      let ipId = '';
      let tokenId = 0;

      // Look for Transfer or IPRegistered events
      for (const log of receipt.logs) {
        try {
          const parsedLog = workflowsContract.interface.parseLog(log);
          console.log('Parsed log:', parsedLog);
        } catch (e) {
          // Try to find token ID from logs
          if (log.topics.length >= 4) {
            // Standard Transfer event has 4 topics: signature, from, to, tokenId
            tokenId = parseInt(log.topics[3], 16);
          }
        }
      }

      // Get IP ID from registry if needed
      // For now, we'll use transaction hash as a placeholder
      ipId = receipt.contractAddress || `IP-${receipt.transactionHash.slice(0, 10)}`;

      const mintResult = {
        ipId,
        tokenId,
        txHash: receipt.transactionHash
      };

      console.log('Mint result:', mintResult);
      
      // Step 7: Update backend with result (optional - don't fail if this fails)
      setStatus('📡 Updating backend...');
      try {
        await verificationService.updateTokenAfterMint({
          nonce: mintToken.nonce,
          ipId: mintResult.ipId,
          tokenId: mintResult.tokenId,
          txHash: mintResult.txHash
        });
        console.log('✅ Backend updated successfully');
      } catch (backendError: any) {
        console.warn('⚠️ Backend update failed (non-critical):', backendError.message);
        // Don't throw - minting already succeeded
      }

      setStatus('🎉 SUCCESS! IP Asset minted!');
      setResult({
        ipId: mintResult.ipId,
        tokenId: mintResult.tokenId,
        txHash: mintResult.txHash,
        nonce: mintToken.nonce,
        contentHash
      });
      
    } catch (err: any) {
      console.error('Minting error:', err);
      setError(err.message || 'Unknown error');
      setStatus('❌ Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🧪 Story Protocol Minting Test</h1>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Test Minting Flow</h2>
          <p className="text-gray-300 mb-4">
            This will test the complete flow: Connect to Aeneid → Hash content → Backend signature authorization → Direct mint via RegistrationWorkflows → Register IP on Story Protocol
          </p>
          
          <button
            onClick={testMinting}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            {loading ? '⏳ Processing...' : '🚀 Start Test Mint'}
          </button>
        </div>
        
        {/* Status */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-2">Status</h3>
          <p className="text-lg font-mono">{status}</p>
        </div>
        
        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold mb-2 text-red-400">❌ Error</h3>
            <p className="font-mono text-red-300">{error}</p>
          </div>
        )}
        
        {/* Result */}
        {result && (
          <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-green-400">✅ Minting Successful!</h3>
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="text-gray-400">IP ID:</span>
                <p className="text-green-300 break-all">{result.ipId}</p>
              </div>
              <div>
                <span className="text-gray-400">Token ID:</span>
                <p className="text-green-300">{result.tokenId}</p>
              </div>
              <div>
                <span className="text-gray-400">License Terms ID:</span>
                <p className="text-green-300">{result.licenseTermsId}</p>
              </div>
              <div>
                <span className="text-gray-400">Tx Hash:</span>
                <p className="text-green-300 break-all">{result.txHash}</p>
              </div>
              <div>
                <span className="text-gray-400">Nonce (Backend Verified):</span>
                <p className="text-green-300">{result.nonce}</p>
              </div>
              <div>
                <span className="text-gray-400">Content Hash:</span>
                <p className="text-green-300 break-all">{result.contentHash}</p>
              </div>
            </div>
            
            <a
              href={`https://aeneid.storyscan.xyz/tx/${result.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
            >
              View on Explorer →
            </a>
          </div>
        )}
        
        {/* Info */}
        <div className="mt-8 bg-white/5 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">ℹ️ What This Tests:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>Aeneid network connection and switching</li>
            <li>Backend signature authorization</li>
            <li>Direct user wallet call to RegistrationWorkflows</li>
            <li>Story Protocol IP registration</li>
            <li>NFT minting on SPG collection</li>
            <li>Complete end-to-end flow (wallet → backend auth → direct mint)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
