// Die KI-Stufen der TAC-App, nach gemessener Staerke (gegen Futuro, 15.10.2026).
// Namen wie in der App; `stufe` ist die Schwierigkeit fuer die Anzeige.
/** `kurz`: Name am Brett (dort ist wenig Platz, lange Namen ueberlappen). */
export type KiStufe = { name: string; titel: string; kurz: string; stufe: 'leicht' | 'mittel' | 'schwer' | 'meister' }

export const KI_STUFEN: KiStufe[] = [
  { name: 'heuristik', titel: 'Bruno „Blech“', kurz: 'Bruno', stufe: 'leicht' },
  { name: 'vorausschau', titel: 'Lena „Leichtfuß“', kurz: 'Lena', stufe: 'leicht' },
  { name: 'netz', titel: 'Doktor Sommer', kurz: 'Dr. Sommer', stufe: 'mittel' },
  { name: 'theo', titel: 'Theo „Zwei Daumen“', kurz: 'Theo', stufe: 'mittel' },
  { name: 'buchhalter', titel: 'Der Buchhalter', kurz: 'Buchhalter', stufe: 'schwer' },
  { name: 'alphatac', titel: 'Jakob „Nachtschicht“', kurz: 'Jakob', stufe: 'schwer' },
  { name: 'legende', titel: 'Vera „Falschgeld“', kurz: 'Vera', stufe: 'schwer' },
  { name: 'hybrid', titel: 'Isolde Voss', kurz: 'Isolde', stufe: 'meister' },
  { name: 'hybrid1600', titel: 'Die Unbekannte', kurz: 'Unbekannte', stufe: 'meister' },
  { name: 'schatten', titel: 'Der Schatten', kurz: 'Schatten', stufe: 'meister' },
]

/** 3 gegen 3: die Sechser-Leiter der App (`SixDifficulty`). */
export const KI_STUFEN_DREI: KiStufe[] = [
  { name: 'gruenschnabel', titel: 'Marlene Hoff', kurz: 'Marlene', stufe: 'leicht' },
  { name: 'wanderer', titel: 'Piet Anker', kurz: 'Piet', stufe: 'leicht' },
  { name: 'kundschafterin', titel: 'Frau Kubin', kurz: 'Kubin', stufe: 'leicht' },
  { name: 'kartograf', titel: 'Der Kartograf', kurz: 'Kartograf', stufe: 'mittel' },
  { name: 'verschollene', titel: 'Die Verschollene', kurz: 'Verschollene', stufe: 'schwer' },
  { name: 'faehrtenleger', titel: 'Der Fährtenleger', kurz: 'Fährtenleger', stufe: 'meister' },
]

export type KiModus = 'klassisch' | 'drei' | 'koop'
export const SITZE: Record<KiModus, number> = { klassisch: 4, drei: 6, koop: 4 }
