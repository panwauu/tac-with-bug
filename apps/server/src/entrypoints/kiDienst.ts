// Eigener KI-Dienst: rechnet die Zuege der KI-Stufen fuer den Spielserver,
// getrennt vom Spiel. Der Spielserver ruft ihn auf, wenn KI_URL gesetzt ist.
//
//   POST /zug      { schluessel, stufe, daten, frist }  ->  { zug }   (zug null: Futuro ziehen lassen)
//   GET  /zustand  Auslastung (Threads, Schlange, mittlere Warte- und Rechenzeit)
//
// Umgebung: PORT (Vorgabe 3100), KI_THREADS (Vorgabe: Kerne minus 1),
// KI_GEHEIMNIS (muss der Spielserver als Bearer mitschicken; in Produktion Pflicht).
// Start: node apps/server/dist/entrypoints/kiDienst.js, oder ueber
// index.js mit KI_DIENST=1 (eine zweite Heroku-App mit demselben Code).

import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import logger from '../helpers/logger'
import { KiPool } from '../services/kiPool'

const FRIST_MAX = 10000

export function starteKiDienst(port = Number(process.env.PORT) || 3100) {
  const geheimnis = process.env.KI_GEHEIMNIS
  // Oeffentlich erreichbar (z. B. als Heroku-App) darf der Dienst nicht fuer jeden rechnen.
  if (process.env.NODE_ENV === 'production' && !geheimnis) {
    throw new Error('KI-Dienst: KI_GEHEIMNIS fehlt (in Produktion Pflicht)')
  }
  const threads = Number(process.env.KI_THREADS) || Math.max(1, os.availableParallelism() - 1)
  const pool = new KiPool(threads, path.join(__dirname, '../services/kiServerWorker.js'))

  const server = http.createServer((req, res) => {
    const antworte = (code: number, daten: unknown) => {
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(daten))
    }
    if (req.method === 'GET' && req.url === '/zustand') return antworte(200, pool.zustand())
    if (req.method !== 'POST' || req.url !== '/zug') return antworte(404, { fehler: 'unbekannt' })
    if (geheimnis && req.headers.authorization !== `Bearer ${geheimnis}`) return antworte(401, { fehler: 'nicht erlaubt' })

    const teile: Buffer[] = []
    let laenge = 0
    req.on('data', (t: Buffer) => {
      laenge += t.length
      if (laenge > 2_000_000) req.destroy()
      else teile.push(t)
    })
    req.on('end', () => {
      try {
        const a = JSON.parse(Buffer.concat(teile).toString())
        if (typeof a.schluessel !== 'string' || typeof a.stufe !== 'string' || a.daten == null) return antworte(400, { fehler: 'Anfrage unvollstaendig' })
        const frist = Date.now() + Math.min(Number(a.frist) || FRIST_MAX, FRIST_MAX)
        pool
          .zug({ schluessel: a.schluessel, stufe: a.stufe, daten: a.daten }, frist)
          .then((zug) => antworte(200, { zug }))
          .catch((err) => antworte(500, { fehler: String(err) }))
      } catch {
        antworte(400, { fehler: 'kein JSON' })
      }
    })
  })

  server.listen(port, () => logger.info(`KI-Dienst auf Port ${port} mit ${threads} Threads`))
  return { server, pool }
}

if (require.main === module) starteKiDienst()
