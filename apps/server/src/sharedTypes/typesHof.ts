export interface HofData {
  verlag: string[]
  spende: string[]
  translation: string[]
  family: string[]
}

export type HofReason = 'family' | 'spende' | 'verlag' | 'translation'
