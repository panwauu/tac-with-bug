// Alle Zuege einer Stellung, als das, was sie in der Sprache der App sind.
//
// Oskars Engine kennt nur [Sitz, Karte, Kugel, Zielposition] oder
// [Sitz, Karte, Text]. Die Heuristik der App bewertet dagegen Zugarten:
// Rauskommen, Ziehen mit Schlag, Hauseinzug, Tausch, eine 7 mit Teilzuegen.
// Jeder Zug wird deshalb probehalber ausgefuehrt (`previewMove`), und aus
// Vorher und Nachher wird abgelesen, was er war.
//
// Die 7 laeuft bei ihm schrittweise ('7-3' = noch drei Schritte). Hier wird
// jede vollstaendige Zerlegung durchgespielt und als EIN Zug geliefert, wie
// in der App; `schritte` sind die Einzelzuege, die die Engine dafuer braucht.

import type { MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import { previewMove } from '../simulation/previewMove'
import { getMovesFromCards } from '../simulation/moves'
import { grundkarte, siebenLaeuft } from './merkmale'
import { type Baelle, imHaus, imZiel, kartenSchritte, mod, ringFeld, ringLaenge, zielFeld } from './lage'

/** Ein Kugelzug, wie `MoveResult` der App. */
export type KugelZug = {
  kugel: number
  /** Ringschritte; bei der 4 negativ. */
  schritte: number
  /** Zielfeld auf dem Ring, null im Ziel oder zu Hause. */
  ziel: number | null
  /** Endet im Ziel (auch Weiterruecken darin), wie `entersHome` der App. */
  insZiel: boolean
  zielPos: number
  geschlagen: number[]
}

export type Art =
  | { art: 'abwerfen' }
  | { art: 'beenden' }
  | { art: 'start'; kugel: number; ziel: number; geschlagen: number[] }
  | { art: 'zug'; z: KugelZug }
  | { art: 'sieben'; teile: KugelZug[] }
  | { art: 'tausch'; meine: number; andere: number }
  | { art: 'krieger'; kugel: number; ziel: number; geschlagen: number[]; selbst: boolean }
  | { art: 'engel'; spieler: number; start: boolean; insZiel: boolean; schritte: number | null }
  | { art: 'narr' }
  | { art: 'teufel' }
  | { art: 'aussetzen' }

export type Zug = {
  /** Was die Engine jetzt bekommt. */
  erster: MoveTextOrBall
  /** Alle Engine-Zuege des ganzen Zugs (bei der 7 mehrere). */
  schritte: MoveTextOrBall[]
  /** Karte, wie sie auf der Hand liegt ('7-3' -> '7'). */
  karte: string
  /** Gespielt per TAC: bewertet wird der kopierte Zug. */
  tac: boolean
  vor: AiData
  nach: AiData
  was: Art
}

/** Wie viele 7er-Zerlegungen hoechstens durchgespielt werden. */
const MAX_SIEBEN = 400

/**
 * Teufel-Folgezug: ich spiele eine Karte des naechsten Spielers fuer ihn.
 * Seine Vorschau kann das nicht nachspielen (sie sucht die Karte bei mir).
 * Ohne die Teufel-Markierung geht es: die Karten liegen ohnehin schon offen
 * in `cardsWithMoves`, bewegt werden seine Kugeln.
 */
export function teufelZuege(d: AiData): { m: MoveTextOrBall; nach: AiData }[] {
  const ohne = { ...d, teufelFlag: false }
  const aus: { m: MoveTextOrBall; nach: AiData }[] = []
  for (const m of getMovesFromCards(d.cardsWithMoves, d.gamePlayer)) {
    try {
      aus.push({ m, nach: previewMove(ohne, m) })
    } catch {
      /* nicht nachspielbar */
    }
  }
  return aus
}

/**
 * Alle Zuege einer Stellung (ohne Tausch: der laeuft eigens). `frist`
 * (performance.now()) begrenzt das Aufzaehlen der 7-Zerlegungen fuer den
 * Browser; ohne Frist wird wie in der App alles aufgezaehlt.
 */
export function alleZuege(d: AiData, frist = Infinity): Zug[] {
  const aus: Zug[] = []
  for (const m of getMovesFromCards(d.cardsWithMoves, d.gamePlayer)) {
    const titel = d.cardsWithMoves[m[1]].title
    const tac = titel === 'tac' || titel.startsWith('tac-')
    let nach: AiData
    try {
      nach = previewMove(d, m)
    } catch {
      // Abwerfen laesst sich in seiner Vorschau nicht immer nachspielen
      // (Ablagestapel). Fuer Textzuege braucht die Bewertung das Danach nicht.
      if (m.length !== 3) continue
      nach = d
    }

    if (m.length === 3) {
      aus.push({ erster: m, schritte: [m], karte: grundkarte(titel), tac, vor: d, nach, was: textArt(m[2]) })
      continue
    }
    // Die TAC nimmt den letzten Zug zurueck und spielt die kopierte Karte
    // auf dem Brett DAVOR; dort beginnt der Zug.
    const startBaelle = titel === 'tac' ? d.priorBalls : d.balls

    // Rauskommen: seine Engine bietet jede Kugel im Haus einzeln an, die App
    // nur die erste. Alle fuehren zum gleichen Spiel; die Suche wuerde ihre
    // Durchgaenge sonst auf gleichwertige Zuege verteilen.
    const k = startBaelle[m[2]]
    if (k?.state === 'house') {
      const erste = startBaelle.findIndex((x) => x.player === k.player && x.state === 'house')
      if (erste !== m[2]) continue
    }

    const laeuft = grundkarte(titel) === '7' || (tac && siebenLaeuft(nach.cardsWithMoves[m[1]]?.title)) || siebenLaeuft(titel)
    if (laeuft) {
      for (const pfad of siebenZuEnde(nach, m[1], MAX_SIEBEN, frist)) {
        const schritte = [m, ...pfad.zuege]
        const stand = [startBaelle, nach.balls, ...pfad.staende.map((s) => s.balls)]
        aus.push({ erster: m, schritte, karte: tac ? 'tac' : '7', tac, vor: d, nach: pfad.ende, was: { art: 'sieben', teile: siebenTeile(schritte, stand) } })
      }
      continue
    }
    const karte = titel === 'tac' ? letzteKarte(d) : grundkarte(titel)
    // Eine TAC, die eine 7 in einem Zug ganz kopiert, ist trotzdem eine 7.
    const was: Art = karte === '7' ? { art: 'sieben', teile: siebenTeile([m], [startBaelle, nach.balls]) } : kugelArt(karte, m[2], m[3], startBaelle, nach.balls)
    aus.push({ erster: m, schritte: [m], karte: grundkarte(titel), tac, vor: d, nach, was })
  }
  return aus
}

export function textArt(text: string): Art {
  if (text.includes('abwerfen')) return { art: 'abwerfen' }
  if (text === 'beenden') return { art: 'beenden' }
  if (text === 'narr') return { art: 'narr' }
  if (text === 'teufel') return { art: 'teufel' }
  return { art: 'aussetzen' }
}

/** Die Karte, die eine TAC kopiert: die letzte gespielte, die keine TAC war. */
export function letzteKarte(d: AiData): string {
  return [...d.discardPile].reverse().find((k) => k !== 'tac') ?? '1'
}

function geschlagenZwischen(vor: Baelle, nach: Baelle, ausser: number): number[] {
  const g: number[] = []
  for (let j = 0; j < vor.length; j++) {
    if (j !== ausser && !imHaus(j, vor) && imHaus(j, nach)) g.push(j)
  }
  return g
}

export function kugelArt(karte: string, kugel: number, zielPos: number, vor: Baelle, nach: Baelle): Art {
  const geschlagen = geschlagenZwischen(vor, nach, kugel)
  if (karte === 'trickser') {
    const andere = vor.findIndex((b, j) => j !== kugel && b.position === zielPos)
    return { art: 'tausch', meine: kugel, andere }
  }
  if (karte === 'krieger') {
    // Kein anderer auf dem Ring: der Krieger trifft die eigene Kugel.
    const selbst = imHaus(kugel, nach)
    return { art: 'krieger', kugel, ziel: ringFeld(kugel, nach) ?? 0, geschlagen, selbst }
  }
  if (karte === 'engel') {
    const start = imHaus(kugel, vor) && !imHaus(kugel, nach)
    const insZiel = !imZiel(kugel, vor) && imZiel(kugel, nach)
    const a = ringFeld(kugel, vor),
      b = ringFeld(kugel, nach)
    const schritte = a != null && b != null ? mod(b - a, ringLaenge(vor)) : null
    return { art: 'engel', spieler: vor[kugel].player, start, insZiel, schritte }
  }
  if (imHaus(kugel, vor)) {
    return { art: 'start', kugel, ziel: ringFeld(kugel, nach) ?? 0, geschlagen }
  }
  return { art: 'zug', z: kugelZug(kugel, kartenSchritte(karte) ?? 0, vor, nach, geschlagen) }
}

function kugelZug(kugel: number, schritte: number, _vor: Baelle, nach: Baelle, geschlagen: number[]): KugelZug {
  // Wie `MoveResult.entersHome` der App: jeder Zug, der im Ziel endet, auch
  // ein Weiterruecken innerhalb des Ziels.
  const insZiel = imZiel(kugel, nach)
  return {
    kugel,
    schritte,
    ziel: ringFeld(kugel, nach),
    insZiel,
    zielPos: imZiel(kugel, nach) ? zielFeld(kugel, nach) : 0,
    geschlagen,
  }
}

/**
 * Die Teilzuege einer 7, je Kugel zusammengefasst wie in der App: eine Kugel,
 * die in zwei Schritten 3 und 2 laeuft, ist EIN Teilzug ueber 5.
 */
function siebenTeile(schritte: MoveTextOrBall[], stand: Baelle[]): KugelZug[] {
  const jeKugel = new Map<number, { schritte: number; geschlagen: number[] }>()
  for (let i = 0; i < schritte.length; i++) {
    const m = schritte[i]
    if (m.length !== 4) continue
    const vor = stand[i],
      nach = stand[i + 1]
    const kugel = m[2]
    const t = jeKugel.get(kugel) ?? { schritte: 0, geschlagen: [] }
    t.schritte += gelaufen(kugel, vor, nach)
    t.geschlagen.push(...geschlagenZwischen(vor, nach, kugel))
    jeKugel.set(kugel, t)
  }
  const anfang = stand[0],
    ende = stand[stand.length - 1]
  return [...jeKugel].map(([kugel, t]) => kugelZug(kugel, t.schritte, anfang, ende, t.geschlagen))
}

/** Felder, die eine Kugel bei einem Vorwaertsschritt zuruecklegt. */
function gelaufen(kugel: number, vor: Baelle, nach: Baelle): number {
  const T = ringLaenge(vor)
  const a = ringFeld(kugel, vor)
  if (a == null) {
    // schon im Ziel: Felder im Ziel
    return imZiel(kugel, nach) ? Math.max(0, zielFeld(kugel, nach) - zielFeld(kugel, vor)) : 0
  }
  const b = ringFeld(kugel, nach)
  if (b != null) return mod(b - a, T)
  // ins Ziel: bis zum eigenen Startfeld, dann die Zielfelder
  const start = vor[kugel].player * (T / (vor.length / 4))
  return mod(start - a, T) + zielFeld(kugel, nach) + 1
}

type SiebenPfad = { zuege: MoveTextOrBall[]; staende: AiData[]; ende: AiData }

/**
 * Spielt eine angefangene 7 auf jede moegliche Art zu Ende, mit Weg.
 * Viele Reihenfolgen fuehren zum selben Brett; besuchte Zwischenstaende
 * werden uebersprungen (ohne das bis zu 82 Sekunden je Zug).
 */
function siebenZuEnde(start: AiData, karte: number, grenze: number, frist = Infinity): SiebenPfad[] {
  const enden: SiebenPfad[] = []
  const besucht = new Set<string>()
  const endbretter = new Set<string>()
  const offen: SiebenPfad[] = [{ zuege: [], staende: [], ende: start }]
  while (offen.length > 0 && enden.length < grenze) {
    // Frist um: abbrechen, sobald wenigstens eine Zerlegung fertig ist.
    if (enden.length > 0 && performance.now() > frist) break
    const p = offen.pop() as NonNullable<ReturnType<typeof offen.pop>>
    const c = p.ende.cardsWithMoves[karte]
    if (!c || !siebenLaeuft(c.title)) {
      const brett = JSON.stringify(p.ende.balls)
      if (!endbretter.has(brett)) {
        endbretter.add(brett)
        enden.push(p)
      }
      continue
    }
    for (const m of getMovesFromCards(p.ende.cardsWithMoves, p.ende.gamePlayer)) {
      if (m[1] !== karte || m.length !== 4) continue
      let weiter: AiData
      try {
        weiter = previewMove(p.ende, m)
      } catch {
        continue
      }
      // Gleiches Brett reicht nicht: seine Engine merkt sich, welche Kugeln
      // schon gezogen haben, das steckt in den erlaubten Folgezuegen.
      const schluessel = JSON.stringify(weiter.cardsWithMoves[karte] ?? null) + JSON.stringify(weiter.balls)
      if (besucht.has(schluessel)) continue
      besucht.add(schluessel)
      offen.push({ zuege: [...p.zuege, m], staende: [...p.staende, weiter], ende: weiter })
    }
  }
  return enden
}

/** Hat Team 0 (meins) nach dem Zug gewonnen? */
export function gewonnen(d: AiData): boolean {
  return d.teams[0].every((p) => d.balls.filter((b) => b.player === p).every((b) => b.state === 'goal' || b.state === 'locked'))
}

/**
 * Merkt sich die gewaehlte 7-Zerlegung, damit die Folgeschritte genau sie
 * abspielen, statt den Rest neu (und anders) zu bewerten.
 */
export class SiebenPlan {
  private rest: MoveTextOrBall[] = []
  private erwartet = ''

  merke(z: Zug) {
    this.rest = z.schritte.slice(1)
    this.erwartet = this.rest.length ? JSON.stringify(previewMoveSicher(z.vor, z.erster)?.balls ?? null) : ''
  }

  /** Naechster geplanter Schritt, wenn das Brett zur Planung passt. */
  weiter(d: AiData): MoveTextOrBall | null {
    if (this.rest.length === 0) return null
    if (JSON.stringify(d.balls) !== this.erwartet) {
      this.rest = []
      return null
    }
    const m = this.rest.shift() as NonNullable<ReturnType<typeof this.rest.shift>>
    try {
      const nach = previewMove(d, m)
      this.erwartet = this.rest.length ? JSON.stringify(nach.balls) : ''
      return m
    } catch {
      this.rest = []
      return null
    }
  }
}

function previewMoveSicher(d: AiData, m: MoveTextOrBall): AiData | null {
  try {
    return previewMove(d, m)
  } catch {
    return null
  }
}
