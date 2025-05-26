const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { User } = require('../models');

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
   */
  verifyToken(token, secret) {
    // Make sure inputs are valid
    if (!token || !secret) {
      console.log('Missing token or secret for verification');
      return false;
    }

    try {
      // Allow a bit more flexibility with the token formatting
      const cleanToken = token.replace(/\s+/g, '');
      
      const result = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: cleanToken,
        window: 1 // Allow 1 step before and after current time (for clock drift)
      });
      
      console.log('Token verification result:', result);
      return result;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  }
}

module.exports = new TwoFactorService();