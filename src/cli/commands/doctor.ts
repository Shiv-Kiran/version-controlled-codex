import fs from 'node:fs';
import path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command';
import { ensureLedgerStore, resolveLedgerPaths } from '../../ledger';
import {
  getCurrentBranch,
  getHeadCommitHash,
  getRepoRoot,
  getStatusSummary,
  isGitRepo,
} from '../../infra';

type CheckStatus = 'ok' | 'warn' | 'fail';

type CheckResult = {
  name: string;
  status: CheckStatus;
  details: string;
};

function result(name: string, status: CheckStatus, details: string): CheckResult {
  return { name, status, details };
}

export default class DoctorCommand extends BaseCommand {
  static summary = 'Validate environment and repository readiness.';
  static description =
    'Check git state, configuration, and ledger storage before running sessions.';
  static examples = ['<%= config.bin %> doctor', '<%= config.bin %> doctor --json'];

  static flags = {
    ...BaseCommand.baseFlags,
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(DoctorCommand);
    const { config } = this.loadContext(flags);
    const cwd = process.cwd();

    const checks: CheckResult[] = [];

    if (!isGitRepo({ cwd })) {
      checks.push(result('git', 'fail', 'Not a git repository.'));
      this.output(checks, flags.json);
      return;
    }

    checks.push(result('git', 'ok', 'Git repository detected.'));

    try {
      const repoRoot = getRepoRoot({ cwd });
      checks.push(result('git.root', 'ok', repoRoot));
    } catch (error) {
      checks.push(result('git.root', 'warn', (error as Error).message));
    }

    try {
      const branch = getCurrentBranch({ cwd });
      checks.push(result('git.branch', 'ok', branch));
    } catch (error) {
      checks.push(result('git.branch', 'warn', (error as Error).message));
    }

    try {
      const head = getHeadCommitHash({ cwd });
      checks.push(result('git.head', 'ok', head));
    } catch (error) {
      checks.push(result('git.head', 'warn', (error as Error).message));
    }

    try {
      const status = getStatusSummary({ cwd });
      if (status.isDirty) {
        checks.push(result('git.status', 'warn', 'Working tree has uncommitted changes.'));
      } else {
        checks.push(result('git.status', 'ok', 'Working tree clean.'));
      }
    } catch (error) {
      checks.push(result('git.status', 'warn', (error as Error).message));
    }

    const apiKey = config.openai?.apiKey;
    if (!apiKey) {
      checks.push(result('openai.apiKey', 'warn', 'OPENAI_API_KEY is not set.'));
    } else {
      checks.push(result('openai.apiKey', 'ok', 'OPENAI_API_KEY is set.'));
    }

    const model = config.openai?.model;
    if (!model) {
      checks.push(result('openai.model', 'warn', 'OPENAI_MODEL is not set.'));
    } else {
      checks.push(result('openai.model', 'ok', model));
    }

    try {
      ensureLedgerStore(cwd);
      const paths = resolveLedgerPaths(cwd);
      checks.push(result('ledger.store', 'ok', paths.root));
    } catch (error) {
      checks.push(result('ledger.store', 'warn', (error as Error).message));
    }

    try {
      const repoRoot = getRepoRoot({ cwd });
      const hookPath = path.join(repoRoot, '.git', 'hooks', 'post-commit');
      if (!fs.existsSync(hookPath)) {
        checks.push(result('hooks.post-commit', 'warn', 'Hook not installed.'));
      } else {
        const contents = fs.readFileSync(hookPath, 'utf8');
        if (contents.includes('codex-ledger')) {
          checks.push(result('hooks.post-commit', 'ok', 'Hook installed.'));
        } else {
          checks.push(result('hooks.post-commit', 'warn', 'Hook exists but is not codex-ledger.'));
        }
      }
    } catch (error) {
      checks.push(result('hooks.post-commit', 'warn', (error as Error).message));
    }

    this.output(checks, flags.json);
  }

  private output(checks: CheckResult[], json: boolean): void {
    if (json) {
      this.log(JSON.stringify({ status: 'ok', checks }, null, 2));
      return;
    }

    for (const check of checks) {
      this.log(`[${check.status.toUpperCase()}] ${check.name}: ${check.details}`);
    }
  }
}
