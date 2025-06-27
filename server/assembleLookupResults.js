const { 
  map, 
  size, 
  filter, 
  flow, 
  round, 
  groupBy,
  keys,
  isEmpty,
  compact,
  uniq,
  identity,
  sumBy
} = require('lodash/fp');
const { getResultForThisEntity } = require('./dataTransformations');

const assembleLookupResults = (entities, searchResults, options) =>
  map(entity => {
    const searchResult = getResultForThisEntity(entity, searchResults);
    
    return {
      entity,
      data: size(searchResult) 
        ? {
            summary: createSummaryTags(searchResult, entity, options),
            details: organizeResultsByType(searchResult, options)
          }
        : null
    };
  }, entities);


// =============================================================================
// ORGANIZATION LAYER - Data structure and grouping
// =============================================================================

/**
 * Organize search results by type
 */
const organizeResultsByType = (searchResult, options) => {
  const resultsByType = groupBy(determineResultType, searchResult);
  const organizedResults = {};

  // Process each type
  keys(resultsByType).forEach(type => {
    if (type === 'assets') {
      organizedResults.assets = processAssets(resultsByType[type]);
    } else if (type === 'forms') {
      organizedResults.forms = processForms(resultsByType[type]);
    } else {
      organizedResults[type] = processGenericResults(resultsByType[type], type);
    }
  });

  // Add metadata
  organizedResults._metadata = {
    totalResults: size(searchResult),
    searchScopes: options.searchScopes || ['assets', 'forms'],
    resultTypes: keys(resultsByType)
  };

  return organizedResults;
};

/**
 * Create summary tags from organized results
 */
const createSummaryTags = (searchResult, entity, options) => {
  const organizedResults = organizeResultsByType(searchResult, options);
  const tags = [];

  // Add asset tags
  if (organizedResults.assets) {
    tags.push(`Assets: ${organizedResults.assets.count}`);
    if (organizedResults.assets.summary.highRiskCount > 0) {
      tags.push(`High Risk: ${organizedResults.assets.summary.highRiskCount}`);
    }
  }

  // Add form tags
  if (organizedResults.forms) {
    tags.push(`Forms: ${organizedResults.forms.count}`);
    if (organizedResults.forms.summary.recentForms > 0) {
      tags.push(`Recent: ${organizedResults.forms.summary.recentForms}`);
    }
  }

  // Add tags for other types
  keys(organizedResults).forEach(type => {
    if (!['assets', 'forms'].includes(type)) {
      tags.push(`${type}: ${organizedResults[type].count}`);
    }
  });

  return tags;
};

// =============================================================================
// UTILITIES - General purpose functions
// =============================================================================

// Summaries
/**
 * Create asset summary with risk calculations
 */
const createAssetSummary = (assets) => ({
  totalAssets: size(assets),
  avgRiskScore: calculateAverageRisk(assets),
  highRiskCount: size(filter(asset => (asset.riskScore || asset.riskLevel || 0) > 7, assets))
});

/**
 * Create form summary with type analysis
 */
const createFormSummary = (forms) => ({
  totalForms: size(forms),
  formTypes: flow(
    map(form => form.type || form.formType),
    compact,
    uniq
  )(forms),
  recentForms: size(filter(isRecentForm, forms))
});

// Transformers

/**
 * Transform individual asset - concrete field mapping
 */
const transformAsset = (asset) => ({
  id: asset.id || asset.assetId,
  name: asset.name || asset.hostname || asset.deviceName,
  ipAddress: asset.ipAddress || asset.ip,
  macAddress: asset.macAddress || asset.mac,
  riskScore: asset.riskScore || asset.riskLevel,
  lastSeen: asset.lastSeen || asset.updatedAt,
  status: asset.status || 'unknown',
  _raw: asset
});

/**
 * Transform individual form - concrete field mapping
 */
const transformForm = (form) => ({
  id: form.id || form.formId,
  title: form.title || form.name,
  type: form.type || form.formType,
  status: form.status,
  createdAt: form.createdAt || form.created,
  updatedAt: form.updatedAt || form.modified,
  author: form.author || form.createdBy,
  _raw: form
});

/**
 * Calculate average risk score from any array of results
 */
const calculateAverageRisk = (results) => {
  const riskScores = flow(
    map(result => result.riskScore || result.riskLevel),
    filter(score => typeof score === 'number')
  )(results);
  
  if (isEmpty(riskScores)) return 0;
  
  const average = sumBy(identity, riskScores) / riskScores.length;
  return round(average * 10) / 10;
};

/**
 * Check if any form/item is recent (within last week)
 */
const isRecentForm = (form) => {
  const dateStr = form.createdAt || form.created;
  if (!dateStr) return false;
  
  const created = new Date(dateStr);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return created > weekAgo;
};

/**
 * Determine result type using simple conditionals
 */
const determineResultType = (result) => {
  if (result.type) return result.type;
  if (result.source) return result.source;
  if (result._type) return result._type;
  if (result.assetId || result.deviceId) return 'assets';
  if (result.formId || result.templateId) return 'forms';
  return 'unknown';
};

// =============================================================================
// TYPE PROCESSORS - Specific type handling
// =============================================================================

/**
 * Process asset results
 */
const processAssets = (assets) => ({
  count: size(assets),
  items: map(transformAsset, assets),
  summary: createAssetSummary(assets)
});

/**
 * Process form results
 */
const processForms = (forms) => ({
  count: size(forms),
  items: map(transformForm, forms),
  summary: createFormSummary(forms)
});

/**
 * Process generic results for unknown types
 */
const processGenericResults = (results, type) => ({
  count: size(results),
  type,
  items: map(result => ({
    id: result.id,
    name: result.name || result.title,
    _raw: result
  }), results),
  summary: { total: size(results) }
});


module.exports = assembleLookupResults;
