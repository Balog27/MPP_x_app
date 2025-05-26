import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './TwoFactorSetup.css';

function TwoFactorSetup() {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('init'); // init, setup, verify, success
  const { setupTwoFactor, verifyTwoFactorSetup, error } = useAuth();

  useEffect(() => {
    // Generate initial setup when component mounts
    const generateSetup = async () => {
      setLoading(true);
      const result = await setupTwoFactor();
      if (result.success) {
        setQrCode(result.qrCode);
        setSecret(result.secret);
        setStep('setup');
      }
      setLoading(false);
    };

    generateSetup();
  }, [setupTwoFactor]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await verifyTwoFactorSetup(token);
    
    setLoading(false);
    if (result.success) {
      setStep('success');
    } else {
      // Token verification failed, clear input for retry
      setToken('');
    }
  };

  if (loading) {
    return <div className="two-factor-loading">Loading...</div>;
  }

  return (
    <div className="two-factor-setup-container">
      <h2>Set Up Two-Factor Authentication</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {step === 'setup' && (
        <div className="setup-instructions">
          <p>Scan this QR code with your authenticator app:</p>
          <div className="qr-container">
            <img src={qrCode} alt="QR Code for 2FA" />
          </div>
          
          <p>Or manually enter this code in your authenticator app:</p>
          <div className="secret-key">{secret}</div>
          
          <p>After scanning the QR code or adding the key manually, enter the verification code from your app:</p>
          
          <form onSubmit={handleVerify}>
            <input
              type="text"
              placeholder="6-digit code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              maxLength="6"
              pattern="[0-9]{6}"
              required
            />
            <button type="submit">Verify and Enable</button>
          </form>
        </div>
      )}
      
      {step === 'success' && (
        <div className="setup-success">
          <h3>Two-Factor Authentication is now enabled!</h3>
          <p>Your account is now more secure. You will be required to enter a verification code when you log in.</p>
          <p>Important: Make sure to keep your recovery codes in a safe place. If you lose access to your authenticator app, you'll need them to log in.</p>
        </div>
      )}
    </div>
  );
}

export default TwoFactorSetup;