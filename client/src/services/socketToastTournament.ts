import type { GeneralSocketC } from '@/services/socket';

import { onBeforeUnmount } from 'vue';
import { useToast } from 'primevue/usetoast';
import { i18n } from '@/services/i18n';

export function registerSocketToastHandlers(socket: GeneralSocketC): void {
  const toast = useToast();

  socket.on('tournament:toast:you-created-a-team', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.you-created-a-team-summary'),
      detail: i18n.global.t('Tournament.Toast.you-created-a-team-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:invited-to-a-team', (data) => {
    toast.add({
      severity: 'warn',
      summary: i18n.global.t('Tournament.Toast.invited-to-a-team-summary'),
      detail: i18n.global.t('Tournament.Toast.invited-to-a-team-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:you-joined-team-complete', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.you-joined-team-complete-summary'),
      detail: i18n.global.t('Tournament.Toast.you-joined-team-complete-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:you-joined-team-incomplete', (data) => {
    toast.add({
      severity: 'warn',
      summary: i18n.global.t('Tournament.Toast.you-joined-team-incomplete-summary'),
      detail: i18n.global.t('Tournament.Toast.you-joined-team-incomplete-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:player-joined-team-complete', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.player-joined-team-complete-summary'),
      detail: i18n.global.t('Tournament.Toast.player-joined-team-complete-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:player-joined-team-incomplete', (data) => {
    toast.add({
      severity: 'warn',
      summary: i18n.global.t('Tournament.Toast.player-joined-team-incomplete-summary'),
      detail: i18n.global.t('Tournament.Toast.player-joined-team-incomplete-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:you-activated-complete', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.you-activated-complete-summary'),
      detail: i18n.global.t('Tournament.Toast.you-activated-complete-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:you-activated-incomplete', (data) => {
    toast.add({
      severity: 'warn',
      summary: i18n.global.t('Tournament.Toast.you-activated-incomplete-summary'),
      detail: i18n.global.t('Tournament.Toast.you-activated-incomplete-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:player-activated-team-complete', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.player-activated-team-complete-summary'),
      detail: i18n.global.t('Tournament.Toast.player-activated-team-complete-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:player-activated-team-incomplete', (data) => {
    toast.add({
      severity: 'warn',
      summary: i18n.global.t('Tournament.Toast.player-activated-team-incomplete-summary'),
      detail: i18n.global.t('Tournament.Toast.player-activated-team-incomplete-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:you-left-tournament', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.you-left-tournament-summary'),
      detail: i18n.global.t('Tournament.Toast.you-left-tournament-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:partner-left-tournament', (data) => {
    toast.add({
      severity: 'warn',
      summary: i18n.global.t('Tournament.Toast.partner-left-tournament-summary'),
      detail: i18n.global.t('Tournament.Toast.partner-left-tournament-detail', {
        tournamentTitle: data.tournamentTitle,
        teamName: data.registerTeam.name,
        playerName: data.player,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:signUpEnded-you-partizipate', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.signUpEnded-you-partizipate-summary'),
      detail: i18n.global.t('Tournament.Toast.signUpEnded-you-partizipate-detail', {
        tournamentName: data.tournamentTitle,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:signUpEnded-you-wont-partizipate', (data) => {
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Tournament.Toast.signUpEnded-you-wont-partizipate-summary'),
      detail: i18n.global.t('Tournament.Toast.signUpEnded-you-wont-partizipate-detail', {
        tournamentName: data.tournamentTitle,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:signUp-failed', (data) => {
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Tournament.Toast.signUp-failed-summary'),
      detail: i18n.global.t('Tournament.Toast.signUp-failed-detail', {
        tournamentTitle: data.tournamentTitle,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:started', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.started-summary'),
      detail: i18n.global.t('Tournament.Toast.started-detail', {
        tournamentName: data.tournamentTitle,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:round-started', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.round-started-summary', {
        roundName: i18n.global.t(`Tournament.Brackets.bracketList${data.roundsToFinal}`),
      }),
      detail: i18n.global.t('Tournament.Toast.round-started-detail', {
        tournamentName: data.tournamentTitle,
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:round-ended', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.round-ended-summary', {
        roundName: i18n.global.t(`Tournament.Brackets.bracketList${data.roundsToFinal}`),
      }),
      detail: i18n.global.t('Tournament.Toast.round-ended-detail', {
        tournamentName: data.tournamentTitle,
        roundName: i18n.global.t(`Tournament.Brackets.bracketList${data.roundsToFinal}`),
      }),
      life: 10000,
    });
  });

  socket.on('tournament:toast:ended', (data) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Tournament.Toast.ended-summary'),
      detail: i18n.global.t('Tournament.Toast.ended-detail', {
        tournamentName: data.tournamentTitle,
        teamName: data.winner.name,
        players1: data.winner.players.slice(0, data.winner.players.length - 1).join(', '),
        players2: data.winner.players[data.winner.players.length - 1],
      }),
      life: 10000,
    });
  });

  onBeforeUnmount(() => {
    socket.removeAllListeners('tournament:toast:you-created-a-team');
    socket.removeAllListeners('tournament:toast:invited-to-a-team');
    socket.removeAllListeners('tournament:toast:you-joined-team-complete');
    socket.removeAllListeners('tournament:toast:you-joined-team-incomplete');
    socket.removeAllListeners('tournament:toast:player-joined-team-complete');
    socket.removeAllListeners('tournament:toast:player-joined-team-incomplete');
    socket.removeAllListeners('tournament:toast:you-activated-complete');
    socket.removeAllListeners('tournament:toast:you-activated-incomplete');
    socket.removeAllListeners('tournament:toast:player-activated-team-complete');
    socket.removeAllListeners('tournament:toast:player-activated-team-incomplete');
    socket.removeAllListeners('tournament:toast:you-left-tournament');
    socket.removeAllListeners('tournament:toast:partner-left-tournament');
    socket.removeAllListeners('tournament:toast:signUpEnded-you-partizipate');
    socket.removeAllListeners('tournament:toast:signUpEnded-you-wont-partizipate');
    socket.removeAllListeners('tournament:toast:signUp-failed');
    socket.removeAllListeners('tournament:toast:started');
    socket.removeAllListeners('tournament:toast:round-started');
    socket.removeAllListeners('tournament:toast:round-ended');
    socket.removeAllListeners('tournament:toast:ended');
  })
}