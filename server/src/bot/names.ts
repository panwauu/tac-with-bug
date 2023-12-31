const names = [
  'Alan',
  'Alison',
  'Alberto',
  'Alexa',
  'Allen',
  'Alina',
  'Alec',
  'Alicia',
  'Allison',
  'Alden',
  'Alana',
  'Alvin',
  'Alexandra',
  'Alonzo',
  'Alexis',
  'Althea',
  'Alistair',
  'Alisa',
  'KIara',
  'Robert',
  'Roberta',
]

export function getBotName(gameID: number, playerIndex: number) {
  return names[(gameID + playerIndex) % names.length]
}
