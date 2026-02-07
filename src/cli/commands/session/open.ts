import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command';
import {
  ensureCleanWorkingTree,
  ensureGitRepo,
  parseTrackingPolicy,
  resolveSessionPlan,
} from '../../../core';
import { checkoutBranch, getCurrentBranch } from '../../../infra';
import { upsertSession } from '../../../ledger';

export default class SessionOpenCommand extends BaseCommand {
  static summary = 'Open a new AI session.';
  static description = 'Creates or reuses an AI session branch and marks the session as active.';
  static examples = [
    '<%= config.bin %> session:open "Refactor login flow"',
    '<%= config.bin %> session:open "Refactor login flow" --policy merge-ai',
  ];

  static args = {
    task: Args.string({
      required: true,
      description: 'Task description for the session',
    }),
  };

  static flags = {
    ...BaseCommand.baseFlags,
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
    explore: Flags.boolean({
      default: false,
      description: 'Open as exploratory session',
    }),
    branch: Flags.string({
      description: 'Override target ai branch',
    }),
    base: Flags.string({
      description: 'Base branch to fork from',
    }),
    session: Flags.string({
      description: 'Session identifier override',
    }),
    policy: Flags.string({
      description: 'Tracking policy (mirror-only|rebase-ai|merge-ai|manual)',
      options: ['mirror-only', 'rebase-ai', 'merge-ai', 'manual'],
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(SessionOpenCommand);
    const { config } = this.loadContext(flags);
    const cwd = process.cwd();

    ensureGitRepo({ cwd });
    ensureCleanWorkingTree({ cwd });

    const currentBranch = getCurrentBranch({ cwd });
    const plan = resolveSessionPlan({
      task: args.task,
      currentBranch,
      baseBranch: flags.base,
      branchOverride: flags.branch,
      explore: flags.explore,
      sessionIdOverride: flags.session,
    });

    if (plan.action === 'create') {
      if (plan.baseBranch !== currentBranch) {
        checkoutBranch(plan.baseBranch, { cwd });
      }
      checkoutBranch(plan.branchName, { cwd, create: true });
    } else if (plan.branchName !== currentBranch) {
      checkoutBranch(plan.branchName, { cwd });
    }

    const policy = parseTrackingPolicy(flags.policy ?? config.session?.trackingPolicy);
    const session = upsertSession(
      {
        sessionId: plan.sessionId,
        branch: plan.branchName,
        startedAt: new Date().toISOString(),
        status: 'active',
        trackingPolicy: policy,
        lastPromptSummary: args.task,
      },
      cwd
    );

    const payload = {
      sessionId: session.sessionId,
      branch: session.branch,
      status: session.status,
      trackingPolicy: session.trackingPolicy,
      action: plan.action,
      reason: plan.reason,
    };

    if (flags.json) {
      this.log(JSON.stringify(payload, null, 2));
      return;
    }

    this.log(`Opened session ${session.sessionId} on ${session.branch}`);
  }
}
