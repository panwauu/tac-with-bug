const names = ['KIara', 'Roberto', 'AIex', 'Elisabot', 'AIberto', 'Roberta', 'Kiki', 'AIexa', 'Kilian', 'Lisbot', 'Bottina', 'Turk']

export function getBotName(gameID: number, playerIndex: number) {
  return `${names[(gameID + playerIndex * (gameID % 2)) % names.length]}`
}
