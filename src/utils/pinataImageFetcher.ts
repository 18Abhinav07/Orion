/**
 * Enhanced IPFS Image Fetching for Pinata
 * Extracted from working marketplace implementation
 */

// Enhanced IPFS metadata fetching with JWT authentication - based on working code
export const fetchMetadataFromIPFS = async (metadataURI: string) => {
  try {
    console.log('🔄 Fetching metadata from IPFS:', metadataURI);
    
    // Get JWT token from environment
    const JWT_TOKEN = import.meta.env.VITE_JWT_SECRET || import.meta.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjMDU3NzI3NC0xMzU2LTRmZjgtODk5Yi02MjU0MTZmNTMxYTEiLCJlbWFpbCI6ImFkb2U3NDAzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJlZTdmZDhiNDY3MGU4ZTc1Y2YxZiIsInNjb3BlZEtleVNlY3JldCI6Ijg3NjU3MDdkNzBmNzAyZjFkYTAxMmVhNmU1MmYzNDUyMjFkOGE0YzgwMWFjYjVlN2Y4NTk5NzYwODIyNTc3ZGYiLCJleHAiOjE3OTA5Mzk1NTR9.huKruxuknG20OfbJsMjiuIaLTQMbCWsILk1B5Dl7Oko';
    
    // Convert IPFS URI to HTTP gateway URL - simple and direct approach
    const ipfsHash = metadataURI.replace('ipfs://', '');
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    
    console.log('🌐 Fetching from:', ipfsUrl);
    
    // Prepare headers with JWT authentication
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    
    // Add JWT authentication for Pinata requests
    if (JWT_TOKEN) {
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
      console.log('🔐 Using JWT authentication for Pinata request');
    }
    
    // Fast fetch with timeout - same pattern as working code
    const response = await Promise.race([
      fetch(ipfsUrl, {
        method: 'GET',
        headers
      }),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 8000)
      )
    ]);
    
    if (!response.ok) {
      console.log(`❌ Pinata request failed: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const metadata = await response.json();
    console.log('✅ Metadata fetched successfully from Pinata:', metadata);
    
    // Simple image processing - convert ipfs:// to gateway URL with auth
    if (metadata.image) {
      if (metadata.image.startsWith('ipfs://')) {
        const imageHash = metadata.image.replace('ipfs://', '');
        metadata.image = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
        console.log('✅ Converted IPFS image URL:', metadata.image);
      }
    }
    
    return metadata;
    
  } catch (error) {
    console.error('❌ Error fetching IPFS metadata from Pinata:', error);
    return null;
  }
};

// Simple image URL processing - convert IPFS to authenticated Pinata gateway URL
export const processImageURL = (imageUrl: string, metadata?: any): string => {
  if (!imageUrl) return '';
  
  // If it's already an HTTP URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's an IPFS URL, convert to Pinata HTTP gateway
  if (imageUrl.startsWith('ipfs://')) {
    const ipfsHash = imageUrl.replace('ipfs://', '');
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    console.log('✅ Converting IPFS URL for authenticated access:', imageUrl, '→', gatewayUrl);
    return gatewayUrl;
  }
  
  // If it's just a hash, assume it's IPFS
  if (imageUrl.match(/^[a-zA-Z0-9]{46,59}$/)) {
    return `https://gateway.pinata.cloud/ipfs/${imageUrl}`;
  }
  
  // Return as is for other formats
  return imageUrl;
};

// Test function to verify Pinata access
export const testPinataAccess = async (testHash = 'QmQoHpAJNJyWUgC7QGMgAnzdaMekpMAeCi1voJH6iSaFRi') => {
  console.log('🔬 Testing Pinata access...');
  
  const JWT_TOKEN = import.meta.env.VITE_JWT_SECRET || import.meta.env.JWT_SECRET;
  
  try {
    // Test metadata fetch
    const testMetadataURI = `ipfs://${testHash}`;
    const metadata = await fetchMetadataFromIPFS(testMetadataURI);
    
    if (metadata) {
      console.log('✅ Pinata metadata fetch test successful!');
      
      // Test image URL processing
      if (metadata.image) {
        const processedImageUrl = processImageURL(metadata.image);
        console.log('✅ Image URL processing test successful:', processedImageUrl);
        
        // Test image accessibility
        try {
          const headers: Record<string, string> = {};
          if (JWT_TOKEN && processedImageUrl.includes('gateway.pinata.cloud')) {
            headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
          }
          
          const imageResponse = await fetch(processedImageUrl, {
            method: 'HEAD',
            headers
          });
          
          if (imageResponse.ok) {
            console.log('✅ Pinata image access test successful!');
            return { success: true, metadata, imageUrl: processedImageUrl };
          } else {
            console.log(`⚠️ Image not accessible: ${imageResponse.status}`);
            return { success: true, metadata, imageUrl: processedImageUrl, imageError: imageResponse.status };
          }
        } catch (imageError) {
          console.log('⚠️ Image test failed:', imageError);
          return { success: true, metadata, imageUrl: processedImageUrl, imageError };
        }
      }
      
      return { success: true, metadata };
    } else {
      console.log('❌ Pinata metadata fetch test failed');
      return { success: false, error: 'Metadata fetch failed' };
    }
    
  } catch (error) {
    console.error('❌ Pinata access test failed:', error);
    return { success: false, error };
  }
};