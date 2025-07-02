const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock the dataTransformations dependency
jest.mock('../../server/dataTransformations', () => ({
  getResultForThisEntity: jest.fn()
}));

const assembleLookupResults = require('../../server/assembleLookupResults');
const { getResultForThisEntity } = require('../../server/dataTransformations');

describe('assembleLookupResults', () => {
  let mockEntities;
  let mockSearchResults;
  let mockOptions;
  let mockAssetResults;
  let mockFormResults;
  let mockPageResults;
  let mockTaskResults;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEntities = [
      { value: 'example.com', types: ['domain'] },
      { value: '10.0.1.100', types: ['IPv4'] }
    ];

    mockAssetResults = [
      {
        id: 'asset-1',
        scope: 'assets',
        name: 'Database Server',
        hostname: 'db-server-01',
        ipAddress: '10.0.1.100',
        macAddress: '00:11:22:33:44:55',
        riskScore: 8.5,
        status: 'active',
        lastSeen: '2025-01-15T14:20:00.000Z',
        workspaceId: 'workspace-1',
        searchEntity: '10.0.1.100'
      },
      {
        id: 'asset-2',
        scope: 'assets',
        deviceName: 'Web Server',
        ip: '10.0.1.101',
        mac: '00:11:22:33:44:66',
        riskLevel: 3.2,
        status: 'inactive',
        updatedAt: '2025-01-15T10:30:00.000Z',
        workspaceId: 'workspace-1',
        searchEntity: '10.0.1.100'
      }
    ];

    mockFormResults = [
      {
        id: 'form-1',
        title: 'Security Incident Report',
        type: 'incident',
        status: 'active',
        createdAt: '2025-01-15T09:45:00.000Z',
        updatedAt: '2025-01-15T11:30:00.000Z',
        author: 'Security Analyst',
        workspaceId: 'workspace-1',
        searchEntity: 'example.com'
      },
      {
        id: 'form-2',
        name: 'Vulnerability Assessment',
        formType: 'assessment',
        status: 'draft',
        created: '2025-01-08T15:30:00.000Z',
        modified: '2025-01-08T16:45:00.000Z',
        createdBy: 'Security Team',
        workspaceId: 'workspace-2',
        searchEntity: 'example.com'
      }
    ];

    mockPageResults = [
      {
        id: 'page-1',
        scope: 'pages',
        title: 'Incident Response Playbook',
        pageType: 'documentation',
        status: 'published',
        createdAt: '2025-01-14T12:00:00.000Z',
        author: 'IR Team',
        workspaceId: 'workspace-1'
      }
    ];

    mockTaskResults = [
      {
        id: 'task-1',
        scope: 'tasks',
        title: 'Investigate IOC',
        taskType: 'investigation',
        status: 'active',
        priority: 'high',
        assignedTo: 'Analyst1',
        createdAt: '2025-01-15T08:30:00.000Z',
        workspaceId: 'workspace-1'
      },
      {
        id: 'task-2',
        scope: 'tasks',
        name: 'Update Documentation',
        type: 'maintenance',
        status: 'in_progress',
        priority: 'medium',
        assignee: 'Analyst2',
        created: '2025-01-15T10:15:00.000Z',
        workspaceId: 'workspace-1'
      }
    ];

    mockSearchResults = [...mockAssetResults, ...mockFormResults, ...mockPageResults, ...mockTaskResults];

    mockOptions = {
      url: 'https://staging.cyync.com',
      accessToken: 'test-token',
      roleId: 'test-role',
      workspaceIds: ['workspace-1', 'workspace-2'],
      searchScopes: [
        { value: 'assets', display: 'Assets' },
        { value: 'forms', display: 'Forms' },
        { value: 'pages', display: 'Pages' },
        { value: 'tasks', display: 'Tasks' }
      ]
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Main Assembly Function', () => {
    test('should assemble results for entities with data', () => {
      getResultForThisEntity
        .mockReturnValueOnce(mockAssetResults)
        .mockReturnValueOnce(mockFormResults)
        .mockReturnValueOnce([]);

      const results = assembleLookupResults(mockEntities, mockSearchResults, mockOptions);

      expect(results).toHaveLength(2);
      
      // First entity with asset results
      expect(results[0]).toEqual({
        entity: mockEntities[0],
        data: {
          summary: expect.arrayContaining(['Assets: 2', 'High Risk: 1']),
          details: expect.objectContaining({
            assets: expect.objectContaining({
              count: 2,
              items: expect.any(Array),
              summary: expect.objectContaining({
                totalAssets: 2,
                avgRiskScore: 5.9,
                highRiskCount: 1
              })
            }),
            _metadata: expect.objectContaining({
              totalResults: 2,
              resultTypes: ['assets'],
              workspaces: ['workspace-1']
            })
          })
        }
      });

      // Second entity with form results
      expect(results[1]).toEqual({
        entity: mockEntities[1],
        data: {
          summary: expect.arrayContaining(['Forms: 2']),
          details: expect.objectContaining({
            forms: expect.objectContaining({
              count: 2,
              items: expect.any(Array),
              summary: expect.objectContaining({
                totalForms: 2,
                formTypes: ['incident', 'assessment'],
                recentForms: 1
              })
            }),
            _metadata: expect.any(Object)
          })
        }
      });
    });

    test('should handle empty entities array', () => {
      const results = assembleLookupResults([], mockSearchResults, mockOptions);
      
      expect(results).toEqual([]);
      expect(getResultForThisEntity).not.toHaveBeenCalled();
    });

    test('should handle empty search results', () => {
      getResultForThisEntity.mockReturnValue([]);

      const results = assembleLookupResults(mockEntities, [], mockOptions);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.data).toBeNull();
      });
    });

    test('should handle entities with no matching results', () => {
      getResultForThisEntity
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const results = assembleLookupResults(mockEntities, mockSearchResults, mockOptions);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.data).toBeNull();
      });
    });
  });

  describe('Result Organization by Type', () => {
    test('should organize assets correctly', () => {
      getResultForThisEntity.mockReturnValue(mockAssetResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const assetData = results[0].data.details.assets;

      expect(assetData).toEqual({
        count: 2,
        items: [
          {
            id: 'asset-1',
            name: 'Database Server',
            ipAddress: '10.0.1.100',
            macAddress: '00:11:22:33:44:55',
            riskScore: 8.5,
            lastSeen: '2025-01-15T14:20:00.000Z',
            status: 'active',
            workspaceId: 'workspace-1',
            _raw: mockAssetResults[0]
          },
          {
            id: 'asset-2',
            name: 'Web Server',
            ipAddress: '10.0.1.101',
            macAddress: '00:11:22:33:44:66',
            riskScore: 3.2,
            lastSeen: '2025-01-15T10:30:00.000Z',
            status: 'inactive',
            workspaceId: 'workspace-1',
            _raw: mockAssetResults[1]
          }
        ],
        summary: {
          totalAssets: 2,
          avgRiskScore: 5.9,
          highRiskCount: 1
        }
      });
    });

    test('should organize forms correctly', () => {
      getResultForThisEntity.mockReturnValue(mockFormResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const formData = results[0].data.details.forms;

      expect(formData).toEqual({
        count: 2,
        items: [
          {
            id: 'form-1',
            title: 'Security Incident Report',
            type: 'incident',
            status: 'active',
            createdAt: '2025-01-15T09:45:00.000Z',
            updatedAt: '2025-01-15T11:30:00.000Z',
            author: 'Security Analyst',
            workspaceId: 'workspace-1',
            _raw: mockFormResults[0]
          },
          {
            id: 'form-2',
            title: 'Vulnerability Assessment',
            type: 'assessment',
            status: 'draft',
            createdAt: '2025-01-08T15:30:00.000Z',
            updatedAt: '2025-01-08T16:45:00.000Z',
            author: 'Security Team',
            workspaceId: 'workspace-2',
            _raw: mockFormResults[1]
          }
        ],
        summary: {
          totalForms: 2,
          formTypes: ['incident', 'assessment'],
          recentForms: 1
        }
      });
    });

    test('should organize pages correctly', () => {
      getResultForThisEntity.mockReturnValue(mockPageResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const pageData = results[0].data.details.pages;

      expect(pageData).toEqual({
        count: 1,
        items: [
          {
            id: 'page-1',
            title: 'Incident Response Playbook',
            type: 'documentation',
            status: 'published',
            createdAt: '2025-01-14T12:00:00.000Z',
            updatedAt: undefined,
            author: 'IR Team',
            workspaceId: 'workspace-1',
            _raw: mockPageResults[0]
          }
        ],
        summary: {
          totalPages: 1,
          pageTypes: ['documentation'],
          recentPages: 1
        }
      });
    });

    test('should organize tasks correctly', () => {
      getResultForThisEntity.mockReturnValue(mockTaskResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const taskData = results[0].data.details.tasks;

      expect(taskData).toEqual({
        count: 2,
        items: [
          {
            id: 'task-1',
            title: 'Investigate IOC',
            type: 'investigation',
            status: 'active',
            priority: 'high',
            assignee: 'Analyst1',
            createdAt: '2025-01-15T08:30:00.000Z',
            updatedAt: undefined,
            workspaceId: 'workspace-1',
            _raw: mockTaskResults[0]
          },
          {
            id: 'task-2',
            title: 'Update Documentation',
            type: 'maintenance',
            status: 'in_progress',
            priority: 'medium',
            assignee: 'Analyst2',
            createdAt: '2025-01-15T10:15:00.000Z',
            updatedAt: undefined,
            workspaceId: 'workspace-1',
            _raw: mockTaskResults[1]
          }
        ],
        summary: {
          totalTasks: 2,
          activeTasks: 2,
          taskTypes: ['investigation', 'maintenance']
        }
      });
    });

    test('should handle mixed result types correctly', () => {
      const mixedResults = [mockAssetResults[0], mockFormResults[0], mockPageResults[0]];
      getResultForThisEntity.mockReturnValue(mixedResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const details = results[0].data.details;

      expect(details.assets).toBeDefined();
      expect(details.forms).toBeDefined();
      expect(details.pages).toBeDefined();
      expect(details.assets.count).toBe(1);
      expect(details.forms.count).toBe(1);
      expect(details.pages.count).toBe(1);
    });

    test('should include comprehensive metadata', () => {
      getResultForThisEntity.mockReturnValue(mockSearchResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const metadata = results[0].data.details._metadata;

      expect(metadata).toEqual({
        totalResults: mockSearchResults.length,
        searchScopes: mockOptions.searchScopes,
        resultTypes: ['assets', 'forms', 'pages', 'tasks'],
        workspaces: ['workspace-1', 'workspace-2']
      });
    });
  });

  describe('Summary Tag Creation', () => {
    test('should create asset summary tags', () => {
      getResultForThisEntity.mockReturnValue(mockAssetResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const summary = results[0].data.summary;

      expect(summary).toEqual(expect.arrayContaining([
        'Assets: 2',
        'High Risk: 1'
      ]));
    });

    test('should create form summary tags', () => {
      getResultForThisEntity.mockReturnValue(mockFormResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const summary = results[0].data.summary;

      expect(summary).toEqual(expect.arrayContaining([
        'Forms: 2',
        'Recent: 1'
      ]));
    });

    test('should create page summary tags', () => {
      getResultForThisEntity.mockReturnValue(mockPageResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const summary = results[0].data.summary;

      expect(summary).toEqual(['Pages: 1']);
    });

    test('should create task summary tags', () => {
      getResultForThisEntity.mockReturnValue(mockTaskResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const summary = results[0].data.summary;

      expect(summary).toEqual(expect.arrayContaining([
        'Tasks: 2',
        'Active: 2'
      ]));
    });

    test('should not include high risk tag when no high risk assets', () => {
      const lowRiskAssets = [
        { ...mockAssetResults[0], riskScore: 2.1 },
        { ...mockAssetResults[1], riskLevel: 4.5 }
      ];
      getResultForThisEntity.mockReturnValue(lowRiskAssets);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const summary = results[0].data.summary;

      expect(summary).toEqual(['Assets: 2']);
      expect(summary).not.toContain(expect.stringMatching(/High Risk/));
    });

    test('should not include recent tag when no recent forms', () => {
      const oldForms = [
        { ...mockFormResults[0], createdAt: '2025-01-01T09:45:00.000Z' },
        { ...mockFormResults[1], created: '2025-01-01T15:30:00.000Z' }
      ];
      getResultForThisEntity.mockReturnValue(oldForms);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const summary = results[0].data.summary;

      expect(summary).toEqual(['Forms: 2']);
      expect(summary).not.toContain(expect.stringMatching(/Recent/));
    });

    test('should handle unknown result types', () => {
      const unknownResults = [
        { id: 'unknown-1', type: 'custom', name: 'Custom Result' }
      ];
      getResultForThisEntity.mockReturnValue(unknownResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const summary = results[0].data.summary;

      expect(summary).toEqual(['custom: 1']);
    });
  });

  describe('Data Transformations', () => {
    describe('Asset Transformation', () => {
      test('should transform asset with all standard fields', () => {
        const asset = {
          id: 'asset-1',
          name: 'Server1',
          hostname: 'db-server-01',
          ipAddress: '10.0.1.100',
          macAddress: '00:11:22:33:44:55',
          riskScore: 8.5,
          lastSeen: '2025-01-15T14:20:00.000Z',
          status: 'active',
          workspaceId: 'workspace-1'
        };

        getResultForThisEntity.mockReturnValue([asset]);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const transformedAsset = results[0].data.details.assets.items[0];

        expect(transformedAsset).toEqual({
          id: 'asset-1',
          name: 'Server1',
          ipAddress: '10.0.1.100',
          macAddress: '00:11:22:33:44:55',
          riskScore: 8.5,
          lastSeen: '2025-01-15T14:20:00.000Z',
          status: 'active',
          workspaceId: 'workspace-1',
          _raw: asset
        });
      });

      test('should handle alternative field mappings for assets', () => {
        const asset = {
          assetId: 'asset-2',
          deviceName: 'Router1',
          ip: '192.168.1.1',
          mac: '00:11:22:33:44:66',
          riskLevel: 5.2,
          updatedAt: '2025-01-15T10:30:00.000Z',
          workspaceId: 'workspace-1'
        };

        getResultForThisEntity.mockReturnValue([asset]);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const transformedAsset = results[0].data.details.assets.items[0];

        expect(transformedAsset).toEqual({
          id: 'asset-2',
          name: 'Router1',
          ipAddress: '192.168.1.1',
          macAddress: '00:11:22:33:44:66',
          riskScore: 5.2,
          lastSeen: '2025-01-15T10:30:00.000Z',
          status: 'unknown',
          workspaceId: 'workspace-1',
          _raw: asset
        });
      });

      test('should handle missing asset fields gracefully', () => {
        const asset = { id: 'asset-3' };

        getResultForThisEntity.mockReturnValue([asset]);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const transformedAsset = results[0].data.details.assets.items[0];

        expect(transformedAsset).toEqual({
          id: 'asset-3',
          name: undefined,
          ipAddress: undefined,
          macAddress: undefined,
          riskScore: undefined,
          lastSeen: undefined,
          status: 'unknown',
          workspaceId: undefined,
          _raw: asset
        });
      });
    });

    describe('Form Transformation', () => {
      test('should transform form with standard fields', () => {
        const form = {
          id: 'form-1',
          title: 'Incident Report',
          type: 'incident',
          status: 'active',
          createdAt: '2025-01-15T09:45:00.000Z',
          updatedAt: '2025-01-15T11:30:00.000Z',
          author: 'Security Analyst',
          workspaceId: 'workspace-1'
        };

        getResultForThisEntity.mockReturnValue([form]);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const transformedForm = results[0].data.details.forms.items[0];

        expect(transformedForm).toEqual({
          id: 'form-1',
          title: 'Incident Report',
          type: 'incident',
          status: 'active',
          createdAt: '2025-01-15T09:45:00.000Z',
          updatedAt: '2025-01-15T11:30:00.000Z',
          author: 'Security Analyst',
          workspaceId: 'workspace-1',
          _raw: form
        });
      });

      test('should handle alternative field mappings for forms', () => {
        const form = {
          formId: 'form-2',
          name: 'Assessment Form',
          formType: 'assessment',
          created: '2025-01-15T09:45:00.000Z',
          modified: '2025-01-15T11:30:00.000Z',
          createdBy: 'Analyst',
          workspaceId: 'workspace-1'
        };

        getResultForThisEntity.mockReturnValue([form]);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const transformedForm = results[0].data.details.forms.items[0];

        expect(transformedForm).toEqual({
          id: 'form-2',
          title: 'Assessment Form',
          type: 'assessment',
          status: undefined,
          createdAt: '2025-01-15T09:45:00.000Z',
          updatedAt: '2025-01-15T11:30:00.000Z',
          author: 'Analyst',
          workspaceId: 'workspace-1',
          _raw: form
        });
      });
    });

    describe('Page and Task Transformations', () => {
      test('should transform pages correctly', () => {
        const page = {
          pageId: 'page-1',
          name: 'Documentation',
          pageType: 'guide',
          created: '2025-01-15T12:00:00.000Z',
          createdBy: 'Admin',
          workspaceId: 'workspace-1'
        };

        getResultForThisEntity.mockReturnValue([page]);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const transformedPage = results[0].data.details.pages.items[0];

        expect(transformedPage).toEqual({
          id: 'page-1',
          title: 'Documentation',
          type: 'guide',
          status: undefined,
          createdAt: '2025-01-15T12:00:00.000Z',
          updatedAt: undefined,
          author: 'Admin',
          workspaceId: 'workspace-1',
          _raw: page
        });
      });

      test('should transform tasks correctly', () => {
        const task = {
          taskId: 'task-1',
          name: 'Investigation Task',
          taskType: 'investigation',
          status: 'active',
          priority: 'high',
          assignedTo: 'Analyst1',
          created: '2025-01-15T08:30:00.000Z',
          workspaceId: 'workspace-1'
        };

        getResultForThisEntity.mockReturnValue([task]);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const transformedTask = results[0].data.details.tasks.items[0];

        expect(transformedTask).toEqual({
          id: 'task-1',
          title: 'Investigation Task',
          type: 'investigation',
          status: 'active',
          priority: 'high',
          assignee: 'Analyst1',
          createdAt: '2025-01-15T08:30:00.000Z',
          updatedAt: undefined,
          workspaceId: 'workspace-1',
          _raw: task
        });
      });
    });
  });

  describe('Utility Functions', () => {
    describe('Risk Score Calculation', () => {
      test('should calculate average risk score correctly', () => {
        const assetsWithRisk = [
          { id: 'asset-1', scope: 'assets', riskScore: 8.5 },
          { id: 'asset-2', scope: 'assets', riskScore: 4.2 },
          { id: 'asset-3', scope: 'assets', riskLevel: 6.8 }
        ];

        getResultForThisEntity.mockReturnValue(assetsWithRisk);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const avgRisk = results[0].data.details.assets.summary.avgRiskScore;

        expect(avgRisk).toBe(6.5); // (8.5 + 4.2 + 6.8) / 3 = 6.5
      });

      test('should handle assets with no risk scores', () => {
        const assetsNoRisk = [
          { id: 'asset-1', scope: 'assets', name: 'Asset1' },
          { id: 'asset-2', scope: 'assets', name: 'Asset2' }
        ];

        getResultForThisEntity.mockReturnValue(assetsNoRisk);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const avgRisk = results[0].data.details.assets.summary.avgRiskScore;

        expect(avgRisk).toBe(0);
      });

      test('should identify high risk assets correctly', () => {
        const assetsWithHighRisk = [
          { id: 'asset-1', scope: 'assets', riskScore: 9.5 },
          { id: 'asset-2', scope: 'assets', riskScore: 4.2 },
          { id: 'asset-3', scope: 'assets', riskLevel: 8.1 }
        ];

        getResultForThisEntity.mockReturnValue(assetsWithHighRisk);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const highRiskCount = results[0].data.details.assets.summary.highRiskCount;

        expect(highRiskCount).toBe(2); // 9.5 and 8.1 are > 7
      });
    });

    describe('Recent Item Detection', () => {
      test('should detect recent items correctly', () => {
        const now = new Date();
        const recentDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
        const oldDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

        const formsWithRecent = [
          { id: 'form-1', scope: 'forms', createdAt: recentDate.toISOString() },
          { id: 'form-2', scope: 'forms', created: oldDate.toISOString() }
        ];

        getResultForThisEntity.mockReturnValue(formsWithRecent);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        const recentForms = results[0].data.details.forms.summary.recentForms;

        expect(recentForms).toBe(1);
      });
    });

    describe('Type Determination', () => {
      test('should prioritize scope field for type determination', () => {
        const resultWithScope = [
          { id: 'item-1', scope: 'assets', type: 'forms' } // scope should win
        ];

        getResultForThisEntity.mockReturnValue(resultWithScope);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        
        expect(results[0].data.details.assets).toBeDefined();
        expect(results[0].data.details.forms).toBeUndefined();
      });

      test('should fall back to type field when scope is missing', () => {
        const resultWithType = [
          { id: 'item-1', type: 'forms' }
        ];

        getResultForThisEntity.mockReturnValue(resultWithType);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        
        expect(results[0].data.details.forms).toBeDefined();
      });

      test('should handle unknown types gracefully', () => {
        const unknownResult = [
          { id: 'item-1', type: 'unknown_type' }
        ];

        getResultForThisEntity.mockReturnValue(unknownResult);

        const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
        
        expect(results[0].data.details.unknown_type).toBeDefined();
        expect(results[0].data.details.unknown_type.type).toBe('unknown_type');
        expect(results[0].data.details.unknown_type.count).toBe(1);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed search results', () => {
      const malformedResults = [
        null,
        undefined,
        { id: 'valid-1', scope: 'assets' },
        'invalid-string',
        { /* empty object */ }
      ];

      getResultForThisEntity.mockReturnValue(malformedResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      
      // Should still process valid results
      expect(results[0].data).not.toBeNull();
      expect(results[0].data.details.assets.count).toBe(1);
    });

    test('should handle options without searchScopes', () => {
      const optionsNoScopes = { searchLimit: 50 };
      getResultForThisEntity.mockReturnValue(mockAssetResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, optionsNoScopes);
      
      expect(results[0].data.details._metadata.searchScopes).toEqual(['assets', 'forms', 'pages', 'tasks']);
    });

    test('should handle results from different workspaces', () => {
      const multiWorkspaceResults = [
        { id: 'asset-1', scope: 'assets', workspaceId: 'workspace-1' },
        { id: 'asset-2', scope: 'assets', workspaceId: 'workspace-2' },
        { id: 'asset-3', scope: 'assets' } // No workspace
      ];

      getResultForThisEntity.mockReturnValue(multiWorkspaceResults);

      const results = assembleLookupResults([mockEntities[0]], mockSearchResults, mockOptions);
      const workspaces = results[0].data.details._metadata.workspaces;
      
      expect(workspaces).toEqual(['workspace-1', 'workspace-2']);
    });
  });
}); 