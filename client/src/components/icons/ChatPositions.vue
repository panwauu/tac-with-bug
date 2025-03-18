<template>
  <div>
    <svg
      v-if="position === 'right'"
      viewBox="0 0 100 80"
      preserveAspectRatio="xMaxYMax"
      height="100%"
    >
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M0 0h100v12H0z"
      />
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M0 0h12v80H0z"
      />
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M0 68h100v12H0z"
      />
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M70 0h30v80H70z"
      />
    </svg>
    <svg
      v-if="position === 'bottom'"
      viewBox="0 0 100 80"
      preserveAspectRatio="xMaxYMax"
      height="100%"
    >
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M0 0h100v12H0z"
      />
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M0 0h12v80H0z"
      />
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M0 50h100v30H0z"
      />
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M88 0h12v80H88z"
      />
    </svg>
    <svg
      v-if="position === 'overlay'"
      viewBox="0 0 100 80"
      preserveAspectRatio="xMaxYMax"
      height="100%"
    >
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M0 0h30v12H0zM0 68h30v12H0zM70 0h30v12H70z"
      />
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M0 0h12v30H0zM0 50h12v30H0zM70 68h30v12H70z"
      />
      <path
        :fill="selected ? 'var(--p-primary-color)' : 'var(--surface-800)'"
        d="M88 50h12v30H88zM88 0h12v30H88z"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
defineProps<{ selected: boolean; position: string }>()
</script>
