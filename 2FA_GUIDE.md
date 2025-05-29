# Two-Factor Authentication (2FA) Guide

This application supports two methods of Two-Factor Authentication (2FA):

1. **Standard Time-based One-Time Password (TOTP)** - Uses an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator.
2. **Static Code** - A simplified 2FA method with a fixed code (for testing purposes only).

## Setting Up 2FA

### Standard TOTP Authentication

1. Go to your profile or account settings
2. Click "Set Up Two-Factor Authentication"
3. Choose "Set Up with Authenticator App"
4. Scan the QR code with your authenticator app
5. Enter the 6-digit verification code from your app
6. 2FA is now enabled for your account

Each time you log in, you'll need to provide the current 6-digit code from your authenticator app.

### Static Code Authentication (For Testing Only)

1. Go to your profile or account settings
2. Click "Set Up Two-Factor Authentication"
3. Choose "Set Up with Static Code"
4. You'll receive a 6-digit code that won't change
5. Enter the code to verify setup
6. 2FA is now enabled with your static code

**Note**: Static code authentication is meant for testing only and is less secure than standard TOTP authentication. For production use, always use standard TOTP authentication with an authenticator app.

## Disabling 2FA

To disable 2FA:

1. Go to your profile or account settings
2. Click on "Two-Factor Authentication"
3. Enter your current verification code
4. Click "Disable Two-Factor Authentication"

## Troubleshooting

### For TOTP Authentication:
- Make sure your device's time is synchronized correctly
- Check that you're using the most current code (codes change every 30 seconds)
- Ensure you're entering the code from the correct account in your authenticator app

### For Static Code Authentication:
- Enter the exact same 6-digit code you received during setup
- This code never changes
- If you lose your static code, contact support for assistance

## Developer Notes

The application implements 2FA using:

- The `speakeasy` library for TOTP code generation and verification
- JWT for secure token transmission
- Session storage for maintaining authentication state during 2FA verification

For integration testing, use the static code option to avoid time-based verification issues.
