// backend/routes/verification.js
import express from 'express';
const router = express.Router();
import { ethers } from 'ethers';
import MintToken from '../models/MintToken.js';
import LicenseToken from '../models/LicenseToken.js';
import dotenv from 'dotenv';

dotenv.config();

// Backend verifier wallet (keep private key SECURE!)
const BACKEND_VERIFIER_PRIVATE_KEY = process.env.BACKEND_VERIFIER_PRIVATE_KEY;
const verifierWallet = new ethers.Wallet(BACKEND_VERIFIER_PRIVATE_KEY);

const TOKEN_EXPIRY_SECONDS = 900; // 15 minutes

router.post('/generate-mint-token', async (req, res) => {
  try {
    const { creatorAddress, contentHash, ipMetadataURI, nftMetadataURI } = req.body;
    
    // Validation
    if (!ethers.isAddress(creatorAddress)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid creator address' }
      });
    }
    
    // Check for duplicate content
    const existing = await MintToken.findOne({ 
      contentHash, 
      status: 'used' 
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_CONTENT',
          message: 'Content already registered',
          existingIpId: existing.ipId
        }
      });
    }
    
    // Generate nonce (sequential)
    const lastToken = await MintToken.findOne().sort({ nonce: -1 });
    const nonce = lastToken ? lastToken.nonce + 1 : 1;
    
    // Calculate expiry
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
    
    // Hash the URIs first (to match Solidity contract)
    const ipMetadataHash = ethers.keccak256(ethers.toUtf8Bytes(ipMetadataURI));
    const nftMetadataHash = ethers.keccak256(ethers.toUtf8Bytes(nftMetadataURI));
    
    // Create message hash (MUST match Solidity keccak256)
    // Contract does: keccak256(abi.encodePacked(recipient, contentHash, keccak256(ipURI), keccak256(nftURI), nonce, expiry))
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256'],
      [creatorAddress, contentHash, ipMetadataHash, nftMetadataHash, nonce, expiresAt]
    );
    
    // Sign the hash directly (NOT as a message - no Ethereum prefix)
    const messageHashBytes = ethers.getBytes(messageHash);
    const signature = await verifierWallet.signMessage(messageHashBytes);
    
    console.log('🔐 Signature created:');
    console.log('  IP URI:', ipMetadataURI);
    console.log('  IP URI Hash:', ipMetadataHash);
    console.log('  NFT URI:', nftMetadataURI);
    console.log('  NFT URI Hash:', nftMetadataHash);
    console.log('  Message hash:', messageHash);
    console.log('  Signature:', signature);
    console.log('  Signer address:', verifierWallet.address);
    
    // Store in database
    const mintToken = new MintToken({
      nonce,
      creatorAddress,
      contentHash,
      ipMetadataURI,
      nftMetadataURI,
      signature,
      expiresAt: new Date(expiresAt * 1000),
      status: 'pending'
    });
    
    await mintToken.save();
    
    res.json({
      success: true,
      data: {
        signature,
        nonce,
        expiresAt,
        expiresIn: TOKEN_EXPIRY_SECONDS
      }
    });
    
  } catch (error) {
    console.error('Error generating mint token:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

router.get('/token/:nonce/status', async (req, res) => {
  try {
    const { nonce } = req.params;
    
    const token = await MintToken.findOne({ nonce: parseInt(nonce) });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Token not found' }
      });
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAtUnix = Math.floor(token.expiresAt.getTime() / 1000);
    const isExpired = now > expiresAtUnix;
    
    // Auto-update status if expired
    if (isExpired && token.status === 'pending') {
      token.status = 'expired';
      await token.save();
    }
    
    const response = {
      success: true,
      data: {
        nonce: token.nonce,
        status: token.status,
        creatorAddress: token.creatorAddress,
        expiresAt: expiresAtUnix,
        isExpired
      }
    };
    
    if (token.status === 'pending') {
      response.data.remainingSeconds = Math.max(0, expiresAtUnix - now);
    }
    
    if (token.status === 'used') {
      response.data.ipId = token.ipId;
      response.data.tokenId = token.tokenId;
      response.data.txHash = token.txHash;
      response.data.usedAt = Math.floor(token.usedAt.getTime() / 1000);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Error checking token status:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

router.patch('/token/:nonce/update', async (req, res) => {
  try {
    const { nonce } = req.params;
    const { ipId, tokenId, txHash } = req.body;
    
    const token = await MintToken.findOne({ nonce: parseInt(nonce) });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Token not found' }
      });
    }
    
    if (token.status === 'used') {
      return res.status(409).json({
        success: false,
        error: { 
          code: 'ALREADY_USED', 
          message: 'Token has already been used',
          existingIpId: token.ipId
        }
      });
    }
    
    // Update token
    token.status = 'used';
    token.ipId = ipId;
    token.tokenId = tokenId;
    token.txHash = txHash;
    token.usedAt = new Date();
    
    await token.save();
    
    res.json({
      success: true,
      message: 'Token updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating token:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// Get all registered IP assets for a user
router.get('/user/:address/assets', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ADDRESS', message: 'User address is required' }
      });
    }

    // Fetch all assets for this user that have been successfully minted
    const assets = await MintToken.find({
      creatorAddress: address.toLowerCase(),
      status: 'used',
      ipId: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      assets: assets,
      count: assets.length
    });

  } catch (error) {
    console.error('Error fetching user assets:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// Get license tokens minted by a user
router.get('/license-tokens/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ADDRESS', message: 'User address is required' }
      });
    }

    // Fetch all license tokens minted by this user
    const licenseTokens = await LicenseToken.find({
      licenseeAddress: address.toLowerCase(),
      status: 'minted'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      licenseTokens: licenseTokens,
      count: licenseTokens.length
    });

  } catch (error) {
    console.error('Error fetching license tokens:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

export default router;
