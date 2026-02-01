import { Command, Flags } from '@oclif/core';
import type { LogFormat, LogLevel, Logger } from '../shared/logger';
import { createLogger } from '../shared/logger';
import type { LedgerConfig } from '../config';
import { loadConfig } from '../config';

export type BaseFlags = {
  config?: string;
  logLevel?: string;
  logFormat?: string;
};

export type CommandContext = {
  config: LedgerConfig;
  logger: Logger;
};

export abstract class BaseCommand extends Command {
  static baseFlags = {
    config: Flags.string({
      description: 'Path to config file',
    }),
    logLevel: Flags.string({
      description: 'Log level (debug|info|warn|error)',
      options: ['debug', 'info', 'warn', 'error'],
    }),
    logFormat: Flags.string({
      description: 'Log format (text|json)',
      options: ['text', 'json'],
    }),
  };

  protected context?: CommandContext;

  protected loadContext(flags: BaseFlags): CommandContext {
    if (this.context) {
      return this.context;
    }

    const { config } = loadConfig({
      cwd: this.config.root,
      configPath: flags.config,
      overrides: {
        logging: {
          level: flags.logLevel as LogLevel | undefined,
          format: flags.logFormat as LogFormat | undefined,
        },
      },
    });

    this.context = {
      config,
      logger: createLogger(config.logging),
    };

    return this.context;
  }
}
