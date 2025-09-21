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
        <div class="Features">
          <div>smth</div>
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
    <p>{{ t('Subscription.nSubscriptions') }}: {{ 0 }} (Still unclear)</p>
    <div v-show="isLoggedIn">New Sponsoring option</div>
    <h3>{{ t('Subscription.headerAdditionalPay') }}</h3>
    <Button
      style="text-decoration: none"
      icon="pi pi-paypal"
      :label="t('Subscription.buttonAdditionalPay')"
      as="a"
      target="_blank"
      rel="noopener noreferrer"
      href="https://www.paypal.com/paypalme/TacWithBug"
    />
    <div style="margin-top: 10px">
      <div class="disclaimer">{{ t('Subscription.disclaimer1') }}</div>
      <div class="disclaimer">{{ t('Subscription.disclaimer2') }}</div>
      <div class="disclaimer">
        {{ t('Subscription.disclaimer3') }}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://www.urbandictionary.com/define.php?term=r%2Fwhoosh"
        >
          {{ t('Subscription.disclaimer3Link') }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import SubscriptionTag from '@/components/SubscriptionTag.vue'
import YinYang from '@/components/icons/YinYang.vue'
import Luck from '@/components/icons/LuckSymbol.vue'
import { isLoggedIn } from '@/services/useUser'
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

.disclaimer {
  font-size: smaller;
}
</style>
