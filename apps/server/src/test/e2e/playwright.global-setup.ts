import { execSync } from 'child_process'
import path from 'node:path'

async function globalSetup() {
  console.log('Building frontend: start')
  execSync('npm run build', { cwd: path.join(__dirname, '..', '..', '..', '..', 'client'), stdio: 'inherit' })
  console.log('Building frontend: end')
}

export default globalSetup
