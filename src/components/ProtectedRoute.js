import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  
  // Show loading indicator while checking auth status
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  // If no user is logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // For admin-only routes
  if (adminOnly && currentUser.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // User is authenticated (and has required role if adminOnly is true)
  return children;
};

export default ProtectedRoute;