import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsTrigger, TabsList } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { BackgroundBeamsWithCollision } from '../../components/ui/background-beams-with-collision';
import { useWallet } from '../../context/WalletContext';
import { MarketplaceListing } from '../../utils/marketplaceCache';
import HeroBackground from '../../components/HeroBackground';
import { FeaturedPropertiesCarousel } from '../../components/marketplace/FeaturedPropertiesCarousel';
import { ProfessionalListingsGrid } from '../../components/marketplace/ProfessionalListingsGrid';
import { ProfessionalExpandedDetail } from '../../components/marketplace/ProfessionalExpandedDetail';
import { LicenseMintingModal } from '../../components/marketplace/LicenseMintingModal';
import { marketplaceService } from '../../services/marketplaceService';
import { licenseTokenService } from '../../services/licenseTokenService';

const NewMarketplace: React.FC = () => {
  const navigate = useNavigate();
  const { address, signer, provider, isCorrectNetwork, switchToRequiredNetwork } = useWallet();

  // State management
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [selectedListingForLicense, setSelectedListingForLicense] = useState<MarketplaceListing | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showLicenseMintingModal, setShowLicenseMintingModal] = useState(false);
  const [userLicenses, setUserLicenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  // Load user licenses
  useEffect(() => {
    const loadUserLicenses = async () => {
      if (address && provider) {
        const licenses = await licenseTokenService.getUserLicenses(address, provider);
        setUserLicenses(licenses);
      }
    };
    loadUserLicenses();
  }, [address, provider]);

  // Load marketplace listings
  useEffect(() => {
    loadMarketplaceListings();
  }, []);

  const handlenavigate = () => {
    navigate('/dashboard');
  }

  const loadMarketplaceListings = async (forceRefresh: boolean = false) => {
    console.log(`🔄 Loading licensed IPs from backend (forceRefresh: ${forceRefresh})`);
    setLoading(true);

    try {
      // Fetch licensed IPs from backend
      const licensedIps = await marketplaceService.getLicensedIps();
      console.log(`📜 Fetched ${licensedIps.length} licensed IPs from backend`);

      // Transform licensed IPs to marketplace listings format with metadata fetching
      const processedListings: MarketplaceListing[] = await Promise.all(
        licensedIps.map(async (ip) => {
          let title = `IP Asset #${ip.tokenId}`;
          let description = `Licensed IP Asset - Token ID: ${ip.tokenId}`;
          let imageUrl = '';

          // Fetch NFT metadata to get title and image
          try {
            const nftMetadataUrl = ip.metadata.nftMetadataURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
            console.log(`📥 Fetching metadata for token ${ip.tokenId}:`, nftMetadataUrl);

            const metadataResponse = await fetch(nftMetadataUrl);
            if (metadataResponse.ok) {
              const metadata = await metadataResponse.json();
              console.log(`✅ Got metadata for token ${ip.tokenId}:`, metadata);

              // Extract title/name and image
              title = metadata.name || metadata.title || title;
              description = metadata.description || description;
              imageUrl = metadata.image || '';

              // Convert IPFS image URL
              if (imageUrl && imageUrl.startsWith('ipfs://')) {
                imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
              }
            }
          } catch (error) {
            console.warn(`⚠️ Failed to fetch metadata for token ${ip.tokenId}:`, error);
          }

          return {
            tokenId: ip.ipId, // Use ipId as tokenId for display
            name: title,
            description,
            image: imageUrl || 'https://via.placeholder.com/400x300?text=IP+Asset',
            price: '0', // License minting fee will be fetched from license terms
            amount: 999, // Unlimited for license tokens
            totalSupply: 1,
            seller: ip.creatorAddress,
            metadataURI: ip.metadata.ipMetadataURI || '',
            type: 'IP Asset',
            category: 'Intellectual Property',
            attributes: [
              { trait_type: 'IP ID', value: ip.ipId },
              { trait_type: 'Token ID', value: ip.tokenId.toString() },
              { trait_type: 'License Terms ID', value: ip.license.licenseTermsId },
              { trait_type: 'License Type', value: ip.license.licenseType === 'commercial_remix' ? 'Commercial Remix' : 'Non-Commercial' },
              { trait_type: 'Royalty', value: `${ip.license.royaltyPercent}%` },
              { trait_type: 'Derivatives Allowed', value: ip.license.allowDerivatives ? 'Yes' : 'No' },
              { trait_type: 'Commercial Use', value: ip.license.commercialUse ? 'Yes' : 'No' },
              { trait_type: 'Status', value: ip.status }
            ],
            license: {
              ipId: ip.ipId,
              licenseTermsId: ip.license.licenseTermsId,
              terms: {
                transferable: true,
                commercialUse: ip.license.commercialUse,
                commercialRevShare: ip.license.royaltyPercent,
                derivativesAllowed: ip.license.allowDerivatives,
                defaultMintingFee: '0',
                currency: '0x0000000000000000000000000000000000000000'
              },
              stats: {
                totalLicensesMinted: 0,
                activeLicensees: 0
              }
            }
          };
        })
      );

      setListings(processedListings);
      console.log(`✅ Processed ${processedListings.length} licensed IP listings with metadata`);
    } catch (error) {
      console.error('❌ Error loading licensed IPs:', error);
      toast.error('Failed to load licensed IP assets');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMintLicense = async (listing: MarketplaceListing, amount: number) => {
    console.log('🎫 handleMintLicense called with:', { listing, amount });

    if (!signer) {
      toast.error('Please connect your wallet to mint a license.');
      return;
    }

    // Check if on correct network (Story Aeneid Testnet)
    if (!isCorrectNetwork) {
      toast.error('Please switch to Story Aeneid Testnet (Chain ID: 1315)');
      const switched = await switchToRequiredNetwork();
      if (!switched) {
        toast.error('Failed to switch network. Please switch manually in MetaMask.');
        return;
      }
      toast.success('Switched to Story Aeneid Testnet');
    }

    if (!listing.license) {
      toast.error('This asset does not have a license attached.');
      return;
    }

    try {
      console.log('📡 Calling licenseTokenService.mintLicenseToken...');
      console.log('Parameters:', {
        licensorIpId: listing.license.ipId,
        licenseTermsId: listing.license.licenseTermsId,
        receiver: await signer.getAddress(),
        amount
      });
      
      const licenseTokenId = await licenseTokenService.mintLicenseToken(
        listing.license.ipId,
        listing.license.licenseTermsId,
        await signer.getAddress(),
        amount,
        signer
      );
      
      console.log('✅ License minted successfully:', licenseTokenId);
      toast.success(`Successfully minted license token #${licenseTokenId}`);
      setShowLicenseMintingModal(false);
      
      // Refresh user licenses
      const licenses = await licenseTokenService.getUserLicenses(await signer.getAddress(), provider);
      setUserLicenses(licenses);
    } catch (error: any) {
      console.error('❌ Error minting license:', error);
      toast.error(`Failed to mint license: ${error.message || 'Unknown error'}`);
    }
  };

  const navigateToTradingTerminal = (listing: MarketplaceListing) => {
    toast.info('Trading terminal is only available for tradable assets on /testmarketplace');
  };

  // Filter listings by category
  const filteredListings = listings.filter(listing => {
    if (activeTab === 'all') return true;
    if (activeTab === 'commercial') return listing.license?.terms.commercialUse === true;
    if (activeTab === 'derivatives') return listing.license?.terms.derivativesAllowed === true;
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <HeroBackground />
      
      {/* Hero Section */}
        <div className="container mx-auto px-4 py-20 relative z-10">
          
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-black  bg-clip-text text-transparent">
              License Marketplace
            </h1>
             {!loading && (
          <div className="fixed top-6 left-9 z-50">
            <button
              onClick={() => loadMarketplaceListings(true)}
              className="mx-auto bg-black/50 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              🔄 
            </button>
          </div>
        )}
           

          {/* Featured Carousel */}
          {!loading && listings.length > 0 && (
            <FeaturedPropertiesCarousel
              listings={listings.slice(0, 5)}
              onSelectListing={(listing) => {
                setSelectedListing(listing);
                setShowDetailModal(true);
              }}
              tokenPrice={0}
            />
          )}
        </div>
        

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto relative">
            <TabsTrigger value="all">All Licensed IPs</TabsTrigger>
            <TabsTrigger value="commercial">Commercial Use</TabsTrigger>
            <TabsTrigger value="derivatives">Derivatives Allowed</TabsTrigger>
          </TabsList>
          <div className="fixed top-11 right-9 z-50">
            <button 
              className="bg-black/50 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              onClick={handlenavigate}
            >
              Go to Dashboard
            </button>
          </div>

         

          <TabsContent value={activeTab} className="mt-8">
            <ProfessionalListingsGrid
              listings={filteredListings}
              category={activeTab === 'all' ? 'Licensed IP Assets' : activeTab === 'commercial' ? 'Commercial Use IPs' : 'Derivative-Friendly IPs'}
              onSelectListing={(listing) => {
                setSelectedListing(listing);
                setShowDetailModal(true);
              }}
              onNavigateToTrading={navigateToTradingTerminal}
              tokenPrice={0}
              loading={loading}
              userLicenses={userLicenses}
            />
          </TabsContent>
        </Tabs>

        {/* Refresh Button */}
        
      </div>

      {/* Modals */}
      {showDetailModal && selectedListing && (
        <ProfessionalExpandedDetail
          listing={selectedListing}
          onClose={() => setShowDetailModal(false)}
          onBuy={(listing) => {
            toast.info('Asset purchase is available on /testmarketplace');
          }}
          onNavigateToTrading={navigateToTradingTerminal}
          tokenPrice={0}
          onMintLicense={(listing) => {
            setSelectedListingForLicense(listing);
            setShowLicenseMintingModal(true);
          }}
        />
      )}

      {showLicenseMintingModal && selectedListingForLicense && (
        <LicenseMintingModal
          listing={selectedListingForLicense}
          tokenPrice={0}
          onClose={() => setShowLicenseMintingModal(false)}
          onMint={handleMintLicense}
        />
      )}
    </div>
  );
};

export default NewMarketplace;
