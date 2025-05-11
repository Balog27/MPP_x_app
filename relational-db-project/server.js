require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./src/models');
const { sequelize } = db;

// Routes
const userRoutes = require('./src/routes/userRoutes');
const postRoutes = require('./src/routes/postRoutes');
const tagRoutes = require('./src/routes/tagRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/analytics', analyticsRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Blog API is running...');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;

// Sync database and start server
sequelize.sync({ force: process.env.FORCE_SYNC === 'true' })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Create a test user for demonstration (optional)
    if (process.env.CREATE_TEST_USER === 'true') {
      const { User } = db;
      const bcrypt = require('bcryptjs');
      // Check if test user exists
      User.findOne({ where: { username: 'testuser' } })
        .then(user => {
          if (!user) {
            // Create test user
            bcrypt.genSalt(10)
              .then(salt => bcrypt.hash('password123', salt))
              .then(hashedPassword => {
                return User.create({
                  username: 'testuser',
                  email: 'test@example.com',
                  password: hashedPassword,
                  firstName: 'Test',
                  lastName: 'User',
                  isAdmin: false,
                  lastLogin: new Date()
                });
              })
              .then(newUser => {
                console.log('Test user created:', newUser.username);
              })
              .catch(err => {
                console.error('Error creating test user:', err);
              });
          }
        });
    }
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

module.exports = app; // For testing