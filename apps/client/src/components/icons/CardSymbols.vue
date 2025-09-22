<template>
  <div>
    <svg
      v-if="card === 'trickser'"
      viewBox="0 0 116 100"
      preserveAspectRatio="xMaxYMax"
      height="100%"
      fill="none"
    >
      <path
        d="M29 0l29 50-29 50L0 50 29 0zM87 0l29 50-29 50-29-50L87 0z"
        fill="#EF3F23"
      />
    </svg>
    <svg
      v-if="card === 'teufel'"
      viewBox="0 0 58 100"
      preserveAspectRatio="xMaxYMax"
      height="100%"
      fill="none"
    >
      <path
        d="M29 0l29 50-29 50L0 50 29 0z"
        fill="#002B54"
      />
    </svg>
    <svg
      v-if="card === 'narr'"
      viewBox="0 0 58 100"
      preserveAspectRatio="xMaxYMax"
      height="100%"
      fill="none"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M74-14H-26v119H74V-14zM55 50L29 3 3 50l26 47 26-47z"
        fill="#002B54"
      />
    </svg>
    <svg
      v-if="card === 'engel'"
      viewBox="0 0 58 100"
      preserveAspectRatio="xMaxYMax"
      height="100%"
      fill="none"
    >
      <path
        d="M0 0l29 50-29 50-29-50L0 0zM58 0l29 50-29 50-29-50L58 0z"
        fill="#002B54"
      />
    </svg>
    <svg
      v-if="card === 'krieger'"
      viewBox="0 0 58 100"
      preserveAspectRatio="xMaxYMax"
      height="100%"
      fill="none"
    >
      <path
        d="M0 .498L58 100m-58 0L58 .497"
        stroke="#002B54"
        stroke-width="10"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
defineProps<{ card: string }>()
</script>
