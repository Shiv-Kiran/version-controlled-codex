import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command';
import { resolveSessionContext } from '../../session-utils';
import { readConflictState } from '../../../ledger';

export default class ConflictStatusCommand extends BaseCommand {
  static summary = 'Show conflict status for a session.';
  static description = 'Reads conflict state from ledger conflict store.';
  static examples = [
    '<%= config.bin %> conflict:status',
    '<%= config.bin %> conflict:status --session 2026-02-05-deadbeef --json',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
    session: Flags.string({
      description: 'Session identifier',
    }),
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ConflictStatusCommand);
    this.loadContext(flags);
    const cwd = process.cwd();
    const context = resolveSessionContext({ cwd, sessionId: flags.session });

    const state =
      readConflictState(context.sessionId, cwd) ??
      ({
        sessionId: context.sessionId,
        status: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceBranch: context.humanBranch,
        aiBranch: context.aiBranch,
      } as const);

    if (flags.json) {
      this.log(JSON.stringify(state, null, 2));
      return;
    }

    this.log(`Session: ${state.sessionId}`);
    this.log(`Status: ${state.status}`);
    this.log(`Source Branch: ${state.sourceBranch ?? 'unknown'}`);
    this.log(`AI Branch: ${state.aiBranch ?? 'unknown'}`);
  }
}
