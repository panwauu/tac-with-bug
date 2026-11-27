import { createTournamentDataKO } from './tournamentKO'
import { byeMatchOrder, numberOfByesKO, numberOfRoundsKO, minTeamsForRoundKO } from '../sharedDefinitions/tournamentKO'

describe('KO bracket with byes', () => {
  test('Number of rounds and byes', () => {
    expect([2, 4, 5, 8, 9, 16, 17, 32].map(numberOfRoundsKO)).toStrictEqual([1, 2, 3, 3, 4, 4, 5, 5])
    expect([2, 4, 5, 6, 7, 8, 12, 17].map(numberOfByesKO)).toStrictEqual([0, 0, 3, 2, 1, 0, 4, 15])
    expect([0, 1, 2, 3].map(minTeamsForRoundKO)).toStrictEqual([2, 3, 5, 9])
  })

  test('Bye order spreads the byes over the bracket', () => {
    expect(byeMatchOrder(1)).toStrictEqual([0])
    expect(byeMatchOrder(2)).toStrictEqual([0, 1])
    expect(byeMatchOrder(4)).toStrictEqual([0, 2, 1, 3])
    expect(byeMatchOrder(8)).toStrictEqual([0, 4, 2, 6, 1, 5, 3, 7])
    expect([...byeMatchOrder(16)].sort((a, b) => a - b)).toStrictEqual([...Array(16).keys()])
  })

  test('Invalid numbers of teams', () => {
    for (const n of [0, 1, 3, 33, 4.5]) {
      expect(createTournamentDataKO(n, 2).isErr()).toBe(true)
    }
  })

  test.each([2, 4, 5, 6, 7, 8, 9, 12, 15, 16, 17, 24, 31, 32])('Bracket for %i teams', (nTeams) => {
    const data = createTournamentDataKO(nTeams, 2)
    if (data.isErr()) throw new Error(data.error)
    const brackets = data.value.brackets
    const nRounds = numberOfRoundsKO(nTeams)
    const nByes = numberOfByesKO(nTeams)

    expect(brackets).toHaveLength(nRounds)
    expect(brackets[0]).toHaveLength(Math.pow(2, nRounds - 1))
    // Every team is drawn exactly once
    expect(brackets[0].flatMap((m) => m.teams).sort((a, b) => a - b)).toStrictEqual([...Array(nTeams).keys()])

    const byes = brackets[0].filter((m) => m.bye === true)
    expect(byes).toHaveLength(nByes)
    for (const [matchIndex, match] of brackets[0].entries()) {
      if (match.bye === true) {
        expect(match.teams).toHaveLength(1)
        expect(match.winner).toBe(match.teams[0])
        expect(match.gameID).toBe(-1)
        // The team with a bye is already in the second round
        expect(brackets[1][Math.floor(matchIndex / 2)].teams[matchIndex % 2]).toBe(match.teams[0])
      } else {
        expect(match.teams).toHaveLength(2)
        expect(match.winner).toBe(-1)
      }
    }

    // Two teams with a bye only meet in the second round, if there are more byes than matches in the second round
    if (nByes > 0) {
      const secondRoundWithTwoByes = brackets[1].filter((m) => m.teams.every((t) => t !== -1)).length
      expect(secondRoundWithTwoByes).toBe(Math.max(0, nByes - brackets[1].length))
    }
    // The match for the third place and all later rounds are still empty
    for (const round of brackets.slice(2)) {
      expect(round.every((m) => m.teams.every((t) => t === -1))).toBe(true)
    }
  })

  test('Teams with byes are drawn randomly', () => {
    const teamsWithBye = new Set<number>()
    for (let i = 0; i < 50; i++) {
      const data = createTournamentDataKO(5, 2)
      if (data.isErr()) throw new Error(data.error)
      for (const match of data.value.brackets[0].filter((m) => m.bye === true)) teamsWithBye.add(match.teams[0])
    }
    expect(teamsWithBye.size).toBe(5)
  })
})
