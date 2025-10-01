<template>
  <div class="networkGraphContainer">
    <div class="cyContainer">
      <div id="cy" />
      <div
        v-if="selectedUser != null"
        class="playerCardNetwork"
      >
        <StatsWithPlayer
          :username="selectedUser.name"
          :username-to-commpare-to="props.username"
          :win-rate-of-compare-user="props.playerStats.table[0]"
          :stats="selectedUser.data"
        />
      </div>
    </div>
    <ButtonGroup>
      <Button
        icon="pi pi-refresh"
        :label="t('Profile.NetworkGraph.reset')"
        @click="resetGraph()"
      />
      <Button
        icon="pi pi-window-minimize"
        :label="t('Profile.NetworkGraph.rescale')"
        @click="resetGraphSize()"
      />
    </ButtonGroup>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ButtonGroup from 'primevue/buttongroup'
import { onUnmounted, onMounted, watch, ref } from 'vue'
import cytoscape, { type ElementsDefinition, type LayoutOptions, type StylesheetJson } from 'cytoscape'
import StatsWithPlayer from './StatsWithPlayer.vue'
import type { PlayerFrontendStatistic } from '@/generatedClient'

const { t } = useI18n()
const props = defineProps<{
  username: string
  playerStats: PlayerFrontendStatistic
}>()

const layout: LayoutOptions = {
  name: 'cose',
}

const style: StylesheetJson = [
  {
    selector: 'node',
    style: {
      width: 'mapData(score, 0, 1, 20, 60)',
      height: 'mapData(score, 0, 1, 20, 60)',
      content: 'data(name)',
      'font-size': 'mapData(score, 0, 1, 10px, 24px)',
      'text-valign': 'center',
      'text-halign': 'center',
      'background-color': 'darkgray',
      'text-outline-color': '#555',
      'text-outline-width': '2px',
      color: '#fff',
      'overlay-padding': '6px',
      'z-index': 10,
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': '6px',
      'border-color': '#AAD8FF',
      'border-opacity': 0.5,
      'background-color': '#77828C',
      'text-outline-color': '#77828C',
    },
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'haystack',
      'haystack-radius': 0.5,
      opacity: 0.4,
      'line-color': '#bbb',
      width: 'mapData(weight, 0, 1, 1, 20)',
      'overlay-padding': '3px',
    },
  },
  {
    selector: 'node.unhighlighted',
    style: {
      opacity: 0.2,
    },
  },
  {
    selector: 'edge.unhighlighted',
    style: {
      opacity: 0.05,
    },
  },
  {
    selector: '.highlighted',
    style: {
      'z-index': 999999,
    },
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-width': '6px',
      'border-color': '#AAD8FF',
      'border-opacity': 0.5,
      'background-color': '#394855',
      'text-outline-color': '#394855',
    },
  },
  {
    selector: '.game_together_edge',
    style: {
      'line-color': '#256029',
    },
  },
  {
    selector: '.game_against_edge',
    style: {
      'line-color': '#c63737',
    },
  },
]

const cy = ref<cytoscape.Core>()
const selectedUser = ref<null | { name: string; data: any }>(null)

const resetGraph = () => {
  if (cy.value != null) {
    selectedUser.value = null
    cy.value.elements().remove()
    cy.value.add(getElements())
    cy.value.layout(layout).run()

    cy.value.nodes().on('select', (event) => {
      selectedUser.value = {
        name: event.target['_private'].data.name,
        data: props.playerStats.people[event.target['_private'].data.name],
      }
    })
    cy.value.on('unselect', () => {
      selectedUser.value = null
    })
  }
}

const resetGraphSize = () => {
  if (cy.value != null) {
    cy.value?.fit()
  }
}

function getElements(): ElementsDefinition {
  const numberOfNodes = 20

  const peopleToConsider = Object.keys(props.playerStats.people)
    .toSorted((a, b) => props.playerStats.people[b][0] + props.playerStats.people[b][2] - props.playerStats.people[a][0] - props.playerStats.people[a][2])
    .slice(0, numberOfNodes)

  return {
    edges: [
      ...peopleToConsider.map((p) => {
        return {
          data: {
            source: p,
            target: props.username,
            weight: props.playerStats.people[p][0],
            together: true,
            id: `e-${p}-${props.username}-together`,
          },
          selected: false,
          selectable: false,
          locked: false,
          grabbed: false,
          classes: 'game_together_edge',
        }
      }),
      ...peopleToConsider.map((p) => {
        return {
          data: {
            source: p,
            target: props.username,
            weight: props.playerStats.people[p][2],
            together: false,
            id: `e-${p}-${props.username}-against`,
          },
          selected: false,
          selectable: false,
          locked: false,
          grabbed: false,
          classes: 'game_against_edge',
        }
      }),
    ],
    nodes: [
      ...peopleToConsider.map((p) => {
        return {
          data: {
            id: p,
            name: p,
            score: props.playerStats.people[p][0] + props.playerStats.people[p][2],
          },
          selected: false,
          selectable: true,
          locked: false,
          grabbed: false,
          grabbable: true,
        }
      }),
      {
        data: {
          id: props.username,
          name: props.username,
          score: Math.max(...peopleToConsider.map((p) => props.playerStats.people[p][0] + props.playerStats.people[p][2]), 10),
        },
        selected: false,
        selectable: false,
        locked: true,
        grabbed: false,
        grabbable: false,
      },
    ],
  }
}

onMounted(() => {
  cy.value = cytoscape({
    container: document.getElementById('cy'), // container to render in
    elements: { edges: [], nodes: [] },
    layout: layout,
    style: style,
  })
  resetGraph()
})

onUnmounted(() => {
  cy.value?.elements()?.removeAllListeners()
  cy.value?.destroy()
})

watch(
  () => props.username,
  () => {
    resetGraph()
  },
  { deep: true }
)
</script>

<style scoped>
.networkGraphContainer {
  position: relative;
  width: 100%;
}

.cyContainer {
  position: relative;
  width: 100%;
  height: 0;
  padding-top: calc(100% * min(1, 1vh / 1vw));
}

#cy {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.playerCardNetwork {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--background-contraster);
  padding: 20px;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
</style>

<style>
#cy > div > canvas {
  left: 0;
}

.playerCardNetwork > .userContainer > div {
  font-size: 30px;
}

.chartSponsorOverlay {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chartSponsorOverlay::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: var(--p-content-background);
  opacity: 0.6;
}
</style>
