// Stufe 2 der App („Bruno Blech", `HeuristicAI`), klassischer Modus.
//
// Jede Zahl hier ist aus `HeuristicAI.score` der App uebernommen. Bewertet
// wird die Stellung VOR dem Zug plus das, was der Zug tut (siehe zuege.ts).
//
// Bewusste Abweichungen, weil die App mehr sieht als ein Spieler:
//  - Teufel: die App kennt die Karte des Opfers. Hier zaehlt der
//    Erwartungswert der noch ungesehenen Karten.
//  - 8 (Aussetzen): die App fragt, ob der Partner eine Startkarte HAT.
//    Hier nur, ob er Kugeln zu Hause hat (der zweite Fall der App).

import type { MoveText, MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import { type AiInterface, getMovesFromCards } from '../simulation/simulation'
import {
  type Baelle,
  Kartenzaehler,
  alleImZiel,
  fortschritt,
  frischDraussen,
  imHaus,
  imZiel,
  istStartKarte,
  kartenSchritte,
  kartenWert,
  kugelnVon,
  mitspieler,
  mod,
  ringFeld,
  ringLaenge,
  startFeld,
  tauschEmpfaenger,
  teamVon,
} from './lage'
import { type KugelZug, type Zug, SiebenPlan, alleZuege, letzteKarte, teufelZuege } from './zuege'

export class Heuristik implements AiInterface {
  private plan = new SiebenPlan()

  constructor() {
    this.choose = this.choose.bind(this)
  }

  choose(d: AiData): MoveTextOrBall {
    if (d.tradedCard == null) return tauschKarte(d)
    if (d.teufelFlag) return teufelZug(d)
    const weiter = this.plan.weiter(d)
    if (weiter) return weiter
    const zuege = alleZuege(d)
    const z = besterZug(zuege, d, (zug) => bewerte(zug, d))
    this.plan.merke(z)
    return z.erster
  }
}

/** Bester Zug, Gleichstand (0,001) zufaellig, wie `HeuristicAI.chooseAction`. */
export function besterZug(zuege: Zug[], _d: AiData, wert: (z: Zug) => number, zufall = true): Zug {
  if (zuege.length === 0) throw new Error('keine Zuege')
  // Nur Abwerfen moeglich: die App wirft die wertloseste Karte ab
  // (`chooseForcedDiscardCard`).
  if (zuege.every((z) => z.was.art === 'abwerfen' || z.was.art === 'beenden')) {
    return zuege.reduce((a, b) => (kartenWert(b.karte) < kartenWert(a.karte) ? b : a))
  }
  const werte = zuege.map(wert)
  const best = Math.max(...werte)
  const oben = zuege.filter((_, i) => werte[i] >= best - 0.001)
  return zufall ? oben[Math.floor(Math.random() * oben.length)] : oben[0]
}

// ── Tausch ────────────────────────────────────────────────────────────

/** Wie `HeuristicAI.chooseSwapCard`. Die Karte geht an den Partner. */
export function tauschKarte(d: AiData): MoveText {
  const hand = d.cardsWithMoves.map((c) => c.title)
  const partner = tauschEmpfaenger(d)
  const b = d.balls
  const brauchtStart = (p: number) => kugelnVon(p, b).every((j) => imHaus(j, b))
  const ich = brauchtStart(0),
    er = brauchtStart(partner)
  const wert = (i: number) => kartenWert(hand[i])
  const idx = [...hand.keys()]
  let wahl: number
  if (!ich && er && hand.some(istStartKarte)) {
    wahl = hand.findIndex(istStartKarte)
  } else if (ich && idx.some((i) => !istStartKarte(hand[i]))) {
    wahl = idx.filter((i) => !istStartKarte(hand[i])).reduce((a, i) => (wert(i) > wert(a) ? i : a))
  } else {
    wahl = idx.reduce((a, i) => (wert(i) > wert(a) ? i : a), idx[0])
  }
  return [0, wahl, 'tauschen']
}

// ── Bewertung ─────────────────────────────────────────────────────────

const ICH = 0

/**
 * Nur fuer den Abgleich mit der Bruecke: die Swift-Eigenheiten wieder an
 * (Stufe `heuristik-swift`). Pendel-7 im Haus je Schritt als Einzug,
 * Trickser-Bezug zufaellig (Swift: nach absoluter Sitzfolge), Stapel der App.
 */
export const swiftEigen = { an: false }

export function bewerte(z: Zug, d: AiData): number {
  let s = bewerteArt(z, d)
  if (z.tac) s += 5
  return s
}

function bewerteArt(z: Zug, d: AiData): number {
  // Auch bei der TAC das Brett, wie es JETZT steht: die App bewertet den
  // kopierten Zug auf dem aktuellen Zustand, nicht auf dem zurueckgenommenen.
  const b = d.balls
  const was = z.was
  const meine = kugelnVon(ICH, b)
  const zuHause = meine.filter((j) => imHaus(j, b))
  const draussen = meine.filter((j) => ringFeld(j, b) != null)
  const imZielAnz = meine.filter((j) => imZiel(j, b)).length
  const mates = teamVon(ICH, d).filter((p) => p !== ICH)
  const hand = d.cardsWithMoves.map((c) => c.title.replace(/-\d+$/, ''))

  // Bei der TAC zaehlt die kopierte Karte (die App bewertet den inneren Zug).
  const karte = z.tac && z.karte === 'tac' ? letzteKarte(d) : z.karte

  // Knappe Rauskommen-Karte (1/13) nicht fuer anderes verbrauchen.
  let escapeMalus = 0
  if ((karte === '1' || karte === '13') && zuHause.length > 0 && was.art !== 'start') {
    if (hand.filter((k) => k === '1' || k === '13').length <= 1) escapeMalus = -28
  }

  switch (was.art) {
    case 'abwerfen':
      return z.karte === 'tac' ? -200 : -100
    case 'beenden':
      return -100

    case 'start': {
      let s = 55
      if (draussen.length === 0 && imZielAnz < 4) s += 30
      else if (zuHause.length >= 2) s += 15
      for (const g of was.geschlagen) s += schlagWert(g, b, d)
      s += blockWert(was.ziel, b, d)
      s += sicherheit(was.ziel, b, d)
      return s
    }

    case 'zug':
      // Der Einzug zaehlt ohne den Abzug fuer die verbrauchte 1/13 (die App
      // kehrt dort vorher zurueck).
      return einzelZug(was.z, karte, b, d, mates) + (was.z.insZiel ? 0 : escapeMalus)

    case 'sieben': {
      let total = 0
      let gegnerGeschlagen = 0
      let schlag = false
      let haus = false
      for (const t of was.teile) {
        if (t.insZiel) {
          // Swift zaehlt jeden Schritt einer Kugel, die schon im Haus stand,
          // als eigenen Einzug (das Pendeln: bis 7 Mal).
          const pendel = swiftEigen.an && imZiel(t.kugel, b) ? Math.max(1, 7 - was.teile.filter((x) => x !== t).reduce((a, x) => a + Math.abs(x.schritte), 0)) : 1
          total += (70 + t.zielPos * 5) * pendel
          haus = true
        } else if (t.ziel != null) {
          total += Math.abs(t.schritte) * 0.3
          total += blockWert(t.ziel, b, d)
        } else {
          total += Math.abs(t.schritte) * 0.15
        }
        for (const g of t.geschlagen) {
          total += schlagWert(g, b, d)
          schlag = true
          if (!mitspieler(ICH, b[g].player, d)) gegnerGeschlagen++
        }
      }
      if (gegnerGeschlagen >= 2) total += 25
      if (gegnerGeschlagen >= 3) total += 20
      if (!schlag && !haus && was.teile.length <= 1) total -= 22
      return total
    }

    case 'tausch': {
      // Bezug ist die eigene Kugel. Die App nimmt stattdessen die Kugel, deren
      // Sitz in der ABSOLUTEN Sitzfolge zuerst kommt; ihre Bewertung haengt
      // damit vom Platz am Tisch ab. Das wird bewusst nicht nachgebildet.
      // Ist keine der beiden meine, gilt die bewegte als Bezug.
      let mein = was.meine,
        ander = was.andere
      if (swiftEigen.an) {
        if (ander >= 0 && Math.random() < 0.5) [mein, ander] = [ander, mein]
      } else if (ander >= 0 && b[ander].player === ICH && b[mein].player !== ICH) [mein, ander] = [ander, mein]
      if (ander < 0) return 5
      const meinProg = fortschritt(mein, b)
      const anderProg = fortschritt(ander, b)
      const anderFarbe = b[ander].player
      const T = ringLaenge(b)
      if (mitspieler(ICH, anderFarbe, d)) {
        const gewinn = anderProg - meinProg
        if (anderFarbe !== ICH && gewinn > 20) return 25 + gewinn * 0.3
        return Math.max(3, 8 + gewinn * 0.15)
      }
      let s = 10
      const meinFeld = ringFeld(mein, b)
      const anderFeld = ringFeld(ander, b)
      if (meinFeld != null) {
        const bisHaus = mod(startFeld(ICH, b) - meinFeld, T)
        if (bisHaus > 0 && bisHaus <= 4) s -= 30
        else if (bisHaus > 0 && bisHaus <= 8) s -= 15
      }
      if (anderFeld != null) {
        const gegnerBisHaus = mod(startFeld(anderFarbe, b) - anderFeld, T)
        if (gegnerBisHaus > 0 && gegnerBisHaus <= 4) s += 35
        else if (gegnerBisHaus <= 8) s += 20
        else if (gegnerBisHaus <= 15) s += 8
      }
      s += (anderProg - meinProg) * 0.35
      if (anderFeld != null) {
        s += blockWert(anderFeld, b, d)
        s += sicherheit(anderFeld, b, d)
      }
      if (meinFeld != null) {
        const neu = mod(startFeld(anderFarbe, b) - meinFeld, T)
        if (neu > 30) s += 8
      }
      return Math.max(3, s)
    }

    case 'krieger': {
      if (was.selbst) return -30
      let s = 35
      for (const g of was.geschlagen) s += schlagWert(g, b, d)
      s += blockWert(was.ziel, b, d)
      return s
    }

    case 'engel': {
      if (was.spieler !== ICH && mitspieler(ICH, was.spieler, d)) {
        if (was.start) {
          const draussenP = kugelnVon(was.spieler, b).filter((j) => ringFeld(j, b) != null).length
          const hausP = kugelnVon(was.spieler, b).filter((j) => imHaus(j, b)).length
          return draussenP === 0 && hausP > 0 ? 75 : 45
        }
        if (was.insZiel) return 85
        if (was.schritte != null) return 40 + was.schritte * 2
        return 45
      }
      return 5
    }

    case 'narr': {
      const team = teamVon(ICH, d)
      const draussenT = team.reduce((a, p) => a + kugelnVon(p, b).filter((j) => ringFeld(j, b) != null).length, 0)
      const zielT = team.reduce((a, p) => a + kugelnVon(p, b).filter((j) => imZiel(j, b)).length, 0)
      const teamKugeln = team.length * 4
      if (draussenT === 0 && zielT < teamKugeln) return 30
      if (zielT >= teamKugeln - 2) return 5
      return 12
    }

    case 'teufel': {
      const naechster = (ICH + 1) % d.nPlayers
      if (!mitspieler(ICH, naechster, d)) {
        // Erwartung ueber die ungesehenen Karten statt der echten Opferkarte.
        const zaehler = new Kartenzaehler(d)
        let erw = 0
        for (const k of Object.keys(zaehler.rest)) {
          const p = zaehler.wahrscheinlichkeit(k)
          erw += p * (kartenWert(k) * 0.3 + (k === 'tac' ? 15 : 0) + (k === '7' ? 10 : 0))
        }
        return 35 + erw
      }
      return 10
    }

    case 'aussetzen':
      return aussetzenWert(b, d, mates)
  }
}

function einzelZug(t: KugelZug, karte: string, b: Baelle, d: AiData, mates: number[]): number {
  // Die App rechnet Startfeld und Hauseinfahrt mit der Farbe des HANDELNDEN,
  // auch wenn er (alle eigenen im Ziel) eine Kugel des Partners zieht.
  const besitzer = ICH
  const meine = kugelnVon(ICH, b)
  const imZielAnz = meine.filter((j) => imZiel(j, b)).length
  const T = ringLaenge(b)

  if (t.insZiel) {
    let s = 105 + t.zielPos * 5 + imZielAnz * 15
    if (imZielAnz === 3) s += 20
    if (mates.every((p) => alleImZiel(p, b)) && imZielAnz === 3) s += 50
    return s
  }

  let s = 0
  const schritte = kartenSchritte(karte) ?? t.schritte
  const prog = fortschritt(t.kugel, b)
  const feld = ringFeld(t.kugel, b)

  // 4 rueckwaerts kurz hinter dem Start: Abkuerzung ins Haus.
  if (schritte === -4 && feld != null) {
    const abStart = mod(feld - startFeld(besitzer, b), T)
    if (abStart <= 4) s += 45
  }
  s += prog * 0.3 + Math.abs(schritte) * 0.5

  if (prog > 70) s += 20
  else if (prog > 55) s += 12
  else if (prog > 45) s += 5

  // Kugel kurz vor dem Haus nicht mit zu grosser Karte vorbeischicken.
  if (feld != null) {
    const bisEinfahrt = mod(startFeld(besitzer, b) - feld, T)
    if (bisEinfahrt > 0 && bisEinfahrt <= 4) {
      const vorbei = schritte > 0 && schritte > bisEinfahrt
      const andere = meine.filter((j) => j !== t.kugel && ringFeld(j, b) != null)
      if (vorbei) s -= andere.length === 0 ? 22 : 40
      else if (andere.length > 0) s -= 18
    }
  }

  // Letzte Kugel: vorsichtig mit kleinen Schritten heran.
  const draussen = meine.filter((j) => ringFeld(j, b) != null)
  if (mates.every((p) => alleImZiel(p, b)) && draussen.length === 1 && prog > 40) {
    s -= Math.abs(schritte) * 0.8
  }

  if (t.ziel != null) {
    s += blockWert(t.ziel, b, d)
    s += sicherheit(t.ziel, b, d)
  }
  for (const g of t.geschlagen) s += schlagWert(g, b, d)
  return s
}

/** Wie `captureScore`: je weiter die geschlagene Kugel war, desto mehr. */
function schlagWert(g: number, b: Baelle, d: AiData): number {
  if (mitspieler(ICH, b[g].player, d)) return -50
  const prog = fortschritt(g, b)
  let s = 20 + Math.max(0, prog) * 0.5
  if (prog > 70) s += 30
  else if (prog > 55) s += 15
  else if (prog > 45) s += 5
  return s
}

/** Wie `blockingValue`: vor oder hinter der Hauseinfahrt eines Gegners stehen. */
export function blockWert(ziel: number, b: Baelle, d: AiData): number {
  const T = ringLaenge(b)
  let wert = 0
  for (let p = 0; p < d.nPlayers; p++) {
    if (mitspieler(ICH, p, d)) continue
    const einfahrt = startFeld(p, b)
    const vor = mod(einfahrt - ziel, T)
    const hinter = mod(ziel - einfahrt, T)
    const seine = kugelnVon(p, b).filter((j) => ringFeld(j, b) != null && !frischDraussen(j, b))
    if (vor > 0 && vor <= 4) {
      const kommen = seine.filter((j) => {
        const m = mod(einfahrt - (ringFeld(j, b) ?? 0), T)
        return m > 0 && m <= 15
      })
      if (kommen.length) wert += (5 - vor) * 6 * kommen.length
    }
    if (hinter > 0 && hinter <= 4) {
      const vorbei = seine.filter((j) => {
        const m = mod((ringFeld(j, b) ?? 0) - einfahrt, T)
        return m > 0 && m <= 8
      })
      if (vorbei.length) wert += (5 - hinter) * 4 * vorbei.length
    }
  }
  return wert
}

/** Wie `positionSafety`: 4 vor einem Gegner ist gefaehrlich, 11 hinter sicher. */
export function sicherheit(ziel: number, b: Baelle, d: AiData): number {
  const T = ringLaenge(b)
  let s = 0
  for (let p = 0; p < d.nPlayers; p++) {
    if (mitspieler(ICH, p, d)) continue
    for (const j of kugelnVon(p, b)) {
      const f = ringFeld(j, b)
      if (f == null || frischDraussen(j, b)) continue
      if (mod(f - ziel, T) === 4) s -= 12
      if (mod(ziel - f, T) === 11) s += 8
    }
  }
  return s
}

function aussetzenWert(b: Baelle, d: AiData, mates: number[]): number {
  const T = ringLaenge(b)
  const naechster = (ICH + 1) % d.nPlayers
  if (mitspieler(ICH, naechster, d)) return 10
  let drohung = 0
  const einfahrt = startFeld(naechster, b)
  const seine = kugelnVon(naechster, b).filter((j) => ringFeld(j, b) != null)
  for (const j of seine) {
    const prog = fortschritt(j, b)
    if (prog > 70) drohung += 25
    else if (prog > 55) drohung += 15
    else if (prog > 40) drohung += 5
    else drohung += 2
    const f = ringFeld(j, b) ?? 0
    const vor = mod(einfahrt - f, T),
      hinter = mod(f - einfahrt, T)
    if (vor > 0 && vor <= 4) drohung += 20
    if (hinter > 0 && hinter <= 4) drohung += 12
  }
  for (const m of mates) {
    const mStart = startFeld(m, b)
    for (const j of seine) {
      // Abweichung: ob der Partner eine Startkarte hat, wissen wir nicht.
      if (ringFeld(j, b) === mStart && kugelnVon(m, b).some((k) => imHaus(k, b))) drohung += 12
    }
    for (const k of kugelnVon(m, b)) {
      const f = ringFeld(k, b)
      if (f == null) continue
      const bis = mod(mStart - f, T)
      if (bis > 0 && bis <= 4) drohung += 20
      else if (bis > 0 && bis <= 8) drohung += 10
    }
  }
  return 25 + drohung
}

// ── Teufel-Folgezug ───────────────────────────────────────────────────

/**
 * Ich waehle den Zug des naechsten Spielers. Die App laesst dafuer ihre
 * eigene Zugwahl laufen; hier gewinnt schlicht der Zug, nach dem mein Team
 * im Fortschritt am besten gegenueber den Gegnern dasteht.
 */
export function teufelZug(d: AiData): MoveTextOrBall {
  const zuege = teufelZuege(d)
  if (zuege.length === 0) {
    const roh = getMovesFromCards(d.cardsWithMoves, d.gamePlayer)
    return roh[Math.floor(Math.random() * roh.length)]
  }
  const wert = (b: Baelle) => {
    let s = 0
    for (let j = 0; j < b.length; j++) s += (mitspieler(ICH, b[j].player, d) ? 1 : -1) * fortschritt(j, b)
    return s
  }
  return zuege.reduce((a, z) => (wert(z.nach.balls) > wert(a.nach.balls) ? z : a)).m
}
