<template>
  <div class="networkGraphContainer">
    <div class="cyContainer">
      <div id="cy" />
      <div
        v-if="selectedUser != null"
        class="playerCardNetwork"
      >
        <PlayerWithPicture
          :username="selectedUser.name"
          :name-first="false"
        />
        <div class="playerCardElement">
          {{
            t('Profile.NetworkGraph.togetherWith', {
              username: username,
              nGames: selectedUser.data[0],
              count: selectedUser.data[0],
            })
          }}
        </div>
        <div
          class="playerCardElement"
          style="padding-left: 10px"
        >
          {{
            t('Profile.NetworkGraph.wonOf', {
              nGames: selectedUser.data[1],
              count: selectedUser.data[1],
            })
          }}
        </div>
        <div class="playerCardElement">
          {{
            t('Profile.NetworkGraph.playedAgainst', {
              username: username,
              nGames: selectedUser.data[2],
              count: selectedUser.data[2],
            })
          }}
        </div>
        <div
          class="playerCardElement"
          style="padding-left: 10px"
        >
          {{
            t('Profile.NetworkGraph.wonOf', {
              nGames: selectedUser.data[2] - selectedUser.data[3],
              count: selectedUser.data[2] - selectedUser.data[3],
            })
          }}
        </div>
        <div class="playerCardElement">
          {{
            t('Profile.NetworkGraph.team', {
              nGames: selectedUser.data[4] - selectedUser.data[2] - selectedUser.data[0],
              count: selectedUser.data[4] - selectedUser.data[2] - selectedUser.data[0],
            })
          }}
        </div>
      </div>
    </div>
    <ButtonGroup>
      <Button
        icon="pi pi-refresh"
        label="Reset"
        @click="resetGraph()"
      />
      <Button
        icon="pi pi-window-minimize"
        label="Rescale"
        @click="resetGraphSize()"
      />
    </ButtonGroup>
    <div
      v-if="loading"
      class="loadingOverlay"
    >
      <i
        class="pi pi-spin pi-spinner"
        style="font-size: 4rem"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import ButtonGroup from 'primevue/buttongroup'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'

import { onUnmounted, onMounted, watch, ref } from 'vue'
import cytoscape from 'cytoscape'

const props = defineProps<{
  networkData: any
  peopleData: any
  username: string
  loading: boolean
}>()

const layout = {
  name: 'cose',
  idealEdgeLength: (edge: any) => {
    return 1 / edge['_private'].data.weight
  },
  nodeOverlap: 20,
  refresh: 20,
  fit: true,
  randomize: true,
  componentSpacing: 100,
  nodeRepulsion: () => {
    return 1000000
  },
  edgeElasticity: (edge: any) => {
    return edge['_private'].data.weight * 300
  },
  nestingFactor: 5,
  gravity: 80,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0,
}

const style = [
  {
    selector: 'core',
    style: {
      'selection-box-color': '#AAD8FF',
      'selection-box-border-color': '#8BB0D0',
      'selection-box-opacity': 0.5,
    },
  },
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

const cy: null | any = ref(null)
const selectedUser: null | any = ref(null)

const resetGraph = () => {
  if (cy.value != null && props.networkData != null) {
    selectedUser.value = null
    cy.value?.elements()?.remove()
    cy.value?.add(enrichDataModel())
    cy.value?.layout(layout)?.run()

    cy.value?.nodes()?.on('select', (event: any) => {
      selectedUser.value = {
        name: event.target['_private'].data.name,
        data: props.peopleData[event.target['_private'].data.name],
      }
    })
    cy.value?.on('unselect', () => {
      selectedUser.value = null
    })
  }
}

const resetGraphSize = () => {
  if (cy.value != null) {
    cy.value?.fit()
  }
}

const enrichDataModel = () => {
  return {
    edges: props.networkData.edges.map((e: any) => {
      return {
        ...e,
        group: 'edges',
        selected: false,
        selectable: false,
        locked: false,
        grabbed: false,
        classes: e.data.together ? 'game_together_edge' : 'game_against_edge',
      }
    }),
    nodes: props.networkData.nodes.map((e: any) => {
      return {
        ...e,
        group: 'nodes',
        selected: false,
        selectable: e.data.name !== props.username,
        locked: false,
        grabbed: false,
        grabbable: true,
      }
    }),
  }
}

onMounted(() => {
  cy.value = cytoscape({
    container: document.getElementById('cy'), // container to render in
    elements: props.networkData,
    layout: layout as any,
    style: style as any,
  })
})

onUnmounted(() => {
  cy.value?.elements()?.removeAllListeners()
  cy.value?.destroy()
})

watch(
  () => props.networkData,
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
  padding-top: 100%;
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

.playerCardElement {
  white-space: nowrap;
}
</style>

<style>
#cy > div > canvas {
  left: 0;
}

.playerCardNetwork > .userContainer > div {
  font-size: 30px;
}

.loadingOverlay {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loadingOverlay::after {
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
