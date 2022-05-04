<template>
  <div class="landingPage">
    <div class="landingPageElement waitingWidget p-card">
      <WaitingWidget />
    </div>
    <div class="landingPageElement tournamentWidget p-card">
      <TournamentWidget />
    </div>
    <div
      class="landingPageElement tutorialWidget clickable p-card"
      @click="$router.push({ name: 'TutorialOverview' })"
    >
      <TutorialWidget />
    </div>
    <div class="landingPageElement runningWidget p-card">
      <RunningGamesWidget />
    </div>
  </div>
</template>

<script setup lang="ts">
import TournamentWidget from '@/components/Tournament/TournamentWidget.vue';
import RunningGamesWidget from '@/components/RunningGamesWidget.vue';
import WaitingWidget from '@/components/WaitingWidget.vue';
import TutorialWidget from '@/components/TutorialWidget.vue';
</script>

<style scoped>
.landingPage {
  flex: 0 1 1200px;
  max-width: 100%;
  padding: 10px;
  display: grid;
  grid-gap: 20px;
  grid-auto-columns: minmax(0, 1fr);
  grid-template-areas:
    "waiting waiting waiting"
    "tournament games tutorial";
}

@media (max-width: 800px) {
  .landingPage {
    grid-template-areas: "waiting" "games" "tournament" "tutorial";
  }
}

.landingPageElement {
  padding: 0px 15px 15px 15px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.waitingWidget {
  grid-area: waiting;
}
.tournamentWidget {
  grid-area: tournament;
}
.tutorialWidget {
  grid-area: tutorial;
}
.runningWidget {
  grid-area: games;
}
</style>