import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command';
import { DEFAULT_TRACKING_POLICY, parseTrackingPolicy } from '../../../core';
import { getSession } from '../../../ledger';
import { resolveSessionContext } from '../../session-utils';

export default class PolicyGetCommand extends BaseCommand {
  static summary = 'Get tracking policy for a session.';
  static description = 'Shows the effective tracking policy from session metadata or config defaults.';
  static examples = [
    '<%= config.bin %> policy:get',
    '<%= config.bin %> policy:get --session 2026-02-08-deadbeef --json',
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
    const { flags } = await this.parse(PolicyGetCommand);
    const { config } = this.loadContext(flags);
    const cwd = process.cwd();

    const fallback = parseTrackingPolicy(config.session?.trackingPolicy, DEFAULT_TRACKING_POLICY);
    let sessionId: string | undefined = flags.session;
    let sessionPolicy: string | undefined;

    try {
      const context = resolveSessionContext({ cwd, sessionId: flags.session });
      sessionId = context.sessionId;
      sessionPolicy = getSession(context.sessionId, cwd)?.trackingPolicy;
    } catch {
      // Use fallback when no session can be resolved.
    }

    const effectivePolicy = parseTrackingPolicy(sessionPolicy, fallback);
    const payload = {
      sessionId: sessionId ?? null,
      policy: effectivePolicy,
      source: sessionPolicy ? 'session' : 'config',
    };

    if (flags.json) {
      this.log(JSON.stringify(payload, null, 2));
      return;
    }

    this.log(`Policy: ${payload.policy} (${payload.source})`);
    if (payload.sessionId) {
      this.log(`Session: ${payload.sessionId}`);
    }
  }
}
