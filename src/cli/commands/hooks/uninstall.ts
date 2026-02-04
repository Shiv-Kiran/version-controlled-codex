import fs from 'node:fs';
import path from 'node:path';
import { Command } from '@oclif/core';
import { getRepoRoot } from '../../../infra';

export default class HooksUninstall extends Command {
  static summary = 'Uninstall git hooks for Codex-Ledger.';
  static description = 'Removes the post-commit hook installed by Codex-Ledger.';
  static examples = ['<%= config.bin %> hooks:uninstall'];

  async run(): Promise<void> {
    const repoRoot = getRepoRoot();
    const hookPath = path.join(repoRoot, '.git', 'hooks', 'post-commit');

    if (!fs.existsSync(hookPath)) {
      this.log('No post-commit hook found.');
      return;
    }

    fs.unlinkSync(hookPath);
    this.log(`Removed post-commit hook at ${hookPath}`);
  }
}
