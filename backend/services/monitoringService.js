const { ActivityLog, User } = require('../models');
const { Op } = require('sequelize');

class MonitoringService {
  constructor() {
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.suspiciousThreshold = 50; // Number of actions in time window
    this.timeWindow = 15 * 60 * 1000; // 15 minutes
  }

  async startMonitoring() {
    console.log('Starting monitoring service...');
    setInterval(() => this.checkForSuspiciousActivity(), this.checkInterval);
  }

  async checkForSuspiciousActivity() {
    try {
      const timeWindow = new Date(Date.now() - this.timeWindow);
      
      // Get all users with their activity counts in the time window
      const suspiciousUsers = await ActivityLog.findAll({
        attributes: [
          'userId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'actionCount']
        ],
        where: {
          createdAt: {
            [Op.gte]: timeWindow
          }
        },
        group: ['userId'],
        having: sequelize.literal(`COUNT(id) >= ${this.suspiciousThreshold}`)
      });

      // Mark suspicious users
      for (const user of suspiciousUsers) {
        await User.update(
          { isMonitored: true },
          { where: { id: user.userId } }
        );
        console.log(`User ${user.userId} marked as suspicious due to high activity`);
      }
    } catch (error) {
      console.error('Error in monitoring service:', error);
    }
  }

  async logActivity(userId, action, entityType, entityId, details, req) {
    try {
      await ActivityLog.create({
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent']
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
}

module.exports = new MonitoringService(); 