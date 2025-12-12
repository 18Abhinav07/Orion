import React from 'react';
import { BlockedResponse } from '../services/verificationService';

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
