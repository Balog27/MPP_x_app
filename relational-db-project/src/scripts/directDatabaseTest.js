const mysql = require('mysql2/promise');

async function testDatabaseDirectly() {
  console.log('Testing direct database connection...');
  
  // REPLACE THESE WITH YOUR ACTUAL CREDENTIALS
  const config = {
    host: 'localhost',
    user: 'root',
    password: 'parola123',  // Replace with your actual MySQL password
    database: 'blog_db',
    port: 3306
  };
  
  console.log('Using hardcoded connection config:');
  console.log(`Host: ${config.host}`);
  console.log(`User: ${config.user}`);
  console.log(`Password: ${config.password ? '******' : '[NONE]'}`);
  console.log(`Database: ${config.database}`);
  console.log(`Port: ${config.port}`);
  
  let connection;
  
  try {
    // First try connecting to MySQL server without specifying a database
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port
    });
    
    console.log('\n✅ Successfully connected to MySQL server!');
    
    // Check if database exists
    const [dbs] = await connection.execute(
      'SHOW DATABASES LIKE ?', 
      [config.database]
    );
    
    if (dbs.length === 0) {
      console.log(`\n❌ Database '${config.database}' does not exist. Creating it...`);
      await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
      console.log(`✅ Database '${config.database}' created!`);
    } else {
      console.log(`\n✅ Database '${config.database}' exists!`);
    }
    
    // Connect to the database
    await connection.changeUser({ database: config.database });
    
    // Check for tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`\nFound ${tables.length} tables in database.`);
    
    if (tables.length > 0) {
      console.log('Tables:');
      tables.forEach(table => {
        console.log(`- ${Object.values(table)[0]}`);
      });
    } else {
      console.log('No tables found. Your models may not have been synchronized.');
    }
    
    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Error code:', error.code);
    
    console.log('\nPossible solutions:');
    console.log('1. Make sure MySQL server is running');
    console.log('2. Verify your username and password');
    console.log('3. Check if the user has necessary permissions');
  } finally {
    if (connection) await connection.end();
  }
}

testDatabaseDirectly()
  .catch(error => console.error('Error in script:', error))
  .finally(() => process.exit());