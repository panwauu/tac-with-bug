import type { MoveTextOrBall } from '../../types/typesBall'
import type { AiData } from '../simulation/output'
import { Ruby } from './Ruby'
import { Greedy } from './Greedy'
import { Raindom } from './Raindom'
import { Futuro } from './Futuro'

export enum Bot {
  Raindom = 0,
  Greedy = 1,
  Ruby = 2,
  Futuro = 3,
}

const bots: Record<Bot, { name: string; function: (data: AiData) => MoveTextOrBall }> = {
  0: { name: 'Raindom', function: new Raindom().choose },
  1: { name: 'Greedy', function: new Greedy().choose },
  2: { name: 'Ruby', function: new Ruby().choose },
  3: { name: 'Futuro', function: new Futuro().choose },
}

export const validBotIds = Object.keys(bots).map((id) => parseInt(id))
export const validBotNames = Object.values(bots).map((bot) => bot.name)

export function getBotMove(botID: number, data: AiData): MoveTextOrBall {
  return (botID in bots ? bots[botID as Bot] : bots[Bot.Futuro]).function(data)
}
