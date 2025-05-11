const { sequelize, User } = require('../models');

async function simpleInsertTest() {
  try {
    console.log('Testing simple data insertion...');
    
    // Create a test user with a distinctive name
    const testUser = await User.create({
      username: 'test_user_' + Date.now(),
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Created test user with ID:', testUser.id);
    
    // Verify the user was saved by fetching it back
    const fetchedUser = await User.findByPk(testUser.id);
    
    if (fetchedUser) {
      console.log('Successfully fetched user from database!');
      console.log('User data:', {
        id: fetchedUser.id,
        username: fetchedUser.username,
        email: fetchedUser.email,
        createdAt: fetchedUser.createdAt
      });
      
      // Also run a direct SQL query to verify
      const [results] = await sequelize.query(
        `SELECT * FROM Users WHERE id = ${testUser.id}`
      );
      
      console.log('\nDirect SQL query result:');
      if (results.length > 0) {
        console.log('Record found in database!');
      } else {
        console.error('ERROR: Record not found via direct SQL!');
      }
    } else {
      console.error('ERROR: Failed to fetch the user that was just created!');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Don't close the connection immediately to ensure async operations complete
    setTimeout(async () => {
      await sequelize.close();
      console.log('Database connection closed.');
      process.exit(0);
    }, 1000);
  }
}

simpleInsertTest();