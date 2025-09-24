import minimist from 'minimist'
import logger from '../helpers/logger'
import { TacServer, ServerOptions } from './server'
import { getRootPackageVersion } from './version'

const argv = minimist(process.argv.slice(2))

const options: ServerOptions = {
  serveApp: argv?.['s'] === true || argv?.['serve'] === true || argv?.['serve'] === 'true',
}

const server = new TacServer(options)
server.listen().then((port) => {
  const version = getRootPackageVersion() ?? 'unknown'
  logger.info(`Server (version ${version}) started on port ${port}`)
})
