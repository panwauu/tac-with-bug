import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true })

if (process.env.NODE_ENV !== 'production') {
  process.env.jwtSecret = 'SECRET_KEY'
  process.env.BASE_URL = 'http://localhost:3000'
}
