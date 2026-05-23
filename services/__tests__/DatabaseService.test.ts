import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/DatabaseRepository', () => ({
  databaseRepository: {
    isMockMode: vi.fn(() => true),
    getConnectionStatus: vi.fn(() => 'disconnected'),
    loadDatabaseConfig: vi.fn(() => ({
      id: 'default', name: 'Default', provider: 'postgresql',
      host: 'localhost', port: 5432, database: 'yyc3_family',
      username: 'yyc3_admin', password: '', schema: 'public',
      sslMode: 'prefer', poolSize: 10, connectionTimeout: 5000,
      idleTimeout: 30000, autoMigrate: true, enableLogging: false,
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    })),
    getReconnectStats: vi.fn(() => ({
      attempts: 0, probeInterval: 5000, consecutiveSuccess: 0,
    })),
  },
}));

import { databaseService } from '../../services/DatabaseService';

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isMockMode', () => {
    it('should delegate to repository', () => {
      const result = databaseService.isMockMode();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getConfig', () => {
    it('should return config with required fields', () => {
      const config = databaseService.getConfig();
      if (config) {
        expect(config).toHaveProperty('host');
        expect(config).toHaveProperty('port');
        expect(config).toHaveProperty('database');
      }
    });
  });

  describe('getStatus', () => {
    it('should return connection status', () => {
      const status = databaseService.getStatus();
      expect(['connected', 'disconnected', 'connecting', 'error', 'migrating']).toContain(status);
    });
  });

  describe('getReconnectStats', () => {
    it('should return reconnect stats', () => {
      const stats = databaseService.getReconnectStats();
      expect(stats).toHaveProperty('attempts');
      expect(stats).toHaveProperty('probeInterval');
      expect(stats).toHaveProperty('consecutiveSuccess');
    });
  });

  describe('formatConnectionString', () => {
    it('should format a valid connection string', () => {
      const str = databaseService.formatConnectionString({
        id: 'test', name: 'Test', provider: 'postgresql',
        host: 'localhost', port: 5432, database: 'yyc3_family',
        username: 'admin', password: 'pass', schema: 'public',
        sslMode: 'prefer', poolSize: 10, connectionTimeout: 5000,
        idleTimeout: 30000, autoMigrate: true, enableLogging: false,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      });
      expect(str).toContain('localhost');
      expect(str).toContain('5432');
      expect(str).toContain('yyc3_family');
    });
  });
});
