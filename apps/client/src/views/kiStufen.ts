// Die KI-Stufen der TAC-App, nach gemessener Staerke (gegen Futuro, 15.10.2026).
// Namen wie in der App; `stufe` ist die Schwierigkeit fuer die Anzeige.
/** `kurz`: Name am Brett (dort ist wenig Platz, lange Namen ueberlappen). */
export type KiStufe = { name: string; titel: string; kurz: string; stufe: 'leicht' | 'mittel' | 'schwer' | 'meister' }

export const KI_STUFEN: KiStufe[] = [
  { name: 'heuristik', titel: 'Nils Niemandsland', kurz: 'Nils', stufe: 'leicht' },
  { name: 'vorausschau', titel: 'Kevin Kirschwasser', kurz: 'Kevin', stufe: 'leicht' },
  { name: 'netz', titel: 'Anna Pokerface', kurz: 'Anna', stufe: 'mittel' },
  { name: 'theo', titel: 'Luise Langfinger', kurz: 'Luise', stufe: 'mittel' },
  { name: 'buchhalter', titel: 'Joker Jannik', kurz: 'Jannik', stufe: 'schwer' },
  { name: 'alphatac', titel: 'Jakob Räuber', kurz: 'Jakob', stufe: 'schwer' },
  { name: 'legende', titel: 'Lockvogel Levien', kurz: 'Levien', stufe: 'schwer' },
  { name: 'hybrid', titel: 'Schlitzohr Fabian', kurz: 'Fabian', stufe: 'meister' },
  { name: 'hybrid1600', titel: 'Die Unbekannte', kurz: 'Unbekannte', stufe: 'meister' },
  { name: 'schatten', titel: 'Der Schatten', kurz: 'Schatten', stufe: 'meister' },
]

/** 3 gegen 3: die Sechser-Leiter der App (`SixDifficulty`). */
export const KI_STUFEN_DREI: KiStufe[] = [
  { name: 'gruenschnabel', titel: 'Kony Kaschmir', kurz: 'Kony', stufe: 'leicht' },
  { name: 'wanderer', titel: 'Kapitän Emmanuel', kurz: 'Emmanuel', stufe: 'leicht' },
  { name: 'kundschafterin', titel: 'Die Verschollene', kurz: 'Verschollene', stufe: 'leicht' },
  { name: 'kartograf', titel: 'Professor Max', kurz: 'Professor Max', stufe: 'mittel' },
  { name: 'verschollene', titel: 'Doktor J', kurz: 'Doktor J', stufe: 'schwer' },
  { name: 'faehrtenleger', titel: 'Satoshi', kurz: 'Satoshi', stufe: 'meister' },
]

export type KiModus = 'klassisch' | 'drei' | 'koop'
export const SITZE: Record<KiModus, number> = { klassisch: 4, drei: 6, koop: 4 }

/**
 * Startet eine Partie gegen die KI (Vollbild-Ansicht KiView). Neu laden: die
 * Spieloberflaeche ist beim Erzeugen auf eine Sitzzahl festgelegt.
 */
export function starteKiPartie(modus: KiModus, stufe: string) {
  window.location.hash = `#/ki/spiel?modus=${modus}&stufe=${stufe}`
  window.location.reload()
}
