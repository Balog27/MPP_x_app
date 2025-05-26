const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { JWT_SECRET, auth } = require('../middleware/auth');
const monitoringService = require('../services/monitoringService');
const { Op } = require('sequelize');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role: 'user',  // Default role
      lastLogin: new Date()
    });

    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: '7d' // Token expires in 7 days
    });
    
    // Log the registration
    await monitoringService.logActivity(
      user.id,
      'CREATE',
      'User',
      user.id,
      'User registration',
      req
    );

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: '7d' // Token expires in 7 days
    });
    
    // Log the login
    await monitoringService.logActivity(
      user.id,
      'READ',
      'User',
      user.id,
      'User login',
      req
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      lastLogin: req.user.lastLogin
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout - optional, since JWT is stateless
router.post('/logout', auth, async (req, res) => {
  try {
    // Log the logout activity
    await monitoringService.logActivity(
      req.user.id,
      'READ',
      'User',
      req.user.id,
      'User logout',
      req
    );
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;