import React, { createContext, useState, useEffect, useContext } from 'react';

// Define server URL based on environment
const API_URL = process.env.REACT_APP_API_URL || 'https://mppxapp-production.up.railway.app';

// Create context
export const AuthContext = createContext();

// Create provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState(null);

  useEffect(() => {
    // Check if the user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      } else {
        // If token is invalid, remove it
        localStorage.removeItem('token');
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.requiresTwoFactor) {
          // If 2FA is required, store the temporary token and set the flag
          setRequiresTwoFactor(true);
          setTempToken(data.tempToken);
          setCurrentUser({
            id: data.user.id,
            username: data.user.username
          });
          return { requiresTwoFactor: true };
        } else if (data.token) {
          // Regular login success
          localStorage.setItem('token', data.token);
          setCurrentUser(data.user);
          return { success: true };
        }
      } else {
        setError(data.error || 'Login failed');
        return { error: data.error || 'Login failed' };
      }
    } catch (error) {
      setError('Network error. Please try again later.');
      return { error: 'Network error. Please try again later.' };
    }
  };

  const validateTwoFactor = async (token) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/2fa/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          tempToken: tempToken,
          token: token
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);
        setRequiresTwoFactor(false);
        setTempToken(null);
        return { success: true };
      } else {
        setError(data.error || 'Invalid 2FA token');
        return { error: data.error || 'Invalid 2FA token' };
      }
    } catch (error) {
      setError('Network error. Please try again later.');
      return { error: 'Network error. Please try again later.' };
    }
  };

  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);
        return { success: true };
      } else {
        setError(data.error || 'Registration failed');
        return { error: data.error || 'Registration failed' };
      }
    } catch (error) {
      setError('Network error. Please try again later.');
      return { error: 'Network error. Please try again later.' };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      localStorage.removeItem('token');
      setCurrentUser(null);
      setRequiresTwoFactor(false);
      setTempToken(null);
    }
  };

  // 2FA setup
  const setupTwoFactor = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required');
        return { error: 'Authentication required' };
      }
      
      const response = await fetch(`${API_URL}/api/2fa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { 
          success: true,
          secret: data.secret,
          qrCode: data.qrCode
        };
      } else {
        setError(data.error || 'Failed to setup 2FA');
        return { error: data.error || 'Failed to setup 2FA' };
      }
    } catch (error) {
      setError('Network error. Please try again later.');
      return { error: 'Network error. Please try again later.' };
    }
  };

  const verifyTwoFactorSetup = async (token) => {
    try {
      setError(null);
      const authToken = localStorage.getItem('token');
      
      if (!authToken) {
        setError('Authentication required');
        return { error: 'Authentication required' };
      }
      
      const response = await fetch(`${API_URL}/api/2fa/verify-setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update user data with 2FA enabled
        await fetchUserData(authToken);
        return { success: true };
      } else {
        setError(data.error || 'Failed to verify 2FA token');
        return { error: data.error || 'Failed to verify 2FA token' };
      }
    } catch (error) {
      setError('Network error. Please try again later.');
      return { error: 'Network error. Please try again later.' };
    }
  };

  const disableTwoFactor = async (token) => {
    try {
      setError(null);
      const authToken = localStorage.getItem('token');
      
      if (!authToken) {
        setError('Authentication required');
        return { error: 'Authentication required' };
      }
      
      const response = await fetch(`${API_URL}/api/2fa/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update user data with 2FA disabled
        await fetchUserData(authToken);
        return { success: true };
      } else {
        setError(data.error || 'Failed to disable 2FA');
        return { error: data.error || 'Failed to disable 2FA' };
      }
    } catch (error) {
      setError('Network error. Please try again later.');
      return { error: 'Network error. Please try again later.' };
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        currentUser, 
        loading, 
        error,
        login,
        register,
        logout,
        isAuthenticated: !!currentUser && !requiresTwoFactor,
        requiresTwoFactor,
        validateTwoFactor,
        setupTwoFactor,
        verifyTwoFactorSetup,
        disableTwoFactor
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);