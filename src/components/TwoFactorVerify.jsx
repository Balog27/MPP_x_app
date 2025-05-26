import React, { useState } from 'react';
import './TwoFactorVerify.css';

const TwoFactorVerify = ({ tempToken, onComplete, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL || 'https://mppxapp-production.up.railway.app';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/2fa/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempToken,
          token: code
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the token and user info
        localStorage.setItem('token', data.token);
        onComplete(data); // Pass the user data and token back to the parent
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
    <div className="two-factor-verify">
      <h2>Two-Factor Authentication Required</h2>
      <p>Please enter the verification code from your authenticator app:</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="6-digit code"
          maxLength="6"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
          autoFocus
          required
        />
        <div className="button-container">
          <button 
            type="submit" 
            className="verify-button"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          {onCancel && (
            <button 
              type="button"
              className="cancel-button"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TwoFactorVerify;