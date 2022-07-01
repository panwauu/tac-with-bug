import pg from 'pg';
import events from 'events'
import * as tTournament from '../../../shared/types/typesTournament';

import { getPublicTournament } from './tournamentsPublic';

export const tournamentBus = new events.EventEmitter();

export async function getLastTournamentWinners(sqlClient: pg.Pool) {
    const dbResult: pg.QueryResult<{ placement: number, username: string, team_name: string }> = await sqlClient.query(`
    SELECT username, placement, team_name FROM (
        SELECT
            CASE WHEN (data->'brackets'->-1->0->>'winner')::int = team_number THEN 1 ELSE
                CASE WHEN (data->'brackets'->-1->0->'teams')::jsonb @> array_to_json(ARRAY[team_number])::jsonb THEN 2 ELSE 
                    CASE WHEN (data->'brackets'->-1->1->>'winner')::int = team_number THEN 3 ELSE 0 END
                END
            END as placement, 
            userid, team_name FROM users_to_tournaments 
        JOIN 
            (SELECT * FROM tournaments WHERE status='ended' ORDER BY id DESC LIMIT 1) as tournaments 
        ON users_to_tournaments.tournamentid=tournaments.id
    ) as t JOIN users ON users.id = t.userid WHERE t.placement > 0;`);

    const res: tTournament.lastTournamentWinners = [];
    dbResult.rows.forEach((r) => {
        const index = res.findIndex((resRow) => resRow.placement === r.placement)
        if (index === -1) { res.push({ placement: r.placement, teamName: r.team_name, players: [r.username] }) }
        else { res[index].players.push(r.username) }
    })

    return res.sort((a, b) => a.placement - b.placement)
}

export async function getTournamentParticipations(sqlClient: pg.Pool, username: string): Promise<tTournament.tournamentParticipation[]> {
    const result: tTournament.tournamentParticipation[] = []
    const tournaments = await getPublicTournament(sqlClient, { status: 'ended' })

    for (let i = 0; i < tournaments.length; i++) {
        const tournament = tournaments[i]
        const teamIndex = tournament.teams.findIndex((team) => team.players.includes(username))
        if (teamIndex === -1) { continue }

        const indexOfFirstNotParticipatingRound = tournament.data.brackets.findIndex((round) => !round.some((match) => match.teams.includes(teamIndex)))
        const exitRound = indexOfFirstNotParticipatingRound === -1 ? tournament.data.brackets.length : indexOfFirstNotParticipatingRound

        let placement: number | undefined = undefined;
        const finalMatch = tournament.data.brackets[tournament.data.brackets.length - 1][0]
        const smallfinalMatch = tournament.data.brackets[tournament.data.brackets.length - 1][1]
        if (finalMatch.teams.includes(teamIndex)) { placement = finalMatch.winner === teamIndex ? 1 : 2 }
        if (smallfinalMatch.teams.includes(teamIndex)) { placement = smallfinalMatch.winner === teamIndex ? 3 : 4 }

        result.push({
            id: tournament.id,
            title: tournament.title,
            date: tournament.creationDates[0],
            team: tournament.teams[teamIndex],
            exitRound: exitRound,
            totalRounds: tournament.data.brackets.length,
            placement: placement
        })
    }

    return result.sort((a, b) => { return Date.parse(a.date) - Date.parse(b.date) < 0 ? -1 : 1 })
}

export async function lazyLoadTournamentsTable(pgPool: pg.Pool, userID: number | undefined, limit: number, offset: number, filter: 'private' | 'public' | null): Promise<tTournament.tournamentTableData> {
    const typesToShow = ['private', 'public'].filter((e) => filter == null || e == filter)

    const dbRes = await pgPool.query(`
    SELECT *, (count(*) OVER())::INT AS total_count FROM
    (
        SELECT id, 'public' as type, status, title, creation_dates[1] as date FROM tournaments
        UNION
        SELECT id, 'private' as type, status, title, created as date FROM private_tournaments WHERE private_tournaments.admin_player = $3
        UNION
        SELECT private_tournaments.id, 'private' as type, private_tournaments.status, private_tournaments.title, private_tournaments.created as date FROM private_tournaments 
            JOIN private_tournaments_register ON private_tournaments_register.tournamentid = private_tournaments.id
            WHERE private_tournaments_register.userid = $3
        UNION
        SELECT private_tournaments.id, 'private' as type, private_tournaments.status, private_tournaments.title, private_tournaments.created as date FROM private_tournaments 
            JOIN users_to_private_tournaments ON users_to_private_tournaments.tournamentid = private_tournaments.id
            WHERE users_to_private_tournaments.userid = $3
    ) as tournaments
    WHERE tournaments.type = ANY($4::TEXT[])
    ORDER BY tournaments.date DESC LIMIT $1 OFFSET $2;
    `, [limit, offset, userID ?? -1, typesToShow])

    return {
        total: dbRes.rows[0].total_count,
        tournaments: dbRes.rows.map((r) => {
            return {
                id: r.id,
                type: r.type,
                status: r.status,
                title: r.title,
                date: new Date(r.date).getTime()
            }
        })
    }
}
