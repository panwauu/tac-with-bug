import type pg from 'pg';
import { UAParser } from 'ua-parser-js';
import stringify from 'json-stable-stringify';
import logger from './logger';


export function analyseUserAgentHeader(pgPool: pg.Pool, uaHeader: string | undefined) {
    if (uaHeader == null) { return }
    if (process.env.NODE_ENV === 'test') { return }

    const uaParser = new UAParser(uaHeader)
    const uaResult = {
        browser: uaParser.getBrowser(),
        device: uaParser.getDevice(),
        engine: uaParser.getEngine(),
        os: uaParser.getOS(),
        cpu: uaParser.getCPU()
    }
    const key = stringify(uaResult)
    pgPool.query('INSERT INTO user_agent_data (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET counter = user_agent_data.counter + 1;', [key, uaResult])
        .catch((err: pg.DatabaseError) => { logger.error('Could not track user agent data', { message: err.message }) })
}
