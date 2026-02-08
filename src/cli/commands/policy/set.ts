import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command';
import { parseTrackingPolicy } from '../../../core';
import { updateSessionTrackingPolicy } from '../../../ledger';
import { resolveSessionContext } from '../../session-utils';

export default class PolicySetCommand extends BaseCommand {
  static summary = 'Set tracking policy for a session.';
  static description = 'Updates tracking policy on the resolved or explicit session.';
  static examples = [
    '<%= config.bin %> policy:set mirror-only',
    '<%= config.bin %> policy:set manual --session 2026-02-08-deadbeef --json',
  ];

  static args = {
    policy: Args.string({
      required: true,
      description: 'Tracking policy (mirror-only|rebase-ai|merge-ai|manual)',
      options: ['mirror-only', 'rebase-ai', 'merge-ai', 'manual'],
    }),
  };

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
    const { args, flags } = await this.parse(PolicySetCommand);
    this.loadContext(flags);
    const cwd = process.cwd();

    const context = resolveSessionContext({ cwd, sessionId: flags.session });
    const policy = parseTrackingPolicy(args.policy);
    const updated = updateSessionTrackingPolicy(context.sessionId, policy, cwd);

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            sessionId: updated.sessionId,
            policy: updated.trackingPolicy,
          },
          null,
          2
        )
      );
      return;
    }

    this.log(`Set policy for ${updated.sessionId}: ${updated.trackingPolicy}`);
  }
}
