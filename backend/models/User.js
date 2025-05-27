const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      // Remove index for role
    },
    isMonitored: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      // Remove index for isMonitored
    },
    lastLogin: {
      type: DataTypes.DATE,
      // Remove index for lastLogin
    },
    // Add 2FA fields
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true,
      // Remove index for twoFactorSecret
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      // Remove index for twoFactorEnabled
    },
    // Optional temporary token to hold logged in state while waiting for 2FA
    tempToken: {
      type: DataTypes.STRING,
      allowNull: true,
      // Remove index for tempToken
    }  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    },
    // Explicitly define only necessary indexes
    indexes: [
      {
        unique: true,
        fields: ['username']
      },
      {
        unique: true,
        fields: ['email']
      }
    ]
  });

  User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password);
  };

  return User;
};