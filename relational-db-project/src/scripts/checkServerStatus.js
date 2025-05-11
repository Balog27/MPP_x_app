const axios = require('axios');

async function checkServerStatus() {
  try {
    console.log('Checking if server is running at http://localhost:5000');
    
    // Try to connect to the server root
    const response = await axios.get('http://localhost:5000', { 
      timeout: 5000 // 5 second timeout
    });
    
    console.log('Server is running!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('Error connecting to server:');
    console.error('Message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\nThe server is not running or not listening on port 5000.');
      console.error('Please start your server with:');
      console.error('  npm start');
    }
  }
}

checkServerStatus()
  .catch(error => console.error('Error in script:', error));