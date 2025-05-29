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
    // Check if user has static code setup and pre-fill it if available
  useEffect(() => {
    const checkForStoredCode = () => {
      // Check for the twoFactorType in sessionStorage first (more reliable)
      const storedType = sessionStorage.getItem('twoFactorType');
      const storedStaticFlag = localStorage.getItem('usedStaticCode');
      const storedStaticCode = localStorage.getItem('staticCode');
      
      // If we have evidence this is a static code setup
      if (storedType === 'static' || storedStaticFlag === 'true') {
        setIsStaticCode(true);
        console.log('Static code detected for 2FA verification');
        
        // Pre-fill the static code if it exists in localStorage
        if (storedStaticCode) {
          console.log('Pre-filling stored static code');
          setCode(storedStaticCode);
        } else {
          console.log('No stored static code found to pre-fill');
        }
      }
    };
    
    checkForStoredCode();
  }, []);
  
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
          console.log('Setting static code flags after successful verification');
          localStorage.setItem('usedStaticCode', 'true');
            // Make sure we keep the verified static code for future use
          // First try to use staticCode from the response, fall back to the entered code
          const codeToStore = data.staticCode || code;
          if (codeToStore) {
            localStorage.setItem('staticCode', codeToStore);
          }
        }
        
        // Store the token and user info
        localStorage.setItem('token', data.token);
        // Clear the temporary token and session data
        sessionStorage.removeItem('tempToken');
        sessionStorage.removeItem('twoFactorType');
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