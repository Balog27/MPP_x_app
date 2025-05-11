const axios = require('axios');

async function testAnalyticsEndpoints() {
  console.log('Testing analytics endpoints...');
  const baseUrl = 'http://localhost:5000/api';
  
  try {
    console.log('\nTesting content-stats endpoint:');
    const response1 = await axios.get(`${baseUrl}/analytics/content-stats`, {
      params: { period: 30, limit: 10 }
    });
    
    console.log('✅ Endpoint is working!');
    console.log('Status:', response1.status);
    console.log('Response time:', response1.data.executionTimeMs + 'ms');
    console.log('Data preview:', Object.keys(response1.data.data));
    
    console.log('\nTesting content-stats-optimized endpoint:');
    const response2 = await axios.get(`${baseUrl}/analytics/content-stats-optimized`, {
      params: { period: 30, limit: 10 }
    });
    
    console.log('✅ Endpoint is working!');
    console.log('Status:', response2.status);
    console.log('Response time:', response2.data.executionTimeMs + 'ms');
    console.log('Data preview:', Object.keys(response2.data.data));
    
    // Compare response times
    console.log('\nPerformance comparison:');
    const time1 = response1.data.executionTimeMs;
    const time2 = response2.data.executionTimeMs;
    const improvement = ((time1 - time2) / time1 * 100).toFixed(2);
    
    console.log(`Regular endpoint: ${time1}ms`);
    console.log(`Optimized endpoint: ${time2}ms`);
    
    if (time2 < time1) {
      console.log(`✅ Optimized endpoint is ${improvement}% faster!`);
    } else {
      console.log(`❌ Optimized endpoint is ${-improvement}% slower.`);
    }
    
  } catch (error) {
    console.error('Error testing analytics endpoints:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    
    console.log('\nPossible causes:');
    console.log('1. Server is not running');
    console.log('2. Analytics controller or routes are not properly set up');
    console.log('3. Database connection issues');
    console.log('4. Model association problems');
  }
}

testAnalyticsEndpoints()
  .catch(error => console.error('Script error:', error));