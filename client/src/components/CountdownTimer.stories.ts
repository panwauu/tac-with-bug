import CountdownTimer from './CountdownTimer.vue'

import { Meta, StoryFn } from '@storybook/vue3'

export default {
  title: 'TeamName',
  component: CountdownTimer,
} as Meta<typeof CountdownTimer>

const Template: StoryFn<typeof CountdownTimer> = (args) => ({
  components: { CountdownTimer },
  setup() {
    return { args }
  },
  template: '<CountdownTimer v-bind="args" />',
})

export const Countdown = Template.bind({})
Countdown.args = { endDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), mode: 'down', displayDays: false }

export const Countup = Template.bind({})
Countup.args = { initialMilliseconds: 0, mode: 'up', displayDays: false }
