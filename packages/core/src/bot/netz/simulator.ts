// Weiterspielen fuer die Suche: ein ganzes Spiel in Oskars Engine, mit
// ausgedachten Karten fuer alle, die ich nicht sehe.
//
// `previewMove` baut fuer JEDEN Zug ein neues Spiel per structuredClone. Fuer
// eine Suche mit hunderten Ausspielungen je Zug ist das zu langsam. Hier wird
// einmal ein Spiel gebaut und darin mit checkMove/performAction
// weitergespielt, wie im Messtreiber.

import type { MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import { getMovesFromCards } from '../simulation/simulation'
import { projectMoveToGamePlayer } from '../normalize/normalize'
import { Game } from '../../game/game'
import { getCards } from '../../game/serverOutput'
import { initalizeStatistic } from '../../game/statistic'
import { ballGoal, ballStart } from '../../game/ballUtils'
import { createCardDeck, shuffleArray } from '../../game/cardUtils'
import { kartenlage } from './Netz'
import { grundkarte, merkmale, siebenLaeuft } from './merkmale'
import { type Baelle, ringLaenge, startFeld, tauschEmpfaenger } from './lage'
import { type Art, type Zug, kugelArt, letzteKarte, textArt } from './zuege'
import { besterZug, bewerte, tauschKarte } from './heuristik'

/** Zaehler, damit stille Abbrueche in den Ausspielungen auffallen. */
export const simStatistik = { ausspielungen: 0, eigenerZugAbgelehnt: 0, abgebrochen: 0, zuege: 0, gruende: {} as Record<string, number> }
const grund = (g: string) => {
  simStatistik.gruende[g] = (simStatistik.gruende[g] ?? 0) + 1
}

// ── Spiel bauen ─────────────────────────────────────────────────────────

/**
 * Ein Spiel aus meiner Sicht (ich = Sitz 0), die Haende der anderen und der
 * Stapel zufaellig aus den Karten, die ich noch nicht gesehen habe. Wie
 * `randomizeUnknownCards` der App; Handgroessen wie in `kartenlage`.
 */
export function determinisiere(d: AiData): Game {
  const v = verteilung(d)
  return baueSpiel(d, v.haende, v.stapel)
}

/** Eine zufaellige Verteilung der unbekannten Karten (Haende und Stapel). */
export type Verteilung = { haende: string[][]; stapel: string[] }

/** Spiel aus einer festen Verteilung (die Arrays werden kopiert). */
export function spielAus(d: AiData, v: Verteilung): Game {
  return baueSpiel(
    d,
    v.haende.map((h) => [...h]),
    [...v.stapel]
  )
}

export function verteilung(d: AiData): Verteilung {
  const meine = d.cardsWithMoves.map((c) => c.title)
  const pool = createCardDeck(d.nPlayers, d.meisterVersion)
  const weg = [...d.previouslyUsedCards, ...d.discardPile, ...meine.map(grundkarte)]
  for (const k of weg) {
    const i = pool.indexOf(k)
    if (i >= 0) pool.splice(i, 1)
  }
  shuffleArray(pool)
  const groessen = kartenlage(d).handGroessen
  const haende: string[][] = [meine]
  for (let p = 1; p < d.nPlayers; p++) haende.push(pool.splice(0, Math.min(groessen[p], pool.length)))
  // Die Handgroessen sind geschaetzt; liegt die Schaetzung daneben, ist der
  // Stapel nicht durch die Sitzzahl teilbar und das naechste Geben verteilt
  // ungleich (einer bekommt nichts, die Tauschphase haengt). Also abrunden.
  pool.length -= pool.length % d.nPlayers
  // Leer gibt es den Stapel nie: die Engine mischt sofort nach dem letzten
  // Geben einen neuen (dealCards).
  return { haende, stapel: pool.length > 0 ? pool : createCardDeck(d.nPlayers, d.meisterVersion) }
}

function baueSpiel(d: AiData, haende: string[][], deck: string[], aktiv = 0): Game {
  const n = d.nPlayers
  const game = new Game(
    n,
    d.teams.length,
    d.meisterVersion,
    d.coop,
    structuredClone({
      nPlayers: n,
      coop: d.coop,
      teams: d.teams,
      tradeDirection: d.tradeDirection,
      aussetzenFlag: false,
      teufelFlag: false,
      tradeFlag: false,
      tradedCards: Array.from({ length: n }, (_, i) => (i === 0 ? d.tradedCard : '1')),
      narrFlag: Array.from({ length: n }, () => false),
      narrTradedCards: Array.from({ length: n }, () => null),
      activePlayer: aktiv,
      sevenChosenPlayer: d.sevenChosenPlayer,
      balls: d.balls,
      priorBalls: d.priorBalls,
      gameEnded: false,
      winningTeams: Array.from({ length: d.teams.length }, () => false),
      cards: {
        dealingPlayer: d.dealingPlayer,
        discardPlayer: n - 1,
        discardedFlag: false,
        deck,
        discardPile: d.discardPile,
        players: haende,
        meisterVersion: d.meisterVersion,
        hadOneOrThirteen: d.hadOneOrThirteen,
        previouslyPlayedCards: d.previouslyUsedCards,
      },
      cardsWithMoves: d.cardsWithMoves,
      statistic: initalizeStatistic(n),
      substitutedPlayerIndices: [],
    }) as any
  )
  game.updateCardsWithMoves()
  return game
}

/** Zuege (im Rahmen von Sitz `sitz`) im Spiel ausfuehren. false = abgelehnt. */
export function fuehreAus(game: Game, zuege: MoveTextOrBall[], sitz: number): boolean {
  for (let i = 0; i < zuege.length; i++) {
    if (i > 0) game.updateCardsWithMoves()
    const m = projectMoveToGamePlayer(game, zuege[i], sitz)
    if (!game.checkMove(m)) return false
    // Ohne `performAction`: das kopiert fuer seine Statistik bei JEDEM Zug
    // Brett und Karten (cloneDeep), in der Suche ein Fuenftel der Rechenzeit.
    game.performActionAfterStatistics(m)
  }
  return true
}

// ── Weiterspielen ───────────────────────────────────────────────────────

/**
 * Spielt `zuege` Zuege weiter (Zuege aller Sitze reihum, wie
 * `simulateTurns` der App). Tausch und Narr laufen nebenher und zaehlen
 * nicht; eine 7 zaehlt als ein Zug.
 */
export function spieleWeiter(game: Game, zuege: number): void {
  simStatistik.ausspielungen++
  const fertig = spieleWeiterIntern(game, zuege)
  simStatistik.zuege += fertig
  if (fertig < zuege && !game.gameEnded) simStatistik.abgebrochen++
}

/**
 * Bringt das Spiel bis zur naechsten echten Entscheidung: Geben, Tausch,
 * Narr, „beenden" und leere Haende laufen automatisch. Liefert den Sitz am
 * Zug, oder null (Partie vorbei oder festgefahren).
 */
export function bisZurEntscheidung(game: Game): number | null {
  for (let schutz = 0; schutz < 50 && !game.gameEnded; schutz++) {
    if (game.cards.players.every((p) => p.length === 0)) {
      game.performAction('dealCards', 0)
      game.cards.hadOneOrThirteen = game.cards.players.map((p) => p.some((c) => c === '1' || c === '13'))
    }
    game.updateCardsWithMoves()
    if (game.tradeFlag) {
      const p = game.tradedCards.findIndex((c, i) => c == null && game.cards.players[i].length > 0)
      if (p < 0 || !fuehreAus(game, [tauschKarte(sicht(game, p))], p)) return null
      continue
    }
    if (game.narrFlag.some(Boolean)) {
      const p = game.narrFlag.findIndex((f, i) => !f && game.cards.players[i].length > 0)
      if (p < 0 || !fuehreAus(game, [[p, 0, 'narr']], p)) return null
      continue
    }
    if (game.cards.players[game.activePlayer].length === 0) {
      const n = game.nPlayers
      for (let k = 1; k < n; k++) {
        const p = (game.activePlayer + k) % n
        if (game.cards.players[p].length > 0) {
          game.activePlayer = p
          break
        }
      }
      game.updateCardsWithMoves()
    }
    const sitz = game.activePlayer
    const karten = getCards(game, sitz)
    if (karten.every((c) => !c.possible)) return null
    if (karten.length > 0 && karten.every((c) => c.textAction === 'beenden')) {
      if (!fuehreAus(game, [[sitz, 0, 'beenden']], sitz)) return null
      continue
    }
    return sitz
  }
  return null
}

function spieleWeiterIntern(game: Game, zuege: number): number {
  let gespielt = 0
  for (let schutz = 0; gespielt < zuege && !game.gameEnded && schutz < 400; schutz++) {
    if (game.cards.players.every((p) => p.length === 0)) {
      game.performAction('dealCards', 0)
      game.cards.hadOneOrThirteen = game.cards.players.map((p) => p.some((c) => c === '1' || c === '13'))
    }
    game.updateCardsWithMoves()

    if (game.tradeFlag) {
      const p = game.tradedCards.findIndex((c, i) => c == null && game.cards.players[i].length > 0)
      if (p < 0) {
        grund('tausch: kein Sitz')
        return gespielt
      }
      if (!fuehreAus(game, [tauschKarte(sicht(game, p))], p)) {
        grund('tausch abgelehnt')
        return gespielt
      }
      continue
    }
    if (game.narrFlag.some(Boolean)) {
      const p = game.narrFlag.findIndex((f, i) => !f && game.cards.players[i].length > 0)
      if (p < 0) {
        grund('narr: kein Sitz')
        return gespielt
      }
      const m: MoveTextOrBall = [p, 0, 'narr']
      if (!game.checkMove(m)) {
        grund('narr abgelehnt')
        return gespielt
      }
      game.performActionAfterStatistics(m)
      continue
    }
    // Nach Teufel oder Narr kann die geschaetzte Hand leer sein, waehrend
    // andere noch Karten haben: dann ist der naechste mit Karten dran.
    if (game.cards.players[game.activePlayer].length === 0) {
      const n = game.nPlayers
      for (let k = 1; k < n; k++) {
        const p = (game.activePlayer + k) % n
        if (game.cards.players[p].length > 0) {
          game.activePlayer = p
          break
        }
      }
      game.updateCardsWithMoves()
    }
    const sitz = game.activePlayer
    const karten = getCards(game, sitz)
    if (karten.every((c) => !c.possible)) {
      grund(`kein Zug moeglich (Hand ${karten.length})`)
      return gespielt
    }
    if (karten.length > 0 && karten.every((c) => c.textAction === 'beenden')) {
      const m: MoveTextOrBall = [sitz, 0, 'beenden']
      if (!game.checkMove(m)) {
        grund('beenden abgelehnt')
        return gespielt
      }
      game.performActionAfterStatistics(m)
      continue
    }
    if (!fuehreAus(game, [schnellWahl(sicht(game, sitz))], sitz)) {
      grund(game.teufelFlag ? 'teufel-zug abgelehnt' : 'zug abgelehnt')
      return gespielt
    }
    // Mitten in einer 7 ist derselbe Sitz noch dran: kein neuer Zug. (Die
    // Hand traegt dann '7-3'; die Zugliste wird oben ohnehin neu berechnet.)
    if (!game.cards.players[sitz].some((k) => siebenLaeuft(k))) gespielt++
  }
  return gespielt
}

// ── Schnelle Heuristik fuer die Ausspielungen ───────────────────────────

/**
 * Die Heuristik ohne Probeausfuehrung: das Brett danach wird direkt
 * hingeschrieben (Kugel aufs Ziel, Getroffene nach Hause). Die 7 laeuft
 * gierig Schritt fuer Schritt statt ueber alle Zerlegungen; das ist die
 * eine Abweichung von der Ausspielung der App.
 */
export function schnellWahl(d: AiData, fest = false): MoveTextOrBall {
  const roh = getMovesFromCards(d.cardsWithMoves, d.gamePlayer)
  if (d.teufelFlag) return fest ? roh[0] : roh[Math.floor(Math.random() * roh.length)]
  return besterZug(schnellZuege(d), d, (z) => bewerte(z, d), !fest).erster
}

/** Das Brett nach einem einzelnen Engine-Zug, ohne die Engine (wie in schnellZuege). */
export function schnellNachFuer(d: AiData, m: MoveTextOrBall): Baelle {
  if (m.length === 3) return d.balls
  const titel = d.cardsWithMoves[m[1]].title
  const vor = titel === 'tac' ? d.priorBalls : d.balls
  const karte = titel === 'tac' ? letzteKarte(d) : titel.startsWith('tac-') ? '7' : grundkarte(titel)
  return schnellNach(vor, m[2], m[3], karte)
}

/** Alle Einzelzuege als Zugarten, ohne Probeausfuehrung (die 7 je Schritt). */
export function schnellZuege(d: AiData): Zug[] {
  const roh = getMovesFromCards(d.cardsWithMoves, d.gamePlayer)
  const zuege: Zug[] = []
  for (const m of roh) {
    const titel = d.cardsWithMoves[m[1]].title
    const tac = titel === 'tac' || titel.startsWith('tac-')
    let was: Art
    if (m.length === 3) {
      was = textArt(m[2])
    } else {
      const vor = titel === 'tac' ? d.priorBalls : d.balls
      const karte = titel === 'tac' ? letzteKarte(d) : titel.startsWith('tac-') ? '7' : grundkarte(titel)
      const nach = schnellNach(vor, m[2], m[3], karte)
      const art = kugelArt(karte, m[2], m[3], vor, nach)
      was = karte === '7' && art.art === 'zug' ? { art: 'sieben', teile: [{ ...art.z, schritte: siebenSchritte(m[2], m[3], vor) }] } : art
    }
    zuege.push({ erster: m, schritte: [m], karte: grundkarte(titel), tac, vor: d, nach: d, was })
  }
  return zuege
}

function siebenSchritte(kugel: number, ziel: number, b: Baelle): number {
  const N = b.length,
    T = ringLaenge(b),
    goal = ballGoal(kugel, b)
  const von = b[kugel].position
  if (von >= ballGoal(0, b)) return Math.max(0, ziel - von)
  const vonRing = von - N
  if (ziel >= ballGoal(0, b)) {
    return ((startFeld(b[kugel].player, b) - vonRing + T) % T) + (ziel - goal) + 1
  }
  return (((ziel - N - vonRing) % T) + T) % T
}

/** Das Brett nach einem Kugelzug, ohne die Engine. */
function schnellNach(vor: Baelle, kugel: number, ziel: number, karte: string): Baelle {
  const b = vor.map((k) => ({ ...k }))
  if (karte === 'trickser') {
    const andere = b.findIndex((k, j) => j !== kugel && k.position === ziel)
    if (andere >= 0) {
      b[andere].position = b[kugel].position
      b[kugel].position = ziel
    }
    return b
  }
  const N = b.length,
    goal0 = ballGoal(0, b)
  if (ziel >= N && ziel < goal0) {
    for (let j = 0; j < N; j++) {
      if (j !== kugel && b[j].position === ziel) {
        b[j].state = 'house'
        b[j].position = b[j].player * 4
      }
    }
  }
  b[kugel].position = ziel
  b[kugel].state = ziel < N ? 'house' : ziel >= goal0 ? 'goal' : ziel === ballStart(kugel, b) ? 'invalid' : 'valid'
  return b
}

// ── Bewertung am Ende einer Ausspielung ─────────────────────────────────

/** Wie `MCTSAI.evaluate`, aus Sicht von Sitz 0 (meinem Team). */
export function stellungsWert(game: Game): number {
  const meinTeam = game.teams.findIndex((t) => t.includes(0))
  if (game.gameEnded) {
    const sieger = game.winningTeams.findIndex(Boolean)
    if (sieger >= 0) return sieger === meinTeam ? 1000 : -1000
  }
  const b = game.balls
  const T = ringLaenge(b)
  const team = game.teams[meinTeam]
  let s = 0
  for (let j = 0; j < b.length; j++) {
    const k = b[j]
    const imZiel = k.state === 'goal' || k.state === 'locked'
    const imRing = k.state === 'valid' || k.state === 'invalid'
    const linear = imRing ? (((((k.position - b.length - startFeld(k.player, b)) % T) + T) % T) * 64) / T : 0
    if (team.includes(k.player)) {
      const w = k.player === 0 ? 1 : 0.85
      if (imZiel) s += (k.state === 'locked' ? 110 : 95) * w
      else if (imRing) s += (linear >= 40 ? linear + ((linear - 40) / 24) ** 2 * 25 : linear) * w
      else s -= 10 * w
    } else {
      if (imZiel) s -= k.state === 'locked' ? 80 : 65
      else if (imRing) s -= (linear >= 40 ? linear + ((linear - 40) / 24) ** 2 * 18 : linear) * 0.6
    }
  }
  return s
}

// ── Merkmale einer beliebigen Stellung ─────────────────────────────────

/**
 * Die 160 Merkmale der App (`extractFeatures`) fuer die Stellung im Spiel,
 * aus Sicht von Sitz 0. `merkmale()` ist fuer „nach meinem Zug" gebaut: es
 * nimmt die gespielte Karte aus der Hand, legt sie auf den Stapel und zieht
 * bei mir eine Handkarte ab. Hier gibt es keinen Zug, also wird die zuletzt
 * gespielte Karte als „gespielt" vorgeschoben und die Hand passend erhoeht.
 */
export function merkmaleStand(game: Game, sitz = 0): number[] {
  const d = sicht(game, sitz)
  const stapel = game.cards.discardPile
  const gespielt = stapel.length > 0 ? stapel[stapel.length - 1] : ''
  const hand = game.cards.players[sitz].map((k) => ({ title: grundkarte(k), possible: false, ballActions: {}, textAction: '' }))
  const vor: AiData = {
    ...d,
    cardsWithMoves: gespielt ? [...hand, { title: gespielt, possible: false, ballActions: {}, textAction: '' }] : hand,
    discardPile: stapel.slice(0, -1),
  }
  const groessen = Array.from({ length: game.nPlayers }, (_, p) => game.cards.players[(p + sitz) % game.nPlayers].length)
  groessen[0] += 1
  return merkmale(
    d,
    vor,
    gespielt,
    {
      handGroessen: groessen,
      stapel: game.cards.deck.length,
      roundNumber: 0,
      playRound: 0,
      pendingWin: false,
    },
    game.aussetzenFlag
  )
}

// ── Sicht eines Sitzes, schnell ─────────────────────────────────────────

/**
 * Wie `getAiData`, aber ohne structuredClone: Kugeln und Zuege werden
 * flach umgerechnet. `getAiData` war in der Suche fast ein Sechstel der Zeit.
 */
export function sicht(game: Game, sitz: number): AiData {
  const n = game.nPlayers
  const um = ((-sitz % n) + n) % n
  const b = game.balls
  const N = b.length,
    goal0 = ballGoal(0, b),
    abstand = ringLaenge(b) / n
  const pos = (x: number) => {
    if (um === 0) return x
    if (x < N) return (x + um * 4) % N
    if (x < goal0) return ((x - N + um * abstand) % (goal0 - N)) + N
    return ((x - goal0 + um * 4) % N) + goal0
  }
  const drehe = (baelle: Baelle): Baelle => {
    const aus: Baelle = new Array(N)
    for (let j = 0; j < N; j++) {
      const k = baelle[j]
      aus[(j + um * 4) % N] = { player: (k.player + um) % n, position: pos(k.position), state: k.state }
    }
    return aus
  }
  const karten = getCards(game, sitz).map((c) => {
    const ba: Record<number, number[]> = {}
    for (const k of Object.keys(c.ballActions)) {
      ba[(Number(k) + um * 4) % N] = c.ballActions[Number(k)].map(pos)
    }
    return { title: c.title, possible: c.possible, textAction: c.textAction, ballActions: ba }
  })
  const dreheListe = <T>(a: T[]) => a.map((_, i) => a[(i + sitz) % n])
  return {
    nPlayers: n,
    teams: game.teams,
    coop: game.coop,
    meisterVersion: game.cards.meisterVersion,
    gamePlayer: 0,
    balls: drehe(game.balls),
    priorBalls: drehe(game.priorBalls),
    teufelFlag: game.teufelFlag,
    tradeFlag: game.tradeFlag,
    tradedCard: game.tradedCards[sitz],
    tradeDirection: game.tradeDirection,
    hadOneOrThirteen: dreheListe(game.cards.hadOneOrThirteen),
    narrTradedCards: game.narrTradedCards[sitz],
    cardsWithMoves: karten,
    discardPile: game.cards.discardPile,
    previouslyUsedCards: game.cards.previouslyPlayedCards,
    dealingPlayer: (game.cards.dealingPlayer + um) % n,
    activePlayer: (game.activePlayer + um) % n,
    sevenChosenPlayer: game.sevenChosenPlayer == null ? null : (game.sevenChosenPlayer + um) % n,
  }
}

/**
 * Spiel fuer die Tauschwahl wie `determinizeForTrade` der App: meine Karte
 * `karte` liegt schon beim Partner, der Rest ist zufaellig verteilt. Es zieht,
 * wer die Runde beginnt.
 */
export function spielNachTausch(d: AiData, karte: number): Game | null {
  const meine = d.cardsWithMoves.map((c) => c.title)
  const geben = meine[karte]
  const pool = createCardDeck(d.nPlayers, d.meisterVersion)
  for (const k of [...d.previouslyUsedCards, ...d.discardPile, ...meine]) {
    const i = pool.indexOf(k)
    if (i >= 0) pool.splice(i, 1)
  }
  shuffleArray(pool)
  const partner = tauschEmpfaenger(d)
  const haende: string[][] = [meine.filter((_, i) => i !== karte)]
  for (let p = 1; p < d.nPlayers; p++) {
    const h = pool.splice(0, Math.min(meine.length, pool.length))
    haende.push(p === partner ? [geben, ...h] : h)
  }
  pool.length -= pool.length % d.nPlayers
  const beginner = (d.dealingPlayer + 1) % d.nPlayers
  return baueSpiel(d, haende, pool.length > 0 ? pool : createCardDeck(d.nPlayers, d.meisterVersion), beginner)
}

/**
 * Merkmale der Stellung, wie ich sie gerade sehe (vor meinem Zug), fuer das
 * Politiknetz. Die Kartenlage wie in `kartenlage`, der Stapel errechnet.
 */
export function merkmaleSicht(d: AiData): number[] {
  const stapel = d.discardPile
  const gespielt = stapel.length > 0 ? stapel[stapel.length - 1] : ''
  const hand = d.cardsWithMoves.map((c) => ({ ...c, title: grundkarte(c.title) }))
  const vor: AiData = {
    ...d,
    cardsWithMoves: gespielt ? [...hand, { title: gespielt, possible: false, ballActions: {}, textAction: '' }] : hand,
    discardPile: stapel.slice(0, -1),
  }
  const lage = kartenlage(d)
  const groessen = [...lage.handGroessen]
  const imStapel = createCardDeck(d.nPlayers, d.meisterVersion).length - d.previouslyUsedCards.length - d.discardPile.length - groessen.reduce((a, x) => a + x, 0)
  groessen[0] += 1
  return merkmale(d, vor, gespielt, { ...lage, handGroessen: groessen, stapel: Math.max(0, imStapel) }, false)
}
