import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command';
import { ensureLedgerStore, writePendingAnnotation } from '../../ledger';
import { ensureGitRepo } from '../../core';

export default class AnnotateCommand extends BaseCommand {
  static summary = 'Attach a prompt attribution for the next commit.';
  static description =
    'Record a manual prompt annotation to link AI intent to the next human commit.';
  static examples = [
    '<%= config.bin %> annotate "Refactor login for JWT"',
    '<%= config.bin %> annotate "Fix pagination" --model gpt-4.1-mini --session ai-2026-02-01-001',
  ];

  static args = {
    prompt: Args.string({
      required: true,
      description: 'Prompt or instruction to attribute to the next commit',
    }),
  };

  static flags = {
    ...BaseCommand.baseFlags,
    model: Flags.string({
      description: 'Model name used for the AI session (optional)',
    }),
    session: Flags.string({
      description: 'Session identifier to associate with this prompt (optional)',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AnnotateCommand);
    const { logger } = this.loadContext(flags);
    const cwd = process.cwd();

    ensureGitRepo({ cwd });
    ensureLedgerStore(cwd);

    const record = writePendingAnnotation(
      {
        prompt: args.prompt,
        model: flags.model,
        sessionId: flags.session,
      },
      cwd
    );

    logger.info(`Saved prompt attribution ${record.id} for next commit.`);
  }
}
