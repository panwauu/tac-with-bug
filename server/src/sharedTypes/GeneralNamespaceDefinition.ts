import type { Socket as ServerSocket, Namespace } from 'socket.io';
import type { Socket as ClientSocket } from 'socket.io-client';
import type { createGameType, movePlayerType, switchColorType, waitingGame, startGameType } from './typesWaiting';
import type { subscriptionExport } from './typesSubscription';
import type { gameForOverview, getGamesType, getRunningGamesType, updateDataType } from './typesDBgame';
import type { registerTeam, publicTournament, team as tournamentTeam, privateTournament, tournamentTableData, lastTournamentWinners } from './typesTournament';
import type { moveTextOrBall } from './typesBall';
import type { friend } from './typesFriends';
import type { TutorialStepOutput } from './typesTutorial';
import type { gameForPlay } from './typesDBgame';
import { chatElement, chatMessage } from './chat';

export type AckData<T> = { status: number, error?: any, data?: T }
export type callbackFunction<T> = (data: AckData<T>) => void;

export type Result<Data, Error> = { ok: true, value: Data } | { ok: false, error: Error }
export type cb<Data, Error> = (data: Result<Data, Error>) => void;

export interface ClientToServerEvents extends Record<string, any> {
    //authentication
    'login': (data: { token: string }, cb: callbackFunction<null>) => void,
    'logout': (cb: callbackFunction<null>) => void,

    //tutorial
    'tutorial:loadProgress': (cb: callbackFunction<{ progress: boolean[][] }>) => void,
    'tutorial:resetTutorial': (data: { tutorialID: number }, cb: callbackFunction<{ progress: boolean[][] }>) => void,
    'tutorial:changeTutorialStep': (data: { tutorialID: number, tutorialStep: number, done: boolean }, cb: callbackFunction<{ progress: boolean[][] }>) => void,
    'tutorial:load': (data: { tutorialID: number, tutorialStep: number }, cb: callbackFunction<TutorialStepOutput>) => void,
    'tutorial:postMove': (data: { game: gameForPlay, move: moveTextOrBall }, cb: callbackFunction<{ game: gameForPlay, updateData: updateDataType }>) => void,

    //games
    'games:getTableData': (
        data: { first: number, limit: number, sortField?: string, sortOrder?: number, username?: string },
        cb: callbackFunction<{ games: gameForOverview[], nEntries: number }>
    ) => void,
    'games:getGames': () => void,
    'games:getRunningGames': (cb: callbackFunction<getRunningGamesType[]>) => void,

    //chat
    'chat:all': (data: { text: string }) => void,
    'chat:game': (data: { text: string, gameID: number }) => void,
    'chat:waiting': (data: { text: string }) => void,

    //chat & channel
    'chat:startChat': (data: { userids: number[], title: string | null }, cb: callbackFunction<{ overview: chatElement[], chatid: number }>) => void,
    'chat:addUser': (data: { userid: number, chatid: number }, cb: callbackFunction<null>) => void,
    'chat:changeTitle': (data: { chatid: number, title: string }, cb: callbackFunction<null>) => void,
    'chat:leaveChat': (data: { chatid: number }, cb: callbackFunction<null>) => void,
    'chat:markAsRead': (data: { chatid: number }, cb: callbackFunction<null>) => void,
    'chat:sendMessage': (data: { chatid: number, body: string }, cb: callbackFunction<null>) => void,
    'chat:singleChat:load': (data: { chatid: number }, cb: callbackFunction<{ chatid: number, messages: chatMessage[] }>) => void,
    'chat:overview:load': (cb: callbackFunction<chatElement[]>) => void,
    'channel:sendMessage': (data: { channel: string, body: string }, cb: callbackFunction<null>) => void,
    'channel:load': (data: { channel: string }, cb: callbackFunction<{ channel: string, messages: chatMessage[] }>) => void,

    //subscription
    'subscription:get': () => void,
    'subscription:new': (subscriptionID: string, cb: callbackFunction<null>) => void,
    'subscription:cancel': (cb: callbackFunction<null>) => void,
    'subscription:nSubscriptions': () => void,

    //tournament
    'tournament:loadTable': (data: { filter: 'private' | 'public' | null, first: number, limit: number }, cb: callbackFunction<tournamentTableData>) => void,
    'tournament:winners:get': (cb: callbackFunction<lastTournamentWinners>) => void,

    'tournament:public:get': (data: { id: number }, cb: callbackFunction<publicTournament>) => void,
    'tournament:public:get-current': (cb: callbackFunction<publicTournament>) => void,
    'tournament:public:registerTeam': (data: { players: string[], name: string, tournamentID: number }) => void,
    'tournament:public:joinTeam': (data: { teamName: string, tournamentID: number }) => void,
    'tournament:public:activateUser': (data: { tournamentID: number }) => void,
    'tournament:public:leaveTournament': (data: { tournamentID: number }) => void,

    'tournament:private:get': (data: { id: number }, cb: callbackFunction<privateTournament>) => void,
    'tournament:private:create': (
        data: { title: string, nTeams: number, playersPerTeam: 2 | 3, teamsPerMatch: 2 | 3, tournamentType: 'KO' },
        cb: callbackFunction<privateTournament>
    ) => void,
    'tournament:private:planAddPlayer': (data: { tournamentID: number, usernameToAdd: string, teamTitle: string }, cb: callbackFunction<privateTournament>) => void,
    'tournament:private:planRemovePlayer': (data: { tournamentID: number, usernameToRemove: string }, cb: callbackFunction<privateTournament>) => void,
    'tournament:private:acceptParticipation': (data: { tournamentID: number }, cb: callbackFunction<privateTournament>) => void,
    'tournament:private:declineParticipation': (data: { tournamentID: number }, cb: callbackFunction<privateTournament>) => void,
    'tournament:private:start': (data: { tournamentID: number }, cb: callbackFunction<privateTournament>) => void,
    'tournament:private:abort': (data: { tournamentID: number }, cb: callbackFunction<privateTournament>) => void, // Test TBD
    'tournament:private:startGame': (data: { tournamentID: number, tournamentRound: number, roundGame: number }, cb: callbackFunction<privateTournament>) => void,

    // waiting
    'waiting:getGames': () => void,
    'waiting:joinGame': (gameID: number) => void,
    'waiting:createGame': (data: createGameType) => void,
    'waiting:movePlayer': (data: movePlayerType) => void,
    'waiting:removePlayer': (username: string) => void,
    'waiting:readyPlayer': (data: { gameID: number }) => void,
    'waiting:switchColor': (data: switchColorType) => void,
    'waiting:createRematch': (data: { gameID: number }, cb: cb<null, any>) => void,

    // friends
    'friends:request': (username: string, cb: callbackFunction<boolean>) => void,
    'friends:confirm': (username: string, cb: callbackFunction<boolean>) => void,
    'friends:cancel': (username: string, cb: callbackFunction<boolean>) => void,
    'friends:ofUser': (username: string, cb: callbackFunction<friend[]>) => void,
}

export interface ServerToClientEvents {
    //authentication
    'logged_out': () => void,

    //tutorial
    'tutorial:loadProgress': (progress: boolean[][]) => void,

    //games
    'games:getGames': (data: getGamesType) => void,
    'games:getRunningGames': (games: getRunningGamesType[]) => void,

    //chat
    'chat:all': (data: { text: string, user: string }) => void,
    'chat:game': (data: { text: string, user: string }) => void,
    'chat:waiting': (data: { text: string, user: string }) => void,

    //chat & channel
    'chat:singleChat:update': (data: { chatid: number, messages: chatMessage[] }) => void,
    'chat:overview:update': (chats: chatElement[]) => void,
    'channel:update': (data: { channel: string, messages: chatMessage[] }) => void,

    //subscription
    'subscription:get': (sub: subscriptionExport) => void,
    'subscription:nSubscriptions': (nSubscriptions: number) => void,

    //tournament
    'tournament:private:update': (tournament: privateTournament) => void,
    'tournament:public:update': (tournament: publicTournament) => void,
    'tournament:winners:update': (winners: lastTournamentWinners) => void,
    'tournament:toast:signUp-failed': (data: { tournamentTitle: string }) => void,
    'tournament:toast:partner-left-tournament': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:invited-to-a-team': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:player-joined-team-complete': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:player-joined-team-incomplete': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:player-activated-team-complete': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:player-activated-team-incomplete': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:started': (data: { tournamentTitle: string }) => void,
    'tournament:toast:round-started': (data: { tournamentTitle: string, roundsToFinal: number }) => void,
    'tournament:toast:round-ended': (data: { tournamentTitle: string, roundsToFinal: number }) => void,
    'tournament:toast:ended': (data: { tournamentTitle: string, winner: tournamentTeam }) => void,
    'tournament:toast:you-left-tournament': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:you-activated-complete': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:you-activated-incomplete': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:you-joined-team-complete': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:you-created-a-team': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:you-joined-team-incomplete': (data: { registerTeam: registerTeam, tournamentTitle: string, player: string }) => void,
    'tournament:toast:signUpEnded-you-partizipate': (data: { tournamentTitle: string }) => void,
    'tournament:toast:signUpEnded-you-wont-partizipate': (data: { tournamentTitle: string }) => void,

    // waiting
    'waiting:getGames': (data: waitingGame[]) => void,
    'waiting:startGame': (data: startGameType) => void,

    //info
    'info:serverConnections': (data: { total: number, authenticated: number, game: number }) => void,

    // friends
    'friends:update': (friends: friend[]) => void,
    'friends:new-request': (data: { username: string }) => void,
    'friends:friend-confirmed': (data: { username: string }) => void,
    'friends:friend-withdrew': (data: { username: string }) => void,
    'friends:friend-declined': (data: { username: string }) => void,
    'friends:friend-cancelled': (data: { username: string }) => void,
}

interface socketData {
    userID: number,
}

export type GeneralSocketS = ServerSocket<ClientToServerEvents, ServerToClientEvents, any, socketData>
export type GeneralSocketC = ClientSocket<ServerToClientEvents, ClientToServerEvents>
export type GeneralNamespace = Namespace<ClientToServerEvents, ServerToClientEvents, any, socketData>
