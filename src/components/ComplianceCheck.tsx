import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { ComplianceService, ComplianceStatus, getComplianceService } from '../services/complianceService';
import EnhancedKYCFlow from './EnhancedKYCFlow';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Zap,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface ComplianceCheckProps {
  userAddress?: string;
  onComplianceVerified?: (status: ComplianceStatus) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export const ComplianceCheck: React.FC<ComplianceCheckProps> = ({
  userAddress,
  onComplianceVerified,
  showActions = true,
  compact = false,
  className = ''
}) => {
  const { provider, signer, account } = useWallet();
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [complianceService, setComplianceService] = useState<ComplianceService | null>(null);
  const [showEnhancedKYC, setShowEnhancedKYC] = useState(false);

  const targetAddress = userAddress || account;

  useEffect(() => {
    if (provider) {
      const service = getComplianceService(provider, signer);
      setComplianceService(service);
    }
  }, [provider, signer]);

  useEffect(() => {
    if (complianceService && targetAddress) {
      checkCompliance();
    }
  }, [complianceService, targetAddress]);

  const checkCompliance = async () => {
    if (!complianceService || !targetAddress) return;

    setRefreshing(true);
    try {
      const status = await complianceService.checkComplianceStatus(targetAddress);
      setComplianceStatus(status);
      
      if (onComplianceVerified) {
        onComplianceVerified(status);
      }
    } catch (error) {
      console.error('Error checking compliance:', error);
      toast.error('Failed to check compliance status');
    } finally {
      setRefreshing(false);
    }
  };

  const handleKYCRegistration = async () => {
    if (!complianceService || !targetAddress) return;

    setLoading(true);
    try {
      toast.info('Starting KYC registration...');
      
      const txHash = await complianceService.registerForKYC(targetAddress);
      
      toast.success(`KYC registration successful! Transaction: ${txHash.substring(0, 10)}...`);
      
      // Refresh compliance status after successful registration
      setTimeout(() => {
        checkCompliance();
      }, 2000);
      
    } catch (error: any) {
      console.error('KYC registration failed:', error);
      toast.error(error.message || 'KYC registration failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!complianceStatus) return <Shield className="w-5 h-5 text-gray-400" />;
    
    if (complianceStatus.canTrade) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (complianceStatus.isRegistered) {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (!complianceStatus) return 'bg-gray-100 text-gray-600';
    
    if (complianceStatus.canTrade) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (complianceStatus.isRegistered) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <Badge variant="outline" className={getStatusColor()}>
          {complianceStatus ? complianceService?.formatComplianceStatus(complianceStatus) : 'Checking...'}
        </Badge>
        {refreshing && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
      </div>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>Compliance Status</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkCompliance}
            disabled={refreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        {targetAddress && (
          <p className="text-sm text-gray-600">
            <User className="w-4 h-4 inline mr-1" />
            {formatAddress(targetAddress)}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="font-medium">
                {complianceStatus ? complianceService?.formatComplianceStatus(complianceStatus) : 'Checking...'}
              </p>
              <p className="text-sm text-gray-600">
                {complianceStatus?.canTrade ? 'Ready to trade' : 'Trading restricted'}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor()}>
            {complianceStatus?.canTrade ? 'Verified' : 'Pending'}
          </Badge>
        </div>

        {/* Detailed Status */}
        {complianceStatus && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Identity Registered:</span>
              <span className={complianceStatus.isRegistered ? 'text-green-600' : 'text-red-600'}>
                {complianceStatus.isRegistered ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">KYC Verified:</span>
              <span className={complianceStatus.hasValidKYC ? 'text-green-600' : 'text-red-600'}>
                {complianceStatus.hasValidKYC ? 'Yes' : 'No'}
              </span>
            </div>
            {complianceStatus.kycData && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">KYC Expires:</span>
                <span className="text-gray-900">
                  {complianceService?.getKYCTimeToExpiry(complianceStatus) || 'Unknown'}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Checked:</span>
              <span className="text-gray-600">
                {new Date(complianceStatus.lastChecked).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && complianceStatus && !complianceStatus.canTrade && (
          <div className="space-y-3">
            {!complianceStatus.isRegistered && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You need to register for KYC verification to start trading.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Button
                onClick={handleKYCRegistration}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Registering...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Zap className="w-4 h-4 mr-2" />
                    {complianceStatus.isRegistered ? 'Complete KYC' : 'Start KYC Registration'}
                  </div>
                )}
              </Button>
              
              <Button
                onClick={() => setShowEnhancedKYC(true)}
                variant="outline"
                className="w-full"
              >
                <Shield className="w-4 h-4 mr-2" />
                Enhanced KYC (IPFS)
              </Button>
            </div>
          </div>
        )}

        {/* Success State */}
        {complianceStatus?.canTrade && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your account is fully verified and ready for trading!
            </AlertDescription>
          </Alert>
        )}

        {/* Contract Links */}
        {complianceService && (
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-500 mb-2">Contract Addresses:</p>
            <div className="space-y-1">
              {Object.entries(complianceService.getContractAddresses()).map(([name, address]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{name.replace(/_/g, ' ')}</span>
                  <a
                    href={`https://Flowscan.xyz/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    {formatAddress(address)}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced KYC Flow Modal */}
        <EnhancedKYCFlow
          isOpen={showEnhancedKYC}
          onClose={() => setShowEnhancedKYC(false)}
          userAddress={targetAddress}
          onKYCComplete={(success) => {
            if (success) {
              setShowEnhancedKYC(false);
              checkCompliance(); // Refresh compliance status
              toast.success('Enhanced KYC completed successfully!');
            }
          }}
        />
      </CardContent>
    </Card>
  );
};

export default ComplianceCheck;