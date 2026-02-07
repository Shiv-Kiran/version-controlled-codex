import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command';
import { resolveSessionContext } from '../../session-utils';
import { upsertConflictState } from '../../../ledger';

export default class ConflictResumeCommand extends BaseCommand {
  static summary = 'Resume a paused conflict workflow.';
  static description = 'Transitions conflict state to resumed for a session.';
  static examples = [
    '<%= config.bin %> conflict:resume --session 2026-02-05-deadbeef',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
    session: Flags.string({
      description: 'Session identifier',
    }),
    reason: Flags.string({
      description: 'Reason for resuming',
    }),
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ConflictResumeCommand);
    this.loadContext(flags);
    const cwd = process.cwd();
    const context = resolveSessionContext({ cwd, sessionId: flags.session });

    const state = upsertConflictState(
      context.sessionId,
      {
        status: 'resumed',
        reason: flags.reason ?? 'Manual resume requested.',
        sourceBranch: context.humanBranch,
        aiBranch: context.aiBranch,
      },
      cwd
    );

    if (flags.json) {
      this.log(JSON.stringify(state, null, 2));
      return;
    }

    this.log(`Conflict workflow resumed for ${state.sessionId}`);
  }
}
