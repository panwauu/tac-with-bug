export interface RegisterTeam {
  name: string
  players: string[]
  playerids: number[]
  activated: boolean[]
}

export interface Team {
  name: string
  players: string[]
  playerids: number[]
}

export interface TournamentDataKO {
  brackets: Array<Array<KoBracket>>
}

export interface KoBracket {
  teams: Array<number>
  score: Array<number>
  gameID: number
  winner: number
}

export interface TournamentPrototype {
  id: number
  title: string
  tournamentType: 'KO'
  nTeams: number
  playersPerTeam: 2 | 3
  teamsPerMatch: 2 | 3
  teams: Team[]
  registerTeams: RegisterTeam[]
  data: TournamentDataKO
}

export interface PublicTournament extends TournamentPrototype {
  status: 'signUpWaiting' | 'signUp' | 'signUpFailed' | 'signUpEnded' | 'ended' | 'running'
  signupBegin: string
  signupDeadline: string
  creationDates: string[]
  creationPhase: number
  timePerGame: string
}

export interface PrivateTournament extends TournamentPrototype {
  status: 'planned' | 'running' | 'ended' | 'aborted'
  adminPlayerID: number
  adminPlayer: string
}

export interface TournamentParticipation {
  id: number
  title: string
  date: string
  team: Team
  placement?: number
  exitRound: number
  totalRounds: number
}

export interface TournamentTableElement {
  id: number
  type: 'public' | 'private'
  title: string
  status: PrivateTournament['status'] | PublicTournament['status']
  date: number
}

export interface TournamentTableData {
  total: number
  tournaments: TournamentTableElement[]
}

export interface TournamentWinner {
  teamName: string
  players: string[]
  placement: number
}
export type LastTournamentWinners = TournamentWinner[]
