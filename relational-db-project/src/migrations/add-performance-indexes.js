const { sequelize } = require('../models');

async function addPerformanceIndexes() {
  console.log('Adding performance indexes to database...');
  
  try {
    // Drop indexes if they exist and recreate them
    // First, check if tables exist
    const [tables] = await sequelize.query(`SHOW TABLES`);
    const tableNames = tables.map(table => Object.values(table)[0].toLowerCase());
    
    if (tableNames.includes('posttags')) {
      console.log('Adding PostTags indexes...');
      try {
        // Try to drop the index first (ignore errors if it doesn't exist)
        await sequelize.query(`ALTER TABLE PostTags DROP INDEX idx_post_tags_lookup`).catch(() => {});
        
        // Create the index
        await sequelize.query(`
          ALTER TABLE PostTags ADD INDEX idx_post_tags_lookup (tagId, postId, createdAt)
        `);
        console.log('- Successfully added index to PostTags');
      } catch (error) {
        console.error('- Failed to add index to PostTags:', error.message);
      }
    }
    
    if (tableNames.includes('posts')) {
      console.log('Adding Posts indexes...');
      try {
        // Date and status index
        await sequelize.query(`ALTER TABLE Posts DROP INDEX idx_posts_date_lookup`).catch(() => {});
        await sequelize.query(`
          ALTER TABLE Posts ADD INDEX idx_posts_date_lookup (createdAt, status)
        `);
        console.log('- Successfully added date index to Posts');
        
        // View count index
        await sequelize.query(`ALTER TABLE Posts DROP INDEX idx_posts_view_count`).catch(() => {});
        await sequelize.query(`
          ALTER TABLE Posts ADD INDEX idx_posts_view_count (viewCount)
        `);
        console.log('- Successfully added view count index to Posts');
      } catch (error) {
        console.error('- Failed to add index to Posts:', error.message);
      }
    }
    
    console.log('Performance indexes operation completed!');
  } catch (error) {
    console.error('Error in index operations:', error);
    throw error;
  }
}

// Run directly
if (require.main === module) {
  addPerformanceIndexes()
    .then(() => {
      console.log('Index creation completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to create indexes:', error);
      process.exit(1);
    });
}

module.exports = addPerformanceIndexes;