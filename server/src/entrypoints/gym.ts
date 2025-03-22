// Server for python gym environment
// Exposes:
// - /new: create a new game
// - /apply-action: apply an action to the game

import express from 'express'
import { Game } from '../game/game'
import joi from 'joi'
import { CardType } from '../sharedTypes/typesCard'
import { MoveTextOrBall } from '../sharedTypes/typesBall'
import { AiData, getAiData } from '../bot/simulation/output'
import { projectMoveToGamePlayer } from '../bot/normalize/normalize'
import { getMovesFromCards } from '../bot/simulation/simulation'

const port = 3000
const app = express()
app.use(express.json())

export type AdditionalInformation = {
  hadOneOrThirteen: boolean[]
  tradedCards: (CardType | null)[]
  narrTradedCards: (CardType[] | null)[]
  previouslyUsedCards: CardType[]
}

export type GameWithAdditionalInformation = {
  additionalInformation: AdditionalInformation
  game: Game
  agentData: {
    data: AiData
    moves: MoveTextOrBall[]
  }[]
}

app.get('/new', (req, res) => {
  try {
    const schema = joi.object({
      nPlayers: joi.number().valid(4, 6).required(),
      nTeams: joi.number().valid(2, 3).required(),
      coop: joi.bool().required(),
      meister: joi.bool().required(),
    })

    const result = schema.validate(req.query)
    if (result.error != null) {
      res.status(400).json(result.error)
      return
    }

    // Export the current game state with the information visible to the agent
    const game = new Game(result.value.nPlayers, result.value.nTeams, result.value.meister, result.value.coop)
    const data: GameWithAdditionalInformation = {
      additionalInformation: {
        hadOneOrThirteen: game.cards.hadOneOrThirteen,
        tradedCards: new Array(result.value.nPlayers).fill(null),
        narrTradedCards: new Array(result.value.nPlayers).fill(null),
        previouslyUsedCards: [],
      },
      game: game,
      agentData: game.cards.players.map((_, i) => ({
        data: getAiData(game, i),
        moves: getMovesFromCards(getAiData(game, i).cardsWithMoves, i),
      })),
    }
    res.status(200).json(data)
  } catch (error) {
    res.status(500).send('Internal server error')
  }
})

// Endpoint to apply an action to a given game state
app.post('/apply-action', (req, res) => {
  try {
    const schema = joi.object({
      data: joi.any().required(),
      player: joi.number().required(), // The index of the player taking the action
      move: joi.any().required(), // The action to apply (can define a more specific schema)
    })

    const result = schema.validate(req.body)
    if (result.error) {
      res.status(400).json(result.error)
      return
    }

    // Reconstruct the game instance from the passed state.
    const gameobject = result.value.data.game
    const game = new Game(gameobject.nPlayers, gameobject.teams.length, gameobject.cards.meisterVersion, gameobject.coop, gameobject)
    const additionalInformation = result.value.data.additionalInformation
    const moveFromAgent = result.value.move as MoveTextOrBall
    const move = projectMoveToGamePlayer(game, moveFromAgent, result.value.player)

    // Optionally validate the move
    if (!game.checkMove(move)) {
      res.status(400).send('Invalid move')
      return
    }

    // Apply the action for the specified player
    if (move[2] === 'tauschen') {
      additionalInformation.tradedCards[move[0]] = game.cards.players[move[0]][move[1]]
    }
    if (move[2] === 'narr') {
      additionalInformation.narrTradedCards[move[0]] = game.cards.players[move[0]]
    }
    game.performAction(move, move[0])

    if (game.cards.players.every((p) => p.length === 0)) {
      additionalInformation.previouslyUsedCards = additionalInformation.previouslyUsedCards.concat(game.cards.discardPile)
      if (game.cards.deck.length >= 98) {
        additionalInformation.previouslyUsedCards = []
      }
      game.performAction('dealCards', 0)
      additionalInformation.tradedCards = game.cards.players.map(() => null)
      additionalInformation.narrTradedCards = game.cards.players.map(() => null)
      additionalInformation.hadOneOrThirteen = game.cards.players.map((p) => p.some((c) => c === '1' || c === '13'))
    }

    // Export the current game state with the information visible to the agent
    const data: GameWithAdditionalInformation = {
      additionalInformation: additionalInformation,
      game: game,
      agentData: game.cards.players.map((_, i) => ({
        data: getAiData(game, i),
        moves:
          game.cards.players[i].length !== 0 && game.narrFlag.some((f) => f) && !game.narrFlag[i]
            ? [...getMovesFromCards(getAiData(game, i).cardsWithMoves, getAiData(game, i).gamePlayer), [getAiData(game, i).gamePlayer, 0, 'narr']]
            : getMovesFromCards(getAiData(game, i).cardsWithMoves, getAiData(game, i).gamePlayer),
      })),
    }
    res.status(200).json(data)
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal server error')
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
