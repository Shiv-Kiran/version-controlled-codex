import type { GitRunOptions, GitStatusSummary } from '../infra';
import { getStatusSummary, isGitRepo } from '../infra';

export function ensureGitRepo(options: GitRunOptions = {}): void {
  if (!isGitRepo(options)) {
    throw new Error('Not a git repository.');
  }
}

export function ensureCleanWorkingTree(options: GitRunOptions = {}): GitStatusSummary {
  const status = getStatusSummary(options);
  if (status.isDirty) {
    throw new Error('Working tree has uncommitted changes.');
  }

  return status;
}
