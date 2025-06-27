const { validateStringOptions, validateUrlOption } = require('./utils');

const validateOptions = async (options, callback) => {
  const stringOptionsErrorMessages = {
    url: '* Required',
    accessToken: '* Required'
  };

  const stringValidationErrors = validateStringOptions(
    stringOptionsErrorMessages,
    options
  );

  const urlValidationError = validateUrlOption(options, 'url');

  // Validate searchScopes
  let searchScopesError = [];
  if (options.searchScopes && options.searchScopes.length > 0) {
    const validScopes = ['assets', 'forms', 'users', 'vulnerabilities'];
    const invalidScopes = options.searchScopes.filter(scope => !validScopes.includes(scope));
    
    if (invalidScopes.length > 0) {
      searchScopesError.push({
        key: 'searchScopes',
        message: `Invalid search scopes: ${invalidScopes.join(', ')}. Valid options are: ${validScopes.join(', ')}`
      });
    }
  } else {
    // If no scopes selected, that's okay - we'll default to assets and forms
    console.log('No search scopes selected, will default to assets and forms');
  }

  const errors = stringValidationErrors.concat(urlValidationError).concat(searchScopesError);

  callback(null, errors);
};

module.exports = validateOptions;
