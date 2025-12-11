/**
 * Contract Debug Component - Shows which contracts are currently configured
 */

import React from 'react';
import { 
  ADMIN_CONTRACT, 
  ISSUER_CONTRACT, 
  MARKETPLACE_CONTRACT, 
  TOKEN_CONTRACT,
  ACTIVE_NETWORK 
} from '../lib/contractAddress';

export const ContractDebugPanel: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-blue-800 font-medium mb-2">🔧 Active Contract Configuration</h3>
      <div className="text-sm text-blue-700 space-y-1">
        <div><strong>Network:</strong> {ACTIVE_NETWORK}</div>
        <div><strong>Admin:</strong> {ADMIN_CONTRACT}</div>
        <div><strong>Token (ERC1155):</strong> {TOKEN_CONTRACT}</div>
        <div><strong>Issuer:</strong> {ISSUER_CONTRACT}</div>
        <div><strong>Marketplace:</strong> {MARKETPLACE_CONTRACT}</div>
      </div>
      <div className="mt-2 text-xs text-blue-600">
        ✅ Using Legacy Contracts - Direct Issuer Minting (No Multisig Required)
      </div>
    </div>
  );
};

export default ContractDebugPanel;