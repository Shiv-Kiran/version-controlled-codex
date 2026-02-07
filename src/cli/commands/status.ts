import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command';
import {
  detectBranchDivergence,
  inferHumanBranchFromAiBranch,
  parseTrackingPolicy,
  resolveTrackingPolicyAction,
} from '../../core';
import { getCurrentBranch } from '../../infra';

export default class Status extends BaseCommand {
  static summary = 'Show divergence and tracking status for the current session.';
  static description =
    'Display human/ai branch divergence details and the recommended action for the active tracking policy.';
  static examples = [
    '<%= config.bin %> status',
    '<%= config.bin %> status --json',
    '<%= config.bin %> status --branch main --policy merge-ai',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
    session: Flags.string({
      description: 'Reserved for future session-scoped status views',
    }),
    branch: Flags.string({
      description: 'Human branch to inspect (defaults to inferred current branch)',
    }),
    policy: Flags.string({
      description: 'Tracking policy override (mirror-only|rebase-ai|merge-ai|manual)',
      options: ['mirror-only', 'rebase-ai', 'merge-ai', 'manual'],
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Status);
    const { config } = this.loadContext(flags);
    const cwd = process.cwd();

    const currentBranch = getCurrentBranch({ cwd });
    const inferredHuman = flags.branch
      ? flags.branch
      : currentBranch.startsWith('ai/')
        ? inferHumanBranchFromAiBranch(currentBranch)
        : currentBranch;

    if (!inferredHuman) {
      throw new Error('Unable to infer a human branch. Pass --branch explicitly.');
    }

    const divergence = detectBranchDivergence({
      cwd,
      humanBranch: inferredHuman,
    });

    const policy = parseTrackingPolicy(flags.policy ?? config.session?.trackingPolicy);
    const resolution = resolveTrackingPolicyAction({
      policy,
      divergenceStatus: divergence.status,
    });

    const payload = {
      currentBranch,
      session: flags.session ?? 'current',
      divergence,
      tracking: resolution,
    };

    if (flags.json) {
      this.log(JSON.stringify(payload, null, 2));
      return;
    }

    this.log(`Current Branch: ${currentBranch}`);
    this.log(`Human Branch: ${divergence.humanBranch}`);
    this.log(`AI Branch: ${divergence.aiBranch}`);
    this.log(`Divergence: ${divergence.status} (human +${divergence.aheadHuman}, ai +${divergence.aheadAi})`);
    this.log(`Policy: ${resolution.policy}`);
    this.log(`Recommended Action: ${resolution.action}`);
    this.log(`Reason: ${resolution.reason}`);
  }
}