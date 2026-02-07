import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command';
import { buildExplainReport, renderExplainReport } from '../../core';
import { writeSessionReport } from '../../ledger';
import { resolveAuditBranchContext } from '../audit-context';

export default class ExplainCommand extends BaseCommand {
  static summary = 'Explain a commit with ledger context.';
  static description = 'Displays commit details and attached trace metadata when available.';
  static examples = [
    '<%= config.bin %> explain <commit_hash>',
    '<%= config.bin %> explain <commit_hash> --json',
  ];

  static args = {
    commit: Args.string({
      required: true,
      description: 'Commit hash to explain',
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
    write: Flags.boolean({
      default: true,
      description: 'Write markdown report under .codex-ledger/reports',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ExplainCommand);
    this.loadContext(flags);
    const cwd = process.cwd();

    const context = resolveAuditBranchContext({
      cwd,
      sessionId: flags.session,
    });
    const report = buildExplainReport({
      commitHash: args.commit,
      humanBranch: context.humanBranch,
      aiBranch: context.aiBranch,
      cwd,
    });
    const markdown = renderExplainReport(report);
    const reportPath = flags.write ? writeSessionReport(context.sessionId, 'explain', markdown, cwd) : undefined;

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            sessionId: context.sessionId,
            ...report,
            reportPath,
          },
          null,
          2
        )
      );
      return;
    }

    this.log(markdown.trimEnd());
    if (reportPath) {
      this.log(`\nSaved report: ${reportPath}`);
    }
  }
}
