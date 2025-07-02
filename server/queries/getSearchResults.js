const { map, flatMap } = require('lodash/fp');

const {
  logging: { getLogger },
  errors: { parseErrorToReadableJson }
} = require('polarity-integration-utils');

const { requestsInParallel } = require('../request');

// Main entry point
const getSearchResults = async (entities, options) => {
  const Logger = getLogger();

  try {
    // Generate all search requests for all entities, workspaces, and scopes
    const searchRequests = flatMap(
      (entity) => generateSearchRequests(entity, options),
      entities
    );

    Logger.debug(
      {
        searchRequests: searchRequests.map(req => ({
          entity: req.resultId,
          workspace: req.workspaceId,
          scope: req.scope,
          url: req.route
        }))
      },
      'Generated Partner API Search Requests'
    );

    const rawResults = await requestsInParallel(searchRequests, 'body.results');

    // Enrich results with metadata from original requests
    const enrichedResults = enrichResultsWithMetadata(rawResults, searchRequests);

    Logger.debug(
      {
        resultCount: enrichedResults.length,
        searchScopes: options.searchScopes,
        workspaces: options.workspaceIds,
        resultsByScope: summarizeByScope(enrichedResults)
      },
      'Partner API Search Results Retrieved and Enriched'
    );

    return enrichedResults;
  } catch (error) {
    const err = parseErrorToReadableJson(error);

    Logger.error(
      {
        formattedError: err,
        error,
        searchScopes: options.searchScopes,
        workspaces: options.workspaceIds
      },
      'Getting Partner API Search Results Failed'
    );

    throw error;
  }
};

// Utilities

/**
 * Generate search requests for entity across all workspaces and scopes
 */
const generateSearchRequests = (entity, options) => {
  const workspaceIds = Array.isArray(options.workspaceIds) 
    ? options.workspaceIds 
    : [options.workspaceIds];
  
  const searchScopes = options.searchScopes || [];

  return flatMap(
    (workspaceId) => 
      map(
        (scope) => ({
          resultId: entity.value,
          workspaceId,
          scope: scope.value,
          scopeDisplay: scope.display,
          entityTypes: entity.types,
          route: buildSearchEndpoint(workspaceId, scope.value),
          method: 'GET',
          qs: {
            search: entity.value,
            type: '' // Include empty type parameter as shown in API docs
          },
          options
        }),
        searchScopes
      ),
    workspaceIds
  );
};

/**
 * Build search endpoint URL using template literals
 * Note: request.js adds '/api/v1/' prefix, so we only provide the relative path
 */
const buildSearchEndpoint = (workspaceId, scope) => {
  return `workspaces/${workspaceId}/${scope}/`;
};

/**
 * Enrich API results with metadata from the original requests
 */
const enrichResultsWithMetadata = (rawResults, searchRequests) => {
  const enrichedResults = [];
  
  rawResults.forEach((resultArray, index) => {
    const request = searchRequests[index];
    
    if (Array.isArray(resultArray) && resultArray.length > 0) {
      resultArray.forEach(result => {
        enrichedResults.push({
          ...result,
          scope: request.scope,
          workspaceId: request.workspaceId,
          searchEntity: request.resultId
        });
      });
    }
  });
  
  return enrichedResults;
};

/**
 * Summarize results by scope for logging
 */
const summarizeByScope = (results) => {
  const summary = {};
  
  results.forEach(result => {
    if (result.scope) {
      summary[result.scope] = (summary[result.scope] || 0) + 1;
    }
  });
  
  return summary;
};

/**
 * Get available search scopes for the partner API
 */
const getAvailableScopes = () => [
  { value: 'assets', display: 'Assets' },
  { value: 'forms', display: 'Forms' },
  { value: 'pages', display: 'Pages' },
  { value: 'tasks', display: 'Tasks' }
];

module.exports = {
  getSearchResults,
  getAvailableScopes
}; 