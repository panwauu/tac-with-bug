// Zugriff auf die Trainingsdaten und den Fortschritt (nur in diesem Browser).
import { ref } from 'vue'
import daten from './daten.json'
import { nichtImBrowser, passeAn, passeLektionAn } from './anpassungen'
import type { Lektion, Sprache, Text, TrainingDaten, Uebung } from './typen'

const roh = daten as unknown as TrainingDaten
export const training: TrainingDaten = {
  ...roh,
  lektionen: roh.lektionen.filter((l) => !nichtImBrowser.has(l.id)).map(passeLektionAn),
  uebungen: roh.uebungen.filter((u) => !nichtImBrowser.has(u.id)).map(passeAn),
}

/** Text in der Sprache der Oberfläche; fehlt die Sprache, Deutsch. */
export function txt(t: Text | null | undefined, sprache: string): string {
  if (t == null) return ''
  return t[sprache as Sprache] ?? t.de
}

export function lektion(id: string): Lektion | undefined {
  return training.lektionen.find((l) => l.id === id)
}

export function uebung(id: string): Uebung | undefined {
  return training.uebungen.find((u) => u.id === id)
}

/** Übungen, die in einer Lektion stecken, zählen nicht als eigenes Feld. */
const inLektionen = new Set(training.lektionen.flatMap((l) => l.uebungen))

/** Der Lernpfad einer Stufe: Lektionen und eigenständige Übungen in Reihenfolge der App. */
export function pfad(stufe: number): { art: 'lektion' | 'uebung'; id: string }[] {
  return [
    ...training.lektionen.filter((l) => l.stufe === stufe).map((l) => ({ art: 'lektion' as const, id: l.id })),
    ...training.uebungen.filter((u) => u.stufe === stufe && !inLektionen.has(u.id)).map((u) => ({ art: 'uebung' as const, id: u.id })),
  ]
}

const SCHLUESSEL = 'tac-training-erledigt'
function lade(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SCHLUESSEL) ?? '[]')
  } catch {
    return []
  }
}

/** Erledigte Lektionen und Übungen (IDs). */
export const erledigt = ref<Set<string>>(new Set(lade()))

export function markiere(id: string) {
  if (erledigt.value.has(id)) return
  erledigt.value = new Set([...erledigt.value, id])
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify([...erledigt.value]))
  } catch {
    // privates Fenster o. Ä.: Fortschritt gilt dann nur bis zum Neuladen
  }
  pruefeFeier(lektion(id)?.stufe ?? uebung(id)?.stufe)
}

/** Ein Lernpfad-Feld ist erledigt, wenn die Lektion und alle ihre Übungen erledigt sind. */
export function feldErledigt(f: { art: 'lektion' | 'uebung'; id: string }): boolean {
  if (!erledigt.value.has(f.id)) return false
  if (f.art === 'uebung') return true
  return (lektion(f.id)?.uebungen ?? []).every((u) => erledigt.value.has(u))
}

/** Nächstes Feld nach `id` im ganzen Training (über Stufen hinweg). */
export function naechstes(id: string): { art: 'lektion' | 'uebung'; id: string } | null {
  const alle = training.stufen.flatMap((s) => pfad(s.nr))
  const i = alle.findIndex((f) => f.id === id)
  return i >= 0 && i + 1 < alle.length ? alle[i + 1] : null
}

export function stufeErledigt(stufe: number): boolean {
  return pfad(stufe).every(feldErledigt)
}

// Abschlussfenster wie in der App: beim ersten Abschluss einer Stufe, danach
// (oder allein) beim Abschluss des ganzen Trainings. Nie beim Wiederholen.
export type Feier = { art: 'stufe'; stufe: number } | { art: 'alles' }

const GEFEIERT = 'tac-training-gefeiert'
function ladeGefeiert(): Set<string> {
  try {
    const gespeichert = localStorage.getItem(GEFEIERT)
    if (gespeichert != null) return new Set(JSON.parse(gespeichert))
  } catch {
    return new Set()
  }
  // Erster Besuch mit dieser Funktion: was schon fertig ist, gilt als gefeiert
  const schon = training.stufen.filter((s) => stufeErledigt(s.nr)).map((s) => `stufe_${s.nr}`)
  if (schon.length === training.stufen.length) schon.push('alles')
  return new Set(schon)
}
const gefeiert = ladeGefeiert()

function merkeGefeiert(schluessel: string): boolean {
  if (gefeiert.has(schluessel)) return false
  gefeiert.add(schluessel)
  try {
    localStorage.setItem(GEFEIERT, JSON.stringify([...gefeiert]))
  } catch {
    // ohne Speicher: dann eben nur bis zum Neuladen gemerkt
  }
  return true
}

/** Noch zu zeigende Abschlussfenster, das erste ist sichtbar. */
export const feiern = ref<Feier[]>([])

function pruefeFeier(stufe: number | undefined) {
  if (stufe == null || !stufeErledigt(stufe)) return
  const neu: Feier[] = []
  if (merkeGefeiert(`stufe_${stufe}`)) neu.push({ art: 'stufe', stufe })
  if (training.stufen.every((s) => stufeErledigt(s.nr)) && merkeGefeiert('alles')) neu.push({ art: 'alles' })
  if (neu.length > 0) feiern.value = [...feiern.value, ...neu]
}
