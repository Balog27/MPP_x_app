const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      // Keep index for foreign key
    },
    action: {
      type: DataTypes.ENUM('CREATE', 'READ', 'UPDATE', 'DELETE'),
      allowNull: false,
      // Remove unnecessary index
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      // Remove unnecessary index
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // Remove unnecessary index
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      // Remove unnecessary index
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      // Remove unnecessary index
    },    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
      // Remove unnecessary index
    }
  }, {
    // Explicitly define only necessary indexes
    indexes: [
      // Only keep index on userId for foreign key relationship
      {
        fields: ['userId']
      }
    ]
  });

  return ActivityLog;
}; 