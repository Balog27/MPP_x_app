const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { sequelize } = require('../models');

// Routes for content statistics
router.get('/content-stats', analyticsController.getContentStats);
router.get('/content-stats-optimized', analyticsController.getContentStatsOptimized);

// Get user statistics with optimized query
router.get('/user-statistics', async (req, res) => {
  try {
    const result = await sequelize.query(`
      SELECT * FROM post_statistics
      ORDER BY total_posts DESC
      LIMIT 100;
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics'
    });
  }
});

// Get tag popularity statistics
router.get('/tag-statistics', async (req, res) => {
  try {
    const result = await sequelize.query(`
      SELECT 
        t.name,
        COUNT(pt."postId") as usage_count,
        COUNT(DISTINCT p."userId") as unique_authors
      FROM "Tags" t
      JOIN "PostTags" pt ON t.id = pt."tagId"
      JOIN "Posts" p ON pt."postId" = p.id
      GROUP BY t.id, t.name
      ORDER BY usage_count DESC
      LIMIT 50;
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching tag statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tag statistics'
    });
  }
});

// Get post activity over time
router.get('/post-activity', async (req, res) => {
  try {
    const result = await sequelize.query(`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*) as post_count,
        COUNT(DISTINCT "userId") as active_users
      FROM "Posts"
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date DESC
      LIMIT 30;
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching post activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching post activity'
    });
  }
});

module.exports = router;