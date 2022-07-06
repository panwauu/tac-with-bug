export interface registerTeam {
  name: string
  players: string[]
  playerids: number[]
  activated: boolean[]
}

export interface team {
  name: string
  players: string[]
  playerids: number[]
}

export interface tournamentDataKO {
  brackets: Array<Array<koBracket>>
}

export interface koBracket {
  teams: Array<number>
  score: Array<number>
  gameID: number
  winner: number
}

export interface tournamentPrototype {
  id: number
  title: string
  tournamentType: 'KO'
  nTeams: number
  playersPerTeam: 2 | 3
  teamsPerMatch: 2 | 3
  teams: team[]
  registerTeams: registerTeam[]
  data: tournamentDataKO
}

export interface publicTournament extends tournamentPrototype {
  status: 'signUpWaiting' | 'signUp' | 'signUpFailed' | 'signUpEnded' | 'ended' | 'running'
  signupBegin: string
  signupDeadline: string
  creationDates: string[]
  creationPhase: number
  timePerGame: string
}

export interface privateTournament extends tournamentPrototype {
  status: 'planned' | 'running' | 'ended' | 'aborted'
  adminPlayerID: number
  adminPlayer: string
}

export interface tournamentParticipation {
  id: number
  title: string
  date: string
  team: team
  placement?: number
  exitRound: number
  totalRounds: number
}

export interface tournamentTableElement {
  id: number
  type: 'public' | 'private'
  title: string
  status: privateTournament['status'] | publicTournament['status']
  date: number
}

export interface tournamentTableData {
  total: number
  tournaments: tournamentTableElement[]
}

export interface tournamentWinner {
  teamName: string
  players: string[]
  placement: number
}
export type lastTournamentWinners = tournamentWinner[]
