import React, { useState, useEffect } from 'react';
import './TwoFactorVerify.css';

const TwoFactorVerify = ({ tempToken, onComplete, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginRetries, setLoginRetries] = useState(0);
  const [isStaticCode, setIsStaticCode] = useState(false);
  const [userId, setUserId] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL || 'https://mppxapp-production.up.railway.app';
  
  // If tempToken isn't provided via props, try to get it from sessionStorage
  const actualToken = tempToken || sessionStorage.getItem('tempToken');
  
  // Check if user has static code setup
  useEffect(() => {
    const checkCodeType = async () => {
      if (!actualToken) return;
      
      try {
        // Decode the JWT token to get the user ID
        const payload = JSON.parse(atob(actualToken.split('.')[1]));
        setUserId(payload.id);
        
        // For simplicity, we'll assume it's a static code if 
        // the token contains a special flag or user has used static code before
        const hasUsedStaticCode = localStorage.getItem('usedStaticCode');
        if (hasUsedStaticCode === 'true') {
          setIsStaticCode(true);
        }
      } catch (err) {
        console.error('Error checking code type:', err);
      }
    };
    
    checkCodeType();
  }, [actualToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if we have a token
    if (!actualToken) {
      setError('Your session has expired. Please log in again.');
      return;
    }
    
    // Extra validation
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      console.log('Validating 2FA code with token');
      
      const response = await fetch(`${API_URL}/api/2fa/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempToken: actualToken,
          token: code.trim() // Ensure no whitespace
        }),
      });

      const data = await response.json();
      console.log('2FA validation response:', data);
      
      if (response.ok) {
        // If this is a static code (from the response or we detected it),
        // mark it in localStorage for future reference
        if (data.isStaticCode || isStaticCode) {
          localStorage.setItem('usedStaticCode', 'true');
        }
        
        // Store the token and user info
        localStorage.setItem('token', data.token);
        // Clear the temporary token
        sessionStorage.removeItem('tempToken');
        onComplete(data); // Pass the user data and token back to the parent
      } else {
        // Track failed attempts
        setLoginRetries(prev => prev + 1);
        
        // Better error handling with helpful tips
        let errorMessage = data.error || 'Invalid verification code';
        
        // Add more specific guidance based on the code type and number of retries
        if (isStaticCode) {
          errorMessage += '. Make sure you are entering the same static code you set up initially.';
        } else if (loginRetries >= 2) {
          errorMessage += '. Make sure your device clock is synchronized. Try refreshing the page if the problem persists.';
        } else {
          errorMessage += '. Please make sure you are entering the current code from your authenticator app.';
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      console.error('2FA error:', err);
      setError('Network error. Please try again or refresh the page.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="two-factor-verify">
      <h2>Two-Factor Authentication Required</h2>
      <p>Please enter the {isStaticCode ? 'static' : 'current'} verification code{isStaticCode ? ' you set up initially' : ' from your authenticator app'}:</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="verification-tips">
        <p><strong>Tips:</strong></p>
        <ul>
          {isStaticCode ? (
            <>
              <li>Enter the static code you received during setup</li>
              <li>This is the same 6-digit code every time you log in</li>
              <li>If you've forgotten your code, you'll need to contact support</li>
            </>
          ) : (
            <>
              <li>Enter the most current code from your authenticator app (Google Authenticator, Authy, etc.)</li>
              <li>Codes change every 30 seconds - wait for a fresh code if needed</li>
              <li>Make sure your device's time is correctly synchronized with internet time</li>
            </>
          )}
          <li>Try refreshing the page if you've been waiting on this screen for a while</li>
        </ul>
      </div>
      
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
            disabled={loading || code.length !== 6}
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