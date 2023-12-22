import logger from './logger'
import type express from 'express'
import { ValidateError } from 'tsoa'

export function validationErrorMiddleware(err: unknown, _: express.Request, res: express.Response, next: express.NextFunction): express.Response | void {
  if (err instanceof ValidateError) {
    return res.status(422).json({ message: 'Validation Failed', details: err?.fields })
  }

  if (typeof err === 'object' && (err as any)?.status === 401) {
    return res.status(401).json({ message: (err as any)?.msg })
  }

  if (err instanceof Error) {
    logger.error('Error in Validation Middleware', err)
    return res.status(500).json({ message: 'Internal Server Error', details: err.message, name: err.name })
  }
  next()
}
