// Stufe 7 „Die Legende" und Stufe 10 „AlphaTAC": `TreeMCTSAI` der App.
//
// Je Kartenverteilung (16 bzw. 64) ein eigener Baum mit 50 Durchgaengen:
// Auswahl per UCB1 (c = 0,7) aus Sicht des Teams, das gerade zieht, bis
// Tiefe 4; dort vier Zuege Heuristik weiter, dann bewertet das Wertnetz.
// Gewaehlt wird der Wurzelzug mit den meisten Besuchen ueber alle Baeume.
//
// Abweichung von der App: unterhalb der Wurzel sind die Zuege die
// Einzelzuege seiner Engine. Eine 7 ist dort eine Folge von Teilschritten
// desselben Spielers (sie zaehlen zusammen als ein Zug der Tiefe). Ganze
// Zerlegungen an jedem Knoten durchzuspielen waere in TypeScript zu teuer.

import type { MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import { type AiInterface, getMovesFromCards } from '../simulation/simulation'
import type { Game } from '../../game/game'
import { Heuristik, tauschKarte, teufelZug } from './heuristik'
import { siebenLaeuft } from './merkmale'
import { bisZurEntscheidung, fuehreAus, merkmaleStand, schnellWahl, sicht, spielAus, spieleWeiter, verteilung } from './simulator'
import type { Wertnetz } from './wertnetz'
import { type Zug, SiebenPlan, alleZuege, gewonnen } from './zuege'

class Knoten {
  besuche = 0
  summe = 0
  kinder: { zug: MoveTextOrBall[]; knoten: Knoten }[] | null = null
}

export class Baumsuche implements AiInterface {
  private plan = new SiebenPlan()
  private heuristik = new Heuristik()

  /** Zeitgrenze je Entscheidung in ms (Browser); 0 = keine, wie in der App. */
  zeitGrenze = 0
  /** Beginn der laufenden Entscheidung: die Grenze gilt fuer den ganzen Zug. */
  private beginn = 0

  constructor(
    private netz: Wertnetz,
    private verteilungen = 16,
    private durchgaenge = 50,
    private baumTiefe = 4,
    private ausspielTiefe = 4,
    private c = 0.7
  ) {
    this.choose = this.choose.bind(this)
  }

  choose(d: AiData): MoveTextOrBall {
    this.beginn = performance.now()
    if (d.tradedCard == null) return tauschKarte(d)
    if (d.teufelFlag) return teufelZug(d)
    const weiter = this.plan.weiter(d)
    if (weiter) return weiter

    const gesehen = new Set<string>()
    const frist = this.zeitGrenze > 0 ? this.beginn + this.zeitGrenze * 0.4 : Infinity
    const zuege = alleZuege(d, frist).filter((z) => {
      const k = z.karte + '|' + JSON.stringify(z.nach.balls) + '|' + z.was.art
      if (gesehen.has(k)) return false
      gesehen.add(k)
      return true
    })
    const spielbar = zuege.filter((z) => z.was.art !== 'abwerfen' && z.was.art !== 'beenden')
    if (zuege.length <= 1 || spielbar.length === 0) return this.heuristik.choose(d)
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
    const wurzelBesuche = new Array<number>(zuege.length).fill(0)
    const ende = this.zeitGrenze > 0 ? this.beginn + this.zeitGrenze : Infinity
    for (let v = 0; v < this.verteilungen; v++) {
      // Mindestens eine Verteilung, dann darf die Uhr abbrechen.
      if (v > 0 && performance.now() > ende) break
      const vert = verteilung(d)
      const wurzel = new Knoten()
      wurzel.kinder = zuege.map((z) => ({ zug: z.schritte, knoten: new Knoten() }))
      for (let i = 0; i < this.durchgaenge; i++) {
        const game = spielAus(d, vert)
        const wert = this.simuliere(wurzel, game, 0, 0)
        wurzel.besuche++
        wurzel.summe += wert
      }
      wurzel.kinder.forEach((k, i) => {
        wurzelBesuche[i] += k.knoten.besuche
      })
    }
    let bester = 0
    for (let i = 1; i < zuege.length; i++) if (wurzelBesuche[i] > wurzelBesuche[bester]) bester = i
    return zuege[bester]
  }

  /** Ein Abstieg; Wert in [0, 1] aus Sicht meines Teams (Sitz 0). */
  private simuliere(knoten: Knoten, game: Game, tiefe: number, sitz: number): number {
    if (game.gameEnded) return this.endwert(game)
    if (tiefe >= this.baumTiefe) return this.blatt(game)

    if (knoten.kinder == null) {
      const s = bisZurEntscheidung(game)
      if (s == null) return game.gameEnded ? this.endwert(game) : this.blatt(game)
      sitz = s
      const zuege = zweigZuege(sicht(game, sitz))
      if (zuege.length === 0) return this.blatt(game)
      knoten.kinder = zuege.map((m) => ({ zug: [m], knoten: new Knoten() }))
    } else if (tiefe > 0) {
      // Bekannter Knoten: dieselbe Verteilung und derselbe Weg ergeben
      // dieselbe Stellung, nur der Automatik-Teil muss erneut laufen.
      const s = bisZurEntscheidung(game)
      if (s == null) return game.gameEnded ? this.endwert(game) : this.blatt(game)
      sitz = s
    }

    const meinTeam = game.teams.find((t) => t.includes(0)) ?? []
    const meinZug = meinTeam.includes(sitz)
    const logEltern = Math.log(Math.max(1, knoten.besuche))
    let besterI = 0,
      besterU = -Infinity
    for (let i = 0; i < knoten.kinder.length; i++) {
      const k = knoten.kinder[i].knoten
      let u: number
      if (k.besuche === 0) {
        u = 100 + Math.random()
      } else {
        const q = k.summe / k.besuche
        u = (meinZug ? q : 1 - q) + this.c * Math.sqrt(logEltern / k.besuche)
      }
      if (u > besterU) {
        besterU = u
        besterI = i
      }
    }
    const kind = knoten.kinder[besterI]
    let wert: number
    if (!fuehreAus(game, kind.zug, sitz)) {
      wert = this.blatt(game)
    } else {
      // Eine angefangene 7 ist EIN Zug wie in der App: den Rest spielt die
      // schnelle Heuristik im selben Schritt zu Ende. Vorher war jeder
      // Teilschritt eine eigene Baumebene; eine 7 frass so bis zu sieben
      // Ebenen und verduennte die Suche (Legende 46 % statt ueber dem
      // Buchhalter).
      for (let k = 0; k < 8 && game.cards.players[sitz].some((x) => siebenLaeuft(x)); k++) {
        game.updateCardsWithMoves()
        if (!fuehreAus(game, [schnellWahl(sicht(game, sitz), true)], sitz)) break
      }
      wert = this.simuliere(kind.knoten, game, tiefe + 1, sitz)
    }
    kind.knoten.besuche++
    kind.knoten.summe += wert
    return wert
  }

  private endwert(game: Game): number {
    const sieger = game.winningTeams.findIndex(Boolean)
    return sieger < 0 ? 0.5 : game.teams[sieger].includes(0) ? 1 : 0
  }

  /** Blatt: vier Zuege Heuristik, dann das Wertnetz, Wert in [0, 1]. */
  private blatt(game: Game): number {
    spieleWeiter(game, this.ausspielTiefe)
    if (game.gameEnded) return this.endwert(game)
    const w = this.netz.wert(merkmaleStand(game))
    return (Math.max(-1, Math.min(1, w)) + 1) / 2
  }
}

/**
 * Die Kinder eines Knotens unterhalb der Wurzel: die Einzelzuege seiner
 * Engine, aber ohne gleichwertige Doppelte. Zwei gleiche Karten auf der
 * Hand geben dieselben Zuege; beim Rauskommen zaehlt nur die erste Kugel im
 * Haus (wie in der App, `marblesInBase[0]`).
 */
function zweigZuege(d: AiData): MoveTextOrBall[] {
  const karten = d.cardsWithMoves.map((c) => c.title)
  const aus: MoveTextOrBall[] = []
  for (const m of getMovesFromCards(d.cardsWithMoves, 0)) {
    if (karten.indexOf(karten[m[1]]) !== m[1]) continue
    if (m.length === 4) {
      const vor = karten[m[1]] === 'tac' ? d.priorBalls : d.balls
      const k = vor[m[2]]
      if (k?.state === 'house' && vor.findIndex((x) => x.player === k.player && x.state === 'house') !== m[2]) continue
    }
    aus.push(m)
  }
  return aus
}
