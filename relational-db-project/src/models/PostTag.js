const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PostTag = sequelize.define('PostTag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Posts',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Tags',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'PostTags',
    timestamps: true,
    indexes: [
      { fields: ['postId'] },
      { fields: ['tagId'] },
      { unique: true, fields: ['postId', 'tagId'] }
    ]
  });
  
  return PostTag;
};