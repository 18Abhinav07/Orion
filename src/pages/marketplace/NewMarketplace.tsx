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

  const loadMarketplaceListings = async (forceRefresh: boolean = false) => {
    console.log(`🔄 Loading licensed IPs from backend (forceRefresh: ${forceRefresh})`);
    setLoading(true);

    try {
      // Fetch licensed IPs from backend
      const licensedIps = await marketplaceService.getLicensedIps();
      console.log(`📜 Fetched ${licensedIps.length} licensed IPs from backend`);

      // Transform licensed IPs to marketplace listings format
      const processedListings: MarketplaceListing[] = licensedIps.map((ip) => ({
        tokenId: ip.ipId, // Use ipId as tokenId for display
        name: `IP Asset #${ip.tokenId}`,
        description: `Licensed IP Asset - Token ID: ${ip.tokenId}`,
        image: ip.metadata.nftMetadataURI || '', // Will fetch from IPFS if needed
        price: '0', // License minting fee will be fetched from license terms
        amount: 999, // Unlimited for license tokens
        totalSupply: 1,
        seller: ip.creatorAddress,
        metadataURI: ip.metadata.ipMetadataURI || '',
        attributes: [
          { trait_type: 'IP ID', value: ip.ipId },
          { trait_type: 'Token ID', value: ip.tokenId.toString() },
          { trait_type: 'License Terms ID', value: ip.license.licenseTermsId },
          { trait_type: 'Status', value: ip.status }
        ],
        license: {
          ipId: ip.ipId,
          licenseTermsId: ip.license.licenseTermsId,
          terms: {
            transferable: true,
            commercialUse: true, // Default values - should be fetched from chain
            commercialRevShare: 10,
            derivativesAllowed: true,
            defaultMintingFee: '0',
            currency: '0x0000000000000000000000000000000000000000'
          },
          stats: {
            totalLicensesMinted: 0,
            activeLicensees: 0
          }
        }
      }));

      setListings(processedListings);
      console.log(`✅ Processed ${processedListings.length} licensed IP listings`);
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
      <BackgroundBeamsWithCollision className="relative">
        <div className="container mx-auto px-4 py-20 relative z-10">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              License Marketplace
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover and mint license tokens for intellectual property assets powered by Story Protocol
            </p>
          </motion.div>

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
      </BackgroundBeamsWithCollision>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto">
            <TabsTrigger value="all">All Licensed IPs</TabsTrigger>
            <TabsTrigger value="commercial">Commercial Use</TabsTrigger>
            <TabsTrigger value="derivatives">Derivatives Allowed</TabsTrigger>
          </TabsList>

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
        {!loading && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => loadMarketplaceListings(true)}
              className="mx-auto"
            >
              🔄 Refresh Marketplace
            </Button>
          </div>
        )}
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
