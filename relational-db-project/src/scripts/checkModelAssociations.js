const fs = require('fs');
const path = require('path');
const { User, Post, Tag } = require('../models');

function checkAndFixModel(modelName, modelPath, associationCheck, associationCode) {
  console.log(`Checking ${modelName} model...`);
  
  try {
    // Check if associations exist
    const hasAssociations = associationCheck();
    
    if (hasAssociations) {
      console.log(`✅ ${modelName} model has required associations`);
      return true;
    }
    
    // If associations don't exist, try to fix the model file
    console.log(`❌ ${modelName} model is missing required associations`);
    
    if (!fs.existsSync(modelPath)) {
      console.log(`❌ ${modelName} model file not found at ${modelPath}`);
      return false;
    }
    
    // Read the model file
    let modelContent = fs.readFileSync(modelPath, 'utf8');
    
    // Check if the model file already has an associate function
    if (modelContent.includes('associate')) {
      console.log(`⚠️ ${modelName} model already has an associate function, but it's not working correctly`);
      console.log('Please modify it manually to include:');
      console.log(associationCode);
      return false;
    }
    
    // Add associate function before the last closing brace
    const lastBraceIndex = modelContent.lastIndexOf('}');
    
    if (lastBraceIndex === -1) {
      console.log(`❌ Could not find closing brace in ${modelName} model file`);
      return false;
    }
    
    const updatedContent = 
      modelContent.slice(0, lastBraceIndex) + 
      '\n\n  ' + associationCode + '\n' +
      modelContent.slice(lastBraceIndex);
    
    // Write the updated content back to the file
    fs.writeFileSync(modelPath, updatedContent);
    console.log(`✅ Added associations to ${modelName} model`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error checking/fixing ${modelName} model:`, error);
    return false;
  }
}

// Perform the check and fix for each model
const results = {
  user: checkAndFixModel(
    'User',
    path.join(__dirname, '../models/User.js'),
    () => User.associations && User.associations.posts,
    `// Define associations
  User.associate = function(models) {
    User.hasMany(models.Post, { foreignKey: 'userId', as: 'posts' });
  };`
  ),
  
  post: checkAndFixModel(
    'Post',
    path.join(__dirname, '../models/Post.js'),
    () => Post.associations && Post.associations.author && Post.associations.tags,
    `// Define associations
  Post.associate = function(models) {
    Post.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
    Post.belongsToMany(models.Tag, { through: 'PostTags', as: 'tags' });
  };`
  ),
  
  tag: checkAndFixModel(
    'Tag',
    path.join(__dirname, '../models/Tag.js'),
    () => Tag.associations && Tag.associations.posts,
    `// Define associations
  Tag.associate = function(models) {
    Tag.belongsToMany(models.Post, { through: 'PostTags', as: 'posts' });
  };`
  )
};

console.log('\nModel association check summary:');
for (const [model, result] of Object.entries(results)) {
  console.log(`${model}: ${result ? '✅ OK' : '❌ Needs attention'}`);
}

if (Object.values(results).some(r => !r)) {
  console.log('\n⚠️ Some models need attention. Please fix them manually or restart this script.');
} else {
  console.log('\n✅ All models have been checked and fixed.');
}

console.log('\nRemember to restart your server after making these changes!');