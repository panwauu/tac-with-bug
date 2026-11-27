// Size rules of a KO tournament with two teams per match. Shared by the server and the client (tournament creation form).

// The round names in the client go up to the round of 32 (Tournament.Brackets.bracketList4)
export const maxTeamsKO = 32
// With three teams one semifinal would be a bye and the match for the third place would have only one team
export const minTeamsKO = 4

export function isValidTeamCountKO(nTeams: number): boolean {
  return Number.isInteger(nTeams) && (nTeams === 2 || (nTeams >= minTeamsKO && nTeams <= maxTeamsKO))
}

export function numberOfRoundsKO(nTeams: number): number {
  return Math.max(1, Math.ceil(Math.log2(nTeams) - 1e-9))
}

// Teams that skip the first round, because the bracket is filled up to the next power of two
export function numberOfByesKO(nTeams: number): number {
  return Math.pow(2, numberOfRoundsKO(nTeams)) - nTeams
}

// The first-round matches in the order in which they get a bye. Consecutive entries are as far apart in the bracket as possible,
// so that the teams with a bye only meet each other when it cannot be avoided. Example for 8 matches: [0, 4, 2, 6, 1, 5, 3, 7]
export function byeMatchOrder(nMatches: number): number[] {
  if (nMatches <= 1) return [0]
  const half = byeMatchOrder(nMatches / 2)
  return [...half.map((i) => 2 * i), ...half.map((i) => 2 * i + 1)]
}

// Round i (0-based) is only played when more than 2^i teams take part
export function minTeamsForRoundKO(roundIndex: number): number {
  return Math.pow(2, roundIndex) + 1
}
