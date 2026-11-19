import { computed } from 'vue'
import { useStorage } from '@vueuse/core'

/** Die Emojis, die jeder in der Partie verschicken kann. Gleiche Liste in den Apps. */
export const STANDARD_EMOJIS = ['👋', '😁', '🥰', '😜', '😭', '🥱', '💩']
/** Mehr passt in der Partie nicht sinnvoll in die Leiste (gleiche Grenze in den Apps). */
export const MAX_EMOJIS = 20

const eigeneEmojis = useStorage<string[]>('TWB-EmojisInGame', [...STANDARD_EMOJIS], localStorage)

/** Eigene Auswahl (Einstellungen). Gilt nur mit Abo, sonst die Standard-Emojis. */
export function useInGameEmojis(isSub: () => boolean) {
  const aktiv = computed(() => (isSub() && eigeneEmojis.value.length > 0 ? eigeneEmojis.value : STANDARD_EMOJIS))
  return { eigeneEmojis, aktiv }
}
