// Bewegte Bilder zu den Lektionen, nachgebaut nach den Illustrationen der
// App (TAC/Views/Training/LessonFlowView.swift, BoardHighlight). Die App
// zeichnet kleine Schemata; hier spielt es sich auf Oskars echtem Brett ab.
//
// Positionen in seiner Zählung: Vorfeld 0…15 (Kugel j auf Feld j), Ring
// 16…79, Haus 80…95. Sitz 0 Schwarz (Startfeld 16), 1 Blau (32), 2 Grün
// (48), 3 Rot (64). Kugel j gehört Sitz j/4.

/** Wo eine Karte unterwegs gerade ist: bei einem Sitz, in der Mitte oder auf dem Stapel des Gebers. */
export type Ort = number | 'mitte' | { stapel: number }

export interface Bild {
  /** Kugel → Position; nicht genannte Kugeln stehen im eigenen Vorfeld */
  pos: Record<number, number>
  /** Ablagestapel in der Mitte, übereinander (Oskars Schreibweise) */
  karten?: string[]
  /** Sitz, von dem jede Karte der Ablage kommt (Standard: Schwarz); neue Karten fliegen von dort in die Mitte */
  von?: number[]
  /** Felder mit pulsierendem Ring */
  markiere?: number[]
  /** Kugeln, die auf ihrem Platz zittern (blockiert) */
  zittern?: number[]
  /** Ganzer Bereich: der Spielkreis oder das eigene Vorfeld */
  bereich?: 'kreis' | 'vorfeld'
  /** Verdeckte Karten je Sitz, wie bei Tac-With-Bug neben den Namen */
  haende?: number[]
  /** Sitze, die beim Tauschen 1 oder 13 zeigen */
  kannRaus?: number[]
  /** Sitz am Zug: oberste Karte steht schräg */
  aktiv?: number
  /** Kartenstapel beim Geber */
  geber?: number
  /** Einzelne Karten unterwegs (gleiche id = dieselbe Karte, sie gleitet) */
  flug?: { id: string; karte: string; ort: Ort }[]
  /** Karten offen nebeneinander unter dem Brett (oder darauf, siehe aufBrett) */
  auslage?: { text?: string; karten?: string[]; kugeln?: boolean; anzahl?: boolean }[]
  /** Auslage auf das Brett legen statt darunter */
  aufBrett?: boolean
  ohneBrett?: boolean
  ohneKugeln?: boolean
  /** Karten liegen schon in der Mitte, ohne Einflug */
  liegen?: boolean
  /** Schlüssel unter Training.bild.* */
  text?: string
  /** Wie lange dieses Bild steht (ms) */
  dauer: number
  /** Kurzer Übergang (Schritt für Schritt laufen) */
  schnell?: boolean
}

type Pos = Record<number, number>

/** Ringfeld der App (0…63 ab Schwarz' Startfeld) → seine Position */
const R = (p: number) => 16 + (((p % 64) + 64) % 64)
/** Hausfeld eines Sitzes */
const H = (sitz: number, hp: number) => 80 + sitz * 4 + hp
/** Kugel idx von Sitz */
const K = (sitz: number, idx: number) => sitz * 4 + idx
const SCHRITT = 170

function b(pos: Pos, dauer = 1600, extra: Partial<Bild> = {}): Bild {
  return { pos: { ...pos }, dauer, ...extra }
}

/** Felder auf dem Ring ab `von` (App-Zählung), `n` Schritte, vorwärts oder rückwärts */
function ring(von: number, n: number, richtung = 1): number[] {
  return Array.from({ length: n }, (_, i) => R(von + (i + 1) * richtung))
}

/** Weg vom Ringfeld `von` über das Startfeld des Sitzes ins Haus bis Feld `hp` */
function zumHaus(von: number, sitz: number, hp: number): number[] {
  const start = sitz * 16
  const bisStart = (((start - von) % 64) + 64) % 64
  return [...ring(von, bisStart), ...Array.from({ length: hp + 1 }, (_, i) => H(sitz, i))]
}

/**
 * Kugel läuft Feld für Feld über `weg`. Steht dort eine andere Kugel, wird
 * sie geschlagen (zurück ins Vorfeld). Rückgabe: die Bilder und der Stand danach.
 */
function laufe(stand: Pos, kugel: number, weg: number[], extra: Partial<Bild> = {}): { bilder: Bild[]; ende: Pos } {
  let p = { ...stand }
  const bilder: Bild[] = []
  for (const ziel of weg) {
    p = Object.fromEntries(Object.entries(p).filter(([j, q]) => q !== ziel || Number(j) === kugel))
    p = { ...p, [kugel]: ziel }
    bilder.push(b(p, SCHRITT, { schnell: true, ...extra }))
  }
  return { bilder, ende: p }
}

/** Baut eine Szene aus Teilen: Standbilder und Läufe nacheinander. */
class Szene {
  bilder: Bild[] = []
  stand: Pos
  constructor(start: Pos) {
    this.stand = { ...start }
  }
  zeige(dauer: number, extra: Partial<Bild> = {}) {
    this.bilder.push(b(this.stand, dauer, extra))
    return this
  }
  setze(aenderung: Pos, dauer: number, extra: Partial<Bild> = {}) {
    this.stand = { ...this.stand, ...aenderung }
    this.stand = Object.fromEntries(Object.entries(this.stand).filter(([, v]) => v >= 16))
    return this.zeige(dauer, extra)
  }
  lauf(kugel: number, weg: number[], extra: Partial<Bild> = {}) {
    const r = laufe(this.stand, kugel, weg, extra)
    this.bilder.push(...r.bilder)
    this.stand = r.ende
    return this
  }
}

const VORFELD = (j: number) => j

const szenen: Record<string, () => Bild[]> = {
  fullBoard: () => [b({}, 4000, { karten: ['1', '13', 'tac'], liegen: true })],
  boardAreas: () => [
    b({}, 1800, { bereich: 'vorfeld', text: 'vorfeld' }),
    b({}, 1800, { markiere: [R(0)], text: 'startfeld' }),
    b({}, 1800, { bereich: 'kreis', text: 'kreis' }),
    b({}, 1800, { markiere: [H(0, 0), H(0, 1), H(0, 2), H(0, 3)], text: 'haus' }),
    b({}, 1800, { karten: ['5', '7'], text: 'ablage' }),
  ],
  base: () => [b({}, 3000, { bereich: 'vorfeld', text: 'vorfeld' })],
  startField: () => new Szene({}).zeige(1200, { karten: ['1'] }).setze({ [K(0, 0)]: R(0) }, 2200, { karten: ['1'], markiere: [R(0)], text: 'startfeld' }).bilder,
  home: () =>
    new Szene({ [K(0, 0)]: R(58) })
      .zeige(900, { karten: ['9'] })
      .lauf(K(0, 0), zumHaus(58, 0, 2), { karten: ['9'] })
      .zeige(1800, { karten: ['9'], markiere: [H(0, 0), H(0, 1), H(0, 2), H(0, 3)], text: 'haus' }).bilder,
  // Reihum legt jeder seine Karte auf die Ablage.
  center: () => [
    b({}, 1200, { haende: [5, 5, 5, 5], aktiv: 0, text: 'ablage' }),
    b({}, 1600, { haende: [4, 5, 5, 5], aktiv: 1, karten: ['5'], von: [0], text: 'ablage' }),
    b({}, 1600, { haende: [4, 4, 5, 5], aktiv: 2, karten: ['5', 'tac'], von: [0, 1], text: 'ablage' }),
    b({}, 1600, { haende: [4, 4, 4, 5], aktiv: 3, karten: ['5', 'tac', '7'], von: [0, 1, 2], text: 'ablage' }),
    b({}, 2000, { haende: [4, 4, 4, 4], aktiv: 0, karten: ['5', 'tac', '7', '3'], von: [0, 1, 2, 3], text: 'ablage' }),
  ],
  ring: () =>
    new Szene({ [K(0, 0)]: R(0) })
      .zeige(900, { karten: ['10'] })
      .lauf(K(0, 0), ring(0, 10), { karten: ['10'] })
      .zeige(1500, { karten: ['10'] }).bilder,
  path: () =>
    new Szene({ [K(0, 0)]: R(0) })
      .zeige(900, { karten: ['10'] })
      .lauf(K(0, 0), ring(0, 10), { karten: ['10'] })
      .zeige(1500, { karten: ['10'] }).bilder,
  teams: () => [
    b({ [K(0, 0)]: R(0), [K(2, 0)]: R(32) }, 2000, { markiere: [R(0), R(32)], text: 'team1' }),
    b({ [K(1, 0)]: R(16), [K(3, 0)]: R(48) }, 2000, { markiere: [R(16), R(48)], text: 'team2' }),
  ],
  clockwise: () =>
    new Szene({ [K(0, 0)]: R(4) })
      .zeige(800, { karten: ['8'] })
      .lauf(K(0, 0), ring(4, 8), { karten: ['8'], text: 'uhrzeigersinn' })
      .zeige(1000, { karten: ['8'], text: 'uhrzeigersinn' })
      .zeige(800, { karten: ['4'] })
      .lauf(K(0, 0), ring(12, 4, -1), { karten: ['4'], text: 'rueckwaerts' })
      .zeige(1400, { karten: ['4'], text: 'rueckwaerts' }).bilder,
  marbleJourney: () =>
    new Szene({})
      .zeige(900, { text: 'vorfeld', bereich: 'vorfeld' })
      .setze({ [K(0, 0)]: R(0) }, 1000, { text: 'startfeld' })
      .lauf(K(0, 0), ring(0, 63), { text: 'kreis' })
      .lauf(K(0, 0), [R(0), H(0, 0), H(0, 1), H(0, 2), H(0, 3)], { text: 'haus' })
      .zeige(1800, { text: 'haus' }).bilder,
  roundPhases: () => rundenablauf(),
  cardOverview: () => [b({}, 6000, { ohneBrett: true, auslage: KARTENGRUPPEN })],
  teamHome: () => {
    const p: Pos = {}
    for (const s of [0, 2]) for (let i = 0; i < 4; i++) p[K(s, i)] = H(s, i)
    return [b({ [K(1, 0)]: R(20), [K(3, 0)]: R(50) }, 1200), b({ ...p, [K(1, 0)]: R(20), [K(3, 0)]: R(50) }, 2600, { text: 'sieg' })]
  },
  // Die Kugel bleibt stehen und zittert: an der fremden Kugel kommt sie nicht vorbei.
  blocked: () => [
    b({ [K(0, 0)]: R(2), [K(1, 0)]: R(5) }, 1000, { karten: ['5'] }),
    b({ [K(0, 0)]: R(2), [K(1, 0)]: R(5) }, 2800, { karten: ['5'], markiere: [R(5)], zittern: [K(0, 0)], text: 'blockiert' }),
  ],
  capture: () =>
    new Szene({ [K(0, 0)]: R(10), [K(1, 0)]: R(15) })
      .zeige(1000, { karten: ['5'] })
      .lauf(K(0, 0), ring(10, 5), { karten: ['5'] })
      .zeige(1800, { karten: ['5'], markiere: [K(1, 0)], text: 'geschlagen' }).bilder,
  secondMarble: () => new Szene({ [K(0, 0)]: R(20) }).zeige(1200, { karten: ['13'] }).setze({ [K(0, 1)]: R(0) }, 2200, { karten: ['13'], text: 'zweiteKugel' }).bilder,
  teamHit: () =>
    new Szene({ [K(0, 0)]: R(3), [K(2, 0)]: R(8) })
      .zeige(1000, { karten: ['5'] })
      .lauf(K(0, 0), ring(3, 5), { karten: ['5'] })
      .zeige(2000, { karten: ['5'], markiere: [K(2, 0)], text: 'pflicht' }).bilder,
  // Keine Kugel im Vorfeld: die 1 und die 13 ziehen auf dem Spielkreis.
  dualFunction: () =>
    new Szene({ [K(0, 0)]: R(14), [K(0, 1)]: R(30), [K(0, 2)]: R(45), [K(0, 3)]: H(0, 3) })
      .zeige(900, { karten: ['1'] })
      .lauf(K(0, 0), ring(14, 1), { karten: ['1'], text: 'einsLaufen' })
      .zeige(1400, { karten: ['1'], text: 'einsLaufen' })
      .zeige(800, { karten: ['1', '13'] })
      .lauf(K(0, 1), ring(30, 13), { karten: ['1', '13'], text: 'dreizehnLaufen' })
      .zeige(1600, { karten: ['1', '13'], text: 'dreizehnLaufen' }).bilder,
  homeLock: () =>
    new Szene({ [K(0, 0)]: R(62) })
      .zeige(900, { karten: ['6'] })
      .lauf(K(0, 0), zumHaus(62, 0, 3), { karten: ['6'] })
      .zeige(2000, { karten: ['6'], markiere: [H(0, 3)], text: 'eingerastet' }).bilder,
  partnerHome: () => {
    const p: Pos = {}
    for (let i = 0; i < 4; i++) p[K(0, i)] = H(0, i)
    return new Szene({ ...p, [K(2, 0)]: R(28) })
      .zeige(1200, { karten: ['6'], text: 'partner' })
      .lauf(K(2, 0), zumHaus(28, 2, 1), { karten: ['6'], text: 'partner' })
      .zeige(2000, { karten: ['6'], text: 'partner' }).bilder
  },
  homeExact: () => {
    const p: Pos = { [K(0, 1)]: H(0, 1), [K(0, 2)]: H(0, 2), [K(0, 3)]: H(0, 3), [K(0, 0)]: R(60) }
    return new Szene(p)
      .zeige(1200, { karten: ['5'] })
      .lauf(K(0, 0), zumHaus(60, 0, 0), { karten: ['5'] })
      .zeige(2000, { karten: ['5'], text: 'exakt' }).bilder
  },
  ringBackward: () =>
    new Szene({ [K(0, 0)]: R(10) })
      .zeige(1000, { karten: ['4'] })
      .lauf(K(0, 0), ring(10, 4, -1), { karten: ['4'] })
      .zeige(1600, { karten: ['4'], text: 'rueckwaerts' }).bilder,
  ringBackwardCapture: () =>
    new Szene({ [K(0, 0)]: R(10), [K(1, 0)]: R(6) })
      .zeige(1000, { karten: ['4'] })
      .lauf(K(0, 0), ring(10, 4, -1), { karten: ['4'] })
      .zeige(1800, { karten: ['4'], text: 'geschlagen' }).bilder,
  blockedBackward: () => [
    b({ [K(0, 0)]: R(10), [K(1, 0)]: R(8) }, 1000, { karten: ['4'] }),
    b({ [K(0, 0)]: R(10), [K(1, 0)]: R(8) }, 2800, { karten: ['4'], markiere: [R(8)], zittern: [K(0, 0)], text: 'blockiert' }),
  ],
  homeBlocked: () => [b({ [K(0, 0)]: H(0, 1) }, 3000, { karten: ['4'], markiere: [H(0, 1)], text: 'keinRaus' })],
  homeApproach: () =>
    new Szene({ [K(0, 0)]: R(62) })
      .zeige(900, { karten: ['2'] })
      .lauf(K(0, 0), ring(62, 2), { karten: ['2'] })
      .zeige(1000, { karten: ['2'], markiere: [R(0)] })
      .setze({ [K(0, 0)]: H(0, 3) }, 2000, { karten: ['4'], text: 'rueckwaertsHaus' }).bilder,
  homeVibrate: () => [b({ [K(0, 0)]: H(0, 3), [K(0, 1)]: H(0, 2), [K(0, 2)]: R(20) }, 3000, { markiere: [H(0, 3), H(0, 2)], text: 'gesperrt' })],
  sevenCapture: () =>
    new Szene({ [K(0, 0)]: R(5), [K(1, 0)]: R(8), [K(3, 0)]: R(10) })
      .zeige(1000, { karten: ['7'] })
      .lauf(K(0, 0), ring(5, 7), { karten: ['7'], text: 'vorbeiziehen' })
      .zeige(1800, { karten: ['7'], text: 'vorbeiziehen' }).bilder,
  ringDouble: () =>
    new Szene({ [K(0, 0)]: R(10), [K(0, 1)]: R(30) })
      .zeige(1000, { karten: ['7'] })
      .lauf(K(0, 0), ring(10, 3), { karten: ['7'], text: 'drei' })
      .zeige(600, { karten: ['7'], text: 'drei' })
      .lauf(K(0, 1), ring(30, 4), { karten: ['7'], text: 'vier' })
      .zeige(1500, { karten: ['7'], text: 'vier' }).bilder,
  sevenHome: () =>
    new Szene({ [K(0, 0)]: R(60) })
      .zeige(1000, { karten: ['7'] })
      .lauf(K(0, 0), zumHaus(60, 0, 2), { karten: ['7'] })
      .zeige(1800, { karten: ['7'], text: 'insHaus' }).bilder,
  sevenPartner: () =>
    new Szene({ [K(0, 1)]: H(0, 1), [K(0, 2)]: H(0, 2), [K(0, 3)]: H(0, 3), [K(0, 0)]: R(61), [K(2, 0)]: R(40) })
      .zeige(1000, { karten: ['7'] })
      .lauf(K(0, 0), zumHaus(61, 0, 0), { karten: ['7'] })
      .lauf(K(2, 0), ring(40, 3), { karten: ['7'], text: 'partner' })
      .zeige(1800, { karten: ['7'], text: 'partner' }).bilder,
  trickserSwap: () =>
    new Szene({ [K(0, 0)]: R(10), [K(1, 0)]: R(30) })
      .zeige(1200, { karten: ['trickser'] })
      .setze({ [K(0, 0)]: R(30), [K(1, 0)]: R(10) }, 2000, { karten: ['trickser'], text: 'tausch' }).bilder,
  trickserSwapFour: () =>
    new Szene({ [K(0, 0)]: R(10), [K(1, 0)]: R(30), [K(3, 0)]: R(50) })
      .zeige(1200, { karten: ['trickser'] })
      .setze({ [K(0, 0)]: R(30), [K(1, 0)]: R(10) }, 1600, { karten: ['trickser'], text: 'tausch' })
      .setze({ [K(0, 0)]: R(10), [K(1, 0)]: R(30) }, 1600, { karten: ['trickser', 'tac'], text: 'rueckgaengig' })
      .setze({ [K(0, 0)]: R(50), [K(3, 0)]: R(10) }, 2000, { karten: ['trickser', 'tac'], text: 'tausch' }).bilder,
  trickserKombi: () =>
    new Szene({ [K(0, 1)]: R(58) })
      .zeige(900, { karten: ['1'] })
      .setze({ [K(0, 0)]: R(0) }, 1400, { karten: ['1'], text: 'heraus' })
      .setze({ [K(0, 0)]: R(58), [K(0, 1)]: R(0) }, 2200, { karten: ['1', 'trickser'], text: 'scharf' }).bilder,
  teufelIcon: () =>
    new Szene({ [K(1, 0)]: R(20) })
      .zeige(1400, { karten: ['teufel'], text: 'teufel' })
      .zeige(800, { karten: ['teufel', '5'], text: 'fuerDich' })
      .lauf(K(1, 0), ring(20, 5), { karten: ['teufel', '5'], text: 'fuerDich' })
      .zeige(1600, { karten: ['teufel', '5'], text: 'fuerDich' }).bilder,
  kriegerIcon: () =>
    new Szene({ [K(0, 0)]: R(10), [K(1, 0)]: R(25) })
      .zeige(1400, { karten: ['krieger'] })
      .setze({ [K(0, 0)]: R(25), [K(1, 0)]: VORFELD(K(1, 0)) }, 2200, { karten: ['krieger'], text: 'krieger' }).bilder,
  narrIcon: () => narr(),
  engelIcon: () => new Szene({}).zeige(1400, { karten: ['engel'] }).setze({ [K(1, 0)]: R(16) }, 2200, { karten: ['engel'], text: 'engel' }).bilder,
  meisterQuad: () => [b({}, 3500, { auslage: [{ text: 'meister', karten: ['teufel', 'krieger', 'narr', 'engel'] }] })],
  eightForward: () =>
    new Szene({ [K(0, 0)]: R(10) })
      .zeige(1000, { karten: ['8'] })
      .lauf(K(0, 0), ring(10, 8), { karten: ['8'] })
      .zeige(1600, { karten: ['8'] }).bilder,
  eightSkip: () => [
    b({ [K(0, 0)]: R(10), [K(1, 0)]: R(20) }, 1200, { karten: ['8'] }),
    b({ [K(0, 0)]: R(10), [K(1, 0)]: R(20) }, 2200, { karten: ['8'], markiere: [R(20)], text: 'aussetzen' }),
  ],
  eightLastCard: () =>
    new Szene({ [K(0, 0)]: R(10) })
      .zeige(1200, { karten: ['8'], text: 'pflicht' })
      .lauf(K(0, 0), ring(10, 8), { karten: ['8'] })
      .zeige(1600, { karten: ['8'], text: 'pflicht' }).bilder,
  tacIcon: () =>
    new Szene({ [K(0, 0)]: R(10), [K(1, 0)]: R(20) })
      .zeige(900, { karten: ['5'] })
      .lauf(K(1, 0), ring(20, 5), { karten: ['5'] })
      .zeige(900, { karten: ['5'] })
      .setze({ [K(1, 0)]: R(20) }, 1300, { karten: ['5', 'tac'], text: 'rueckgaengig' })
      .lauf(K(0, 0), ring(10, 5), { karten: ['5', 'tac'], text: 'uebernehmen' })
      .zeige(1600, { karten: ['5', 'tac'], text: 'uebernehmen' }).bilder,
  tacCapture: () =>
    new Szene({ [K(0, 0)]: R(30), [K(1, 0)]: R(25) })
      .zeige(900, { karten: ['5'] })
      .lauf(K(1, 0), ring(25, 5), { karten: ['5'], text: 'geschlagen' })
      .zeige(1100, { karten: ['5'], text: 'geschlagen' })
      .setze({ [K(0, 0)]: R(30), [K(1, 0)]: R(25) }, 1400, { karten: ['5', 'tac'], text: 'rueckgaengig' })
      .lauf(K(0, 0), ring(30, 5), { karten: ['5', 'tac'], text: 'uebernehmen' })
      .zeige(1600, { karten: ['5', 'tac'], text: 'uebernehmen' }).bilder,
  tacRingHome: () =>
    new Szene({ [K(3, 0)]: R(45), [K(0, 0)]: R(10) })
      .zeige(900, { karten: ['5'] })
      .lauf(K(3, 0), zumHaus(45, 3, 1), { karten: ['5'] })
      .zeige(1000, { karten: ['5'] })
      .setze({ [K(3, 0)]: R(45) }, 1500, { karten: ['5', 'tac'], text: 'ausHaus' })
      .lauf(K(0, 0), ring(10, 5), { karten: ['5', 'tac'] })
      .zeige(1500, { karten: ['5', 'tac'], text: 'ausHaus' }).bilder,
  tacDualCards: () => [b({}, 3200, { karten: ['13', 'tac'], auslage: [{ karten: ['1', '8', '13'] }], text: 'wahl' })],
}

/** Die drei Kartengruppen, alle auf einmal. */
const KARTENGRUPPEN = [
  { text: 'normal', karten: ['2', '3', '5', '6', '9', '10', '12'] },
  { text: 'sonder', karten: ['1', '4', '7', '8', '13', 'trickser', 'tac'] },
  { text: 'meister', karten: ['engel', 'teufel', 'krieger', 'narr'] },
]
const ALLE_KARTEN = KARTENGRUPPEN.flatMap((g) => g.karten)

/**
 * Spielablauf einer Runde, wie man ihn bei Tac-With-Bug sieht: Rot gibt
 * reihum fünf Karten, beim Tauschen zeigen 1 und 13 auf den verdeckten
 * Karten, wer raus kann, jeder gibt eine Karte an den Partner, dann spielt
 * reihum jeder eine Karte aus, angefangen beim Spieler nach dem Geber.
 */
function rundenablauf(): Bild[] {
  const GEBER = 3
  const bilder: Bild[] = []
  const haende = [0, 0, 0, 0]
  let pos: Pos = {}
  const zeige = (dauer: number, extra: Partial<Bild> = {}) => bilder.push(b(pos, dauer, { geber: GEBER, haende: [...haende], ...extra }))

  zeige(1000, { text: 'geben' })
  for (let runde = 0; runde < 5; runde++) {
    for (let i = 1; i <= 4; i++) {
      const s = (GEBER + i) % 4
      const id = `g${runde}-${s}`
      zeige(40, { text: 'geben', flug: [{ id, karte: 'backside', ort: { stapel: GEBER } }] })
      zeige(170, { text: 'geben', flug: [{ id, karte: 'backside', ort: s }] })
      haende[s]++
    }
  }
  // Ab hier steht beim Startspieler (nach dem Geber) die oberste Karte schräg.
  zeige(900, { text: 'geben', aktiv: 0 })

  // Melden und Tauschen: Schwarz, Grün und Rot haben eine 1 oder 13, Blau nicht.
  const raus = [0, 2, 3]
  zeige(2600, { text: 'melden', kannRaus: raus, aktiv: 0 })
  const tausch = [0, 1, 2, 3].map((s) => ({ id: `t${s}`, karte: 'backside' }))
  for (let s = 0; s < 4; s++) haende[s]--
  zeige(60, { text: 'tauschen', kannRaus: raus, aktiv: 0, flug: tausch.map((f, s) => ({ ...f, ort: s })) })
  zeige(1100, { text: 'tauschen', kannRaus: raus, aktiv: 0, flug: tausch.map((f, s) => ({ ...f, ort: (s + 2) % 4 })) })
  for (let s = 0; s < 4; s++) haende[s]++
  zeige(1000, { text: 'tauschen', aktiv: 0 })

  // Spielen: Schwarz fängt an (nach Rot), dann reihum. Blau hat von Rot die 13 bekommen.
  const zuege: [number, string][] = [
    [0, '1'],
    [1, '13'],
    [2, '13'],
    [3, '1'],
  ]
  const ablage: string[] = []
  const von: number[] = []
  zeige(1000, { text: 'spielen', aktiv: 0 })
  for (const [s, karte] of zuege) {
    haende[s]--
    ablage.push(karte)
    von.push(s)
    zeige(1200, { text: 'spielen', aktiv: s, karten: [...ablage], von: [...von] })
    pos = { ...pos, [K(s, 0)]: R(s * 16) }
    zeige(1100, { text: 'spielen', aktiv: (s + 1) % 4, karten: [...ablage], von: [...von] })
  }
  zeige(1400, { text: 'spielen', aktiv: 0, karten: [...ablage], von: [...von] })
  return bilder
}

/** Narr: Karte in die Mitte, dann gibt jeder seine Hand an den Nächsten. */
function narr(): Bild[] {
  const haende = [3, 4, 4, 4]
  const flug = (verschoben: number) => [0, 1, 2, 3].map((s) => ({ id: `n${s}`, karte: 'backside', ort: (s + verschoben) % 4 }))
  return [
    b({}, 1300, { haende: [4, 4, 4, 4], aktiv: 0, text: 'narr' }),
    b({}, 1200, { haende, karten: ['narr'], text: 'narr' }),
    b({}, 60, { haende: [0, 0, 0, 0], karten: ['narr'], flug: flug(0), text: 'narr' }),
    b({}, 1100, { haende: [0, 0, 0, 0], karten: ['narr'], flug: flug(1), text: 'narr' }),
    b({}, 1600, { haende: [4, 3, 4, 4], karten: ['narr'], text: 'narr' }),
  ]
}

/**
 * Lektionen, deren Bild sich von dem der App unterscheidet, weil die App
 * dasselbe Bild für mehrere Lektionen nutzt.
 */
const proLektion: Record<string, () => Bild[]> = {
  // Spielmaterial: Brett, 16 Kugeln, alle Kartenarten mit Anzahl.
  g02: () => [
    b({}, 6000, {
      ohneKugeln: true,
      aufBrett: true,
      auslage: [
        { text: 'kugeln16', kugeln: true },
        { text: 'karten104', karten: ALLE_KARTEN, anzahl: true },
      ],
    }),
  ],
  // Dein Haus: mit der 10 genau auf das letzte Hausfeld.
  g06: () =>
    new Szene({ [K(0, 0)]: R(58) })
      .zeige(1200)
      .zeige(900, { karten: ['10'] })
      .lauf(K(0, 0), zumHaus(58, 0, 3), { karten: ['10'] })
      .zeige(2200, { karten: ['10'], markiere: [H(0, 0), H(0, 1), H(0, 2), H(0, 3)], text: 'haus' }).bilder,
  // Spielkreis und Spielrichtung: eine Kugel läuft einmal herum, ohne Karte.
  g08: () => new Szene({ [K(0, 0)]: R(0) }).zeige(700, { text: 'kreis' }).lauf(K(0, 0), ring(0, 64), { text: 'kreis' }).bilder,
  // Kugel auswählen: drei schwarze Kugeln auf dem Spielfeld, eine davon zieht.
  a03c: () =>
    new Szene({ [K(0, 0)]: R(6), [K(0, 1)]: R(22), [K(0, 2)]: R(40) })
      .zeige(1200, { karten: ['5'] })
      .lauf(K(0, 1), ring(22, 5), { karten: ['5'], text: 'auswahl' })
      .zeige(2000, { karten: ['5'], text: 'auswahl' }).bilder,
  // Vor Zurück Kombi: mit der 13 heraus, mit der 2 weg vom Startfeld, mit der 4 rückwärts über das Startfeld ins Haus.
  f03c: () =>
    new Szene({})
      .zeige(900, { karten: ['13'] })
      .setze({ [K(0, 0)]: R(0) }, 1400, { karten: ['13'], text: 'heraus' })
      .zeige(700, { karten: ['13', '2'] })
      .lauf(K(0, 0), ring(0, 2), { karten: ['13', '2'], text: 'zweiVor' })
      .zeige(1200, { karten: ['13', '2'], text: 'zweiVor' })
      .zeige(700, { karten: ['13', '2', '4'] })
      .lauf(K(0, 0), [R(1), R(0), H(0, 0), H(0, 1)], { karten: ['13', '2', '4'], text: 'rueckwaertsHaus' })
      .zeige(2000, { karten: ['13', '2', '4'], markiere: [H(0, 1)], text: 'rueckwaertsHaus' }).bilder,
  // Haus ordnen mit der 7: vier Schritte vor und zurück verbrauchen, dann rücken beide Kugeln nach hinten und rasten ein.
  f11: () => {
    // Langsamer als ein normaler Lauf: jeder Schritt im Haus soll zu sehen sein.
    const A = K(0, 0)
    const B = K(0, 1)
    const t = { karten: ['7'], text: 'vorZurueck' }
    return new Szene({ [A]: H(0, 0), [B]: H(0, 2) })
      .zeige(1200, { karten: ['7'] })
      .setze({ [B]: H(0, 1) }, 900, t)
      .setze({ [B]: H(0, 2) }, 900, t)
      .setze({ [B]: H(0, 1) }, 900, t)
      .setze({ [B]: H(0, 2) }, 900, t)
      .setze({ [B]: H(0, 3) }, 900, t)
      .setze({ [A]: H(0, 1) }, 900, t)
      .setze({ [A]: H(0, 2) }, 900, t)
      .zeige(2400, { karten: ['7'], markiere: [H(0, 2), H(0, 3)], text: 'eingerastet' }).bilder
  },
  // Übersprung-Regel im Haus: die eigene Kugel auf Hausfeld 2 versperrt den Weg, die 5 zieht am Haus vorbei.
  a11: () =>
    new Szene({ [K(0, 0)]: R(62), [K(0, 1)]: H(0, 1) })
      .zeige(1000, { karten: ['5'] })
      .zeige(2400, { karten: ['5'], markiere: [H(0, 1)], zittern: [K(0, 0)], text: 'hausBlockiert' })
      .lauf(K(0, 0), ring(62, 5), { karten: ['5'], text: 'amHausVorbei' })
      .zeige(1800, { karten: ['5'], text: 'amHausVorbei' }).bilder,
  // Die große Abkürzung: mit der 1 heraus, mit der 4 rückwärts, mit der 6 ins Haus.
  f03: () =>
    new Szene({})
      .zeige(900, { karten: ['1'] })
      .setze({ [K(0, 0)]: R(0) }, 1400, { karten: ['1'], text: 'heraus' })
      .zeige(800, { karten: ['1', '4'] })
      .lauf(K(0, 0), ring(0, 4, -1), { karten: ['1', '4'], text: 'abkuerzung' })
      .zeige(1300, { karten: ['1', '4'], text: 'abkuerzung' })
      .zeige(800, { karten: ['1', '4', '6'] })
      .lauf(K(0, 0), zumHaus(60, 0, 1), { karten: ['1', '4', '6'], text: 'abkuerzungHaus' })
      .zeige(2000, { karten: ['1', '4', '6'], markiere: [H(0, 1)], text: 'abkuerzungHaus' }).bilder,
  g10: () => new Szene({ [K(0, 0)]: R(0) }).zeige(700, { text: 'uhrzeigersinn' }).lauf(K(0, 0), ring(0, 64), { text: 'uhrzeigersinn' }).bilder,
}

/** Lektionen ohne eigenes Bild in der App: hier wenigstens die Karten. */
const nurKarten: Record<string, string[]> = {
  a08: ['2'],
  e09: ['8', 'tac'],
  e09b: ['8', 'tac'],
  e09c: ['8', 'tac'],
  m01: ['5', 'tac', 'tac'],
  m03: ['tac', 'tac', 'tac', 'tac'],
}

/** Wer die Karten der Ablage spielt, wo es nicht Schwarz allein ist (je Lektion oder Bild). */
const kartenVon: Record<string, number[]> = {
  boardAreas: [0, 1],
  tacIcon: [1, 0],
  tacCapture: [1, 0],
  tacRingHome: [3, 0],
  tacDualCards: [3, 0],
  trickserSwapFour: [3, 0],
  teufelIcon: [0, 1],
  e09: [3, 0],
  e09b: [3, 0],
  e09c: [3, 0],
  m01: [2, 3, 0],
  m03: [0, 1, 2, 3],
}

export function szeneFuer(lektionID: string, bild: string): Bild[] {
  const s = proLektion[lektionID] ?? szenen[bild]
  let bilder = s ? s() : [b({}, 3000, { karten: nurKarten[lektionID] ?? ['tac'] })]
  const von = kartenVon[lektionID] ?? kartenVon[bild]
  if (von) bilder = bilder.map((x) => (x.karten && !x.von ? { ...x, von } : x))
  // Liegt die Karte schon im ersten Bild, kurz ohne sie anfangen, damit sie bei jedem Durchlauf einfliegt.
  if (bilder.length > 1 && bilder[0].karten?.length) bilder = [{ ...bilder[0], karten: [], dauer: 500 }, ...bilder]
  return bilder
}

/** Für den Prüfstand: welche Bilder der App hier fehlen. */
export const bekannteBilder = Object.keys(szenen)
