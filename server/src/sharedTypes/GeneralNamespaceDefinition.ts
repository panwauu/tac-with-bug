import type { Socket as ServerSocket, Namespace } from 'socket.io'
import type { Socket as ClientSocket } from 'socket.io-client'
import type { CreateGameType, MovePlayerType, SwitchColorType, WaitingGame, StartGameType } from './typesWaiting'
import type { SubscriptionExport } from './typesSubscription'
import type { GameForOverview, GetGamesType, GetRunningGamesType, UpdateDataType, GameForPlay } from './typesDBgame'
import type { RegisterTeam, PublicTournament, Team as TournamentTeam, PrivateTournament, TournamentTableData, LastTournamentWinners } from './typesTournament'
import type { MoveTextOrBall } from './typesBall'
import type { Friend } from './typesFriends'
import type { TutorialStepOutput } from './typesTutorial'
import { ChatElement, ChatMessage } from './chat'

export type AckData<T> = { status: number; error?: any; data?: T }
export type CallbackFunction<T> = (data: AckData<T>) => void

export type Result<Data, _Error> = { ok: true; value: Data } | { ok: false; error: _Error }
export type Cb<Data, _Error> = (data: Result<Data, _Error>) => void

export interface ClientToServerEvents extends Record<string, any> {
  //authentication
  login: (data: { token: string }, cb: CallbackFunction<null>) => void
  logout: (cb: CallbackFunction<null>) => void

  //tutorial
  'tutorial:loadProgress': (cb: CallbackFunction<{ progress: boolean[][] }>) => void
  'tutorial:resetTutorial': (data: { tutorialID: number }, cb: CallbackFunction<{ progress: boolean[][] }>) => void
  'tutorial:changeTutorialStep': (data: { tutorialID: number; tutorialStep: number; done: boolean }, cb: CallbackFunction<{ progress: boolean[][] }>) => void
  'tutorial:load': (data: { tutorialID: number; tutorialStep: number }, cb: CallbackFunction<TutorialStepOutput>) => void
  'tutorial:postMove': (data: { game: GameForPlay; move: MoveTextOrBall }, cb: CallbackFunction<{ game: GameForPlay; updateData: UpdateDataType }>) => void

  //games
  'games:getTableData': (
    data: { first: number; limit: number; sortField?: string; sortOrder?: number; username?: string },
    cb: CallbackFunction<{ games: GameForOverview[]; nEntries: number }>
  ) => void
  'games:getGames': () => void
  'games:getRunningGames': (cb: CallbackFunction<GetRunningGamesType[]>) => void

  //chat
  'chat:all': (data: { text: string }) => void
  'chat:game': (data: { text: string; gameID: number }) => void
  'chat:waiting': (data: { text: string }) => void

  //chat & channel
  'chat:startChat': (data: { userids: number[]; title: string | null }, cb: CallbackFunction<{ overview: ChatElement[]; chatid: number }>) => void
  'chat:addUser': (data: { userid: number; chatid: number }, cb: CallbackFunction<null>) => void
  'chat:changeTitle': (data: { chatid: number; title: string }, cb: CallbackFunction<null>) => void
  'chat:leaveChat': (data: { chatid: number }, cb: CallbackFunction<null>) => void
  'chat:markAsRead': (data: { chatid: number }, cb: CallbackFunction<null>) => void
  'chat:sendMessage': (data: { chatid: number; body: string }, cb: CallbackFunction<null>) => void
  'chat:singleChat:load': (data: { chatid: number }, cb: CallbackFunction<{ chatid: number; messages: ChatMessage[] }>) => void
  'chat:overview:load': (cb: CallbackFunction<ChatElement[]>) => void
  'channel:sendMessage': (data: { channel: string; body: string }, cb: CallbackFunction<null>) => void
  'channel:load': (data: { channel: string }, cb: CallbackFunction<{ channel: string; messages: ChatMessage[] }>) => void

  //subscription
  'subscription:get': () => void
  'subscription:new': (subscriptionID: string, cb: CallbackFunction<null>) => void
  'subscription:cancel': (cb: CallbackFunction<null>) => void
  'subscription:nSubscriptions': () => void

  //tournament
  'tournament:loadTable': (data: { filter: 'private' | 'public' | null; first: number; limit: number }, cb: CallbackFunction<TournamentTableData>) => void
  'tournament:winners:get': (cb: CallbackFunction<LastTournamentWinners>) => void

  'tournament:public:get': (data: { id: number }, cb: CallbackFunction<PublicTournament>) => void
  'tournament:public:get-current': (cb: CallbackFunction<PublicTournament>) => void
  'tournament:public:registerTeam': (data: { players: string[]; name: string; tournamentID: number }, cb: CallbackFunction<null>) => void
  'tournament:public:joinTeam': (data: { teamName: string; tournamentID: number }, cb: CallbackFunction<null>) => void
  'tournament:public:activateUser': (data: { tournamentID: number }, cb: CallbackFunction<null>) => void
  'tournament:public:leaveTournament': (data: { tournamentID: number }, cb: CallbackFunction<null>) => void

  'tournament:private:get': (data: { id: number }, cb: CallbackFunction<PrivateTournament>) => void
  'tournament:private:create': (
    data: { title: string; nTeams: number; playersPerTeam: 2 | 3; teamsPerMatch: 2 | 3; tournamentType: 'KO' },
    cb: CallbackFunction<PrivateTournament>
  ) => void
  'tournament:private:planAddPlayer': (data: { tournamentID: number; usernameToAdd: string; teamTitle: string }, cb: CallbackFunction<PrivateTournament>) => void
  'tournament:private:planRemovePlayer': (data: { tournamentID: number; usernameToRemove: string }, cb: CallbackFunction<PrivateTournament>) => void
  'tournament:private:acceptParticipation': (data: { tournamentID: number }, cb: CallbackFunction<PrivateTournament>) => void
  'tournament:private:declineParticipation': (data: { tournamentID: number }, cb: CallbackFunction<PrivateTournament>) => void
  'tournament:private:start': (data: { tournamentID: number }, cb: CallbackFunction<PrivateTournament>) => void
  'tournament:private:abort': (data: { tournamentID: number }, cb: CallbackFunction<PrivateTournament>) => void // Test TBD
  'tournament:private:startGame': (data: { tournamentID: number; tournamentRound: number; roundGame: number }, cb: CallbackFunction<PrivateTournament>) => void

  // waiting
  'waiting:getGames': () => void
  'waiting:joinGame': (gameID: number, cb: CallbackFunction<undefined>) => void
  'waiting:createGame': (data: CreateGameType, cb: CallbackFunction<undefined>) => void
  'waiting:movePlayer': (data: MovePlayerType, cb: CallbackFunction<undefined>) => void
  'waiting:removePlayer': (username: string, cb: CallbackFunction<undefined>) => void
  'waiting:readyPlayer': (data: { gameID: number }, cb: CallbackFunction<undefined>) => void
  'waiting:switchColor': (data: SwitchColorType, cb: CallbackFunction<undefined>) => void
  'waiting:createRematch': (data: { gameID: number }, cb: Cb<null, any>) => void

  // friends
  'friends:request': (username: string, cb: CallbackFunction<boolean>) => void
  'friends:confirm': (username: string, cb: CallbackFunction<boolean>) => void
  'friends:cancel': (username: string, cb: CallbackFunction<boolean>) => void
  'friends:ofUser': (username: string, cb: CallbackFunction<Friend[]>) => void
}

export interface ServerToClientEvents {
  //authentication
  logged_out: () => void

  //tutorial
  'tutorial:loadProgress': (progress: boolean[][]) => void

  //games
  'games:getGames': (data: GetGamesType) => void
  'games:getRunningGames': (games: GetRunningGamesType[]) => void

  //chat
  'chat:all': (data: { text: string; user: string }) => void
  'chat:game': (data: { text: string; user: string }) => void
  'chat:waiting': (data: { text: string; user: string }) => void

  //chat & channel
  'chat:singleChat:update': (data: { chatid: number; messages: ChatMessage[] }) => void
  'chat:overview:update': (chats: ChatElement[]) => void
  'channel:update': (data: { channel: string; messages: ChatMessage[] }) => void

  //subscription
  'subscription:get': (sub: SubscriptionExport) => void
  'subscription:nSubscriptions': (nSubscriptions: number) => void

  //tournament
  'tournament:private:update': (tournament: PrivateTournament) => void
  'tournament:public:update': (tournament: PublicTournament) => void
  'tournament:winners:update': (winners: LastTournamentWinners) => void
  'tournament:toast:signUp-failed': (data: { tournamentTitle: string }) => void
  'tournament:toast:partner-left-tournament': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:invited-to-a-team': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:player-joined-team-complete': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:player-joined-team-incomplete': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:player-activated-team-complete': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:player-activated-team-incomplete': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:started': (data: { tournamentTitle: string }) => void
  'tournament:toast:round-started': (data: { tournamentTitle: string; roundsToFinal: number }) => void
  'tournament:toast:round-ended': (data: { tournamentTitle: string; roundsToFinal: number }) => void
  'tournament:toast:ended': (data: { tournamentTitle: string; winner: TournamentTeam }) => void
  'tournament:toast:you-left-tournament': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:you-activated-complete': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:you-activated-incomplete': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:you-joined-team-complete': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:you-created-a-team': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:you-joined-team-incomplete': (data: { registerTeam: RegisterTeam; tournamentTitle: string; player: string }) => void
  'tournament:toast:signUpEnded-you-partizipate': (data: { tournamentTitle: string }) => void
  'tournament:toast:signUpEnded-you-wont-partizipate': (data: { tournamentTitle: string }) => void

  // waiting
  'waiting:getGames': (data: WaitingGame[]) => void
  'waiting:startGame': (data: StartGameType) => void

  //info
  'info:serverConnections': (data: { total: number; authenticated: number; game: number }) => void

  // friends
  'friends:update': (friends: Friend[]) => void
  'friends:new-request': (data: { username: string }) => void
  'friends:friend-confirmed': (data: { username: string }) => void
  'friends:friend-withdrew': (data: { username: string }) => void
  'friends:friend-declined': (data: { username: string }) => void
  'friends:friend-cancelled': (data: { username: string }) => void
}

interface SocketData {
  userID: number
}

export type GeneralSocketS = ServerSocket<ClientToServerEvents, ServerToClientEvents, any, SocketData>
export type GeneralSocketC = ClientSocket<ServerToClientEvents, ClientToServerEvents>
export type GeneralNamespace = Namespace<ClientToServerEvents, ServerToClientEvents, any, SocketData>
