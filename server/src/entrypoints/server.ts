import './env'

import path from 'path'

import express from 'express'
import compression from 'compression'
import helmet from 'helmet'

import http from 'http'
import sslRedirect from 'heroku-ssl-redirect'

import type pg from 'pg'
import { Server } from 'socket.io'
import { registerSocketNspGeneral } from '../socket/general.js'
import { registerSocketNspGame } from '../socket/game.js'

import { RegisterRoutes } from '../routes/routes.js'
import { validationErrorMiddleware } from '../helpers/validationErrorMiddleware.js'
import swaggerUI from 'swagger-ui-express'
import swaggerDoc from '../swagger.json'

import { cancelAllJobs, registerJobs } from '../services/scheduledTasks.js'

import { initdBUtils } from '../dbUtils/initdBUtils.js'
import { loadTutorialLevels } from '../services/tutorial.js'
import logger, { attachPostgresLogger } from '../helpers/logger.js'

export type ServerOptions = {
  serveApp?: boolean
  pgPoolConfig?: pg.PoolConfig
}

export class TacServer {
  httpServer: http.Server
  app: express.Express
  io: Server
  pgPool: pg.Pool

  constructor(options?: ServerOptions) {
    this.pgPool = initdBUtils(options?.pgPoolConfig)
    attachPostgresLogger(this.pgPool)

    this.app = express()
    this.app.locals.sqlClient = this.pgPool

    this.app.use(express.json())
    this.app.use(compression())
    if (process.env.NODE_ENV === 'production') {
      this.app.use(helmet({ contentSecurityPolicy: false }))
      this.app.use(sslRedirect.default())
    }

    this.app.use('/gameApi/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDoc))
    RegisterRoutes(this.app)
    this.app.use(validationErrorMiddleware)

    this.httpServer = new http.Server(this.app)
    this.io = new Server(this.httpServer)

    registerSocketNspGame(this.io.of('/game') as any, this.pgPool)
    registerSocketNspGeneral(this.io.of('/') as any, this.pgPool)

    // Handle production
    if (process.env.NODE_ENV === 'production' || options?.serveApp) {
      this.app.use(
        express.static(path.join(__dirname, '../../public'), {
          index: 'index.html',
          maxAge: 31536000000,
          cacheControl: true,
          setHeaders: function (res, pathOfFile) {
            if (path.basename(pathOfFile) === 'index.html') {
              res.setHeader('Cache-Control', 'no-store, max-age=0')
            }
          },
        })
      )

      // Handle SPA
      this.app.all('*', (_, res) => {
        res.redirect('/')
      })
    }
  }

  async listen(port?: number) {
    await registerJobs(this.pgPool)
    await loadTutorialLevels(this.pgPool)

    const portToListen = port ?? (process.env.PORT != null ? parseInt(process.env.PORT) : 3000)
    this.httpServer.listen(portToListen)
    logger.debug(`Listening on port: ${(this.httpServer.address() as any)?.port}`)

    return portToListen
  }

  async unlisten() {
    cancelAllJobs()

    await new Promise((resolve) => {
      this.io.close(() => {
        resolve(true)
      })
    })
    await new Promise((resolve) => {
      this.httpServer.listening
        ? this.httpServer.close(() => {
            resolve(true)
          })
        : resolve(true)
    })
  }

  async destroy() {
    logger.debug('Server destroying: start destroy by unlisten')
    await this.unlisten()
    logger.debug('Server destroying: unlisten ended, starting sql teardown')
    await this.app.locals.sqlClient.end()
    logger.debug('Server destroyed')
  }
}
