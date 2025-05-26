const API_URL = process.env.REACT_APP_API_URL || 'https://mppxapp-production.up.railway.app';

// Get auth token
const getToken = () => localStorage.getItem('token');

// Helper function for API requests
const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Add authentication token if available
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    method,
    headers,
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    // If unauthorized (e.g., token expired)
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
      throw new Error('Session expired. Please login again.');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// API endpoints
export const api = {
  // Auth endpoints
  auth: {
    login: (credentials) => apiRequest('/api/auth/login', 'POST', credentials),
    register: (userData) => apiRequest('/api/auth/register', 'POST', userData),
    getProfile: () => apiRequest('/api/auth/me'),
    logout: () => apiRequest('/api/auth/logout', 'POST')
  },
  
  // Posts endpoints
  posts: {
    getAll: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiRequest(`/posts?${queryString}`);
    },
    getById: (id) => apiRequest(`/posts/${id}`),
    create: (post) => apiRequest('/posts', 'POST', post),
    update: (id, post) => apiRequest(`/posts/${id}`, 'PUT', post),
    delete: (id) => apiRequest(`/posts/${id}`, 'DELETE'),
  }
};

export default api;