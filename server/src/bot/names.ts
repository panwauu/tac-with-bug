const names = ['KIara', 'Roberto', 'AIex', 'AIexa', 'AIberto', 'Roberta', 'Kiki', 'Kilian', 'Lisbot']

export function getBotName(gameID: number, playerIndex: number) {
  return names[(gameID + playerIndex) % names.length]
}
