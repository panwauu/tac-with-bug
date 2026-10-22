// Übungen des Trainings in Oskars Engine: Stellung aufbauen, Zug ausführen,
// Kugeln in der Zählung der App zurücklesen.
//
// Koordinaten (vier Sitze): Vorfeld 0…15 (Kugel j steht auf Feld j), Ring ab
// 16 (Feld p der App = 16 + p, Schwarz' Startfeld ist 16), Haus ab 80, je
// Sitz 4 Felder. Sitz 0 ist Schwarz, wie in der App.
import { Game } from '@repo/core/game/game'
import { ballStart, ballGoal, resetBalls } from '@repo/core/game/ballUtils'
import type { BallsType, MoveTextOrBall } from '@repo/core/types'
import type { Kugel, Uebung } from './typen'

export const ICH = 0
const SITZE = 4

function setzeKugeln(balls: BallsType, kugeln: Kugel[] | null) {
  for (let j = 0; j < balls.length; j++) balls[j].position = j
  for (const k of kugeln ?? []) {
    const j = k.sitz * 4 + k.idx
    if (k.ort === 'ring') balls[j].position = ballStart(0, balls) + k.pos
    else if (k.ort === 'haus') balls[j].position = ballGoal(j, balls) + k.pos
  }
  resetBalls(balls)
  // Auf dem Startfeld gilt eine Kugel bei ihm immer als frisch draußen
  // ('invalid'). Die App kennt auch Kugeln, die nur zufällig dort stehen.
  for (const k of kugeln ?? []) {
    const j = k.sitz * 4 + k.idx
    if (k.ort === 'ring' && !k.frisch && balls[j].state === 'invalid') balls[j].state = 'valid'
  }
}

/** Eine Übung als laufendes Spiel, Schwarz ist am Zug. */
export function baueSpiel(u: Uebung, phase: 'start' | 'm03' = 'start'): Game {
  const g = new Game(SITZE, 2, true, false)
  g.tradeFlag = false
  g.narrFlag = [false, false, false, false]
  g.activePlayer = ICH
  g.cards.dealingPlayer = 3
  g.cards.deck = []

  if (phase === 'm03') {
    // „Vier TACs in Folge", erster Teil: Schwarz kommt mit der 13 heraus.
    setzeKugeln(g.balls, [])
    g.cards.players = [['13', 'tac'], ['2'], ['2'], ['2']]
    g.priorBalls = structuredClone(g.balls)
    g.updateCardsWithMoves()
    return g
  }

  setzeKugeln(g.balls, u.kugeln)
  // Andere Hände: wo die Übung keine nennt, eine Füllkarte, damit niemand
  // als fertig gilt (sonst überspringt ihn der Narr).
  g.cards.players = [0, 1, 2, 3].map((s) => (s === ICH ? [...u.karten] : [...(u.andereHaende?.[String(s)] ?? ['2'])]))

  // Brett vor dem letzten Zug (für TAC) und Ablagestapel.
  g.priorBalls = structuredClone(g.balls)
  if (u.kugelnVorher != null) setzeKugeln(g.priorBalls, u.kugelnVorher)
  const stapel: string[] = []
  if (u.vorzuege != null) {
    if (u.letzteKarte != null && u.vorzuege[0]?.karte !== u.letzteKarte) stapel.push(u.letzteKarte)
    stapel.push(...u.vorzuege.map((v) => v.karte))
  } else if (u.letzteKarte != null) {
    stapel.push(u.letzteKarte)
  }
  if (u.ausgesetzt) {
    // Schwarz wurde mit einer 8 ausgesetzt: abwerfen oder mit TAC zurückholen.
    if (stapel.length === 0) stapel.push('8')
    g.aussetzenFlag = true
  }
  g.cards.discardPile = stapel

  // „TAC nach Teufel": Schwarz spielt eine Karte aus Blaus Hand für Blau.
  // Bei ihm ist das genau der Teufel-Folgezug (Karten des nächsten Sitzes).
  if (u.id === 's_e13') g.teufelFlag = true

  // Kartentausch-Übung: die anderen haben schon getauscht.
  if (u.id === 's_g12b') {
    g.tradeFlag = true
    g.tradedCards = [null, '2', '2', '2']
  }
  g.updateCardsWithMoves()
  return g
}

/** Zug ausführen; danach ist im Training wieder Schwarz dran (die anderen ziehen nicht). */
export function fuehreAus(g: Game, zug: MoveTextOrBall) {
  g.performAction(zug, 0)
  // Narr: alle anderen geben ihre Hand sofort weiter.
  for (let s = 0; s < SITZE; s++) {
    if (g.narrFlag.some(Boolean) && !g.narrFlag[s] && s !== ICH) g.performAction([s, 0, 'narr'], 0)
  }
  if (g.narrFlag.some(Boolean) && !g.narrFlag[ICH]) g.performAction([ICH, 0, 'narr'], 0)
  // Eigener Zug fertig (nicht mitten in einer 7, nicht im Teufel-Folgezug):
  // zurück zu Schwarz, falls noch Karten da sind.
  if (!g.gameEnded && g.activePlayer !== ICH && g.cards.players[ICH].length > 0) {
    g.activePlayer = ICH
    g.aussetzenFlag = false
    g.teufelFlag = false
    g.updateCardsWithMoves()
  }
}

/** Eine Kugel in der Zählung der App. */
export function kugel(g: Game, sitz: number, idx: number) {
  const j = sitz * 4 + idx
  const b = g.balls[j]
  const start = ballStart(0, g.balls)
  const haus = ballGoal(j, g.balls)
  return {
    vorfeld: b.position < start,
    ring: b.position >= start && b.position < ballGoal(0, g.balls) ? b.position - start : null,
    haus: b.position >= haus && b.position < haus + 4 ? b.position - haus : null,
    gesperrt: b.state === 'locked',
  }
}
