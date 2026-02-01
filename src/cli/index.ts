import 'dotenv/config';
import path from 'node:path';
import { run as oclifRun } from '@oclif/core';

export async function run(argv: string[]): Promise<void> {
  const root = path.resolve(__dirname, '..', '..');
  await oclifRun(argv, root);
}