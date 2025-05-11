const axios = require('axios');

// Simple function to test endpoints
async function testEndpoints() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('Testing API endpoints...');
  
  // Test the regular endpoint
  try {
    console.log('Testing /api/analytics/content-stats...');
    const response1 = await axios.get(`${baseUrl}/api/analytics/content-stats?period=30&limit=10`);
    console.log('Status:', response1.status);
    console.log('Headers:', response1.headers);
    console.log('Data preview:', JSON.stringify(response1.data).substring(0, 100) + '...');
  } catch (error) {
    console.error('Error testing content-stats endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    console.error('Response data:', error.response?.data);
  }
  
  // Test the optimized endpoint
  try {
    console.log('\nTesting /api/analytics/content-stats-optimized...');
    const response2 = await axios.get(`${baseUrl}/api/analytics/content-stats-optimized?period=30&limit=10`);
    console.log('Status:', response2.status);
    console.log('Headers:', response2.headers);
    console.log('Data preview:', JSON.stringify(response2.data).substring(0, 100) + '...');
  } catch (error) {
    console.error('Error testing content-stats-optimized endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    console.error('Response data:', error.response?.data);
  }
}

// Run the test
testEndpoints();