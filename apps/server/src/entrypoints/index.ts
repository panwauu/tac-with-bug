import minimist from 'minimist'
import logger from '../helpers/logger'
import { TacServer, ServerOptions } from './server'
import { getRootPackageVersion } from './version'
import { starteKiDienst } from './kiDienst'

const argv = minimist(process.argv.slice(2))

const options: ServerOptions = {
  serveApp: argv?.['s'] === true || argv?.['serve'] === true || argv?.['serve'] === 'true',
}

// KI_DIENST=1: dieselbe App startet nur den KI-Dienst (z. B. als zweite Heroku-App).
if (process.env.KI_DIENST === '1') {
  starteKiDienst()
} else {
  const server = new TacServer(options)
  server.listen().then((port) => {
    const version = getRootPackageVersion() ?? 'unknown'
    logger.info(`Server (version ${version}) started on port ${port}`)
  })
}
