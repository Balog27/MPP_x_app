const path = require('path');
// Load environment variables from the .env file in the project root
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function checkDatabaseConnection() {
  console.log('Checking database connection...');
  
  // Get database connection details from environment variables
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blog_db',
    port: parseInt(process.env.DB_PORT || '3306')
  };
  
  console.log('Using connection config:');
  console.log(`Host: ${config.host}`);
  console.log(`User: ${config.user}`);
  console.log(`Password: ${config.password ? '******' : '[MISSING]'}`);
  console.log(`Database: ${config.database}`);
  console.log(`Port: ${config.port}`);
  
  let connection;
  
  try {
    // Try to establish direct connection to MySQL
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port
    });
    
    console.log('\n✅ Successfully connected to MySQL server!');
    
    // Now check if the database exists
    const [rows] = await connection.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`, 
      [config.database]
    );
    
    if (rows.length > 0) {
      console.log(`\n✅ Database '${config.database}' exists!`);
      
      // Connect to the specific database
      await connection.changeUser({ database: config.database });
      
      // Check if tables exist
      const [tables] = await connection.execute(
        `SHOW TABLES`
      );
      
      console.log(`\nFound ${tables.length} tables in database:`);
      tables.forEach(table => {
        console.log(`- ${Object.values(table)[0]}`);
      });
      
      if (tables.length === 0) {
        console.log('\n⚠️ No tables found. Your models may not have been synchronized.');
        console.log('Try running the server with FORCE_SYNC=true in your .env file.');
      }
      
    } else {
      console.error(`\n❌ Database '${config.database}' does not exist!`);
      console.log('\nTry to create the database manually:');
      console.log(`mysql -u ${config.user} -p`);
      console.log(`CREATE DATABASE ${config.database};`);
      console.log(`EXIT;`);
    }
    
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nAccess denied. Please check your username and password.');
      console.error('It looks like your .env file is not being loaded correctly.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\nConnection refused. Please make sure MySQL server is running.');
    }
    
    console.log('\nVerify that:');
    console.log('1. MySQL service is running');
    console.log('2. Your .env file has the correct database credentials');
    console.log(`3. The user '${config.user}' has permission to access MySQL`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabaseConnection()
  .catch(error => console.error('Error in script:', error))
  .finally(() => process.exit());