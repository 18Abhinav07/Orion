/**
 * IPFS Metadata Testing Script
 * This script tests metadata fetching from various IPFS sources to identify dummy data issues
 */

import { metadataService } from '../services/metadataService';

interface TestResult {
  source: string;
  uri: string;
  success: boolean;
  metadata: any;
  error?: string;
  timeTaken: number;
}

export class IPFSTestScript {
  private results: TestResult[] = [];

  /**
   * Test metadata fetching from common IPFS URIs
   */
  async testCommonIPFSFormats(): Promise<void> {
    console.log('🧪 Testing Common IPFS URI Formats...\n');

    const testURIs = [
      // Sample real IPFS hashes (these might exist on IPFS)
      'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      'https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      
      // Test with different hash types
      'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      'https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      
      // Test invalid/dummy formats
      'ipfs://TestHash123',
      'https://gateway.pinata.cloud/ipfs/TestHash123',
      '',
      'invalid-uri'
    ];

    for (const uri of testURIs) {
      await this.testSingleURI('Common Format Test', uri);
    }

    this.printResults('Common IPFS Format Tests');
  }

  /**
   * Test gateway performance individually
   */
  async testGatewayPerformance(): Promise<void> {
    console.log('\n🌐 Testing Individual Gateway Performance...\n');

    // Use a known good IPFS hash for testing
    const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
    
    const gateways = [
      { name: 'Custom Pinata', url: `https://olive-left-snake-740.mypinata.cloud/ipfs/${testHash}` },
      { name: 'Pinata Gateway', url: `https://gateway.pinata.cloud/ipfs/${testHash}` },
      { name: 'IPFS.io', url: `https://ipfs.io/ipfs/${testHash}` },
      { name: 'Dweb Link', url: `https://dweb.link/ipfs/${testHash}` },
      { name: 'Cloudflare', url: `https://cloudflare-ipfs.com/ipfs/${testHash}` },
      { name: 'IPFS Gateway', url: `https://gateway.ipfs.io/ipfs/${testHash}` },
      { name: 'Infura', url: `https://ipfs.infura.io/ipfs/${testHash}` },
      { name: 'CF IPFS', url: `https://cf-ipfs.com/ipfs/${testHash}` }
    ];

    for (const gateway of gateways) {
      await this.testGatewayDirect(gateway.name, gateway.url);
    }

    this.printResults('Gateway Performance Tests');
  }

  /**
   * Test metadata service with current app data
   */
  async testCurrentAppMetadata(): Promise<void> {
    console.log('\n📱 Testing Current App Metadata Sources...\n');

    // Check localStorage for any cached metadata URIs
    const marketplaceCache = localStorage.getItem('marketplaceCache');
    const dashboardCache = localStorage.getItem('dashboardCache');

    console.log('📦 Checking localStorage caches...');
    
    if (marketplaceCache) {
      try {
        const data = JSON.parse(marketplaceCache);
        console.log('🛒 Marketplace cache found:', Object.keys(data).length, 'entries');
        
        // Test a few metadata URIs from marketplace cache
        const sampleURIs = Object.values(data).slice(0, 3).map((item: any) => item.metadataURI).filter(Boolean);
        for (const uri of sampleURIs) {
          await this.testSingleURI('Marketplace Cache', uri as string);
        }
      } catch (error) {
        console.warn('⚠️ Error parsing marketplace cache:', error);
      }
    }

    if (dashboardCache) {
      try {
        const data = JSON.parse(dashboardCache);
        console.log('📊 Dashboard cache found:', Object.keys(data).length, 'entries');
        
        // Test a few metadata URIs from dashboard cache
        const sampleURIs = Object.values(data).slice(0, 3).map((item: any) => item.metadataURI).filter(Boolean);
        for (const uri of sampleURIs) {
          await this.testSingleURI('Dashboard Cache', uri as string);
        }
      } catch (error) {
        console.warn('⚠️ Error parsing dashboard cache:', error);
      }
    }

    // Test with simulated contract responses
    await this.testSimulatedContractData();

    this.printResults('Current App Metadata Tests');
  }

  /**
   * Test with simulated contract metadata URIs
   */
  private async testSimulatedContractData(): Promise<void> {
    console.log('\n🔗 Testing Simulated Contract Metadata...');

    // Simulate what the smart contract might return
    const simulatedContractURIs = [
      'ipfs://TestHash_Asset_1',
      'ipfs://TestHash_Asset_2', 
      'https://gateway.pinata.cloud/ipfs/TestHash_Asset_3',
      'https://gateway.pinata.cloud/ipfs/https://gateway.pinata.cloud/ipfs/TestHash_Doubled',
      '', // Empty URI
      'ipfs://QmRealHashButMightNotExist123456789012345678901234567890123'
    ];

    for (const uri of simulatedContractURIs) {
      await this.testSingleURI('Simulated Contract', uri);
    }
  }

  /**
   * Test a single URI with the metadata service
   */
  private async testSingleURI(source: string, uri: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔍 Testing [${source}]: ${uri || '(empty)'}`);
      
      const metadata = await metadataService.fetchMetadataFromIPFS(uri);
      const timeTaken = Date.now() - startTime;
      
      if (metadata) {
        console.log(`  ✅ Success (${timeTaken}ms)`);
        console.log(`  📝 Name: ${metadata.name || 'N/A'}`);
        console.log(`  🖼️ Image: ${metadata.image ? 'Present' : 'Missing'}`);
        console.log(`  🏷️ Asset Type: ${this.extractAssetType(metadata)}`);
        
        this.results.push({
          source,
          uri,
          success: true,
          metadata,
          timeTaken
        });
      } else {
        console.log(`  ❌ Failed (${timeTaken}ms) - Returned null`);
        
        this.results.push({
          source,
          uri,
          success: false,
          metadata: null,
          error: 'Returned null',
          timeTaken
        });
      }
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      console.log(`  ❌ Error (${timeTaken}ms):`, error.message);
      
      this.results.push({
        source,
        uri,
        success: false,
        metadata: null,
        error: error.message,
        timeTaken
      });
    }
  }

  /**
   * Test gateway directly (bypassing metadata service)
   */
  private async testGatewayDirect(gatewayName: string, url: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🌐 Testing Gateway [${gatewayName}]: ${url}`);
      
      const response = await Promise.race([
        fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }),
        new Promise<Response>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
        )
      ]);

      const timeTaken = Date.now() - startTime;

      if (response.ok) {
        try {
          const data = await response.json();
          console.log(`  ✅ Gateway Success (${timeTaken}ms)`);
          console.log(`  📝 Content: ${data.name || 'No name'}`);
          
          this.results.push({
            source: `Gateway: ${gatewayName}`,
            uri: url,
            success: true,
            metadata: data,
            timeTaken
          });
        } catch (jsonError) {
          console.log(`  ⚠️ Gateway responded but invalid JSON (${timeTaken}ms)`);
          this.results.push({
            source: `Gateway: ${gatewayName}`,
            uri: url,
            success: false,
            metadata: null,
            error: 'Invalid JSON response',
            timeTaken
          });
        }
      } else {
        console.log(`  ❌ Gateway HTTP ${response.status} (${timeTaken}ms)`);
        this.results.push({
          source: `Gateway: ${gatewayName}`,
          uri: url,
          success: false,
          metadata: null,
          error: `HTTP ${response.status}`,
          timeTaken
        });
      }
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      console.log(`  ❌ Gateway Error (${timeTaken}ms):`, error.message);
      
      this.results.push({
        source: `Gateway: ${gatewayName}`,
        uri: url,
        success: false,
        metadata: null,
        error: error.message,
        timeTaken
      });
    }
  }

  /**
   * Extract asset type from metadata
   */
  private extractAssetType(metadata: any): string {
    if (metadata?.attributes) {
      const assetTypeAttr = metadata.attributes.find((attr: any) => 
        attr.trait_type === 'Asset Type'
      );
      if (assetTypeAttr) return assetTypeAttr.value;
    }
    
    if (metadata?.assetDetails?.assetType) {
      return metadata.assetDetails.assetType;
    }
    
    return 'Unknown';
  }

  /**
   * Print test results summary
   */
  private printResults(testName: string): void {
    console.log(`\n📊 === ${testName} Results ===`);
    
    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;
    const successRate = totalCount > 0 ? (successCount / totalCount * 100).toFixed(1) : '0';
    
    console.log(`Success Rate: ${successCount}/${totalCount} (${successRate}%)`);
    
    if (successCount > 0) {
      const avgTime = this.results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.timeTaken, 0) / successCount;
      console.log(`Average Success Time: ${avgTime.toFixed(0)}ms`);
    }

    // Show error breakdown
    const errorCounts = this.results
      .filter(r => !r.success)
      .reduce((acc, r) => {
        const error = r.error || 'Unknown error';
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    if (Object.keys(errorCounts).length > 0) {
      console.log('\n❌ Error Breakdown:');
      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`  ${error}: ${count} times`);
      });
    }

    // Clear results for next test
    this.results = [];
  }

  /**
   * Run complete test suite
   */
  async runCompleteTest(): Promise<void> {
    console.log('🚀 Starting Complete IPFS Metadata Test Suite...\n');
    
    // Clear metadata cache before testing
    metadataService.clearCache();
    
    try {
      await this.testCommonIPFSFormats();
      await this.testGatewayPerformance();
      await this.testCurrentAppMetadata();
      
      console.log('\n🎉 Complete test suite finished!');
      console.log('\n💡 Debugging Tips:');
      console.log('1. Check browser console for detailed gateway logs');
      console.log('2. Use window.metadataService.cache to inspect cached results');
      console.log('3. Use window.MetadataDebugUtils.inspectCache() for cache analysis');
      console.log('4. Look for patterns in failed URIs vs successful ones');
      
    } catch (error) {
      console.error('❌ Test suite error:', error);
    }
  }

  /**
   * Quick test for specific IPFS hash
   */
  async quickTest(ipfsHash: string): Promise<void> {
    console.log(`🔬 Quick test for IPFS hash: ${ipfsHash}`);
    
    const formats = [
      `ipfs://${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      ipfsHash
    ];

    for (const format of formats) {
      await this.testSingleURI('Quick Test', format);
    }
  }
}

// Make test script available globally
const ipfsTestScript = new IPFSTestScript();
(window as any).IPFSTestScript = ipfsTestScript;

export default ipfsTestScript;