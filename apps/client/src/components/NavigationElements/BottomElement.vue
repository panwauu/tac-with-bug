<template>
  <div class="bottomMenu">
    <div
      class="bottomMenuElement clickable"
      @click="router.push({ name: 'Impressum' })"
    >
      <i
        class="pi pi-id-card icon"
        aria-hidden="true"
      />
      {{ t('Home.Impressum') }}
    </div>
    <div
      class="bottomMenuElement clickable"
      @click="router.push({ name: 'Copyright' })"
    >
      <i
        class="pi pi-file icon"
        aria-hidden="true"
      />
      {{ t('Home.Copyright') }}
    </div>
    <div
      class="bottomMenuElement clickable"
      @click="router.push({ name: 'Datenschutz' })"
    >
      <i
        class="pi pi-book icon"
        aria-hidden="true"
      />
      {{ t('Home.Datenschutz') }}
    </div>
    <div
      class="bottomMenuElement clickable"
      @click="router.push({ name: 'FAQ' })"
    >
      <i
        class="pi pi-book icon"
        aria-hidden="true"
      />
      {{ t('Home.FAQ') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import router from '@/router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.bottomMenu {
  width: 100%;
  font-weight: lighter;
  font-size: smaller;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
}

.bottomMenuElement {
  margin: 0 10px;
}

.bottomMenuElement > .icon {
  font-size: 0.8em;
}

@media screen and (max-width: 600px) {
  .bottomMenu {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
