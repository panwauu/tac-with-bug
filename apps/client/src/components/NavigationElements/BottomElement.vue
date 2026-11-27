<template>
  <div class="bottomMenu">
    <router-link
      class="bottomMenuElement"
      :to="{ name: 'Impressum' }"
    >
      <i
        class="pi pi-id-card icon"
        aria-hidden="true"
      />
      {{ t('Home.Impressum') }}
    </router-link>
    <router-link
      class="bottomMenuElement"
      :to="{ name: 'Copyright' }"
    >
      <i
        class="pi pi-file icon"
        aria-hidden="true"
      />
      {{ t('Home.Copyright') }}
    </router-link>
    <router-link
      class="bottomMenuElement"
      :to="{ name: 'Datenschutz' }"
    >
      <i
        class="pi pi-book icon"
        aria-hidden="true"
      />
      {{ t('Home.Datenschutz') }}
    </router-link>
    <router-link
      class="bottomMenuElement"
      :to="{ name: 'FAQ' }"
    >
      <i
        class="pi pi-book icon"
        aria-hidden="true"
      />
      {{ t('Home.FAQ') }}
    </router-link>
  </div>
</template>

<script setup lang="ts">
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
  color: inherit;
  text-decoration: none;
}

.bottomMenuElement:hover {
  text-decoration: underline;
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
