const { sequelize } = require('../models');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully!');

    // Check database config
    console.log('\nCurrent database configuration:');
    console.log('- Database name:', sequelize.config.database);
    console.log('- Host:', sequelize.config.host);
    console.log('- Port:', sequelize.config.port);
    console.log('- Dialect:', sequelize.getDialect());
    
    // List tables in the database
    console.log('\nChecking existing tables:');
    const [tables] = await sequelize.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('No tables found in the database. Tables need to be created first.');
    } else {
      console.log('Tables in database:');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`- ${tableName}`);
      });
    }
    
    // Check if models are properly synced
    console.log('\nModels loaded in Sequelize:');
    const modelNames = Object.keys(sequelize.models);
    console.log(modelNames);
    
    if (modelNames.length === 0) {
      console.error('No models are registered with Sequelize!');
    }
    
    // List table structure for Posts table if it exists
    if (tables.some(t => Object.values(t)[0].toLowerCase() === 'posts')) {
      console.log('\nChecking structure of Posts table:');
      const [postStructure] = await sequelize.query('DESCRIBE Posts');
      console.log(postStructure);
    }
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    // Always close the connection
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the test
testConnection()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });