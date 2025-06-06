const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { auth } = require('../middleware/auth');
const twoFactorService = require('../services/twoFactorService');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const monitoringService = require('../services/monitoringService');

// Generate a new 2FA secret for a user
router.post('/setup', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Generate new secret
    const secret = twoFactorService.generateSecret(user.username);
    
    // Generate QR code
    const qrCode = await twoFactorService.generateQRCode(secret.otpauth_url);
    
    // Store the secret in the user record (but don't enable 2FA yet)
    await user.update({ twoFactorSecret: secret.base32 });
    
    // Log the activity
    await monitoringService.logActivity(
      user.id,
      'UPDATE',
      'User',
      user.id,
      '2FA setup initiated',
      req
    );

    // Return the secret and QR code to the client
    res.json({
      secret: secret.base32,
      qrCode: qrCode
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify a token and enable 2FA for the user
router.post('/verify-setup', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;
    
    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not set up yet' });
    }
    
    // Verify the token
    const isValid = twoFactorService.verifyToken(token, user.twoFactorSecret);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    
    // Enable 2FA
    await user.update({ twoFactorEnabled: true });
    
    // Log the activity
    await monitoringService.logActivity(
      user.id,
      'UPDATE',
      'User',
      user.id,
      '2FA enabled',
      req
    );
    
    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disable 2FA for the user
router.post('/disable', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;
    
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }
    
    // Verify the token one last time to ensure it's the user
    const isValid = twoFactorService.verifyToken(token, user.twoFactorSecret);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    
    // Disable 2FA
    await user.update({ 
      twoFactorEnabled: false,
      twoFactorSecret: null
    });
    
    // Log the activity
    await monitoringService.logActivity(
      user.id,
      'UPDATE',
      'User',
      user.id,
      '2FA disabled',
      req
    );
    
    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate a 2FA token during login
router.post('/validate', async (req, res) => {
  try {
    const { tempToken, token } = req.body;
    
    if (!tempToken || !token) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify the temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid temporary token' });
    }
    
    // Get the user
    const user = await User.findOne({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Verify the 2FA token
    const isValid = twoFactorService.verifyToken(token, user.twoFactorSecret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }
    
    // Clear the temporary token
    await user.update({ tempToken: null });
    
    // Generate a new full access token
    const fullToken = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: '7d'
    });
    
    // Log the successful 2FA login
    await monitoringService.logActivity(
      user.id,
      'READ',
      'User',
      user.id,
      'User completed 2FA login',
      { ip: req.ip, headers: req.headers }
    );
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token: fullToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;