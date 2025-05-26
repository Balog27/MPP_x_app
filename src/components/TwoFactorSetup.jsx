import React, { useState } from 'react';
import './TwoFactorSetup.css';

function TwoFactorSetup({ onSetupComplete }) {
  const [step, setStep] = useState('start'); // start, setup, verify, complete
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'https://mppxapp-production.up.railway.app';

  const startSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/2fa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSecret(data.secret);
        setQrCode(data.qrCode);
        setStep('setup');
      } else {
        setError(data.error || 'Failed to start 2FA setup');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/2fa/verify-setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('complete');
        if (onSetupComplete) {
          onSetupComplete();
        }
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="two-factor-setup">
      {step === 'start' && (
        <div className="setup-intro">
          <h2>Set Up Two-Factor Authentication</h2>
          <p>
            Two-factor authentication adds an extra layer of security to your account.
            After setup, you'll need both your password and your phone to log in.
          </p>
          
          <div className="setup-steps">
            <div className="step">
              <div className="step-number">1</div>
              <p>Install an authenticator app like Google Authenticator or Authy</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <p>Scan the QR code or enter the secret key in the app</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <p>Verify by entering the authentication code</p>
            </div>
          </div>
          
          <button 
            onClick={startSetup}
            disabled={loading}
            className="primary-button"
          >
            {loading ? 'Starting...' : 'Begin Setup'}
          </button>
        </div>
      )}
      
      {step === 'setup' && (
        <div className="setup-qr">
          <h2>Scan QR Code</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <p>Scan this QR code with your authenticator app:</p>
          <div className="qr-container">
            <img src={qrCode} alt="QR code for authentication" />
          </div>
          
          <p className="or-divider">OR</p>
          
          <p>Enter this secret key into your authenticator app:</p>
          <div className="secret-key">{secret}</div>
          
          <p>After setting up, enter the 6-digit verification code from your app:</p>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Enter 6-digit code"
            maxLength="6"
          />
          
          <button 
            onClick={verifySetup}
            disabled={loading || verificationCode.length !== 6}
            className="primary-button"
          >
            {loading ? 'Verifying...' : 'Verify & Activate'}
          </button>
        </div>
      )}
      
      {step === 'complete' && (
        <div className="setup-complete">
          <h2>Setup Complete! 🎉</h2>
          <div className="success-icon">✓</div>
          <p>
            Two-factor authentication has been successfully enabled for your account.
            You'll now need to enter a verification code when you log in.
          </p>
          <button onClick={onSetupComplete} className="primary-button">
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

export default TwoFactorSetup;