// Bewegte Bilder zu den Lektionen, nachgebaut nach den Illustrationen der
// App (TAC/Views/Training/LessonFlowView.swift, BoardHighlight). Die App
// zeichnet kleine Schemata; hier spielt es sich auf Oskars echtem Brett ab.
//
// Positionen in seiner Zählung: Vorfeld 0…15 (Kugel j auf Feld j), Ring
// 16…79, Haus 80…95. Sitz 0 Schwarz (Startfeld 16), 1 Blau (32), 2 Grün
// (48), 3 Rot (64). Kugel j gehört Sitz j/4.

export interface Bild {
  /** Kugel → Position; nicht genannte Kugeln stehen im eigenen Vorfeld */
  pos: Record<number, number>
  /** Karten in der Brettmitte (Oskars Schreibweise, "backside", "kannraus") */
  karten?: string[]
  /** Felder mit pulsierendem Ring */
  markiere?: number[]
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
  fullBoard: () => [b({}, 4000, { karten: ['1', '13', 'tac'] })],
  boardAreas: () => [
    b({}, 1800, { markiere: [0, 1, 2, 3], text: 'vorfeld' }),
    b({}, 1800, { markiere: [R(0)], text: 'startfeld' }),
    b({}, 1800, { markiere: [R(4), R(12), R(20), R(28), R(36), R(44), R(52), R(60)], text: 'kreis' }),
    b({}, 1800, { markiere: [H(0, 0), H(0, 1), H(0, 2), H(0, 3)], text: 'haus' }),
    b({}, 1800, { karten: ['5', '7'], text: 'ablage' }),
  ],
  base: () => [b({}, 3000, { markiere: [0, 1, 2, 3], text: 'vorfeld' })],
  startField: () => new Szene({}).zeige(1200, { karten: ['1'] }).setze({ [K(0, 0)]: R(0) }, 2200, { karten: ['1'], markiere: [R(0)], text: 'startfeld' }).bilder,
  home: () =>
    new Szene({ [K(0, 0)]: R(58) })
      .zeige(900, { karten: ['9'] })
      .lauf(K(0, 0), zumHaus(58, 0, 2), { karten: ['9'] })
      .zeige(1800, { karten: ['9'], markiere: [H(0, 0), H(0, 1), H(0, 2), H(0, 3)], text: 'haus' }).bilder,
  center: () => [
    b({}, 1600, { karten: ['5'], text: 'ablage' }),
    b({}, 1600, { karten: ['5', 'tac'], text: 'ablage' }),
    b({}, 1600, { karten: ['5', 'tac', '7'], text: 'ablage' }),
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
      .zeige(800, { karten: ['1'] })
      .setze({ [K(0, 0)]: R(0) }, 1000, { karten: ['1'], text: 'startfeld' })
      .lauf(K(0, 0), ring(0, 63), { text: 'kreis' })
      .lauf(K(0, 0), [R(0), H(0, 0), H(0, 1), H(0, 2), H(0, 3)], { text: 'haus' })
      .zeige(1800, { text: 'haus' }).bilder,
  roundPhases: () => [
    b({}, 1700, { karten: ['backside', 'backside', 'backside'], text: 'geben' }),
    b({}, 1700, { karten: ['kannraus'], text: 'melden' }),
    b({}, 1700, { karten: ['backside', 'backside'], text: 'tauschen' }),
    b({}, 1700, { karten: ['5'], text: 'spielen' }),
  ],
  cardOverview: () => [
    b({}, 1800, { karten: ['2', '5', '9'], text: 'normal' }),
    b({}, 1800, { karten: ['1', '4', '7'], text: 'sonder' }),
    b({}, 1800, { karten: ['8', '13', 'trickser'], text: 'sonder' }),
    b({}, 1800, { karten: ['teufel', 'krieger', 'narr', 'engel'], text: 'meister' }),
    b({}, 1800, { karten: ['tac'], text: 'tac' }),
  ],
  teamHome: () => {
    const p: Pos = {}
    for (const s of [0, 2]) for (let i = 0; i < 4; i++) p[K(s, i)] = H(s, i)
    return [b({ [K(1, 0)]: R(20), [K(3, 0)]: R(50) }, 1200), b({ ...p, [K(1, 0)]: R(20), [K(3, 0)]: R(50) }, 2600, { text: 'sieg' })]
  },
  blocked: () =>
    new Szene({ [K(0, 0)]: R(2), [K(1, 0)]: R(5) })
      .zeige(1000, { karten: ['5'] })
      .lauf(K(0, 0), ring(2, 2), { karten: ['5'] })
      .zeige(1200, { karten: ['5'], markiere: [R(5)], text: 'blockiert' })
      .setze({ [K(0, 0)]: R(2) }, 1200, { karten: ['5'], text: 'blockiert' }).bilder,
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
  dualFunction: () =>
    new Szene({})
      .zeige(900, { karten: ['13'] })
      .setze({ [K(0, 0)]: R(0) }, 1500, { karten: ['13'], text: 'heraus' })
      .zeige(800, { karten: ['13'] })
      .lauf(K(0, 0), ring(0, 13), { karten: ['13'], text: 'laufen' })
      .zeige(1500, { karten: ['13'], text: 'laufen' }).bilder,
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
  blockedBackward: () =>
    new Szene({ [K(0, 0)]: R(10), [K(1, 0)]: R(8) })
      .zeige(1000, { karten: ['4'] })
      .lauf(K(0, 0), [R(9)], { karten: ['4'] })
      .zeige(1200, { karten: ['4'], markiere: [R(8)], text: 'blockiert' })
      .setze({ [K(0, 0)]: R(10) }, 1200, { karten: ['4'], text: 'blockiert' }).bilder,
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
  narrIcon: () => [b({}, 1500, { karten: ['narr'], text: 'narr' }), b({}, 1800, { karten: ['narr', 'backside', 'backside'], text: 'narr' })],
  engelIcon: () => new Szene({}).zeige(1400, { karten: ['engel'] }).setze({ [K(1, 0)]: R(16) }, 2200, { karten: ['engel'], text: 'engel' }).bilder,
  meisterQuad: () => [b({}, 3500, { karten: ['teufel', 'krieger', 'narr', 'engel'], text: 'meister' })],
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
  tacDualCards: () => [b({}, 3200, { karten: ['1', '8', '13'], text: 'wahl' })],
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

export function szeneFuer(lektionID: string, bild: string): Bild[] {
  const s = szenen[bild]
  if (s) return s()
  return [b({}, 3000, { karten: nurKarten[lektionID] ?? ['tac'] })]
}

/** Für den Prüfstand: welche Bilder der App hier fehlen. */
export const bekannteBilder = Object.keys(szenen)
