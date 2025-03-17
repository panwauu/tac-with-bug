import { runSimulation } from '../simulation/simulation'
import { Bot } from './bots'

describe('Test bots', () => {
  test('Raindom should end a game', () => {
    runSimulation(1, [Bot.Raindom, Bot.Raindom, Bot.Raindom, Bot.Raindom])
  })
  test('Greedy should end a game', () => {
    runSimulation(1, [Bot.Greedy, Bot.Raindom, Bot.Greedy, Bot.Raindom])
  })
  test('Ruby should end a game', () => {
    runSimulation(1, [Bot.Ruby, Bot.Raindom, Bot.Ruby, Bot.Raindom])
  })
  test('Futuro should end a game', () => {
    runSimulation(1, [Bot.Futuro, Bot.Raindom, Bot.Futuro, Bot.Raindom])
  })
})
