import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command';

export default class Status extends BaseCommand {
  static summary = 'Show the current ledger session status.';
  static description =
    'Display active session metadata and branch mapping information.';
  static examples = [
    '<%= config.bin %> status',
    '<%= config.bin %> status --json',
  ];

  static flags = {
    ...BaseCommand.baseFlags,
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
    this.loadContext(flags);
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