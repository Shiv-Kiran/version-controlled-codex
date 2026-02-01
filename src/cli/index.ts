import { run as oclifRun } from '@oclif/core';

export async function run(argv: string[]): Promise<void> {
  await oclifRun(argv);
}