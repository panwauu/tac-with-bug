import winston from 'winston'
import Transport from 'winston-transport'

import pg from 'pg'

interface PostgresTransportOptions {
  postgres: string | pg.Pool
  tableName?: string
  level?: string
  name?: string
  silent?: boolean
  handleExceptions?: boolean
}

class PostgresTransport extends Transport {
  pgPool: pg.Pool
  tableName: string

  constructor(opts: PostgresTransportOptions) {
    super(opts)

    this.tableName = opts.tableName ?? 'logs'

    if (typeof opts.postgres === 'string') {
      this.pgPool = new pg.Pool({
        connectionString: opts.postgres,
        ssl: { rejectUnauthorized: false },
        max: 15,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })
    } else {
      this.pgPool = opts.postgres
    }
  }

  log(info: any, callback: any) {
    setImmediate(() => {
      this.emit('logged', info)
    })

    const { level, message, ...meta } = info

    this.pgPool.query(`INSERT INTO ${this.tableName} (level, message, meta) VALUES ($1, $2, $3);`, [level, message, JSON.stringify(meta)]).catch((error) => {
      console.log('Postgres Logging Error')
      console.error(error)
    })
    callback()
  }
}

const { transports, format, createLogger } = winston

function getLoggingDatabaseURL(): string | null {
  const databaseEnvKey = process.env.DATABASE_LOGGING_ENV_KEY_TO_URL
  if (databaseEnvKey === undefined) {
    return null
  }

  const databaseUrl = process.env[databaseEnvKey]
  if (databaseUrl === undefined) {
    return null
  }

  return databaseUrl
}

const consoleOptions = {
  level: 'silly',
  json: false,
  handleExceptions: true,
  colorize: true,
  format: format.simple(),
}

const loggerOptions = {
  transports: [new transports.Console(consoleOptions)] as Transport[],
  exitOnError: false,
}

const databaseUrl = getLoggingDatabaseURL()
if (databaseUrl != null) {
  loggerOptions.transports.push(
    new PostgresTransport({
      level: 'warn',
      postgres: databaseUrl,
      tableName: 'logs',
      handleExceptions: true,
    })
  )
}

const logger = createLogger(loggerOptions)

if (process.env.NODE_ENV === 'production') {
  logger.warn('This is a test warning to test if the postgres logger is working when server starts', { reason: 'test' })
}

export default logger
