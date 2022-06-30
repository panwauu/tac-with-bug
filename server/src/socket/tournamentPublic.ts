import type pg from 'pg';
import type { GeneralNamespace, GeneralSocketS } from '../../../shared/types/GeneralNamespaceDefinition';
import * as tTournament from '../../../shared/types/typesTournament';
import Joi from 'joi';

import logger from '../helpers/logger';
import { getPublicTournamentByID, getCurrentPublicTournament } from '../services/tournamentsPublic';
import { tournamentBus } from '../services/tournaments';
import { registerTeam, joinTeam, leaveTournament, activateUser } from '../services/tournamentsRegister';
import { generateIcal } from '../communicationUtils/icalGenerator';
import { sendTournamentInvitation, sendTournamentReminder } from '../communicationUtils/email';
import { getUser } from '../services/user';
import { nspGeneral as nsp } from './general';

export async function registerTournamentPublicHandler(pgPool: pg.Pool, socket: GeneralSocketS) {
    socket.on('tournament:public:get', async (data, callback) => {
        const { error } = Joi.number().required().positive().integer().validate(data.id);
        if (error != null) { return callback({ status: 500, error: error }) }

        const tournament = await getPublicTournamentByID(pgPool, data.id)
        if (tournament.isErr()) { return callback({ status: 500, error: tournament.error }) }
        return callback({ status: 200, data: tournament.value });
    })

    socket.on('tournament:public:get-current', async (callback) => {
        const tournament = await getCurrentPublicTournament(pgPool)
        return callback({ status: 200, data: tournament });
    })

    socket.on('tournament:public:registerTeam', async (data) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (tournament:registerTeam)', { stack: new Error().stack }); return }

        const schema = Joi.object({
            tournamentID: Joi.number().required().integer().positive(),
            name: Joi.string().required().min(5).max(25),
            players: Joi.array().items(Joi.string().required()),
        });
        const { error } = schema.validate(data);
        if (error != null) { logger.error('JOI Error', error); return }

        try {
            const user = await getUser(pgPool, { id: socket.data.userID })
            if (user.isErr()) { return }

            const registerTeamResult = await registerTeam(pgPool, data.tournamentID, data.players, data.name, socket.data.userID)
            if (registerTeamResult.isErr()) { logger.error(registerTeamResult.error); return }
            const tournament = registerTeamResult.value
            pushChangedPublicTournament(tournament)

            sendMailToUnactivatedPlayer(pgPool, data.players, data.name, user.value.username)

            const teamToRegister = tournament.registerTeams.find((r) => r.playerids.includes(user.value.id))
            if (teamToRegister === undefined) { logger.error('Cannot find registerTeam for event Handler'); return }
            const dataForClient = { registerTeam: teamToRegister, tournamentTitle: tournament.title, player: user.value.username }
            socket.emit('tournament:toast:you-created-a-team', dataForClient)
            getSocketsOfPlayerIDs(nsp, teamToRegister.playerids.filter((_, i) => teamToRegister.activated[i] === false)).forEach((s) => s.emit('tournament:toast:invited-to-a-team', dataForClient))
        } catch (err) {
            logger.error('Error in tournament:public:registerTeam', err)
        }
    });

    socket.on('tournament:public:joinTeam', async (data) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (tournament:joinTeam)', { stack: new Error().stack }); return }

        const schema = Joi.object({
            tournamentID: Joi.number().required().integer().positive(),
            teamName: Joi.string().required(),
        });
        const { error } = schema.validate(data);
        if (error != null) { return }

        try {
            const user = await getUser(pgPool, { id: socket.data.userID })
            if (user.isErr()) { return }

            const joinTeamResult = await joinTeam(pgPool, data.tournamentID, socket.data.userID, user.value.username, data.teamName)
            if (joinTeamResult.isErr()) { logger.error(joinTeamResult.error); return }
            const tournament = joinTeamResult.value
            pushChangedPublicTournament(tournament)

            const registerTeam = tournament.registerTeams.find((r) => r.playerids.includes(user.value.id))
            if (registerTeam != undefined) {
                const dataForClient = { registerTeam: registerTeam, tournamentTitle: tournament.title, player: user.value.username }
                if (registerTeam.activated.every((a) => a === true)) {
                    socket.emit('tournament:toast:you-joined-team-complete', dataForClient)
                    getSocketsOfPlayerIDs(nsp, registerTeam.playerids.filter((id) => id !== socket.data.userID)).forEach((s) => s.emit('tournament:toast:player-joined-team-complete', dataForClient))
                } else {
                    socket.emit('tournament:toast:you-joined-team-incomplete', dataForClient)
                    getSocketsOfPlayerIDs(nsp, registerTeam.playerids.filter((id) => id !== socket.data.userID)).forEach((s) => s.emit('tournament:toast:player-joined-team-incomplete', dataForClient))
                }
            }

            if (tournament.status === 'signUpEnded') {
                await sendInvitationToAll(pgPool, tournament)
                getSocketsOfPlayerIDs(nsp, tournament.teams.map((t) => t.playerids).flat()).forEach((s) => s.emit('tournament:toast:signUpEnded-you-partizipate', { tournamentTitle: tournament.title }))
                getSocketsOfPlayerIDs(nsp, tournament.registerTeams.map((t) => t.playerids).flat()).forEach((s) => s.emit('tournament:toast:signUpEnded-you-wont-partizipate', { tournamentTitle: tournament.title }))
            }
        } catch (err) {
            logger.error('Error in tournament:public:joinTeam', err)
        }
    });

    socket.on('tournament:public:activateUser', async (data) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (tournament:activateUser)', { stack: new Error().stack }); return }

        const { error } = Joi.number().required().positive().integer().validate(data.tournamentID);
        if (error != null) { return }

        try {
            const user = await getUser(pgPool, { id: socket.data.userID })
            if (user.isErr()) { return }

            const activateUserResult = await activateUser(pgPool, data.tournamentID, socket.data.userID)
            if (activateUserResult.isErr()) { logger.error(activateUserResult.error); return }
            const tournament = activateUserResult.value
            pushChangedPublicTournament(tournament)

            const registerTeam = tournament.registerTeams.find((r) => r.playerids.includes(user.value.id))
            if (registerTeam != undefined) {
                const dataForClient = { registerTeam: registerTeam, tournamentTitle: tournament.title, player: user.value.username }
                if (registerTeam.activated.every((a) => a === true)) {
                    socket.emit('tournament:toast:you-activated-complete', dataForClient)
                    getSocketsOfPlayerIDs(nsp, registerTeam.playerids.filter((id) => id !== socket.data.userID)).forEach((s) => s.emit('tournament:toast:player-activated-team-complete', dataForClient))
                } else {
                    socket.emit('tournament:toast:you-activated-incomplete', dataForClient)
                    getSocketsOfPlayerIDs(nsp, registerTeam.playerids.filter((id) => id !== socket.data.userID)).forEach((s) => s.emit('tournament:toast:player-activated-team-incomplete', dataForClient))
                }
            }

            if (tournament.status === 'signUpEnded') {
                await sendInvitationToAll(pgPool, tournament)
                getSocketsOfPlayerIDs(nsp, tournament.teams.map((t) => t.playerids).flat()).forEach((s) => s.emit('tournament:toast:signUpEnded-you-partizipate', { tournamentTitle: tournament.title }))
                getSocketsOfPlayerIDs(nsp, tournament.registerTeams.map((t) => t.playerids).flat()).forEach((s) => s.emit('tournament:toast:signUpEnded-you-wont-partizipate', { tournamentTitle: tournament.title }))
            }
        } catch (err) {
            logger.error('Error in tournament:public:activateUser', err)
        }
    });

    socket.on('tournament:public:leaveTournament', async (data) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (tournament:leaveTournament)', { stack: new Error().stack }); return }

        const { error } = Joi.number().required().positive().integer().validate(data.tournamentID);
        if (error != null) { return }

        try {
            const user = await getUser(pgPool, { id: socket.data.userID })
            if (user.isErr()) { return }

            const leaveTournamentResult = await leaveTournament(pgPool, data.tournamentID, socket.data.userID)
            if (leaveTournamentResult.isErr()) { logger.error(leaveTournamentResult.error); return }
            const { tournament, registerTeamForNotification } = leaveTournamentResult.value
            pushChangedPublicTournament(tournament)

            const dataForClient = { registerTeam: registerTeamForNotification, tournamentTitle: tournament.title, player: user.value.username }
            socket.emit('tournament:toast:you-left-tournament', dataForClient)
            getSocketsOfPlayerIDs(nsp, registerTeamForNotification.playerids).forEach((s) => s.emit('tournament:toast:partner-left-tournament', dataForClient))
        } catch (err) {
            logger.error('Error in tournament:public:leaveTournament', err)
        }
    });
}

export function pushChangedPublicTournament(tournament: tTournament.publicTournament) { nsp.emit('tournament:public:update', tournament) }

export async function registerTournamentBus() {
    tournamentBus.on('signUp-failed', async (data: { playerids: number[], tournamentTitle: string }) => {
        getSocketsOfPlayerIDs(nsp, data.playerids).forEach((s) => s.emit('tournament:toast:signUp-failed', { tournamentTitle: data.tournamentTitle }))
    })
    tournamentBus.on('signUpEnded-you-partizipate', async (data: { playerids: number[], tournamentTitle: string }) => {
        getSocketsOfPlayerIDs(nsp, data.playerids).forEach((s) => s.emit('tournament:toast:signUpEnded-you-partizipate', { tournamentTitle: data.tournamentTitle }))
    })
    tournamentBus.on('signUpEnded-you-wont-partizipate', async (data: { playerids: number[], tournamentTitle: string }) => {
        getSocketsOfPlayerIDs(nsp, data.playerids).forEach((s) => s.emit('tournament:toast:signUpEnded-you-wont-partizipate', { tournamentTitle: data.tournamentTitle }))
    })
    tournamentBus.on('started', async (data: { tournamentTitle: string }) => {
        nsp.emit('tournament:toast:started', { tournamentTitle: data.tournamentTitle })
    })
    tournamentBus.on('round-started', async (data: { tournamentTitle: string, roundsToFinal: number }) => {
        nsp.emit('tournament:toast:round-started', { tournamentTitle: data.tournamentTitle, roundsToFinal: data.roundsToFinal })
    })
    tournamentBus.on('round-ended', async (data: { tournamentTitle: string, roundsToFinal: number }) => {
        nsp.emit('tournament:toast:round-ended', { tournamentTitle: data.tournamentTitle, roundsToFinal: data.roundsToFinal })
    })
    tournamentBus.on('ended', async (data: { tournamentTitle: string, winner: tTournament.team }) => {
        nsp.emit('tournament:toast:ended', { tournamentTitle: data.tournamentTitle, winner: data.winner })
    })
}

function getSocketsOfPlayerIDs(nsp: GeneralNamespace, userIDs: number[]) {
    return [...nsp.sockets.values()].filter((s) => s.data.userID != undefined && userIDs.includes(s.data.userID))
}

async function sendMailToUnactivatedPlayer(sqlClient: pg.Pool, players: string[], teamName: string, username: string) {
    const playersForMail = players.filter((p) => p !== username)

    playersForMail.forEach(async (player) => {
        const user = await getUser(sqlClient, { username: player })
        if (user.isErr()) { throw new Error(user.error) }

        await sendTournamentInvitation({ user: user.value, invitingPlayer: username, tournamentTitle: '', teamName })
    })
}

export async function sendInvitationToAll(sqlClient: pg.Pool, tournament: tTournament.publicTournament) {
    const ical = generateIcal(tournament)

    const playerIDs = tournament.teams.map((t) => t.playerids).flat()
    for (const id of playerIDs) {
        const userDB = await getUser(sqlClient, { id: id })
        if (userDB.isErr()) { continue }
        await sendTournamentReminder({ user: userDB.value, tournament, ical })
    }
}
