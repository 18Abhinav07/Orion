/**
 * @fileoverview Asset Registration Form Component
 * @description Multi-step form for issuers to register new assets
 */

import React, { useState, useEffect } from 'react';
import { issuerService } from '../../services/issuerService.js';
import { pinataService } from '../../services/pinataService.js';

interface AssetData {
  title: string;
  description: string;
  valuation: number;
  currency: string;
  jurisdiction: string;
  legalStructure: string;
  propertyType: string;
  location: string;
  expectedYield: number;
  managementFee: number;
  supportingDocuments: File[];
}

interface AssetRegistrationFormProps {
  onAssetCreated: (assetId: string) => void;
  onCancel: () => void;
}

const AssetRegistrationForm: React.FC<AssetRegistrationFormProps> = ({ onAssetCreated, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetData, setAssetData] = useState<AssetData>({
    title: '',
    description: '',
    valuation: 0,
    currency: 'USD',
    jurisdiction: '',
    legalStructure: '',
    propertyType: '',
    location: '',
    expectedYield: 0,
    managementFee: 0,
    supportingDocuments: []
  });

  const steps = [
    { id: 1, title: 'Basic Information', description: 'Asset title, description, and valuation' },
    { id: 2, title: 'Property Details', description: 'Property type, location, and legal structure' },
    { id: 3, title: 'Financial Information', description: 'Expected yields and management fees' },
    { id: 4, title: 'Supporting Documents', description: 'Upload legal and property documents' },
    { id: 5, title: 'Review & Submit', description: 'Review all information before submission' }
  ];

  useEffect(() => {
    // Check if user is authorized issuer
    checkIssuerAuthorization();
  }, []);

  const checkIssuerAuthorization = async () => {
    try {
      const isAuthorized = await issuerService.isAuthorizedIssuer();
      if (!isAuthorized) {
        setError('You are not authorized as an issuer. Please contact admin.');
      }
    } catch (err) {
      console.error('Failed to check issuer authorization:', err);
      setError('Failed to verify issuer authorization');
    }
  };

  const handleInputChange = (field: keyof AssetData, value: any) => {
    setAssetData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setAssetData(prev => ({
        ...prev,
        supportingDocuments: fileArray
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(assetData.title && assetData.description && assetData.valuation > 0);
      case 2:
        return !!(assetData.jurisdiction && assetData.legalStructure && assetData.propertyType);
      case 3:
        return assetData.expectedYield >= 0 && assetData.managementFee >= 0;
      case 4:
        return assetData.supportingDocuments.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) {
      setError('Please fill in all required fields before proceeding');
      return;
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate all data
      if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
        throw new Error('Please complete all required fields');
      }

      console.log('Submitting asset registration...');
      
      // Create asset draft
      const result = await issuerService.registerAssetDraft(assetData);
      
      // Submit for approval with documents
      await issuerService.submitAssetForApproval(result.assetId, assetData.supportingDocuments);
      
      console.log('Asset registration completed:', result.assetId);
      onAssetCreated(result.assetId);
      
    } catch (err) {
      console.error('Asset registration failed:', err);
      setError(err instanceof Error ? err.message : 'Asset registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Title *
              </label>
              <input
                type="text"
                value={assetData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Manhattan Office Building Portfolio"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={assetData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                placeholder="Detailed description of the asset, its features, and investment opportunity..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Valuation *
                </label>
                <input
                  type="number"
                  value={assetData.valuation || ''}
                  onChange={(e) => handleInputChange('valuation', parseFloat(e.target.value) || 0)}
                  placeholder="1000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={assetData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="U2U">Flow</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jurisdiction *
              </label>
              <select
                value={assetData.jurisdiction}
                onChange={(e) => handleInputChange('jurisdiction', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Jurisdiction</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="DE">Germany</option>
                <option value="SG">Singapore</option>
                <option value="CH">Switzerland</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Legal Structure *
              </label>
              <select
                value={assetData.legalStructure}
                onChange={(e) => handleInputChange('legalStructure', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Legal Structure</option>
                <option value="LLC">Limited Liability Company (LLC)</option>
                <option value="REIT">Real Estate Investment Trust (REIT)</option>
                <option value="SPV">Special Purpose Vehicle (SPV)</option>
                <option value="Trust">Trust</option>
                <option value="Corporation">Corporation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type *
              </label>
              <select
                value={assetData.propertyType}
                onChange={(e) => handleInputChange('propertyType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Property Type</option>
                <option value="Commercial Office">Commercial Office</option>
                <option value="Residential">Residential</option>
                <option value="Retail">Retail</option>
                <option value="Industrial">Industrial</option>
                <option value="Mixed Use">Mixed Use</option>
                <option value="Hospitality">Hospitality</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={assetData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Manhattan, New York, USA"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Annual Yield (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={assetData.expectedYield || ''}
                onChange={(e) => handleInputChange('expectedYield', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 8.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">Expected annual yield for investors</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Management Fee (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={assetData.managementFee || ''}
                onChange={(e) => handleInputChange('managementFee', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 2.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">Annual management fee percentage</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">Financial Summary</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div>Asset Valuation: {assetData.currency} {assetData.valuation.toLocaleString()}</div>
                <div>Expected Annual Yield: {assetData.expectedYield}%</div>
                <div>Management Fee: {assetData.managementFee}%</div>
                <div>Net Investor Yield: {(assetData.expectedYield - assetData.managementFee).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supporting Documents *
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Upload legal documents, property appraisals, photos, etc. (PDF, DOC, DOCX, JPG, PNG)
              </p>
            </div>

            {assetData.supportingDocuments.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Selected Files ({assetData.supportingDocuments.length})</h4>
                <div className="space-y-2">
                  {assetData.supportingDocuments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">📄</span>
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Document Requirements</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Property deed or title documents</li>
                <li>• Recent property appraisal</li>
                <li>• Legal entity formation documents</li>
                <li>• Financial statements or projections</li>
                <li>• Property management agreements (if applicable)</li>
                <li>• Insurance documentation</li>
              </ul>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review Your Asset Registration</h3>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Basic Information</h4>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div><strong>Title:</strong> {assetData.title}</div>
                  <div><strong>Description:</strong> {assetData.description}</div>
                  <div><strong>Valuation:</strong> {assetData.currency} {assetData.valuation.toLocaleString()}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Property Details</h4>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div><strong>Jurisdiction:</strong> {assetData.jurisdiction}</div>
                  <div><strong>Legal Structure:</strong> {assetData.legalStructure}</div>
                  <div><strong>Property Type:</strong> {assetData.propertyType}</div>
                  <div><strong>Location:</strong> {assetData.location}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Financial Information</h4>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div><strong>Expected Yield:</strong> {assetData.expectedYield}%</div>
                  <div><strong>Management Fee:</strong> {assetData.managementFee}%</div>
                  <div><strong>Net Investor Yield:</strong> {(assetData.expectedYield - assetData.managementFee).toFixed(1)}%</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Supporting Documents</h4>
                <div className="mt-2 text-sm text-gray-600">
                  {assetData.supportingDocuments.length} file(s) selected
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Your asset will be submitted for admin approval</li>
                <li>Legal documents will be uploaded to IPFS</li>
                <li>Admin will review and create attestations</li>
                <li>You'll be notified when approved</li>
                <li>You can then deploy tokens and enable trading</li>
              </ol>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (error && error.includes('not authorized')) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Access Denied: </strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-500'
              }`}>
                {currentStep > step.id ? '✓' : step.id}
              </div>
              <div className="ml-2 hidden sm:block">
                <div className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className={`hidden sm:block w-8 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {steps[currentStep - 1].title}
          </h2>
          <p className="text-gray-600">{steps[currentStep - 1].description}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handlePreviousStep}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
            )}
          </div>

          <div className="space-x-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            {currentStep < steps.length ? (
              <button
                onClick={handleNextStep}
                disabled={loading || !validateStep(currentStep)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit for Approval'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetRegistrationForm;