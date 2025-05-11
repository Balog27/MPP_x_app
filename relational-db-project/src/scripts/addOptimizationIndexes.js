const { sequelize } = require('../models');

async function addOptimizationIndexes() {
  try {
    console.log('Adding performance optimization indexes...');
    
    // Create composite indexes for better query performance
    await sequelize.query(`
      -- Posts table indexes
      CREATE INDEX IF NOT EXISTS idx_posts_status_created_at ON Posts (status, createdAt);
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON Posts (createdAt);
      CREATE INDEX IF NOT EXISTS idx_posts_status_viewcount_created ON Posts (status, viewCount, createdAt);
      CREATE INDEX IF NOT EXISTS idx_posts_status_userid ON Posts (status, userId);
      
      -- PostTags table indexes
      CREATE INDEX IF NOT EXISTS idx_posttags_tagid_postid ON PostTags (tagId, postId);
      
      -- Tags table indexes
      CREATE INDEX IF NOT EXISTS idx_tags_ispopular ON Tags (isPopular);
      
      -- Users table indexes
      CREATE INDEX IF NOT EXISTS idx_users_isadmin ON Users (isAdmin);
    `);

    console.log('✅ Performance optimization indexes added successfully.');
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
  }
}

// If this script is run directly (not required)
if (require.main === module) {
  addOptimizationIndexes()
    .then(() => {
      console.log('Index creation completed successfully.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error during index creation:', error);
      process.exit(1);
    });
}

module.exports = addOptimizationIndexes;