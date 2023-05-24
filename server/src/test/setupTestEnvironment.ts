import supertest from 'supertest'
import path from 'path'
import fs from 'fs'
import logger from '../helpers/logger'
import intro from '../dbUtils/intro.json'
import { TacServer } from '../entrypoints/server'
import { initTestDatabaseClient } from '../dbUtils/initdBUtils'
import './socket'
import Chance from 'chance'
const chance = Chance()

beforeAll(async () => {
  const databaseName = `test_temp_${chance.string({ length: 21, alpha: true, casing: 'lower' })}`
  await prepareTestDatabase(databaseName)
  ;(global as any).databaseName = databaseName
  ;(global as any).testServer = new TacServer({
    serveApp: false,
    pgPoolConfig: {
      user: 'postgres',
      host: 'localhost',
      database: databaseName,
      password: 'postgres',
      port: 5432,
      max: 15,
      idleTimeoutMillis: 100,
      connectionTimeoutMillis: 2000,
    },
  })
  await (global as any).testServer.listen(0)
  ;(global as any).testAgent = supertest.agent((global as any).testServer.httpServer)
})

afterAll(async () => {
  await (global as any).testServer?.destroy()
  await dropTestDatabase((global as any).databaseName)
})

async function prepareTestDatabase(databaseName: string) {
  try {
    logger.info('Drop and create test database')
    await createTestDatabase(databaseName)
    logger.info('Initialize and populate test database')
    await initAndPopulateTestDatabase(databaseName)
    logger.info('Test database preparation done')
  } catch (err) {
    logger.error('Test database could not be prepared')
    throw err
  }
}

async function createTestDatabase(databaseName: string): Promise<void> {
  const pgClient = initTestDatabaseClient('postgres')
  try {
    await pgClient.connect()
    await pgClient.query(`CREATE DATABASE ${databaseName};`)
    await pgClient.end()
  } catch (err) {
    await pgClient.end()
    throw err
  }
}

async function dropTestDatabase(databaseName: string): Promise<void> {
  const pgClient = initTestDatabaseClient('postgres')
  try {
    await pgClient.connect()
    await pgClient.query(`DROP DATABASE IF EXISTS ${databaseName};`)
    await pgClient.end()
  } catch (err) {
    await pgClient.end()
    throw err
  }
}

async function initAndPopulateTestDatabase(databaseName: string): Promise<void> {
  const pgClient = initTestDatabaseClient(databaseName)

  try {
    await pgClient.connect()

    const initTacDatabaseSQL = fs.readFileSync(path.join(getRoot(), 'server', 'src', 'dbUtils', 'init_db_tac.sql')).toString()
    const populateTestDatabaseSQL = fs.readFileSync(path.join(getRoot(), 'server', 'src', 'dbUtils', 'populate_test.sql')).toString()

    await pgClient.query(initTacDatabaseSQL)
    await pgClient.query(populateTestDatabaseSQL)
    await pgClient.query('INSERT INTO tutorials (id, data) VALUES (0, $1);', [JSON.stringify(intro)])
    await pgClient.end()
  } catch (err) {
    await pgClient.end()
    throw err
  }
}

function getRoot(): string {
  let remainingPath = __dirname

  do {
    const dircontent = fs.readdirSync(remainingPath)
    if (['.github', 'server', 'client'].every((f) => dircontent.includes(f))) {
      return remainingPath
    }

    remainingPath = path.dirname(remainingPath)
  } while (remainingPath.split(path.sep).filter((s) => s.length > 0).length > 1)

  throw new Error('Could not find root')
}
