import pg from 'pg'

export function initdBUtils(config?: pg.PoolConfig): pg.Pool {
  if (config != null) {
    return new pg.Pool(config)
  } else if (process.env.NODE_ENV === 'production') {
    return new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  } else if (process.env.NODE_ENV === 'development') {
    return new pg.Pool({
      connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/tac',
    })
  } else if (process.env.NODE_ENV === 'test') {
    return new pg.Pool({
      connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/tac_test',
    })
  }

  throw new Error('Database connection cannot be established without NODE_ENV')
}

export function initTestDatabaseClient(database: string): pg.Client {
  const databaseUrl = process.env.DATABASE_URL ?? `postgres://postgres:postgres@localhost:5433/tac_test`
  const newDatabaseUrl = databaseUrl.substring(0, databaseUrl.lastIndexOf('/') + 1) + database

  return new pg.Client({
    connectionString: newDatabaseUrl,
    connectionTimeoutMillis: 2000,
  })
}
