import fs from 'node:fs';
import path from 'node:path';
import { Command, Flags } from '@oclif/core';
import { getRepoRoot } from '../../../infra';

function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function resolveHookTarget(): string {
  // Resolve the built hook runner inside the installed package
  const resolved = require.resolve('../../../hooks/post-commit.js', {
    paths: [__dirname],
  });
  return resolved;
}

export default class HooksInstall extends Command {
  static summary = 'Install git hooks for Codex-Ledger.';
  static description = 'Installs a post-commit hook to mirror human commits into ai/*.';
  static examples = ['<%= config.bin %> hooks:install'];

  static flags = {
    force: Flags.boolean({
      default: false,
      description: 'Overwrite existing hook if present',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(HooksInstall);
    const repoRoot = getRepoRoot();
    const hooksDir = path.join(repoRoot, '.git', 'hooks');
    const hookPath = path.join(hooksDir, 'post-commit');

    if (!fs.existsSync(hooksDir)) {
      throw new Error('No .git/hooks directory found. Are you in a git repo?');
    }

    if (fs.existsSync(hookPath) && !flags.force) {
      this.log('post-commit hook already exists. Use --force to overwrite.');
      return;
    }

    const target = toPosixPath(resolveHookTarget());
    const script = [
      '#!/bin/sh',
      '# Codex-Ledger post-commit hook',
      `node "${target}"`,
      '',
    ].join('\n');

    fs.writeFileSync(hookPath, script, { encoding: 'utf8' });
    fs.chmodSync(hookPath, 0o755);

    this.log(`Installed post-commit hook at ${hookPath}`);
  }
}
