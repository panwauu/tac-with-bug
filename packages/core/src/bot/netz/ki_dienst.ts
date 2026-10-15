// Die Seite fragt die KI ueber diesen Dienst; gerechnet wird im Web Worker.
//
//   const ki = new KiDienst(() => new Worker(new URL('./ki_worker.ts', import.meta.url), { type: 'module' }),
//                           '/netze/')
//   const zug = await ki.zug('schatten', getAiData(game, sitz), { sitz: String(sitz), zeitGrenze: 2000 })
//
// Antwortet der Worker nicht rechtzeitig (Fehler, Haenger), wird er neu
// gestartet und die Heuristik zieht auf der Seite selbst: die dauert
// Millisekunden, und das Spiel bleibt nie stehen.

import type { MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'
import { getMovesFromCards } from '../simulation/simulation'
import { Heuristik } from './heuristik'

type Offen = { ok: (z: MoveTextOrBall) => void; daten: AiData; uhr: ReturnType<typeof setTimeout> }

export type ZugOptionen = {
  /** Wer zieht; je Sitz merkt sich der Bot seine laufende 7. */
  sitz?: string
  /** Suchzeit in ms (0 = so lange wie in der App). */
  zeitGrenze?: number
  /** Ab wann der Worker als haengend gilt. Vorgabe: Zeitgrenze x 3 + 3 s, ohne Grenze 60 s. */
  notfall?: number
}

export class KiDienst {
  private worker!: Worker
  private naechste = 1
  private offen = new Map<number, Offen>()
  private ersatz = new Heuristik()
  /** Wie oft die Seite selbst ziehen musste (Fehler oder Haenger). */
  notfaelle = 0

  constructor(
    private erzeuge: () => Worker,
    private netzBasis: string
  ) {
    this.starte()
  }

  private starte() {
    this.worker = this.erzeuge()
    this.worker.onmessage = (e) => {
      const a = e.data
      if (a.art !== 'zug' && a.art !== 'fehler') return
      const o = this.offen.get(a.id)
      if (!o) return
      clearTimeout(o.uhr)
      this.offen.delete(a.id)
      if (a.art === 'zug') o.ok(a.zug)
      else {
        this.notfaelle++
        o.ok(this.notzug(o.daten))
      }
    }
    this.worker.postMessage({ art: 'start', basis: this.netzBasis })
  }

  zug(stufe: string, daten: AiData, opt: ZugOptionen = {}): Promise<MoveTextOrBall> {
    const id = this.naechste++
    const grenze = opt.zeitGrenze ?? 0
    const notfall = opt.notfall ?? (grenze > 0 ? grenze * 3 + 3000 : 60000)
    return new Promise((ok) => {
      const uhr = setTimeout(() => {
        // Haengt: Worker ersetzen, alle offenen Fragen selbst beantworten.
        this.worker.terminate()
        for (const [, o] of this.offen) {
          clearTimeout(o.uhr)
          this.notfaelle++
          o.ok(this.notzug(o.daten))
        }
        this.offen.clear()
        this.starte()
      }, notfall)
      this.offen.set(id, { ok, daten, uhr })
      this.worker.postMessage({ art: 'zug', id, stufe, sitz: opt.sitz ?? '0', daten, zeitGrenze: grenze })
    })
  }

  private notzug(d: AiData): MoveTextOrBall {
    try {
      return this.ersatz.choose(d)
    } catch {
      const z = getMovesFromCards(d.cardsWithMoves, d.gamePlayer)
      return z[Math.floor(Math.random() * z.length)]
    }
  }

  beende() {
    this.worker.terminate()
    for (const [, o] of this.offen) clearTimeout(o.uhr)
    this.offen.clear()
  }
}
