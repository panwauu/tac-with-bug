import pg from 'pg';

import schedule from 'node-schedule';

import logger from '../helpers/logger';
import { endNotProperlyEndedGames, abortNotEndedGames, disableRematchOfOldGames, getGame } from '../services/game'
import { getPublicTournament, startTournament, startTournamentRound, checkForceGameEnd } from './tournamentsPublic'
import { startSignUpOnCondition, endSignUpOnCondition } from './tournamentsRegister'
import { publicTournament } from '../../../shared/types/typesTournament';
import { sendUpdatesOfGameToPlayers } from '../socket/game';

const jobs: schedule.Job[] = []

export async function registerJobs(sqlClient: pg.Pool) {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
        jobs.push(schedule.scheduleJob({ rule: '0 * * * * *', tz: 'Europe/Berlin' }, () => { removeDoneJobs() }))
        jobs.push(schedule.scheduleJob({ rule: '0 0 0 * * *', tz: 'Europe/Berlin' }, async () => { await DeleteUnactivatedUsers(sqlClient) }))
        jobs.push(schedule.scheduleJob({ rule: '0 * * * * *', tz: 'Europe/Berlin' }, async () => {
            await abortNotEndedGames(sqlClient)
            await endNotProperlyEndedGames(sqlClient)
        }))
        jobs.push(schedule.scheduleJob({ rule: '*/5 * * * * *', tz: 'Europe/Berlin' }, async () => {
            logger.info('disable Rematches')
            const ids = await disableRematchOfOldGames(sqlClient)
            for (const id of ids) {
                const game = await getGame(sqlClient, id)
                sendUpdatesOfGameToPlayers(game)
            }
        }))

        await registerTournamentJobs(sqlClient)
        removeDoneJobs()
    }
}

function removeDoneJobs() {
    for (let i = jobs.length - 1; i >= 0; i--) { if (jobs[i] === null) { jobs.splice(i, 1) } }
}

async function DeleteUnactivatedUsers(sqlClient: pg.Pool) {
    await sqlClient.query('DELETE FROM users WHERE activated=false AND current_timestamp - lastlogin > interval \'1 week\';')
}

async function registerTournamentJobs(sqlClient: pg.Pool) {
    const tournaments = await getPublicTournament(sqlClient);
    tournaments.forEach((t) => { registerJobsForOneTournament(sqlClient, t) })

    // Execute all jobs once in case they passed during the job registration and are now in the past
    await startSignUpOnCondition(sqlClient)
    await endSignUpOnCondition(sqlClient)
    await startTournament(sqlClient)
    await startTournamentRound(sqlClient)
    await checkForceGameEnd(sqlClient)
}

const tournamentTimeOffset = 100;

export function registerJobsForOneTournament(sqlClient: pg.Pool, tournament: publicTournament) {
    if (process.env.NODE_ENV === 'test') { return; }

    jobs.push(schedule.scheduleJob(new Date(new Date(tournament.signupBegin).getTime() + tournamentTimeOffset), async () => {
        await startSignUpOnCondition(sqlClient)
    }))

    jobs.push(schedule.scheduleJob(new Date(new Date(tournament.signupDeadline).getTime() + tournamentTimeOffset), async () => {
        await endSignUpOnCondition(sqlClient)
    }))

    const timePerGameInMS = timePerGameToMS(tournament.timePerGame)

    tournament.creationDates.forEach((date, i) => {
        if (i === 0) {
            jobs.push(schedule.scheduleJob(new Date(new Date(date).getTime() + tournamentTimeOffset), async () => {
                await startTournament(sqlClient)
            }))
        } else {
            jobs.push(schedule.scheduleJob(new Date(new Date(date).getTime() + tournamentTimeOffset), async () => {
                await startTournamentRound(sqlClient)
            }))
        }

        jobs.push(schedule.scheduleJob(new Date(new Date(date).getTime() + timePerGameInMS + tournamentTimeOffset), async () => {
            await checkForceGameEnd(sqlClient)
        }))
    })
}

function timePerGameToMS(timePerGame: string) {
    if (timePerGame.length !== 5 || timePerGame.substring(2, 3) !== ':') { throw new Error('Invalid interval format') }
    return (parseInt(timePerGame.substring(3, 5)) + parseInt(timePerGame.substring(0, 2)) * 60) * 60 * 1000
}
