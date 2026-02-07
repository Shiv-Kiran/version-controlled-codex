import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command';
import { resolveSessionContext } from '../../session-utils';
import { updateSessionStatus } from '../../../ledger';

export default class SessionCloseCommand extends BaseCommand {
  static summary = 'Close an active session.';
  static description = 'Marks the target session as closed and records lifecycle metadata.';
  static examples = [
    '<%= config.bin %> session:close',
    '<%= config.bin %> session:close --session 2026-02-05-deadbeef --reason "Completed feature"',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
    session: Flags.string({
      description: 'Session identifier',
    }),
    reason: Flags.string({
      description: 'Reason for closing the session',
    }),
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(SessionCloseCommand);
    this.loadContext(flags);
    const cwd = process.cwd();
    const context = resolveSessionContext({ cwd, sessionId: flags.session });

    const updated = updateSessionStatus(context.sessionId, 'closed', {
      cwd,
      reason: flags.reason,
    });

    if (flags.json) {
      this.log(JSON.stringify(updated, null, 2));
      return;
    }

    this.log(`Closed session ${updated.sessionId}`);
  }
}
