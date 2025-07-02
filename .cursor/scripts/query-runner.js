const fs = require('fs');
const { map } = require('lodash/fp');

const { getSearchResults } = require('../../server/queries/getSearchResults');

/**
 * CYYNC Integration Query Runner
 * 
 * This script tests the CYYNC Partner API by searching for entities across different scopes.
 * 
 * Usage:
 * --url <url> - The URL of the CYYNC instance (default: https://staging.cyync.com)
 * --accessToken <token> - The access token for authentication
 * --roleId <roleId> - The role ID for the API calls
 * --workspaceIds <ids> - Comma-separated workspace IDs to search
 * --searchScopes <scopes> - Comma-separated search scopes (assets,forms,pages,tasks)
 * --searchLimit <limit> - Maximum results per scope (default: 50)
 * --entity <index> - Entity index to test (default: 0)
 * --all-entities - Test all available entities
 */

const main = async () => {
  clearOutputFile();
  
  const options = parseCommandLineOptions();
  
  logMessage('CYYNC Integration Query Runner Started');
  logMessage(`Testing with: ${JSON.stringify(options, null, 2)}`);
  
  try {
    if (process.argv.includes('--all-entities')) {
      await testAllEntities(options);
    } else {
      const entityIndex = process.argv.includes('--entity')
        ? parseInt(process.argv[process.argv.indexOf('--entity') + 1])
        : 0;
      
      const entity = testEntities[entityIndex];
      if (!entity) {
        throw new Error(`Entity at index ${entityIndex} not found. Available: 0-${testEntities.length - 1}`);
      }
      
      await testSingleEntity(entity, options);
    }
    
    logMessage('CYYNC Integration Query Runner Completed Successfully');
  } catch (error) {
    logMessage(`CYYNC Integration Query Runner Failed: ${error.message}`);
    writeToOutputFile({ error: error.message, stack: error.stack });
    throw error;
  }
};

const parseCommandLineOptions = () => {
  const options = {
    url: getArgValue('--url', 'https://staging.cyync.com'),
    accessToken: getArgValue('--accessToken', ''),
    roleId: getArgValue('--roleId', ''),
    workspaceIds: getArgValue('--workspaceIds', '').split(',').filter(Boolean),
    searchScopes: parseSearchScopes(getArgValue('--searchScopes', 'assets,forms')),
    searchLimit: parseInt(getArgValue('--searchLimit', '50'))
  };
  
  // Validation
  if (!options.accessToken) {
    throw new Error('--accessToken is required');
  }
  if (!options.roleId) {
    throw new Error('--roleId is required');
  }
  if (options.workspaceIds.length === 0) {
    throw new Error('--workspaceIds is required (comma-separated)');
  }
  
  return options;
};

const getArgValue = (argName, defaultValue) => {
  const index = process.argv.indexOf(argName);
  return index !== -1 && process.argv[index + 1] 
    ? process.argv[index + 1] 
    : defaultValue;
};

const parseSearchScopes = (scopesStr) => {
  const scopeMap = {
    'assets': { value: 'assets', display: 'Assets' },
    'forms': { value: 'forms', display: 'Forms' },
    'pages': { value: 'pages', display: 'Pages' },
    'tasks': { value: 'tasks', display: 'Tasks' }
  };
  
  return scopesStr.split(',')
    .map(scope => scope.trim())
    .filter(scope => scopeMap[scope])
    .map(scope => scopeMap[scope]);
};

const testSingleEntity = async (entity, options) => {
  logMessage(`Testing Entity: ${entity.value} (${entity.types.join(', ')})`);
  
  const startTime = Date.now();
  const results = await getSearchResults([entity], options);
  const duration = Date.now() - startTime;
  
  const resultSummary = {
    entity: entity.value,
    entityTypes: entity.types,
    searchScopes: options.searchScopes.map(s => s.value),
    workspaces: options.workspaceIds,
    duration: `${duration}ms`,
    totalResults: results.length,
    resultsByScope: summarizeResultsByScope(results),
    sampleResults: results.slice(0, 3) // First 3 results for inspection
  };
  
  logMessage(`Search completed in ${duration}ms with ${results.length} total results`);
  writeToOutputFile(resultSummary);
  
  return results;
};

const testAllEntities = async (options) => {
  logMessage(`Testing all ${testEntities.length} entities`);
  
  const allResults = [];
  
  for (const [index, entity] of testEntities.entries()) {
    logMessage(`\n--- Testing Entity ${index + 1}/${testEntities.length} ---`);
    
    try {
      const results = await testSingleEntity(entity, options);
      allResults.push({
        entityIndex: index,
        entity: entity.value,
        success: true,
        resultCount: results.length
      });
    } catch (error) {
      logMessage(`Failed to test entity ${entity.value}: ${error.message}`);
      allResults.push({
        entityIndex: index,
        entity: entity.value,
        success: false,
        error: error.message
      });
    }
    
    // Small delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const summary = {
    totalEntities: testEntities.length,
    successful: allResults.filter(r => r.success).length,
    failed: allResults.filter(r => !r.success).length,
    results: allResults
  };
  
  logMessage(`\n--- Final Summary ---`);
  logMessage(`Successful: ${summary.successful}/${summary.totalEntities}`);
  logMessage(`Failed: ${summary.failed}/${summary.totalEntities}`);
  
  writeToOutputFile(summary);
};

const summarizeResultsByScope = (results) => {
  const summary = {};
  
  results.forEach(result => {
    if (result.scope) {
      summary[result.scope] = (summary[result.scope] || 0) + 1;
    }
  });
  
  return summary;
};

// Utility functions
const clearOutputFile = () => {
  fs.writeFileSync('cyync-query-results.json', '');
};

const writeToOutputFile = (content) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(
    'cyync-query-results.json',
    JSON.stringify({ 
      timestamp,
      source: 'cyync-query-runner.js', 
      content 
    }, null, 2) + '\n'
  );
};

const logMessage = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

// Test entities for CYYNC Partner API
const testEntities = [
  // Network Infrastructure
  { value: '10.0.1.100', types: ['IPv4'] },
  { value: '192.168.1.1', types: ['IPv4'] },
  { value: '172.16.0.1', types: ['IPv4'] },
  
  // Domains
  { value: 'example.com', types: ['domain'] },
  { value: 'suspicious-domain.net', types: ['domain'] },
  { value: 'malware-c2.org', types: ['domain'] },
  
  // Email addresses
  { value: 'admin@company.com', types: ['email'] },
  { value: 'security@example.org', types: ['email'] },
  { value: 'analyst@cyync.com', types: ['email'] },
  
  // File hashes (MD5)
  { value: 'f54a41145b732d47d4a2b0a1c6e811dd', types: ['MD5'] },
  { value: '1c405ba0dd99d9333173a8b44a98c6d0', types: ['MD5'] },
  
  // File hashes (SHA256)
  { value: '3c2fe308c0a563e06263bbacf793bbe9b2259d795fcc36b953793a7e499e7f71', types: ['SHA256'] },
  { value: 'daa362f070ba121b9a2fa3567abc345edcde33c54cabefa71dd2faad78c10c33', types: ['SHA256'] },
  
  // URLs
  { value: 'https://malicious-site.com/payload', types: ['url'] },
  { value: 'http://suspicious-domain.net/login', types: ['url'] },
  
  // Common security terms that might appear in assets/forms
  { value: 'malware', types: ['keyword'] },
  { value: 'phishing', types: ['keyword'] },
  { value: 'incident', types: ['keyword'] },
  { value: 'vulnerability', types: ['keyword'] }
];

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Query runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  testSingleEntity,
  testAllEntities,
  testEntities
}; 