import type { MoveTextOrBall } from '../../types/ball'
import type { AiData } from '../simulation/output'

// Export the Bot enum synchronously so other modules can reference it without
// pulling in the implementations. The concrete bot implementations are
// required lazily when `getBotMove` is called for the first time. This avoids
// creating an import-time cycle between bots -> Futuro -> simulation -> bots.
export enum Bot {
  Raindom = 0,
  Greedy = 1,
  Ruby = 2,
  Futuro = 3,
}

type BotEntry = { name: string; function: (data: AiData) => MoveTextOrBall }
let cachedBots: Promise<Record<Bot, BotEntry>> | null = null

async function buildBots(): Promise<Record<Bot, BotEntry>> {
  // Dynamic import to work with the test runner's ESM/TS transforms.
  const { Ruby } = await import('./Ruby')
  const { Greedy } = await import('./Greedy')
  const { Raindom } = await import('./Raindom')
  const { Futuro } = await import('./Futuro')

  return {
    0: { name: 'Raindom', function: new Raindom().choose },
    1: { name: 'Greedy', function: new Greedy().choose },
    2: { name: 'Ruby', function: new Ruby().choose },
    3: { name: 'Futuro', function: new Futuro().choose },
  }
}

function ensureBots(): Promise<Record<Bot, BotEntry>> {
  if (cachedBots == null) cachedBots = buildBots()
  return cachedBots
}

export async function getBotMove(botID: number, data: AiData): Promise<MoveTextOrBall> {
  const bots = await ensureBots()
  return (botID in bots ? bots[botID as Bot] : bots[Bot.Futuro]).function(data)
}

export function validBotIds(): number[] {
  // Use the enum to list IDs synchronously. Numeric enums create a reverse
  // mapping (number -> name), so filter values by number.
  return Object.values(Bot).filter((v) => typeof v === 'number') as number[]
}

export function validBotNames(): string[] {
  // Enum string values are the names of the members. Filter by string.
  return Object.values(Bot).filter((v) => typeof v === 'string') as string[]
}
