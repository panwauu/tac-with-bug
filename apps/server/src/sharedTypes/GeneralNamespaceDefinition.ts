import type { Socket as ServerSocket, Namespace } from 'socket.io'
import type { Socket as ClientSocket } from 'socket.io-client'
import type { CreateGameType, MovePlayerType, SwitchColorType, WaitingGame, StartGameType, MoveBotType } from './typesWaiting'
import type { SubscriptionExport } from './typesSubscription'
import type { GameForOverview, GetRunningGamesType } from '@repo/core/types'
import type { RegisterTeam, PublicTournament, Team as TournamentTeam, PrivateTournament, TournamentTableData, LastTournamentWinners } from './typesTournament'
import type { Friend } from './typesFriends'
import type { ChatElement, ChatMessage, ChatMessagePage } from './chat'
import type { BlockedUser, ModerationStatus, ReportCategory, ReportedMessageRef, ReportedUser, UserModerationHistory } from './typesReports'

export type AckData<T> = { status: number; error?: any; data?: T }
export type CallbackFunction<T> = (data: AckData<T>) => void

export type Result<Data, _Error> = { ok: true; value: Data } | { ok: false; error: _Error }
export type Cb<Data, _Error> = (data: Result<Data, _Error>) => void

export interface ClientToServerEvents extends Record<string, any> {
  //authentication
  login: (data: { token: string }, cb: CallbackFunction<null>) => void
  logout: (cb: CallbackFunction<null>) => void

  //games
  'games:getTableData': (
    data: { first: number; limit: number; sortField?: string; sortOrder?: number; username?: string },
    cb: CallbackFunction<{ games: GameForOverview[]; nEntries: number }>
  ) => void
  // Ask for the running games of the own account; answered with 'games:runningGamesOfUser'
  'games:getRunningGamesOfUser': () => void
  // All running games on the server, for the waiting overview
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
  // `beforeMessageId` loads the page of messages older than this message instead of the newest page
  'chat:singleChat:load': (data: { chatid: number; beforeMessageId?: number }, cb: CallbackFunction<{ chatid: number } & ChatMessagePage>) => void
  'chat:overview:load': (cb: CallbackFunction<ChatElement[]>) => void
  'channel:sendMessage': (data: { channel: string; body: string }, cb: CallbackFunction<null>) => void
  // `beforeMessageId` loads the page of messages older than this message instead of the newest page
  // mayWrite is false for spectators in a game channel, for non-admins in the news channel and for unauthenticated users
  'channel:load': (data: { channel: string; beforeMessageId?: number }, cb: CallbackFunction<{ channel: string; mayWrite: boolean } & ChatMessagePage>) => void

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
  'waiting:addBot': (gameID: number, botID: number, playerIndex: number, cb: CallbackFunction<undefined>) => void
  'waiting:createGame': (data: CreateGameType, cb: CallbackFunction<undefined>) => void
  'waiting:movePlayer': (data: MovePlayerType, cb: CallbackFunction<undefined>) => void
  'waiting:moveBot': (data: MoveBotType, cb: CallbackFunction<undefined>) => void
  'waiting:removePlayer': (username: string, cb: CallbackFunction<undefined>) => void
  'waiting:removeBot': (gameID: number, playerIndex: number, cb: CallbackFunction<undefined>) => void
  'waiting:readyPlayer': (data: { gameID: number }, cb: CallbackFunction<undefined>) => void
  'waiting:switchColor': (data: SwitchColorType, cb: CallbackFunction<undefined>) => void
  'waiting:createRematch': (data: { gameID: number }, cb: Cb<null, any>) => void

  // friends
  'friends:request': (username: string, cb: CallbackFunction<boolean>) => void
  'friends:confirm': (username: string, cb: CallbackFunction<boolean>) => void
  'friends:cancel': (username: string, cb: CallbackFunction<boolean>) => void
  'friends:ofUser': (username: string, cb: CallbackFunction<Friend[]>) => void
  'friends:isFriendOnline': (username: string, cb: CallbackFunction<boolean>) => void

  // games against the AI in the browser: only the result, without account or name
  'ki:result': (data: { mode: 'klassisch' | 'drei' | 'koop'; level: string; won: boolean; cards: number | null }, cb: CallbackFunction<null>) => void
  // moderation
  'moderation:status': (cb: CallbackFunction<ModerationStatus>) => void
  'moderation:report': (data: { username: string; category: ReportCategory; body: string; message?: ReportedMessageRef }, cb: CallbackFunction<null>) => void
  'moderation:reports': (cb: CallbackFunction<ReportedUser[]>) => void
  'moderation:block': (data: { username: string; days: number; reason: string; resetProfile: boolean }, cb: CallbackFunction<null>) => void
  'moderation:unblock': (username: string, cb: CallbackFunction<null>) => void
  'moderation:dismiss': (username: string, cb: CallbackFunction<null>) => void
  'moderation:blocked': (cb: CallbackFunction<BlockedUser[]>) => void
  'moderation:history': (username: string, cb: CallbackFunction<UserModerationHistory>) => void
  'moderation:moderators': (cb: CallbackFunction<string[]>) => void
  'moderation:setModerator': (data: { username: string; moderator: boolean }, cb: CallbackFunction<string[]>) => void
}

export interface ServerToClientEvents {
  //authentication
  logged_out: () => void

  //games
  // The running games the user is seated in, with full detail. Pushed at login and at every game start, game end,
  // abort and completed substitution, and on request. It says nothing about finished games: counters and results of
  // the whole history are part of the profile (GET /gameApi/profile/getPlayerStats), never of this message.
  'games:runningGamesOfUser': (games: GameForOverview[]) => void
  // All running games on the server, for the waiting overview - everyone gets the same list
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
  // Sent to the players of a waiting game that was closed after `minutes` without any change
  'waiting:expired': (data: { minutes: number }) => void
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

  // moderation: only to moderators and admins
  'moderation:status': (data: ModerationStatus) => void
}

interface SocketData {
  userID: number
  blockedByModeration: boolean
}

export type GeneralSocketS = ServerSocket<ClientToServerEvents, ServerToClientEvents, any, SocketData>
export type GeneralSocketC = ClientSocket<ServerToClientEvents, ClientToServerEvents>
export type GeneralNamespace = Namespace<ClientToServerEvents, ServerToClientEvents, any, SocketData>
