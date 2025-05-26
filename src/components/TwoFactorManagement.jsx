import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './App.css';
import Auth from './components/Auth';
import TwoFactorManagement from './components/TwoFactorManagement';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'https://mppxapp-production.up.railway.app';

  useEffect(() => {
    Modal.setAppElement('#root');
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, [API_URL]);

  const handleAuthSuccess = (data) => {
    setCurrentUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      {currentUser ? (
        <>
          {/* Main app UI */}
          <header className="App-header">
            <h1>Welcome, {currentUser.username}!</h1>
            <div className="user-actions">
              <button 
                onClick={() => setShowTwoFactorModal(true)}
                className="security-button"
              >
                Security Settings
              </button>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          </header>
          
          {/* Main content */}
          <main className="App-main">
            {/* Your app content here */}
          </main>
          
          {/* 2FA Management Modal */}
          <Modal
            isOpen={showTwoFactorModal}
            onRequestClose={() => setShowTwoFactorModal(false)}
            contentLabel="Two-Factor Authentication"
            className="modal-content"
            overlayClassName="modal-overlay"
          >
            <button 
              onClick={() => setShowTwoFactorModal(false)}
              className="modal-close"
            >
              &times;
            </button>
            <TwoFactorManagement />
          </Modal>
        </>
      ) : (
        <Auth onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

export default App;