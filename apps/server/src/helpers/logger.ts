import winston from 'winston'
import Transport from 'winston-transport'
import type pg from 'pg'

const { transports, format, createLogger } = winston

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

let logger = createLogger(loggerOptions)

interface PostgresTransportOptions {
  postgres: pg.Pool
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
    this.pgPool = opts.postgres
  }

  override log(info: any, callback: any) {
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

export function attachPostgresLogger(pgPool: pg.Pool) {
  const loggerOptions = {
    transports: [
      new transports.Console(consoleOptions),
      new PostgresTransport({
        level: 'warn',
        postgres: pgPool,
        tableName: 'logs',
        handleExceptions: true,
      }),
    ] as Transport[],
    exitOnError: false,
  }
  logger = createLogger(loggerOptions)

  if (process.env.NODE_ENV === 'production') {
    logger.error('This is a test error to test if the postgres logger is working when server starts', { reason: 'test' })
  }
}

export default logger
