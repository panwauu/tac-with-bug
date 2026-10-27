<template>
  <Button
    severity="secondary"
    :label="label"
    :disabled="disabled"
    aria-haspopup="true"
    @click="(e: Event) => menu?.toggle(e)"
  />
  <Menu
    ref="menu"
    :model="eintraege"
    :popup="true"
  />
</template>

<script setup lang="ts">
// Knopf mit Ausklappliste: welcher Bot einspringt (Warteraum, Ersatz).
// Eine Liste ohne Herkunft: Futuro und die KI-Stufen, die zur Partie passen, je mit Schwierigkeit,
// darunter ein Link auf die Übersicht der Bots.
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlineBotName, onlineBots } from '@/views/kiStufen'
import router from '@/router'

const props = defineProps<{ label: string; nPlayers: number; nTeams: number; coop: boolean; disabled?: boolean }>()
const emit = defineEmits<{ waehle: [botID: number] }>()

const { t } = useI18n()
const menu = ref<InstanceType<typeof Menu> | null>(null)

const eintraege = computed(() => {
  const bots = onlineBots(props.nPlayers, props.nTeams, props.coop)
  const eintrag = (b: (typeof bots)[number]) => ({ label: onlineBotName(b, t), command: () => emit('waehle', b.id) })
  // Am Ende der Liste: was die Bots unterscheidet (#252)
  const uebersicht = { label: t('Bots.alleBots'), icon: 'pi pi-info-circle', url: router.resolve({ name: 'Bots' }).href, target: '_blank' }
  return [...bots.map(eintrag), { separator: true }, uebersicht]
})
</script>
