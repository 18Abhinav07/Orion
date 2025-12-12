// api/models/LicenseToken.js
import mongoose from 'mongoose';

const licenseTokenSchema = new mongoose.Schema({
  licenseTokenId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  parentIpId: {
    type: String,
    required: true,
    index: true
  },
  parentIpName: String,
  licenseTermsId: {
    type: String,
    required: true
  },
  tokenId: Number,
  licenseeAddress: {
    type: String,
    required: true,
    index: true,
    lowercase: true
  },
  amount: {
    type: Number,
    default: 1
  },
  txHash: String,
  status: {
    type: String,
    enum: ['pending', 'minted', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const LicenseToken = mongoose.model('LicenseToken', licenseTokenSchema);
export default LicenseToken;
