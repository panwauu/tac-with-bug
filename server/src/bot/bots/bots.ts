import { MoveTextOrBall } from '../../sharedTypes/typesBall'
import { AiData } from '../simulation/output'
import { Futuro } from './Futuro'
import { Ruby } from './Ruby'
import { Greedy } from './Greedy'
import { Raindom } from './Raindom'

// TODO: Include in game
export const bots: Record<number, { name: string; function: (data: AiData) => MoveTextOrBall }> = {
  0: { name: 'Raindom', function: new Raindom().choose },
  1: { name: 'Greedy', function: new Greedy().choose },
  2: { name: 'Ruby', function: new Ruby().choose },
  3: { name: 'Futuro', function: new Futuro().choose },
}

export const validBotIds = Object.keys(bots).map((id) => parseInt(id))
export const validBotNames = Object.values(bots).map((bot) => bot.name)
