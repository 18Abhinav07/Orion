import React from 'react';
import { SimilarityInfo } from '../services/verificationService';

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
