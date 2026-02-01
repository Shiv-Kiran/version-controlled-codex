import { Args, Command, Flags } from '@oclif/core';

export default class Start extends Command {
  static summary = 'Initialize a new AI session branch.';

  static args = {
    task: Args.string({
      required: true,
      description: 'Short task description',
    }),
  };

  static flags = {
    explore: Flags.boolean({
      default: false,
      description: 'Start in explore mode',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Start);
    this.log(`Not implemented: start task="${args.task}" explore=${flags.explore}`);
  }
}