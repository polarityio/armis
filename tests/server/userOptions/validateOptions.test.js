const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock the utils module
const mockValidateStringOptions = jest.fn();
const mockValidateUrlOption = jest.fn();

jest.mock('../../../server/userOptions/utils', () => ({
  validateStringOptions: mockValidateStringOptions,
  validateUrlOption: mockValidateUrlOption
}));

const validateOptions = require('../../../server/userOptions/validateOptions');

describe('validateOptions', () => {
  let mockCallback;
  let mockOptions;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCallback = jest.fn();
    
    mockOptions = {
      url: 'https://staging.cyync.com',
      accessToken: 'cG9sYXJpdHk6Q1ktQjNSUDBZRVJFa0dOUld2dVpYSVBHc0hwblJRdThGS0M=',
      roleId: 'ab3f5779-6ea8-418d-bdd6-7d287cd7f78e',
      workspaceIds: 'd8e6acf3-e996-4e20-8619-8bf17dfe7ec1',
      searchScopes: ['assets', 'forms'],
      searchLimit: 50
    };

    // Setup default mock behaviors
    mockValidateStringOptions.mockReturnValue([]);
    mockValidateUrlOption.mockReturnValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Required Field Validation', () => {
    test('should validate required string options', async () => {
      await validateOptions(mockOptions, mockCallback);

      expect(mockValidateStringOptions).toHaveBeenCalledWith(
        {
          url: '* Required',
          accessToken: '* Required'
        },
        mockOptions
      );
    });

    test('should handle missing URL error from string validation', async () => {
      const urlError = [{ key: 'url', message: '* Required' }];
      mockValidateStringOptions.mockReturnValue(urlError);

      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, urlError);
    });

    test('should handle missing access token error from string validation', async () => {
      const tokenError = [{ key: 'accessToken', message: '* Required' }];
      mockValidateStringOptions.mockReturnValue(tokenError);

      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, tokenError);
    });

    test('should handle multiple string validation errors', async () => {
      const multipleErrors = [
        { key: 'url', message: '* Required' },
        { key: 'accessToken', message: '* Required' }
      ];
      mockValidateStringOptions.mockReturnValue(multipleErrors);

      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, multipleErrors);
    });
  });

  describe('URL Validation', () => {
    test('should validate URL option', async () => {
      await validateOptions(mockOptions, mockCallback);

      expect(mockValidateUrlOption).toHaveBeenCalledWith(mockOptions, 'url');
    });

    test('should handle URL validation errors', async () => {
      const urlValidationError = [{ key: 'url', message: 'Invalid URL format' }];
      mockValidateUrlOption.mockReturnValue(urlValidationError);

      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, urlValidationError);
    });

    test('should handle URL with trailing slash error', async () => {
      const trailingSlashError = [{ key: 'url', message: 'Your Url must not end with a /' }];
      mockValidateUrlOption.mockReturnValue(trailingSlashError);

      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, trailingSlashError);
    });
  });

  describe('Search Scope Validation', () => {
    test('should validate valid search scopes', async () => {
      const optionsWithValidScopes = {
        ...mockOptions,
        searchScopes: ['assets', 'forms']
      };

      await validateOptions(optionsWithValidScopes, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, []);
    });

    test('should validate all available search scopes', async () => {
      const optionsWithAllScopes = {
        ...mockOptions,
        searchScopes: ['assets', 'forms', 'users', 'vulnerabilities']
      };

      await validateOptions(optionsWithAllScopes, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, []);
    });

    test('should reject invalid search scopes', async () => {
      const optionsWithInvalidScopes = {
        ...mockOptions,
        searchScopes: ['assets', 'invalid_scope', 'forms', 'another_invalid']
      };

      await validateOptions(optionsWithInvalidScopes, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, [
        {
          key: 'searchScopes',
          message: 'Invalid search scopes: invalid_scope, another_invalid. Valid options are: assets, forms, users, vulnerabilities'
        }
      ]);
    });

    test('should handle single invalid search scope', async () => {
      const optionsWithSingleInvalidScope = {
        ...mockOptions,
        searchScopes: ['assets', 'invalid_scope']
      };

      await validateOptions(optionsWithSingleInvalidScope, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, [
        {
          key: 'searchScopes',
          message: 'Invalid search scopes: invalid_scope. Valid options are: assets, forms, users, vulnerabilities'
        }
      ]);
    });

    test('should handle empty search scopes gracefully', async () => {
      const optionsWithEmptyScopes = {
        ...mockOptions,
        searchScopes: []
      };

      // Mock console.log to capture the default message
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await validateOptions(optionsWithEmptyScopes, mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith('No search scopes selected, will default to assets and forms');
      expect(mockCallback).toHaveBeenCalledWith(null, []);

      consoleSpy.mockRestore();
    });

    test('should handle missing search scopes property', async () => {
      const optionsWithoutScopes = {
        ...mockOptions
      };
      delete optionsWithoutScopes.searchScopes;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await validateOptions(optionsWithoutScopes, mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith('No search scopes selected, will default to assets and forms');
      expect(mockCallback).toHaveBeenCalledWith(null, []);

      consoleSpy.mockRestore();
    });

    test('should handle null search scopes', async () => {
      const optionsWithNullScopes = {
        ...mockOptions,
        searchScopes: null
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await validateOptions(optionsWithNullScopes, mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith('No search scopes selected, will default to assets and forms');
      expect(mockCallback).toHaveBeenCalledWith(null, []);

      consoleSpy.mockRestore();
    });

    test('should be case-sensitive for search scope validation', async () => {
      const optionsWithCaseSensitiveScopes = {
        ...mockOptions,
        searchScopes: ['Assets', 'Forms', 'USERS'] // Different casing
      };

      await validateOptions(optionsWithCaseSensitiveScopes, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, [
        {
          key: 'searchScopes',
          message: 'Invalid search scopes: Assets, Forms, USERS. Valid options are: assets, forms, users, vulnerabilities'
        }
      ]);
    });
  });

  describe('Combined Validation Scenarios', () => {
    test('should handle multiple validation error types', async () => {
      const stringErrors = [{ key: 'url', message: '* Required' }];
      const urlErrors = [{ key: 'url', message: 'Invalid URL' }];
      
      mockValidateStringOptions.mockReturnValue(stringErrors);
      mockValidateUrlOption.mockReturnValue(urlErrors);

      const optionsWithInvalidScopes = {
        ...mockOptions,
        searchScopes: ['invalid_scope']
      };

      await validateOptions(optionsWithInvalidScopes, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, [
        ...stringErrors,
        ...urlErrors,
        {
          key: 'searchScopes',
          message: 'Invalid search scopes: invalid_scope. Valid options are: assets, forms, users, vulnerabilities'
        }
      ]);
    });

    test('should handle no validation errors', async () => {
      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, []);
    });

    test('should handle partial validation errors', async () => {
      const urlErrors = [{ key: 'url', message: 'URL must not end with /' }];
      mockValidateUrlOption.mockReturnValue(urlErrors);

      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, urlErrors);
    });
  });

  describe('Error Aggregation', () => {
    test('should properly concatenate all error arrays', async () => {
      const stringErrors = [
        { key: 'url', message: 'URL is required' },
        { key: 'accessToken', message: 'Access token is required' }
      ];
      const urlErrors = [
        { key: 'url', message: 'Invalid URL format' }
      ];
      const scopeErrors = [
        {
          key: 'searchScopes',
          message: 'Invalid search scopes: invalid. Valid options are: assets, forms, users, vulnerabilities'
        }
      ];

      mockValidateStringOptions.mockReturnValue(stringErrors);
      mockValidateUrlOption.mockReturnValue(urlErrors);

      const optionsWithInvalidScopes = {
        ...mockOptions,
        searchScopes: ['invalid']
      };

      await validateOptions(optionsWithInvalidScopes, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, [
        ...stringErrors,
        ...urlErrors,
        ...scopeErrors
      ]);
    });

    test('should handle empty error arrays correctly', async () => {
      mockValidateStringOptions.mockReturnValue([]);
      mockValidateUrlOption.mockReturnValue([]);

      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, []);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle undefined options', async () => {
      await expect(validateOptions(undefined, mockCallback))
        .rejects.toThrow();
    });

    test('should handle null options', async () => {
      await expect(validateOptions(null, mockCallback))
        .rejects.toThrow();
    });

    test('should handle empty options object', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await validateOptions({}, mockCallback);

      expect(mockValidateStringOptions).toHaveBeenCalledWith(
        {
          url: '* Required',
          accessToken: '* Required'
        },
        {}
      );
      expect(mockValidateUrlOption).toHaveBeenCalledWith({}, 'url');

      consoleSpy.mockRestore();
    });

    test('should handle malformed search scopes array', async () => {
      const optionsWithMalformedScopes = {
        ...mockOptions,
        searchScopes: 'not-an-array'
      };

      // This will throw because filter is not a function on string
      await expect(validateOptions(optionsWithMalformedScopes, mockCallback))
        .rejects.toThrow();
    });

    test('should handle search scopes with special characters', async () => {
      const optionsWithSpecialScopes = {
        ...mockOptions,
        searchScopes: ['assets@special', 'forms#invalid', 'valid-forms']
      };

      await validateOptions(optionsWithSpecialScopes, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, [
        {
          key: 'searchScopes',
          message: 'Invalid search scopes: assets@special, forms#invalid, valid-forms. Valid options are: assets, forms, users, vulnerabilities'
        }
      ]);
    });

    test('should handle very long search scope names', async () => {
      const longScopeName = 'a'.repeat(1000);
      const optionsWithLongScopes = {
        ...mockOptions,
        searchScopes: [longScopeName]
      };

      await validateOptions(optionsWithLongScopes, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, [
        {
          key: 'searchScopes',
          message: `Invalid search scopes: ${longScopeName}. Valid options are: assets, forms, users, vulnerabilities`
        }
      ]);
    });

    test('should handle duplicate search scopes', async () => {
      const optionsWithDuplicates = {
        ...mockOptions,
        searchScopes: ['assets', 'assets', 'forms', 'forms']
      };

      // Should not cause additional validation errors for duplicates
      await validateOptions(optionsWithDuplicates, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, []);
    });
  });

  describe('Callback Behavior', () => {
    test('should always call callback with null as first parameter', async () => {
      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Array));
    });

    test('should call callback exactly once', async () => {
      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('should call callback even with validation errors', async () => {
      const stringErrors = [{ key: 'url', message: '* Required' }];
      mockValidateStringOptions.mockReturnValue(stringErrors);

      await validateOptions(mockOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(null, stringErrors);
    });

    test('should handle callback throwing an error gracefully', async () => {
      const throwingCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      // The callback error will be propagated
      await expect(validateOptions(mockOptions, throwingCallback))
        .rejects.toThrow('Callback error');
    });
  });

  describe('Integration with Utility Functions', () => {
    test('should pass correct parameters to validateStringOptions', async () => {
      await validateOptions(mockOptions, mockCallback);

      expect(mockValidateStringOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '* Required',
          accessToken: '* Required'
        }),
        mockOptions
      );
    });

    test('should pass correct parameters to validateUrlOption', async () => {
      await validateOptions(mockOptions, mockCallback);

      expect(mockValidateUrlOption).toHaveBeenCalledWith(mockOptions, 'url');
    });

    test('should handle utility function errors gracefully', async () => {
      mockValidateStringOptions.mockImplementation(() => {
        throw new Error('Utility function error');
      });

      // The utility function error will be propagated
      await expect(validateOptions(mockOptions, mockCallback))
        .rejects.toThrow('Utility function error');
    });

    test('should handle utility functions returning non-array values', async () => {
      mockValidateStringOptions.mockReturnValue(null);
      mockValidateUrlOption.mockReturnValue(undefined);

      // This will cause an error when trying to concat null/undefined
      await expect(validateOptions(mockOptions, mockCallback))
        .rejects.toThrow();
    });
  });

  describe('Realistic Configuration Scenarios', () => {
    test('should validate typical production configuration', async () => {
      const productionOptions = {
        url: 'https://production.cyync.com',
        accessToken: 'prod_token_base64_encoded_value',
        roleId: '12345678-1234-1234-1234-123456789012',
        workspaceIds: 'workspace1,workspace2,workspace3',
        searchScopes: ['assets', 'forms', 'users'],
        searchLimit: 100
      };

      await validateOptions(productionOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, []);
    });

    test('should validate minimal valid configuration', async () => {
      const minimalOptions = {
        url: 'https://test.cyync.com',
        accessToken: 'test_token'
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await validateOptions(minimalOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, []);
      expect(consoleSpy).toHaveBeenCalledWith('No search scopes selected, will default to assets and forms');

      consoleSpy.mockRestore();
    });

    test('should handle configuration with optional fields missing', async () => {
      const partialOptions = {
        url: 'https://staging.cyync.com',
        accessToken: 'staging_token'
        // Missing roleId, workspaceIds, searchScopes, searchLimit
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await validateOptions(partialOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, []);

      consoleSpy.mockRestore();
    });
  });
}); 