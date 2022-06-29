<template>
  <div class="assistantWrapper">
    <div class="assistantElement">
      <h2>{{ $t("Game.GameModal.ShortManual.basisspiel") }}</h2>
      <div class="cardNumber tacRed">1</div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.1") }}</div>
      <div class="cardNumber tacRed">4</div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.4") }}</div>
      <div class="cardNumber tacRed">7</div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.7") }}</div>
      <div class="cardNumber tacRed">8</div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.8") }}</div>
      <div class="cardNumber tacRed">13</div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.13") }}</div>
      <div class="cardNumber">
        <CardSymbols card="trickser" class="cardSymbol" />
        {{ $t("Game.GameModal.ShortManual.trickserCardName") }}
      </div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.trickser") }}</div>
      <div class="cardNumber">
        <TacSymbol class="cardSymbol" />
        <div class="tacLetters">TAC</div>
      </div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.tac") }}</div>
    </div>
    <div class="assistantElement">
      <h2>{{ $t("Game.GameModal.ShortManual.meisterkarten") }}</h2>
      <div class="cardNumber">
        <CardSymbols card="narr" class="cardSymbol" />
        {{ $t("Game.GameModal.ShortManual.narrCardName") }}
      </div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.narr") }}</div>
      <div class="cardNumber">
        <CardSymbols card="engel" class="cardSymbol" />
        {{ $t("Game.GameModal.ShortManual.engelCardName") }}
      </div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.engel") }}</div>
      <div class="cardNumber">
        <CardSymbols card="krieger" class="cardSymbol" />
        {{ $t("Game.GameModal.ShortManual.kriegerCardName") }}
      </div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.krieger") }}</div>
      <div class="cardNumber">
        <CardSymbols card="teufel" class="cardSymbol" />
        {{ $t("Game.GameModal.ShortManual.teufelCardName") }}
      </div>
      <div class="manualText">{{ $t("Game.GameModal.ShortManual.teufel") }}</div>
    </div>
  </div>
  <div
    style="
      display: flex;
      justify-content: center;
      margin: 20px;
      white-space: pre-wrap;
    "
  >
    {{ $t("Game.GameModal.ShortManual.detailed") }}
    <a
      target="_blank"
      rel="noopener noreferrer"
      href="https://shop.spiel-tac.de/spielanleitungen"
    >{{ $t("Game.GameModal.ShortManual.detailedLink") }}</a>
  </div>
</template>

<script setup lang="ts">
import CardSymbols from '@/components/icons/CardSymbols.vue';
import TacSymbol from '@/components/icons/TacSymbol.vue';
</script>

<style scoped>
.assistantWrapper {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-column-gap: 20px;
}

@media only screen and (max-width: 800px) {
  .assistantWrapper {
    grid-template-columns: 1fr;
  }
}

.assistantElement {
  flex: 1 0 auto;
  max-width: 400px;
  display: flex;
  align-items: center;
  flex-direction: column;
}

.cardNumber {
  display: flex;
  align-items: center;
  font-family: "tacfontregular";
  font-size: 1.7rem;
}

@media (prefers-color-scheme: light) {
  .cardNumber {
    color: var(--tac-text-color);
  }
}

.cardSymbol {
  height: 1.4rem;
  margin-right: 10px;
  margin-bottom: 0.25rem;
}

.tacRed {
  color: var(--tac-red);
}

.manualText {
  text-align: center;
  margin-bottom: 15px;
}
</style>
