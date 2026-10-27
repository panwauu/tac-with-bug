// Wann ist eine Übung gelöst? Übernommen aus der App
// (TAC/Views/Training/ScenarioView.swift, checkSuccess), Feld für Feld in
// der Zählung der App: Ring 0…63 ab Schwarz' Startfeld, Haus 0…3.
import type { Game } from '@repo/core/game/game'
import type { MoveTextOrBall } from '@repo/core/types'
import { ICH, kugel } from './spielstand'
import type { Uebung } from './typen'

export interface Verlauf {
  /** Alle eigenen Züge seit dem Start der Übung */
  zuege: MoveTextOrBall[]
  /** Karten, die Schwarz dabei gespielt hat (Titel vor dem Zug) */
  karten: string[]
}

type Kugel = ReturnType<typeof kugel>

/** Was eine Bedingung über die Stellung wissen muss. */
interface Lage {
  u: Uebung
  g: Game
  v: Verlauf
  k: (sitz: number, idx: number) => Kugel
  schwarz: Kugel[]
  hand: string[]
  gespielt: boolean
  imHaus: Kugel[]
  imRing: (sitz: number) => Kugel[]
  schwarzAuf: (p: number) => boolean
  textZug: (t: string) => boolean
}

const aufStart = (l: Lage) => l.schwarzAuf(0)
const insHaus = (l: Lage) => l.imHaus.length > 0
const blauDraussen = (l: Lage) => l.imRing(1).length > 0
const rotAusHaus = (l: Lage) => l.k(3, 0).ring != null
const aussetzen = (l: Lage) => l.gespielt && l.textZug('aussetzen')

const bedingungen: Record<string, (l: Lage) => boolean> = {
  // --- Anfänger ---
  s_a01: aufStart,
  s_a02: aufStart,
  s_a04: (l) => l.schwarzAuf(5) && l.k(1, 0).vorfeld,
  s_a06: (l) => l.imHaus.length > l.u.kugeln.filter((m) => m.sitz === ICH && m.ort === 'haus').length,
  s_a11: (l) => l.imHaus.length > l.u.kugeln.filter((m) => m.sitz === ICH && m.ort === 'haus').length,
  s_a12: (l) => l.schwarz.filter((m) => m.gesperrt).length >= 2,
  s_a13: (l) => [0, 1, 2, 3].some((i) => l.k(2, i).haus != null),
  s_a07: (l) => l.imRing(ICH).length >= 2,
  s_a08: (l) => l.schwarzAuf(8) && l.k(2, 0).vorfeld,
  s_a10: (l) => {
    // 1 oder 13 als Laufkarte: irgendein gültiger Zug mit der 1/13.
    const start = [14, 30, 45]
    const laufkarte = l.v.karten.some((c) => c === '1' || c === '13')
    return l.gespielt && laufkarte && [0, 1, 2].some((i) => l.schwarz[i].ring !== start[i])
  },

  // --- Fortgeschritten ---
  s_f01: (l) => l.gespielt && (l.schwarzAuf(6) || l.schwarzAuf(12)),
  s_f02: (l) => l.k(1, 0).vorfeld && l.schwarzAuf(6),
  s_f03: insHaus,
  s_f03c: insHaus,
  s_f05: insHaus,
  s_f04b: (l) => l.schwarzAuf(23),
  s_f05b: (l) => l.schwarzAuf(50),
  s_f07: (l) => l.gespielt && l.schwarz[0].ring !== 10 && l.schwarz[1].ring !== 30,
  s_f13: (l) => l.schwarz[0].haus != null && l.k(2, 0).ring !== 35,
  s_f11: (l) => {
    const plaetze = l.imHaus.map((m) => m.haus)
    return plaetze.includes(2) && plaetze.includes(3)
  },
  s_f11b: (l) => insHaus(l) && l.gespielt,
  s_f14: (l) => l.gespielt && [13, 38, 8, 16].some(l.schwarzAuf),
  s_f15: aussetzen,
  s_f17: (l) => l.gespielt && l.schwarz[0].ring === 50,
  s_f18: (l) => l.hand.length === 0,
  s_f20: (l) => l.imHaus.length >= 2,
  s_f23: blauDraussen,
  s_f30: blauDraussen,
  s_f24: (l) => l.imRing(3).length > 0,
  s_f24b: (l) => l.k(1, 0).ring === 25,
  // Teufel ist zweistufig: erst nach dem Zug mit Blaus Karte gelöst.
  s_f25: (l) => !l.hand.includes('teufel') && !l.g.teufelFlag && l.k(1, 0).ring != null,
  s_f26: (l) => !l.hand.includes('krieger'),
  s_f27: (l) => l.schwarz[0].vorfeld && l.gespielt,
  s_f28: (l) => !l.g.narrFlag.some(Boolean) && l.schwarz[0].haus != null,
  s_f29: (l) => l.schwarz[0].ring === 15,

  // --- Experte (TAC) ---
  s_e01: (l) => l.schwarzAuf(15),
  s_e02: aufStart,
  s_e04: (l) => l.schwarz[0].ring != null,
  s_e05: rotAusHaus,
  s_e07: (l) => l.schwarz[0].haus != null,
  s_e09a: (l) => l.schwarz[0].ring === 18,
  s_e09b: aussetzen,
  s_e09c: (l) => l.gespielt && l.hand.includes('tac'),
  s_e11: aufStart,
  s_e12: (l) => [0, 1, 2, 3].some((i) => l.k(1, i).ring === 16),
  // Eine Karte aus Blaus Hand für Blau gespielt, Folgezug vorbei.
  s_e13: (l) => !l.g.teufelFlag && l.g.cards.players[1].length < (l.u.andereHaende?.['1']?.length ?? 0),

  // --- Meister ---
  s_m03: (l) => l.hand.length === 0,
  s_m05: rotAusHaus,
  s_m07: (l) => l.k(2, 0).haus != null,

  // Quiz und Tausch prüft die Ansicht selbst.
  s_g12a: () => false,
  s_g12b: () => false,
  s_g12c: () => false,
}

export function istGeloest(u: Uebung, g: Game, v: Verlauf): boolean {
  const k = (sitz: number, idx: number) => kugel(g, sitz, idx)
  const schwarz = [0, 1, 2, 3].map((i) => k(ICH, i))
  const hand = g.cards.players[ICH]
  const l: Lage = {
    u,
    g,
    v,
    k,
    schwarz,
    hand,
    gespielt: hand.length < u.karten.length,
    imHaus: schwarz.filter((m) => m.haus != null),
    imRing: (sitz) => [0, 1, 2, 3].map((i) => k(sitz, i)).filter((m) => m.ring != null),
    schwarzAuf: (p) => schwarz.some((m) => m.ring === p),
    textZug: (t) => v.zuege.some((z) => z.length === 3 && z[2] === t),
  }
  // Allgemein: irgendeine Karte gespielt oder abgeworfen.
  return (bedingungen[u.id] ?? ((x: Lage) => x.gespielt))(l)
}
