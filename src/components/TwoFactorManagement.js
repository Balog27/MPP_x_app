import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TwoFactorSetup from './TwoFactorSetup';
import StaticTwoFactorSetup from './StaticTwoFactorSetup';
import './TwoFactorManagement.css';

function TwoFactorManagement() {
  const { currentUser, disableTwoFactor, error } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [showStaticSetup, setShowStaticSetup] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDisable = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await disableTwoFactor(token);
    
    setLoading(false);
    if (result.success) {
      setToken('');
    }
  };

  if (showSetup) {
    return <TwoFactorSetup onSetupComplete={() => setShowSetup(false)} />;
  }

  if (showStaticSetup) {
    return <StaticTwoFactorSetup onSetupComplete={() => setShowStaticSetup(false)} />;
  }

  return (
    <div className="two-factor-management">
      <h2>Two-Factor Authentication</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {currentUser?.twoFactorEnabled ? (
        <div>
          <div className="status enabled">
            <span className="status-icon">✓</span>
            <span>Two-Factor Authentication is enabled</span>
          </div>
          
          <p>To disable two-factor authentication, enter the verification code from your authenticator app:</p>
          
          <form onSubmit={handleDisable}>
            <input
              type="text"
              placeholder="6-digit code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              maxLength="6"
              pattern="[0-9]{6}"
              required
            />
            <button 
              type="submit" 
              className="danger-button"
              disabled={loading}
            >
              {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div className="status disabled">
            <span className="status-icon">!</span>
            <span>Two-Factor Authentication is not enabled</span>
          </div>
          
          <p>
            Two-factor authentication adds an extra layer of security to your account.
            When enabled, you'll need to enter both your password and a verification code
            when you log in.
          </p>

          <div className="two-factor-options">
            <div className="two-factor-option">
              <h3>Authenticator App</h3>
              <p>Set up 2FA using an authenticator app like Google Authenticator or Authy.</p>
              <button 
                onClick={() => setShowSetup(true)}
                className="primary-button"
              >
                Set Up with Authenticator App
              </button>
            </div>
            
            <div className="two-factor-option testing">
              <h3>Static Code (For Testing)</h3>
              <p>Set up 2FA using a static code that doesn't change.</p>
              <p className="testing-note">This option is for testing purposes only!</p>
              <button 
                onClick={() => setShowStaticSetup(true)}
                className="secondary-button"
              >
                Set Up with Static Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TwoFactorManagement;