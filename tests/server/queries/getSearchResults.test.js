const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const nock = require('nock');

// Create mock logger instance
const mockLogger = {
  debug: jest.fn(),
  error: jest.fn()
};

// Mock dependencies
jest.mock('polarity-integration-utils', () => ({
  logging: {
    getLogger: jest.fn(() => mockLogger)
  },
  errors: {
    parseErrorToReadableJson: jest.fn(err => ({ 
      message: err.message, 
      stack: err.stack,
      status: err.status 
    }))
  }
}));

const mockRequestsInParallel = jest.fn();

jest.mock('../../../server/request', () => ({
  requestsInParallel: mockRequestsInParallel
}));

const { getSearchResults, getAvailableScopes } = require('../../../server/queries/getSearchResults');

describe('getSearchResults', () => {
  let mockEntities;
  let mockOptions;
  let mockApiResponses;

  beforeEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
    // Clear mock logger calls
    mockLogger.debug.mockClear();
    mockLogger.error.mockClear();

    mockEntities = [
      { type: 'IPv4', value: '10.0.1.100' },
      { type: 'domain', value: 'example.com' },
      { type: 'email', value: 'test@example.com' }
    ];

    mockOptions = {
      url: 'https://staging.cyync.com',
      accessToken: 'test-token',
      roleId: 'test-role-id',
      workspaceIds: ['workspace-1', 'workspace-2'],
      searchScopes: [
        { value: 'assets', display: 'Assets' },
        { value: 'forms', display: 'Forms' }
      ],
      searchLimit: 50
    };

    // Mock API responses based on partner API documentation
    mockApiResponses = [
      // Assets responses for each entity/workspace combination
      [
        {
          id: 'asset-1',
          title: '10.0.1.100',
          description: 'Database server showing suspicious activity',
          type: { title: 'Network Device' },
          status: { title: 'Under Review' },
          workspace: { id: 'workspace-1', title: 'Security Investigation' }
        }
      ],
      [], // No forms for first entity in workspace-1
      [], // No assets for second entity in workspace-1
      [
        {
          id: 'form-1',
          title: 'Malware Activity Report for example.com',
          description: 'Suspicious domain activity detected',
          type: { title: 'Security Incident Report' },
          status: { title: 'Submitted' },
          workspace: { id: 'workspace-1', title: 'Security Investigation' }
        }
      ]
      // Additional empty responses for other combinations...
    ];
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('Main Function Execution', () => {
    test('should process search requests for all entities and scopes', async () => {
      mockRequestsInParallel.mockResolvedValue(mockApiResponses);

      const results = await getSearchResults(mockEntities, mockOptions);

      // Verify requestsInParallel was called with correct parameters
      expect(mockRequestsInParallel).toHaveBeenCalledWith(
        expect.arrayContaining([
          // Should generate requests for each entity × workspace × scope combination
          expect.objectContaining({
            resultId: '10.0.1.100',
            workspaceId: 'workspace-1',
            scope: 'assets',
            route: 'workspaces/workspace-1/assets/',
            method: 'GET',
            qs: expect.objectContaining({
              search: '10.0.1.100',
              type: ''
            })
          }),
          expect.objectContaining({
            resultId: '10.0.1.100',
            workspaceId: 'workspace-1',
            scope: 'forms',
            route: 'workspaces/workspace-1/forms/',
            method: 'GET',
            qs: expect.objectContaining({
              search: '10.0.1.100',
              type: ''
            })
          })
        ]),
        'body.results'
      );

      // Results should be enriched with metadata from requests
      expect(results).toEqual([
        {
          id: 'asset-1',
          title: '10.0.1.100',
          description: 'Database server showing suspicious activity',
          type: { title: 'Network Device' },
          status: { title: 'Under Review' },
          workspace: { id: 'workspace-1', title: 'Security Investigation' },
          scope: 'assets',
          workspaceId: 'workspace-1',
          searchEntity: '10.0.1.100'
        },
        {
          id: 'form-1',
          title: 'Malware Activity Report for example.com',
          description: 'Suspicious domain activity detected',
          type: { title: 'Security Incident Report' },
          status: { title: 'Submitted' },
          workspace: { id: 'workspace-1', title: 'Security Investigation' },
          scope: 'forms',
          workspaceId: 'workspace-2',
          searchEntity: '10.0.1.100'
        }
      ]);
    });

    test('should handle single entity', async () => {
      const singleEntity = [mockEntities[0]];
      const singleResponse = [mockApiResponses[0]];
      
      mockRequestsInParallel.mockResolvedValue(singleResponse);

      const results = await getSearchResults(singleEntity, mockOptions);

      expect(requestsInParallel).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            resultId: '10.0.1.100',
            workspaceId: 'workspace-1',
            scope: 'assets'
          }),
          expect.objectContaining({
            resultId: '10.0.1.100',
            workspaceId: 'workspace-1',
            scope: 'forms'
          }),
          expect.objectContaining({
            resultId: '10.0.1.100',
            workspaceId: 'workspace-2',
            scope: 'assets'
          }),
          expect.objectContaining({
            resultId: '10.0.1.100',
            workspaceId: 'workspace-2',
            scope: 'forms'
          })
        ]),
        'body.results'
      );

      expect(results).toEqual(singleResponse);
    });

    test('should handle empty entities array', async () => {
      mockRequestsInParallel.mockResolvedValue([]);

      const results = await getSearchResults([], mockOptions);

      expect(requestsInParallel).toHaveBeenCalledWith([], 'body.results');
      expect(results).toEqual([]);
    });

    test('should handle null entities', async () => {
      mockRequestsInParallel.mockResolvedValue([]);

      const results = await getSearchResults(null, mockOptions);

      expect(requestsInParallel).toHaveBeenCalledWith([], 'body.results');
      expect(results).toEqual([]);
    });

    test('should handle undefined entities', async () => {
      mockRequestsInParallel.mockResolvedValue([]);

      const results = await getSearchResults(undefined, mockOptions);

      expect(requestsInParallel).toHaveBeenCalledWith([], 'body.results');
      expect(results).toEqual([]);
    });
  });

  describe('Search Request Generation', () => {
    test('should generate correct API endpoints for each scope', async () => {
      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults([mockEntities[0]], mockOptions);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      // Should have requests for each workspace × scope combination
      expect(calls).toEqual(expect.arrayContaining([
        expect.objectContaining({
          route: 'workspaces/workspace-1/assets/',
          scope: 'assets',
          scopeDisplay: 'Assets'
        }),
        expect.objectContaining({
          route: 'workspaces/workspace-1/forms/',
          scope: 'forms',
          scopeDisplay: 'Forms'
        }),
        expect.objectContaining({
          route: 'workspaces/workspace-2/assets/',
          scope: 'assets',
          scopeDisplay: 'Assets'
        }),
        expect.objectContaining({
          route: 'workspaces/workspace-2/forms/',
          scope: 'forms',
          scopeDisplay: 'Forms'
        })
      ]));
    });

    test('should handle single workspace ID', async () => {
      const singleWorkspaceOptions = {
        ...mockOptions,
        workspaceIds: 'single-workspace'
      };

      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults([mockEntities[0]], singleWorkspaceOptions);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      expect(calls).toHaveLength(2); // 1 workspace × 2 scopes
      expect(calls).toEqual(expect.arrayContaining([
        expect.objectContaining({
          workspaceId: 'single-workspace',
          route: 'workspaces/single-workspace/assets/'
        }),
        expect.objectContaining({
          workspaceId: 'single-workspace',
          route: 'workspaces/single-workspace/forms/'
        })
      ]));
    });

    test('should handle string workspaceIds', async () => {
      const stringWorkspaceOptions = {
        ...mockOptions,
        workspaceIds: 'workspace-1,workspace-2'
      };

      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults([mockEntities[0]], stringWorkspaceOptions);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      // Should still generate requests for the single workspace
      expect(calls.some(call => call.workspaceId === 'workspace-1,workspace-2')).toBe(true);
    });

    test('should include correct query parameters', async () => {
      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults([mockEntities[0]], mockOptions);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      calls.forEach(call => {
        expect(call.qs).toEqual({
          search: '10.0.1.100',
          type: ''
        });
        expect(call.method).toBe('GET');
      });
    });

    test('should include entity types in request metadata', async () => {
      const entityWithTypes = [{ 
        ...mockEntities[0], 
        types: ['IPv4', 'IP'] 
      }];

      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults(entityWithTypes, mockOptions);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      calls.forEach(call => {
        expect(call.entityTypes).toEqual(['IPv4', 'IP']);
      });
    });

    test('should handle missing search scopes with empty array', async () => {
      const optionsWithoutScopes = {
        ...mockOptions,
        searchScopes: []
      };

      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults([mockEntities[0]], optionsWithoutScopes);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      expect(calls).toHaveLength(0); // No scopes = no requests
    });

    test('should handle undefined search scopes', async () => {
      const optionsWithoutScopes = {
        ...mockOptions,
        searchScopes: undefined
      };

      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults([mockEntities[0]], optionsWithoutScopes);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      expect(calls).toHaveLength(0); // No scopes = no requests
    });
  });

  describe('Result Enrichment', () => {
    test('should enrich results with metadata from requests', async () => {
      const rawApiResults = [
        [
          { id: 'asset-1', title: 'Test Asset' }
        ],
        [
          { id: 'form-1', title: 'Test Form' }
        ]
      ];

      mockRequestsInParallel.mockResolvedValue(rawApiResults);

      const results = await getSearchResults([mockEntities[0]], mockOptions);

      expect(results).toEqual([
        {
          id: 'asset-1',
          title: 'Test Asset',
          scope: 'assets',
          workspaceId: 'workspace-1',
          searchEntity: '10.0.1.100'
        },
        {
          id: 'form-1', 
          title: 'Test Form',
          scope: 'forms',
          workspaceId: 'workspace-1',
          searchEntity: '10.0.1.100'
        }
      ]);
    });

    test('should handle empty API result arrays', async () => {
      const rawApiResults = [
        [], // Empty assets result
        [
          { id: 'form-1', title: 'Test Form' }
        ],
        [] // Empty forms result
      ];

      mockRequestsInParallel.mockResolvedValue(rawApiResults);

      const results = await getSearchResults([mockEntities[0]], mockOptions);

      expect(results).toEqual([
        {
          id: 'form-1',
          title: 'Test Form',
          scope: 'forms',
          workspaceId: 'workspace-1',
          searchEntity: '10.0.1.100'
        }
      ]);
    });

    test('should handle null API results', async () => {
      const rawApiResults = [
        null,
        [{ id: 'form-1', title: 'Test Form' }],
        undefined
      ];

      mockRequestsInParallel.mockResolvedValue(rawApiResults);

      const results = await getSearchResults([mockEntities[0]], mockOptions);

      expect(results).toEqual([
        {
          id: 'form-1',
          title: 'Test Form',
          scope: 'forms',
          workspaceId: 'workspace-1',
          searchEntity: '10.0.1.100'
        }
      ]);
    });

    test('should handle non-array API results', async () => {
      const rawApiResults = [
        'invalid-result',
        [{ id: 'form-1', title: 'Test Form' }],
        { notAnArray: true }
      ];

      mockRequestsInParallel.mockResolvedValue(rawApiResults);

      const results = await getSearchResults([mockEntities[0]], mockOptions);

      expect(results).toEqual([
        {
          id: 'form-1',
          title: 'Test Form', 
          scope: 'forms',
          workspaceId: 'workspace-1',
          searchEntity: '10.0.1.100'
        }
      ]);
    });
  });

  describe('Logging', () => {
    test('should log search request generation', async () => {
      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults([mockEntities[0]], mockOptions);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          searchRequests: expect.arrayContaining([
            expect.objectContaining({
              entity: '10.0.1.100',
              workspace: 'workspace-1',
              scope: 'assets',
              url: 'workspaces/workspace-1/assets/'
            })
          ])
        }),
        'Generated Partner API Search Requests'
      );
    });

    test('should log search results summary', async () => {
      const mockResults = [
        { id: 'asset-1', scope: 'assets' },
        { id: 'form-1', scope: 'forms' }
      ];

      mockRequestsInParallel.mockResolvedValue([
        [mockResults[0]],
        [mockResults[1]]
      ]);

      await getSearchResults([mockEntities[0]], mockOptions);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          resultCount: 2,
          searchScopes: mockOptions.searchScopes,
          workspaces: mockOptions.workspaceIds,
          resultsByScope: {
            assets: 1,
            forms: 1
          }
        }),
        'Partner API Search Results Retrieved and Enriched'
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle requestsInParallel errors', async () => {
      const apiError = new Error('API service unavailable');
      mockRequestsInParallel.mockRejectedValue(apiError);

      await expect(getSearchResults(mockEntities, mockOptions))
        .rejects
        .toThrow('API service unavailable');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          formattedError: { message: apiError.message, stack: apiError.stack },
          error: apiError,
          searchScopes: mockOptions.searchScopes,
          workspaces: mockOptions.workspaceIds
        }),
        'Getting Partner API Search Results Failed'
      );
    });

    test('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      
      mockRequestsInParallel.mockRejectedValue(timeoutError);

      await expect(getSearchResults(mockEntities, mockOptions))
        .rejects
        .toThrow('Request timeout');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: timeoutError
        }),
        'Getting Partner API Search Results Failed'
      );
    });

    test('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      authError.status = 401;
      
      mockRequestsInParallel.mockRejectedValue(authError);

      await expect(getSearchResults(mockEntities, mockOptions))
        .rejects
        .toThrow('Unauthorized');
    });

    test('should handle missing options', async () => {
      mockRequestsInParallel.mockResolvedValue([]);

      await expect(getSearchResults(mockEntities, null))
        .rejects
        .toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle entities with special characters', async () => {
      const specialEntities = [
        { type: 'domain', value: 'test-domain.com' },
        { type: 'email', value: 'user+tag@example.com' },
        { type: 'IPv4', value: '192.168.1.1/24' }
      ];

      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults(specialEntities, mockOptions);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      expect(calls).toEqual(expect.arrayContaining([
        expect.objectContaining({
          resultId: 'test-domain.com',
          qs: expect.objectContaining({
            search: 'test-domain.com'
          })
        }),
        expect.objectContaining({
          resultId: 'user+tag@example.com',
          qs: expect.objectContaining({
            search: 'user+tag@example.com'
          })
        }),
        expect.objectContaining({
          resultId: '192.168.1.1/24',
          qs: expect.objectContaining({
            search: '192.168.1.1/24'
          })
        })
      ]));
    });

    test('should handle empty string entity values', async () => {
      const emptyValueEntities = [
        { type: 'domain', value: '' },
        { type: 'IPv4', value: '   ' },
        { type: 'email', value: null }
      ];

      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults(emptyValueEntities, mockOptions);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      expect(calls).toEqual(expect.arrayContaining([
        expect.objectContaining({
          resultId: '',
          qs: expect.objectContaining({
            search: ''
          })
        }),
        expect.objectContaining({
          resultId: '   ',
          qs: expect.objectContaining({
            search: '   '
          })
        }),
        expect.objectContaining({
          resultId: null,
          qs: expect.objectContaining({
            search: null
          })
        })
      ]));
    });

    test('should handle extremely long entity values', async () => {
      const longValue = 'a'.repeat(1000);
      const longEntity = [{ type: 'domain', value: longValue }];

      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults(longEntity, mockOptions);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      expect(calls[0].qs.search).toBe(longValue);
      expect(calls[0].resultId).toBe(longValue);
    });

    test('should handle missing workspace IDs', async () => {
      const optionsWithoutWorkspaces = {
        ...mockOptions,
        workspaceIds: undefined
      };

      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults([mockEntities[0]], optionsWithoutWorkspaces);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      expect(calls).toHaveLength(0); // No workspaces = no requests
    });
  });

  describe('Integration with Partner API', () => {
    test('should match expected CYYNC API structure', async () => {
      // Test that our generated requests match the partner API documentation
      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults([mockEntities[0]], mockOptions);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      // Verify endpoint structure matches: /api/v1/workspaces/{workspaceId}/{scope}/
      expect(calls[0].route).toMatch(/^workspaces\/[\w-]+\/(assets|forms|pages|tasks)\/$/);
      
      // Verify required query parameters
      expect(calls[0].qs).toEqual({
        search: expect.any(String),
        type: '' // Empty type parameter as per API docs
      });

      // Verify HTTP method
      expect(calls[0].method).toBe('GET');
    });

    test('should handle all supported search scopes', async () => {
      const allScopesOptions = {
        ...mockOptions,
        searchScopes: [
          { value: 'assets', display: 'Assets' },
          { value: 'forms', display: 'Forms' }, 
          { value: 'pages', display: 'Pages' },
          { value: 'tasks', display: 'Tasks' }
        ]
      };

      mockRequestsInParallel.mockResolvedValue([]);

      await getSearchResults([mockEntities[0]], allScopesOptions);

      const calls = mockRequestsInParallel.mock.calls[0][0];
      
      const scopes = calls.map(call => call.scope);
      expect(scopes).toEqual(expect.arrayContaining(['assets', 'forms', 'pages', 'tasks']));
    });
  });
});

describe('getAvailableScopes', () => {
  test('should return correct available scopes', () => {
    const scopes = getAvailableScopes();
    
    expect(scopes).toEqual([
      { value: 'assets', display: 'Assets' },
      { value: 'forms', display: 'Forms' },
      { value: 'pages', display: 'Pages' },
      { value: 'tasks', display: 'Tasks' }
    ]);
  });

  test('should return consistent scope structure', () => {
    const scopes = getAvailableScopes();
    
    scopes.forEach(scope => {
      expect(scope).toEqual(expect.objectContaining({
        value: expect.any(String),
        display: expect.any(String)
      }));
      expect(scope.value).toBeTruthy();
      expect(scope.display).toBeTruthy();
    });
  });
});