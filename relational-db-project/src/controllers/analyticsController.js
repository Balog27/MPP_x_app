const { User, Post, Tag, sequelize } = require('../models');
const { Op } = require('sequelize');

// In the Post model:
Post.associate = (models) => {
  Post.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'author'
  });

  Post.belongsToMany(models.Tag, {
    through: 'PostTags',
    foreignKey: 'postId',
    otherKey: 'tagId',
    as: 'tags'
  });
};

// In the User model:
User.associate = (models) => {
  User.hasMany(models.Post, {
    foreignKey: 'userId',
    as: 'posts'
  });
};

// In the Tag model:
Tag.associate = (models) => {
  Tag.belongsToMany(models.Post, {
    through: 'PostTags',
    foreignKey: 'tagId',
    otherKey: 'postId',
    as: 'posts'
  });
};

// Complex query to get top content statistics with multiple joins and groupings
exports.getContentStatistics = async (req, res) => {
  const startTime = performance.now();
  
  try {
    const { period = '30', limit = 10, tagFilter, userFilter } = req.query;
    
    // Calculate date range based on period (days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    // Build filtering conditions
    const conditions = {
      createdAt: {
        [Op.between]: [startDate, endDate]
      },
      status: 'published'
    };
    
    // Build tag filtering
    let tagJoinCondition = {};
    if (tagFilter) {
      tagJoinCondition = {
        id: {
          [Op.in]: tagFilter.split(',').map(id => parseInt(id))
        }
      };
    }
    
    // Build user filtering
    if (userFilter) {
      conditions.userId = {
        [Op.in]: userFilter.split(',').map(id => parseInt(id))
      };
    }
    
    // Get top posts by view count with their tags and authors
    const topPosts = await Post.findAll({
      attributes: [
        'id',
        'title',
        'viewCount',
        [sequelize.fn('DATE_FORMAT', sequelize.col('Post.createdAt'), '%Y-%m-%d'), 'date'],
        [sequelize.literal('(SELECT COUNT(*) FROM PostTags WHERE PostTags.postId = Post.id)'), 'tagCount']
      ],
      where: conditions,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'color'],
          through: { attributes: [] },
          where: Object.keys(tagJoinCondition).length > 0 ? tagJoinCondition : undefined,
          required: Object.keys(tagJoinCondition).length > 0
        }
      ],
      order: [['viewCount', 'DESC']],
      limit: parseInt(limit)
    });
    
    // Get tag distribution across all posts in the period
    const tagDistribution = await sequelize.query(`
      SELECT 
        t.id, 
        t.name, 
        t.color,
        COUNT(pt.postId) as postCount, 
        SUM(p.viewCount) as totalViews,
        AVG(p.viewCount) as avgViews
      FROM Tags t
      JOIN PostTags pt ON t.id = pt.tagId
      JOIN Posts p ON pt.postId = p.id
      WHERE p.createdAt BETWEEN :startDate AND :endDate
        AND p.status = 'published'
        ${userFilter ? 'AND p.userId IN (:userIds)' : ''}
        ${tagFilter ? 'AND t.id IN (:tagIds)' : ''}
      GROUP BY t.id
      ORDER BY postCount DESC, totalViews DESC
      LIMIT :limit
    `, {
      replacements: {
        startDate,
        endDate,
        limit: parseInt(limit),
        userIds: userFilter ? userFilter.split(',').map(id => parseInt(id)) : undefined,
        tagIds: tagFilter ? tagFilter.split(',').map(id => parseInt(id)) : undefined
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get user activity statistics
    const userActivity = await sequelize.query(`
      SELECT 
        u.id,
        u.username,
        u.firstName,
        u.lastName,
        COUNT(p.id) as postCount,
        SUM(p.viewCount) as totalViews,
        AVG(p.viewCount) as avgViewsPerPost,
        (
          SELECT COUNT(DISTINCT pt.tagId) 
          FROM PostTags pt 
          JOIN Posts p2 ON pt.postId = p2.id 
          WHERE p2.userId = u.id
        ) as uniqueTagsUsed
      FROM Users u
      JOIN Posts p ON u.id = p.userId
      LEFT JOIN PostTags pt ON p.id = pt.postId
      WHERE p.createdAt BETWEEN :startDate AND :endDate
        AND p.status = 'published'
        ${userFilter ? 'AND u.id IN (:userIds)' : ''}
        ${tagFilter ? 'AND EXISTS (SELECT 1 FROM PostTags pt2 JOIN Tags t ON pt2.tagId = t.id WHERE pt2.postId = p.id AND t.id IN (:tagIds))' : ''}
      GROUP BY u.id
      ORDER BY postCount DESC, totalViews DESC
      LIMIT :limit
    `, {
      replacements: {
        startDate,
        endDate,
        limit: parseInt(limit),
        userIds: userFilter ? userFilter.split(',').map(id => parseInt(id)) : undefined,
        tagIds: tagFilter ? tagFilter.split(',').map(id => parseInt(id)) : undefined
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Calculate daily trends for the period
    const dailyTrends = await sequelize.query(`
      SELECT 
        DATE_FORMAT(p.createdAt, '%Y-%m-%d') as date,
        COUNT(DISTINCT p.id) as postCount,
        SUM(p.viewCount) as totalViews,
        COUNT(DISTINCT p.userId) as uniqueAuthors,
        COUNT(DISTINCT pt.tagId) as uniqueTags
      FROM Posts p
      LEFT JOIN PostTags pt ON p.id = pt.postId
      WHERE p.createdAt BETWEEN :startDate AND :endDate
        AND p.status = 'published'
        ${userFilter ? 'AND p.userId IN (:userIds)' : ''}
        ${tagFilter ? 'AND EXISTS (SELECT 1 FROM PostTags pt2 JOIN Tags t ON pt2.tagId = t.id WHERE pt2.postId = p.id AND t.id IN (:tagIds))' : ''}
      GROUP BY DATE_FORMAT(p.createdAt, '%Y-%m-%d')
      ORDER BY date DESC
    `, {
      replacements: {
        startDate,
        endDate,
        userIds: userFilter ? userFilter.split(',').map(id => parseInt(id)) : undefined,
        tagIds: tagFilter ? tagFilter.split(',').map(id => parseInt(id)) : undefined
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Calculate execution time
    const endTime = performance.now();
    const executionTime = (endTime - startTime).toFixed(2);
    
    return res.status(200).json({
      success: true,
      executionTimeMs: parseFloat(executionTime),
      period: parseInt(period),
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      data: {
        topPosts,
        tagDistribution,
        userActivity,
        dailyTrends
      }
    });
  } catch (error) {
    console.error('Error in getContentStatistics:', error);
    
    const endTime = performance.now();
    const executionTime = (endTime - startTime).toFixed(2);
    
    return res.status(500).json({
      success: false,
      executionTimeMs: parseFloat(executionTime),
      message: 'Failed to fetch content statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Optimized version of the content statistics query
exports.getOptimizedContentStatistics = async (req, res) => {
  const startTime = performance.now();
  
  try {
    const { period = '30', limit = 10, tagFilter, userFilter } = req.query;
    
    // Calculate date range based on period (days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    // Parse filters once
    const parsedTagFilter = tagFilter ? tagFilter.split(',').map(id => parseInt(id)) : [];
    const parsedUserFilter = userFilter ? userFilter.split(',').map(id => parseInt(id)) : [];
    const parsedLimit = parseInt(limit);
    
    // Use Promise.all to run queries in parallel
    const [topPosts, tagDistribution, userActivity, dailyTrends] = await Promise.all([
      // Query 1: Top Posts - Using cached queries with FORCE INDEX and optimized joins
      sequelize.query(`
        SELECT 
          p.id, 
          p.title, 
          p.viewCount,
          DATE_FORMAT(p.createdAt, '%Y-%m-%d') as date,
          u.id as authorId, 
          u.username as authorUsername, 
          u.firstName as authorFirstName, 
          u.lastName as authorLastName,
          (SELECT COUNT(*) FROM PostTags WHERE PostTags.postId = p.id) as tagCount,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', t.id, 
              'name', t.name, 
              'color', t.color
            )
          ) as tags
        FROM 
          Posts p FORCE INDEX (idx_posts_status_viewcount_created)
          JOIN Users u ON p.userId = u.id
          LEFT JOIN PostTags pt ON p.id = pt.postId
          LEFT JOIN Tags t ON pt.tagId = t.id
        WHERE 
          p.createdAt BETWEEN ? AND ?
          AND p.status = 'published'
          ${parsedUserFilter.length ? 'AND p.userId IN (?)' : ''}
          ${parsedTagFilter.length ? 'AND EXISTS (SELECT 1 FROM PostTags pt2 WHERE pt2.postId = p.id AND pt2.tagId IN (?))' : ''}
        GROUP BY 
          p.id, p.title, p.viewCount, p.createdAt, u.id, u.username, u.firstName, u.lastName
        ORDER BY 
          p.viewCount DESC
        LIMIT ?
      `, {
        replacements: [
          startDate, 
          endDate,
          ...(parsedUserFilter.length ? [parsedUserFilter] : []),
          ...(parsedTagFilter.length ? [parsedTagFilter] : []),
          parsedLimit
        ],
        type: sequelize.QueryTypes.SELECT
      }),
      
      // Query 2: Tag Distribution - Using materialized view approach
      sequelize.query(`
        SELECT 
          t.id, 
          t.name, 
          t.color,
          COUNT(pt.postId) as postCount, 
          SUM(p.viewCount) as totalViews,
          ROUND(AVG(p.viewCount), 2) as avgViews
        FROM 
          Tags t
          JOIN PostTags pt ON t.id = pt.tagId
          JOIN Posts p ON pt.postId = p.id AND p.status = 'published'
        WHERE 
          p.createdAt BETWEEN ? AND ?
          ${parsedUserFilter.length ? 'AND p.userId IN (?)' : ''}
          ${parsedTagFilter.length ? 'AND t.id IN (?)' : ''}
        GROUP BY 
          t.id, t.name, t.color
        ORDER BY 
          postCount DESC, totalViews DESC
        LIMIT ?
      `, {
        replacements: [
          startDate, 
          endDate,
          ...(parsedUserFilter.length ? [parsedUserFilter] : []),
          ...(parsedTagFilter.length ? [parsedTagFilter] : []),
          parsedLimit
        ],
        type: sequelize.QueryTypes.SELECT
      }),
      
      // Query 3: User Activity - Using optimized query with subqueries
      sequelize.query(`
        SELECT 
          u.id,
          u.username,
          u.firstName,
          u.lastName,
          user_stats.postCount,
          user_stats.totalViews,
          ROUND(user_stats.totalViews / user_stats.postCount, 2) as avgViewsPerPost,
          user_stats.uniqueTagsUsed
        FROM 
          Users u,
          (
            SELECT 
              p.userId,
              COUNT(DISTINCT p.id) as postCount,
              SUM(p.viewCount) as totalViews,
              COUNT(DISTINCT pt.tagId) as uniqueTagsUsed
            FROM 
              Posts p
              LEFT JOIN PostTags pt ON p.id = pt.postId
            WHERE 
              p.createdAt BETWEEN ? AND ?
              AND p.status = 'published'
              ${parsedUserFilter.length ? 'AND p.userId IN (?)' : ''}
              ${parsedTagFilter.length ? 'AND EXISTS (SELECT 1 FROM PostTags pt2 WHERE pt2.postId = p.id AND pt2.tagId IN (?))' : ''}
            GROUP BY 
              p.userId
          ) as user_stats
        WHERE 
          u.id = user_stats.userId
        ORDER BY 
          user_stats.postCount DESC, 
          user_stats.totalViews DESC
        LIMIT ?
      `, {
        replacements: [
          startDate, 
          endDate,
          ...(parsedUserFilter.length ? [parsedUserFilter] : []),
          ...(parsedTagFilter.length ? [parsedTagFilter] : []),
          parsedLimit
        ],
        type: sequelize.QueryTypes.SELECT
      }),
      
      // Query 4: Daily Trends - Using date partitioning approach with EXPLAIN
      sequelize.query(`
        SELECT 
          DATE_FORMAT(p.createdAt, '%Y-%m-%d') as date,
          COUNT(DISTINCT p.id) as postCount,
          SUM(p.viewCount) as totalViews,
          COUNT(DISTINCT p.userId) as uniqueAuthors,
          COUNT(DISTINCT pt.tagId) as uniqueTags
        FROM 
          Posts p USE INDEX (idx_posts_created_at)
          LEFT JOIN PostTags pt ON p.id = pt.postId
        WHERE 
          p.createdAt BETWEEN ? AND ?
          AND p.status = 'published'
          ${parsedUserFilter.length ? 'AND p.userId IN (?)' : ''}
          ${parsedTagFilter.length ? 'AND EXISTS (SELECT 1 FROM PostTags pt2 WHERE pt2.postId = p.id AND pt2.tagId IN (?))' : ''}
        GROUP BY 
          DATE_FORMAT(p.createdAt, '%Y-%m-%d')
        ORDER BY 
          date DESC
      `, {
        replacements: [
          startDate, 
          endDate,
          ...(parsedUserFilter.length ? [parsedUserFilter] : []),
          ...(parsedTagFilter.length ? [parsedTagFilter] : [])
        ],
        type: sequelize.QueryTypes.SELECT
      })
    ]);
    
    // Process the tags array for top posts
    const processedTopPosts = topPosts.map(post => {
      try {
        post.tags = JSON.parse(post.tags);
      } catch (e) {
        post.tags = [];
      }
      return post;
    });
    
    // Calculate execution time
    const endTime = performance.now();
    const executionTime = (endTime - startTime).toFixed(2);
    
    return res.status(200).json({
      success: true,
      executionTimeMs: parseFloat(executionTime),
      period: parseInt(period),
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      optimized: true,
      data: {
        topPosts: processedTopPosts,
        tagDistribution,
        userActivity,
        dailyTrends
      }
    });
  } catch (error) {
    console.error('Error in getOptimizedContentStatistics:', error);
    
    const endTime = performance.now();
    const executionTime = (endTime - startTime).toFixed(2);
    
    return res.status(500).json({
      success: false,
      executionTimeMs: parseFloat(executionTime),
      message: 'Failed to fetch optimized content statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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
        [sequelize.fn('COUNT', sequelize.col('posts.id')), 'postCount'] // lowercase 'posts'
      ],
      include: [{
        model: Post,
        as: 'posts', // Make sure this matches the alias defined in User.associate
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
        [sequelize.fn('COUNT', sequelize.col('posts.id')), 'postCount'] // lowercase 'posts'
      ],
      include: [{
        model: Post,
        as: 'posts', // Make sure this matches the alias defined in Tag.associate
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
    
    // Use raw SQL for better performance
    const [totalPostsResult] = await sequelize.query(`
      SELECT COUNT(*) as totalPosts 
      FROM Posts 
      WHERE createdAt >= '${formattedStartDate}'
    `);
    
    const [postsByStatus] = await sequelize.query(`
      SELECT status, COUNT(*) as count 
      FROM Posts 
      WHERE createdAt >= '${formattedStartDate}' 
      GROUP BY status
    `);
    
    const [topUsersByPosts] = await sequelize.query(`
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
        p.createdAt >= '${formattedStartDate}'
      GROUP BY 
        u.id
      ORDER BY 
        postCount DESC
      LIMIT ${parseInt(limit)}
    `);
    
    const [topTags] = await sequelize.query(`
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
        p.createdAt >= '${formattedStartDate}'
      GROUP BY 
        t.id
      ORDER BY 
        postCount DESC
      LIMIT ${parseInt(limit)}
    `);
    
    const [topViewedPosts] = await sequelize.query(`
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
        p.createdAt >= '${formattedStartDate}'
      ORDER BY 
        p.viewCount DESC
      LIMIT ${parseInt(limit)}
    `);
    
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
};