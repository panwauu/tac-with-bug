import pg from 'pg'

export function initdBUtils(): pg.Pool {
    if (process.env.NODE_ENV === 'production') {
        return new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            },
            max: 15,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    } else if (process.env.NODE_ENV === 'development') {
        return new pg.Pool({
            user: 'postgres',
            host: 'localhost',
            database: 'tac',
            password: 'postgres',
            port: 5432,
            max: 15,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    } else if (process.env.NODE_ENV === 'test') {
        return new pg.Pool({
            user: 'postgres',
            host: 'localhost',
            database: 'tac_test',
            password: 'postgres',
            port: 5432,
            max: 15,
            idleTimeoutMillis: 100,
            connectionTimeoutMillis: 2000,
        });
    }

    throw new Error('Database connection cannot be established without NODE_ENV');
}

export function initTestDatabaseClient(database: 'postgres' | 'tac_test'): pg.Client {
    return new pg.Client({
        connectionString: `postgresql://postgres:postgres@localhost:5432/${database}`,
        connectionTimeoutMillis: 2000,
    });
}
