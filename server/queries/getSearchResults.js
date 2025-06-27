const { map } = require('lodash/fp');

const {
  logging: { getLogger },
  errors: { parseErrorToReadableJson }
} = require('polarity-integration-utils');

const { requestsInParallel } = require('../request');

// Main entry point
const getSearchResults = async (entities, options) => {
  const Logger = getLogger();

  try {
    const searchRequests = map(
      (entity) => ({
        resultId: entity.value,
        route: 'search/',
        method: 'GET',
        qs: {
          aql: generateCompoundAQL(entity.value, options.searchScopes),
          includeSample: true,
          includeTotal: true,
          limit: options.searchLimit || 50
        },
        options
      }),
      entities
    );

    Logger.debug(
      {
        searchRequests: searchRequests.map(req => ({
          entity: req.resultId,
          aql: req.qs.aql,
          scopes: options.searchScopes
        }))
      },
      'Generated Search Requests with Compound AQL'
    );

    const searchResults = await requestsInParallel(searchRequests, 'body.data.results');

    Logger.debug(
      {
        resultCount: searchResults.length,
        searchScopes: options.searchScopes
      },
      'Search Results Retrieved'
    );

    return searchResults;
  } catch (error) {
    const err = parseErrorToReadableJson(error);

    Logger.error(
      {
        formattedError: err,
        error,
        searchScopes: options.searchScopes
      },
      'Getting Compound Search Results Failed'
    );

    throw error;
  }
};

// Utilities
/**
 * Generate compound AQL query based on selected search scopes
 */
const generateCompoundAQL = (entityValue, searchScopes) => {
  if (!searchScopes || searchScopes.length === 0) {
    return entityValue; // Fallback to simple search
  }
  
  const scopeQueries = searchScopes.map(scope => `in:${scope.value} ${entityValue}`);
  return scopeQueries.join(' OR ');
};

module.exports = getSearchResults; 