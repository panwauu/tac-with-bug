<template>
  <div>
    <div class="aussetzenSquare" />
  </div>
</template>

<style scoped>
.aussetzenSquare {
  position: relative;
  overflow: hidden;
  border-radius: 50%;
  width: 100%;
  padding: 50% 0;
  height: 0;
  animation-name: aussetzenKeyframe;
  animation-duration: 1s;
  animation-timing-function: ease-in-out;
}

.aussetzenSquare::after {
  content: '';
  position: absolute;
  display: inline-block;
  top: 12%;
  left: 12%;
  width: 76%;
  height: 76%;
  border-radius: 50%;
  box-shadow: 0px 0px 0px 2000px red;
}

.aussetzenSquare::before {
  content: '';
  position: absolute;
  display: inline-block;
  top: 50%;
  left: 50%;
  width: 18%;
  height: 100%;
  transform: translate(-50%, -50%) rotate(45deg);
  background: red;
}

@keyframes aussetzenKeyframe {
  0% {
    transform: scale(0.001);
  }

  70% {
    transform: scale(1.3);
  }

  100% {
    transform: scale(1);
  }
}
</style>
