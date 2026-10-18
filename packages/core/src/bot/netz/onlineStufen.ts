// Die KI-Stufen der TAC-App als Bots in Online-Partien (Warteraum, Ersatz).
//
// Jede Stufe hat eine feste Bot-Nummer ab 10; 0 bis 3 sind Oskars Bots
// (Raindom, Greedy, Ruby, Futuro). Die Nummer steht in der Datenbank
// (`bots` der Partie), sie darf sich also nie aendern: neue Stufen hinten
// anhaengen, alte nicht umnummerieren.
//
// Eine Stufe gehoert zu einem Modus. Passt sie nicht zur Partie (z. B. eine
// klassische Stufe in 3 gegen 3 oder drei Teams zu zweit, wofuer es keine
// KI der App gibt), spielt Futuro.

export type OnlineModus = 'klassisch' | 'drei' | 'koop'
export type OnlineStufe = { id: number; stufe: string; modus: OnlineModus }

export const ONLINE_STUFEN: OnlineStufe[] = [
  { id: 10, stufe: 'heuristik', modus: 'klassisch' },
  { id: 11, stufe: 'vorausschau', modus: 'klassisch' },
  { id: 12, stufe: 'netz', modus: 'klassisch' },
  { id: 13, stufe: 'theo', modus: 'klassisch' },
  { id: 14, stufe: 'buchhalter', modus: 'klassisch' },
  { id: 15, stufe: 'alphatac', modus: 'klassisch' },
  { id: 16, stufe: 'legende', modus: 'klassisch' },
  { id: 17, stufe: 'hybrid', modus: 'klassisch' },
  { id: 18, stufe: 'hybrid1600', modus: 'klassisch' },
  { id: 19, stufe: 'schatten', modus: 'klassisch' },
  { id: 20, stufe: 'gruenschnabel', modus: 'drei' },
  { id: 21, stufe: 'wanderer', modus: 'drei' },
  { id: 22, stufe: 'kundschafterin', modus: 'drei' },
  { id: 23, stufe: 'kartograf', modus: 'drei' },
  { id: 24, stufe: 'verschollene', modus: 'drei' },
  { id: 25, stufe: 'faehrtenleger', modus: 'drei' },
  { id: 30, stufe: 'koop', modus: 'koop' },
]

/** Welche KI der App zu dieser Partie passt; null: keine (dann Oskars Bots). */
export function onlineModus(nPlayers: number, nTeams: number, coop: boolean): OnlineModus | null {
  if (nPlayers === 4 && coop) return 'koop'
  if (coop) return null
  if (nPlayers === 4 && nTeams === 2) return 'klassisch'
  if (nPlayers === 6 && nTeams === 2) return 'drei'
  return null
}

export function istOnlineStufe(botID: number): boolean {
  return ONLINE_STUFEN.some((s) => s.id === botID)
}

/** Die Stufe hinter einer Bot-Nummer, wenn sie zur Partie passt; sonst null. */
export function stufeFuerPartie(botID: number, nPlayers: number, nTeams: number, coop: boolean): string | null {
  const s = ONLINE_STUFEN.find((e) => e.id === botID)
  return s != null && s.modus === onlineModus(nPlayers, nTeams, coop) ? s.stufe : null
}
