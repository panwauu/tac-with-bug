<template>
  <div class="logoWrapper">
    <TwbSymbol class="symbol symbolLeft" side="left" />
    <TwbText class="text" />
    <TwbSymbol class="symbol symbolRight" side="right" />
    <div class="scaler" />
  </div>
</template>

<script setup lang="ts">
import TwbSymbol from './TwbSymbol.vue';
import TwbText from './TwbText.vue';
</script>

<style scoped>
.logoWrapper {
  position: relative;
}

.symbol {
  height: 100%;
  top: 0;
  position: absolute;
  width: 26.45%;
}

.symbolLeft {
  left: 0;
}

.symbolRight {
  right: 0;
}

.text {
  height: 100%;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.scaler {
  width: 100%;
  height: 0;
  padding-top: 23%;
}
</style>