import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { ComplianceService, ComplianceStatus, TransferValidation, getComplianceService } from '../services/complianceService';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  Zap
} from 'lucide-react';
import ComplianceCheck from './ComplianceCheck';

interface ComplianceGuardProps {
  children: React.ReactNode;
  requiresKYC?: boolean;
  transferDetails?: {
    fromAddress: string;
    toAddress: string;
    amount: number;
    tokenId?: string;
  };
  onComplianceVerified?: () => void;
  onComplianceFailed?: (reason: string) => void;
  blockingMode?: boolean; // If true, blocks the action until compliance is met
  customMessage?: string;
}

interface ComplianceGuardState {
  isChecking: boolean;
  isCompliant: boolean;
  complianceStatus?: ComplianceStatus;
  transferValidation?: TransferValidation;
  showComplianceModal: boolean;
  hasChecked: boolean;
}

export const ComplianceGuard: React.FC<ComplianceGuardProps> = ({
  children,
  requiresKYC = true,
  transferDetails,
  onComplianceVerified,
  onComplianceFailed,
  blockingMode = false,
  customMessage
}) => {
  const { provider, signer, account } = useWallet();
  const [state, setState] = useState<ComplianceGuardState>({
    isChecking: false,
    isCompliant: false,
    showComplianceModal: false,
    hasChecked: false
  });
  const [complianceService, setComplianceService] = useState<ComplianceService | null>(null);

  useEffect(() => {
    if (provider) {
      const service = getComplianceService(provider, signer);
      setComplianceService(service);
    }
  }, [provider, signer]);

  useEffect(() => {
    if (complianceService && account && requiresKYC) {
      checkCompliance();
    }
  }, [complianceService, account, requiresKYC]);

  const checkCompliance = async () => {
    if (!complianceService || !account) return;

    setState(prev => ({ ...prev, isChecking: true }));

    try {
      // Check user's compliance status
      const complianceStatus = await complianceService.checkComplianceStatus(account);
      
      let transferValidation: TransferValidation | undefined;
      
      // If transfer details provided, validate the specific transfer
      if (transferDetails) {
        transferValidation = await complianceService.validateTransfer(
          transferDetails.fromAddress,
          transferDetails.toAddress,
          transferDetails.amount
        );
      }

      const isCompliant = complianceStatus.canTrade && 
        (transferValidation ? transferValidation.canTransfer : true);

      setState(prev => ({
        ...prev,
        isChecking: false,
        isCompliant,
        complianceStatus,
        transferValidation,
        hasChecked: true,
        showComplianceModal: !isCompliant && blockingMode
      }));

      // Call callbacks
      if (isCompliant && onComplianceVerified) {
        onComplianceVerified();
      } else if (!isCompliant && onComplianceFailed) {
        const reason = transferValidation?.reason || 'KYC verification required';
        onComplianceFailed(reason);
      }

    } catch (error) {
      console.error('Compliance check failed:', error);
      setState(prev => ({
        ...prev,
        isChecking: false,
        isCompliant: false,
        hasChecked: true,
        showComplianceModal: blockingMode
      }));
      
      if (onComplianceFailed) {
        onComplianceFailed('Unable to verify compliance status');
      }
    }
  };

  const handleComplianceResolution = () => {
    setState(prev => ({ ...prev, showComplianceModal: false }));
    // Re-check compliance after user takes action
    setTimeout(() => {
      checkCompliance();
    }, 1000);
  };

  const closeModal = () => {
    setState(prev => ({ ...prev, showComplianceModal: false }));
  };

  // If checking compliance, show loading state
  if (state.isChecking && blockingMode) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 animate-pulse text-blue-500" />
          <span className="text-sm text-gray-600">Checking compliance...</span>
        </div>
      </div>
    );
  }

  // Non-blocking mode: show warning but allow interaction
  if (!blockingMode && state.hasChecked && !state.isCompliant) {
    return (
      <div className="space-y-3">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {customMessage || state.transferValidation?.reason || 'KYC verification required for this action'}
            {state.transferValidation?.requiresAction && (
              <div className="mt-1 text-sm">
                {state.transferValidation.requiresAction}
              </div>
            )}
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  // Blocking mode: prevent interaction if not compliant
  if (blockingMode && state.hasChecked && !state.isCompliant) {
    return (
      <>
        <div className="relative">
          <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center p-4">
              <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Compliance verification required</p>
              <Button
                size="sm"
                onClick={() => setState(prev => ({ ...prev, showComplianceModal: true }))}
              >
                Verify Compliance
              </Button>
            </div>
          </div>
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        </div>

        {/* Compliance Modal */}
        <Dialog open={state.showComplianceModal} onOpenChange={closeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Compliance Verification Required</span>
              </DialogTitle>
              <DialogDescription>
                {customMessage || 'Complete KYC verification to proceed with this action.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Show specific transfer validation error if available */}
              {state.transferValidation && !state.transferValidation.canTransfer && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Transfer Blocked:</strong> {state.transferValidation.reason}
                    {state.transferValidation.requiresAction && (
                      <div className="mt-1">
                        <strong>Action Required:</strong> {state.transferValidation.requiresAction}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Compliance Check Component */}
              <ComplianceCheck
                userAddress={account}
                onComplianceVerified={(status) => {
                  if (status.canTrade) {
                    handleComplianceResolution();
                    toast.success('Compliance verified! You can now proceed.');
                  }
                }}
                showActions={true}
                className="border-0 shadow-none p-0"
              />

              {/* Transfer Details if provided */}
              {transferDetails && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <h4 className="font-medium mb-2">Transaction Details:</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">From:</span>
                      <span className="font-mono">{transferDetails.fromAddress.substring(0, 10)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">To:</span>
                      <span className="font-mono">{transferDetails.toAddress.substring(0, 10)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span>{transferDetails.amount}</span>
                    </div>
                    {transferDetails.tokenId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Token ID:</span>
                        <span>{transferDetails.tokenId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={checkCompliance}
                  className="flex-1"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Recheck
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Compliant or not requiring compliance check
  return <>{children}</>;
};

export default ComplianceGuard;

// HOC version for wrapping components
export const withComplianceGuard = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  complianceOptions?: Omit<ComplianceGuardProps, 'children'>
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <ComplianceGuard {...complianceOptions}>
      <WrappedComponent {...props} ref={ref} />
    </ComplianceGuard>
  ));
};