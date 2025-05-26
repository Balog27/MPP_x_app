import React, { useState } from 'react';
import TwoFactorVerify from './TwoFactorVerify';
import './Auth.css';

function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 2FA state
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'https://mppxapp-production.up.railway.app';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email, password }
        : { username, email, password };

      console.log(`Making ${isLogin ? 'login' : 'register'} request to ${API_URL}${endpoint}`);
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Auth API response:', data);

      if (response.ok) {
        if (data.requiresTwoFactor) {
          // Handle 2FA flow
          console.log('2FA required, setting up verification');
          setRequiresTwoFactor(true);
          setTempToken(data.tempToken);
        } else {
          // Regular login success
          localStorage.setItem('token', data.token);
          if (onAuthSuccess) onAuthSuccess(data);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorComplete = (data) => {
    // Clean up 2FA state
    setRequiresTwoFactor(false);
    setTempToken(null);
    
    // Pass auth success to parent
    if (onAuthSuccess) onAuthSuccess(data);
  };

  const handleTwoFactorCancel = () => {
    // Reset the form
    setRequiresTwoFactor(false);
    setTempToken(null);
    setError('');
  };

  // Show 2FA verification if required
  if (requiresTwoFactor) {
    return (
      <TwoFactorVerify 
        tempToken={tempToken}
        onComplete={handleTwoFactorComplete}
        onCancel={handleTwoFactorCancel}
      />
    );
  }

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button 
          type="submit" 
          disabled={loading}
        >
          {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
        </button>
      </form>
      
      <button 
        onClick={() => setIsLogin(!isLogin)}
        className="switch-auth-mode"
      >
        {isLogin 
          ? "Don't have an account? Register" 
          : "Already have an account? Login"
        }
      </button>
    </div>
  );
}

export default Auth;