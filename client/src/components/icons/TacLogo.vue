<template>
  <div class="logoWrapper">
    <TacSymbol class="symbol symbolLeft" />
    <TacText class="text" />
    <TacSymbol class="symbol symbolRight" />
    <div class="scaler" />
  </div>
</template>

<script setup lang="ts">
import TacSymbol from './TacSymbol.vue';
import TacText from './TacText.vue';
</script>

<style scoped>
.logoWrapper {
  position: relative;
}

.symbol {
  height: 100%;
  top: 0;
  position: absolute;
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
