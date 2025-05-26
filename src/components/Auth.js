// src/components/Auth.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TwoFactorVerify from './TwoFactorVerify';
import './Auth.css';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    login, 
    register, 
    error, 
    requiresTwoFactor 
  } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (isLogin) {
      await login(email, password);
    } else {
      await register(username, email, password);
    }
    
    setIsSubmitting(false);
  };

  // If 2FA is required after login, show the verification component
  if (requiresTwoFactor) {
    return <TwoFactorVerify />;
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
            onChange={e => setUsername(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button 
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
        </button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)} className="toggle-auth">
        {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
      </button>
    </div>
  );
}

export default Auth;
