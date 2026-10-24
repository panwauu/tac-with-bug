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
  return t[(['de', 'en', 'ru'].includes(sprache) ? sprache : 'de') as Sprache] ?? t.de
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
