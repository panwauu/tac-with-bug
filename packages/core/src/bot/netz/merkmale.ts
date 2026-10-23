// Die 160 Merkmale der App (NeuralNetAI.extractFeatures), berechnet aus
// Oskars AiData. MUSS Zahl fuer Zahl der Swift-Seite entsprechen: geprueft
// mit pruefe.ts gegen BRUECKE_MERKMALE der Bruecke.
//
// AiData ist schon gedreht: Sitz 0 bin ich, 1 der naechste, 2 mein Partner.
// Das ist genau die Reihenfolge, in der die App die Spieler aufzaehlt.

import type { AiData } from '../simulation/output'
import { ballGoal, ballStart } from '../../game/ballUtils'

export const KARTEN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '13', 'tac', 'trickser', 'engel', 'teufel', 'krieger', 'narr'] as const

/** Angefangene 7: '7-3' (noch drei Schritte), als TAC-Kopie 'tac-3'. */
export const siebenLaeuft = (titel: string | undefined) => titel != null && /^(7|tac)-\d+$/.test(titel)

/** '7-3' zaehlt als 7, 'tac-3' als TAC. */
export const grundkarte = (titel: string) => (siebenLaeuft(titel) ? titel.split('-')[0] : titel)

export type Kartenlage = {
  /** Handgroessen je (gedrehtem) Sitz VOR meinem Zug. */
  handGroessen: number[]
  /** Kartenstapel-Groesse, so wie die App sie sieht. */
  stapel: number
  roundNumber: number
  playRound: number
  pendingWin: boolean
}

/**
 * Merkmale der Stellung NACH meinem Zug.
 * `nach` liefert das Brett, `vor` die Karten; `gespielt` ist die Karte des Zugs.
 */
export function merkmale(nach: AiData, vor: AiData, gespielt: string, lage: Kartenlage, aussetzen: boolean): number[] {
  const f: number[] = []
  const baelle = nach.balls
  for (let p = 0; p < 4; p++) {
    for (let k = 0; k < 4; k++) {
      const j = p * 4 + k
      const b = baelle[j]
      const imRing = b.state === 'valid' || b.state === 'invalid'
      const imHaus = b.state === 'goal' || b.state === 'locked'
      f.push(imRing ? ((((b.position - ballStart(j, baelle)) % 64) + 64) % 64) / 64 : -1)
      f.push(b.state === 'house' ? 1 : 0)
      f.push(imHaus ? 1 : 0)
      f.push((imHaus ? b.position - ballGoal(j, baelle) : -1) / 3)
      f.push(b.state === 'locked' ? 1 : 0)
      f.push(b.state === 'invalid' ? 1 : 0)
    }
    f.push((lage.handGroessen[p] - (p === 0 ? 1 : 0)) / 6)
  }

  const hand = vor.cardsWithMoves.map((c) => grundkarte(c.title))
  const weg = hand.indexOf(gespielt)
  if (weg >= 0) hand.splice(weg, 1)
  for (const k of KARTEN) f.push(hand.filter((h) => h === k).length)

  const ablage = [...vor.discardPile, gespielt]
  for (const k of KARTEN) f.push(ablage.filter((h) => h === k).length / 9)

  f.push(lage.stapel / 104)
  f.push(lage.roundNumber / 20)
  // Die App zaehlt playRound beim Zug nicht hoch.
  f.push(lage.playRound / 24)
  // TAC: die App traegt die KOPIERTE Karte als zuletzt gespielt ein.
  const zuletzt = gespielt === 'tac' ? ([...vor.discardPile].reverse().find((k) => k !== 'tac') ?? 'tac') : gespielt
  for (const k of KARTEN) f.push(zuletzt === k ? 1 : 0)
  f.push(aussetzen ? 1 : 0)
  f.push(lage.pendingWin ? 1 : 0)
  f.push(0)
  return f
}
