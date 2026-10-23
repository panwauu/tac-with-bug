// Mehrere Threads fuer die KI der TAC-App, mit Warteschlange und Frist.
// Genutzt im Spielserver (kiServer.ts, ohne KI_URL) und im eigenen
// KI-Dienst (entrypoints/kiDienst.ts).
//
// - Ein Bot (Partie|Sitz|Stufe) rechnet immer im selben Thread: er merkt
//   sich die geplante Zerlegung einer laufenden 7.
// - Jeder Zug hat eine Frist. Wer zu lange in der Schlange stand, bekommt
//   null (der Server laesst dann Futuro ziehen), statt dass die Partie wartet.
// - Unter Last wird die Suchzeit kuerzer: die Bots werden etwas schwaecher,
//   aber nicht langsamer.
// - Haengt ein Thread, wird nur er neu gestartet; seine Schlange bleibt.

import { Worker } from 'node:worker_threads'
import type { MoveTextOrBall } from '@repo/core/types'
import type { AiData } from '@repo/core/bot/simulation/output'
import logger from '../helpers/logger'

export type KiAnfrage = { schluessel: string; stufe: string; daten: AiData }

/** Suchzeit je Zug ohne Last (wie im Browser). */
export const ZEITGRENZE = 2000
/** Kuerzeste Suchzeit unter Last. */
const MIN_ZEIT = 150
/** So viel Zeit vor der Frist muss noch bleiben, sonst lohnt das Rechnen nicht. */
const RESERVE = 300

type Auftrag = { id: number; anfrage: KiAnfrage; eingang: number; frist: number; ok: (z: MoveTextOrBall | null) => void }
type Faden = { worker: Worker; aktiv: (Auftrag & { uhr: ReturnType<typeof setTimeout>; beginn: number }) | null; schlange: Auftrag[] }

export type KiZustand = {
  threads: number
  laufend: number
  wartend: number
  erledigt: number
  verworfen: number
  neustarts: number
  /** Mittel der letzten 200 Zuege in ms */
  mittelWarten: number
  mittelRechnen: number
  mittelZeitGrenze: number
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export class KiPool {
  private faeden: Faden[]
  private naechste = 1
  private erledigt = 0
  private verworfen = 0
  private neustarts = 0
  private letzte: { warten: number; rechnen: number; zeit: number }[] = []

  constructor(
    anzahl: number,
    private datei: string
  ) {
    this.faeden = Array.from({ length: Math.max(1, anzahl) }, () => ({ worker: this.starte(), aktiv: null, schlange: [] }))
  }

  /** Zug berechnen; null, wenn die Frist (Zeitpunkt in ms) nicht reicht oder etwas schiefging. */
  zug(anfrage: KiAnfrage, frist: number): Promise<MoveTextOrBall | null> {
    const f = this.faeden[hash(anfrage.schluessel) % this.faeden.length]
    return new Promise((ok) => {
      f.schlange.push({ id: this.naechste++, anfrage, eingang: Date.now(), frist, ok })
      this.weiter(f)
    })
  }

  zustand(): KiZustand {
    const mittel = (k: 'warten' | 'rechnen' | 'zeit') => (this.letzte.length ? Math.round(this.letzte.reduce((s, x) => s + x[k], 0) / this.letzte.length) : 0)
    return {
      threads: this.faeden.length,
      laufend: this.faeden.filter((f) => f.aktiv).length,
      wartend: this.faeden.reduce((s, f) => s + f.schlange.length, 0),
      erledigt: this.erledigt,
      verworfen: this.verworfen,
      neustarts: this.neustarts,
      mittelWarten: mittel('warten'),
      mittelRechnen: mittel('rechnen'),
      mittelZeitGrenze: mittel('zeit'),
    }
  }

  async beende() {
    await Promise.all(this.faeden.map((f) => f.worker.terminate()))
  }

  private starte(): Worker {
    const w = new Worker(this.datei)
    w.on('message', (a: { id: number; zug?: MoveTextOrBall; fehler?: string }) => {
      const f = this.faeden.find((x) => x.worker === w)
      if (!f?.aktiv || f.aktiv.id !== a.id) return
      const auftrag = f.aktiv
      clearTimeout(auftrag.uhr)
      f.aktiv = null
      if (a.fehler != null) logger.error(`KI-Zug fehlgeschlagen: ${a.fehler}`)
      this.erledigt++
      auftrag.ok(a.zug ?? null)
      this.weiter(f)
    })
    w.on('error', (err) => {
      logger.error(`KI-Thread abgestuerzt: ${String(err)}`)
      const f = this.faeden.find((x) => x.worker === w)
      if (f) this.neustart(f)
    })
    return w
  }

  private neustart(f: Faden) {
    this.neustarts++
    void f.worker.terminate()
    if (f.aktiv) {
      clearTimeout(f.aktiv.uhr)
      f.aktiv.ok(null)
      f.aktiv = null
    }
    f.worker = this.starte()
    this.weiter(f)
  }

  private weiter(f: Faden) {
    while (f.aktiv == null && f.schlange.length > 0) {
      const a = f.schlange.shift() as Auftrag
      const jetzt = Date.now()
      const rest = a.frist - jetzt - RESERVE
      if (rest < MIN_ZEIT) {
        // Zu lange gewartet: lieber sofort Futuro als eine verspaetete Partie.
        this.verworfen++
        a.ok(null)
        continue
      }
      // Je laenger die Schlange hinter diesem Zug, desto kuerzer die Suche.
      const zeitGrenze = Math.max(MIN_ZEIT, Math.min(rest, Math.round(ZEITGRENZE / (1 + f.schlange.length))))
      const uhr = setTimeout(
        () => {
          logger.error(`KI-Thread antwortet nicht (Stufe ${a.anfrage.stufe}), Neustart`)
          this.neustart(f)
        },
        zeitGrenze * 3 + 3000
      )
      f.aktiv = { ...a, uhr, beginn: jetzt }
      const ok = a.ok
      f.aktiv.ok = (z) => {
        this.letzte.push({ warten: jetzt - a.eingang, rechnen: Date.now() - jetzt, zeit: zeitGrenze })
        if (this.letzte.length > 200) this.letzte.shift()
        ok(z)
      }
      f.worker.postMessage({ id: a.id, ...a.anfrage, zeitGrenze })
    }
  }
}
