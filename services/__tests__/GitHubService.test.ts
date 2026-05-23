import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/GitHubRepository', () => ({
  gitHubRepository: {
    getRepositories: vi.fn(() => []),
    saveRepositories: vi.fn(),
    getBranches: vi.fn(() => []),
    saveBranches: vi.fn(),
    getCommits: vi.fn(() => []),
    saveCommits: vi.fn(),
  },
}));

import { gitHubService } from '../../services/GitHubService';

describe('GitHubService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConnectionState', () => {
    it('should return connection state with expected fields', () => {
      const state = gitHubService.getConnectionState();
      expect(state).toHaveProperty('isConnected');
      expect(state).toHaveProperty('organization');
      expect(state).toHaveProperty('latency');
      expect(typeof state.isConnected).toBe('boolean');
    });

    it('should return a copy, not the original reference', () => {
      const state1 = gitHubService.getConnectionState();
      const state2 = gitHubService.getConnectionState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('verifyConnection', () => {
    it('should verify connection and return success', async () => {
      const result = await gitHubService.verifyConnection();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.isConnected).toBe(true);
    });

    it('should update lastVerifiedAt timestamp', async () => {
      const result = await gitHubService.verifyConnection();
      const verifiedAt = result.data?.lastVerifiedAt;
      expect(verifiedAt).toBeTruthy();
    });
  });

  describe('listRepositories', () => {
    it('should return repositories', async () => {
      const result = await gitHubService.listRepositories();
      expect(result.success).toBe(true);
      if (result.data) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    it('should return mock repos when no cache exists', async () => {
      const result = await gitHubService.listRepositories(true);
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });
  });

  describe('searchRepositories', () => {
    it('should search repos with query', async () => {
      const result = await gitHubService.searchRepositories({
        query: 'YYC',
        org: 'YY-Nexus',
      });
      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data).toHaveProperty('items');
        expect(result.data).toHaveProperty('totalCount');
      }
    });
  });
});
