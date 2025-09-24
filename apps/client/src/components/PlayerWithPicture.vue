<template>
  <div
    v-if="!(hideIfEmpty && (username === '' || username === undefined || username === null))"
    :class="['userContainer', clickable ? 'userContainerClickable' : '']"
    @click="click()"
  >
    <div
      v-if="textVisible"
      class="usernameContainer"
    >
      {{ username }}
    </div>
    <ProfilePicture
      v-if="pictureVisible === true && !bot"
      :username="username !== '' ? username : t('Chat.deletedPlayer')"
      :show-crown="showCrown"
      :online="online"
      class="autocompleteImage"
    />
    <div
      v-if="pictureVisible === true && bot"
      class="autocompleteImage"
      style="line-height: 30px; padding-left: 4px"
    >
      🤖
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import ProfilePicture from './ProfilePicture.vue'
import router from '@/router/index'

const props = withDefaults(
  defineProps<{
    username: string
    nameFirst?: boolean
    clickable?: boolean
    textVisible?: boolean
    pictureVisible?: boolean
    hideIfEmpty?: boolean
    showCrown?: boolean
    online?: boolean
    bot?: boolean
  }>(),
  {
    nameFirst: true,
    clickable: true,
    textVisible: true,
    pictureVisible: true,
    hideIfEmpty: true,
    showCrown: true,
    online: undefined,
    bot: false,
  }
)

const click = async () => {
  if (props.clickable && props.username !== '') {
    await router.push({
      name: 'Profile',
      params: { username: props.username, locale: router.currentRoute.value.params.locale },
    })
  }
}

const order = props.nameFirst ? 1 : 3
const marginRight = (props.nameFirst ? 5 : 0) + 'px'
const marginLeft = (props.nameFirst ? 0 : 5) + 'px'
</script>

<style scoped>
.userContainer {
  display: flex;
  align-items: center;
}

.userContainerClickable {
  cursor: pointer;
}

.autocompleteImage {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  order: 2;
}

.usernameContainer {
  order: v-bind(order);
  margin-right: v-bind(marginRight);
  margin-left: v-bind(marginLeft);
}
</style>
