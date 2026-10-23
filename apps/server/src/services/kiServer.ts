// Zuege der KI-Stufen der TAC-App fuer Online-Partien (Bot-Nummern ab 10,
// siehe packages/core/src/bot/netz/onlineStufen.ts).
//
// Zwei Wege, gewaehlt ueber Umgebungsvariablen:
// - KI_URL gesetzt: ein eigener KI-Dienst rechnet (entrypoints/kiDienst.ts,
//   eigener Prozess, eigener Rechner moeglich). Last der KI kann das Spiel
//   dann nicht ausbremsen, nur die Bots werden kuerzer rechnen.
// - sonst: Threads in diesem Prozess (KI_THREADS, Vorgabe 1).
// In beiden Faellen gilt: kommt kein Zug rechtzeitig, zieht Futuro. Die
// Partie bleibt nie stehen.

import path from 'node:path'
import type { MoveTextOrBall } from '@repo/core/types'
import type { AiData } from '@repo/core/bot/simulation/output'
import { Bot, getBotMove } from '@repo/core/bot/bots/bots'
import logger from '../helpers/logger'
import { KiPool, type KiAnfrage } from './kiPool'

/** Bis wann ein KI-Zug da sein muss, ab Anfrage. */
export const FRIST = 6000

let pool: KiPool | null = null
function lokal(): KiPool {
  pool ??= new KiPool(Number(process.env.KI_THREADS) || 1, path.join(__dirname, 'kiServerWorker.js'))
  return pool
}

let letzterFehler = 0
async function fern(url: string, anfrage: KiAnfrage): Promise<MoveTextOrBall | null> {
  try {
    const r = await fetch(url.replace(/\/$/, '') + '/zug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.KI_GEHEIMNIS ?? ''}` },
      body: JSON.stringify({ ...anfrage, frist: FRIST }),
      signal: AbortSignal.timeout(FRIST + 1000),
    })
    if (!r.ok) throw new Error(`KI-Dienst antwortet ${r.status}`)
    const a = (await r.json()) as { zug: MoveTextOrBall | null }
    return a.zug
  } catch (err) {
    // Faellt der Dienst aus, nicht bei jedem Zug ins Log schreiben.
    if (Date.now() - letzterFehler > 60000) {
      letzterFehler = Date.now()
      logger.error(`KI-Dienst nicht erreichbar, Futuro zieht: ${String(err)}`)
    }
    return null
  }
}

/** Zug der KI-Stufe `stufe` fuer Partie `gameID`, Sitz `sitz`. */
export async function kiZug(gameID: number, sitz: number, stufe: string, daten: AiData): Promise<MoveTextOrBall> {
  const anfrage: KiAnfrage = { schluessel: `${gameID}|${sitz}|${stufe}`, stufe, daten }
  const url = process.env.KI_URL
  const zug = url ? await fern(url, anfrage) : await lokal().zug(anfrage, Date.now() + FRIST)
  return zug ?? getBotMove(Bot.Futuro, daten)
}
