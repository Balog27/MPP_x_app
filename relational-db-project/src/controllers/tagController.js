const { Tag, Post, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get all tags with filtering, sorting, and pagination
exports.getAllTags = async (req, res) => {
  try {
    const { 
      sort = 'name', 
      order = 'ASC',
      search,
      isPopular,
      page = 1, 
      limit = 10,
      includePosts
    } = req.query;
    
    // Build where clause for filtering
    const whereClause = {};
    
    // Filter by popularity if provided
    if (isPopular !== undefined) {
      whereClause.isPopular = isPopular === 'true';
    }
    
    // Search in name or description
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Build query options
    const options = {
      where: whereClause,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [[sort, order.toUpperCase()]]
    };
    
    // Include posts if requested
    if (includePosts === 'true') {
      options.include = [{
        model: Post,
        as: 'posts',
        attributes: ['id', 'title', 'status', 'createdAt'],
        through: { attributes: [] }, // Don't include junction table details
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }]
      }];
    }
    
    const tags = await Tag.findAndCountAll(options);
    
    // Calculate pagination info
    const totalPages = Math.ceil(tags.count / parseInt(limit));
    
    return res.status(200).json({
      success: true,
      count: tags.count,
      totalPages,
      currentPage: parseInt(page),
      data: tags.rows
    });
  } catch (error) {
    console.error('Error in getAllTags:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get a single tag by ID
exports.getTagById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includePosts } = req.query;
    
    const options = {
      where: { id }
    };
    
    // Include posts if requested
    if (includePosts === 'true') {
      options.include = [{
        model: Post,
        as: 'posts',
        attributes: ['id', 'title', 'content', 'status', 'createdAt'],
        through: { attributes: [] }, // Don't include junction table details
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }]
      }];
    }
    
    const tag = await Tag.findOne(options);
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: `Tag with ID ${id} not found`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: tag
    });
  } catch (error) {
    console.error('Error in getTagById:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create a new tag
exports.createTag = async (req, res) => {
  try {
    const { name, color, description, isPopular } = req.body;
    
    // Check if tag already exists
    const existingTag = await Tag.findOne({
      where: {
        name
      }
    });
    
    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag name already exists'
      });
    }
    
    // Create tag
    const newTag = await Tag.create({
      name,
      color: color || null,
      description: description || null,
      isPopular: isPopular || false
    });
    
    return res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      data: newTag
    });
  } catch (error) {
    console.error('Error in createTag:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create tag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update a tag
exports.updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, description, isPopular } = req.body;
    
    // Check if tag exists
    const tag = await Tag.findByPk(id);
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: `Tag with ID ${id} not found`
      });
    }
    
    // If updating name, check for duplicates
    if (name && name !== tag.name) {
      const existingTag = await Tag.findOne({
        where: {
          name,
          id: { [Op.ne]: id } // Not this tag
        }
      });
      
      if (existingTag) {
        return res.status(400).json({
          success: false,
          message: 'Tag name already in use by another tag'
        });
      }
    }
    
    // Prepare update data
    const updateData = {};
    
    if (name) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;
    if (isPopular !== undefined) updateData.isPopular = isPopular;
    
    // Update tag
    await tag.update(updateData);
    
    return res.status(200).json({
      success: true,
      message: 'Tag updated successfully',
      data: tag
    });
  } catch (error) {
    console.error('Error in updateTag:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to update tag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a tag
exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if tag exists
    const tag = await Tag.findByPk(id);
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: `Tag with ID ${id} not found`
      });
    }
    
    // Delete the tag (associated PostTags entries will be deleted through CASCADE)
    await tag.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteTag:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete tag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add tag to post
exports.addTagToPost = async (req, res) => {
  try {
    const { postId, tagId } = req.body;
    
    // Check if post exists
    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: `Post with ID ${postId} not found`
      });
    }
    
    // Check if tag exists
    const tag = await Tag.findByPk(tagId);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: `Tag with ID ${tagId} not found`
      });
    }
    
    // Check if relationship already exists
    const existingRelation = await sequelize.models.PostTag.findOne({
      where: {
        postId,
        tagId
      }
    });
    
    if (existingRelation) {
      return res.status(400).json({
        success: false,
        message: 'This tag is already added to the post'
      });
    }
    
    // Add tag to post
    await post.addTag(tag);
    
    return res.status(201).json({
      success: true,
      message: 'Tag added to post successfully'
    });
  } catch (error) {
    console.error('Error in addTagToPost:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add tag to post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove tag from post
exports.removeTagFromPost = async (req, res) => {
  try {
    const { postId, tagId } = req.params;
    
    // Check if relationship exists
    const relation = await sequelize.models.PostTag.findOne({
      where: {
        postId,
        tagId
      }
    });
    
    if (!relation) {
      return res.status(404).json({
        success: false,
        message: 'Tag is not associated with this post'
      });
    }
    
    // Remove tag from post
    await relation.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Tag removed from post successfully'
    });
  } catch (error) {
    console.error('Error in removeTagFromPost:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove tag from post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get tag statistics
exports.getTagStats = async (req, res) => {
  try {
    const totalTags = await Tag.count();
    const popularTags = await Tag.count({ where: { isPopular: true } });
    
    // Get tags with the most posts
    const mostUsedTags = await Tag.findAll({
      attributes: [
        'id',
        'name',
        'color',
        [sequelize.literal('(SELECT COUNT(*) FROM PostTags WHERE PostTags.tagId = Tag.id)'), 'postCount']
      ],
      order: [[sequelize.literal('postCount'), 'DESC']],
      limit: 5
    });
    
    return res.status(200).json({
      success: true,
      data: {
        totalTags,
        popularTags,
        regularTags: totalTags - popularTags,
        mostUsedTags
      }
    });
  } catch (error) {
    console.error('Error in getTagStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tag statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};