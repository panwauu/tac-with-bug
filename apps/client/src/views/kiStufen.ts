import { ONLINE_STUFEN, onlineModus } from '@repo/core/bot/netz/onlineStufen'

/** Oskars staerkster Bot, bisher der einzige im Warteraum und beim Ersatz. */
export const FUTURO = 3

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

/**
 * Bots fuer Online-Partien (Warteraum, Ersatz): Futuro und die Stufen der
 * App, die zu dieser Partie passen. Bot-Nummern aus dem Kern.
 */
export function onlineBots(nPlayers: number, nTeams: number, coop: boolean): { id: number; stufe: KiStufe | null }[] {
  const modus = onlineModus(nPlayers, nTeams, coop)
  const liste = modus === 'drei' ? KI_STUFEN_DREI : modus === 'klassisch' ? KI_STUFEN : []
  const app = ONLINE_STUFEN.filter((s) => s.modus === modus).map((s) => ({
    id: s.id,
    stufe: liste.find((k) => k.name === s.stufe) ?? null,
  }))
  return [{ id: FUTURO, stufe: null }, ...app]
}

/** Anzeigename eines Online-Bots, z. B. „Luise Langfinger (mittel)". */
export function onlineBotName(b: { id: number; stufe: KiStufe | null }, t: (schluessel: string) => string): string {
  // Futuro spielt etwa wie die leichten Stufen (gemessen: 46 % gegen Stufe 3 von 12 der App)
  if (b.id === FUTURO) return `Futuro (${t('Ki.schwierigkeit.leicht')})`
  if (b.stufe != null) return `${b.stufe.titel} (${t('Ki.schwierigkeit.' + b.stufe.stufe)})`
  return t('Ki.modus.koop')
}

/** Oskars Bots (0 bis 3); im Warteraum steht davon nur noch Futuro zur Wahl. */
const OSKARS_BOTS: Record<number, string> = { 0: 'Raindom', 1: 'Greedy', 2: 'Ruby', 3: 'Futuro' }

/**
 * Wer an einem Bot-Sitz spielt, fuer Anzeige und Uebersicht: Name, Schwierigkeit
 * (falls bekannt) und Beschreibung (Schluessel `Bots.beschreibung.b<Nummer>`).
 */
export function botInfo(botID: number, t: (schluessel: string) => string): { name: string; schwierigkeit: string | null; beschreibung: string } {
  const beschreibung = t(`Bots.beschreibung.b${botID}`)
  if (botID in OSKARS_BOTS) return { name: OSKARS_BOTS[botID], schwierigkeit: botID === FUTURO ? t('Ki.schwierigkeit.leicht') : null, beschreibung }
  const s = ONLINE_STUFEN.find((e) => e.id === botID)
  const stufe = [...KI_STUFEN, ...KI_STUFEN_DREI].find((k) => k.name === s?.stufe)
  if (stufe != null) return { name: stufe.titel, schwierigkeit: t('Ki.schwierigkeit.' + stufe.stufe), beschreibung }
  return { name: t('Bots.koopName'), schwierigkeit: null, beschreibung }
}
