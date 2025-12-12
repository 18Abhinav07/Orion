import React, { useState } from 'react';
import { Asset } from '../types/asset';
import { useAttachLicense } from '../hooks/useAttachLicense';
import { useLicenseTerms } from '../hooks/useLicenseTerms';
import { LicenseModal } from './LicenseModal';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface AssetCardProps {
  asset: Asset;
}

const StatusBadge: React.FC<{ status: Asset['status'] }> = ({ status }) => {
  const variant = {
    registered: 'default',
    pending: 'secondary',
    disputed: 'destructive',
    rejected: 'outline',
  }[status];

  return <Badge variant={variant as any}>{status}</Badge>;
};


export const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const attachLicense = useAttachLicense();
  const { data: licenseOptions } = useLicenseTerms();

  const handleAttachLicense = async (licenseTermsId: string) => {
    try {
      await attachLicense.mutateAsync({
        assetId: asset._id,
        licenseTermsId,
      });
      // Consider showing a toast notification here
      setShowLicenseModal(false);
    } catch (error) {
      // Consider showing a toast notification for the error
      console.error('Failed to attach license:', error);
    }
  };

  const canAttachLicense = asset.status === 'registered' && asset.storyIpId && !asset.licenseTermsId;

  return (
    <Card>
      <CardHeader>
        <img src={asset.ipfsUrl} alt={asset.originalFilename} className="rounded-md" />
      </CardHeader>
      <CardContent>
        <CardTitle className="text-lg font-bold mb-2">{asset.originalFilename}</CardTitle>
        <div className="flex justify-between items-center mb-2">
          <StatusBadge status={asset.status} />
          {asset.storyIpId ? (
            <div className="text-xs">
              IP ID: {asset.storyIpId.slice(0, 10)}...
            </div>
          ) : null}
        </div>
        {asset.licenseTermsId ? (
          <Badge variant="secondary">Licensed (#{asset.licenseTermsId})</Badge>
        ) : (
          <Badge variant="outline">No License</Badge>
        )}
      </CardContent>
      <CardFooter>
        {canAttachLicense && (
          <Button onClick={() => setShowLicenseModal(true)} className="w-full">
            Attach License
          </Button>
        )}
      </CardFooter>
      <LicenseModal
        open={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        onSelect={handleAttachLicense}
        licenseOptions={licenseOptions}
        isLoading={attachLicense.isPending}
      />
    </Card>
  );
};