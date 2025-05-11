const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '../routes/analyticsRoutes.js');
const controllerPath = path.join(__dirname, '../controllers/analyticsController.js');

console.log('Checking if required files exist:');

// Check if routes file exists
if (fs.existsSync(routesPath)) {
  console.log('✅ analyticsRoutes.js exists');
  console.log('Content:');
  console.log(fs.readFileSync(routesPath, 'utf8'));
} else {
  console.log('❌ analyticsRoutes.js does not exist');
  console.log('Creating file...');
  
  const routesContent = `const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Routes for content statistics
router.get('/content-stats', analyticsController.getContentStats);
router.get('/content-stats-optimized', analyticsController.getContentStatsOptimized);

module.exports = router;`;
  
  fs.writeFileSync(routesPath, routesContent);
  console.log('✅ analyticsRoutes.js created');
}

// Check if controller file exists
if (fs.existsSync(controllerPath)) {
  console.log('\n✅ analyticsController.js exists');
  console.log('Content length:', fs.readFileSync(controllerPath, 'utf8').length, 'bytes');
} else {
  console.log('\n❌ analyticsController.js does not exist');
  console.log('Creating file...');
  
  const controllerContent = `const { Post, User, Tag, sequelize } = require('../models');
const { Op } = require('sequelize');

// Regular content statistics endpoint (for comparison)
exports.getContentStats = async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Get parameters
    const { period = 30, limit = 10 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    // Get total post count
    const totalPosts = await Post.count({
      where: {
        createdAt: { [Op.gte]: startDate }
      }
    });
    
    // Get posts by status
    const postsByStatus = await Post.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      group: ['status']
    });
    
    // Get top users by post count
    const topUsersByPosts = await User.findAll({
      attributes: [
        'id', 
        'username', 
        'firstName', 
        'lastName',
        [sequelize.fn('COUNT', sequelize.col('Posts.id')), 'postCount']
      ],
      include: [{
        model: Post,
        attributes: [],
        where: {
          createdAt: { [Op.gte]: startDate }
        }
      }],
      group: ['User.id'],
      order: [[sequelize.literal('postCount'), 'DESC']],
      limit: parseInt(limit)
    });
    
    // Get top tags by usage
    const topTags = await Tag.findAll({
      attributes: [
        'id',
        'name',
        'color',
        [sequelize.fn('COUNT', sequelize.col('posts.id')), 'postCount']
      ],
      include: [{
        model: Post,
        as: 'posts',
        attributes: [],
        through: { attributes: [] },
        where: {
          createdAt: { [Op.gte]: startDate }
        }
      }],
      group: ['Tag.id'],
      order: [[sequelize.literal('postCount'), 'DESC']],
      limit: parseInt(limit)
    });
    
    // Get most viewed posts
    const topViewedPosts = await Post.findAll({
      attributes: ['id', 'title', 'viewCount', 'createdAt', 'userId'],
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['username', 'firstName', 'lastName']
      }],
      order: [['viewCount', 'DESC']],
      limit: parseInt(limit)
    });
    
    // Calculate execution time
    const executionTime = Date.now() - startTime;
    
    return res.status(200).json({
      success: true,
      executionTimeMs: executionTime,
      data: {
        totalPosts,
        postsByStatus,
        topUsersByPosts,
        topTags,
        topViewedPosts
      }
    });
  } catch (error) {
    console.error('Error in getContentStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch content statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Optimized content statistics endpoint using raw SQL
exports.getContentStatsOptimized = async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Get parameters
    const { period = 30, limit = 10 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    // Format date for SQL query
    const formattedStartDate = startDate.toISOString().slice(0, 19).replace('T', ' ');
    
    // Get total post count
    const [totalPostsResult] = await sequelize.query(\`
      SELECT COUNT(*) as totalPosts 
      FROM Posts 
      WHERE createdAt >= '\${formattedStartDate}'
    \`);
    
    // Get posts by status
    const [postsByStatus] = await sequelize.query(\`
      SELECT status, COUNT(*) as count 
      FROM Posts 
      WHERE createdAt >= '\${formattedStartDate}' 
      GROUP BY status
    \`);
    
    // Get top users by post count
    const [topUsersByPosts] = await sequelize.query(\`
      SELECT 
        u.id,
        u.username,
        u.firstName,
        u.lastName,
        COUNT(p.id) as postCount
      FROM 
        Users u
        JOIN Posts p ON u.id = p.userId
      WHERE 
        p.createdAt >= '\${formattedStartDate}'
      GROUP BY 
        u.id
      ORDER BY 
        postCount DESC
      LIMIT \${parseInt(limit)}
    \`);
    
    // Get top tags by usage
    const [topTags] = await sequelize.query(\`
      SELECT 
        t.id,
        t.name,
        t.color,
        COUNT(pt.postId) as postCount
      FROM 
        Tags t
        JOIN PostTags pt ON t.id = pt.tagId
        JOIN Posts p ON pt.postId = p.id
      WHERE 
        p.createdAt >= '\${formattedStartDate}'
      GROUP BY 
        t.id
      ORDER BY 
        postCount DESC
      LIMIT \${parseInt(limit)}
    \`);
    
    // Get most viewed posts
    const [topViewedPosts] = await sequelize.query(\`
      SELECT 
        p.id,
        p.title,
        p.viewCount,
        p.createdAt,
        p.userId,
        u.username,
        u.firstName,
        u.lastName
      FROM 
        Posts p
        JOIN Users u ON p.userId = u.id
      WHERE 
        p.createdAt >= '\${formattedStartDate}'
      ORDER BY 
        p.viewCount DESC
      LIMIT \${parseInt(limit)}
    \`);
    
    // Format the top viewed posts to match the regular endpoint's structure
    const formattedTopViewedPosts = topViewedPosts.map(post => ({
      id: post.id,
      title: post.title,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      userId: post.userId,
      author: {
        username: post.username,
        firstName: post.firstName,
        lastName: post.lastName
      }
    }));
    
    // Calculate execution time
    const executionTime = Date.now() - startTime;
    
    return res.status(200).json({
      success: true,
      executionTimeMs: executionTime,
      data: {
        totalPosts: totalPostsResult[0]?.totalPosts || 0,
        postsByStatus,
        topUsersByPosts,
        topTags,
        topViewedPosts: formattedTopViewedPosts
      }
    });
  } catch (error) {
    console.error('Error in getContentStatsOptimized:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch optimized content statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};`;
  
  fs.writeFileSync(controllerPath, controllerContent);
  console.log('✅ analyticsController.js created');
}

console.log('\nNow you need to restart your server for the changes to take effect.');