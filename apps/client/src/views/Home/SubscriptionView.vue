<template>
  <div class="p-card subscriptionPage">
    <div style="margin-bottom: 20px">
      <img
        src="@/assets/Oskar.webp"
        style="width: 50%; border-radius: 5px"
        alt="Foto von Oskar"
      />
      <h2>{{ t('Subscription.aboutMeHeader') }}</h2>
      <p>{{ t('Subscription.aboutMe1') }}</p>
      <p>{{ t('Subscription.aboutMe2') }}</p>
    </div>

    <iframe
      id="kofiframe"
      src="https://ko-fi.com/tacwithbug/?hidefeed=true&widget=true&embed=true&preview=true"
      style="border: none; width: 100%; padding: 4px; background: #f9f9f9"
      height="712"
      title="tacwithbug"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.subscriptionPage {
  flex: 0 1 800px;
  max-width: 100%;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.FeaturesAndPrice {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.PriceTag {
  padding: 5px;
  background: var(--green-500);
  color: var(--p-primary-color-text);
  font-size: 1.3rem;
  border-top-right-radius: 5px;
  border-top-left-radius: 5px;
}

.Features {
  border-radius: 5px;
  border: solid var(--p-message-success-color) 5px;
  padding: 10px;
}

.FeatureElement {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  margin: 3px;
}

.FeatureIcon {
  height: 30px;
  object-fit: contain;
}

.FeatureText {
  margin: 7px;
}

.paypal-button-wrapper {
  max-width: 300px;
  margin: 0 auto;
}

.disclaimer {
  font-size: smaller;
}

.paypalPercentage {
  width: fit-content;
  margin: 20px auto;
}
</style>
