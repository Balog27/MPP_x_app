const { Post, User, Tag, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get all posts with filtering, sorting, and pagination
exports.getAllPosts = async (req, res) => {
  try {
    const { 
      sort = 'createdAt', 
      order = 'DESC',
      status,
      userId,
      tagId,
      search,
      page = 1, 
      limit = 10,
      includeTags
    } = req.query;
    
    // Build query options
    const options = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [[sort, order]],
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }],
      where: {}
    };
    
    // Add filtering by status
    if (status) {
      options.where.status = status;
    }
    
    // Filter by user ID
    if (userId) {
      options.where.userId = userId;
    }
    
    // Include tags if requested
    if (includeTags === 'true') {
      options.include.push({
        model: Tag,
        as: 'tags',
        attributes: ['id', 'name', 'color'],
        through: { attributes: [] } // Don't include junction table details
      });
    }
    
    // Filter by tag ID
    if (tagId) {
      options.include.push({
        model: Tag,
        as: 'tags',
        attributes: [],
        through: { attributes: [] },
        where: { id: tagId }
      });
    }
    
    // Search in title or content
    if (search) {
      options.where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const posts = await Post.findAndCountAll(options);
    
    return res.status(200).json({
      success: true,
      count: posts.count,
      data: posts.rows,
      totalPages: Math.ceil(posts.count / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error in getAllPosts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get a single post by ID
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeTags } = req.query;
    
    const options = {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    };
    
    // Include tags if requested
    if (includeTags === 'true') {
      options.include.push({
        model: Tag,
        as: 'tags',
        attributes: ['id', 'name', 'color'],
        through: { attributes: [] } // Don't include junction table details
      });
    }
    
    const post = await Post.findByPk(id, options);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: `Post with ID ${id} not found`
      });
    }
    
    // Increment view count
    await post.increment('viewCount');
    
    return res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error in getPostById:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { title, content, imageUrl, isVideo, status, userId, tags } = req.body;
    
    // Verify that the user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Create post
    const post = await Post.create({
      title,
      content,
      imageUrl: imageUrl || null,
      isVideo: isVideo || false,
      status: status || 'published',
      userId
    });
    
    // Associate tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      // Find existing tags
      const existingTags = await Tag.findAll({
        where: {
          id: tags
        }
      });
      
      if (existingTags.length > 0) {
        await post.addTags(existingTags);
      }
    }
    
    // Return with author and tag details
    const postWithDetails = await Post.findByPk(post.id, {
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
          through: { attributes: [] } // Don't include junction table details
        }
      ]
    });
    
    return res.status(201).json({
      success: true,
      data: postWithDetails
    });
  } catch (error) {
    console.error('Error in createPost:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update a post
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, imageUrl, isVideo, status, tags } = req.body;
    
    const post = await Post.findByPk(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: `Post with ID ${id} not found`
      });
    }
    
    // Update post attributes
    const updateData = {};
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isVideo !== undefined) updateData.isVideo = isVideo;
    if (status !== undefined) updateData.status = status;
    
    await post.update(updateData);
    
    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      // Find existing tags
      const existingTags = await Tag.findAll({
        where: {
          id: tags
        }
      });
      
      // Set tags (this will remove any existing relationships and add the new ones)
      await post.setTags(existingTags);
    }
    
    // Return updated post with details
    const updatedPost = await Post.findByPk(id, {
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
          through: { attributes: [] } // Don't include junction table details
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: updatedPost
    });
  } catch (error) {
    console.error('Error in updatePost:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findByPk(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: `Post with ID ${id} not found`
      });
    }
    
    // Delete the post (associated PostTags entries will be deleted through CASCADE)
    await post.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error in deletePost:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get posts by tag
exports.getPostsByTag = async (req, res) => {
  try {
    const { tagId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Check if tag exists
    const tag = await Tag.findByPk(tagId);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: `Tag with ID ${tagId} not found`
      });
    }
    
    // Get posts with this tag
    const posts = await Post.findAndCountAll({
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
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
          where: { id: tagId }
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      count: posts.count,
      data: posts.rows,
      totalPages: Math.ceil(posts.count / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error in getPostsByTag:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch posts by tag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

