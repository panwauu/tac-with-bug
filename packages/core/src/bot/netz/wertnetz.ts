// Das Wertnetz der App in reinem TypeScript, ohne Bibliothek.
//
// Gewichte aus exportiere_netz.py: BatchNorm ist schon in die linearen
// Schichten gefaltet, uebrig bleiben Matrix, Bias, ReLU und am Ende tanh.
// Aufbau: input -> 3 Restbloecke (fc1, fc2, Summe) -> head0 -> head2.
// Rund 450.000 Multiplikationen je Stellung, im Browser unter 1 ms.

type Schicht = { name: string; aus: number; ein: number; W: Float32Array; b: Float32Array; WT: Float32Array }
type Beschreibung = { bloecke: number; tanh?: boolean; schichten: { name: string; aus: number; ein: number }[] }

export class Wertnetz {
  private schicht: Record<string, Schicht> = {}
  private bloecke: number
  /** false beim Kooperativ-Netz: es schaetzt eine Kartenzahl, keinen Wert in [-1, 1]. */
  private tanh: boolean
  private puffer: Float32Array[] = []

  /** `daten` ist der Inhalt von wertnetz_*.bin, `beschreibung` der von wertnetz_*.json. */
  constructor(daten: ArrayBuffer, beschreibung: Beschreibung) {
    this.bloecke = beschreibung.bloecke
    this.tanh = beschreibung.tanh ?? true
    let pos = 0
    for (const s of beschreibung.schichten) {
      const W = new Float32Array(daten, pos, s.aus * s.ein)
      pos += s.aus * s.ein * 4
      const b = new Float32Array(daten, pos, s.aus)
      pos += s.aus * 4
      // Spaltenweise abgelegt: so lassen sich Eingaben, die null sind, ganz
      // ueberspringen. Nach jeder ReLU ist das gut die Haelfte, bei den
      // Merkmalen (Zaehler, One-Hot) noch mehr.
      const WT = new Float32Array(s.aus * s.ein)
      for (let o = 0; o < s.aus; o++) for (let i = 0; i < s.ein; i++) WT[i * s.aus + o] = W[o * s.ein + i]
      this.schicht[s.name] = { ...s, W, b, WT }
    }
    if (pos !== daten.byteLength) throw new Error(`Wertnetz: ${daten.byteLength - pos} Bytes uebrig`)
    for (let i = 0; i < 4; i++) this.puffer.push(new Float32Array(256))
  }

  private linear(name: string, x: Float32Array, y: Float32Array, relu: boolean): Float32Array {
    const { aus, ein, WT, b } = this.schicht[name]
    for (let o = 0; o < aus; o++) y[o] = b[o]
    for (let i = 0; i < ein; i++) {
      const xi = x[i]
      if (xi === 0) continue
      const z = i * aus
      for (let o = 0; o < aus; o++) y[o] += WT[z + o] * xi
    }
    if (relu) for (let o = 0; o < aus; o++) if (y[o] < 0) y[o] = 0
    return y
  }

  /** Wert einer Stellung in [-1, 1] aus Sicht des Spielers, fuer den die Merkmale gebaut sind. */
  wert(merkmale: ArrayLike<number>): number {
    const [p0, p1, p2, p3] = this.puffer
    const x = Float32Array.from(merkmale)
    let h = this.linear('input', x, p0, true)
    let frei = [p1, p2, p3]
    for (let k = 0; k < this.bloecke; k++) {
      const a = this.linear(`block${k}.fc1`, h, frei[0], true)
      const o = this.linear(`block${k}.fc2`, a, frei[1], false)
      for (let i = 0; i < o.length; i++) o[i] = Math.max(0, o[i] + h[i])
      frei = [h, a, frei[2]]
      h = o
    }
    const k0 = this.linear('head0', h, frei[0], true)
    const k1 = this.linear('head2', k0, frei[1], false)
    return this.tanh ? Math.tanh(k1[0]) : k1[0]
  }
}
