import supertest from 'supertest';

import pg from 'pg';
import path from 'path';
import fs from 'fs';
import logger from '../helpers/logger';
import intro from '../dbUtils/intro.json'
import { TacServer } from '../server';

const init_db_tac_sql = fs.readFileSync(path.join(getRoot(), 'server', 'src', 'dbUtils', 'init_db_tac.sql')).toString()
const populate_test_sql = fs.readFileSync(path.join(getRoot(), 'server', 'src', 'dbUtils', 'populate_test.sql')).toString()

beforeAll(async () => {
    await prepareTestDatabase();

    (global as any).test_server = new TacServer();
    await (global as any).test_server.listen(1234);
    (global as any).test_agent = supertest.agent(test_server.httpServer);
})

afterAll(async () => {
    await (global as any).test_server?.destroy()
})

function getRoot(): string {
    let remainingPath = __dirname

    do {
        const dircontent = fs.readdirSync(remainingPath)
        if (['.github', 'server', 'client', 'shared'].every((f) => dircontent.includes(f))) {
            return remainingPath
        }

        remainingPath = path.dirname(remainingPath)
    } while (remainingPath.split(path.sep).filter((s) => s.length > 0).length > 1);

    throw new Error('Could not find root')
}

export async function prepareTestDatabase() {
    try {
        logger.info('Drop and create test database')
        await recreateTestDatabase()
        logger.info('Initialize and populate test database')
        await initAndPopulateTestDatabase()
        logger.info('Test database preparation done')
    } catch (err) {
        logger.error('Test database could not be prepared')
        throw (err);
    }
}

async function recreateTestDatabase(): Promise<void> {
    const postgres_client = new pg.Client({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'postgres',
        port: 5432,
        connectionTimeoutMillis: 2000,
    });
    await postgres_client.connect();

    try {
        await postgres_client.query('DROP DATABASE IF EXISTS tac_test;');
        await postgres_client.query('CREATE DATABASE tac_test;');
    } finally {
        await postgres_client.end();
    }
}

async function initAndPopulateTestDatabase(): Promise<void> {
    const postgres_client = new pg.Client({
        user: 'postgres',
        host: 'localhost',
        database: 'tac_test',
        password: 'postgres',
        port: 5432,
        connectionTimeoutMillis: 2000,
    });
    await postgres_client.connect();

    try {
        await postgres_client.query(init_db_tac_sql);
        await postgres_client.query(populate_test_sql);
        await postgres_client.query('INSERT INTO tutorials (id, data) VALUES (0, $1);', [JSON.stringify(intro)]);
    } finally {
        await postgres_client.end();
    }
}
