import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command';

export default class Save extends BaseCommand {
  static summary = 'Generate a PR description from the session traces.';
  static description =
    'Collate trace summaries into a PR_DESCRIPTION.md for review.';
  static examples = [
    '<%= config.bin %> save',
    '<%= config.bin %> save --output PR_DESCRIPTION.md',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
    output: Flags.string({
      description: 'Optional output file path',
    }),
    session: Flags.string({
      description: 'Explicit session identifier to summarize',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Save);
    this.loadContext(flags);
    this.log(
      `Not implemented: save output=${flags.output ?? 'PR_DESCRIPTION.md'} session=${flags.session ?? 'current'}`
    );
  }
}