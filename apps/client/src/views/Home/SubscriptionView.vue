<template>
  <div class="p-card subscriptionPage">
    <h2 class="handoverHeader">{{ t('Subscription.handoverHeader') }}</h2>
    <Timeline
      :value="timelineItems"
      class="handoverTimeline"
    >
      <template #marker="{ item }">
        <span :class="['timelineMarker', item.current ? 'timelineMarkerCurrent' : '']">
          <i :class="item.icon" />
        </span>
      </template>
      <template #content="{ item }">
        <div :class="['timelineContent', item.current ? 'timelineContentCurrent' : '']">
          <img
            :src="item.image"
            class="maintainerImage"
            :alt="item.imageAlt"
          />
          <div class="timelineText">
            <h3 class="timelineTitle">
              {{ item.title }}
              <span class="timelineDate">{{ item.date }}</span>
            </h3>

            <template v-if="item.key === 'lorenz'">
              <p>{{ t('Subscription.aboutLorenzHeader') }}</p>
              <p>{{ t('Subscription.aboutLorenz1') }}</p>
              <p>{{ t('Subscription.aboutLorenz2') }}</p>
              <p>{{ t('Subscription.aboutLorenz3') }}</p>
              <Button
                style="text-decoration: none"
                icon="pi pi-envelope"
                label="lorenz@spieltac.de"
                severity="secondary"
                as="a"
                href="mailto:lorenz@spieltac.de"
              />
              <p>{{ t('Subscription.aboutLorenzSignature') }}</p>
            </template>

            <template v-if="item.key === 'oskar'">
              <p>{{ t('Subscription.aboutMeHeader') }}</p>
              <p>{{ t('Subscription.aboutMe1') }}</p>
              <p>{{ t('Subscription.aboutMe3') }}</p>
              <p>{{ t('Subscription.aboutMeSignature') }}</p>
            </template>
          </div>
        </div>
      </template>
    </Timeline>

    <p class="supportText">{{ t('Subscription.aboutMe2') }}</p>

    <div class="FeaturesAndPrice">
      <div class="PriceTag">
        <strong>{{ t('Subscription.price') }}</strong>
      </div>
      <div class="Features">
        <SubscriptionTag
          :clickable="false"
          :sponsors-only="false"
        />
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
    <p>{{ t('Subscription.nSubscriptions') }}: {{ nSubscriptions }}</p>
    <div v-show="isLoggedIn">
      <div v-if="subscriptionState.status === 'expiring'">
        <Message
          severity="warn"
          icon="pi pi-exclamation-triangle"
        >
          {{
            t('Subscription.expiring', {
              time: new Date(subscriptionState.validuntil ?? 0).toLocaleDateString(),
            })
          }}
        </Message>
        <CountdownTimer :end-date="subscriptionState.validuntil ?? undefined" />
      </div>
      <div v-if="subscriptionState.status === 'running'">
        <Message
          :closable="false"
          severity="success"
          icon="pi pi-check"
        >
          {{ t('Subscription.running') }}
        </Message>
        <div>
          {{
            t('Subscription.runningNextPayment', {
              time: new Date(subscriptionState.validuntil ?? 0).toLocaleDateString(),
            })
          }}
        </div>
        <CountdownTimer :end-date="subscriptionState.validuntil ?? undefined" />
        <Button
          :label="t('Subscription.Cancel.button')"
          @click="cancelSubscription()"
        />
      </div>
      <div
        v-show="
          (subscriptionState.status === null || subscriptionState.status === 'cancelled' || subscriptionState.status === 'expiring') && subscriptionState.loading === false
        "
      >
        <h3>{{ t('Subscription.becomingSponsor') }}</h3>
        <div>{{ t('Subscription.paymentPerTime') }}</div>
        <SelectButton
          v-model="selectedPlan"
          :options="planModel"
          option-label="name"
        />
        <Message
          :severity="paypalPercentageSeverity"
          class="paypalPercentage"
        >
          {{ paypalPercentage + t('Subscription.paypalFeeDisclaimer') }}
        </Message>
        <div class="paypal-button-wrapper">
          <div id="paypal-button-container" />
        </div>
      </div>
    </div>
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
import CountdownTimer from '@/components/CountdownTimer.vue'
import SubscriptionTag from '@/components/SubscriptionTag.vue'
import YinYang from '@/components/icons/YinYang.vue'
import Luck from '@/components/icons/LuckSymbol.vue'
import SelectButton from 'primevue/selectbutton'
import Message from 'primevue/message'
import Timeline from 'primevue/timeline'

import { loadScript, type PayPalButtonsComponent } from '@paypal/paypal-js'
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import router from '@/router/index'
import { useToast } from 'primevue/usetoast'
import { useSubscription } from '@/services/useSubscription'
import { injectStrict, SocketKey } from '@/services/injections'
import { isLoggedIn } from '@/services/useUser'
import { useI18n } from 'vue-i18n'

import lorenzImage from '@/assets/Lorenz.webp'
import oskarImage from '@/assets/Oskar.webp'

const { t } = useI18n()
const toast = useToast()

const socket = injectStrict(SocketKey)
const subscriptionState = useSubscription(socket)

const timelineItems = computed(() => [
  {
    key: 'lorenz',
    icon: 'pi pi-users',
    date: t('Subscription.Timeline.lorenzDate'),
    title: t('Subscription.Timeline.lorenzTitle'),
    image: lorenzImage,
    imageAlt: 'Foto von Lorenz',
    current: true,
  },
  {
    key: 'oskar',
    icon: 'pi pi-flag',
    date: t('Subscription.Timeline.oskarDate'),
    title: t('Subscription.Timeline.oskarTitle'),
    image: oskarImage,
    imageAlt: 'Foto von Oskar',
    current: false,
  },
])

const nSubscriptions = ref(0)
const planModel = [
  { name: t('Subscription.buttonPlanMonthly'), value: 'MONTHLY' },
  { name: t('Subscription.buttonPlanQuaterly'), value: 'QUATERLY' },
  { name: t('Subscription.buttonPlanYearly'), value: 'YEARLY' },
]
const selectedPlan = ref(planModel[2])

const button = ref<PayPalButtonsComponent | undefined>()
const paypalScriptPromise = ref(
  loadScript({
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID as string,
    intent: 'subscription',
    vault: true,
  })
)

socket.on('subscription:nSubscriptions', saveNSubscriptions)
socket.emit('subscription:nSubscriptions')
onUnmounted(() => {
  socket.off('subscription:nSubscriptions', saveNSubscriptions)
})

onMounted(() => {
  renderButton()
})

watch(
  selectedPlan,
  () => {
    renderButton()
  },
  { deep: true }
)

function saveNSubscriptions(data: number) {
  nSubscriptions.value = data
}

function cancelSubscription() {
  if (confirm(t('Subscription.Cancel.confirm'))) {
    subscriptionState
      .cancelSubscription()
      .then(() => {
        toast.add({
          severity: 'success',
          summary: t('Subscription.Cancel.successSummary'),
          detail: t('Subscription.Cancel.successDetail'),
          life: 5000,
        })
      })
      .catch((err) => {
        console.log(err)
        toast.add({
          severity: 'error',
          summary: t('Subscription.Cancel.errorSummary'),
          detail: t('Subscription.Cancel.errorDetail'),
          life: 5000,
        })
      })
  }
}

function renderButton() {
  if (button.value != null) {
    button.value?.close()
  }

  paypalScriptPromise.value
    .then((paypal) => {
      if (paypal === null) {
        router.push({ name: 'Landing' })
        return
      }

      button.value = paypal.Buttons?.({
        createSubscription: (_, actions) => {
          return actions.subscription.create({
            plan_id: (import.meta.env[`VITE_PAYPAL_PLAN_ID_${selectedPlan.value.value}`] as string) ?? '',
          })
        },

        onError: (err) => {
          console.error('error from the onError callback', err)
          toast.add({
            severity: 'success',
            summary: t('Subscription.New.bookingErrorSummary'),
            detail: t('Subscription.New.bookingErrorDetail'),
            life: 5000,
          })
          socket.emit('subscription:nSubscriptions')
        },
        onApprove: async (data, actions) => {
          console.log(data, actions)
          subscriptionState
            .newSubscription(data.subscriptionID ?? '')
            .then(() => {
              toast.add({
                severity: 'success',
                summary: t('Subscription.New.successSummary'),
                detail: t('Subscription.New.successDetail'),
                life: 5000,
              })
              socket.emit('subscription:nSubscriptions')
            })
            .catch((err) => {
              console.error(err)
              toast.add({
                severity: 'error',
                summary: t('Subscription.New.errorSummary'),
                detail: t('Subscription.New.errorDetail'),
                life: 5000,
              })
              socket.emit('subscription:nSubscriptions')
            })
        },
      })
      button.value?.render('#paypal-button-container')
    })
    .catch((err) => {
      console.error('failed to load the PayPal JS SDK script', err)
      router.push({ name: 'Landing' })
    })
}

const paypalPercentage = computed(() => {
  if (selectedPlan.value.value === 'MONTHLY') {
    return 20
  }
  if (selectedPlan.value.value === 'QUATERLY') {
    return 8
  }
  return 4
})

const paypalPercentageSeverity = computed(() => {
  if (selectedPlan.value.value === 'MONTHLY') {
    return 'error'
  }
  if (selectedPlan.value.value === 'QUATERLY') {
    return 'warn'
  }
  return 'success'
})
</script>

<style scoped>
.subscriptionPage {
  flex: 0 1 800px;
  max-width: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.handoverHeader {
  margin: 10px 0 15px 0;
  text-align: center;
}

.handoverTimeline {
  width: 100%;
}

/* The timeline line should sit at the left edge, so the unused opposite column is removed */
.handoverTimeline :deep(.p-timeline-event-opposite) {
  display: none;
}

.timelineMarker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  background: var(--p-content-background);
  border: solid var(--p-content-border-color) 2px;
  color: var(--p-text-muted-color);
}

.timelineMarkerCurrent {
  background: var(--p-primary-color);
  border-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

.timelineContent {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
  text-align: left;
  padding-bottom: 30px;
}

.timelineContentCurrent {
  padding: 15px;
  margin-bottom: 30px;
}

.timelineText {
  flex: 1 1 260px;
}

.timelineText p {
  margin: 0 0 10px 0;
}

.maintainerImage {
  flex: 0 1 180px;
  width: 180px;
  max-width: 100%;
  border-radius: 5px;
}

.timelineTitle {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 10px 0;
}

.timelineDate {
  font-size: 0.8rem;
  font-weight: normal;
  white-space: nowrap;
  border-radius: 5px;
  padding: 2px 7px;
  background: var(--p-content-border-color);
  color: var(--p-text-muted-color);
}

.supportText {
  text-align: left;
  margin: 0;
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
