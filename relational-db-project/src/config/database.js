const { User, Post } = require('../models');
const bcrypt = require('bcryptjs');

// Get all users with optional filtering and sorting
exports.getAllUsers = async (req, res) => {
  try {
    const { sort, order, filter, value, page = 1, limit = 10 } = req.query;
    
    // Build query options
    const options = {
      attributes: { exclude: ['password'] }, // Don't return password in response
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: sort ? [[sort, order || 'ASC']] : [['createdAt', 'DESC']],
      include: []
    };
    
    // Add filtering if specified
    if (filter && value) {
      options.where = {
        [filter]: value
      };
    }
    
    // Include posts if requested
    if (req.query.includePosts === 'true') {
      options.include.push({
        model: Post,
        as: 'posts'
      });
    }
    
    const users = await User.findAndCountAll(options);
    
    return res.status(200).json({
      success: true,
      count: users.count,
      data: users.rows,
      totalPages: Math.ceil(users.count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, isAdmin } = req.body;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isAdmin: isAdmin || false
    });
    
    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    return res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error in createUser:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => e.message)
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

