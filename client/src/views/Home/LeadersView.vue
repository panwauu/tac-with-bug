<template>
  <div class="leaderBoardPage p-card">
    <SelectButton
      v-model="selectedDate"
      class="timeSelect"
      :options="dateOptions"
      option-label="name"
      @click="changeTimeFrame()"
    />
    <Tabs value="tac">
      <TabList>
        <Tab value="tac">TAC</Tab>
        <Tab value="4">4er Team-Tac</Tab>
        <Tab value="6">6er Team-Tac</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="tac">
          <DataTable
            v-model:first="first"
            :value="data"
            :auto-layout="true"
            :loading="loading"
            :paginator="true"
            :page-link-size="3"
            :total-records="totalNumber"
            :rows="rows"
            :lazy="true"
            @page="onPage()"
          >
            <Column
              field="index"
              :header="t('Leaders.rank')"
            />
            <Column
              field="username"
              :header="t('Leaders.name')"
            >
              <template #body="slotProps">
                <PlayerWithPicture
                  :name-first="false"
                  :username="slotProps.data.username"
                />
              </template>
            </Column>
            <Column
              field="winshare"
              :header="t('Leaders.winshare')"
            />
            <Column
              field="wins"
              :header="t('Leaders.wins')"
            />
          </DataTable>
        </TabPanel>
        <TabPanel value="4">
          <DataTable
            v-model:first="firstCoop4"
            :value="dataCoop4"
            :auto-layout="true"
            :loading="loading"
            :paginator="true"
            :page-link-size="3"
            :total-records="totalNumberCoop4"
            :rows="rows"
            :lazy="true"
            @page="onPageCoop(4)"
          >
            <Column
              field="index"
              :header="t('Leaders.rank')"
            />
            <Column
              field="team"
              :header="t('Leaders.teams')"
            >
              <template #body="slotProps">
                <div class="teamContainer">
                  <div
                    v-for="teamIndex in Math.ceil(slotProps.data.team.length / 2)"
                    :key="`team4-${teamIndex}`"
                    class="team"
                  >
                    <PlayerWithPicture
                      :name-first="false"
                      :username="slotProps.data.team[2 * teamIndex - 2]"
                    />
                    <PlayerWithPicture
                      v-if="slotProps.data.team[2 * teamIndex - 1] != null"
                      :name-first="false"
                      :username="slotProps.data.team[2 * teamIndex - 1]"
                    />
                  </div>
                </div>
              </template>
            </Column>
            <Column
              field="count"
              :header="t('Leaders.cards')"
            />
            <Column
              field="lastplayed"
              :header="t('Leaders.date')"
            >
              <template #body="slotProps">
                <div>{{ createDateString(slotProps.data.lastplayed) }}</div>
              </template>
            </Column>
          </DataTable>
        </TabPanel>
        <TabPanel value="6">
          <DataTable
            v-model:first="firstCoop6"
            :value="dataCoop6"
            :auto-layout="true"
            :loading="loading"
            :paginator="true"
            :page-link-size="3"
            :total-records="totalNumberCoop6"
            :rows="rows"
            :lazy="true"
            @page="onPageCoop(6)"
          >
            <Column
              field="index"
              :header="t('Leaders.rank')"
            />
            <Column
              field="team"
              :header="t('Leaders.teams')"
            >
              <template #body="slotProps">
                <div class="teamContainer">
                  <div
                    v-for="teamIndex in Math.ceil(slotProps.data.team.length / 2)"
                    :key="`team4-${teamIndex}`"
                    class="team"
                  >
                    <PlayerWithPicture
                      :name-first="false"
                      :username="slotProps.data.team[2 * teamIndex - 2]"
                    />
                    <PlayerWithPicture
                      v-if="slotProps.data.team[2 * teamIndex - 1] != null"
                      :name-first="false"
                      :username="slotProps.data.team[2 * teamIndex - 1]"
                    />
                  </div>
                </div>
              </template>
            </Column>
            <Column
              field="count"
              :header="t('Leaders.cards')"
            />
            <Column
              field="lastplayed"
              :header="t('Leaders.teams')"
            >
              <template #body="slotProps">
                <div>{{ createDateString(slotProps.data.lastplayed) }}</div>
              </template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import SelectButton from 'primevue/selectbutton'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'

import { ref } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index.ts'

const rows = ref(10)
const totalNumber = ref(0)
const first = ref(0)
const data = ref(
  [] as {
    username: string
    wins: number
    winshare: string
    index: number
  }[]
)
const loading = ref(false)
const totalNumberCoop4 = ref(0)
const firstCoop4 = ref(0)
const dataCoop4 = ref(
  [] as {
    team: string[]
    count: number
    index: number
    lastplayed: number
  }[]
)
const loadingCoop4 = ref(false)
const totalNumberCoop6 = ref(0)
const firstCoop6 = ref(0)
const dataCoop6 = ref(
  [] as {
    team: string[]
    count: number
    index: number
    lastplayed: number
  }[]
)
const loadingCoop6 = ref(false)

const dateOptions = [
  { name: t('Leaders.Time.alltime'), startDate: 0, endDate: null },
  {
    name: t('Leaders.Time.thisYear'),
    startDate: new Date(new Date().getUTCFullYear(), 0, 1).getTime(),
    endDate: null,
  },
  {
    name: t('Leaders.Time.thisMonth'),
    startDate: new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1).getTime(),
    endDate: null,
  },
  {
    name: t('Leaders.Time.thisWeek'),
    startDate: getMonday().getTime(),
    endDate: null,
  },
]

const selectedDate = ref(dateOptions[2])

onPage()
onPageCoop(4)
onPageCoop(6)

function getMonday() {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  const day = new Date().getUTCDay() || 7
  date.setUTCHours(-24 * (day - 1))
  return date
}

function changeTimeFrame() {
  first.value = 0
  firstCoop4.value = 0
  firstCoop6.value = 0
  onPage()
  onPageCoop(4)
  onPageCoop(6)
}

async function onPage() {
  loading.value = true
  Service.getWinnerLeaderboard(rows.value, first.value, selectedDate.value.startDate, selectedDate.value.endDate ?? undefined).then((res) => {
    data.value = []
    res.username.forEach((username: string, index: number) =>
      data.value.push({
        username: username,
        wins: res.wins[index],
        winshare: res.winshare[index] + ' %',
        index: index + 1 + first.value,
      })
    )
    totalNumber.value = typeof res.nPlayers === 'string' ? parseInt(res.nPlayers) : res.nPlayers
    loading.value = false
  })
}

async function onPageCoop(nPlayers: number) {
  const firstCoop = nPlayers === 4 ? firstCoop4.value : firstCoop6.value

  if (nPlayers === 6) {
    loadingCoop6.value = true
  } else {
    loadingCoop4.value = true
  }
  Service.getCoopLeaderboard(rows.value, firstCoop, nPlayers, selectedDate.value.startDate, selectedDate.value.endDate ?? undefined).then((res) => {
    if (nPlayers === 6) {
      dataCoop6.value = []
    } else {
      dataCoop4.value = []
    }
    res.count.forEach((count: number, index: number) => {
      const dataToPush = {
        team: res.team[index],
        count: count,
        index: index + 1 + firstCoop,
        lastplayed: res.lastplayed[index],
      }
      if (nPlayers === 6) {
        dataCoop6.value.push(dataToPush)
      } else {
        dataCoop4.value.push(dataToPush)
      }
    })
    if (nPlayers === 6) {
      loadingCoop6.value = false
      totalNumberCoop6.value = typeof res.nGames === 'string' ? parseInt(res.nGames) : res.nGames
    } else {
      loadingCoop4.value = false
      totalNumberCoop4.value = typeof res.nGames === 'string' ? parseInt(res.nGames) : res.nGames
    }
  })
}

function createDateString(seconds: number) {
  const d = new Date(seconds)
  return d.toLocaleDateString()
}
</script>

<style scoped>
.leaderBoardPage {
  flex: 0 1 800px;
  max-width: 100%;
  padding: 10px;
}

.team {
  display: flex;
  flex-direction: column;
  margin-right: 5px;
}

.teamContainer {
  display: flex;
  flex-direction: row;
}

@media screen and (max-width: 500px) {
  .teamContainer {
    display: flex;
    flex-direction: column;
  }
}

.timeSelect {
  margin: 10px;
}
</style>
