<template>
  <div
    :class="['badge', clickable ? 'clickable' : '']"
    @click="toSubscription()"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="25"
      height="25"
      viewBox="0 0 20 20"
      style="padding-right: 3px"
    >
      <path
        xmlns="http://www.w3.org/2000/svg"
        d="M20 7h-7L10 .5 7 7H0l5.46 5.47-1.64 7 6.18-3.7 6.18 3.73-1.63-7zm-10 6.9l-3.76 2.27 1-4.28L3.5 8.5h4.61L10 4.6l1.9 3.9h4.6l-3.73 3.4 1 4.28z"
        fill="var(--p-surface-400)"
      />
    </svg>
    <div>
      <div style="font-size: 0.7rem; margin-bottom: -0.4rem">HALL OF</div>
      <div>FAME</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import router from '@/router/index'

const props = withDefaults(defineProps<{ clickable?: boolean; sponsorsOnly?: boolean }>(), { clickable: true, sponsorsOnly: true })

const toSubscription = async () => {
  if (props.clickable) {
    await router.push({ name: 'HOF' })
  }
}
</script>

<style scoped>
.badge {
  z-index: 1;
  font-weight: 800;
  display: flex;
  align-items: center;
  border: solid 2px var(--p-surface-400);
  border-radius: 7px;
  padding: 0px 4px;
  background-color: var(--surface-d);
  color: var(--p-surface-400);
}
</style>
