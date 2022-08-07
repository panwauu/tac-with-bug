import type pg from 'pg'
import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'
import * as tTournament from '../sharedTypes/typesTournament'
import Joi from 'joi'

import logger from '../helpers/logger'
import { getUser } from '../services/user'
import {
  getPrivateTournament,
  abortPrivateTournament,
  activatePlayer,
  addPlayer,
  createPrivateTournament,
  removePlayer,
  startPrivateTournament,
  startTournamentGame,
} from '../services/tournamentsPrivate'
import { nspGeneral } from './general'
import { sendPrivateTournamentInvitation } from '../communicationUtils/email'

export function registerTournamentPrivateHandler(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('tournament:private:get', async (data, cb) => {
    const schema = Joi.number().required().integer().positive()
    const { error } = schema.validate(data.id)
    if (error != null) return cb({ status: 500, error })

    try {
      const tournaments = await getPrivateTournament(pgPool, { id: data.id })
      if (tournaments.length !== 1) return cb({ status: 500, error: 'TOURNAMENT_ID_NOT_FOUND' })

      return cb({ status: 200, data: tournaments[0] })
    } catch (err) {
      logger.error('Error in tournament:private:get', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('tournament:private:create', async (data, cb) => {
    if (socket.data.userID === undefined) return cb({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      title: Joi.string().required().min(8),
      nTeams: Joi.number().integer().required().positive(),
      playersPerTeam: Joi.required().valid(2, 3),
      teamsPerMatch: Joi.required().valid(2, 3),
      tournamentType: Joi.required().valid('KO'),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 500, error })

    try {
      const tournament = await createPrivateTournament(pgPool, data.title, socket.data.userID, data.nTeams, data.playersPerTeam, data.teamsPerMatch, data.tournamentType)
      if (tournament.isErr()) return cb({ status: 500, error: tournament.error })

      pushChangedPrivateTournament(tournament.value)
      return cb({ status: 200, data: tournament.value })
    } catch (err) {
      logger.error('Error in tournament:private:create', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('tournament:private:planAddPlayer', async (data, cb) => {
    if (socket.data.userID === undefined) return cb({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      tournamentID: Joi.number().integer().required().positive(),
      usernameToAdd: Joi.string().required(),
      teamTitle: Joi.string().required().min(5).max(25),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 500, error })

    try {
      const user = await getUser(pgPool, { id: socket.data.userID })
      if (user.isErr()) return cb({ status: 500, error: user.error })

      const tournaments = await getPrivateTournament(pgPool, { id: data.tournamentID })
      if (tournaments.length !== 1) return cb({ status: 500, error: 'TOURNAMENT_NOT_FOUND' })

      const tournament = tournaments[0]

      if (tournament.adminPlayerID !== socket.data.userID) return cb({ status: 500, error: 'ONLY_ADMIN_PLAYER_OF_TOURNAMENT' })

      const newTournament = await addPlayer(pgPool, tournament, data.usernameToAdd, data.teamTitle, user.value.username === data.usernameToAdd)
      if (newTournament.isErr()) return cb({ status: 500, error: newTournament.error })

      const invitedUser = await getUser(pgPool, { username: data.usernameToAdd })
      if (invitedUser.isErr()) return cb({ status: 500, error: invitedUser.error })

      sendPrivateTournamentInvitation({
        user: invitedUser.value,
        tournamentTitle: newTournament.value.title,
        invitingPlayer: newTournament.value.adminPlayer,
        teamName: data.teamTitle,
      })

      pushChangedPrivateTournament(newTournament.value)
      return cb({ status: 200, data: newTournament.value })
    } catch (err) {
      logger.error('Error in tournament:private:planAddPlayer', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('tournament:private:planRemovePlayer', async (data, cb) => {
    if (socket.data.userID === undefined) return cb({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      tournamentID: Joi.number().integer().required().positive(),
      usernameToRemove: Joi.string().required(),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 500, error })

    try {
      const user = await getUser(pgPool, { id: socket.data.userID })
      if (user.isErr()) return cb({ status: 500, error: user.error })

      const tournaments = await getPrivateTournament(pgPool, { id: data.tournamentID })
      if (tournaments.length !== 1) return cb({ status: 500, error: 'TOURNAMENT_NOT_FOUND' })

      const tournament = tournaments[0]
      if (tournament.adminPlayerID !== socket.data.userID) return cb({ status: 500, error: 'ONLY_ADMIN_PLAYER_OF_TOURNAMENT' })

      const userToRemove = await getUser(pgPool, { username: data.usernameToRemove })
      if (userToRemove.isErr()) return cb({ status: 500, error: userToRemove.error })

      const newTournament = await removePlayer(pgPool, tournament, userToRemove.value.id)
      if (newTournament.isErr()) return cb({ status: 500, error: newTournament.error })

      pushChangedPrivateTournament(newTournament.value)
      return cb({ status: 200, data: newTournament.value })
    } catch (err) {
      logger.error('Error in tournament:private:planRemovePlayer', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('tournament:private:acceptParticipation', async (data, cb) => {
    if (socket.data.userID === undefined) return cb({ status: 500, error: 'UNAUTH' })

    const schema = Joi.number().required().integer().positive()
    const { error } = schema.validate(data.tournamentID)
    if (error != null) return cb({ status: 500, error })

    try {
      const user = await getUser(pgPool, { id: socket.data.userID })
      if (user.isErr()) return cb({ status: 500, error: user.error })

      const tournaments = await getPrivateTournament(pgPool, { id: data.tournamentID })
      if (tournaments.length !== 1) return cb({ status: 500, error: 'TOURNAMENT_NOT_FOUND' })

      const tournament = tournaments[0]
      const newTournament = await activatePlayer(pgPool, tournament, socket.data.userID)
      if (newTournament.isErr()) return cb({ status: 500, error: newTournament.error })

      pushChangedPrivateTournament(newTournament.value)
      return cb({ status: 200, data: newTournament.value })
    } catch (err) {
      logger.error('Error in tournament:private:acceptParticipation', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('tournament:private:declineParticipation', async (data, cb) => {
    if (socket.data.userID === undefined) return cb({ status: 500, error: 'UNAUTH' })

    const schema = Joi.number().required().integer().positive()
    const { error } = schema.validate(data.tournamentID)
    if (error != null) return cb({ status: 500, error })

    try {
      const user = await getUser(pgPool, { id: socket.data.userID })
      if (user.isErr()) return cb({ status: 500, error: user.error })

      const tournaments = await getPrivateTournament(pgPool, { id: data.tournamentID })
      if (tournaments.length !== 1) return cb({ status: 500, error: 'TOURNAMENT_NOT_FOUND' })

      const tournament = tournaments[0]
      const newTournament = await removePlayer(pgPool, tournament, socket.data.userID)
      if (newTournament.isErr()) return cb({ status: 500, error: newTournament.error })

      pushChangedPrivateTournament(newTournament.value)
      return cb({ status: 200, data: newTournament.value })
    } catch (err) {
      logger.error('Error in tournament:private:declineParticipation', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('tournament:private:start', async (data, cb) => {
    if (socket.data.userID === undefined) return cb({ status: 500, error: 'UNAUTH' })

    const schema = Joi.number().required().integer().positive()
    const { error } = schema.validate(data.tournamentID)
    if (error != null) return cb({ status: 500, error })

    try {
      const tournaments = await getPrivateTournament(pgPool, { id: data.tournamentID })
      if (tournaments.length !== 1) return cb({ status: 500, error: 'TOURNAMENT_NOT_FOUND' })
      const tournament = tournaments[0]

      if (tournament.adminPlayerID !== socket.data.userID) return cb({ status: 500, error: 'ONLY_ADMIN_PLAYER_OF_TOURNAMENT' })

      const newTournament = await startPrivateTournament(pgPool, tournament)
      if (newTournament.isErr()) return cb({ status: 500, error: newTournament.error })

      pushChangedPrivateTournament(newTournament.value)
      return cb({ status: 200, data: newTournament.value })
    } catch (err) {
      logger.error('Error in tournament:private:start', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('tournament:private:abort', async (data, cb) => {
    if (socket.data.userID === undefined) return cb({ status: 500, error: 'UNAUTH' })

    const schema = Joi.number().required().integer().positive()
    const { error } = schema.validate(data.tournamentID)
    if (error != null) return cb({ status: 500, error })

    try {
      const tournaments = await getPrivateTournament(pgPool, { id: data.tournamentID })
      if (tournaments.length !== 1) return cb({ status: 500, error: 'TOURNAMENT_NOT_FOUND' })

      const tournament = tournaments[0]

      if (tournament.adminPlayerID !== socket.data.userID) return cb({ status: 500, error: 'ONLY_ADMIN_PLAYER_OF_TOURNAMENT' })

      const newTournament = await abortPrivateTournament(pgPool, tournament)
      if (newTournament.isErr()) return cb({ status: 500, error: newTournament.error })

      pushChangedPrivateTournament(newTournament.value)
      return cb({ status: 200, data: newTournament.value })
    } catch (err) {
      logger.error('Error in tournament:private:abort', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('tournament:private:startGame', async (data, cb) => {
    if (socket.data.userID === undefined) return cb({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      tournamentID: Joi.number().integer().required().positive(),
      tournamentRound: Joi.number().integer().required().min(0),
      roundGame: Joi.number().integer().required().min(0),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 500, error })

    try {
      const user = await getUser(pgPool, { id: socket.data.userID })
      if (user.isErr()) return cb({ status: 500, error: user.error })

      const tournaments = await getPrivateTournament(pgPool, { id: data.tournamentID })
      if (tournaments.length !== 1) return cb({ status: 500, error: 'TOURNAMENT_NOT_FOUND' })

      const tournament = tournaments[0]

      const game = tournament.data.brackets?.[data.tournamentRound]?.[data.roundGame]
      if (game == null) return cb({ status: 500, error: 'PRIVATE_TOURNAMENT_GAME_NOT_FOUND' })
      if (game.gameID !== -1) return cb({ status: 500, error: 'PRIVATE_TOURNAMENT_GAME_ALREADY_RUNNING' })

      const gamePlayers = tournament.teams
        .filter((_, i) => game.teams.includes(i))
        .map((t) => t.playerids)
        .flat()

      if (!(gamePlayers.includes(socket.data.userID) || tournament.adminPlayerID === socket.data.userID)) {
        return cb({ status: 500, error: 'ONLY_ADMIN_PLAYER_OR_PLAYER_OF_GAME' })
      }

      const newTournament = await startTournamentGame(pgPool, tournament, data.tournamentRound, data.roundGame)
      if (newTournament.isErr()) return cb({ status: 500, error: newTournament.error })

      pushChangedPrivateTournament(newTournament.value)
      return cb({ status: 200, data: newTournament.value })
    } catch (err) {
      logger.error('Error in tournament:private:startGame', err)
      return cb({ status: 500, error: err })
    }
  })
}

export function pushChangedPrivateTournament(tournament: tTournament.PrivateTournament) {
  nspGeneral.emit('tournament:private:update', tournament)
}
