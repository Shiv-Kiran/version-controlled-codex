export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'text' | 'json';

export type LoggerOptions = {
  level?: LogLevel;
  format?: LogFormat;
};

export type LogMeta = Record<string, unknown>;

export type Logger = {
  debug: (message: string, meta?: LogMeta) => void;
  info: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  error: (message: string, meta?: LogMeta) => void;
};

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(current: LogLevel, incoming: LogLevel): boolean {
  return levelOrder[incoming] >= levelOrder[current];
}

function formatText(level: LogLevel, message: string, meta?: LogMeta): string {
  if (!meta || Object.keys(meta).length === 0) {
    return `[${level}] ${message}`;
  }

  return `[${level}] ${message} ${JSON.stringify(meta)}`;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? 'info';
  const format = options.format ?? 'text';

  const emit = (incoming: LogLevel, message: string, meta?: LogMeta): void => {
    if (!shouldLog(level, incoming)) {
      return;
    }

    if (format === 'json') {
      const payload = {
        level: incoming,
        message,
        meta: meta ?? undefined,
        timestamp: new Date().toISOString(),
      };
      const line = JSON.stringify(payload);
      if (incoming === 'error') {
        console.error(line);
      } else {
        console.log(line);
      }
      return;
    }

    const line = formatText(incoming, message, meta);
    if (incoming === 'error') {
      console.error(line);
    } else {
      console.log(line);
    }
  };

  return {
    debug: (message, meta) => emit('debug', message, meta),
    info: (message, meta) => emit('info', message, meta),
    warn: (message, meta) => emit('warn', message, meta),
    error: (message, meta) => emit('error', message, meta),
  };
}
