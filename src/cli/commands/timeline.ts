import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command';
import { buildTimelineReport, renderTimelineReport } from '../../core';
import { writeSessionReport } from '../../ledger';
import { resolveAuditBranchContext } from '../audit-context';

export default class TimelineCommand extends BaseCommand {
  static summary = 'Show timeline of human and AI commits.';
  static description = 'Builds an ordered timeline from human and AI branch histories.';
  static examples = [
    '<%= config.bin %> timeline',
    '<%= config.bin %> timeline --session 2026-02-05-deadbeef --json',
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
    write: Flags.boolean({
      default: true,
      description: 'Write markdown report under .codex-ledger/reports',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(TimelineCommand);
    this.loadContext(flags);
    const cwd = process.cwd();

    const context = resolveAuditBranchContext({
      cwd,
      sessionId: flags.session,
    });
    const report = buildTimelineReport({
      humanBranch: context.humanBranch,
      aiBranch: context.aiBranch,
      cwd,
    });
    const markdown = renderTimelineReport(report);
    const reportPath = flags.write ? writeSessionReport(context.sessionId, 'timeline', markdown, cwd) : undefined;

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            ...report,
            sessionId: context.sessionId,
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
