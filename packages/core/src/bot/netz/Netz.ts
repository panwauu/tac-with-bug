// Hi, I'm Netz,
// ich bin Stufe 5 der App („Anna Pokerface"): jeden Zug probehalber ausfuehren,
// die Stellung danach vom Wertnetz bewerten lassen, den besten nehmen.
//
// Machbarkeitsbeweis: die KI der iOS-App laeuft in Oskars Engine, ohne
// Swift, ohne CoreML, ohne Server. Zugerzeugung und Regeln kommen aus SEINER
// Engine (previewMove), nur die Bewertung ist unsere.
//
// Die 7 wird bei ihm schrittweise gespielt (Karte '7-3' = noch drei Schritte).
// Die App plant sie als EINEN Zug. Deshalb werden hier alle vollstaendigen
// Zerlegungen durchgespielt und als Ganzes bewertet, zurueck geht nur der
// erste Schritt. Beim naechsten Aufruf wird der Rest neu bewertet, das ist
// dieselbe Wahl, solange sich das Brett nicht aendert.

import type { MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import { previewMove } from '../simulation/previewMove'
import type { AiInterface } from '../simulation/simulation'
import { getMovesFromCards } from '../simulation/moves'
import { discardBot } from '../bots/DiscardBot'
import { tradeBot } from '../bots/TradeBot'
import { Wertnetz } from './wertnetz'
import { grundkarte, type Kartenlage, merkmale, siebenLaeuft } from './merkmale'

type Kandidat = { erster: MoveTextOrBall; nach: AiData; karte: string; aussetzen: boolean }

/** Wie viele 7er-Zerlegungen hoechstens durchgespielt werden. */
const MAX_SIEBEN = 400

export class Netz implements AiInterface {
  /** Fuer pruefe.ts: Kartenlage von aussen vorgeben statt herleiten. */
  lageVorgabe: ((data: AiData) => Kartenlage) | null = null

  constructor(private netz: Wertnetz) {
    this.choose = this.choose.bind(this)
  }

  choose(data: AiData): MoveTextOrBall {
    // Tausch und Zwangsabwurf: vorerst Oskars eigene Logik (siehe README).
    if (data.tradedCard == null) return tradeBot(data, [])
    const abwurf = discardBot(data)
    if (abwurf != null) return abwurf

    const lage = this.lageVorgabe ? this.lageVorgabe(data) : kartenlage(data)
    let bester: Kandidat | null = null
    let besterWert = -Infinity
    for (const k of this.kandidaten(data)) {
      const w = gewonnen(k.nach) ? 2 : this.netz.wert(merkmale(k.nach, data, k.karte, lage, k.aussetzen))
      if (w > besterWert) {
        besterWert = w
        bester = k
      }
    }
    if (bester) return bester.erster
    const alle = getMovesFromCards(data.cardsWithMoves, data.gamePlayer)
    return alle[Math.floor(Math.random() * alle.length)]
  }

  /** Alle Zuege mit ihrer Folgestellung; eine 7 als vollstaendige Zerlegung. */
  kandidaten(data: AiData): Kandidat[] {
    const aus: Kandidat[] = []
    for (const m of getMovesFromCards(data.cardsWithMoves, data.gamePlayer)) {
      const titel = data.cardsWithMoves[m[1]].title
      if (m.length === 3 && m[2] === 'abwerfen') continue
      let nach: AiData
      try {
        nach = previewMove(data, m)
      } catch {
        continue
      }
      // Auch eine TAC, die eine 7 kopiert, laeuft bei ihm schrittweise.
      if (grundkarte(titel) === '7' || siebenLaeuft(nach.cardsWithMoves[m[1]]?.title)) {
        for (const ende of siebenZuEnde(nach, m[1], MAX_SIEBEN)) {
          aus.push({ erster: m, nach: ende, karte: grundkarte(titel), aussetzen: false })
        }
      } else {
        aus.push({ erster: m, nach, karte: titel, aussetzen: m.length === 3 && m[2].includes('aussetzen') })
      }
    }
    // Teufel und Narr haengen an Karten, die ich nicht sehe (Hand des Opfers,
    // weitergereichte Haende). Futuro laesst sie aus seiner Suche ebenso
    // heraus. Nur wenn sonst nichts geht.
    const ohne = aus.filter((k) => !UNSICHTBAR.includes(k.karte))
    return ohne.length > 0 ? ohne : aus
  }
}

const UNSICHTBAR = ['teufel', 'narr']

/**
 * Spielt eine angefangene 7 auf jede moegliche Art zu Ende.
 * Viele Reihenfolgen der Teilschritte fuehren zum selben Brett. Ohne das
 * Merken besuchter Zwischenstaende dauerte ein Zug bis zu 82 Sekunden.
 */
function siebenZuEnde(start: AiData, karte: number, grenze: number): AiData[] {
  const enden: AiData[] = []
  const besucht = new Set<string>()
  const endbretter = new Set<string>()
  const offen: AiData[] = [start]
  while (offen.length > 0 && enden.length < grenze) {
    const data = offen.pop() as NonNullable<ReturnType<typeof offen.pop>>
    const c = data.cardsWithMoves[karte]
    if (!c || !siebenLaeuft(c.title)) {
      const brett = JSON.stringify(data.balls)
      if (!endbretter.has(brett)) {
        endbretter.add(brett)
        enden.push(data)
      }
      continue
    }
    for (const m of getMovesFromCards(data.cardsWithMoves, data.gamePlayer)) {
      if (m[1] !== karte || m.length !== 4) continue
      let weiter: AiData
      try {
        weiter = previewMove(data, m)
      } catch {
        continue
      }
      // Gleiches Brett reicht nicht: seine Engine merkt sich, welche Kugeln
      // schon gezogen haben, das steckt in den erlaubten Folgezuegen.
      const schluessel = JSON.stringify(weiter.cardsWithMoves[karte] ?? null) + JSON.stringify(weiter.balls)
      if (besucht.has(schluessel)) continue
      besucht.add(schluessel)
      offen.push(weiter)
    }
  }
  return enden
}

function gewonnen(d: AiData): boolean {
  return d.teams[0].every((p) => d.balls.filter((b) => b.player === p).every((b) => b.state === 'goal' || b.state === 'locked'))
}

/**
 * Was die App ueber die Karten weiss, aus dem, was AiData hergibt.
 * Handgroessen: alle bekamen gleich viele Karten; wer seit dem Geben schon
 * vor mir dran war, hat eine weniger.
 */
export function kartenlage(data: AiData): Kartenlage {
  const n = data.nPlayers
  const meine = data.cardsWithMoves.length
  const beginn = (data.dealingPlayer + 1) % n
  const handGroessen = Array.from({ length: n }, (_, p) => {
    if (p === 0) return meine
    const schonDran = (p - beginn + n) % n < (0 - beginn + n) % n
    return schonDran ? meine - 1 : meine
  })
  return { handGroessen, stapel: 104, roundNumber: 0, playRound: 0, pendingWin: false }
}
