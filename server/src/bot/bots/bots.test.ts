import { runSimulation } from '../simulation/simulation'
import { Bot } from './bots'

describe('Test bots', () => {
  test('Raindom should end a game', () => {
    runSimulation(1, [Bot.Raindom, Bot.Raindom, Bot.Raindom, Bot.Raindom])
  })
  test('Greedy should end a game', () => {
    runSimulation(1, [Bot.Greedy, Bot.Greedy, Bot.Greedy, Bot.Greedy])
  })
  test('Ruby should end a game', () => {
    runSimulation(1, [Bot.Ruby, Bot.Ruby, Bot.Ruby, Bot.Ruby])
  })
  test(
    'Futuro should end a game',
    () => {
      runSimulation(1, [Bot.Futuro, Bot.Futuro, Bot.Futuro, Bot.Futuro])
    },
    30 * 1000
  )
})
