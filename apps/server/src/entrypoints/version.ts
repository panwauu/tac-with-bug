import fs from 'node:fs'
import path from 'node:path'

/**
 * Read the root package.json version (!Not the server/package.json!)
 */
export function getRootPackageVersion(): string | undefined {
  try {
    const pkgPath = path.resolve(__dirname, '../../../../package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath).toString())
    if (pkg && typeof pkg.version === 'string') return pkg.version
  } catch (err) {
    console.error(err)
  }
  throw new Error(`Failed to read root package.json`)
}
