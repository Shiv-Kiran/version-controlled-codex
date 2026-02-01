import { Args, Command, Flags } from '@oclif/core';

export default class DoCommand extends Command {
  static summary = 'Execute an AI-assisted change.';

  static args = {
    prompt: Args.string({
      required: true,
      description: 'Instruction for the agent',
    }),
  };

  static flags = {
    explore: Flags.boolean({
      default: false,
      description: 'Run in explore mode',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DoCommand);
    this.log(`Not implemented: do prompt="${args.prompt}" explore=${flags.explore}`);
  }
}