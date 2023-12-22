import { SuperAgentTest } from 'supertest'
import { TacServer } from '../entrypoints/server.js'

export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      jwtSecret: string
    }
  }
}

declare global {
  let testServer: TacServer
  let testAgent: SuperAgentTest
}
