import React from 'react';
import { LicenseTerms } from '../types/asset';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface LicenseModalProps {
  onClose: () => void;
  onSelect: (licenseTermsId: string) => void;
  licenseOptions: LicenseTerms[] | undefined;
  isLoading: boolean;
  open: boolean;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  onClose,
  onSelect,
  licenseOptions,
  isLoading,
  open,
}) => {
  if (!open) {
    return null;
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select License Terms</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {licenseOptions?.map((license) => (
            <Card key={license.licenseTermsId}>
              <CardHeader>
                <CardTitle>{license.type === 'commercial_remix' ? 'Commercial Remix' : 'Non-Commercial'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Royalty: {license.royalty}%</p>
                <p>Currency: {license.currency}</p>
                <Button
                  onClick={() => onSelect(license.licenseTermsId)}
                  disabled={isLoading}
                  className="w-full mt-4"
                >
                  {isLoading ? 'Attaching...' : 'Select This License'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
