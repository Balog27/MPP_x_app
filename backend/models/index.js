const Sequelize = require('sequelize');
const sequelize = require('../config/database');

// Import model definitions
const User = require('./User')(sequelize);
const ActivityLog = require('./ActivityLog')(sequelize);

// Define associations
User.hasMany(ActivityLog, { foreignKey: 'userId' });
ActivityLog.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  ActivityLog,
};