// Das Training der TAC-App als Daten. daten.json entsteht aus der App
// (TACTrainer/twb_client/training/export.sh im TAC-Repo), nicht von Hand ändern.

export type Sprache = 'de' | 'en' | 'ru'
export type Text = Record<Sprache, string>

/** Eine Kugel in der Zählung der App: Sitz 0 Schwarz, 1 Blau, 2 Grün, 3 Rot; Ring 0…63 ab Schwarz' Startfeld. */
export interface Kugel {
  sitz: number
  idx: number
  ort: 'vorfeld' | 'ring' | 'haus'
  pos: number
  gesperrt: boolean
  frisch: boolean
}

export interface Stufe {
  nr: number
  name: Text
  kurz: Text
}

export interface Lektion {
  id: string
  stufe: number
  titel: Text
  kicker: Text
  text: Text
  zusammenfassung: Text
  /** Illustration der App (BoardHighlight), z. B. "capture", "sevenHome" */
  bild: string
  uebungen: string[]
}

export interface Vorzug {
  sitz: number
  karte: string
  kugelnDanach: Kugel[] | null
}

export interface Uebung {
  id: string
  stufe: number
  titel: Text
  kicker: Text
  aufgabe: Text
  tipp: Text
  erfolg: Text
  regel: Text | null
  kugeln: Kugel[]
  /** Karten in Oskars Schreibweise ("5", "tac", "trickser") */
  karten: string[]
  ausgesetzt: boolean
  vorSpieler: number | null
  letzteKarte: string | null
  kugelnVorher: Kugel[] | null
  andereHaende: Record<string, string[]> | null
  vorzuege: Vorzug[] | null
  kugelnVorVorzuegen: Kugel[] | null
  nurProjektion: boolean
  quizMelden: number | null
  zeigeMelden: boolean
  quizRundenstart: number | null
}

export interface TrainingDaten {
  stufen: Stufe[]
  lektionen: Lektion[]
  uebungen: Uebung[]
}

export const FARBEN = ['black', 'blue', 'green', 'red'] as const

/** Brett-Drehung im Training: Schwarz (Sitz 0, man selbst) immer unten, wie in der App, egal welche Sitzposition für Partien eingestellt ist. */
export const DREHUNG_TRAINING = 0
