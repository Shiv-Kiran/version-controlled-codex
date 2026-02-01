import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command';

export default class Pr extends BaseCommand {
  static summary = 'Generate or update a PR description for the session.';
  static description =
    'Assemble PR notes from trace summaries for the active session.';
  static examples = [
    '<%= config.bin %> pr',
    '<%= config.bin %> pr --output PR_DESCRIPTION.md',
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
    const { flags } = await this.parse(Pr);
    this.loadContext(flags);
    if (flags.output) {
      this.log(
        `Not implemented: pr output="${flags.output}" session=${flags.session ?? 'current'}`
      );
      return;
    }

    this.log(`Not implemented: pr session=${flags.session ?? 'current'}`);
  }
}