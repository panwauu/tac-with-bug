import supertest from 'supertest';
import path from 'path';
import fs from 'fs';
import logger from '../helpers/logger';
import intro from '../dbUtils/intro.json'
import { TacServer } from '../server';
import { initTestDatabaseClient } from '../dbUtils/initdBUtils';

beforeAll(async () => {
    await prepareTestDatabase();

    (global as any).testServer = new TacServer();
    await (global as any).testServer.listen(1234);
    (global as any).testAgent = supertest.agent(testServer.httpServer);
})

afterAll(async () => {
    await (global as any).testServer?.destroy()
})

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
    const pgClient = initTestDatabaseClient('postgres')
    await pgClient.connect();

    try {
        await pgClient.query('DROP DATABASE IF EXISTS tac_test;');
        await pgClient.query('CREATE DATABASE tac_test;');
    } finally {
        await pgClient.end();
    }
}

async function initAndPopulateTestDatabase(): Promise<void> {
    const pgClient = initTestDatabaseClient('tac_test')
    await pgClient.connect();

    try {
        const initTacDatabaseSQL = fs.readFileSync(path.join(getRoot(), 'server', 'src', 'dbUtils', 'init_db_tac.sql')).toString()
        const populateTestDatabaseSQL = fs.readFileSync(path.join(getRoot(), 'server', 'src', 'dbUtils', 'populate_test.sql')).toString()

        await pgClient.query(initTacDatabaseSQL);
        await pgClient.query(populateTestDatabaseSQL);
        await pgClient.query('INSERT INTO tutorials (id, data) VALUES (0, $1);', [JSON.stringify(intro)]);
    } finally {
        await pgClient.end();
    }
}

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
