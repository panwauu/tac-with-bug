import Joi from 'joi'
import jwt from 'jsonwebtoken'
import { Result, ok, err } from 'neverthrow'

interface JwtPayload {
  username: string
  userID: number
}

const jwtPayloadJoiSchema = Joi.object({
  username: Joi.string().required(),
  userID: Joi.number().required().integer(),
}).unknown(true)

export function signJWT(username: string, userID: number) {
  const payload: JwtPayload = { username, userID }
  return jwt.sign(payload, process.env.jwtSecret, { expiresIn: '7d' })
}

export type VerifyJWTError = 'JWT_TOKEN_NOT_VALID' | 'JWT_TOKEN_PAYLOAD_NOT_VALID'
export function verifyJWT(token: string): Result<JwtPayload, VerifyJWTError> {
  try {
    const decoded = jwt.verify(token, process.env.jwtSecret) as JwtPayload

    const { error } = jwtPayloadJoiSchema.validate(decoded)
    if (error != null) {
      return err('JWT_TOKEN_PAYLOAD_NOT_VALID')
    }

    return ok(decoded)
  } catch {
    return err('JWT_TOKEN_NOT_VALID')
  }
}
