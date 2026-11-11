// Fortschritt des Trainings im Konto: wer angemeldet ist, findet erledigte Lektionen und
// Übungen in jedem Browser und in den TAC-Apps wieder (getProgress und addProgress des
// Servers, services/progress.ts). Ohne Anmeldung bleibt alles wie bisher in diesem Browser.
//
// Im Konto liegen Marken: „t.<id>“ für eine erledigte Lektion oder Übung, „feier.<fenster>“
// für ein gezeigtes Abschlussfenster. Der Browser merkt sich, was das Konto beim letzten
// Abgleich hatte, und meldet nur, was hier dazugekommen ist. Die Antwort ist der Stand des
// Kontos und ersetzt den lokalen. So kommt auch hier an, wenn das Training in der App
// zurückgesetzt wurde, und ein zweites Konto in diesem Browser erbt nicht den Stand des ersten.
import { watch } from 'vue'
import { DefaultService as Service, type Progress } from '@/generatedClient/index.ts'
import { isLoggedIn, username } from '@/services/useUser'
import daten from './daten.json'
import type { TrainingDaten } from './typen'
import { erledigt, gefeierteFenster, lektion, setzeFortschritt, uebung } from './index'

const SCHLUESSEL = 'tac-training-konto'
/** Für welches Konto zuletzt abgeglichen wurde und welche Marken es da hatte. */
type Zustand = { konto: string; basis: string[] }

function ladeZustand(): Zustand {
  try {
    const z = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? 'null')
    if (typeof z?.konto === 'string' && Array.isArray(z.basis)) return { konto: z.konto, basis: z.basis.filter((k: unknown) => typeof k === 'string') }
  } catch {
    // kaputt oder kein Speicher: wie ein Browser, der noch nie abgeglichen hat
  }
  return { konto: '', basis: [] }
}

function merkeZustand(z: Zustand) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(z))
  } catch {
    // ohne Speicher wird beim nächsten Besuch alles noch einmal gemeldet, das Konto zählt es nur einmal
  }
}

// Punkte, wie die TAC-App sie beim ersten Abschluss vergibt (dort zählen sie für den Rang):
// jede Übung, dazu die Lektionen der Grundlagen, die keine Übung haben. Das Konto zählt jede
// Marke nur einmal, egal wie viele Geräte sie melden.
const PUNKTE = { lektion: 25, uebung: 40 }
function punkte(id: string): number {
  if (uebung(id)) return PUNKTE.uebung
  const l = lektion(id)
  return l != null && l.stufe === 0 && l.uebungen.length === 0 ? PUNKTE.lektion : 0
}

/** Das ganze Training der App, auch die Felder, die es im Browser nicht gibt. */
const app = daten as unknown as TrainingDaten

/** In der App gehören zu einer Stufe auch Felder, die der Browser nicht hat. Ein Abschlussfenster
 *  von hier gilt deshalb nur dann fürs Konto, wenn die Stufe auch nach dem Maß der App fertig ist. */
function inDerAppFertig(fenster: string): boolean {
  const stufe = /^stufe_(\d+)$/.exec(fenster)
  if (stufe == null && fenster !== 'alles') return false
  const gehoertDazu = (x: { stufe: number }) => stufe == null || x.stufe === Number(stufe[1])
  return [...app.lektionen, ...app.uebungen].filter(gehoertDazu).every((x) => erledigt.value.has(x.id))
}

/** Was dieser Browser dem Konto melden kann. Eine Lektion mit Übungen gilt wie in der App erst
 *  mit der letzten Übung; bis dahin ist sie hier nur als gelesen vermerkt. */
function lokaleMarken(): string[] {
  const marken: string[] = []
  for (const id of erledigt.value) {
    const l = lektion(id)
    if (uebung(id) != null || (l != null && l.uebungen.every((u) => erledigt.value.has(u)))) marken.push(`t.${id}`)
  }
  for (const fenster of gefeierteFenster()) {
    if (inDerAppFertig(fenster)) marken.push(`feier.${fenster}`)
  }
  return marken
}

const T = 't.'
const FEIER = 'feier.'

/** Schreibt den Stand des Kontos in diesen Browser und gibt dessen Marken zurück. */
function uebernimm(konto: Progress, basis: Set<string>): string[] {
  const marken = Object.keys(konto.marks).filter((k) => k.startsWith(T) || k.startsWith(FEIER))
  // Was das Konto beim letzten Abgleich hatte und jetzt nicht mehr hat, wurde woanders zurückgesetzt.
  // Was nie im Konto war (eben erst erledigt oder nur gelesen), bleibt.
  const ids = new Set([...erledigt.value].filter((id) => !basis.has(T + id)))
  const fenster = new Set(gefeierteFenster().filter((k) => !basis.has(FEIER + k)))
  for (const k of marken) {
    if (k.startsWith(T)) ids.add(k.slice(T.length))
    else fenster.add(k.slice(FEIER.length))
  }
  setzeFortschritt(ids, fenster)
  return marken
}

/** Kennung einer Meldung (der Server wendet dieselbe Meldung nur einmal an). */
function neueKennung(): string {
  const zufall = Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(36).padStart(2, '0'))
  return `${Date.now().toString(36)}-${zufall.join('')}`
}

/** So lange gilt ein geholter Stand, wenn hier nichts Neues zu melden ist (Wechsel zwischen den Seiten). */
const FRISCH = 10_000
let geholt = 0

async function einmal(holen: boolean) {
  const konto = username.value
  if (konto == null) return
  const z = ladeZustand()
  // Gilt auch nach einem Wechsel des Kontos: mit geht nur, was seit dem letzten Abgleich hier dazukam
  const basis = new Set(z.basis)
  const neu = lokaleMarken().filter((k) => !basis.has(k))
  if (neu.length === 0 && z.konto === konto && (!holen || Date.now() - geholt < FRISCH)) return

  const jetzt = Date.now()
  const marks = Object.fromEntries(neu.map((k) => [k, { t: jetzt, p: k.startsWith(T) ? punkte(k.slice(T.length)) : 0 }]))
  const stand = neu.length > 0 ? await Service.addProgress({ id: neueKennung(), marks }) : await Service.getProgress()
  // Inzwischen ab- oder umgemeldet: die Antwort gehört nicht mehr hierher
  if (username.value !== konto) return
  merkeZustand({ konto, basis: uebernimm(stand, basis) })
  geholt = Date.now()
}

let laeuft = false
let nochmal = false

/**
 * Abgleich mit dem Konto. `holen`: auch fragen, wenn hier nichts Neues ist (Seite mit dem
 * Fortschritt geöffnet, gerade angemeldet), damit ankommt, was woanders erledigt wurde.
 */
export async function gleicheAb(holen = false): Promise<void> {
  if (!isLoggedIn.value) return
  if (laeuft) {
    nochmal = true
    return
  }
  laeuft = true
  try {
    await einmal(holen)
  } catch {
    // Ohne Netz oder vom Server abgelehnt: der Fortschritt bleibt hier und geht beim nächsten Anlass mit
  } finally {
    laeuft = false
  }
  if (nochmal) {
    nochmal = false
    void gleicheAb()
  }
}

// Nach jedem Abschluss, mit etwas Abstand (Lektion, Übung und Abschlussfenster kommen kurz nacheinander)
let uhr: ReturnType<typeof setTimeout> | undefined
watch(erledigt, () => {
  clearTimeout(uhr)
  uhr = setTimeout(() => void gleicheAb(), 1000)
})
// Nach dem Anmelden: was hier ohne Konto erledigt wurde, geht mit ins Konto
watch(username, () => void gleicheAb(true))
