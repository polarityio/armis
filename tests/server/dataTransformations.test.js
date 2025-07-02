const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

const {
  removePrivateIps,
  getEntityTypes,
  getResultForThisEntity
} = require('../../server/dataTransformations');

describe('dataTransformations', () => {
  let mockEntities;
  let mockResults;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEntities = [
      { type: 'IPv4', types: ['IPv4'], value: '192.168.1.1', isIP: true },
      { type: 'IPv4', types: ['IPv4'], value: '10.0.1.100', isIP: true },
      { type: 'IPv4', types: ['IPv4'], value: '172.16.0.1', isIP: true },
      { type: 'IPv4', types: ['IPv4'], value: '203.0.113.1', isIP: true },
      { type: 'domain', types: ['domain'], value: 'example.com', isIP: false },
      { type: 'email', types: ['email'], value: 'test@example.com', isIP: false },
      { type: 'MD5', types: ['MD5'], value: 'd41d8cd98f00b204e9800998ecf8427e', isIP: false }
    ];

    mockResults = [
      {
        resultId: '203.0.113.1',
        result: [
          { id: 'asset-1', name: 'Public Server', ip: '203.0.113.1' },
          { id: 'asset-2', name: 'Web Server', ip: '203.0.113.1' }
        ]
      },
      {
        resultId: 'example.com',
        result: [
          { id: 'form-1', title: 'Domain Report', domain: 'example.com' }
        ]
      },
      {
        resultId: 'test@example.com',
        result: []
      }
    ];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('removePrivateIps', () => {
    test('should filter out RFC 1918 private IP addresses', () => {
      const entities = [
        { value: '10.0.1.100', isIP: true, types: ['IPv4'] },
        { value: '172.16.5.50', isIP: true, types: ['IPv4'] },
        { value: '192.168.1.1', isIP: true, types: ['IPv4'] },
        { value: '8.8.8.8', isIP: true, types: ['IPv4'] },
        { value: 'example.com', isIP: false, types: ['domain'] }
      ];

      const result = removePrivateIps(entities);

      expect(result).toEqual([
        { value: '8.8.8.8', isIP: true, types: ['IPv4'] },
        { value: 'example.com', isIP: false, types: ['domain'] }
      ]);
    });

    test('should filter out 10.x.x.x private network', () => {
      const entities = [
        { value: '10.0.0.1', isIP: true, types: ['IPv4'] },
        { value: '10.255.255.255', isIP: true, types: ['IPv4'] },
        { value: '10.128.64.32', isIP: true, types: ['IPv4'] },
        { value: '11.0.0.1', isIP: true, types: ['IPv4'] } // Not private
      ];

      const result = removePrivateIps(entities);

      expect(result).toEqual([
        { value: '11.0.0.1', isIP: true, types: ['IPv4'] }
      ]);
    });

    test('should filter out 172.16.x.x to 172.31.x.x private network', () => {
      const entities = [
        { value: '172.15.255.255', isIP: true, types: ['IPv4'] }, // Not private
        { value: '172.16.0.0', isIP: true, types: ['IPv4'] }, // Private
        { value: '172.24.128.1', isIP: true, types: ['IPv4'] }, // Private
        { value: '172.31.255.255', isIP: true, types: ['IPv4'] }, // Private
        { value: '172.32.0.0', isIP: true, types: ['IPv4'] } // Not private
      ];

      const result = removePrivateIps(entities);

      expect(result).toEqual([
        { value: '172.15.255.255', isIP: true, types: ['IPv4'] },
        { value: '172.32.0.0', isIP: true, types: ['IPv4'] }
      ]);
    });

    test('should filter out 192.168.x.x private network', () => {
      const entities = [
        { value: '192.167.255.255', isIP: true, types: ['IPv4'] }, // Not private
        { value: '192.168.0.0', isIP: true, types: ['IPv4'] }, // Private
        { value: '192.168.255.255', isIP: true, types: ['IPv4'] }, // Private
        { value: '192.169.0.0', isIP: true, types: ['IPv4'] } // Not private
      ];

      const result = removePrivateIps(entities);

      expect(result).toEqual([
        { value: '192.167.255.255', isIP: true, types: ['IPv4'] },
        { value: '192.169.0.0', isIP: true, types: ['IPv4'] }
      ]);
    });

    test('should preserve non-IP entities unchanged', () => {
      const entities = [
        { value: 'example.com', isIP: false, types: ['domain'] },
        { value: 'user@domain.com', isIP: false, types: ['email'] },
        { value: 'd41d8cd98f00b204e9800998ecf8427e', isIP: false, types: ['MD5'] },
        { value: '10.0.1.100', isIP: true, types: ['IPv4'] } // Should be filtered
      ];

      const result = removePrivateIps(entities);

      expect(result).toEqual([
        { value: 'example.com', isIP: false, types: ['domain'] },
        { value: 'user@domain.com', isIP: false, types: ['email'] },
        { value: 'd41d8cd98f00b204e9800998ecf8427e', isIP: false, types: ['MD5'] }
      ]);
    });

    test('should handle entities without isIP property', () => {
      const entities = [
        { value: '10.0.1.100', types: ['IPv4'] }, // Missing isIP, should be preserved
        { value: 'example.com', types: ['domain'] }
      ];

      const result = removePrivateIps(entities);

      expect(result).toEqual(entities);
    });

    test('should handle empty entities array', () => {
      const result = removePrivateIps([]);
      expect(result).toEqual([]);
    });

    test('should handle public IP addresses correctly', () => {
      const entities = [
        { value: '8.8.8.8', isIP: true, types: ['IPv4'] }, // Google DNS
        { value: '1.1.1.1', isIP: true, types: ['IPv4'] }, // Cloudflare DNS
        { value: '208.67.222.222', isIP: true, types: ['IPv4'] }, // OpenDNS
        { value: '74.125.224.72', isIP: true, types: ['IPv4'] } // Google
      ];

      const result = removePrivateIps(entities);

      expect(result).toEqual(entities);
    });

    test('should handle mixed IP and non-IP entities', () => {
      const entities = [
        { value: '192.168.1.1', isIP: true, types: ['IPv4'] }, // Private, should be filtered
        { value: 'example.com', isIP: false, types: ['domain'] }, // Non-IP, preserved
        { value: '8.8.8.8', isIP: true, types: ['IPv4'] }, // Public, preserved
        { value: 'test@example.com', isIP: false, types: ['email'] } // Non-IP, preserved
      ];

      const result = removePrivateIps(entities);

      expect(result).toEqual([
        { value: 'example.com', isIP: false, types: ['domain'] },
        { value: '8.8.8.8', isIP: true, types: ['IPv4'] },
        { value: 'test@example.com', isIP: false, types: ['email'] }
      ]);
    });
  });

  describe('getEntityTypes', () => {
    const mockEntities = [
      { value: '10.0.1.100', types: ['IPv4'] },
      { value: 'example.com', types: ['domain'] },
      { value: 'test@example.com', types: ['email'] },
      { value: 'd41d8cd98f00b204e9800998ecf8427e', types: ['MD5', 'hash'] },
      { value: 'Mixed.Case.Domain.Com', types: ['Domain'] }
    ];

    test('should filter entities by single type string (case-insensitive)', () => {
      const result = getEntityTypes('ipv4', mockEntities);
      
      expect(result).toEqual([
        { value: '10.0.1.100', types: ['IPv4'] }
      ]);
    });

    test('should filter entities by single type string with different casing', () => {
      const result = getEntityTypes('DOMAIN', mockEntities);
      
      expect(result).toEqual([
        { value: 'example.com', types: ['domain'] },
        { value: 'Mixed.Case.Domain.Com', types: ['Domain'] }
      ]);
    });

    test('should filter entities by array of types', () => {
      const result = getEntityTypes(['IPv4', 'email'], mockEntities);
      
      expect(result).toEqual([
        { value: '10.0.1.100', types: ['IPv4'] },
        { value: 'test@example.com', types: ['email'] }
      ]);
    });

    test('should filter entities by array of types (case-insensitive)', () => {
      const result = getEntityTypes(['md5', 'DOMAIN'], mockEntities);
      
      expect(result).toEqual([
        { value: 'example.com', types: ['domain'] },
        { value: 'd41d8cd98f00b204e9800998ecf8427e', types: ['MD5', 'hash'] },
        { value: 'Mixed.Case.Domain.Com', types: ['Domain'] }
      ]);
    });

    test('should handle entities with multiple types', () => {
      const result = getEntityTypes('hash', mockEntities);
      
      expect(result).toEqual([
        { value: 'd41d8cd98f00b204e9800998ecf8427e', types: ['MD5', 'hash'] }
      ]);
    });

    test('should return empty array when no entities match', () => {
      const result = getEntityTypes('nonexistent', mockEntities);
      
      expect(result).toEqual([]);
    });

    test('should handle empty entity array', () => {
      const result = getEntityTypes('IPv4', []);
      
      expect(result).toEqual([]);
    });

    test('should handle empty types array', () => {
      const result = getEntityTypes([], mockEntities);
      
      expect(result).toEqual([]);
    });

    test('should handle entities without types property', () => {
      const entitiesWithoutTypes = [
        { value: '10.0.1.100' }, // Missing types
        { value: 'example.com', types: ['domain'] }
      ];
      
      const result = getEntityTypes('domain', entitiesWithoutTypes);
      
      expect(result).toEqual([
        { value: 'example.com', types: ['domain'] }
      ]);
    });

    test('should handle entities with empty types array', () => {
      const entitiesWithEmptyTypes = [
        { value: '10.0.1.100', types: [] },
        { value: 'example.com', types: ['domain'] }
      ];
      
      const result = getEntityTypes('domain', entitiesWithEmptyTypes);
      
      expect(result).toEqual([
        { value: 'example.com', types: ['domain'] }
      ]);
    });

    test('should handle case-insensitive matching correctly', () => {
      const entitiesWithMixedCase = [
        { value: 'test1', types: ['IPv4'] },
        { value: 'test2', types: ['ipv4'] },
        { value: 'test3', types: ['IPV4'] },
        { value: 'test4', types: ['Ipv4'] }
      ];
      
      const result = getEntityTypes('ipv4', entitiesWithMixedCase);
      
      expect(result).toHaveLength(4);
      expect(result).toEqual(entitiesWithMixedCase);
    });
  });

  describe('getResultForThisEntity', () => {
    test('should return flattened results for matching entity', () => {
      const entity = { value: '10.0.1.100', types: ['IPv4'] };
      
      const result = getResultForThisEntity(entity, mockResults);
      
      expect(result).toEqual([
        { id: 'asset-1', name: 'Server 1', type: 'server' },
        { id: 'asset-2', name: 'Server 2', type: 'server' },
        { id: 'form-1', title: 'Security Form', type: 'form' }
      ]);
    });

    test('should return results for single matching entity', () => {
      const entity = { value: 'example.com', types: ['domain'] };
      
      const result = getResultForThisEntity(entity, mockResults);
      
      expect(result).toEqual([
        { id: 'form-1', title: 'Domain Report', domain: 'example.com' }
      ]);
    });

    test('should return empty array for entity with no results', () => {
      const entity = { value: 'nonexistent.com', types: ['domain'] };
      
      const result = getResultForThisEntity(entity, mockResults);
      
      expect(result).toEqual([]);
    });

    test('should return empty array for entity with empty result set', () => {
      const entity = { value: 'test@example.com', types: ['email'] };
      
      const result = getResultForThisEntity(entity, mockResults);
      
      expect(result).toEqual([]);
    });

    test('should handle entity value matching with case sensitivity', () => {
      const resultsWithCase = [
        {
          resultId: 'Example.Com',
          result: [{ id: 'test-1' }]
        },
        {
          resultId: 'example.com',
          result: [{ id: 'test-2' }]
        }
      ];
      
      const entity1 = { value: 'Example.Com', types: ['domain'] };
      const entity2 = { value: 'example.com', types: ['domain'] };
      
      const result1 = getResultForThisEntity(entity1, resultsWithCase);
      const result2 = getResultForThisEntity(entity2, resultsWithCase);
      
      expect(result1).toEqual([{ id: 'test-1' }]);
      expect(result2).toEqual([{ id: 'test-2' }]);
    });

    test('should handle onlyOneResultExpected flag', () => {
      const entity = { value: '10.0.1.100', types: ['IPv4'] };
      
      const result = getResultForThisEntity(entity, mockResults, true);
      
      expect(result).toEqual({ id: 'asset-1', name: 'Server 1', type: 'server' });
    });

    test('should handle onlyReturnUniqueResults flag', () => {
      const resultsWithDuplicates = [
        {
          resultId: 'test.com',
          result: [
            { id: 'item-1', name: 'Test' },
            { id: 'item-1', name: 'Test' }, // Duplicate
            { id: 'item-2', name: 'Other' }
          ]
        }
      ];
      
      const entity = { value: 'test.com', types: ['domain'] };
      
      const result = getResultForThisEntity(entity, resultsWithDuplicates, false, true);
      
      expect(result).toEqual([
        { id: 'item-1', name: 'Test' },
        { id: 'item-2', name: 'Other' }
      ]);
    });

    test('should handle both onlyOneResultExpected and onlyReturnUniqueResults flags', () => {
      const resultsWithDuplicates = [
        {
          resultId: 'test.com',
          result: [
            { id: 'item-1', name: 'Test' },
            { id: 'item-1', name: 'Test' } // Duplicate
          ]
        }
      ];
      
      const entity = { value: 'test.com', types: ['domain'] };
      
      const result = getResultForThisEntity(entity, resultsWithDuplicates, true, true);
      
      expect(result).toEqual({ id: 'item-1', name: 'Test' });
    });

    test('should handle empty results array', () => {
      const entity = { value: '10.0.1.100', types: ['IPv4'] };
      
      const result = getResultForThisEntity(entity, []);
      
      expect(result).toEqual([]);
    });

    test('should handle malformed result objects', () => {
      const malformedResults = [
        { resultId: '10.0.1.100' }, // Missing result property
        { result: [{ id: 'test' }] }, // Missing resultId
        {
          resultId: '10.0.1.100',
          result: [{ id: 'valid-result' }]
        }
      ];
      
      const entity = { value: '10.0.1.100', types: ['IPv4'] };
      
      const result = getResultForThisEntity(entity, malformedResults);
      
      // Should include undefined from first result, then valid result
      expect(result).toEqual([undefined, { id: 'valid-result' }]);
    });

    test('should handle null and undefined results gracefully', () => {
      const resultsWithNulls = [
        {
          resultId: '10.0.1.100',
          result: null
        },
        {
          resultId: '10.0.1.100',
          result: undefined
        },
        {
          resultId: '10.0.1.100',
          result: [{ id: 'valid-result' }]
        }
      ];
      
      const entity = { value: '10.0.1.100', types: ['IPv4'] };
      
      const result = getResultForThisEntity(entity, resultsWithNulls);
      
      // Should include null, undefined, and then valid result
      expect(result).toEqual([null, undefined, { id: 'valid-result' }]);
    });
  });

  describe('Integration Workflow', () => {
    test('should work together in a typical integration flow', () => {
      // 1. Start with mixed entities including private IPs
      const originalEntities = [
        { value: '192.168.1.1', isIP: true, types: ['IPv4'] }, // Private, filtered out
        { value: '8.8.8.8', isIP: true, types: ['IPv4'] }, // Public, kept
        { value: 'example.com', isIP: false, types: ['domain'] }, // Non-IP, kept
        { value: 'test@example.com', isIP: false, types: ['email'] } // Non-IP, kept
      ];

      // 2. Remove private IPs
      const filteredEntities = removePrivateIps(originalEntities);
      
      expect(filteredEntities).toHaveLength(3);
      expect(filteredEntities).not.toContainEqual(
        expect.objectContaining({ value: '192.168.1.1' })
      );

      // 3. Get only IP entities
      const ipEntities = getEntityTypes('IPv4', filteredEntities);
      
      expect(ipEntities).toEqual([
        { value: '8.8.8.8', isIP: true, types: ['IPv4'] }
      ]);

      // 4. Process mock results
      const mockResults = [
        {
          resultId: '8.8.8.8',
          result: [{ id: 'dns-server', name: 'Google DNS' }]
        }
      ];

      const entityResults = getResultForThisEntity(ipEntities[0], mockResults);
      
      expect(entityResults).toEqual([
        { id: 'dns-server', name: 'Google DNS' }
      ]);
    });

    test('should handle edge case integration workflow', () => {
      // All entities are private IPs
      const allPrivateEntities = [
        { value: '10.0.1.1', isIP: true, types: ['IPv4'] },
        { value: '172.16.0.1', isIP: true, types: ['IPv4'] },
        { value: '192.168.1.1', isIP: true, types: ['IPv4'] }
      ];

      const filteredEntities = removePrivateIps(allPrivateEntities);
      expect(filteredEntities).toEqual([]);

      const ipEntities = getEntityTypes('IPv4', filteredEntities);
      expect(ipEntities).toEqual([]);

      const results = getResultForThisEntity({ value: 'nonexistent' }, []);
      expect(results).toEqual([]);
    });

    test('should handle malformed data throughout workflow', () => {
      const malformedEntities = [
        { value: '10.0.1.1' }, // Missing isIP and types
        { value: 'example.com', isIP: false, types: ['domain'] } // Valid
      ];

      // Should handle missing properties gracefully
      // Entities without isIP property are preserved
      const filteredEntities = removePrivateIps(malformedEntities);
      expect(filteredEntities).toEqual([
        { value: '10.0.1.1' }, // Preserved because isIP is falsy
        { value: 'example.com', isIP: false, types: ['domain'] }
      ]);

      const domainEntities = getEntityTypes('domain', filteredEntities);
      expect(domainEntities).toEqual([
        { value: 'example.com', isIP: false, types: ['domain'] }
      ]);
    });
  });
}); 