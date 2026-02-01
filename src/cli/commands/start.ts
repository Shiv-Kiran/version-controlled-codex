import { Args, Command, Flags } from '@oclif/core';

export default class Start extends Command {
  static summary = 'Initialize a new AI session branch.';
  static description =
    'Create or switch to an AI session branch and record session metadata.';
  static examples = [
    '<%= config.bin %> start "init session"',
    '<%= config.bin %> start "init session" --explore',
    '<%= config.bin %> start "init session" --branch ai/2026-02-01-init',
  ];

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
    branch: Flags.string({
      description: 'Override the auto-generated ai/ branch name',
    }),
    base: Flags.string({
      description: 'Base branch to fork from (defaults to current)',
    }),
    session: Flags.string({
      description: 'Optional session identifier override',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Start);
    this.log(
      `Not implemented: start task="${args.task}" explore=${flags.explore} branch=${flags.branch ?? 'auto'} base=${flags.base ?? 'current'} session=${flags.session ?? 'auto'}`
    );
  }
}
