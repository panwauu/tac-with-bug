import logger from './logger'
import type express from 'express'
import { ValidateError } from 'tsoa'

export function validationErrorMiddleware(err: unknown, _: express.Request, res: express.Response, next: express.NextFunction): void {
  if (err instanceof ValidateError) {
    res.status(422).json({ message: 'Validation Failed', details: err?.fields })
    return
  }

  if (typeof err === 'object' && (err as any)?.status === 401) {
    res.status(401).json({ message: (err as any)?.msg })
    return
  }

  if (err instanceof Error) {
    logger.error('Error in Validation Middleware', err)
    res.status(500).json({ message: 'Internal Server Error', details: err.message, name: err.name })
    return
  }
  next()
}
