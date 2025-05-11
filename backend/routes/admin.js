const express = require('express');
const router = express.Router();
const { User, ActivityLog } = require('../models');
const { adminAuth } = require('../middleware/auth');
const monitoringService = require('../services/monitoringService');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

// Get all monitored users
router.get('/monitored-users', adminAuth, async (req, res) => {
  try {
    const monitoredUsers = await User.findAll({
      where: { isMonitored: true },
      attributes: ['id', 'username', 'email', 'role', 'lastLogin', 'isMonitored']
    });
    
    res.json(monitoredUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user activity logs
router.get('/user-activity/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const logs = await ActivityLog.findAll({
      where: { userId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get suspicious activity summary
router.get('/suspicious-activity', adminAuth, async (req, res) => {
  try {
    const timeWindow = new Date(Date.now() - monitoringService.timeWindow);
    
    const suspiciousActivity = await ActivityLog.findAll({
      attributes: [
        'userId',
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: timeWindow
        }
      },
      group: ['userId', 'action'],
      having: sequelize.literal(`COUNT(id) >= ${monitoringService.suspiciousThreshold}`),
      include: [{
        model: User,
        attributes: ['username', 'email']
      }]
    });

    res.json(suspiciousActivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle user monitoring status
router.post('/toggle-monitoring/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ isMonitored: !user.isMonitored });
    
    // Log the action
    await monitoringService.logActivity(
      req.user.id,
      'UPDATE',
      'User',
      userId,
      `Admin ${req.user.username} toggled monitoring status to ${!user.isMonitored}`,
      req
    );

    res.json({ message: 'Monitoring status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 