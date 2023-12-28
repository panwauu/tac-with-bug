import { runSimulation } from '../simulation/simulation'
import { Futuro } from './Futuro'
import { Greedy } from './Greedy'
import { Raindom } from './Raindom'
import { Ruby } from './Ruby'

describe('Test bots', () => {
  test('Raindom should end a game', () => {
    runSimulation(1, [new Raindom(), new Raindom(), new Raindom(), new Raindom()])
  })
  test('Greedy should end a game', () => {
    runSimulation(1, [new Greedy(), new Greedy(), new Greedy(), new Greedy()])
  })
  test('Ruby should end a game', () => {
    runSimulation(1, [new Ruby(), new Ruby(), new Ruby(), new Ruby()])
  })
  test('Futuro should end a game', () => {
    runSimulation(1, [new Futuro(), new Futuro(), new Futuro(), new Futuro()])
  })
})
