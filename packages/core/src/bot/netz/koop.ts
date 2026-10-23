// Der Kooperativ-Modus („Gemeinsam") der App: `HeuristicAI(cooperative:)`
// mit dem Kooperativ-Netz, `coopRolloutWahl`. Eine Leiter gibt es dort nicht.
//
// Je Kandidat 16 Durchgaenge mit verdeckten Karten (der erste auf einer
// gemeinsamen Verteilung, die weiteren je eigen), acht Karten weit. In der
// Simulation zieht jeder gierig den Zug mit der besten gemeinsamen Stellung
// danach (`coopHeuristikStellungswert`). Am Ende schaetzt das Kooperativ-Netz
// die noch noetigen Karten, aus Sicht dessen, der dann am Zug ist; erreicht
// die Simulation das Ziel, gibt es einen Bonus, je frueher, desto mehr.

import type { MoveText, MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import type { AiInterface } from '../simulation/simulation'
import { getMovesFromCards } from '../simulation/moves'
import type { Game } from '../../game/game'
import { Heuristik, teufelZug } from './heuristik'
import { type Baelle, imHaus, istStartKarte, kartenSchritte, kugelnVon, mod, ringFeld, ringLaenge, startFeld, tauschEmpfaenger, zielFeld } from './lage'
import { siebenLaeuft } from './merkmale'
import { bisZurEntscheidung, fuehreAus, merkmaleStand, schnellNachFuer, schnellZuege, sicht, spielAus, verteilung } from './simulator'
import type { Wertnetz } from './wertnetz'
import { type Zug, SiebenPlan, alleZuege } from './zuege'

/** Stellschrauben wie `CoopWeights.standard`. */
const K = { hausTiefe: 8, laufWert: 15, zielBonus: 400, tiefe: 8, schaetzungen: 16, zielSkala: 100 }

/**
 * Versuchsschalter (`koop:s=32,t=4,crn=0`). Standard wie die App, nur mit
 * crn=1 (15.10.: 169 statt 179 Karten, n=320 gegen 160, zwei Laeufe).
 * crn: alle Kandidaten auf denselben Verteilungen messen (gemeinsame
 * Zufallszahlen), statt jeder auf eigenen.
 * h: schrittweises Aussortieren (Sequential Halving) bei gleichem
 * Gesamtbudget s je Kandidat: Runde um Runde faellt die schlechtere
 * Haelfte weg, die Durchgaenge gehen an die engen Entscheidungen.
 * tw: Tauschkarte per Vorausschau (`coopTauschWahl` der App) statt per
 * Faustregel; Standard seit 19.10.: 162,4 statt 170,8 Karten (je n=160).
 */
export type KoopOptionen = { s: number; t: number; crn: number; h: number; tw: number }
export function koopOptionen(text = ''): KoopOptionen {
  const o: KoopOptionen = { s: K.schaetzungen, t: K.tiefe, crn: 1, h: 0, tw: 1 }
  for (const teil of text.split(',').filter(Boolean)) {
    const [k, v] = teil.split('=')
    if (!(k in o)) throw new Error(`unbekannter Koop-Schalter ${k}`)
    Object.assign(o, { [k]: Number(v) })
  }
  return o
}

/** Wie `coopHeuristikStellungswert`: alle Kugeln aller Spieler zaehlen gleich. */
export function koopStellungswert(b: Baelle): number {
  const T = ringLaenge(b)
  let w = 0
  for (let j = 0; j < b.length; j++) {
    const k = b[j]
    if (k.state === 'goal' || k.state === 'locked') w += 100 + zielFeld(j, b) * K.hausTiefe
    else if (k.state === 'valid' || k.state === 'invalid') {
      const gelaufen = mod((ringFeld(j, b) ?? 0) - startFeld(k.player, b), T)
      w += 10 + (gelaufen / T) * K.laufWert
    }
  }
  return w
}

const alleFertig = (b: Baelle) => b.every((k) => k.state === 'goal' || k.state === 'locked')

export class Kooperativ implements AiInterface {
  private plan = new SiebenPlan()
  private heuristik = new Heuristik()

  constructor(
    private netz: Wertnetz,
    private o: KoopOptionen = koopOptionen()
  ) {
    this.choose = this.choose.bind(this)
  }

  choose(d: AiData): MoveTextOrBall {
    if (d.tradedCard == null) return this.o.tw ? this.tauschSuche(d) : koopTausch(d)
    if (d.teufelFlag) return teufelZug(d)
    const weiter = this.plan.weiter(d)
    if (weiter) return weiter

    const gesehen = new Set<string>()
    const zuege = alleZuege(d).filter((z) => {
      const k = z.karte + '|' + JSON.stringify(z.nach.balls) + '|' + z.was.art
      if (gesehen.has(k)) return false
      gesehen.add(k)
      return true
    })
    if (zuege.length <= 1) return zuege[0]?.erster ?? this.heuristik.choose(d)
    const ziel = zuege.find((z) => z.was.art !== 'abwerfen' && alleFertig(z.nach.balls))
    if (ziel) {
      this.plan.merke(ziel)
      return ziel.erster
    }

    if (this.o.h) {
      const z = this.halbieren(d, zuege)
      this.plan.merke(z)
      return z.erster
    }
    const S = this.o.s
    const gemeinsam = Array.from({ length: this.o.crn ? S : 1 }, () => verteilung(d))
    let bester = zuege[0],
      besterWert = -Infinity
    for (const z of zuege) {
      let summe = 0
      for (let k = 0; k < S; k++) {
        const game = spielAus(d, k < gemeinsam.length ? gemeinsam[k] : verteilung(d))
        summe += fuehreAus(game, z.schritte, 0) ? this.ausspielen(game) : -1e6
      }
      if (summe / S > besterWert) {
        besterWert = summe / S
        bester = z
      }
    }
    this.plan.merke(bester)
    return bester.erster
  }

  /** Sequential Halving auf gemeinsamen Verteilungen (immer crn). */
  private halbieren(d: AiData, zuege: Zug[]): Zug {
    const budget = this.o.s * zuege.length
    const runden = Math.max(1, Math.ceil(Math.log2(zuege.length)))
    const verteilungen: ReturnType<typeof verteilung>[] = []
    const summe = new Map<Zug, number>(),
      anzahl = new Map<Zug, number>()
    let im = [...zuege]
    for (let r = 0; r < runden && im.length > 1; r++) {
      const je = Math.max(1, Math.floor(budget / runden / im.length))
      for (const z of im) {
        const von = anzahl.get(z) ?? 0
        let su = summe.get(z) ?? 0
        for (let k = von; k < von + je; k++) {
          while (verteilungen.length <= k) verteilungen.push(verteilung(d))
          const game = spielAus(d, verteilungen[k])
          su += fuehreAus(game, z.schritte, 0) ? this.ausspielen(game) : -1e6
        }
        summe.set(z, su)
        anzahl.set(z, von + je)
      }
      const mittel = (z: Zug) => (summe.get(z) ?? 0) / (anzahl.get(z) ?? 1)
      im.sort((a, b) => mittel(b) - mittel(a))
      im = im.slice(0, Math.ceil(im.length / 2))
    }
    return im[0]
  }

  /**
   * Wie `coopTauschWahl` der App: jede Handkarte als Gabe, auf denselben
   * Verteilungen; die anderen tauschen nach der Faustregel, dann wird die
   * Runde `t` Karten weit angespielt und wie ein Zug bewertet.
   */
  private tauschSuche(d: AiData): MoveText {
    const n = d.cardsWithMoves.length
    if (n <= 1) return koopTausch(d)
    const verteilungen = Array.from({ length: this.o.s }, () => tauschVerteilung(d))
    let beste = 0,
      besterWert = -Infinity
    for (let i = 0; i < n; i++) {
      let summe = 0
      for (const v of verteilungen) {
        const game = spielAus(d, v, d.activePlayer)
        game.tradeFlag = true
        game.tradedCards = game.tradedCards.map(() => null)
        let ok = fuehreAus(game, [[0, i, 'tauschen']], 0)
        for (let p = 1; ok && p < d.nPlayers; p++) {
          game.updateCardsWithMoves()
          ok = fuehreAus(game, [koopTausch(sicht(game, p))], p)
        }
        summe += ok ? this.ausspielen(game) : -1e6
      }
      if (summe > besterWert) {
        besterWert = summe
        beste = i
      }
    }
    return [0, beste, 'tauschen']
  }

  private ausspielen(game: Game): number {
    let karten = 0
    const T = this.o.t
    for (let schutz = 0; karten < T && !game.gameEnded && schutz < 400; schutz++) {
      const sitz = bisZurEntscheidung(game)
      if (sitz == null) break
      if (!fuehreAus(game, [gierig(sicht(game, sitz))], sitz)) break
      if (!game.cards.players[sitz].some((k) => siebenLaeuft(k))) karten++
    }
    if (game.gameEnded || alleFertig(game.balls)) {
      return (K.zielBonus * (T - karten + 1)) / (T + 1)
    }
    const amZug = bisZurEntscheidung(game) ?? game.activePlayer
    return -(this.netz.wert(merkmaleStand(game, amZug)) * K.zielSkala)
  }
}

/** Gierig: der Zug mit der besten gemeinsamen Stellung danach. */
function gierig(d: AiData): MoveTextOrBall {
  const roh = getMovesFromCards(d.cardsWithMoves, d.gamePlayer)
  if (d.teufelFlag || roh.length <= 1) return roh[Math.floor(Math.random() * roh.length)]
  let bester = roh[0],
    besterWert = -Infinity
  for (const z of schnellZuege(d)) {
    const w = koopStellungswert(schnellNachFuer(d, z.erster))
    if (w > besterWert) {
      besterWert = w
      bester = z.erster
    }
  }
  return bester
}

// ── Tausch ──────────────────────────────────────────────────────────────

/** Verteilung zur Tauschzeit: noch hat niemand gespielt, alle Haende gleich gross. */
function tauschVerteilung(d: AiData): ReturnType<typeof verteilung> {
  const v = verteilung(d)
  const n = d.cardsWithMoves.length
  const rest = [...v.stapel]
  for (let p = 1; p < d.nPlayers; p++) {
    while (v.haende[p].length < n) {
      const karte = rest.pop()
      if (karte === undefined) break
      v.haende[p].push(karte)
    }
  }
  rest.length -= rest.length % d.nPlayers
  return { haende: v.haende, stapel: rest.length > 0 ? rest : v.stapel }
}

/**
 * Wie die App im Kooperativ-Modus: weg kommt die Karte, die beim Empfaenger
 * am meisten mehr bringt als bei mir (`coopKartenNutzen`).
 */
export function koopTausch(d: AiData): MoveText {
  const hand = d.cardsWithMoves.map((c) => c.title)
  const empfaenger = tauschEmpfaenger(d)
  let beste = 0,
    besterGewinn = -Infinity
  hand.forEach((k, i) => {
    const gewinn = kartenNutzen(k, empfaenger, d.balls) - kartenNutzen(k, 0, d.balls)
    if (gewinn > besterGewinn) {
      besterGewinn = gewinn
      beste = i
    }
  })
  return [0, beste, 'tauschen']
}

function kartenNutzen(karte: string, p: number, b: Baelle): number {
  const T = ringLaenge(b)
  const meine = kugelnVon(p, b)
  const imVorfeld = meine.filter((j) => imHaus(j, b)).length
  const unterwegs = meine.filter((j) => ringFeld(j, b) != null)
  let nutzen = 0
  if (istStartKarte(karte)) nutzen += imVorfeld > 0 ? 30 + imVorfeld * 8 : 2
  const schritte = kartenSchritte(karte)
  if (schritte != null && schritte > 0) {
    for (const j of unterwegs) {
      if (b[j].state === 'invalid') continue
      const bis = mod(startFeld(p, b) - (ringFeld(j, b) ?? 0), T)
      if (schritte > bis && schritte - bis <= 4) nutzen += 26
      else if (bis > 0 && schritte <= bis) nutzen += 6 + schritte * 0.4
      else if (bis > 0) nutzen -= 4
    }
  }
  if (karte === '7') nutzen += unterwegs.length === 0 ? 4 : 20
  if (karte === 'tac' || karte === 'trickser' || karte === 'engel') nutzen += 10
  if (karte === 'teufel') nutzen += 8
  if (karte === '4') {
    const kurzHinterStart = unterwegs.some((j) => mod((ringFeld(j, b) ?? 0) - startFeld(p, b), T) <= 4)
    nutzen += kurzHinterStart ? 18 : 3
  }
  return nutzen
}

export type { Zug }
