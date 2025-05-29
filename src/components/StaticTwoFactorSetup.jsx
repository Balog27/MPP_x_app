import React, { useState } from 'react';
import './TwoFactorSetup.css'; // Reuse existing styles
import './StaticTwoFactorSetup.css'; // Add specialized styles

const API_URL = process.env.REACT_APP_API_URL || 'https://mppxapp-production.up.railway.app';

const StaticTwoFactorSetup = ({ onSetupComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('init'); // init, code, verify, complete
  const [staticCode, setStaticCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const generateStaticCode = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/2fa/setup-static`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok) {
        setStaticCode(data.code);
        setStep('code');
      } else {
        setError(data.error || 'Failed to generate static code');
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
      const response = await fetch(`${API_URL}/api/2fa/verify-setup-static`, {
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

  const handleStartSetup = (e) => {
    e.preventDefault();
    generateStaticCode();
  };

  const handleVerify = (e) => {
    e.preventDefault();
    verifySetup();
  };

  return (
    <div className="two-factor-setup-container">
      <h2>Set Up Static Two-Factor Authentication</h2>
      <p className="setup-subtitle">This is a simplified 2FA for testing purposes.</p>
      
      {error && <div className="error-message">{error}</div>}
      
      {step === 'init' && (
        <div className="setup-instructions">
          <p>Static 2FA provides a simple, unchanging verification code for testing purposes.</p>
          <p>In a production environment, you would use a time-based authenticator app instead.</p>
          
          <button 
            onClick={handleStartSetup} 
            disabled={loading}
            className="setup-button"
          >
            {loading ? 'Generating...' : 'Generate Static Code'}
          </button>
        </div>
      )}
      
      {step === 'code' && (
        <div className="setup-instructions">
          <p>Your static verification code has been generated:</p>
          
          <div className="static-code-display">
            <div className="static-code">{staticCode}</div>
            <button 
              onClick={() => navigator.clipboard.writeText(staticCode)}
              className="copy-button"
            >
              Copy
            </button>
          </div>
          
          <div className="code-instructions">
            <p><strong>Important:</strong> Copy and save this code securely.</p>
            <p>You will need to use this same code every time you log in.</p>
          </div>
          
          <form onSubmit={handleVerify} className="verify-form">
            <p>To activate static 2FA, verify your code:</p>
            <input
              type="text"
              placeholder="6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength="6"
              required
            />
            <button 
              type="submit" 
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify and Enable'}
            </button>
          </form>
        </div>
      )}
      
      {step === 'complete' && (
        <div className="setup-success">
          <h3>Static Two-Factor Authentication is now enabled!</h3>
          <p>Your static code is: <strong>{staticCode}</strong></p>
          <p>Please remember this code, as you will need it every time you log in.</p>
          <p>Note: This is a simplified 2FA method for testing purposes.</p>
        </div>
      )}
    </div>
  );
};

export default StaticTwoFactorSetup;
