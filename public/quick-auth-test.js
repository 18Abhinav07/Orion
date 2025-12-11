// Quick debug script for web console
// Paste this in browser console to test authorization

async function quickAuthTest() {
  console.log('🔍 Quick Authorization Test');
  
  try {
    // Get provider from window.ethereum
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    
    console.log('Provider:', provider);
    console.log('Signer:', signer);
    console.log('Address:', address);
    
    // Test admin contract directly
    const ADMIN_CONTRACT = "0x1e7D5f9c9f59dDaf39B31dC9e136E3e0Aae204d5";
    const ADMIN_ABI = ["function isIssuer(address _address) external view returns (bool)"];
    
    // Test with provider
    const adminWithProvider = new ethers.Contract(ADMIN_CONTRACT, ADMIN_ABI, provider);
    const result1 = await adminWithProvider.isIssuer(address);
    console.log('✅ Result with provider:', result1);
    
    // Test with signer
    const adminWithSigner = new ethers.Contract(ADMIN_CONTRACT, ADMIN_ABI, signer);
    const result2 = await adminWithSigner.isIssuer(address);
    console.log('✅ Result with signer:', result2);
    
    // Test network
    const network = await provider.getNetwork();
    console.log('Network:', network);
    
    // Test contract code
    const code = await provider.getCode(ADMIN_CONTRACT);
    console.log('Contract code length:', code.length);
    
    return { result1, result2, network, codeLength: code.length };
    
  } catch (error) {
    console.error('❌ Quick auth test failed:', error);
    return { error: error.message };
  }
}

// Run the test
window.quickAuthTest = quickAuthTest;
console.log('✅ quickAuthTest function ready. Call window.quickAuthTest() to run.');