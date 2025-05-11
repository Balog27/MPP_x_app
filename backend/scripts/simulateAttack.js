const { User, ActivityLog } = require('../models');
const monitoringService = require('../services/monitoringService');
const sequelize = require('../config/database');

async function simulateAttack() {
  try {
    // Create a test user
    const user = await User.create({
      username: 'test_attacker',
      email: 'attacker@test.com',
      password: 'password123'
    });

    console.log('Created test user:', user.username);

    // Simulate rapid activity
    const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
    const entityTypes = ['Post', 'Comment', 'User'];
    
    console.log('Starting attack simulation...');
    
    // Generate 100 rapid actions
    for (let i = 0; i < 100; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      
      await monitoringService.logActivity(
        user.id,
        action,
        entityType,
        Math.floor(Math.random() * 1000),
        `Simulated ${action} on ${entityType}`,
        { ip: '127.0.0.1', headers: { 'user-agent': 'Simulation Script' } }
      );

      // Add a small delay to make it more realistic
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Attack simulation completed');
    console.log('Check the admin dashboard to see if the user was marked as suspicious');

  } catch (error) {
    console.error('Error in attack simulation:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the simulation
simulateAttack(); 