// Die KI der TAC-App auf dem Server, in einem eigenen Thread: starke Stufen
// suchen bis zu zwei Sekunden, das darf die Bot-Schleife und die Sockets
// der anderen Partien nicht aufhalten. Gegenstueck im Browser:
// packages/core/src/bot/netz/ki_worker.ts.
//
// Nachrichten: { id, schluessel, stufe, daten, zeitGrenze } -> { id, zug } oder { id, fehler }
// Je `schluessel` (Partie|Sitz|Stufe) bleibt ein Bot bestehen: er merkt sich
// die geplante Zerlegung einer laufenden 7.

import fs from 'node:fs'
import path from 'node:path'
import { parentPort } from 'node:worker_threads'
import type { AiData } from '@repo/core/bot/simulation/output'
import type { AiInterface } from '@repo/core/bot/simulation/simulation'
import { type Netze, stufenBot } from '@repo/core/bot/netz/stufen'
import { Wertnetz } from '@repo/core/bot/netz/wertnetz'
import { Politiknetz } from '@repo/core/bot/netz/politiknetz'

type Anfrage = { id: number; schluessel: string; stufe: string; daten: AiData; zeitGrenze: number }

// Gebauter Client (Produktion: apps/server/public) oder Quellordner des Clients
const ORDNER = [path.join(__dirname, '../../public/netze'), path.join(__dirname, '../../../client/public/netze')]
const MAX_BOTS = 500

function lies(name: string): [ArrayBuffer, any] {
  const ordner = ORDNER.find((o) => fs.existsSync(path.join(o, name + '.bin')))
  if (ordner == null) throw new Error(`Netz ${name} nicht gefunden`)
  const bin = fs.readFileSync(path.join(ordner, name + '.bin'))
  const json = JSON.parse(fs.readFileSync(path.join(ordner, name + '.json')).toString())
  return [bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), json]
}

let netze: Netze | null = null
function ladeNetze(): Netze {
  netze ??= { wert: new Wertnetz(...lies('wertnetz_hard')), politik: new Politiknetz(...lies('politiknetz')), koop: new Wertnetz(...lies('koopnetz')) }
  return netze
}

const bots = new Map<string, AiInterface>()

parentPort?.on('message', (a: Anfrage) => {
  try {
    let bot = bots.get(a.schluessel)
    if (!bot) {
      bot = stufenBot(a.stufe, ladeNetze()) ?? undefined
      if (!bot) throw new Error('unbekannte Stufe ' + a.stufe)
      // Aelteste zuerst raus (Map behaelt die Einfuegereihenfolge)
      if (bots.size >= MAX_BOTS) bots.delete(bots.keys().next().value as string)
      bots.set(a.schluessel, bot)
    }
    if ('zeitGrenze' in bot) (bot as { zeitGrenze: number }).zeitGrenze = a.zeitGrenze
    parentPort?.postMessage({ id: a.id, zug: bot.choose(a.daten) })
  } catch (err) {
    parentPort?.postMessage({ id: a.id, fehler: String(err) })
  }
})
