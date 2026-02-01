import { Args, Command, Flags } from '@oclif/core';

export default class DoCommand extends Command {
  static summary = 'Execute an AI-assisted change.';
  static description =
    'Run the agent loop for the given prompt and apply changes to the working tree.';
  static examples = [
    '<%= config.bin %> do "refactor login"',
    '<%= config.bin %> do "refactor login" --explore',
    '<%= config.bin %> do "refactor login" --session ai-2026-02-01-001',
  ];

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
    session: Flags.string({
      description: 'Explicit session identifier to reuse',
    }),
    confirm: Flags.boolean({
      default: false,
      description: 'Require explicit confirmation before applying changes',
    }),
    dryRun: Flags.boolean({
      default: false,
      description: 'Compute changes without modifying files',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DoCommand);
    this.log(
      `Not implemented: do prompt="${args.prompt}" explore=${flags.explore} session=${flags.session ?? 'auto'} confirm=${flags.confirm} dryRun=${flags.dryRun}`
    );
  }
}
