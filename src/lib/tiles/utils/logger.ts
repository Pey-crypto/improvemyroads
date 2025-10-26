type Level = 'debug' | 'info' | 'warn' | 'error';

const levelPriority: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const envLevel = (process.env.LOG_LEVEL || 'info') as Level;

function base(meta?: Record<string, unknown>) {
  return {
    ts: new Date().toISOString(),
    ...meta,
  };
}

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  if (levelPriority[level] < levelPriority[envLevel]) return;
  const entry = { level, message, ...base(meta) };
  if (process.env.NODE_ENV !== 'production') {
    // dev: pretty console
    console.log(`[${entry.level}] ${entry.message}`, entry);
  } else {
    // prod: JSON structured
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  child: (meta: Record<string, unknown>) => ({
    debug: (message: string, m?: Record<string, unknown>) => log('debug', message, { ...meta, ...m }),
    info: (message: string, m?: Record<string, unknown>) => log('info', message, { ...meta, ...m }),
    warn: (message: string, m?: Record<string, unknown>) => log('warn', message, { ...meta, ...m }),
    error: (message: string, m?: Record<string, unknown>) => log('error', message, { ...meta, ...m }),
  })
};
