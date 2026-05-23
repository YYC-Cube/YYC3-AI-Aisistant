import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gitHubRepository } from '../../repositories/GitHubRepository';
import type { GitHubBranch, GitHubCommit, GitHubRepository as GitHubRepo } from '../../types/github';

const mockRepo: Partial<GitHubRepo> = {
  id: 1, name: 'test-repo', fullName: 'org/test-repo',
  description: null, isPrivate: false, defaultBranch: 'main',
  htmlUrl: '', apiUrl: '', cloneUrl: '', language: 'TS',
  stargazersCount: 0, forksCount: 0, openIssuesCount: 0, size: 0,
  createdAt: '', updatedAt: '', pushedAt: '', topics: [], archived: false, disabled: false,
};

const mockBranch: Partial<GitHubBranch> = {
  name: 'main', commitSha: 'abc123', isProtected: true,
};

const mockCommit: Partial<GitHubCommit> = {
  sha: 'a1b2c3', message: 'initial commit',
  author: { name: 'test', email: 't@t.com', date: '2024-01-01' },
  htmlUrl: 'https://github.com/test',
};

describe('GitHubRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveRepositories / getRepositories', () => {
    it('should save and retrieve repositories', () => {
      gitHubRepository.saveRepositories([mockRepo as GitHubRepo]);
      const result = gitHubRepository.getRepositories();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-repo');
    });

    it('should return empty array when no repos cached', () => {
      const result = gitHubRepository.getRepositories();
      expect(result).toEqual([]);
    });
  });

  describe('saveBranches / getBranches', () => {
    it('should save and retrieve branches for a repo', () => {
      gitHubRepository.saveBranches('test-repo', [mockBranch as GitHubBranch]);
      const result = gitHubRepository.getBranches('test-repo');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('main');
    });
  });

  describe('saveCommits / getCommits', () => {
    it('should save and retrieve commits for a repo', () => {
      gitHubRepository.saveCommits('test-repo', [mockCommit as GitHubCommit]);
      const result = gitHubRepository.getCommits('test-repo');
      expect(result).toHaveLength(1);
      expect(result[0].sha).toBe('a1b2c3');
    });
  });
});
