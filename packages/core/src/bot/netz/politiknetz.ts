// Das Politiknetz der App (TACPolicyNet, „wie wuerde ein Mensch ziehen")
// in reinem TypeScript: 160 -> 256 -> 256 -> 1080 Logits, ReLU dazwischen.
//
// Gewichte aus exportiere_politik.py --aus-app: direkt aus dem kompilierten
// App-Modell gelesen, weil keine aufbewahrte .pt dazu passt.

import type { Zug } from './zuege'

type Schicht = { name: string; aus: number; ein: number; WT: Float32Array; b: Float32Array }
type Beschreibung = { schichten: { name: string; aus: number; ein: number }[] }

export class Politiknetz {
  private schichten: Schicht[] = []

  constructor(daten: ArrayBuffer, beschreibung: Beschreibung) {
    let pos = 0
    for (const s of beschreibung.schichten) {
      const W = new Float32Array(daten, pos, s.aus * s.ein)
      pos += s.aus * s.ein * 4
      const b = new Float32Array(daten, pos, s.aus)
      pos += s.aus * 4
      const WT = new Float32Array(s.aus * s.ein)
      for (let o = 0; o < s.aus; o++) for (let i = 0; i < s.ein; i++) WT[i * s.aus + o] = W[o * s.ein + i]
      this.schichten.push({ ...s, WT, b })
    }
    if (pos !== daten.byteLength) throw new Error(`Politiknetz: ${daten.byteLength - pos} Bytes uebrig`)
  }

  logits(merkmale: ArrayLike<number>): Float32Array {
    let x = Float32Array.from(merkmale)
    this.schichten.forEach((s, k) => {
      const y = Float32Array.from(s.b)
      for (let i = 0; i < s.ein; i++) {
        const xi = x[i]
        if (xi === 0) continue
        const z = i * s.aus
        for (let o = 0; o < s.aus; o++) y[o] += s.WT[z + o] * xi
      }
      if (k < this.schichten.length - 1) for (let o = 0; o < s.aus; o++) if (y[o] < 0) y[o] = 0
      x = y
    })
    return x
  }
}

// ── Zugklassen wie `tacActionBucket` der App ───────────────────────────

const KARTEN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '13', 'tac', 'trickser', 'engel', 'teufel', 'krieger', 'narr']

/**
 * Klasse = Karte * 60 + Zugart * 5 + Kugel (0 bis 3 eigene, 4 = keine eigene).
 * Welche Kugel die App eintraegt: beim Rauskommen die erste im Haus, bei der
 * 7 die erste bewegte, bei der TAC die des kopierten Zugs; Engel, Teufel,
 * Narr, Aussetzen und Abwurf haben keine.
 * Abweichung: beim Trickser nimmt die App die Kugel, deren Sitz in der
 * ABSOLUTEN Sitzfolge zuerst kommt. Hier ist es die eigene, wenn eine dabei ist.
 */
export function zugKlasse(z: Zug): number {
  const karte = z.tac ? 'tac' : z.karte
  const kartenIdx = Math.max(0, KARTEN.indexOf(karte))
  const was = z.was
  const b = z.vor.balls
  const eigen = (j: number | undefined) => (j != null && j >= 0 && b[j]?.player === 0 ? j % 4 : 4)
  let art = 0,
    kugel = 4
  switch (was.art) {
    case 'abwerfen':
    case 'beenden':
      break
    case 'start': {
      art = 1
      const imHaus = [0, 1, 2, 3].filter((j) => b[j].state === 'house')
      kugel = imHaus.length ? imHaus[0] : 4
      break
    }
    case 'zug':
      art = 2
      kugel = eigen(was.z.kugel)
      break
    case 'sieben':
      art = 3
      kugel = eigen(was.teile[0]?.kugel)
      break
    case 'tausch': {
      art = 4
      kugel = b[was.meine]?.player === 0 ? eigen(was.meine) : eigen(was.andere)
      break
    }
    case 'krieger':
      art = was.selbst ? 6 : 5
      kugel = eigen(was.kugel)
      break
    case 'engel':
      art = 7
      break
    case 'narr':
      art = 8
      break
    case 'teufel':
      art = 9
      break
    case 'aussetzen':
      art = 11
      break
  }
  // Die TAC ist eine eigene Zugart; die Kugel ist die des kopierten Zugs.
  if (z.tac) art = 10
  return kartenIdx * 60 + art * 5 + kugel
}

/**
 * Wahrscheinlichkeiten je Zug wie `policyProbs` der App: Softmax ueber die
 * Klassen der legalen Zuege; teilen sich mehrere Zuege eine Klasse, teilen
 * sie sich auch deren Masse.
 */
export function zugWahrscheinlichkeiten(netz: Politiknetz, merkmale: number[], zuege: Zug[]): number[] {
  const logits = netz.logits(merkmale)
  const klassen = zuege.map(zugKlasse)
  const anzahl = new Map<number, number>()
  for (const k of klassen) anzahl.set(k, (anzahl.get(k) ?? 0) + 1)
  const max = Math.max(...klassen.map((k) => logits[k]))
  const roh = klassen.map((k) => Math.exp(logits[k] - max) / (anzahl.get(k) ?? 1))
  const summe = roh.reduce((a, x) => a + x, 0)
  return summe > 0 ? roh.map((x) => x / summe) : zuege.map(() => 1 / zuege.length)
}
