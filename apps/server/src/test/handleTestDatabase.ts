import path from 'path'
import fs from 'fs'
import logger from '../helpers/logger'
import intro from '../dbUtils/intro.json'
import { initTestDatabaseClient } from '../dbUtils/initdBUtils'

export async function prepareTestDatabase(databaseName: string, dropIfExists: boolean = false) {
  try {
    logger.info('Drop and create test database')
    await createTestDatabase(databaseName, dropIfExists)
    logger.info('Initialize and populate test database')
    await initAndPopulateTestDatabase(databaseName)
    logger.info('Test database preparation done')
  } catch (err) {
    logger.error(`Test database could not be prepared: ${err}`)
    throw err
  }
}

export async function createTestDatabase(databaseName: string, dropIfExists: boolean = false): Promise<void> {
  if (!/^\w+$/.test(databaseName)) {
    throw new Error('Invalid database name')
  }

  const pgClient = initTestDatabaseClient('postgres')
  try {
    await pgClient.connect()
    if (dropIfExists) {
      await pgClient.query(`DROP DATABASE IF EXISTS "${databaseName}";`)
    }
    await pgClient.query(`CREATE DATABASE "${databaseName}";`)
    await pgClient.end()
  } catch (err) {
    await pgClient.end()
    throw err
  }
}

export async function dropTestDatabase(databaseName: string): Promise<void> {
  const pgClient = initTestDatabaseClient('postgres')
  try {
    await pgClient.connect()
    await pgClient.query(`DROP DATABASE IF EXISTS "${databaseName}";`)
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

    const initTacDatabaseSQL = fs.readFileSync(path.join(getRoot(), 'apps', 'server', 'src', 'dbUtils', 'init_db_tac.sql')).toString()
    const populateTestDatabaseSQL = fs.readFileSync(path.join(getRoot(), 'apps', 'server', 'src', 'dbUtils', 'populate_test.sql')).toString()

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
    if (['.github', 'apps', 'packages'].every((f) => dircontent.includes(f))) {
      return remainingPath
    }

    remainingPath = path.dirname(remainingPath)
  } while (remainingPath.split(path.sep).filter((s) => s.length > 0).length > 1)

  throw new Error('Could not find root')
}
