import { reorderArray } from '../bot/normalize/helpers'

/** Converts from order used in waitinggames (teams) to order used in games
 * @param {string} nTeams - for nPlayers === 4: nTeams can be 1 or 2 for coop and 2 for normal mode
 * @param {string} nTeams - for nPlayers === 6: nTeams can be 1 or 3 for coop and 2 or 3 for normal mode
 */
export function switchFromTeamsOrderToGameOrder<T>(array: T[], nPlayers: number, nTeams: number) {
  const order = nPlayers === 4 ? [0, 2, 1, 3] : nTeams === 2 ? [0, 3, 1, 4, 2, 5] : [0, 2, 4, 1, 3, 5]
  return reorderArray(array, order)
}

/** Converts from order used in games to order used in waitinggames (teams)
 * @param {string} nTeams - for nPlayers === 4: nTeams can be 1 or 2 for coop and 2 for normal mode
 * @param {string} nTeams - for nPlayers === 6: nTeams can be 1 or 3 for coop and 2 or 3 for normal mode
 */
export function switchFromGameOrderToTeamsOrder<T>(array: T[], nPlayers: number, nTeams: number) {
  const order = nPlayers === 4 ? [0, 2, 1, 3] : nTeams === 2 ? [0, 2, 4, 1, 3, 5] : [0, 3, 1, 4, 2, 5]
  return reorderArray(array, order)
}

/** Converts between game order and converts to arrays per team
 * @param {string} nTeams - for nPlayers === 4: nTeams can be 1 or 2 for coop and 2 for normal mode
 * @param {string} nTeams - for nPlayers === 6: nTeams can be 1 or 3 for coop and 2 or 3 for normal mode
 */
export function convertGameOrderToArrayPerTeam<T>(array: T[], nPlayers: number, nTeams: number): T[][] {
  const orderedArray = switchFromGameOrderToTeamsOrder(array, nPlayers, nTeams)
  const correctedNTeams = nTeams === 1 ? nPlayers === 4 ? 2 : 3 : nTeams

  const orderedByTeams: T[][] = []
  for (let team = 0; team < correctedNTeams; team++) {
    const arr: T[] = []
    for (let iterator = 0; iterator < orderedArray.length / correctedNTeams; iterator++) {
      const bot = orderedArray[(team * orderedArray.length) / correctedNTeams + iterator]
      arr.push(bot)
    }
    orderedByTeams.push(arr)
  }

  return orderedByTeams
}
