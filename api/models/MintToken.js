// backend/models/MintToken.js
import mongoose from 'mongoose';

const mintTokenSchema = new mongoose.Schema({
  nonce: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  creatorAddress: {
    type: String,
    required: true,
    index: true,
    lowercase: true
  },
  contentHash: {
    type: String,
    required: true,
    index: true
  },
  ipMetadataURI: {
    type: String,
    required: true
  },
  nftMetadataURI: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'used', 'expired', 'revoked'],
    default: 'pending',
    index: true
  },
  
  // After minting
  ipId: String,
  tokenId: Number,
  txHash: String,
  usedAt: Date
}, {
  timestamps: true  // Adds createdAt and updatedAt automatically
});

// Auto-expire tokens
mintTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 }); // Delete after 24 hours

const MintToken = mongoose.model('MintToken', mintTokenSchema);
export default MintToken;
