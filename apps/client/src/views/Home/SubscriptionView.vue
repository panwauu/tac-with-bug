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
      <div class="FeaturesAndPrice">
        <div class="PriceTag">
          <strong>{{ t('Subscription.price') }}</strong>
        </div>
        <div class="Features">
          <div class="FeatureElement">
            <YinYang class="FeatureIcon" />
            <div class="FeatureText">
              <strong>{{ t('Subscription.featureKarma1') }}</strong>
              {{ t('Subscription.featureKarma2') }}
            </div>
          </div>
          <div class="FeatureElement">
            <Luck class="FeatureIcon" />
            <div class="FeatureText">{{ t('Subscription.featureLuck') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import YinYang from '@/components/icons/YinYang.vue'
import Luck from '@/components/icons/LuckSymbol.vue'
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
