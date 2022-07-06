import './env';

import path from 'path';

import express from 'express';
import compression from 'compression';
import helmet from 'helmet';

import http from 'http';
import sslRequire from 'heroku-ssl-redirect';

import pg from 'pg';
import { Server } from 'socket.io';
import { registerSocketNspGeneral } from './socket/general';
import { registerSocketNspGame } from './socket/game';

import { RegisterRoutes } from './routes/routes';
import { validationErrorMiddleware } from './helpers/validationErrorMiddleware';
import swaggerUI from 'swagger-ui-express';
import swaggerDoc from './swagger.json';

import { cancelAllJobs, registerJobs } from './services/scheduledTasks';

import { initdBUtils } from './dbUtils/initdBUtils'
import { loadTutorialLevels } from './services/tutorial';
import logger from './helpers/logger';

export class TacServer {
    httpServer: http.Server;
    app: express.Express;
    io: Server;
    pgPool: pg.Pool;

    constructor() {
        this.pgPool = initdBUtils()

        this.app = express()
        this.app.locals.sqlClient = this.pgPool

        this.app.use(express.json())
        this.app.use(compression())
        if (process.env.NODE_ENV === 'production') {
            this.app.use(helmet({ contentSecurityPolicy: false }))
            this.app.use(sslRequire())
        }

        this.app.use('/gameApi/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDoc));
        RegisterRoutes(this.app);
        this.app.use(validationErrorMiddleware)

        this.httpServer = new http.Server(this.app);
        this.io = new Server(this.httpServer);

        registerSocketNspGame(this.io.of('/game') as any, this.pgPool)
        registerSocketNspGeneral(this.io.of('/') as any, this.pgPool)

        // Handle production
        if (process.env.NODE_ENV === 'production') {
            this.app.use(express.static(path.join(__dirname, '../../../public'), {
                maxAge: 60 * 60 * 1000,
                cacheControl: true,
            }));

            // Handle SPA
            this.app.all('*', (_, res) => { res.redirect('/') })
        }
    }

    async listen(port?: number) {
        await registerJobs(this.pgPool)
        await loadTutorialLevels(this.pgPool)

        const portToListen = port ?? (process.env.PORT != undefined ? parseInt(process.env.PORT) : 3000)
        this.httpServer.listen(portToListen)
        return portToListen
    }

    async unlisten() {
        cancelAllJobs()

        await new Promise((resolve) => {
            this.io.close(() => { resolve(true) })
        })
        await new Promise((resolve) => {
            this.httpServer.listening ? this.httpServer.close(() => { resolve(true) }) : resolve(true)
        })
    }

    async destroy() {
        logger.debug('Server destroying: start destroy by unlisten')
        await this.unlisten();
        logger.debug('Server destroying: unlisten ended, starting sql teardown')
        await this.app.locals.sqlClient.end();
        logger.debug('Server destroyed')
    }
}
