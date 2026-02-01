import fs from 'node:fs';
import path from 'node:path';
import type { LogFormat, LogLevel } from '../shared/logger';

export type LedgerConfig = {
  openai?: {
    apiKey?: string;
    baseUrl?: string;
    organization?: string;
    project?: string;
    model?: string;
  };
  logging?: {
    level?: LogLevel;
    format?: LogFormat;
  };
  session?: {
    baseBranch?: string;
    branchPrefix?: string;
  };
};

export type ConfigSource = {
  path?: string;
  fromFile: boolean;
  fromEnv: boolean;
};

export type LoadConfigOptions = {
  cwd?: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  overrides?: Partial<LedgerConfig>;
};

const DEFAULT_CONFIG_FILES = ['ledger.config.json', path.join('.codex-ledger', 'config.json')];

function readJson(filePath: string): LedgerConfig {
  const contents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(contents) as LedgerConfig;
}

function mergeConfig(base: LedgerConfig, override: LedgerConfig): LedgerConfig {
  return {
    openai: { ...base.openai, ...override.openai },
    logging: { ...base.logging, ...override.logging },
    session: { ...base.session, ...override.session },
  };
}

export function resolveConfigPath(options: LoadConfigOptions = {}): string | undefined {
  const cwd = options.cwd ?? process.cwd();
  if (options.configPath) {
    const resolved = path.isAbsolute(options.configPath)
      ? options.configPath
      : path.join(cwd, options.configPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Config file not found: ${resolved}`);
    }
    return resolved;
  }

  for (const candidate of DEFAULT_CONFIG_FILES) {
    const fullPath = path.join(cwd, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return undefined;
}

export function loadConfig(options: LoadConfigOptions = {}): {
  config: LedgerConfig;
  source: ConfigSource;
} {
  const env = options.env ?? process.env;
  const configPath = resolveConfigPath(options);
  const fileConfig = configPath ? readJson(configPath) : {};

  const envConfig: LedgerConfig = {
    openai: {
      apiKey: env.OPENAI_API_KEY,
      baseUrl: env.OPENAI_BASE_URL,
      organization: env.OPENAI_ORGANIZATION,
      project: env.OPENAI_PROJECT,
      model: env.OPENAI_MODEL,
    },
    logging: {
      level: env.CODEX_LEDGER_LOG_LEVEL as LogLevel | undefined,
      format: env.CODEX_LEDGER_LOG_FORMAT as LogFormat | undefined,
    },
    session: {
      baseBranch: env.CODEX_LEDGER_BASE_BRANCH,
      branchPrefix: env.CODEX_LEDGER_BRANCH_PREFIX,
    },
  };

  let config = mergeConfig(fileConfig, envConfig);
  if (options.overrides) {
    config = mergeConfig(config, options.overrides);
  }

  return {
    config,
    source: {
      path: configPath,
      fromFile: Boolean(configPath),
      fromEnv: Boolean(
        env.OPENAI_API_KEY ||
          env.OPENAI_BASE_URL ||
          env.OPENAI_ORGANIZATION ||
          env.OPENAI_PROJECT ||
          env.OPENAI_MODEL ||
          env.CODEX_LEDGER_LOG_LEVEL ||
          env.CODEX_LEDGER_LOG_FORMAT ||
          env.CODEX_LEDGER_BASE_BRANCH ||
          env.CODEX_LEDGER_BRANCH_PREFIX
      ),
    },
  };
}