const { sequelize } = require('../models');

async function tryCreateIndex(query) {
  try {
    await sequelize.query(query);
    console.log(`Index created: ${query}`);
  } catch (error) {
    if (error.parent && error.parent.errno === 1061) {
      console.log('Index already exists, skipping...');
    } else {
      console.error('Error creating index:', error);
    }
  }
}

async function optimizeDatabase() {
  try {
    console.log('Starting database optimization...');

    // Add indexes for frequently queried columns
    await tryCreateIndex('CREATE INDEX idx_users_email ON `Users` (email);');
    await tryCreateIndex('CREATE INDEX idx_users_username ON `Users` (username);');
    await tryCreateIndex('CREATE INDEX idx_posts_user_id ON `Posts` (userId);');
    await tryCreateIndex('CREATE INDEX idx_posts_created_at ON `Posts` (createdAt);');
    await tryCreateIndex('CREATE INDEX idx_tags_name ON `Tags` (name);');
    await tryCreateIndex('CREATE INDEX idx_post_tags_post_id ON `PostTags` (postId);');
    await tryCreateIndex('CREATE INDEX idx_post_tags_tag_id ON `PostTags` (tagId);');

    // Create the summary table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS post_statistics (
        userId INT,
        username VARCHAR(255),
        total_posts INT,
        unique_tags INT,
        avg_content_length FLOAT,
        last_post_date DATETIME,
        PRIMARY KEY (userId)
      );
    `);

    // Populate the summary table (replace existing data)
    await sequelize.query(`
      REPLACE INTO post_statistics (userId, username, total_posts, unique_tags, avg_content_length, last_post_date)
      SELECT 
        p.userId,
        u.username,
        COUNT(p.id) as total_posts,
        COUNT(DISTINCT pt.tagId) as unique_tags,
        AVG(CHAR_LENGTH(p.content)) as avg_content_length,
        MAX(p.createdAt) as last_post_date
      FROM Posts p
      JOIN Users u ON p.userId = u.id
      LEFT JOIN PostTags pt ON p.id = pt.postId
      GROUP BY p.userId, u.username;
    `);

    console.log('Database optimization completed successfully!');
  } finally {
    await sequelize.close();
  }
}

// Run the optimization
optimizeDatabase();