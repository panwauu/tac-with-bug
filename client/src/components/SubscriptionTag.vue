<template>
  <div
    :class="['tag', clickable ? 'clickable' : '']"
    @click="toSubscription()"
  >{{ sponsorsOnly ? $t("Subscription.Tag.sponsorsOnly") : $t("Subscription.Tag.sponsor") }}</div>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue';
import router from '@/router/index'

const props = withDefaults(
  defineProps<{ clickable?: boolean, sponsorsOnly?: boolean }>(),
  { clickable: true, sponsorsOnly: true }
)

const toSubscription = () => {
  if (props.clickable) {
    router.push({ name: 'Subscription' });
  }
}
</script>

<style scoped>
.tag {
  z-index: 1;
  font-weight: 800;
  background: linear-gradient(rgb(253, 255, 135), rgb(184, 125, 31));
  box-shadow: 4px 4px 10px -5px black;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  padding: 7px;
  color: #495057;
  text-transform: uppercase;
}
</style>