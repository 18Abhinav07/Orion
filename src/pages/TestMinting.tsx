// Test component for Story Protocol minting
import { useState } from 'react';
import { ethers } from 'ethers';
import { VerificationService } from '../services/verificationService';
import { storyProtocolService } from '../services/storyProtocolService';

const verificationService = new VerificationService();

export default function TestMinting() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const hashContent = (content: string): string => {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
  };

  const testMinting = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Step 1: Connect wallet
      setStatus('🔌 Connecting wallet...');
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }
      
      // ethers v5 syntax
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      
      console.log('Connected as:', userAddress);
      
      // Step 2: Prepare test content
      setStatus('📝 Preparing test content...');
      const testContent = `# Test IP Asset\n\nThis is a test document for Story Protocol minting.\n\nCreated at: ${new Date().toISOString()}\nCreator: ${userAddress}`;
      const contentHash = hashContent(testContent);
      
      console.log('Content hash:', contentHash);
      
      // Step 3: Upload metadata to IPFS (mock for now - you can integrate Pinata later)
      setStatus('☁️ Creating metadata...');
      const ipMetadata = {
        name: 'Test IP Asset',
        description: 'Testing Story Protocol minting with backend verification',
        content: testContent,
        attributes: [
          { trait_type: 'Type', value: 'Document' },
          { trait_type: 'Creator', value: userAddress }
        ]
      };
      
      const nftMetadata = {
        name: 'Test IP NFT',
        description: 'NFT representation of test IP',
        image: 'ipfs://QmTest...' // Placeholder
      };
      
      // For now, using mock IPFS URIs - replace with actual Pinata upload
      const ipMetadataURI = `ipfs://QmTestIP${Date.now()}`;
      const nftMetadataURI = `ipfs://QmTestNFT${Date.now()}`;
      
      console.log('Metadata URIs created');
      
      // Step 4: Request backend signature
      setStatus('🔐 Requesting backend signature...');
      const mintToken = await verificationService.generateMintToken({
        creatorAddress: userAddress,
        contentHash,
        ipMetadataURI,
        nftMetadataURI
      });
      
      console.log('Got signature:', mintToken);
      setStatus(`✅ Signature received! Nonce: ${mintToken.nonce}, Expires in: ${mintToken.expiresIn}s`);
      
      // Step 5: Call smart contract
      setStatus('⛓️ Calling smart contract...');
      
      await storyProtocolService.initialize(signer);
      
      const mintResult = await storyProtocolService.verifyAndMint({
        to: userAddress,
        contentHash,
        ipMetadataURI,
        nftMetadataURI,
        nonce: mintToken.nonce,
        expiryTimestamp: mintToken.expiresAt,
        signature: mintToken.signature
      });
      
      console.log('Mint result:', mintResult);
      
      // Step 6: Update backend
      setStatus('📡 Updating backend...');
      await verificationService.updateTokenAfterMint(
        mintToken.nonce,
        {
          ipId: mintResult.ipId,
          tokenId: mintResult.tokenId,
          txHash: mintResult.txHash
        }
      );
      
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
            This will test the complete flow: hash content → request backend signature → mint IP asset
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
                <span className="text-gray-400">Tx Hash:</span>
                <p className="text-green-300 break-all">{result.txHash}</p>
              </div>
              <div>
                <span className="text-gray-400">Nonce:</span>
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
            <li>Backend signature generation</li>
            <li>Smart contract verification</li>
            <li>IP asset registration on Story Protocol</li>
            <li>NFT minting on SPG collection</li>
            <li>Complete end-to-end flow</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
