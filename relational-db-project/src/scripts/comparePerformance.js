const axios = require('axios');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_RUNS = 10; // Number of times to run each test
const TEST_SCENARIOS = [
  { name: 'Default (30 days, limit 10)', params: { period: 30, limit: 10 } },
  { name: 'Large period (365 days, limit 10)', params: { period: 365, limit: 10 } },
  { name: 'Large limit (30 days, limit 100)', params: { period: 30, limit: 100 } },
  { name: 'Complex (365 days, limit 50)', params: { period: 365, limit: 50 } }
];

// Define endpoints
const endpoints = [
  '/api/analytics/content-stats',
  '/api/analytics/content-stats-optimized'
];

// Create results directory if it doesn't exist
const resultsDir = path.join(__dirname, '../../performance-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Create CSV writer
const csvWriter = createObjectCsvWriter({
  path: path.join(resultsDir, `performance-comparison-${new Date().toISOString().slice(0, 10)}.csv`),
  header: [
    { id: 'scenario', title: 'Scenario' },
    { id: 'endpoint', title: 'Endpoint' },
    { id: 'run', title: 'Run #' },
    { id: 'executionTime', title: 'Execution Time (ms)' },
    { id: 'responseSize', title: 'Response Size (bytes)' },
    { id: 'success', title: 'Success' }
  ]
});

// Function to test endpoint performance
async function testEndpoint(endpoint, params, scenario, run) {
  const startTime = performance.now();
  let success = true;
  let responseSize = 0;
  let executionTime = 0;
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, { params });
    executionTime = response.data.executionTimeMs || performance.now() - startTime;
    responseSize = JSON.stringify(response.data).length;
  } catch (error) {
    console.error(`Error testing ${endpoint} (Run ${run}):`, error.message);
    success = false;
    executionTime = performance.now() - startTime;
  }
  
  return {
    scenario,
    endpoint,
    run,
    executionTime,
    responseSize,
    success
  };
}

// Main test function
async function runPerformanceTests() {
  console.log('Starting performance comparison tests...');
  console.log(`Testing ${TEST_RUNS} runs for each of ${TEST_SCENARIOS.length} scenarios on 2 endpoints\n`);
  
  const results = [];
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\nTesting scenario: ${scenario.name}`);
    
    for (let run = 1; run <= TEST_RUNS; run++) {
      console.log(`  Run ${run}/${TEST_RUNS}`);
      
      // Test regular endpoint
      const regularResult = await testEndpoint(
        endpoints[0],
        scenario.params,
        scenario.name,
        run
      );
      results.push(regularResult);
      
      // Test optimized endpoint
      const optimizedResult = await testEndpoint(
        endpoints[1],
        scenario.params,
        scenario.name,
        run
      );
      results.push(optimizedResult);
      
      // Print comparison
      if (regularResult.success && optimizedResult.success) {
        const improvement = ((regularResult.executionTime - optimizedResult.executionTime) / regularResult.executionTime * 100).toFixed(2);
        console.log(`    Regular: ${regularResult.executionTime.toFixed(2)} ms, Optimized: ${optimizedResult.executionTime.toFixed(2)} ms (${improvement}% improvement)`);
      } else {
        console.log(`    One or both endpoints failed in this run`);
      }
      
      // Small delay between runs to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Write results to CSV
  await csvWriter.writeRecords(results);
  
  // Calculate and display averages
  console.log('\n\n=== PERFORMANCE TEST RESULTS ===\n');
  
  for (const scenario of TEST_SCENARIOS) {
    const regularResults = results.filter(r => r.scenario === scenario.name && r.endpoint === endpoints[0] && r.success);
    const optimizedResults = results.filter(r => r.scenario === scenario.name && r.endpoint === endpoints[1] && r.success);
    
    if (regularResults.length === 0 || optimizedResults.length === 0) {
      console.log(`Scenario: ${scenario.name} - Incomplete data, skipping summary`);
      continue;
    }
    
    const regularAvg = regularResults.reduce((sum, r) => sum + r.executionTime, 0) / regularResults.length;
    const optimizedAvg = optimizedResults.reduce((sum, r) => sum + r.executionTime, 0) / optimizedResults.length;
    const improvement = ((regularAvg - optimizedAvg) / regularAvg * 100).toFixed(2);
    
    console.log(`Scenario: ${scenario.name}`);
    console.log(`  Regular API: ${regularAvg.toFixed(2)} ms (average)`);
    console.log(`  Optimized API: ${optimizedAvg.toFixed(2)} ms (average)`);
    console.log(`  Improvement: ${improvement}%`);
    console.log(`  Successful runs: ${regularResults.length}/${TEST_RUNS} regular, ${optimizedResults.length}/${TEST_RUNS} optimized\n`);
  }
  
  console.log(`Results saved to: ${path.join(resultsDir, 'performance-comparison.csv')}`);
}

// Run the tests
if (require.main === module) {
  // First install the necessary dependencies:
  // npm install axios csv-writer
  
  console.log('Starting performance comparison...');
  runPerformanceTests()
    .then(() => {
      console.log('Performance comparison completed successfully.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error during performance comparison:', error);
      process.exit(1);
    });
}

module.exports = runPerformanceTests;