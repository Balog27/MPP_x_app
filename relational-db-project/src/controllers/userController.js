const { User, Post, sequelize } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// Get all users with filtering, sorting and pagination
exports.getAllUsers = async (req, res) => {
  try {
    const { 
      sort = 'createdAt', 
      order = 'DESC',
      search,
      isAdmin,
      page = 1, 
      limit = 10,
      includePosts
    } = req.query;
    
    // Build where clause for filtering
    const whereClause = {};
    
    // Filter by admin status if provided
    if (isAdmin !== undefined) {
      whereClause.isAdmin = isAdmin === 'true';
    }
    
    // Search in username, firstName, lastName or email
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Build query options
    const options = {
      attributes: { exclude: ['password'] }, // Exclude password from response
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
        attributes: ['id', 'title', 'status', 'createdAt']
      }];
    }
    
    const users = await User.findAndCountAll(options);
    
    // Calculate pagination info
    const totalPages = Math.ceil(users.count / parseInt(limit));
    
    return res.status(200).json({
      success: true,
      count: users.count,
      totalPages,
      currentPage: parseInt(page),
      data: users.rows
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get a single user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includePosts } = req.query;
    
    const options = {
      attributes: { exclude: ['password'] },
      where: { id }
    };
    
    // Include posts if requested
    if (includePosts === 'true') {
      options.include = [{
        model: Post,
        as: 'posts',
        attributes: ['id', 'title', 'content', 'status', 'createdAt', 'updatedAt']
      }];
    }
    
    const user = await User.findOne(options);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${id} not found`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, isAdmin } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || null,
      lastName: lastName || null,
      isAdmin: isAdmin || false,
      lastLogin: new Date()
    });
    
    // Don't send password back in the response
    const userResponse = newUser.toJSON();
    delete userResponse.password;
    
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error in createUser:', error);
    
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
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, firstName, lastName, isAdmin } = req.body;
    
    // Check if user exists
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${id} not found`
      });
    }
    
    // If updating username or email, check for duplicates
    if (username || email) {
      const existingUser = await User.findOne({
        where: {
          [Op.and]: [
            { id: { [Op.ne]: id } }, // Not this user
            { [Op.or]: [
              username ? { username } : null,
              email ? { email } : null
            ].filter(Boolean) } // Remove null conditions
          ]
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username or email already in use by another user'
        });
      }
    }
    
    // Prepare update data
    const updateData = {};
    
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
    
    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    // Update user
    await user.update(updateData);
    
    // Get updated user (without password)
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error in updateUser:', error);
    
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
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${id} not found`
      });
    }
    
    // Delete the user (associated posts will be deleted through CASCADE)
    await user.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const adminUsers = await User.count({ where: { isAdmin: true } });
    const activeUsers = await User.count({
      where: {
        lastLogin: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });
    
    // Get users with the most posts
    const topContributors = await User.findAll({
      attributes: [
        'id', 
        'username',
        'firstName',
        'lastName',
        [sequelize.literal('(SELECT COUNT(*) FROM Posts WHERE Posts.userId = User.id)'), 'postCount']
      ],
      order: [[sequelize.literal('postCount'), 'DESC']],
      limit: 5
    });
    
    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        adminUsers,
        regularUsers: totalUsers - adminUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        topContributors
      }
    });
  } catch (error) {
    console.error('Error in getUserStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};