import minimist from 'minimist'
import logger from '../helpers/logger.js'
import { TacServer, ServerOptions } from './server.js'

const argv = minimist(process.argv.slice(2))

const options: ServerOptions = {
  serveApp: argv?.['s'] === true || argv?.['serve'] === true || argv?.['serve'] === 'true',
}

const server = new TacServer(options)
server.listen().then((port) => {
  logger.info(`Server (version ${process.env.npm_package_version}) started on port ${port}`)
})
