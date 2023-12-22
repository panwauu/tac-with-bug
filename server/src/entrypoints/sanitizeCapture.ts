import minimist from 'minimist'
import cliProgress from 'cli-progress'
import { initdBUtils } from '../dbUtils/initdBUtils.js'
import { removeInvalidCapturedMoves, sanitizeGameCapture } from '../services/gameCaptureSanitation.js'

main()

async function main() {
  const pgPool = initdBUtils()
  const argv = minimist(process.argv.slice(2))

  const idsRes = await pgPool.query('SELECT id FROM savegames ORDER BY id DESC LIMIT 100;')

  {
    console.log('Sanitize Captured Games')
    const progressbar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
    progressbar.start(idsRes.rowCount ?? 0, 0)
    for (let i = 0; i < idsRes.rows.length; i++) {
      await sanitizeGameCapture(pgPool, idsRes.rows[i].id)
      progressbar.update(i)
    }
    progressbar.stop()
  }

  if (argv['d'] || argv['delete']) {
    console.log('Delete invalid captured steps')
    const progressbar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
    progressbar.start(idsRes.rowCount ?? 0, 0)
    for (let i = 0; i < idsRes.rows.length; i++) {
      await removeInvalidCapturedMoves(pgPool, idsRes.rows[i].id)
      progressbar.update(i)
    }
    progressbar.stop()
  }

  await pgPool.end()
}
