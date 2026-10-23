// Die Begriffe der App (Ring, Startfeld, Haus, Fortschritt) auf Oskars AiData.
//
// AiData ist schon gedreht: Sitz 0 bin ich. Seine Positionen:
//   0 .. N-1            Kugeln zu Hause (N = Zahl der Kugeln, 16 bei vier Sitzen)
//   N .. N+Ring-1       der Ring; Sitz p startet bei N + p * Abstand
//   N+Ring ..           die Zielfelder, je Sitz vier
// Die App rechnet auf dem Ring mit 0 .. Ring-1 ab ihrem Feld 0. Hier ist
// Feld 0 das Startfeld von Sitz 0; die App-Formeln rechnen nur mit
// Abstaenden, deshalb ist der Nullpunkt egal.

import type { AiData } from '../simulation/output'
import type { BallsType } from '../../types/ball'
import { ballGoal, getPositionsBetweenStarts } from '../../game/ballUtils'
import { createCardDeck } from '../../game/cardUtils'

export type Baelle = BallsType

export const ringLaenge = (b: Baelle) => (b.length / 4) * getPositionsBetweenStarts(b)
export const startFeld = (spieler: number, b: Baelle) => spieler * getPositionsBetweenStarts(b)

/** Ringfeld 0 .. Ring-1 oder null (zu Hause oder im Ziel). */
export function ringFeld(j: number, b: Baelle): number | null {
  const k = b[j]
  return k.state === 'valid' || k.state === 'invalid' ? k.position - b.length : null
}

export const imHaus = (j: number, b: Baelle) => b[j].state === 'house'
export const imZiel = (j: number, b: Baelle) => b[j].state === 'goal' || b[j].state === 'locked'
/** Zielfeld 0 .. 3, wie `homePosition` der App. */
export const zielFeld = (j: number, b: Baelle) => b[j].position - ballGoal(j, b)
/** Gerade herausgekommen und noch nicht weitergezogen: blockiert, schlaegt nicht. */
export const frischDraussen = (j: number, b: Baelle) => b[j].state === 'invalid'

export const kugelnVon = (spieler: number, b: Baelle) => b.map((_, j) => j).filter((j) => b[j].player === spieler)

export function teamVon(spieler: number, d: AiData): number[] {
  return d.teams.find((t) => t.includes(spieler)) ?? [spieler]
}
export const mitspieler = (a: number, b: number, d: AiData) => teamVon(a, d).includes(b)

/** Alle Kugeln eines Sitzes im Ziel. */
export const alleImZiel = (spieler: number, b: Baelle) => kugelnVon(spieler, b).every((j) => imZiel(j, b))

export const mod = (x: number, n: number) => ((x % n) + n) % n

/**
 * Fortschritt einer Kugel wie `HeuristicAI.progress`: zu Hause -10, im Ziel
 * 70 + 3 je Feld, verriegelt 90, auf dem Ring der gelaufene Weg, ab Feld 40
 * quadratisch verstaerkt.
 */
export function fortschritt(j: number, b: Baelle): number {
  const k = b[j]
  if (k.state === 'house') return -10
  if (k.state === 'locked') return 90
  if (k.state === 'goal') return 70 + zielFeld(j, b) * 3
  const T = ringLaenge(b)
  const gelaufen = mod((ringFeld(j, b) ?? 0) - startFeld(k.player, b), T)
  const linear = (gelaufen * 64) / T
  if (linear >= 40) {
    const t = (linear - 40) / 24
    return linear + t * t * 30
  }
  return linear
}

/** Wie `LookaheadAI.marbleProgress`: ohne die Verstaerkung. */
export function fortschrittLinear(j: number, b: Baelle): number {
  const k = b[j]
  if (k.state === 'house') return -10
  if (k.state === 'locked') return 90
  if (k.state === 'goal') return 70 + zielFeld(j, b) * 3
  // Auf 64 Felder umgerechnet wie bei der Sechser-Fassung; klassisch gleich.
  const T = ringLaenge(b)
  return (mod((ringFeld(j, b) ?? 0) - startFeld(k.player, b), T) * 64) / T
}

/** Wer steht auf diesem Ringfeld? */
export function kugelAuf(feld: number, b: Baelle): number | null {
  for (let j = 0; j < b.length; j++) if (ringFeld(j, b) === feld) return j
  return null
}

// ── Karten ─────────────────────────────────────────────────────────────

/** Wie `HeuristicAI.cardValue`. */
export function kartenWert(karte: string): number {
  switch (karte) {
    case 'tac':
      return 25
    case '7':
      return 22
    case 'teufel':
      return 20
    case '13':
      return 18
    case 'trickser':
      return 16
    case '1':
      return 15
    case 'krieger':
      return 14
    case 'engel':
      return 14
    case '8':
      return 12
    case '4':
      return 10
    case 'narr':
      return 8
    default: {
      const n = Number(karte)
      return Number.isFinite(n) ? n : 0
    }
  }
}

/** Schritte der Karte wie `CardType.steps`: die 4 geht rueckwaerts. */
export function kartenSchritte(karte: string): number | null {
  if (karte === '4') return -4
  const n = Number(karte)
  return Number.isFinite(n) ? n : null
}

export const istStartKarte = (karte: string) => karte === '1' || karte === '13'

/**
 * Kartenzaehler wie `CardCounter` der App: was noch nicht gesehen wurde.
 * Gezaehlt wird gegen SEINEN Stapel (8 Siebener, 7 Trickser), nicht den der
 * App (7 und 8): gespielt wird mit seinen Karten.
 */
export class Kartenzaehler {
  /** Nur fuer den Abgleich mit der Bruecke: Stapel der App (7 Siebener, 8 Trickser). */
  // eslint-disable-next-line sonarjs/public-static-readonly -- Schalter fuer den Abgleich mit der App (heuristik-swift)
  static stapelDerApp = false
  readonly rest: Record<string, number>
  readonly ungesehen: number
  /** Klassisch rechnet die App mit 5 Karten, bei 3 gegen 3 mit der eigenen Handgroesse. */
  readonly hand: number

  constructor(d: AiData) {
    this.hand = d.nPlayers === 6 ? Math.max(1, d.cardsWithMoves.length) : 5
    const rest: Record<string, number> = {}
    for (const k of createCardDeck(d.nPlayers, d.meisterVersion)) rest[k] = (rest[k] ?? 0) + 1
    if (Kartenzaehler.stapelDerApp) {
      rest['7'] = 7
      rest['trickser'] = 8
    }
    const gesehen = [...d.previouslyUsedCards, ...d.discardPile, ...d.cardsWithMoves.map((c) => c.title.replace(/-\d+$/, ''))]
    for (const k of gesehen) if (k in rest) rest[k] = Math.max(0, rest[k] - 1)
    this.rest = rest
    this.ungesehen = Object.values(rest).reduce((a, x) => a + x, 0)
  }

  anzahl(k: string) {
    return this.rest[k] ?? 0
  }
  wahrscheinlichkeit(k: string) {
    return this.ungesehen > 0 ? this.anzahl(k) / this.ungesehen : 0
  }

  /** Wahrscheinlichkeit, dass eine Hand mit ~5 Karten eine davon enthaelt. */
  handEnthaelt(karten: string[]): number {
    const da = karten.reduce((a, k) => a + this.anzahl(k), 0)
    if (this.ungesehen <= 0 || da <= 0) return 0
    const hand = Math.min(this.hand, this.ungesehen)
    const nicht = this.ungesehen - da
    let pKeine = 1
    for (let i = 0; i < hand; i++) {
      const nenner = this.ungesehen - i
      if (nenner <= 0) break
      pKeine *= Math.max(0, nicht - i) / nenner
    }
    return Math.max(0, Math.min(1, 1 - pKeine))
  }
}

/**
 * Wer meine Tauschkarte bekommt. In SEINER Engine wechselt die Richtung jede
 * Runde (`tradeDirection`): Karte von team[i] geht an team[i + Richtung].
 * Bei vier Sitzen ist das immer der eine Partner, bei sechs abwechselnd der
 * eine oder der andere Mitspieler. (Die App gibt fest an Sitz +2.)
 */
export function tauschEmpfaenger(d: AiData): number {
  const team = teamVon(0, d)
  const i = team.indexOf(0)
  return team[mod(i + d.tradeDirection, team.length)]
}
