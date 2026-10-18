// Zuege der KI-Stufen der TAC-App fuer Online-Partien (Bot-Nummern ab 10,
// siehe packages/core/src/bot/netz/onlineStufen.ts). Gerechnet wird in
// kiServerWorker.ts in einem eigenen Thread. Antwortet der Thread nicht
// rechtzeitig, wird er neu gestartet und Futuro zieht: die Partie bleibt
// nie stehen.

import path from 'node:path'
import { Worker } from 'node:worker_threads'
import type { MoveTextOrBall } from '@repo/core/types'
import type { AiData } from '@repo/core/bot/simulation/output'
import { Bot, getBotMove } from '@repo/core/bot/bots/bots'
import logger from '../helpers/logger'

/** Suchzeit je Zug wie im Browser; starke Stufen nutzen sie aus. */
const ZEITGRENZE = 2000
/** Ab hier gilt der Thread als haengend. */
const NOTFALL = ZEITGRENZE * 3 + 3000

type Offen = { ok: (z: MoveTextOrBall | null) => void; uhr: ReturnType<typeof setTimeout> }

let worker: Worker | null = null
let naechste = 1
const offen = new Map<number, Offen>()

function starte(): Worker {
  const w = new Worker(path.join(__dirname, 'kiServerWorker.js'))
  w.on('message', (a: { id: number; zug?: MoveTextOrBall; fehler?: string }) => {
    const o = offen.get(a.id)
    if (!o) return
    clearTimeout(o.uhr)
    offen.delete(a.id)
    if (a.fehler != null) logger.error(`KI-Zug fehlgeschlagen: ${a.fehler}`)
    o.ok(a.zug ?? null)
  })
  w.on('error', (err) => {
    logger.error(`KI-Thread abgestuerzt: ${String(err)}`)
    neustart()
  })
  return w
}

function neustart() {
  void worker?.terminate()
  worker = null
  for (const [, o] of offen) {
    clearTimeout(o.uhr)
    o.ok(null)
  }
  offen.clear()
}

/** Zug der KI-Stufe `stufe` fuer Partie `gameID`, Sitz `sitz`. */
export async function kiZug(gameID: number, sitz: number, stufe: string, daten: AiData): Promise<MoveTextOrBall> {
  worker ??= starte()
  const w = worker
  const id = naechste++
  const zug = await new Promise<MoveTextOrBall | null>((ok) => {
    const uhr = setTimeout(() => {
      logger.error(`KI-Thread antwortet nicht (Stufe ${stufe}), Neustart`)
      neustart()
    }, NOTFALL)
    offen.set(id, { ok, uhr })
    w.postMessage({ id, schluessel: `${gameID}|${sitz}|${stufe}`, stufe, daten, zeitGrenze: ZEITGRENZE })
  })
  return zug ?? getBotMove(Bot.Futuro, daten)
}
