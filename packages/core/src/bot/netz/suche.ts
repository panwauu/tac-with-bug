// Stufe 4 „Theo" (200 Ausspielungen) und Stufe 6 „Der Buchhalter" (400):
// `MCTSAI` der App, eine Banditen-Suche ueber die eigenen Zuege.
//
// Je Durchgang: einen Zug waehlen (UCB1, erst jeder einmal), die unbekannten
// Karten neu verteilen, den Zug ausfuehren, sechs Zuege reihum mit der
// Heuristik weiterspielen, die Stellung bewerten. Gewaehlt wird der Zug mit
// den meisten Besuchen.

import type { MoveText, MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import type { AiInterface } from '../simulation/simulation'
import { Heuristik, bewerte, tauschKarte, teufelZug } from './heuristik'
import { determinisiere, fuehreAus, merkmaleSicht, merkmaleStand, simStatistik, spielNachTausch, spieleWeiter, stellungsWert } from './simulator'
import { type Politiknetz, zugWahrscheinlichkeiten } from './politiknetz'
import { istStartKarte, kugelnVon, tauschEmpfaenger } from './lage'
import type { Wertnetz } from './wertnetz'
import { type Zug, SiebenPlan, alleZuege, gewonnen } from './zuege'

export class Suche implements AiInterface {
  private plan = new SiebenPlan()
  private heuristik = new Heuristik()

  /**
   * `netz` gesetzt: Hybrid (`HybridMCTSAI`), das Wertnetz bewertet das Ende
   * jeder Ausspielung statt der Formel von `MCTSAI.evaluate`.
   */
  /**
   * `politik` gesetzt: Schatten (`HumanPolicyHybridAI`). Das Politiknetz gibt
   * jedem Wurzelzug acht virtuelle Besuche mit einem Startwert zwischen 0,45
   * und 0,55, die Suche beginnt also leicht beim menschlichsten Zug.
   * `wertTausch`: die Tauschkarte per kurzer Vorausschau mit dem Wertnetz.
   */
  /** Zeitgrenze je Entscheidung in ms (Browser); 0 = keine, wie in der App. */
  zeitGrenze = 0
  /** Beginn der laufenden Entscheidung: die Grenze gilt fuer den ganzen Zug. */
  private beginn = 0

  constructor(
    private durchgaenge = 400,
    private tiefe = 6,
    private c = 1.414,
    private netz: Wertnetz | null = null,
    private politik: Politiknetz | null = null,
    private wertTausch = false
  ) {
    this.choose = this.choose.bind(this)
  }

  choose(d: AiData): MoveTextOrBall {
    this.beginn = performance.now()
    if (d.tradedCard == null) {
      return this.wertTausch && this.netz ? tiefTausch(d, this.netz, 6, 8, this.zeitGrenze) : tauschKarte(d)
    }
    if (d.teufelFlag) return teufelZug(d)
    const weiter = this.plan.weiter(d)
    if (weiter) return weiter

    // Gleiche Zuege (gleiche Karte, gleiches Brett danach) nur einmal.
    const gesehen = new Set<string>()
    const frist = this.zeitGrenze > 0 ? this.beginn + this.zeitGrenze * 0.4 : Infinity
    const zuege = alleZuege(d, frist).filter((z) => {
      const k = z.karte + '|' + JSON.stringify(z.nach.balls) + '|' + z.was.art
      if (gesehen.has(k)) return false
      gesehen.add(k)
      return true
    })
    const spielbar = zuege.filter((z) => z.was.art !== 'abwerfen' && z.was.art !== 'beenden')
    if (zuege.length <= 1 || spielbar.length === 0) {
      return this.heuristik.choose(d)
    }
    // Siegzug sofort
    const sieg = spielbar.find((z) => gewonnen(z.nach))
    if (sieg) {
      this.plan.merke(sieg)
      return sieg.erster
    }

    const z = this.suche(zuege, d)
    this.plan.merke(z)
    return z.erster
  }

  private suche(zuege: Zug[], d: AiData): Zug {
    const n = zuege.length
    const besuche = new Array<number>(n).fill(0)
    const summe = new Array<number>(n).fill(0)
    let ersterRundgang = true
    if (this.politik) {
      const p = zugWahrscheinlichkeiten(this.politik, merkmaleSicht(d), zuege)
      const maxP = Math.max(...p)
      if (maxP > 0) {
        for (let i = 0; i < n; i++) {
          besuche[i] = 8
          summe[i] = 8 * (0.45 + 0.1 * (p[i] / maxP))
        }
        ersterRundgang = false
      }
    }
    const ende = this.zeitGrenze > 0 ? this.beginn + this.zeitGrenze : Infinity
    for (let iter = 0; iter < this.durchgaenge; iter++) {
      // Jeder Zug mindestens einmal, dann darf die Uhr abbrechen.
      if (iter >= n && performance.now() > ende) break
      let arm: number
      if (ersterRundgang && iter < n) {
        arm = iter
      } else {
        const logGesamt = ersterRundgang ? Math.log(iter) : Math.log(besuche.reduce((a, x) => a + x, 0))
        arm = 0
        let best = -Infinity
        for (let i = 0; i < n; i++) {
          const q = besuche[i] > 0 ? summe[i] / besuche[i] : Infinity
          const u = q + this.c * Math.sqrt(logGesamt / Math.max(1, besuche[i]))
          if (u > best) {
            best = u
            arm = i
          }
        }
      }
      besuche[arm]++
      summe[arm] += this.ausspielen(zuege[arm], d)
    }
    let bester = 0
    for (let i = 1; i < n; i++) if (besuche[i] > besuche[bester]) bester = i
    return zuege[bester]
  }

  /** Ein Durchgang: Belohnung in [0, 1] aus Sicht meines Teams. */
  private ausspielen(z: Zug, d: AiData): number {
    if (z.was.art === 'abwerfen' || z.was.art === 'beenden') {
      return Math.max(0, Math.min(1, (bewerte(z, d) + 200) / 400))
    }
    const game = determinisiere(d)
    if (!fuehreAus(game, z.schritte, 0)) {
      simStatistik.eigenerZugAbgelehnt++
      return 0.5
    }
    spieleWeiter(game, this.tiefe)
    if (this.netz) {
      if (game.gameEnded) {
        const sieger = game.winningTeams.findIndex(Boolean)
        return sieger < 0 ? 0.5 : game.teams[sieger].includes(0) ? 1 : 0
      }
      const w = this.netz.wert(merkmaleStand(game))
      return (Math.max(-1, Math.min(1, w)) + 1) / 2
    }
    return Math.max(0, Math.min(1, (stellungsWert(game) + 500) / 1000))
  }
}

/**
 * Wie `deepTradeChoice` der App: fuer jede in Frage kommende Karte sechs
 * Verteilungen, in denen der Partner sie schon hat, acht Zuege weiter, dann
 * das Wertnetz. Die Startkarten-Regeln der Heuristik gelten vorab.
 */
export function tiefTausch(d: AiData, netz: Wertnetz, proben = 6, horizont = 8, zeitGrenze = 0): MoveText {
  const ende = zeitGrenze > 0 ? performance.now() + zeitGrenze : Infinity
  const hand = d.cardsWithMoves.map((c) => c.title)
  if (hand.length <= 1) return tauschKarte(d)
  const partner = tauschEmpfaenger(d)
  const brauchtStart = (p: number) => kugelnVon(p, d.balls).every((j) => d.balls[j].state === 'house')
  const ich = brauchtStart(0),
    er = brauchtStart(partner)
  if (!ich && er) {
    const i = hand.findIndex(istStartKarte)
    if (i >= 0) return [0, i, 'tauschen']
  }
  let kandidaten = hand.map((_, i) => i)
  if (ich) {
    const ohne = kandidaten.filter((i) => !istStartKarte(hand[i]))
    if (ohne.length) kandidaten = ohne
  }
  let beste = -1,
    besterWert = -Infinity
  const gesehen = new Set<string>()
  for (const i of kandidaten) {
    if (gesehen.has(hand[i])) continue
    gesehen.add(hand[i])
    let summe = 0,
      n = 0
    for (let k = 0; k < proben; k++) {
      // Jede Karte mindestens eine Probe, dann darf die Uhr abbrechen.
      if (k > 0 && performance.now() > ende) break
      const game = spielNachTausch(d, i)
      if (!game) continue
      spieleWeiter(game, horizont)
      let v: number
      if (game.gameEnded) {
        const s = game.winningTeams.findIndex(Boolean)
        v = s < 0 ? 0 : game.teams[s].includes(0) ? 1 : -1
      } else {
        v = netz.wert(merkmaleStand(game))
      }
      summe += Math.max(-1, Math.min(1, v))
      n++
    }
    if (n > 0 && summe / n > besterWert) {
      besterWert = summe / n
      beste = i
    }
  }
  return beste >= 0 ? [0, beste, 'tauschen'] : tauschKarte(d)
}
