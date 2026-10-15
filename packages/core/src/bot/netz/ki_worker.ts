// Die KI im Web Worker: ein eigener Faden im Browser, damit die Seite
// fluessig bleibt, waehrend eine Stufe sekundenlang sucht.
//
// Nachrichten an den Worker:
//   { art: 'start', basis }                 Netze von `basis` laden (einmal)
//   { art: 'zug', id, stufe, sitz, daten, zeitGrenze? }
// Antworten:
//   { art: 'bereit' }
//   { art: 'zug', id, zug, ms }
//   { art: 'fehler', id, grund }
//
// Je Sitz und Stufe bleibt ein Bot bestehen: er merkt sich zwischen zwei
// Aufrufen die geplante Zerlegung einer laufenden 7.

import type { AiData } from '../simulation/output'
import type { AiInterface } from '../simulation/simulation'
import { type Netze, stufenBot } from './stufen'
import { ladeNetze } from './netze_laden'

type Anfrage = { art: 'start'; basis: string } | { art: 'zug'; id: number; stufe: string; sitz: string; daten: AiData; zeitGrenze?: number }

let netze: Promise<Netze> = Promise.resolve({})
const bots = new Map<string, AiInterface>()

const antworte = (nachricht: unknown) => (self as unknown as Worker).postMessage(nachricht)

self.onmessage = async (e: MessageEvent<Anfrage>) => {
  const a = e.data
  if (a.art === 'start') {
    netze = ladeNetze(a.basis)
    try {
      await netze
      antworte({ art: 'bereit' })
    } catch (err) {
      antworte({ art: 'fehler', id: -1, grund: String(err) })
    }
    return
  }
  if (a.art === 'zug') {
    try {
      const n = await netze
      const schluessel = a.sitz + '|' + a.stufe
      let bot = bots.get(schluessel)
      if (!bot) {
        bot = stufenBot(a.stufe, n) ?? undefined
        if (!bot) throw new Error('unbekannte Stufe ' + a.stufe)
        bots.set(schluessel, bot)
      }
      if ('zeitGrenze' in bot) (bot as { zeitGrenze: number }).zeitGrenze = a.zeitGrenze ?? 0
      const t0 = performance.now()
      const zug = bot.choose(a.daten)
      antworte({ art: 'zug', id: a.id, zug, ms: performance.now() - t0 })
    } catch (err) {
      antworte({ art: 'fehler', id: a.id, grund: String(err) })
    }
  }
}
