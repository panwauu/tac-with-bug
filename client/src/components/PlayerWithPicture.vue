<template>
  <div
    v-if="
      !(
        hideIfEmpty &&
        (username === '' || username === undefined || username === null)
      )
    "
    :class="['userContainer', clickable ? 'userContainerClickable' : '']"
    @click="click()"
  >
    <div v-if="textVisible" class="usernameContainer">{{ username }}</div>
    <ProfilePicture
      v-if="pictureVisible === true"
      :username="username != '' ? username : $t('Chat.deletedPlayer')"
      :showCrown="showCrown"
      :online="online"
      class="autocompleteImage"
    />
  </div>
</template>

<script setup lang="ts">
import ProfilePicture from './ProfilePicture.vue';
import router from '@/router/index'
import { withDefaults } from 'vue';

const props = withDefaults(defineProps<{
  username: string,
  nameFirst?: boolean,
  clickable?: boolean,
  textVisible?: boolean,
  pictureVisible?: boolean,
  hideIfEmpty?: boolean,
  showCrown?: boolean,
  online?: boolean,
}>(),
  {
    nameFirst: true,
    clickable: true,
    textVisible: true,
    pictureVisible: true,
    hideIfEmpty: true,
    showCrown: true,
    online: undefined,
  })

const click = () => {
  if (props.clickable && props.username != '') {
    router.push({
      name: 'Profile',
      params: { username: props.username, locale: router.currentRoute.value.params.locale }
    });
  }
}

const order = props.nameFirst ? 1 : 3;
const marginRight = (props.nameFirst ? 5 : 0) + 'px';
const marginLeft = (props.nameFirst ? 0 : 5) + 'px';
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
