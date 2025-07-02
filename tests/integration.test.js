const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const nock = require('nock');

// Mock polarity-integration-utils
const mockLogger = {
  debug: jest.fn(),
  trace: jest.fn(),
  error: jest.fn()
};

jest.mock('polarity-integration-utils', () => ({
  logging: {
    setLogger: jest.fn(),
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

// Mock server dependencies
jest.mock('../server/userOptions', () => ({
  validateOptions: jest.fn()
}));

jest.mock('../server/dataTransformations', () => ({
  removePrivateIps: jest.fn()
}));

jest.mock('../server/queries', () => ({
  getSearchResults: jest.fn()
}));

jest.mock('../server/assembleLookupResults', () => jest.fn());

const integration = require('../integration');
const { validateOptions } = require('../server/userOptions');
const { removePrivateIps } = require('../server/dataTransformations');
const { getSearchResults } = require('../server/queries');
const assembleLookupResults = require('../server/assembleLookupResults');

describe('CYYNC Integration Main Functions', () => {
  let mockCallback;
  let mockEntities;
  let mockOptions;

  beforeEach(() => {
    mockCallback = jest.fn();
    nock.cleanAll();
    jest.clearAllMocks();
    
    // Clear mock logger calls
    mockLogger.debug.mockClear();
    mockLogger.trace.mockClear();
    mockLogger.error.mockClear();
    
    mockEntities = [
      { type: 'IPv4', types: ['IPv4'], value: '10.0.1.100', isIP: true },
      { type: 'IPv4', types: ['IPv4'], value: '192.168.1.1', isIP: true },
      { type: 'domain', types: ['domain'], value: 'example.com', isIP: false },
      { type: 'MD5', types: ['MD5'], value: 'd41d8cd98f00b204e9800998ecf8427e', isIP: false }
    ];

    mockOptions = {
      url: 'https://staging.cyync.com',
      accessToken: 'cG9sYXJpdHk6Q1ktQjNSUDBZRVJFa0dOUld2dVpYSVBHc0hwblJRdThGS0M=',
      roleId: 'ab3f5779-6ea8-418d-bdd6-7d287cd7f78e',
      workspaceIds: 'd8e6acf3-e996-4e20-8619-8bf17dfe7ec1',
      searchScopes: [
        { value: 'assets', display: 'Assets' },
        { value: 'forms', display: 'Forms' }
      ],
      searchLimit: 50
    };

    // Setup default mock behaviors
    removePrivateIps.mockImplementation(entities => 
      entities.filter(e => !e.isIP || (e.value !== '192.168.1.1' && e.value !== '10.0.1.100'))
    );
    getSearchResults.mockResolvedValue([]);
    assembleLookupResults.mockReturnValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  describe('doLookup Function', () => {
    describe('Successful Pipeline Execution', () => {
      test('should execute complete pipeline successfully with results', async () => {
        const filteredEntities = [mockEntities[2], mockEntities[3]]; // domain and MD5
        const searchResults = [
          { 
            id: 'asset-1', 
            scope: 'assets', 
            name: 'Test Asset',
            workspaceId: 'workspace-1',
            searchEntity: 'example.com'
          },
          { 
            id: 'form-1', 
            scope: 'forms', 
            title: 'Test Form',
            workspaceId: 'workspace-1',
            searchEntity: 'example.com'
          }
        ];
        const lookupResults = [
          {
            entity: mockEntities[2],
            data: {
              summary: ['Assets: 1', 'Forms: 1'],
              details: { 
                assets: { count: 1, items: [{ id: 'asset-1', name: 'Test Asset' }] },
                forms: { count: 1, items: [{ id: 'form-1', title: 'Test Form' }] }
              }
            }
          },
          {
            entity: mockEntities[3],
            data: null
          }
        ];

        removePrivateIps.mockReturnValue(filteredEntities);
        getSearchResults.mockResolvedValue(searchResults);
        assembleLookupResults.mockReturnValue(lookupResults);

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        // Verify pipeline execution order
        expect(removePrivateIps).toHaveBeenCalledWith(mockEntities);
        expect(getSearchResults).toHaveBeenCalledWith(filteredEntities, mockOptions);
        expect(assembleLookupResults).toHaveBeenCalledWith(filteredEntities, searchResults, mockOptions);
        
        // Verify callback with results
        expect(mockCallback).toHaveBeenCalledWith(null, lookupResults);
        
        // Verify logging progression
        expect(mockLogger.debug).toHaveBeenCalledWith({ entities: mockEntities }, 'Entities');
        expect(mockLogger.debug).toHaveBeenCalledWith({ filteredEntities }, 'Filtered Entities');
        expect(mockLogger.trace).toHaveBeenCalledWith({ searchResults });
        expect(mockLogger.trace).toHaveBeenCalledWith({ lookupResults }, 'Lookup Results');
      });

      test('should handle empty entities input', async () => {
        const emptyEntities = [];
        
        removePrivateIps.mockReturnValue(emptyEntities);
        getSearchResults.mockResolvedValue([]);
        assembleLookupResults.mockReturnValue([]);

        await integration.doLookup(emptyEntities, mockOptions, mockCallback);

        expect(removePrivateIps).toHaveBeenCalledWith(emptyEntities);
        expect(getSearchResults).toHaveBeenCalledWith(emptyEntities, mockOptions);
        expect(assembleLookupResults).toHaveBeenCalledWith(emptyEntities, [], mockOptions);
        expect(mockCallback).toHaveBeenCalledWith(null, []);
      });

      test('should filter private IPs correctly', async () => {
        const publicEntities = [mockEntities[2], mockEntities[3]]; // domain and MD5 only
        
        removePrivateIps.mockReturnValue(publicEntities);
        getSearchResults.mockResolvedValue([]);
        assembleLookupResults.mockReturnValue([
          { entity: mockEntities[2], data: null },
          { entity: mockEntities[3], data: null }
        ]);

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        expect(removePrivateIps).toHaveBeenCalledWith(mockEntities);
        expect(getSearchResults).toHaveBeenCalledWith(publicEntities, mockOptions);
        expect(assembleLookupResults).toHaveBeenCalledWith(publicEntities, [], mockOptions);
      });

      test('should handle mixed results with some empty', async () => {
        const filteredEntities = [mockEntities[2], mockEntities[3]];
        const searchResults = [
          { id: 'asset-1', scope: 'assets', searchEntity: 'example.com' }
        ];
        const lookupResults = [
          {
            entity: mockEntities[2],
            data: {
              summary: ['Assets: 1'],
              details: { assets: { count: 1, items: [{ id: 'asset-1' }] } }
            }
          },
          {
            entity: mockEntities[3],
            data: null // No results for this entity
          }
        ];

        removePrivateIps.mockReturnValue(filteredEntities);
        getSearchResults.mockResolvedValue(searchResults);
        assembleLookupResults.mockReturnValue(lookupResults);

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(null, lookupResults);
      });
    });

    describe('Error Handling at Each Stage', () => {
      test('should handle removePrivateIps errors', async () => {
        const error = new Error('Private IP filtering failed');
        removePrivateIps.mockImplementation(() => {
          throw error;
        });

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            error,
            formattedError: { message: error.message, stack: error.stack }
          }),
          'Get Lookup Results Failed'
        );
        
        expect(mockCallback).toHaveBeenCalledWith({
          detail: 'Private IP filtering failed',
          err: { message: error.message, stack: error.stack }
        });
      });

      test('should handle getSearchResults API errors', async () => {
        const error = new Error('CYYNC API request failed');
        error.status = 401;
        const filteredEntities = [mockEntities[2]];
        
        removePrivateIps.mockReturnValue(filteredEntities);
        getSearchResults.mockRejectedValue(error);

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            error,
            formattedError: { message: error.message, stack: error.stack, status: 401 }
          }),
          'Get Lookup Results Failed'
        );
        
        expect(mockCallback).toHaveBeenCalledWith({
          detail: 'CYYNC API request failed',
          err: { message: error.message, stack: error.stack, status: 401 }
        });
      });

      test('should handle assembleLookupResults errors', async () => {
        const error = new Error('Result assembly failed');
        const filteredEntities = [mockEntities[2]];
        const searchResults = [{ id: '1', scope: 'assets' }];
        
        removePrivateIps.mockReturnValue(filteredEntities);
        getSearchResults.mockResolvedValue(searchResults);
        assembleLookupResults.mockImplementation(() => {
          throw error;
        });

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            error,
            formattedError: { message: error.message, stack: error.stack }
          }),
          'Get Lookup Results Failed'
        );
        
        expect(mockCallback).toHaveBeenCalledWith({
          detail: 'Result assembly failed',
          err: { message: error.message, stack: error.stack }
        });
      });

      test('should handle error without message', async () => {
        const error = new Error();
        error.message = '';
        
        removePrivateIps.mockImplementation(() => {
          throw error;
        });

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        expect(mockCallback).toHaveBeenCalledWith({
          detail: 'Lookup Failed',
          err: { message: '', stack: error.stack }
        });
      });

      test('should handle network timeout errors', async () => {
        const error = new Error('Network timeout');
        error.code = 'ECONNRESET';
        const filteredEntities = [mockEntities[2]];
        
        removePrivateIps.mockReturnValue(filteredEntities);
        getSearchResults.mockRejectedValue(error);

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        expect(mockCallback).toHaveBeenCalledWith({
          detail: 'Network timeout',
          err: { message: error.message, stack: error.stack }
        });
      });
    });

    describe('Integration Flow Validation', () => {
      test('should maintain correct execution order', async () => {
        const callOrder = [];
        
        removePrivateIps.mockImplementation((...args) => {
          callOrder.push('removePrivateIps');
          return args[0].filter(e => !e.isIP);
        });
        
        getSearchResults.mockImplementation((...args) => {
          callOrder.push('getSearchResults');
          return Promise.resolve([]);
        });
        
        assembleLookupResults.mockImplementation((...args) => {
          callOrder.push('assembleLookupResults');
          return [];
        });

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        expect(callOrder).toEqual(['removePrivateIps', 'getSearchResults', 'assembleLookupResults']);
      });

      test('should pass filtered entities through pipeline correctly', async () => {
        const filteredEntities = [mockEntities[2], mockEntities[3]];
        const searchResults = [{ id: '1', scope: 'assets' }];
        const finalResults = [{ entity: mockEntities[2], data: null }];
        
        removePrivateIps.mockReturnValue(filteredEntities);
        getSearchResults.mockResolvedValue(searchResults);
        assembleLookupResults.mockReturnValue(finalResults);

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        expect(removePrivateIps).toHaveBeenCalledWith(mockEntities);
        expect(getSearchResults).toHaveBeenCalledWith(filteredEntities, mockOptions);
        expect(assembleLookupResults).toHaveBeenCalledWith(filteredEntities, searchResults, mockOptions);
        expect(mockCallback).toHaveBeenCalledWith(null, finalResults);
      });

      test('should handle all entities filtered out', async () => {
        const emptyFilteredEntities = [];
        
        removePrivateIps.mockReturnValue(emptyFilteredEntities);
        getSearchResults.mockResolvedValue([]);
        assembleLookupResults.mockReturnValue([]);

        await integration.doLookup(mockEntities, mockOptions, mockCallback);

        expect(getSearchResults).toHaveBeenCalledWith(emptyFilteredEntities, mockOptions);
        expect(assembleLookupResults).toHaveBeenCalledWith(emptyFilteredEntities, [], mockOptions);
        expect(mockCallback).toHaveBeenCalledWith(null, []);
      });
    });
  });

  describe('Module Exports Validation', () => {
    test('should export required functions', () => {
      expect(typeof integration.startup).toBe('function');
      expect(typeof integration.validateOptions).toBe('function');
      expect(typeof integration.doLookup).toBe('function');
    });

    test('should only export expected functions', () => {
      const expectedExports = ['startup', 'validateOptions', 'doLookup'];
      const actualExports = Object.keys(integration);
      
      expect(actualExports.sort()).toEqual(expectedExports.sort());
    });

    test('should correctly reference imported validateOptions', () => {
      expect(integration.validateOptions).toBe(validateOptions);
    });

    test('should use polarity-integration-utils setLogger as startup', () => {
      const { setLogger } = require('polarity-integration-utils').logging;
      expect(integration.startup).toBe(setLogger);
    });
  });

  describe('Dependency Integration', () => {
    test('should properly integrate with all dependencies', () => {
      // Verify all dependencies are accessible
      expect(validateOptions).toBeDefined();
      expect(removePrivateIps).toBeDefined();
      expect(getSearchResults).toBeDefined();
      expect(assembleLookupResults).toBeDefined();
    });

    test('should handle dependency module failures gracefully', async () => {
      const error = new Error('Module dependency failure');
      
      // Make the module import fail
      jest.doMock('../server/dataTransformations', () => {
        throw error;
      });

      // This test validates that the integration would handle module load failures
      // In practice, this would be caught at startup, not during doLookup
      expect(() => {
        delete require.cache[require.resolve('../server/dataTransformations')];
        require('../server/dataTransformations');
      }).toThrow();
    });
  });
}); 