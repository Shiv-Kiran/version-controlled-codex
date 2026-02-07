import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command';
import { resolveSessionContext } from '../../session-utils';
import { updateSessionStatus } from '../../../ledger';

export default class SessionReopenCommand extends BaseCommand {
  static summary = 'Reopen an archived or closed session.';
  static description = 'Marks a session as reopened so additional work can continue.';
  static examples = [
    '<%= config.bin %> session:reopen --session 2026-02-05-deadbeef',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
    session: Flags.string({
      required: true,
      description: 'Session identifier',
    }),
    reason: Flags.string({
      description: 'Reason for reopening',
    }),
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(SessionReopenCommand);
    this.loadContext(flags);
    const cwd = process.cwd();
    const context = resolveSessionContext({ cwd, sessionId: flags.session });

    const updated = updateSessionStatus(context.sessionId, 'reopened', {
      cwd,
      reason: flags.reason,
    });

    if (flags.json) {
      this.log(JSON.stringify(updated, null, 2));
      return;
    }

    this.log(`Reopened session ${updated.sessionId}`);
  }
}
