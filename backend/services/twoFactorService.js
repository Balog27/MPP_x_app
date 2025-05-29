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
   */  verifyToken(token, secret) {
    // Make sure inputs are valid
    if (!token || !secret) {
      console.log('Missing token or secret for verification');
      return false;
    }

    try {      // Allow a bit more flexibility with the token formatting
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
}

module.exports = new TwoFactorService();