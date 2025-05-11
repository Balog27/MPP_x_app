const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [2, 50]
      }
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i  // Validates hex color format
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'Tags', // Explicitly set table name
    timestamps: true,
    indexes: [
      { fields: ['name'] }
    ]
  });

  // Define associations in the model
  Tag.associate = (models) => {
    // A Tag can belong to many Posts
    Tag.belongsToMany(models.Post, {
      through: 'PostTags', // Use this exact name
      foreignKey: 'tagId',
      otherKey: 'postId',
      as: 'posts'
    });
  };

  return Tag;
};