import { Command } from '@oclif/core';

export default class Save extends Command {
  static summary = 'Generate a PR description from the session traces.';

  async run(): Promise<void> {
    this.log('Not implemented: save');
  }
}