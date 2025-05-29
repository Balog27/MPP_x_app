const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { User } = require('../models');
const crypto = require('crypto');

class TwoFactorService {
  /**
   * Generate a new secret for a user
   * @param {string} username - The user's username
   * @returns {Object} - Object containing secret and other 2FA details
   */
  generateSecret(username) {
    const secret = speakeasy.generateSecret({
      name: `MPP_X_App:${username}`
    });
    
    return {
      ascii: secret.ascii,
      hex: secret.hex,
      base32: secret.base32,
      otpauth_url: secret.otpauth_url
    };
  }

  /**
   * Generate QR code for the otpauth URL
   * @param {string} otpauthUrl - The otpauth URL
   * @returns {Promise<string>} - Data URL of the QR code
   */
  async generateQRCode(otpauthUrl) {
    try {
      return await qrcode.toDataURL(otpauthUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Error generating QR code');
    }
  }

  /**
   * Verify a TOTP token
   * @param {string} token - The TOTP token to verify
   * @param {string} secret - The user's secret
   * @returns {boolean} - Whether the token is valid
   */  verifyToken(token, secret) {
    // Make sure inputs are valid
    if (!token || !secret) {
      console.log('Missing token or secret for verification');
      return false;
    }

    try {
      // Allow a bit more flexibility with the token formatting
      const cleanToken = token.replace(/\s+/g, '');
      console.log(`Verifying token: ${cleanToken} with secret: ${secret ? 'SECRET_PROVIDED' : 'NO_SECRET'}`);
      
      // For debugging current time-step
      const timeStep = Math.floor(Date.now() / 30000);
      console.log(`Current time step: ${timeStep}`);
      
      // Check if token is a valid 6-digit number
      if (!/^\d{6}$/.test(cleanToken)) {
        console.log('Invalid token format, must be 6 digits');
        return false;
      }

      // Check if this is a static code (prefixed with "STATIC:")
      if (secret && secret.startsWith('STATIC:')) {
        console.log('Detected static code secret, using static verification');
        return this.verifyStaticCode(cleanToken, secret);
      }
        
      const result = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: cleanToken,
        window: 2 // Allow 2 steps before and after current time (for more clock drift tolerance)
      });
      
      console.log('Token verification result:', result);
      return result;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  }

  /**
   * Generate a static verification code for testing
   * @returns {Object} - Static code information
   */
  generateStaticCode() {
    // Generate a simple 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code with a prefix to distinguish it from TOTP secrets
    const secret = `STATIC:${code}`;
    
    return {
      code,
      secret
    };
  }
  /**
   * Verify a static verification code
   * @param {string} token - The token to verify
   * @param {string} secret - The static secret in format "STATIC:123456"
   * @returns {boolean} - Whether the token is valid
   */
  verifyStaticCode(token, secret) {
    if (!token || !secret || !secret.startsWith('STATIC:')) {
      console.log('Not a valid static code or secret');
      return false;
    }
    
    // Clean the token (remove any spaces)
    const cleanToken = token.replace(/\s+/g, '');
    
    // Get the stored code without the "STATIC:" prefix
    const storedCode = secret.substring(7);
    console.log(`Verifying static code. Input: ${cleanToken}, Expected: ${storedCode}`);
    
    // Ensure exact match
    return cleanToken === storedCode;
  }
}

module.exports = new TwoFactorService();