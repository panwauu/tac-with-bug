<template>
  <div>
    <svg
      height="100%"
      viewBox="0 0 56 30"
      preserveAspectRatio="xMinYMid meet"
      class="tacfont"
    >
      <text
        x="0"
        y="30"
        font-size="42"
        fill="var(--tac-text-color)"
        class="tacLetters"
      >
        <tspan>T</tspan>
        AC
      </text>
    </svg>
  </div>
</template>

<style scoped>
.tacfont {
  font-family: "tacfontregular", Monospace;
}
svg text :first-child {
  letter-spacing: -17.5px;
}
</style>
