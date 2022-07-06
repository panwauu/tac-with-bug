import type { BallsType } from './typesBall'
import type { GameForPlay } from './typesDBgame'
import { UpdateDataType } from './typesDBgame'

export interface TutorialStepOutput extends TutorialStepDefinition {
  updateData: UpdateDataType
}

export interface TutorialStepDefinition {
  game: GameForPlay
  config: Config
  goal?: Goal | null
}

interface Config {
  selectedCard?: number | null
}

interface Goal {
  modalState?: string | null
  selectedCard?: number | string
  balls?: BallsType[] | null
  aussetzenFlag?: boolean | null
  quiz?: Quiz | null
  closeButton?: boolean | null
}

interface Quiz {
  nSolutions: number
  order?: number[]
}
