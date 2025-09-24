import { cloneDeep } from 'lodash'
import fs from 'node:fs'
import { Game } from '@repo/core/game/game'

//From File
export function testCapturedMoves(testFileName: string, nPlayers?: number, nTeams?: number, meisterVersion?: boolean, coop?: boolean) {
  // read contents of the file
  const data = String(fs.readFileSync(`./src/game/capturedGames/${testFileName}.txt`))

  // split the contents by new line
  const lines = data.split(/\r?\n/).map((line) => JSON.parse(line))

  return repeatGame(lines, nPlayers, nTeams, meisterVersion, coop)
}

export function repeatGame(lines: any[], nPlayersParam?: number, nTeamsParam?: number, meisterVersionParam?: boolean, coopParam?: boolean) {
  const result = {
    equal: false,
    ended: null as boolean | null,
    game: null as Game | null,
    line: null as number | null,
  }

  const lineInit = lines[0]
  const nPlayers = nPlayersParam ?? (lineInit.action[1] as number)
  const nTeams = nTeamsParam ?? (lineInit.action[2] as number)
  const meisterVersion = meisterVersionParam ?? (lineInit.action[3] as boolean)
  const coop = coopParam ?? (lineInit.action[4] as boolean)

  const gameInst = new Game(nPlayers, nTeams, meisterVersion, coop)
  gameInst.activePlayer = lineInit.activePlayer
  gameInst.cards = cloneDeep(lineInit.cards)
  gameInst.cards.hadOneOrThirteen = gameInst.cards.players.map((cards) => cards.some((c) => c === '1' || c === '13'))
  gameInst.cards.previouslyPlayedCards = []
  if (!compareGameWithCaptured(gameInst, lineInit)) {
    console.log('Sanity-Check: failed')
    return result
  }
  let priorDeckSize = gameInst.cards.deck.length

  // print all lines
  for (let i = 1; i < lines.length; i++) {
    //console.log("Line: " + (i + 1))
    const lineJSON = lines[i]
    if (lineJSON.action !== 'reset') {
      try {
        let timeDummy = Math.random() * 2
        if (i === 1) {
          timeDummy = Infinity
        }
        if (!gameInst.checkMove(lineJSON.action)) {
          result.game = gameInst
          result.line = i
          return result
        }
        gameInst.performAction(lineJSON.action, timeDummy)
      } catch (err) {
        console.log(`Error at Line: ${i + 1}`)
        console.log(err)
        result.line = i
        return result
      }
    } else {
      gameInst.resetGame()
      gameInst.cards.players = cloneDeep(lineJSON.cards.players)
      gameInst.cards.deck = cloneDeep(lineJSON.cards.deck)
      gameInst.cards.dealingPlayer = cloneDeep(lineJSON.cards.dealingPlayer)
      gameInst.activePlayer = cloneDeep(lineJSON.activePlayer)
    }

    // Change the newly dealt cards if necessary
    if (lineJSON.action === 'dealCards' && priorDeckSize < lineJSON.cards.deck.length) {
      gameInst.cards.players = cloneDeep(lineJSON.cards.players)
      gameInst.cards.deck = cloneDeep(lineJSON.cards.deck)
      priorDeckSize = gameInst.cards.deck.length
    } else {
      priorDeckSize = gameInst.cards.deck.length
    }

    if (compareGameWithCaptured(gameInst, lineJSON) === false) {
      console.log(`Unequal at line: ${i + 1}`)
      result.line = i
      return result
    }

    if (gameInst.gameEnded === true && i + 1 !== lines.length) {
      console.log(`Ended too early at line: ${i + 1}`)
      result.line = i
      return result
    }
  }

  result.equal = true
  result.ended = gameInst.gameEnded
  result.game = gameInst
  return result
}

function compareGameWithCaptured(gameInst: Game, capturedState: any) {
  if (compareBalls(gameInst.balls, capturedState.balls) === false) {
    console.log('balls unequal')
    const tableData: any[] = cloneDeep(gameInst.balls)
    Object.keys(tableData[0]).forEach((k) => tableData.forEach((b, i) => (b[`${k}-des`] = capturedState.balls[i][k])))
    console.table(tableData)
    return false
  }
  if (compareCards(gameInst.cards, capturedState.cards) === false) {
    console.log('cards unequal')
    const dataForTable: any = { status: ['cards', 'cards_des'] }
    Object.keys(gameInst.cards).forEach((k) => {
      if (typeof (gameInst.cards as any)[k] === 'object') {
        dataForTable[k] = [JSON.stringify((gameInst.cards as any)[k]), JSON.stringify(capturedState.cards[k])]
      } else {
        dataForTable[k] = [(gameInst.cards as any)[k], capturedState.cards[k]]
      }
    })
    console.table(dataForTable)
    return false
  }
  if (gameInst.activePlayer !== capturedState.activePlayer) {
    console.log(`activePlayer unequal: Is ${gameInst.activePlayer} but should be ${capturedState.activePlayer}`)
    return false
  }
  return true
}

function compareBalls(balls1: any, balls2: any) {
  if (balls1.length !== balls2.length) {
    throw new Error(`Balls of different length - sim: ${balls1.length}; cap: ${balls2.length}`)
  }

  for (let i = 0; i < balls1.length; i++) {
    if (balls1[i].state !== balls2[i].state && !(balls1[i].state === 'goal' && (balls2[i].state === 'goalForward' || balls2[i].state === 'goalBackward'))) {
      console.table({ Ball: i, StateSimulated: balls1[i].state, StateCapture: balls2[i].state })
      return false
    }

    if (balls1[i].position !== balls2[i].position) {
      return false
    }
  }
  return true
}

function compareCards(simCards: any, capCards: any) {
  for (const key of Object.keys(capCards)) {
    if (JSON.stringify(capCards[key]) !== JSON.stringify(simCards[key])) {
      console.log(`Cards unequal at Key: ${key}`)
      return false
    }
  }
  return true
}
