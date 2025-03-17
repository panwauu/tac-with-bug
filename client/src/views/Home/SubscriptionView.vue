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
    </div>
    <p>{{ t('Subscription.nSubscriptions') }}: {{ nSubscriptions }}</p>
    <div v-show="isLoggedIn">
      <div v-if="subscriptionState.status === 'expiring'">
        <Message
          :closable="false"
          severity="warn"
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
          :closable="false"
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
    <a
      class="p-button p-component p-button-label"
      style="color: var(--primary-color-text); text-decoration: none; margin-bottom: 20px"
      target="_blank"
      rel="noopener noreferrer"
      href="https://www.paypal.com/paypalme/TacWithBug"
    >
      {{ t('Subscription.buttonAdditionalPay') }}
      <i
        class="pi pi-paypal"
        style="margin-left: 5px"
        aria-hidden="true"
      />
    </a>
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

import { loadScript, PayPalButtonsComponent } from '@paypal/paypal-js'
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import router from '@/router/index'
import { useToast } from 'primevue/usetoast'
import { useSubscription } from '@/services/useSubscription'
import { injectStrict, SocketKey } from '@/services/injections'
import { isLoggedIn } from '@/services/useUser'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const toast = useToast()

const socket = injectStrict(SocketKey)
const subscriptionState = useSubscription(socket)

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
  color: var(--primary-color-text);
  font-size: 1.3rem;
  border-top-right-radius: 5px;
  border-top-left-radius: 5px;
}

.Features {
  border-radius: 5px;
  border: solid var(--green-500) 5px;
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
