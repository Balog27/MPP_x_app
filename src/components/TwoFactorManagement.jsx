import React, { useState, useEffect } from 'react';
import TwoFactorSetup from './TwoFactorSetup';
import './TwoFactorManagement.css';

function TwoFactorManagement() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'https://mppxapp-production.up.railway.app';

  // Fetch user data to check if 2FA is enabled
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load user data');
        }
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [API_URL]);

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setDisableLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/2fa/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: disableCode }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update user data after disabling 2FA
        setUser(prev => ({
          ...prev,
          twoFactorEnabled: false
        }));
        setDisableCode('');
      } else {
        setError(data.error || 'Failed to disable 2FA');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setDisableLoading(false);
    }
  };

  const handleSetupComplete = () => {
    // Update user data after enabling 2FA
    setUser(prev => ({
      ...prev,
      twoFactorEnabled: true
    }));
    setShowSetup(false);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (showSetup) {
    return <TwoFactorSetup onSetupComplete={handleSetupComplete} />;
  }

  return (
    <div className="two-factor-management">
      <h2>Two-Factor Authentication</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {user && user.twoFactorEnabled ? (
        <div>
          <div className="status enabled">
            <span className="status-icon">✓</span>
            <span>Two-Factor Authentication is enabled</span>
          </div>
          
          <p>
            Your account is protected with an additional layer of security. 
            You'll need to enter a verification code from your authenticator app when logging in.
          </p>
          
          <h3>Disable Two-Factor Authentication</h3>
          <p>To disable 2FA, enter the current verification code from your authenticator app:</p>
          
          <form onSubmit={handleDisable2FA}>
            <input
              type="text"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Enter 6-digit code"
              maxLength="6"
              required
            />
            <button 
              type="submit" 
              className="danger-button"
              disabled={disableLoading || disableCode.length !== 6}
            >
              {disableLoading ? 'Processing...' : 'Disable Two-Factor Authentication'}
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
            from your phone when you log in.
          </p>
          
          <button 
            onClick={() => setShowSetup(true)}
            className="primary-button"
          >
            Enable Two-Factor Authentication
          </button>
        </div>
      )}
    </div>
  );
}

export default TwoFactorManagement;