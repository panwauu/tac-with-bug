// Die KI-Stufen der App als Bots fuer Oskars Engine.
//
//   zufall      Stufe 0 „Dinah Dusel"         RandomAI
//   heuristik   Stufe 1 „Nils Niemandsland"   HeuristicAI
//   vorausschau Stufe 2                       LookaheadAI
//   theo        Stufe 4 „Luise Langfinger"    MCTSAI(200)
//   buchhalter  Stufe 6 „Joker Jannik"        MCTSAI(400)
//   hybrid      Stufe 8 „Hybrid 400"          HybridMCTSAI(400), Wertnetz am Ende
//   hybrid1600  Stufe 9 „Hybrid 1600"
//   legende     Stufe 7 „Die Legende"         TreeMCTSAI, 16 Verteilungen
//   alphatac    Stufe 10 „AlphaTAC"           TreeMCTSAI, 64 Verteilungen
//   schatten    Stufe 11 „Der Schatten"       HumanPolicyHybridAI(1600), Tausch per Wertnetz
//   syndikat    Stufe 12 „Das Syndikat"       wie der Schatten
//   koop        Kooperativ-Modus (eine KI, keine Leiter), Kooperativ-Netz
//   netz        Stufe 5 „Anna Pokerface"      NeuralNetAI (siehe Netz.ts)

import type { MoveText, MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import type { AiInterface } from '../simulation/simulation'
import { getMovesFromCards } from '../simulation/moves'
import { Heuristik, besterZug, bewerte, swiftEigen, tauschKarte, teufelZug } from './heuristik'
import {
  type Baelle,
  Kartenzaehler,
  alleImZiel,
  fortschrittLinear,
  frischDraussen,
  imHaus,
  kugelAuf,
  kugelnVon,
  mitspieler,
  mod,
  ringFeld,
  ringLaenge,
  startFeld,
  teamVon,
} from './lage'
import { type Zug, SiebenPlan, alleZuege } from './zuege'
import { Suche } from './suche'
import { Baumsuche } from './baum'
import { sechserBot } from './sechser'
import { Kooperativ, koopOptionen } from './koop'
import { Netz } from './Netz'
import type { Wertnetz } from './wertnetz'
import type { Politiknetz } from './politiknetz'

// ── Stufe 0: Zufall ────────────────────────────────────────────────────

export class Zufall implements AiInterface {
  constructor() {
    this.choose = this.choose.bind(this)
  }
  choose(d: AiData): MoveTextOrBall {
    if (d.tradedCard == null) {
      return [0, Math.floor(Math.random() * d.cardsWithMoves.length), 'tauschen'] as MoveText
    }
    const zuege = getMovesFromCards(d.cardsWithMoves, d.gamePlayer)
    return zuege[Math.floor(Math.random() * zuege.length)]
  }
}

// ── Stufe 2: Vorausschau ───────────────────────────────────────────────
//
// `LookaheadAI`: die Heuristik plus zwei Blicke auf die Stellung danach.
// Abweichung: `partnerSetupBonus` der App prueft mit der ECHTEN Hand des
// Partners, ob er danach rauskommen oder einziehen kann. Hier zaehlt, ob
// er es mit einer passenden Karte koennte.

export class Vorausschau implements AiInterface {
  private plan = new SiebenPlan()
  constructor() {
    this.choose = this.choose.bind(this)
  }

  choose(d: AiData): MoveTextOrBall {
    if (d.tradedCard == null) return tauschKarte(d)
    if (d.teufelFlag) return teufelZug(d)
    const weiter = this.plan.weiter(d)
    if (weiter) return weiter
    const zaehler = new Kartenzaehler(d)
    const z = besterZug(alleZuege(d), d, (zug) => vorausWert(zug, d, zaehler))
    this.plan.merke(z)
    return z.erster
  }
}

export function vorausWert(z: Zug, d: AiData, zaehler: Kartenzaehler): number {
  let s = bewerte(z, d)
  if (z.was.art === 'abwerfen') return s
  s += verwundbarkeit(z.nach.balls, d, zaehler)
  s += partnerBonus(z.nach.balls, d, zaehler)
  return s
}

/** Wie `vulnerabilityPenalty`: wer kann mich danach schlagen, und wie wahrscheinlich? */
function verwundbarkeit(b: Baelle, d: AiData, zaehler: Kartenzaehler): number {
  const T = ringLaenge(b)
  let strafe = 0
  const meine = kugelnVon(0, b).filter((j) => ringFeld(j, b) != null)
  for (const j of meine) {
    const meinFeld = ringFeld(j, b) ?? 0
    const wert = 10 + fortschrittLinear(j, b) * 0.2
    for (let p = 0; p < d.nPlayers; p++) {
      if (mitspieler(0, p, d)) continue
      for (const k of kugelnVon(p, b)) {
        const f = ringFeld(k, b)
        if (f == null || frischDraussen(k, b)) continue
        const vor = mod(meinFeld - f, T)
        if (vor > 0 && vor <= 13) {
          const drohen = kartenFuerAbstand(vor)
          if (drohen.length) strafe -= wert * zaehler.handEnthaelt(drohen)
        }
        if (mod(f - meinFeld, T) === 4) strafe -= wert * zaehler.handEnthaelt(['4']) * 0.8
      }
      if (meinFeld === startFeld(p, b) && kugelnVon(p, b).some((k) => imHaus(k, b))) {
        strafe -= (wert + 5) * zaehler.handEnthaelt(['1', '13'])
      }
    }
  }
  if (zaehler.anzahl('krieger') > 0) {
    for (const j of meine) {
      if (fortschrittLinear(j, b) > 40) strafe -= 3 * zaehler.wahrscheinlichkeit('krieger')
    }
  }
  return strafe
}

function kartenFuerAbstand(abstand: number): string[] {
  const k: string[] = []
  if ([1, 2, 3, 5, 6, 8, 9, 10, 12, 13].includes(abstand)) k.push(String(abstand))
  if (abstand >= 1 && abstand <= 7) k.push('7')
  return k
}

/**
 * Wie `partnerSetupBonus`, ohne Blick in die Hand des Partners: die +3 der
 * App („er hat danach einen Einzug oder ein Rauskommen") zaehlen mit der
 * Wahrscheinlichkeit, dass seine Hand eine passende Karte enthaelt.
 */
function partnerBonus(b: Baelle, d: AiData, zaehler: Kartenzaehler): number {
  // Alle Mitspieler: einer klassisch, zwei bei 3 gegen 3 (`teamVorteil`).
  let bonus = 0
  for (const partner of teamVon(0, d).filter((p) => p !== 0)) bonus += einPartner(partner, b, zaehler)
  return bonus
}

function einPartner(partner: number, b: Baelle, zaehler: Kartenzaehler): number {
  if (alleImZiel(partner, b)) return 0
  const T = ringLaenge(b)
  let bonus = 0
  const pStart = startFeld(partner, b)
  const startFrei = kugelAuf(pStart, b) == null
  const zuHause = kugelnVon(partner, b).some((j) => imHaus(j, b))
  if (startFrei && zuHause) bonus += 5
  // Karten, mit denen er rauskommen oder einziehen koennte
  const passend = new Set<string>()
  if (startFrei && zuHause) {
    passend.add('1')
    passend.add('13')
  }
  for (const j of kugelnVon(partner, b)) {
    const f = ringFeld(j, b)
    if (f == null) continue
    const bis = mod(pStart - f, T)
    for (const k of ['1', '2', '3', '5', '6', '7', '8', '9', '10', '12', '13']) {
      const n = Number(k)
      if (n > bis && n <= bis + 4) passend.add(k)
    }
    if (bis > 0 && bis <= 6) passend.add('7')
  }
  if (passend.size) bonus += 3 * zaehler.handEnthaelt([...passend])
  return bonus
}

/** Die Netze, die die oberen Stufen brauchen; fehlt eins, gibt es die Stufe nicht. */
export type Netze = { wert?: Wertnetz; politik?: Politiknetz; koop?: Wertnetz }

/** Bot nach Namen. Die Netze laedt der Aufrufer (Node: laden_node.ts, Browser: netze_laden.ts). */
export function stufenBot(name: string, netze: Netze = {}): AiInterface | null {
  const brauche = <T>(n: T | undefined, was: string): T => {
    if (!n) throw new Error(`Stufe ${name} braucht das ${was}`)
    return n
  }
  // `schatten:800` usw.: dieselbe Stufe mit anderem Budget (Durchgaenge),
  // um langsamere Geraete nachzustellen.
  const [basis, budget] = name.split(':')
  if (basis === 'koop' && budget) return new Kooperativ(brauche(netze.koop, 'Kooperativ-Netz'), koopOptionen(budget))
  if (budget) {
    const n = Number(budget)
    if (basis === 'schatten') return new Suche(n, 6, 1.414, brauche(netze.wert, 'Wertnetz'), brauche(netze.politik, 'Politiknetz'), true)
    if (basis === 'hybrid') return new Suche(n, 6, 1.414, brauche(netze.wert, 'Wertnetz'))
    if (basis === 'buchhalter') return new Suche(n)
    if (basis === 'legende') return new Baumsuche(brauche(netze.wert, 'Wertnetz'), n)
  }
  switch (name) {
    case 'zufall':
      return new Zufall()
    case 'heuristik':
      return new Heuristik()
    case 'heuristik-swift':
      // Abgleich mit der Bruecke: die Swift-Eigenheiten an, prozessweit.
      swiftEigen.an = true
      Kartenzaehler.stapelDerApp = true
      return new Heuristik()
    case 'vorausschau':
      return new Vorausschau()
    case 'theo':
      return new Suche(200)
    case 'netz':
      return new Netz(brauche(netze.wert, 'Wertnetz'))
    case 'buchhalter':
      return new Suche(400)
    case 'hybrid':
      return new Suche(400, 6, 1.414, brauche(netze.wert, 'Wertnetz'))
    case 'hybrid1600':
      return new Suche(1600, 6, 1.414, brauche(netze.wert, 'Wertnetz'))
    case 'legende':
      return new Baumsuche(brauche(netze.wert, 'Wertnetz'), 16)
    case 'alphatac':
      return new Baumsuche(brauche(netze.wert, 'Wertnetz'), 64)
    case 'koop':
      return new Kooperativ(brauche(netze.koop, 'Kooperativ-Netz'))
    case 'schatten':
    case 'syndikat':
      // Das Syndikat ist dieselbe Engine; der Unterschied (auch der Partner
      // ist ein Schatten) entsteht in der App bei der Sitzwahl, hier spielen
      // ohnehin beide Sitze meines Teams mit demselben Bot.
      return new Suche(1600, 6, 1.414, brauche(netze.wert, 'Wertnetz'), brauche(netze.politik, 'Politiknetz'), true)
    default:
      return sechserBot(name)
  }
}
