import logger from './helpers/logger';
import { TacServer } from './server';

const server = new TacServer();
server.listen().then((port) => { logger.info(`Server started on port ${port}`) })
