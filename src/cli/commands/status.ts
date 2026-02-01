import { Command, Flags } from '@oclif/core';

export default class Status extends Command {
  static summary = 'Show the current ledger session status.';

  static flags = {
    json: Flags.boolean({
      default: false,
      description: 'Output machine-readable JSON',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Status);
    if (flags.json) {
      this.log('{"status":"not_implemented"}');
      return;
    }

    this.log('Not implemented: status');
  }
}