#!/bin/bash

# CYYNC Integration Test Runner Example
# This script demonstrates how to run the query-runner.js with proper CYYNC API credentials

# Set CYYNC API credentials (from partner API documentation)
URL="https://staging.cyync.com"
ACCESS_TOKEN="cG9sYXJpdHk6Q1ktQjNSUDBZRVJFa0dOUld2dVpYSVBHc0hwblJRdThGS0M="
ROLE_ID="ab3f5779-6ea8-418d-bdd6-7d287cd7f78e"
WORKSPACE_IDS="d8e6acf3-e996-4e20-8619-8bf17dfe7ec1"
SEARCH_SCOPES="assets,forms"
SEARCH_LIMIT="50"

echo "🚀 Running CYYNC Integration Query Runner..."
echo "Testing with staging environment and sample workspace"
echo ""

# Test single entity (default: first entity - 10.0.1.100)
echo "📋 Testing single entity (IPv4: 10.0.1.100)..."
node query-runner.js \
  --url "$URL" \
  --accessToken "$ACCESS_TOKEN" \
  --roleId "$ROLE_ID" \
  --workspaceIds "$WORKSPACE_IDS" \
  --searchScopes "$SEARCH_SCOPES" \
  --searchLimit "$SEARCH_LIMIT" \
  --entity 0

echo ""
echo "✅ Single entity test completed!"
echo "📄 Results saved to: cyync-query-results.json"
echo ""

# Uncomment to test all entities (be careful with rate limits)
# echo "📋 Testing all entities..."
# node query-runner.js \
#   --url "$URL" \
#   --accessToken "$ACCESS_TOKEN" \
#   --roleId "$ROLE_ID" \
#   --workspaceIds "$WORKSPACE_IDS" \
#   --searchScopes "$SEARCH_SCOPES" \
#   --searchLimit "$SEARCH_LIMIT" \
#   --all-entities

# Test with different entity types
echo "🔍 Testing different entity types..."
echo "Domain (example.com):"
node query-runner.js \
  --url "$URL" \
  --accessToken "$ACCESS_TOKEN" \
  --roleId "$ROLE_ID" \
  --workspaceIds "$WORKSPACE_IDS" \
  --searchScopes "$SEARCH_SCOPES" \
  --searchLimit "$SEARCH_LIMIT" \
  --entity 3

echo ""
echo "Email (admin@company.com):"
node query-runner.js \
  --url "$URL" \
  --accessToken "$ACCESS_TOKEN" \
  --roleId "$ROLE_ID" \
  --workspaceIds "$WORKSPACE_IDS" \
  --searchScopes "$SEARCH_SCOPES" \
  --searchLimit "$SEARCH_LIMIT" \
  --entity 6

echo ""
echo "🎯 All tests completed!"
echo "📊 Check cyync-query-results.json for detailed results" 