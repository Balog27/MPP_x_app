import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './TwoFactorVerify.css';

function TwoFactorVerify() {
  const [token, setToken] = useState('');
  const { validateTwoFactor, error, currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const result = await validateTwoFactor(token);
    
    setIsSubmitting(false);
    if (!result.success) {
      // Token verification failed, clear input for retry
      setToken('');
    }
  };

  return (
    <div className="two-factor-container">
      <h2>Two-Factor Authentication</h2>
      <p>Hello, {currentUser?.username}. Please enter the verification code from your authenticator app.</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="6-digit code"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          maxLength="6"
          pattern="[0-9]{6}"
          required
          autoFocus
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying...' : 'Verify'}
        </button>
      </form>
    </div>
  );
}

export default TwoFactorVerify;