const {
  logging: { setLogger, getLogger },
  errors: { parseErrorToReadableJson }
} = require('polarity-integration-utils');

const { validateOptions } = require('./server/userOptions');
const { removePrivateIps } = require('./server/dataTransformations');
const { getSearchResults } = require('./server/queries');
const assembleLookupResults = require('./server/assembleLookupResults');

const doLookup = async (entities, options, cb) => {
  const Logger = getLogger();
  try {
    Logger.debug({ entities }, 'Entities');

    const filteredEntities = removePrivateIps(entities);

    Logger.debug({ filteredEntities }, 'Filtered Entities');

    const searchResults = await getSearchResults(filteredEntities, options);

    Logger.trace({ searchResults });

    const lookupResults = assembleLookupResults(filteredEntities, searchResults, options);

    Logger.trace({ lookupResults }, 'Lookup Results');

    cb(null, lookupResults);
  } catch (error) {
    const err = parseErrorToReadableJson(error);

    Logger.error({ error, formattedError: err }, 'Get Lookup Results Failed');
    cb({ detail: error.message || 'Lookup Failed', err });
  }
};


module.exports = {
  startup: setLogger,
  validateOptions,
  doLookup
};
