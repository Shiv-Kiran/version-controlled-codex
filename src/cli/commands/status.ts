import { Command, Flags } from '@oclif/core';

export default class Status extends Command {
  static summary = 'Show the current ledger session status.';
  static description =
    'Display active session metadata and branch mapping information.';
  static examples = [
    '<%= config.bin %> status',
    '<%= config.bin %> status --json',
  ];

  static flags = {
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
    session: Flags.string({
      description: 'Explicit session identifier to inspect',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Status);
    if (flags.json) {
      this.log(
        JSON.stringify({
          status: 'not_implemented',
          session: flags.session ?? 'current',
        })
      );
      return;
    }

    this.log(`Not implemented: status session=${flags.session ?? 'current'}`);
  }
}
