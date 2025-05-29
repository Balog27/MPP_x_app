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
    console.log('Setting up 2FA for user:', req.user.id);
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
    console.error('Error in 2FA setup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate a static code for testing 2FA (simpler alternative)
router.post('/setup-static', auth, async (req, res) => {
  try {
    console.log('Setting up static 2FA for user:', req.user.id);
    const user = req.user;
    
    // Generate static code
    const staticCode = twoFactorService.generateStaticCode();
    
    // Store the secret in the user record (but don't enable 2FA yet)
    await user.update({ twoFactorSecret: staticCode.secret });
    
    // Log the activity
    await monitoringService.logActivity(
      user.id,
      'UPDATE',
      'User',
      user.id,
      'Static 2FA setup initiated',
      req
    );

    // Return the code to the client
    res.json({
      code: staticCode.code,
      message: "Use this code for all 2FA verifications. This is a test-only mode."
    });
  } catch (error) {
    console.error('Error in static 2FA setup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify a token and enable 2FA for the user
router.post('/verify-setup', auth, async (req, res) => {
  try {
    console.log('Verifying 2FA setup for user:', req.user.id);
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
    console.error('Error in 2FA verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify static code setup
router.post('/verify-setup-static', auth, async (req, res) => {
  try {
    console.log('Verifying static 2FA setup for user:', req.user.id);
    const { token } = req.body;
    const user = req.user;
    
    if (!user.twoFactorSecret || !user.twoFactorSecret.startsWith('STATIC:')) {
      return res.status(400).json({ error: 'Static 2FA not set up yet' });
    }
    
    // Verify the token
    const isValid = twoFactorService.verifyStaticCode(token, user.twoFactorSecret);
    
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
      'Static 2FA enabled',
      req
    );
    
    res.json({ 
      success: true, 
      message: '2FA enabled successfully using static code',
      staticCode: token
    });
  } catch (error) {
    console.error('Error in static 2FA verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disable 2FA for the user
router.post('/disable', auth, async (req, res) => {
  try {
    console.log('Disabling 2FA for user:', req.user.id);
    const { token } = req.body;
    const user = req.user;
    
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }
    
    // Check if this is a static code
    const isStaticCode = user.twoFactorSecret && user.twoFactorSecret.startsWith('STATIC:');
    
    // Verify the token based on the type (static or TOTP)
    let isValid;
    if (isStaticCode) {
      isValid = twoFactorService.verifyStaticCode(token, user.twoFactorSecret);
      console.log('Static code verification for disable:', isValid);
    } else {
      isValid = twoFactorService.verifyToken(token, user.twoFactorSecret);
      console.log('TOTP verification for disable:', isValid);
    }
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
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
      isStaticCode ? 'Static 2FA disabled' : '2FA disabled',
      req
    );
    
    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate a 2FA token during login
router.post('/validate', async (req, res) => {
  try {
    console.log('Validating 2FA token during login');
    const { tempToken, token } = req.body;
    
    if (!tempToken || !token) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify the temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
      console.log('Temp token verified for user ID:', decoded.id);
    } catch (error) {
      console.error('Invalid temporary token:', error);
      return res.status(401).json({ error: 'Invalid temporary token' });
    }
    
    // Get the user
    const user = await User.findOne({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    console.log('Found user:', user.id, 'with 2FA enabled:', user.twoFactorEnabled);
    
    // Verify the 2FA token
    const isValid = twoFactorService.verifyToken(token, user.twoFactorSecret);
    if (!isValid) {
      console.log('Invalid 2FA token provided');
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }
    
    console.log('2FA token is valid, generating full access token');
    
    // Clear the temporary token
    await user.update({ tempToken: null });
      // Generate a new full access token
    const fullToken = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: '7d'
    });
    
    // Check if this was a static code authentication
    const isStaticCode = user.twoFactorSecret && user.twoFactorSecret.startsWith('STATIC:');
    
    // If this is a static code, extract the code without the STATIC: prefix
    let staticCodeValue = null;
    if (isStaticCode) {
      staticCodeValue = user.twoFactorSecret.substring(7);
    }
    
    // Log the successful 2FA login
    await monitoringService.logActivity(
      user.id,
      'READ',
      'User',
      user.id,
      `User completed 2FA login ${isStaticCode ? '(static code)' : '(TOTP)'}`,
      { ip: req.ip, headers: req.headers }
    );
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token: fullToken,
      isStaticCode: isStaticCode,
      // Include the static code in the response if applicable
      staticCode: staticCodeValue
    });
  } catch (error) {
    console.error('Error in 2FA validation:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;