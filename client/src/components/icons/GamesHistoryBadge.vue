<template>
  <div :class="[win, 'gamesHistoryBadge']">
    {{
      win === "lost"
        ? $t("Profile.lIconSymbol")
        : win === "won"
          ? $t("Profile.wIconSymbol")
          : win === "coop"
            ? $t("Profile.tIconSymbol")
            : win === "aborted"
              ? $t("Profile.aIconSymbol")
              : $t("Profile.rIconSymbol")
    }}
  </div>
</template>

<script setup lang="ts">

defineProps<{ win: string }>();
</script>

<style scoped>
.gamesHistoryBadge {
  height: 30px;
  width: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin: 2px;
}

.won {
  background-color: #c8e6c9;
  color: #256029;
}

.lost {
  background-color: #ffcdd2;
  color: #c63737;
}

.coop {
  background-color: #ffd8b2;
  color: #805b36;
}

.aborted {
  background-color: #f88f8f;
  color: #813c30;
}

.running {
  background-color: #8f96f8;
  color: #305381;
}
</style>
