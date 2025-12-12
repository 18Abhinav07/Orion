// api/models/LicenseTermsCache.js
import mongoose from 'mongoose';

const licenseTermsCacheSchema = new mongoose.Schema({
  licenseType: {
    type: String,
    required: true,
    enum: ['commercial_remix', 'non_commercial']
  },
  royaltyPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  licenseTermsId: {
    type: String,
    required: true
  },
  transactionHash: {
    type: String
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

licenseTermsCacheSchema.index({ licenseType: 1, royaltyPercent: 1 }, { unique: true });

const LicenseTermsCache = mongoose.model('LicenseTermsCache', licenseTermsCacheSchema);
export default LicenseTermsCache;
