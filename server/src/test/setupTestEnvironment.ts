import supertest from 'supertest'
import { TacServer } from '../entrypoints/server'
import './socket'
import Chance from 'chance'
import { prepareTestDatabase, dropTestDatabase } from './handleTestDatabase'
const chance = Chance()

beforeAll(async () => {
  const databaseName = `test_temp_${chance.string({ length: 21, alpha: true, casing: 'lower' })}`
  const databaseUrl = process.env.DATABASE_URL ?? `postgres://postgres:postgres@localhost:5433/tac_test`
  const newDatabaseUrl = databaseUrl.substring(0, databaseUrl.lastIndexOf('/') + 1) + databaseName

  await prepareTestDatabase(databaseName)
  ;(global as any).databaseName = databaseName
  ;(global as any).testServer = new TacServer({
    serveApp: false,
    pgPoolConfig: {
      connectionString: newDatabaseUrl,
    },
  })
  await (global as any).testServer.listen(0)
  ;(global as any).testAgent = new supertest.agent((global as any).testServer.httpServer)
})

afterAll(async () => {
  await (global as any).testServer?.destroy()
  await dropTestDatabase((global as any).databaseName)
})
