import { Args, Command } from '@oclif/core';

export default class Explore extends Command {
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

  async run(): Promise<void> {
    const { args } = await this.parse(Explore);
    if (args.prompt) {
      this.log(`Not implemented: explore prompt="${args.prompt}"`);
      return;
    }

    this.log('Not implemented: explore');
  }
}
