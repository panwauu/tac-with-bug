// Die KI-Leiter fuer 3 gegen 3 (`SixAI.swift`, `makeSixAI`):
//
//   streuner        Zufall
//   gruenschnabel   Heuristik mit Rauschen 45, 18 % Patzer
//   wanderer        Heuristik mit Rauschen 12
//   kundschafterin  Vorausschau (Sechser-Fassung: alle Mitspieler, eigene Handgroesse)
//   kartograf       Rollout-Suche, 3 Durchgaenge, top-6
//   verschollene    Rollout-Suche, 24 Durchgaenge, top-8
//   faehrtenleger   Rollout-Suche, top-12, frueher Abbruch (4 bis 24),
//                   Zwangsabwurf nach Nennwert, Tauschkarte gesucht (8 x 18)
//
// Die Rollout-Suche (`SixRolloutAI`): die Heuristik waehlt die besten k
// Kandidaten; je Durchgang EINE Kartenverteilung fuer alle (gepaart), jeder
// Kandidat sechs Zuege weitergespielt. In den Simulationen gewinnt unter den
// drei Heuristik-Favoriten der Zug mit der besten Stellung danach. Bewertet
// wird mit `stellungswert`: Fortschritt des eigenen Teams minus der Gegner.

import type { MoveText, MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import type { AiInterface } from '../simulation/simulation'
import { getMovesFromCards } from '../simulation/moves'
import type { Game } from '../../game/game'
import { Heuristik, besterZug, bewerte, tauschKarte, teufelZug } from './heuristik'
import { type Baelle, Kartenzaehler, kartenWert, mod, ringFeld, ringLaenge, startFeld, tauschEmpfaenger, zielFeld } from './lage'
import { siebenLaeuft } from './merkmale'
import { bisZurEntscheidung, fuehreAus, schnellNachFuer, schnellZuege, sicht, spielAus, verteilung } from './simulator'
import { Vorausschau, Zufall, vorausWert } from './stufen'
import { type Zug, SiebenPlan, alleZuege, gewonnen } from './zuege'

// ── Rauschende Heuristik ────────────────────────────────────────────────

export class RauschendeHeuristik implements AiInterface {
  private plan = new SiebenPlan()
  private heuristik = new Heuristik()
  constructor(
    private rauschen: number,
    private patzer = 0
  ) {
    this.choose = this.choose.bind(this)
  }

  choose(d: AiData): MoveTextOrBall {
    if (d.tradedCard == null) {
      if (this.patzer > 0 && Math.random() < this.patzer) {
        return [0, Math.floor(Math.random() * d.cardsWithMoves.length), 'tauschen'] as MoveText
      }
      return tauschKarte(d)
    }
    if (d.teufelFlag) return teufelZug(d)
    const weiter = this.plan.weiter(d)
    if (weiter) return weiter
    const zuege = alleZuege(d)
    if (zuege.length <= 1) return this.heuristik.choose(d)
    let z: Zug
    if (this.patzer > 0 && Math.random() < this.patzer) {
      z = zuege[Math.floor(Math.random() * zuege.length)]
    } else {
      let best = -Infinity
      z = zuege[0]
      for (const k of zuege) {
        const w = bewerte(k, d) + (Math.random() * 2 - 1) * this.rauschen
        if (w > best) {
          best = w
          z = k
        }
      }
    }
    this.plan.merke(z)
    return z.erster
  }
}

// ── Stellungswert ───────────────────────────────────────────────────────

/** Wie `SixRolloutAI.stellungswert`, aus Sicht des Teams von Sitz 0. */
export function stellungswertSechs(b: Baelle, teams: number[][], ende?: { sieger: number | null }): number {
  const T = ringLaenge(b)
  const meinTeam = teams.find((t) => t.includes(0)) ?? []
  let eigen = 0,
    fremd = 0
  for (let j = 0; j < b.length; j++) {
    const k = b[j]
    let w = 0
    if (k.state === 'goal' || k.state === 'locked') w = 110 + zielFeld(j, b) * 4
    else if (k.state === 'valid' || k.state === 'invalid') w = 12 + (mod((ringFeld(j, b) ?? 0) - startFeld(k.player, b), T) * 64) / T
    if (meinTeam.includes(k.player)) eigen += w
    else fremd += w
  }
  let wert = eigen - fremd
  if (ende && ende.sieger != null) wert += teams[ende.sieger].includes(0) ? 5000 : -5000
  return wert
}

function wertImSpiel(game: Game): number {
  const sieger = game.gameEnded ? game.winningTeams.findIndex(Boolean) : -1
  // Das Spiel ist aus Sicht von Sitz 0 gebaut.
  return stellungswertSechs(game.balls, game.teams, { sieger: sieger < 0 ? null : sieger })
}

// ── Simulation mit der Stellungswert-Politik ────────────────────────────

/**
 * Wie `simuliere` der App: `tiefe` Karten reihum, jede mit der Politik
 * „von den drei Heuristik-Favoriten der mit der besten Stellung danach".
 */
function simuliere(game: Game, tiefe: number, breite = 3): void {
  let karten = 0
  for (let schutz = 0; karten < tiefe && !game.gameEnded && schutz < 400; schutz++) {
    const sitz = bisZurEntscheidung(game)
    if (sitz == null) return
    const d = sicht(game, sitz)
    if (!fuehreAus(game, [politikZug(d, breite)], sitz)) return
    if (!game.cards.players[sitz].some((k) => siebenLaeuft(k))) karten++
  }
}

function politikZug(d: AiData, breite: number): MoveTextOrBall {
  const roh = getMovesFromCards(d.cardsWithMoves, d.gamePlayer)
  if (d.teufelFlag || roh.length <= 1) return roh[Math.floor(Math.random() * roh.length)]
  const zuege = schnellZuege(d)
  const werte = zuege.map((z) => bewerte(z, d))
  const engste = werte
    .map((w, i) => [w, i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, breite)
  let bester = zuege[engste[0][1]],
    note = -Infinity
  for (const [w, i] of engste) {
    const z = zuege[i]
    let n: number
    if (z.was.art === 'abwerfen' || z.was.art === 'beenden' || z.erster.length === 3) n = w
    else n = stellungswertSechs(schnellNachFuer(d, z.erster), d.teams)
    if (n > note) {
      note = n
      bester = z
    }
  }
  return bester.erster
}

// ── Rollout-Suche ───────────────────────────────────────────────────────

export type RolloutEinstellung = {
  durchgaenge: number
  tiefe: number
  topK: number
  nennwertAbwurf?: boolean
  adaptivMin?: number
  adaptivMax?: number
  adaptivSchwelle?: number
  tauschSuche?: number
  tauschTiefe?: number
}

export class RolloutSuche implements AiInterface {
  private plan = new SiebenPlan()
  private heuristik = new Heuristik()

  /** Zeitgrenze je Entscheidung in ms (Browser); 0 = keine, wie in der App. */
  zeitGrenze = 0
  /** Beginn der laufenden Entscheidung: die Grenze gilt fuer den ganzen Zug. */
  private beginn = 0

  constructor(private e: RolloutEinstellung) {
    this.choose = this.choose.bind(this)
  }

  choose(d: AiData): MoveTextOrBall {
    // Die Zeitgrenze gilt fuer den ganzen Zug. Stand frueher versehentlich in
    // RauschendeHeuristik: hier blieb beginn = 0, die Frist war im Browser
    // sofort abgelaufen und die Suche rechnete nur das Minimum.
    this.beginn = performance.now()
    if (d.tradedCard == null) {
      return this.e.tauschSuche ? this.tauschSuche(d) : tauschKarte(d)
    }
    if (d.teufelFlag) return teufelZug(d)
    const weiter = this.plan.weiter(d)
    if (weiter) return weiter

    const gesehen = new Set<string>()
    const frist = this.zeitGrenze > 0 ? this.beginn + this.zeitGrenze * 0.4 : Infinity
    let zuege = alleZuege(d, frist).filter((z) => {
      const k = z.karte + '|' + JSON.stringify(z.nach.balls) + '|' + z.was.art
      if (gesehen.has(k)) return false
      gesehen.add(k)
      return true
    })
    if (zuege.length <= 1) return this.heuristik.choose(d)
    const sieg = zuege.find((z) => z.was.art !== 'abwerfen' && gewonnen(z.nach))
    if (sieg) {
      this.plan.merke(sieg)
      return sieg.erster
    }
    if (this.e.nennwertAbwurf && zuege.every((z) => z.was.art === 'abwerfen')) {
      return zuege.reduce((a, b) => (kartenWert(b.karte) < kartenWert(a.karte) ? b : a)).erster
    }
    // Vorauswahl: die besten k nach Heuristik.
    if (this.e.topK > 0 && zuege.length > this.e.topK) {
      zuege = zuege
        .map((z) => [z, bewerte(z, d)] as const)
        .sort((a, b) => b[1] - a[1])
        .slice(0, this.e.topK)
        .map(([z]) => z)
    }
    const summen = this.e.adaptivMin ? this.bewerteAdaptiv(zuege, d) : this.bewerte(zuege, d, this.e.durchgaenge)
    const best = Math.max(...summen)
    const knapp = zuege.filter((_, i) => summen[i] >= best - 0.001)
    let z: Zug
    if (knapp.length > 1) {
      // Gleichstand: die Vorausschau entscheidet (wie die App).
      const zaehler = new Kartenzaehler(d)
      z = besterZug(knapp, d, (k) => vorausWert(k, d, zaehler))
    } else {
      z = knapp[0]
    }
    this.plan.merke(z)
    return z.erster
  }

  private einDurchgang(zuege: Zug[], d: AiData): number[] {
    const v = verteilung(d)
    return zuege.map((z) => {
      const game = spielAus(d, v)
      if (!fuehreAus(game, z.schritte, 0)) return wertImSpiel(game)
      simuliere(game, this.e.tiefe)
      return wertImSpiel(game)
    })
  }

  private bewerte(zuege: Zug[], d: AiData, durchgaenge: number): number[] {
    const summen = new Array<number>(zuege.length).fill(0)
    const ende = this.zeitGrenze > 0 ? this.beginn + this.zeitGrenze : Infinity
    for (let i = 0; i < durchgaenge; i++) {
      if (i > 0 && performance.now() > ende) break
      this.einDurchgang(zuege, d).forEach((w, k) => {
        summen[k] += w
      })
    }
    return summen
  }

  /** Wie `bewerteAdaptiv`: aufhoeren, wenn der Fuehrende gepaart klar vorn liegt. */
  private bewerteAdaptiv(zuege: Zug[], d: AiData): number[] {
    const k = zuege.length
    const werte: number[][] = zuege.map(() => [])
    const summen = new Array<number>(k).fill(0)
    const min = this.e.adaptivMin ?? 0,
      max = Math.max(this.e.adaptivMax ?? min, min)
    const schwelle = this.e.adaptivSchwelle ?? 2
    const ende = this.zeitGrenze > 0 ? this.beginn + this.zeitGrenze : Infinity
    for (let durchgang = 0; durchgang < max; durchgang++) {
      if (durchgang > 0 && performance.now() > ende) break
      this.einDurchgang(zuege, d).forEach((w, i) => {
        werte[i].push(w)
        summen[i] += w
      })
      const n = durchgang + 1
      if (n < min || n >= max) continue
      let erster = 0
      for (let i = 1; i < k; i++) if (summen[i] > summen[erster]) erster = i
      let zweiter = -1
      for (let i = 0; i < k; i++) if (i !== erster && (zweiter < 0 || summen[i] > summen[zweiter])) zweiter = i
      if (zweiter < 0) break
      let s = 0,
        s2 = 0
      for (let j = 0; j < n; j++) {
        const x = werte[erster][j] - werte[zweiter][j]
        s += x
        s2 += x * x
      }
      const mittel = s / n
      const varianz = (Math.max(0, s2 / n - mittel * mittel) * n) / (n - 1)
      const fehler = Math.sqrt(varianz / n)
      if (fehler < 1e-9) {
        if (mittel > 0) break
        else continue
      }
      if (mittel > schwelle * fehler) break
    }
    return summen
  }

  /**
   * Wie `SixRolloutAI.chooseSwapCard`: je Probe eine Verteilung; ich bekomme
   * statt der Karte eine zufaellige vom Stapel, der Empfaenger tauscht eine
   * zufaellige gegen meine; dann `tauschTiefe` Karten weiter.
   */
  private tauschSuche(d: AiData): MoveText {
    const hand = d.cardsWithMoves.map((c) => c.title)
    if (hand.length <= 1) return tauschKarte(d)
    const empfaenger = tauschEmpfaenger(d)
    const summen = new Array<number>(hand.length).fill(0)
    for (let p = 0; p < (this.e.tauschSuche ?? 0); p++) {
      const v = verteilung(d)
      const zurueck = v.stapel.pop()
      if (zurueck == null) break
      const weg = Math.floor(Math.random() * Math.max(1, v.haende[empfaenger].length))
      hand.forEach((karte, i) => {
        const haende = v.haende.map((h) => [...h])
        haende[0][i] = zurueck
        if (haende[empfaenger].length) haende[empfaenger][weg] = karte
        const game = spielAus(d, { haende, stapel: v.stapel })
        game.tradeFlag = false
        game.activePlayer = (d.dealingPlayer + 1) % d.nPlayers
        game.updateCardsWithMoves()
        simuliere(game, this.e.tauschTiefe ?? 18)
        summen[i] += wertImSpiel(game)
      })
    }
    let beste = 0
    for (let i = 1; i < hand.length; i++) if (summen[i] > summen[beste]) beste = i
    return [0, beste, 'tauschen']
  }
}

/** Bot nach Namen (3 gegen 3). */
export function sechserBot(name: string): AiInterface | null {
  switch (name) {
    case 'streuner':
      return new Zufall()
    case 'gruenschnabel':
      return new RauschendeHeuristik(45, 0.18)
    case 'wanderer':
      return new RauschendeHeuristik(12)
    case 'kundschafterin':
      return new Vorausschau()
    case 'kartograf':
      return new RolloutSuche({ durchgaenge: 3, tiefe: 6, topK: 6 })
    case 'verschollene':
      return new RolloutSuche({ durchgaenge: 24, tiefe: 6, topK: 8 })
    case 'faehrtenleger':
      return new RolloutSuche({
        durchgaenge: 24,
        tiefe: 6,
        topK: 12,
        nennwertAbwurf: true,
        adaptivMin: 4,
        adaptivMax: 24,
        adaptivSchwelle: 2,
        tauschSuche: 8,
        tauschTiefe: 18,
      })
    default:
      return null
  }
}
