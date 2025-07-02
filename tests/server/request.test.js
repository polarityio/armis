const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const nock = require('nock');

// Mock polarity-integration-utils
const mockCreateRequestWithDefaults = jest.fn();
const mockParallelLimit = jest.fn();

jest.mock('polarity-integration-utils', () => ({
  requests: {
    createRequestWithDefaults: mockCreateRequestWithDefaults
  }
}));

jest.mock('async', () => ({
  parallelLimit: mockParallelLimit
}));

// Mock config
jest.mock('../../config/config', () => ({
  name: 'CYYNC',
  logging: { level: 'info' }
}));

describe('Request Module', () => {
  let mockRequestWithDefaults;
  let requestModule;

  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();

    // Mock the request function that will be returned by createRequestWithDefaults
    mockRequestWithDefaults = jest.fn();
    mockCreateRequestWithDefaults.mockReturnValue(mockRequestWithDefaults);
    
    // Mock parallelLimit to execute functions immediately
    mockParallelLimit.mockImplementation(async (functions, limit) => {
      const results = [];
      for (const fn of functions) {
        try {
          const result = await fn();
          results.push(result);
        } catch (error) {
          throw error; // Re-throw errors to test error handling
        }
      }
      return results;
    });

    // Require the module after mocking
    requestModule = require('../../server/request');
  });

  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  describe('Request Module Initialization', () => {
    test('should initialize requestWithDefaults with correct configuration', () => {
      expect(mockCreateRequestWithDefaults).toHaveBeenCalledWith({
        config: expect.objectContaining({
          name: 'CYYNC',
          logging: { level: 'info' }
        }),
        roundedSuccessStatusCodes: [200, 201],
        requestOptionsToOmitFromLogsKeyPaths: ['headers.Authorization'],
        preprocessRequestOptions: expect.any(Function),
        postprocessRequestFailure: expect.any(Function)
      });
    });

    test('should export requestWithDefaults and requestsInParallel functions', () => {
      expect(typeof requestModule.requestWithDefaults).toBe('function');
      expect(typeof requestModule.requestsInParallel).toBe('function');
    });
  });

  describe('Request Preprocessing', () => {
    test('should preprocess request options with CYYNC API URL and authentication', async () => {
      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      const preprocessRequestOptions = configArg.preprocessRequestOptions;

      const mockOptions = {
        url: 'https://staging.cyync.com',
        accessToken: 'cG9sYXJpdHk6Q1ktQjNSUDBZRVJFa0dOUld2dVpYSVBHc0hwblJRdThGS0M=',
        roleId: 'ab3f5779-6ea8-418d-bdd6-7d287cd7f78e'
      };

      const requestOptions = {
        route: 'workspaces/workspace-1/assets/',
        method: 'GET',
        qs: { search: '10.0.1.100', type: '' },
        options: mockOptions,
        resultId: '10.0.1.100'
      };

      const result = await preprocessRequestOptions(requestOptions);

      expect(result).toEqual({
        route: 'workspaces/workspace-1/assets/',
        method: 'GET',
        qs: { search: '10.0.1.100', type: '' },
        resultId: '10.0.1.100',
        url: 'https://staging.cyync.com/api/v1/workspaces/workspace-1/assets/',
        headers: {
          Authorization: 'Bearer cG9sYXJpdHk6Q1ktQjNSUDBZRVJFa0dOUld2dVpYSVBHc0hwblJRdThGS0M=',
          'Role-ID': 'ab3f5779-6ea8-418d-bdd6-7d287cd7f78e',
          'Content-Type': 'application/json'
        },
        json: true
      });
    });

    test('should handle missing route gracefully', async () => {
      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      const preprocessRequestOptions = configArg.preprocessRequestOptions;

      const mockOptions = {
        url: 'https://staging.cyync.com',
        accessToken: 'test-token',
        roleId: 'test-role'
      };

      const requestOptions = {
        method: 'GET',
        options: mockOptions
      };

      const result = await preprocessRequestOptions(requestOptions);

      expect(result.url).toBe('https://staging.cyync.com/api/v1/undefined');
    });

    test('should preserve other request options', async () => {
      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      const preprocessRequestOptions = configArg.preprocessRequestOptions;

      const mockOptions = {
        url: 'https://staging.cyync.com',
        accessToken: 'test-token',
        roleId: 'test-role'
      };

      const requestOptions = {
        route: 'test/route',
        method: 'POST',
        body: { data: 'test' },
        timeout: 5000,
        options: mockOptions,
        customProperty: 'preserved'
      };

      const result = await preprocessRequestOptions(requestOptions);

      expect(result).toEqual(expect.objectContaining({
        method: 'POST',
        body: { data: 'test' },
        timeout: 5000,
        customProperty: 'preserved'
      }));
    });
  });

  describe('Error Postprocessing', () => {
    test('should enhance error with API response details', () => {
      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      const postprocessRequestFailure = configArg.postprocessRequestFailure;

      const error = new Error('Request failed');
      error.status = 401;
      error.description = '{"message": "Invalid authentication token", "error_code": "AUTH_001"}';

      expect(() => {
        postprocessRequestFailure(error);
      }).toThrow('Request failed - (401)| Invalid authentication token');
    });

    test('should handle error response with error field', () => {
      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      const postprocessRequestFailure = configArg.postprocessRequestFailure;

      const error = new Error('Bad Request');
      error.status = 400;
      error.description = '{"error": "Invalid search parameters"}';

      expect(() => {
        postprocessRequestFailure(error);
      }).toThrow('Bad Request - (400)| Invalid search parameters');
    });

    test('should handle malformed error response JSON', () => {
      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      const postprocessRequestFailure = configArg.postprocessRequestFailure;

      const error = new Error('Server Error');
      error.status = 500;
      error.description = 'invalid json';

      expect(() => {
        postprocessRequestFailure(error);
      }).toThrow('Server Error - (500)');
    });

    test('should handle missing error description', () => {
      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      const postprocessRequestFailure = configArg.postprocessRequestFailure;

      const error = new Error('Network Error');
      error.status = 0;

      expect(() => {
        postprocessRequestFailure(error);
      }).toThrow('Network Error - (0)');
    });

    test('should handle empty error response', () => {
      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      const postprocessRequestFailure = configArg.postprocessRequestFailure;

      const error = new Error('Unknown Error');
      error.status = 503;
      error.description = '{}';

      expect(() => {
        postprocessRequestFailure(error);
      }).toThrow('Unknown Error - (503)');
    });
  });

  describe('Parallel Request Functionality', () => {
    test('should execute single request correctly', async () => {
      const mockResponse = {
        body: {
          results: [
            { id: 'asset-1', name: 'Test Asset' }
          ]
        }
      };
      
      mockRequestWithDefaults.mockResolvedValue(mockResponse);

      const requestOptions = [{
        route: 'workspaces/workspace-1/assets/',
        method: 'GET',
        qs: { search: '10.0.1.100' },
        resultId: '10.0.1.100'
      }];

      const results = await requestModule.requestsInParallel(requestOptions, 'body.results');

      expect(results).toEqual([{
        resultId: '10.0.1.100',
        result: [{ id: 'asset-1', name: 'Test Asset' }]
      }]);
    });

    test('should execute multiple requests in parallel', async () => {
      const mockResponse1 = {
        body: {
          results: [{ id: 'asset-1', name: 'Asset 1' }]
        }
      };
      const mockResponse2 = {
        body: {
          results: [{ id: 'form-1', title: 'Form 1' }]
        }
      };

      mockRequestWithDefaults
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const requestOptions = [
        {
          route: 'workspaces/workspace-1/assets/',
          method: 'GET',
          qs: { search: '10.0.1.100' },
          resultId: '10.0.1.100'
        },
        {
          route: 'workspaces/workspace-1/forms/',
          method: 'GET', 
          qs: { search: '10.0.1.100' },
          resultId: '10.0.1.100'
        }
      ];

      const results = await requestModule.requestsInParallel(requestOptions, 'body.results');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        resultId: '10.0.1.100',
        result: [{ id: 'asset-1', name: 'Asset 1' }]
      });
      expect(results[1]).toEqual({
        resultId: '10.0.1.100',
        result: [{ id: 'form-1', title: 'Form 1' }]
      });
      expect(mockRequestWithDefaults).toHaveBeenCalledTimes(2);
    });

    test('should handle requests without resultId', async () => {
      const mockResponse = {
        body: {
          results: [{ id: 'asset-1' }]
        }
      };
      
      mockRequestWithDefaults.mockResolvedValue(mockResponse);

      const requestOptions = [{
        route: 'workspaces/workspace-1/assets/',
        method: 'GET'
      }];

      const results = await requestModule.requestsInParallel(requestOptions, 'body.results');

      expect(results).toEqual([[{ id: 'asset-1' }]]);
    });

    test('should handle requests without responseGetPath', async () => {
      const mockResponse = {
        status: 200,
        body: { results: [{ id: 'asset-1' }] }
      };
      
      mockRequestWithDefaults.mockResolvedValue(mockResponse);

      const requestOptions = [{
        route: 'workspaces/workspace-1/assets/',
        method: 'GET',
        resultId: '10.0.1.100'
      }];

      const results = await requestModule.requestsInParallel(requestOptions);

      expect(results).toEqual([{
        resultId: '10.0.1.100',
        result: mockResponse
      }]);
    });

    test('should filter out empty results when onlyReturnPopulatedResults is true', async () => {
      const mockResponse1 = { body: { results: [] } }; // Empty results
      const mockResponse2 = { body: { results: [{ id: 'asset-1' }] } }; // Non-empty
      const mockResponse3 = { body: { results: null } }; // Null results

      mockRequestWithDefaults
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)
        .mockResolvedValueOnce(mockResponse3);

      const requestOptions = [
        { route: 'empty-endpoint', resultId: 'entity-1' },
        { route: 'populated-endpoint', resultId: 'entity-2' },
        { route: 'null-endpoint', resultId: 'entity-3' }
      ];

      const results = await requestModule.requestsInParallel(requestOptions, 'body.results');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        resultId: 'entity-2',
        result: [{ id: 'asset-1' }]
      });
    });

    test('should return all results when onlyReturnPopulatedResults is false', async () => {
      const mockResponse1 = { body: { results: [] } };
      const mockResponse2 = { body: { results: [{ id: 'asset-1' }] } };

      mockRequestWithDefaults
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const requestOptions = [
        { route: 'empty-endpoint', resultId: 'entity-1' },
        { route: 'populated-endpoint', resultId: 'entity-2' }
      ];

      const results = await requestModule.requestsInParallel(requestOptions, 'body.results', 10, false);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ resultId: 'entity-1', result: [] });
      expect(results[1]).toEqual({ resultId: 'entity-2', result: [{ id: 'asset-1' }] });
    });

    test('should respect parallel limit parameter', async () => {
      // Mock parallelLimit to track how it was called
      mockParallelLimit.mockImplementation(async (functions, limit) => {
        expect(limit).toBe(5);
        return Promise.all(functions.map(fn => fn()));
      });

      mockRequestWithDefaults.mockResolvedValue({ body: { results: [] } });

      const requestOptions = [
        { route: 'endpoint1', resultId: 'entity-1' },
        { route: 'endpoint2', resultId: 'entity-2' },
        { route: 'endpoint3', resultId: 'entity-3' }
      ];

      await requestModule.requestsInParallel(requestOptions, 'body.results', 5);

      expect(mockParallelLimit).toHaveBeenCalledWith(
        expect.any(Array),
        5
      );
    });
  });

  describe('Network Error Scenarios', () => {
    test('should handle network timeout errors', async () => {
      const timeoutError = new Error('ECONNRESET');
      timeoutError.code = 'ECONNRESET';
      mockRequestWithDefaults.mockRejectedValue(timeoutError);

      const requestOptions = [{
        route: 'workspaces/workspace-1/assets/',
        resultId: '10.0.1.100'
      }];

      await expect(requestModule.requestsInParallel(requestOptions, 'body.results'))
        .rejects.toThrow('ECONNRESET');
    });

    test('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      authError.status = 401;
      mockRequestWithDefaults.mockRejectedValue(authError);

      const requestOptions = [{
        route: 'workspaces/workspace-1/assets/',
        resultId: '10.0.1.100'
      }];

      await expect(requestModule.requestsInParallel(requestOptions, 'body.results'))
        .rejects.toThrow('Unauthorized');
    });

    test('should handle API rate limiting', async () => {
      const rateLimitError = new Error('Too Many Requests');
      rateLimitError.status = 429;
      mockRequestWithDefaults.mockRejectedValue(rateLimitError);

      const requestOptions = [{
        route: 'workspaces/workspace-1/assets/',
        resultId: '10.0.1.100'
      }];

      await expect(requestModule.requestsInParallel(requestOptions, 'body.results'))
        .rejects.toThrow('Too Many Requests');
    });

    test('should handle server errors', async () => {
      const serverError = new Error('Internal Server Error');
      serverError.status = 500;
      mockRequestWithDefaults.mockRejectedValue(serverError);

      const requestOptions = [{
        route: 'workspaces/workspace-1/assets/',
        resultId: '10.0.1.100'
      }];

      await expect(requestModule.requestsInParallel(requestOptions, 'body.results'))
        .rejects.toThrow('Internal Server Error');
    });

    test('should handle partial failures in parallel requests', async () => {
      const successResponse = { body: { results: [{ id: 'asset-1' }] } };
      const error = new Error('Request failed');

      mockRequestWithDefaults
        .mockResolvedValueOnce(successResponse)
        .mockRejectedValueOnce(error);

      const requestOptions = [
        { route: 'working-endpoint', resultId: 'entity-1' },
        { route: 'failing-endpoint', resultId: 'entity-2' }
      ];

      await expect(requestModule.requestsInParallel(requestOptions, 'body.results'))
        .rejects.toThrow('Request failed');
    });
  });

  describe('Configuration Validation', () => {
    test('should use default values for missing configuration', async () => {
      // Reset mocks and test with minimal config
      jest.clearAllMocks();
      mockCreateRequestWithDefaults.mockReturnValue(mockRequestWithDefaults);
      
      // Re-require the module to test initialization
      delete require.cache[require.resolve('../../server/request')];
      require('../../server/request');

      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      
      expect(configArg.roundedSuccessStatusCodes).toEqual([200, 201]);
      expect(configArg.requestOptionsToOmitFromLogsKeyPaths).toEqual(['headers.Authorization']);
      expect(typeof configArg.preprocessRequestOptions).toBe('function');
      expect(typeof configArg.postprocessRequestFailure).toBe('function');
    });

    test('should handle malformed options in preprocessing', async () => {
      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      const preprocessRequestOptions = configArg.preprocessRequestOptions;

      const malformedOptions = {
        options: null, // Invalid options
        route: 'test-route'
      };

      await expect(preprocessRequestOptions(malformedOptions))
        .rejects.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty request options array', async () => {
      const results = await requestModule.requestsInParallel([], 'body.results');
      
      expect(results).toEqual([]);
      expect(mockRequestWithDefaults).not.toHaveBeenCalled();
      expect(mockParallelLimit).not.toHaveBeenCalled();
    });

    test('should handle undefined response path gracefully', async () => {
      mockRequestWithDefaults.mockResolvedValue({ body: {} });

      const requestOptions = [{
        route: 'workspaces/workspace-1/assets/',
        resultId: '10.0.1.100'
      }];

      const results = await requestModule.requestsInParallel(requestOptions, 'body.nonexistent.path');

      expect(results).toEqual([]);
    });

    test('should handle response without expected structure', async () => {
      mockRequestWithDefaults.mockResolvedValue('unexpected string response');

      const requestOptions = [{
        route: 'workspaces/workspace-1/assets/',
        resultId: '10.0.1.100'
      }];

      const results = await requestModule.requestsInParallel(requestOptions, 'body.results');

      // Should filter out this invalid response
      expect(results).toEqual([]);
    });

    test('should handle requests with special characters in route', async () => {
      const configArg = mockCreateRequestWithDefaults.mock.calls[0][0];
      const preprocessRequestOptions = configArg.preprocessRequestOptions;

      const mockOptions = {
        url: 'https://staging.cyync.com',
        accessToken: 'test-token',
        roleId: 'test-role'
      };

      const requestOptions = {
        route: 'workspaces/test-workspace/assets/?search=user@domain.com&type=email',
        options: mockOptions
      };

      const result = await preprocessRequestOptions(requestOptions);

      expect(result.url).toBe('https://staging.cyync.com/api/v1/workspaces/test-workspace/assets/?search=user@domain.com&type=email');
    });

    test('should handle large number of parallel requests', async () => {
      const largeRequestSet = Array.from({ length: 50 }, (_, i) => ({
        route: `workspaces/workspace-${i}/assets/`,
        resultId: `entity-${i}`
      }));

      mockRequestWithDefaults.mockResolvedValue({ body: { results: [] } });

      const results = await requestModule.requestsInParallel(largeRequestSet, 'body.results', 20);

      expect(mockParallelLimit).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Function)]),
        20
      );
      expect(results).toEqual([]);
    });
  });
}); 