import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command';
import { resolveSessionContext } from '../../session-utils';
import { updateSessionStatus } from '../../../ledger';

export default class SessionArchiveCommand extends BaseCommand {
  static summary = 'Archive a closed session.';
  static description = 'Marks the session as archived for long-term reference.';
  static examples = [
    '<%= config.bin %> session:archive',
    '<%= config.bin %> session:archive --session 2026-02-05-deadbeef',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
    session: Flags.string({
      description: 'Session identifier',
    }),
    reason: Flags.string({
      description: 'Archival note',
    }),
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(SessionArchiveCommand);
    this.loadContext(flags);
    const cwd = process.cwd();
    const context = resolveSessionContext({ cwd, sessionId: flags.session });

    const updated = updateSessionStatus(context.sessionId, 'archived', {
      cwd,
      reason: flags.reason,
    });

    if (flags.json) {
      this.log(JSON.stringify(updated, null, 2));
      return;
    }

    this.log(`Archived session ${updated.sessionId}`);
  }
}
