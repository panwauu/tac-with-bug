import { SuperAgentTest } from 'supertest'
import { TacServer } from '../server'

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
