import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command';

export default class Explore extends BaseCommand {
  static summary = 'Start an exploratory session or run an exploratory prompt.';
  static description =
    'Creates an ephemeral explore branch or runs a prompt in explore mode.';
  static examples = [
    '<%= config.bin %> explore',
    '<%= config.bin %> explore "try rewriting this in Rust"',
  ];

  static args = {
    prompt: Args.string({
      required: false,
      description: 'Optional instruction for explore mode',
    }),
  };

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Explore);
    this.loadContext(flags);
    if (args.prompt) {
      this.log(`Not implemented: explore prompt="${args.prompt}"`);
      return;
    }

    this.log('Not implemented: explore');
  }
}