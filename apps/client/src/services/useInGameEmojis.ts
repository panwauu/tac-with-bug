import { computed, ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { DefaultService as Service } from '@/generatedClient/index.ts'
import { username } from '@/services/useUser'

/** Die Emojis, die jeder in der Partie verschicken kann. Gleiche Liste in den Apps. */
export const STANDARD_EMOJIS = ['👋', '😁', '🥰', '😜', '😭', '🥱', '💩']
/** Höchstzahl der eigenen Auswahl: so viele wie die Standardliste (gleiche Grenze in den Apps). */
export const MAX_EMOJIS = 7
/**
 * Konten, die vor diesem Zeitpunkt angelegt wurden, dürfen ihre Emojis weiter
 * ohne Abo zusammenstellen (das konnte vorher jeder). Gleicher Wert in den Apps;
 * auf den Tag setzen, an dem diese Änderung live geht.
 */
export const EMOJI_STICHTAG = Date.parse('2026-11-27T00:00:00Z')

const eigeneEmojis = useStorage<string[]>('TWB-EmojisInGame', [...STANDARD_EMOJIS], localStorage)

/** Anmeldedatum des eigenen Kontos (öffentliches Profil), einmal je Name geladen. */
const registriert = ref<{ name: string; zeit: number } | null>(null)
let laedt: string | null = null
watch(
  username,
  async (name) => {
    if (name == null || name === '' || registriert.value?.name === name || laedt === name) return
    laedt = name
    try {
      const stats = await Service.getPlayerStats(name)
      const zeit = Date.parse(stats.registered)
      if (!Number.isNaN(zeit) && username.value === name) registriert.value = { name, zeit }
    } catch {
      // ohne Antwort gilt nur das Abo
    } finally {
      laedt = null
    }
  },
  { immediate: true }
)

/** Konto vor dem Stichtag angelegt: eigene Emojis auch ohne Abo. */
export const altesKonto = computed(() => registriert.value != null && registriert.value.name === username.value && registriert.value.zeit < EMOJI_STICHTAG)

/** Eigene Auswahl (Einstellungen). Gilt mit Abo oder für alte Konten, sonst die Standard-Emojis. */
export function useInGameEmojis(isSub: () => boolean) {
  const darf = computed(() => isSub() || altesKonto.value)
  const aktiv = computed(() => (darf.value && eigeneEmojis.value.length > 0 ? eigeneEmojis.value.slice(0, MAX_EMOJIS) : STANDARD_EMOJIS))
  return { eigeneEmojis, aktiv, darf }
}
