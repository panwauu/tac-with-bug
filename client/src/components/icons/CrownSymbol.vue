<template>
  <div ref="crownRef" class="crownOuter">
    <div class="left">
      <div class="leftrightinner">
        <div class="left-after" />
      </div>
    </div>
    <div class="right">
      <div class="leftrightinner">
        <div class="right-after" />
      </div>
    </div>
    <div class="circle circle1" />
    <div class="circle circle2" />
    <div class="circle circle3" />
    <div class="lowerBar" />
    <div class="lowerBarLeft" />
    <div class="lowerBarRight" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps<{ rank: number }>()

const crownRef = ref<HTMLDivElement | null>(null);

onMounted(() => {
  const color = props.rank === 1 ? '#c99336' : props.rank === 2 ? '#9c9b9e' : props.rank === 3 ? '#875e23' : '#1a1815';
  crownRef.value?.style?.setProperty('--crown-color', color);
})
</script>

<style scoped>
.crownOuter {
  height: 0px;
  width: 100%;
  padding: 34% 0px;
  position: relative;
  --crown-color: transparent;
}

.crownOuter > div {
  position: absolute;
}

.lowerBar {
  width: 60%;
  height: 16%;
  background: var(--crown-color);
  left: 50%;
  transform: translate(-50%, 0px);
  bottom: 5%;
}

.lowerBarLeft {
  height: 16%;
  width: 10%;
  background: var(--crown-color);
  border-radius: 25%;
  bottom: 5%;
  left: 13%;
}

.lowerBarRight {
  height: 16%;
  width: 10%;
  background: var(--crown-color);
  border-radius: 25%;
  bottom: 5%;
  right: 13%;
}

.left {
  width: 45%;
  height: 59%;
  border-radius: 7%;
  transform: skew(10deg);
  bottom: 28%;
  left: 10%;
}

.leftrightinner {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.left-after {
  position: absolute;
  content: "";
  top: -207%;
  left: -51%;
  border-radius: 16%;
  width: 200%;
  height: 200%;
  box-shadow: 0px 0px 0px 2000px var(--crown-color);
  transform: rotate(60deg) skew(17deg);
}
.right {
  width: 45%;
  height: 59%;
  border-radius: 7%;
  overflow: hidden;
  transform: skew(-10deg);
  bottom: 28%;
  right: 10%;
}
.right-after {
  position: absolute;
  content: "";
  top: -207%;
  right: -51%;
  border-radius: 16%;
  width: 200%;
  height: 200%;
  box-shadow: 0px 0px 0px 2000px var(--crown-color);
  transform: rotate(-60deg) skew(-17deg);
}
.circle {
  border-radius: 50%;
  width: 12%;
  padding: 6% 0px;
  background-color: var(--crown-color);
}
.circle1 {
  top: 0%;
  right: 50%;
  transform: translate(50%, 0px);
}
.circle2 {
  right: 4.5%;
  top: 13%;
}
.circle3 {
  left: 4.5%;
  top: 13%;
}
</style>