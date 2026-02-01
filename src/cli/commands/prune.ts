import { Command } from '@oclif/core';

export default class Prune extends Command {
  static summary = 'Archive a closed session as a reference PR summary.';

  async run(): Promise<void> {
    this.log('Not implemented: prune');
  }
}