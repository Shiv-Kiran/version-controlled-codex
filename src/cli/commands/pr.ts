import { Command, Flags } from '@oclif/core';

export default class Pr extends Command {
  static summary = 'Generate or update a PR description for the session.';

  static flags = {
    output: Flags.string({
      description: 'Optional output file path',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Pr);
    if (flags.output) {
      this.log(`Not implemented: pr output="${flags.output}"`);
      return;
    }

    this.log('Not implemented: pr');
  }
}