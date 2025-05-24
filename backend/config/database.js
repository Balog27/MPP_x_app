const { Sequelize } = require('sequelize');

// Use the direct connection string if available
const connectionString = process.env.DATABASE_URL;
let sequelize;

if (connectionString) {
  // Use the connection string provided by Railway
  sequelize = new Sequelize(connectionString, {
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false
      },
      connectTimeout: 60000
    }
  });
} else {
  // Use the public MySQL connection instead of internal networking
  sequelize = new Sequelize(
    process.env.DB_NAME || 'railway', 
    process.env.DB_USER || 'root', 
    process.env.DB_PASSWORD || '', 
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
      dialectOptions: {
        ssl: {
          rejectUnauthorized: false
        },
        connectTimeout: 60000
      }
    }
  );
}

module.exports = sequelize;
