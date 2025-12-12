# 🎨 FRONTEND INTEGRATION GUIDE
## RAG-Powered IP Similarity Detection - UI/UX Implementation

**Target:** React Frontend Developers
**Backend:** Orion RAG Similarity Engine
**Date:** December 12, 2025

---

## 🎯 WHAT THIS GUIDE COVERS

This document shows you how to integrate the AI-powered IP similarity detection into your React frontend. You'll learn to:

1. **Call the modified API** with similarity checks
2. **Handle three response types**: Clean, Warning, Blocked
3. **Build UI components** for similarity warnings
4. **Integrate with Story Protocol** derivative flows
5. **Create admin dashboard** for reviewing flagged content

---

## 📋 PREREQUISITES

### Backend Setup
✅ RAG services running (Voyage AI, Pinecone, Together AI configured)
✅ Server running on `http://localhost:3001`
✅ All API keys set in `.env`

### Frontend Stack (Assumed)
- React 18+
- TypeScript
- Axios or Fetch API
- TailwindCSS (optional, for styling examples)
- React Router (for navigation)
- Story Protocol SDK (for derivative registration)

---

## 🔧 API CHANGES YOU NEED TO KNOW

### Modified Endpoint: POST /api/verification/generate-mint-token

**Old Request (Before RAG):**
```typescript
{
  creatorAddress: string;
  contentHash: string;
  ipMetadataURI: string;
  nftMetadataURI: string;
}
```

**New Request (With RAG):**
```typescript
{
  creatorAddress: string;
  contentHash: string;
  ipMetadataURI: string;
  nftMetadataURI: string;
  assetType: 'video' | 'image' | 'audio' | 'text'; // NEW REQUIRED FIELD
}
```

### Three Possible Response Types

#### 1. ✅ CLEAN (0-40% Similarity) - Auto-Approved
```typescript
{
  success: true,
  data: {
    signature: "0xabc123...",
    nonce: 456,
    expiresAt: 1702387200,
    expiresIn: 900
    // No similarity field = clean content
  }
}
```

#### 2. ⚠️ WARNING (40-75% Similarity) - User Choice Required
```typescript
{
  success: true,
  data: {
    signature: "0xabc123...",
    nonce: 456,
    expiresAt: 1702387200,
    expiresIn: 900,
    similarity: {  // THIS FIELD INDICATES WARNING
      warning: true,
      message: "Warning: 62% similarity detected to existing content...",
      score: 62,
      topMatch: {
        contentHash: "0xdef456...",
        ipId: "0xIP_123...",
        creatorAddress: "0xCreator123...",
        score: 62,
        assetType: "video"
      },
      matches: [
        { contentHash: "0xdef456...", score: 62, ipId: "0xIP_123..." },
        { contentHash: "0xghi789...", score: 45, ipId: "0xIP_456..." }
      ],
      llmAnalysis: {  // Optional, if LLM analysis enabled
        summary: "The content appears to be a color-graded remix of existing work...",
        is_derivative: true,
        confidence_score: 87,
        key_differences: ["Different color grading", "Modified audio track"],
        recommendation: "warn"
      }
    }
  }
}
```

#### 3. 🛑 BLOCKED (75-100% Similarity) - Access Denied
```typescript
{
  success: false,
  error: "SIMILARITY_BLOCKED",
  message: "Blocked: 92% similarity to existing IP detected...",
  similarity: {
    score: 92,
    topMatch: {
      contentHash: "0xabc999...",
      ipId: "0xIP_789...",
      creatorAddress: "0xOriginalCreator...",
      score: 92,
      assetType: "video"
    },
    matches: [...],
    llmAnalysis: {
      summary: "This appears to be nearly identical content with minimal transformative elements...",
      is_derivative: false,
      is_plagiarism: true,
      confidence_score: 95,
      recommendation: "block"
    }
  }
}
```

---

## 🎨 FRONTEND IMPLEMENTATION

### Step 1: Update Your API Service

**File: `src/services/api.ts`**

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

export interface GenerateMintTokenRequest {
  creatorAddress: string;
  contentHash: string;
  ipMetadataURI: string;
  nftMetadataURI: string;
  assetType: 'video' | 'image' | 'audio' | 'text';  // NEW
}

export interface SimilarityInfo {
  warning: true;
  message: string;
  score: number;
  topMatch: {
    contentHash: string;
    ipId: string;
    creatorAddress: string;
    score: number;
    assetType: string;
  };
  matches: Array<{
    contentHash: string;
    score: number;
    ipId?: string;
  }>;
  llmAnalysis?: {
    summary: string;
    is_derivative: boolean;
    is_plagiarism?: boolean;
    confidence_score: number;
    key_differences?: string[];
    recommendation: 'clean' | 'warn' | 'block';
  };
}

export interface GenerateMintTokenResponse {
  success: true;
  data: {
    signature: string;
    nonce: number;
    expiresAt: number;
    expiresIn: number;
    similarity?: SimilarityInfo;  // NEW - Optional warning
  };
}

export interface BlockedResponse {
  success: false;
  error: 'SIMILARITY_BLOCKED';
  message: string;
  similarity: Omit<SimilarityInfo, 'warning'>;
}

export async function generateMintToken(
  request: GenerateMintTokenRequest
): Promise<GenerateMintTokenResponse | BlockedResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/verification/generate-mint-token`,
      request
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 403 && error.response?.data?.error === 'SIMILARITY_BLOCKED') {
      // Blocked due to high similarity
      return error.response.data;
    }
    throw error;  // Other errors (500, network, etc.)
  }
}
```

### Step 2: Create Similarity Warning Modal Component

**File: `src/components/SimilarityWarningModal.tsx`**

```typescript
import React from 'react';
import { SimilarityInfo } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  similarityInfo: SimilarityInfo;
  onProceedAsOriginal: () => void;
  onRegisterAsDerivative: () => void;
}

export const SimilarityWarningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  similarityInfo,
  onProceedAsOriginal,
  onRegisterAsDerivative,
}) => {
  if (!isOpen) return null;

  const { score, topMatch, llmAnalysis } = similarityInfo;
  const isHighRisk = score >= 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b ${isHighRisk ? 'bg-red-50' : 'bg-yellow-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{isHighRisk ? '🚨' : '⚠️'}</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Similar Content Detected
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {score}% similarity to existing IP
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Similarity Score */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Similarity Score</span>
              <span className="text-lg font-bold text-gray-900">{score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  score >= 60 ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* LLM Analysis */}
          {llmAnalysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🤖</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">AI Analysis</h3>
                  <p className="text-sm text-blue-800 mb-3">{llmAnalysis.summary}</p>

                  {llmAnalysis.key_differences && (
                    <div>
                      <p className="text-xs font-medium text-blue-700 mb-1">Key Differences:</p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        {llmAnalysis.key_differences.map((diff, idx) => (
                          <li key={idx}>• {diff}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-blue-600">
                    Confidence: {llmAnalysis.confidence_score}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Similar Content Info */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Most Similar Content</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">IP ID:</span>
                <span className="font-mono text-xs">{topMatch.ipId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Creator:</span>
                <span className="font-mono text-xs">{topMatch.creatorAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Content Hash:</span>
                <span className="font-mono text-xs truncate max-w-xs">
                  {topMatch.contentHash}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Asset Type:</span>
                <span className="capitalize">{topMatch.assetType}</span>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">What does this mean?</h3>
            <p className="text-sm text-gray-700">
              {score >= 60 ? (
                <>
                  Your content is <strong>highly similar</strong> to existing registered IP.
                  We <strong>strongly recommend</strong> registering it as a derivative work
                  to properly attribute the original creator and comply with licensing terms.
                </>
              ) : (
                <>
                  Your content shows <strong>moderate similarity</strong> to existing IP.
                  If you created this independently, you can proceed. If this is a remix
                  or derivative, we recommend linking it to the parent IP.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="p-6 border-t bg-gray-50 space-y-3">
          <button
            onClick={onRegisterAsDerivative}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            ✅ Register as Derivative (Recommended)
          </button>

          <button
            onClick={onProceedAsOriginal}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Continue as Original Work
          </button>

          <p className="text-xs text-gray-500 text-center">
            By proceeding as original, you confirm you created this content independently.
            False claims may result in account suspension.
          </p>
        </div>
      </div>
    </div>
  );
};
```

### Step 3: Create Blocked Content Modal

**File: `src/components/SimilarityBlockedModal.tsx`**

```typescript
import React from 'react';
import { BlockedResponse } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  blockedInfo: BlockedResponse['similarity'];
}

export const SimilarityBlockedModal: React.FC<Props> = ({
  isOpen,
  onClose,
  blockedInfo,
}) => {
  if (!isOpen) return null;

  const { score, topMatch, llmAnalysis } = blockedInfo;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="p-6 bg-red-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <span className="text-4xl">🛑</span>
            <div>
              <h2 className="text-2xl font-bold">Upload Blocked</h2>
              <p className="text-red-100 mt-1">
                High similarity detected ({score}%)
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-900 font-medium mb-2">
              🚨 Your upload has been blocked
            </p>
            <p className="text-red-800 text-sm">
              Our AI detected {score}% similarity to existing registered IP. This level
              of similarity indicates potential copyright infringement and requires manual
              review before proceeding.
            </p>
          </div>

          {/* LLM Analysis */}
          {llmAnalysis && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🤖 AI Analysis</h3>
              <p className="text-sm text-gray-700">{llmAnalysis.summary}</p>
              {llmAnalysis.is_plagiarism && (
                <div className="mt-2 text-sm text-red-600 font-medium">
                  ⚠️ Potential plagiarism detected
                </div>
              )}
            </div>
          )}

          {/* Similar Content */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Similar to:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">IP ID:</span>
                <span className="font-mono text-xs">{topMatch.ipId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Creator:</span>
                <span className="font-mono text-xs">{topMatch.creatorAddress}</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What can you do?</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>✓ If you created this content independently, contact support with proof</li>
              <li>✓ If this is a derivative/remix, obtain a license from the original creator</li>
              <li>✓ Upload different content that doesn't infringe on existing IP</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">
            Your upload has been flagged for admin review.
            You'll be notified if the decision is reversed.
          </p>
        </div>
      </div>
    </div>
  );
};
```

### Step 4: Integrate into Upload Flow

**File: `src/pages/UploadPage.tsx`**

```typescript
import React, { useState } from 'react';
import { generateMintToken, GenerateMintTokenResponse, BlockedResponse } from '../services/api';
import { SimilarityWarningModal } from '../components/SimilarityWarningModal';
import { SimilarityBlockedModal } from '../components/SimilarityBlockedModal';
import { useStoryProtocol } from '../hooks/useStoryProtocol';

export const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [assetType, setAssetType] = useState<'video' | 'image' | 'audio' | 'text'>('image');
  const [uploading, setUploading] = useState(false);

  // Modals
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [similarityData, setSimilarityData] = useState<any>(null);

  // Mint token data
  const [mintTokenData, setMintTokenData] = useState<any>(null);

  const { registerIpAsset, registerDerivative } = useStoryProtocol();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-detect asset type
      if (selectedFile.type.startsWith('video/')) setAssetType('video');
      else if (selectedFile.type.startsWith('image/')) setAssetType('image');
      else if (selectedFile.type.startsWith('audio/')) setAssetType('audio');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      // 1. Upload to IPFS
      const ipfsCID = await uploadToIPFS(file);
      const ipMetadataURI = `ipfs://${ipfsCID}`;
      const nftMetadataURI = `ipfs://${ipfsCID}/metadata.json`;

      // 2. Generate content hash
      const contentHash = await generateContentHash(file);

      // 3. Get user's wallet address
      const creatorAddress = await getConnectedWallet();

      // 4. Call backend to generate mint token (with RAG similarity check)
      const result = await generateMintToken({
        creatorAddress,
        contentHash,
        ipMetadataURI,
        nftMetadataURI,
        assetType,
      });

      // Handle BLOCKED response
      if (!result.success && result.error === 'SIMILARITY_BLOCKED') {
        setSimilarityData(result.similarity);
        setShowBlockedModal(true);
        setUploading(false);
        return;
      }

      // Handle SUCCESS response (with or without warning)
      const successResult = result as GenerateMintTokenResponse;
      setMintTokenData(successResult.data);

      // Check if there's a similarity WARNING
      if (successResult.data.similarity?.warning) {
        setSimilarityData(successResult.data.similarity);
        setShowWarningModal(true);
        setUploading(false);
        return;
      }

      // No warning - proceed directly to minting
      await proceedWithMint(successResult.data);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const proceedWithMint = async (tokenData: any) => {
    try {
      // Call Story Protocol to register IP
      const txResult = await registerIpAsset({
        signature: tokenData.signature,
        nonce: tokenData.nonce,
        expiresAt: tokenData.expiresAt,
        // ... other params
      });

      alert('IP registered successfully!');
      // Navigate to success page or reset form
    } catch (error) {
      console.error('Minting failed:', error);
      alert('Minting failed. Please try again.');
    }
  };

  const handleProceedAsOriginal = async () => {
    setShowWarningModal(false);

    // Log the decision (optional - send to backend for audit trail)
    await logUserDecision({
      contentHash: mintTokenData.contentHash,
      decision: 'PROCEED_AS_ORIGINAL',
      similarityScore: similarityData.score,
    });

    // Proceed with minting as original work
    await proceedWithMint(mintTokenData);
  };

  const handleRegisterAsDerivative = async () => {
    setShowWarningModal(false);

    try {
      // Register as derivative on Story Protocol
      const parentIpId = similarityData.topMatch.ipId;

      // 1. First, mint the NFT/IP asset
      const ipAssetResult = await registerIpAsset({
        signature: mintTokenData.signature,
        nonce: mintTokenData.nonce,
        expiresAt: mintTokenData.expiresAt,
      });

      // 2. Link as derivative to parent
      await registerDerivative({
        childIpId: ipAssetResult.ipId,
        parentIpId: parentIpId,
        licenseTermsId: similarityData.topMatch.licenseTermsId || '55', // Default commercial remix
      });

      alert('Derivative registered successfully with proper attribution!');

    } catch (error) {
      console.error('Derivative registration failed:', error);
      alert('Failed to register as derivative. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Upload Content</h1>

      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept="video/*,image/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="text-gray-600">
            {file ? (
              <p className="font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-lg mb-2">📁 Click to upload</p>
                <p className="text-sm">Video, Image, or Audio</p>
              </>
            )}
          </div>
        </label>
      </div>

      {/* Asset Type Selector */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Asset Type
        </label>
        <select
          value={assetType}
          onChange={(e) => setAssetType(e.target.value as any)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="video">Video</option>
          <option value="image">Image</option>
          <option value="audio">Audio</option>
          <option value="text">Text</option>
        </select>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        {uploading ? 'Uploading & Checking Similarity...' : 'Upload & Register IP'}
      </button>

      {/* Modals */}
      {showWarningModal && similarityData && (
        <SimilarityWarningModal
          isOpen={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          similarityInfo={similarityData}
          onProceedAsOriginal={handleProceedAsOriginal}
          onRegisterAsDerivative={handleRegisterAsDerivative}
        />
      )}

      {showBlockedModal && similarityData && (
        <SimilarityBlockedModal
          isOpen={showBlockedModal}
          onClose={() => setShowBlockedModal(false)}
          blockedInfo={similarityData}
        />
      )}
    </div>
  );
};

// Helper functions (implement these based on your setup)
async function uploadToIPFS(file: File): Promise<string> {
  // Your IPFS upload logic
  return 'Qm123...';
}

async function generateContentHash(file: File): Promise<string> {
  // Your content hash generation logic
  return '0xabc123...';
}

async function getConnectedWallet(): Promise<string> {
  // Get wallet address from Web3 provider
  return '0x123...';
}

async function logUserDecision(data: any): Promise<void> {
  // Optional: Send to backend for audit trail
  console.log('User decision logged:', data);
}
```

---

## 👨‍💼 ADMIN DASHBOARD INTEGRATION

### Admin API Endpoints

```typescript
// Get similarity statistics
GET /api/admin/similarity/stats

Response:
{
  "embeddings": {
    "total": 1500,
    "clean": 1200,
    "warning": 250,
    "blocked": 40
  },
  "pinecone": {
    "dimension": 1024,
    "vectorCount": 1460
  }
}
```

```typescript
// Get flagged content (75%+ similarity)
GET /api/admin/similarity/flagged

Response:
{
  "flagged": [
    {
      "contentHash": "0xabc123...",
      "creatorAddress": "0xUser123...",
      "assetType": "video",
      "similarityScore": 85,
      "topMatch": {
        "ipId": "0xIP_456...",
        "score": 85
      },
      "flaggedAt": "2025-12-12T10:00:00Z",
      "reviewStatus": "pending"
    },
    ...
  ]
}
```

```typescript
// Update review decision
PATCH /api/admin/similarity/content/:contentHash/review
Authorization: Bearer <admin_jwt>

Request Body:
{
  "decision": "approved" | "rejected",
  "notes": "Admin review notes..."
}

Response:
{
  "success": true,
  "message": "Review updated successfully"
}
```

### Admin Dashboard Component

**File: `src/pages/AdminSimilarityDashboard.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface FlaggedContent {
  contentHash: string;
  creatorAddress: string;
  assetType: string;
  similarityScore: number;
  topMatch: {
    ipId: string;
    score: number;
  };
  flaggedAt: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
}

export const AdminSimilarityDashboard: React.FC = () => {
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [flaggedRes, statsRes] = await Promise.all([
        axios.get('/api/admin/similarity/flagged', {
          headers: { Authorization: `Bearer ${getAdminToken()}` }
        }),
        axios.get('/api/admin/similarity/stats', {
          headers: { Authorization: `Bearer ${getAdminToken()}` }
        })
      ]);

      setFlaggedContent(flaggedRes.data.flagged);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (contentHash: string, decision: 'approved' | 'rejected') => {
    try {
      await axios.patch(
        `/api/admin/similarity/content/${contentHash}/review`,
        { decision, notes: `Reviewed by admin` },
        { headers: { Authorization: `Bearer ${getAdminToken()}` } }
      );

      // Reload data
      await loadData();
      alert(`Content ${decision} successfully`);
    } catch (error) {
      console.error('Review failed:', error);
      alert('Failed to update review');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Similarity Admin Dashboard</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Embeddings</div>
            <div className="text-2xl font-bold">{stats.embeddings.total}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Clean (0-40%)</div>
            <div className="text-2xl font-bold text-green-600">{stats.embeddings.clean}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Warning (40-75%)</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.embeddings.warning}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Blocked (75%+)</div>
            <div className="text-2xl font-bold text-red-600">{stats.embeddings.blocked}</div>
          </div>
        </div>
      )}

      {/* Flagged Content Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Flagged Content (Pending Review)</h2>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Content Hash
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Creator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Similarity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Flagged At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {flaggedContent.map((item) => (
              <tr key={item.contentHash}>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs">{item.contentHash.substring(0, 16)}...</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs">{item.creatorAddress.substring(0, 12)}...</span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {item.similarityScore}%
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(item.flaggedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 space-x-2">
                  <button
                    onClick={() => handleReview(item.contentHash, 'approved')}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(item.contentHash, 'rejected')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {flaggedContent.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No flagged content pending review
          </div>
        )}
      </div>
    </div>
  );
};

function getAdminToken(): string {
  // Get admin JWT from localStorage or auth context
  return localStorage.getItem('adminToken') || '';
}
```

---

## 🎯 TESTING CHECKLIST

### Test Scenario 1: Clean Upload (Happy Path)
```
1. Upload original content (never seen before)
2. Expect: Auto-approval, no modals
3. Expect: Minting proceeds smoothly
```

### Test Scenario 2: Similar Content Warning
```
1. Upload content similar to existing (40-70% match)
2. Expect: Warning modal appears
3. Test: Click "Register as Derivative"
4. Expect: Derivative registration flow triggered
5. Test: Click "Continue as Original"
6. Expect: Minting proceeds with logged decision
```

### Test Scenario 3: Blocked Upload
```
1. Upload content highly similar to existing (75%+ match)
2. Expect: Blocked modal appears
3. Expect: No mint signature returned
4. Expect: Content flagged in admin dashboard
```

### Test Scenario 4: Admin Review
```
1. Admin logs in
2. Navigate to similarity dashboard
3. See flagged content (from Scenario 3)
4. Review and approve/reject
5. Expect: User notified (if notification system in place)
```

---

## 🔧 CONFIGURATION

### Environment Variables (.env.local)

```bash
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_ENABLE_SIMILARITY_CHECKS=true
REACT_APP_SIMILARITY_WARNING_THRESHOLD=40
REACT_APP_SIMILARITY_BLOCK_THRESHOLD=75
```

---

## 🎨 UX/UI RECOMMENDATIONS

### Loading States
```typescript
// Show loading indicator during similarity check
<div className="flex items-center space-x-2">
  <Spinner />
  <span>Checking for similar content...</span>
</div>
```

### Tooltips
Add info icons with explanations:
- "What is similarity detection?"
- "Why register as derivative?"
- "What happens if I'm blocked?"

### Progress Indicators
```
Upload → IPFS ✅ → Generate Hash ✅ → Similarity Check ⏳ → Mint
```

### Accessibility
- Use ARIA labels for modals
- Keyboard navigation support
- Screen reader friendly similarity scores
- High contrast mode for similarity indicators

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Production
- [ ] Test all three similarity scenarios (clean, warning, blocked)
- [ ] Test admin dashboard with mock flagged content
- [ ] Verify API error handling (network failures, timeouts)
- [ ] Test with large files (video processing time)
- [ ] Test with various file types (video, image, audio)

### Production
- [ ] Update API_BASE_URL to production backend
- [ ] Enable analytics tracking for similarity events
- [ ] Set up monitoring for blocked uploads (alert if spike)
- [ ] Create user documentation for similarity system
- [ ] Train support team on handling similarity appeals

---

## 📊 ANALYTICS EVENTS TO TRACK

```typescript
// Track similarity-related events
analytics.track('similarity_check_started', {
  assetType,
  contentHash,
});

analytics.track('similarity_warning_shown', {
  similarityScore,
  userDecision: 'proceed_as_original' | 'register_as_derivative',
});

analytics.track('similarity_blocked', {
  similarityScore,
  topMatchIpId,
});

analytics.track('derivative_registered', {
  parentIpId,
  childIpId,
});
```

---

## 🎓 USER EDUCATION

### In-App Tooltips & Help Text

**"What is similarity detection?"**
> We use AI to compare your content against all registered IP on the platform. If your content is similar to existing work, we'll let you know so you can properly attribute the original creator.

**"Why should I register as derivative?"**
> Registering as a derivative properly credits the original creator and ensures you comply with licensing terms. It's the right thing to do and protects you from copyright claims.

**"What if I disagree with the similarity score?"**
> If you believe the similarity detection is incorrect, you can contact support with proof of independent creation. Our team will review your appeal.

---

## 🎉 SUCCESS!

You now have everything you need to integrate the RAG-powered similarity detection into your React frontend!

**Key Takeaways:**
- ✅ Modified API adds `assetType` field
- ✅ Three response types: Clean, Warning, Blocked
- ✅ Beautiful modals for user decision-making
- ✅ Admin dashboard for reviewing flagged content
- ✅ Seamless Story Protocol derivative registration

**Next Steps:**
1. Implement the components above
2. Test with sample uploads
3. Gather user feedback on UX
4. Iterate and improve!

---

**Document Version:** 1.0
**Last Updated:** December 12, 2025
**Maintainer:** Orion Development Team
**Questions?** Check `RAG_IMPLEMENTATION.md` for backend details

**Let's protect creators and build trust! 🚀**
