import { spawnSync } from 'node:child_process';

export type GitRunOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
};

export type GitResult = {
  stdout: string;
  stderr: string;
};

export type GitStatusSummary = {
  raw: string;
  branch: string;
  upstream?: string;
  ahead: number;
  behind: number;
  isDetached: boolean;
  isDirty: boolean;
};

export type GitDiffOptions = GitRunOptions & {
  staged?: boolean;
  paths?: string[];
};

export type GitCommitOptions = GitRunOptions & {
  message: string;
  all?: boolean;
  allowEmpty?: boolean;
};

export type GitCheckoutOptions = GitRunOptions & {
  create?: boolean;
};

export type GitAddOptions = GitRunOptions & {
  paths?: string[];
};

export function runGit(args: string[], options: GitRunOptions = {}): GitResult {
  const result = spawnSync('git', args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    input: options.input,
  });

  if (result.error) {
    throw result.error;
  }

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  if (result.status !== 0) {
    const message = `Git command failed (${result.status}): git ${args.join(' ')}${
      stderr ? `\n${stderr.trim()}` : ''
    }`;
    const error = new Error(message);
    (error as Error & { stdout?: string; stderr?: string; status?: number }).stdout = stdout;
    (error as Error & { stdout?: string; stderr?: string; status?: number }).stderr = stderr;
    (error as Error & { stdout?: string; stderr?: string; status?: number }).status =
      result.status ?? undefined;
    throw error;
  }

  return { stdout, stderr };
}

export function applyPatch(patch: string, options: GitRunOptions = {}): void {
  if (!patch.trim()) {
    return;
  }
  runGit(['apply', '--whitespace=nowarn', '-'], {
    ...options,
    input: patch,
  });
}

export function isGitRepo(options: GitRunOptions = {}): boolean {
  try {
    const result = runGit(['rev-parse', '--is-inside-work-tree'], options);
    return result.stdout.trim() === 'true';
  } catch {
    return false;
  }
}

export function getRepoRoot(options: GitRunOptions = {}): string {
  const result = runGit(['rev-parse', '--show-toplevel'], options);
  return result.stdout.trim();
}

export function getCurrentBranch(options: GitRunOptions = {}): string {
  const result = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], options);
  return result.stdout.trim();
}

export function getHeadCommitHash(options: GitRunOptions = {}): string {
  const result = runGit(['rev-parse', 'HEAD'], options);
  return result.stdout.trim();
}

export function getStatusSummary(options: GitRunOptions = {}): GitStatusSummary {
  const result = runGit(['status', '--porcelain=2', '-b'], options);
  const raw = result.stdout;
  const lines = raw.split('\n').filter((line) => line.length > 0);

  let branch = '';
  let upstream: string | undefined;
  let ahead = 0;
  let behind = 0;
  let isDetached = false;
  let isDirty = false;

  for (const line of lines) {
    if (line.startsWith('# branch.head ')) {
      branch = line.replace('# branch.head ', '');
      if (branch === '(detached)') {
        isDetached = true;
      }
      continue;
    }

    if (line.startsWith('# branch.upstream ')) {
      upstream = line.replace('# branch.upstream ', '');
      continue;
    }

    if (line.startsWith('# branch.ab ')) {
      const parts = line.replace('# branch.ab ', '').trim().split(' ');
      for (const part of parts) {
        if (part.startsWith('+')) {
          ahead = Number(part.slice(1));
        } else if (part.startsWith('-')) {
          behind = Number(part.slice(1));
        }
      }
      continue;
    }

    if (!line.startsWith('#')) {
      isDirty = true;
    }
  }

  return {
    raw,
    branch,
    upstream,
    ahead,
    behind,
    isDetached,
    isDirty,
  };
}

export function getDiff(options: GitDiffOptions = {}): string {
  const args = ['diff', '--no-color'];
  if (options.staged) {
    args.push('--cached');
  }
  if (options.paths && options.paths.length > 0) {
    args.push('--', ...options.paths);
  }

  return runGit(args, options).stdout;
}

export function getCommitMessage(commitHash: string, options: GitRunOptions = {}): string {
  const result = runGit(['log', '-1', '--pretty=%B', commitHash], options);
  return result.stdout.trim();
}

export function getCommitSubject(commitHash: string, options: GitRunOptions = {}): string {
  const result = runGit(['log', '-1', '--pretty=%s', commitHash], options);
  return result.stdout.trim();
}

export function getCommitFiles(commitHash: string, options: GitRunOptions = {}): string[] {
  const result = runGit(['diff-tree', '--no-commit-id', '--name-only', '-r', commitHash], options);
  return result.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

export function getCommitDiffStat(
  fromCommit: string,
  toCommit: string,
  options: GitRunOptions = {}
): string {
  const result = runGit(['diff', '--stat', `${fromCommit}..${toCommit}`], options);
  return result.stdout.trim();
}

export function getCommitDiff(
  fromCommit: string,
  toCommit: string,
  options: GitRunOptions = {}
): string {
  const result = runGit(['diff', '--no-color', `${fromCommit}..${toCommit}`], options);
  return result.stdout;
}

export function updateRef(refName: string, commitHash: string, options: GitRunOptions = {}): void {
  runGit(['update-ref', refName, commitHash], options);
}

export function addChanges(options: GitAddOptions = {}): void {
  const args = ['add'];
  if (options.paths && options.paths.length > 0) {
    args.push('--', ...options.paths);
  } else {
    args.push('-A');
  }

  runGit(args, options);
}

export function commitChanges(options: GitCommitOptions): void {
  const args = ['commit', '-m', options.message];
  if (options.all) {
    args.push('-a');
  }
  if (options.allowEmpty) {
    args.push('--allow-empty');
  }

  runGit(args, options);
}

export function checkoutBranch(name: string, options: GitCheckoutOptions = {}): void {
  const args = ['checkout'];
  if (options.create) {
    args.push('-b');
  }
  args.push(name);
  runGit(args, options);
}

export function createBranch(name: string, options: GitRunOptions = {}): void {
  runGit(['branch', name], options);
}
