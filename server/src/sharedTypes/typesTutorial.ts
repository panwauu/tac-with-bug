import type { ballsType } from './typesBall'
import type { gameForPlay } from './typesDBgame'
import { updateDataType } from './typesDBgame'

export interface TutorialStepOutput extends TutorialStepDefinition {
  updateData: updateDataType
}

export interface TutorialStepDefinition {
  game: gameForPlay
  config: Config
  goal?: Goal | null
}

interface Config {
  selectedCard?: number | null
}

interface Goal {
  modalState?: string | null
  selectedCard?: number | string
  balls?: ballsType[] | null
  aussetzenFlag?: boolean | null
  quiz?: Quiz | null
  closeButton?: boolean | null
}

interface Quiz {
  nSolutions: number
  order?: number[]
}
