<template>
  <div v-if="tournament.status === 'signUp' && isLoggedIn">
    <Button
      style="margin: 20px"
      :label="$t('Tournament.SignUp.openModalButton')"
      :disabled="alreadyRegistered"
      @click="startTeamSignUp"
    />
  </div>

  <Dialog
    v-model:visible="displaySignUpTeam"
    :header="$t('Tournament.SignUp.title')"
    :modal="true"
    :dismissableMask="true"
    style="max-width: 500px"
    @hide="generateNewName"
  >
    <div class="teamSignUp">
      <span class="p-float-label" style="min-width: 230px; margin: 20px">
        <InputText
          id="signUpTeamName"
          v-model="signUpTeamName"
          type="text"
          style="width: 100%"
          :class="validTeamName ? '' : 'p-invalid'"
        />
        <label for="signUpTeamName">{{ $t("Tournament.SignUp.teamNamePlaceholder") }}</label>
        <div
          v-if="!validTeamName"
          style="max-width: 400px; font-size: 12px"
        >{{ $t("Tournament.SignUp.invalidTeamName") }}</div>
      </span>
      <SelectButton
        v-model="signUpAlone"
        class="filterButton"
        :options="signUpAloneModel"
        optionLabel="name"
      />
      <PlayersAutoComplete
        v-model:username="signUpPartner"
        :userid="null"
        :class="{
          teamSignUpPlayerSelect: true,
          teamSignUpPlayerSelectActive:
            signUpAlone != null && signUpAlone?.value === true,
        }"
        :playersToAvoid="playersAlreadyInTournament"
      />
      <Button
        :label="$t('Tournament.SignUp.submitButton')"
        :disabled="
          signUpAlone === null ||
            (signUpAlone?.value === true && signUpPartner === '') ||
            signUpTeamName === '' ||
            !validTeamName
        "
        style="margin-top: 20px"
        @click="signUpTeam()"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import PlayersAutoComplete from '@/components/PlayersAutoComplete.vue';

import { publicTournament } from '@/../../shared/types/typesTournament';

import { computed, ref } from 'vue';
import { i18n } from '@/services/i18n';
import { DefaultService as Service } from '@/generatedClient/index';
import { injectStrict, SocketKey } from '@/services/injections';
import { isLoggedIn, username } from '@/services/useUser';

const props = defineProps<{ tournament: publicTournament }>()

const socket = injectStrict(SocketKey)

const signUpAloneModel = ref([
  {
    name: i18n.global.t('Tournament.SignUp.selectButtonWithPartner'),
    value: true,
  },
  {
    name: i18n.global.t('Tournament.SignUp.selectButtonAlone'),
    value: false,
  }
])

const displaySignUpTeam = ref(false)
const signUpAlone = ref<null | { value: boolean, name: string }>(null)
const signUpPartner = ref('')
const signUpTeamName = ref('')

function startTeamSignUp() {
  signUpAlone.value = null;
  signUpPartner.value = '';
  displaySignUpTeam.value = true;
}

function signUpTeam() {
  if (username.value === null) { return }

  if (confirm(i18n.global.t('Tournament.signUpConfirmationText'))) {
    socket.emit('tournament:public:registerTeam', {
      name: signUpTeamName.value,
      players:
        signUpPartner.value !== ''
          ? [username.value, signUpPartner.value]
          : [username.value],
      tournamentID: props.tournament.id,
    });
  }
  displaySignUpTeam.value = false;
  signUpAlone.value = null;
  signUpPartner.value = '';
  signUpTeamName.value = '';
}

const letters = /^[A-Za-z\u00E4\u00F6\u00FC\u00C4\u00D6\u00DC\u00df0-9._ +<>-]+$/;
const blanks = /^[ ]+$/;

const alreadyRegistered = computed(() => {
  return (
    props.tournament.teams.some((t) => username.value != null && t.players.includes(username.value)) ||
    props.tournament.registerTeams.some((t) => username.value != null && t.players.includes(username.value))
  )
})

const validTeamName = computed(() => {
  return signUpTeamName.value === '' || (
    signUpTeamName.value.length < 25 &&
    signUpTeamName.value.length >= 5 &&
    signUpTeamName.value.match(letters) != null &&
    signUpTeamName.value.match(blanks) === null &&
    !props.tournament.registerTeams.some((t) => t.name === signUpTeamName.value)
  )
})

const playersAlreadyInTournament = computed(() => {
  const result: string[] = []
  props.tournament.teams.forEach((t) => {
    t.players.forEach((p) => { result.push(p) })
  })
  props.tournament.registerTeams.forEach((t) => {
    t.players.forEach((p) => { result.push(p) })
  })
  if (username.value != null) { result.push(username.value) }
  return result
})

async function generateNewName() {
  Service.generateTournamentTeamName(props.tournament.id).then((name) => { signUpTeamName.value = name; })
}
generateNewName()
</script>

<style scoped>
.teamSignUp {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.teamSignUpPlayerSelect {
  max-height: 0px;
  margin-top: 0px;
  overflow: hidden;
  transition: all 0.5s;
}

.teamSignUpPlayerSelectActive {
  max-height: 100px;
  margin-top: 20px;
}
</style>
