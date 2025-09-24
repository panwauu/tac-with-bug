import type pg from 'pg'

export interface LeaderBoardType {
  username: string[]
  wins: number[]
  winshare: string[]
  nPlayers: number
}
export async function queryLeaderboardByWins(sqlClient: pg.Pool, limit: number, offset: number, startDate: Date, endDate: Date): Promise<LeaderBoardType> {
  const query = `
    SELECT users.username, t2.wins, t2.ngames, t2.full_count FROM (
        SELECT userid, SUM(t.win) as wins, SUM(t.ngames) as ngames, count(*) OVER() AS full_count FROM (
            SELECT 
                userid, 
                CASE 
                  WHEN games.game->'teams'->0 @> to_jsonb(player_index) AND (games.game->'winningTeams'->0)::BOOLEAN THEN 1 
                  WHEN games.game->'teams'->1 @> to_jsonb(player_index) AND (games.game->'winningTeams'->1)::BOOLEAN THEN 1
                  WHEN games.game->'teams'->2 @> to_jsonb(player_index) AND (games.game->'winningTeams'->2)::BOOLEAN THEN 1
                  ELSE 0
                END as win,
                1 as ngames
            FROM users_to_games LEFT JOIN games ON games.id = users_to_games.gameid
            WHERE games.running=FALSE AND (games.game->'gameEnded')::BOOLEAN=TRUE AND (games.game->'coop')::BOOLEAN=FALSE AND games.created >= $3 AND games.created <= $4
        ) as t GROUP BY userid ORDER BY wins DESC, userid LIMIT $1 OFFSET $2
    ) as t2 LEFT JOIN users ON users.id = t2.userid ORDER BY t2.wins DESC, t2.userid;`
  const dbRes = await sqlClient.query(query, [limit, offset, startDate, endDate])

  return {
    username: dbRes.rows.map((row: any) => row.username),
    wins: dbRes.rows.map((row: any) => row.wins),
    winshare: dbRes.rows.map((row: any) => ((Number.parseInt(row.wins) * 100) / Number.parseInt(row.ngames)).toFixed(2)),
    nPlayers: dbRes.rowCount === 0 ? 0 : dbRes.rows?.[0].full_count,
  }
}

export interface CoopBoardType {
  nGames: number
  team: string[][]
  count: number[]
  lastplayed: number[]
}
export async function queryLeaderboardCoop(sqlClient: pg.Pool, limit: number, offset: number, nPlayers: number, startDate: Date, endDate: Date): Promise<CoopBoardType> {
  const query = `
    SELECT games.id, max(games.cards) as cards, array_agg(users.username) as team, max(games.lastplayed) as lastplayed, max(games.full_count) as full_count FROM (
        SELECT 
            id, 
            lastplayed, 
            count(*) OVER() AS full_count, 
            CAST(
                (SELECT SUM(cards) FROM (SELECT CAST(jsonb_extract_path(value, 'cards', 'total', '0') AS INTEGER) as cards FROM jsonb_array_elements(game->'statistic')) as tcards
            ) as INTEGER) as cards 
        FROM games 
        WHERE CAST(game->>'coop' AS BOOLEAN) = true AND games.running=FALSE AND CAST(game->>'gameEnded' AS BOOLEAN) = true AND n_players = $3 AND created >= $4 AND created <= $5
        ORDER BY cards LIMIT $1 OFFSET $2
    ) as games
    LEFT JOIN users_to_games ON users_to_games.gameid = games.id
    LEFT JOIN users ON users_to_games.userid = users.id
    GROUP BY games.id ORDER BY cards, lastplayed;`
  const dbRes = await sqlClient.query(query, [limit, offset, nPlayers, startDate, endDate])

  return {
    nGames: dbRes.rowCount === 0 ? 0 : dbRes.rows?.[0].full_count,
    team: dbRes.rows.map((row: any) => row.team),
    count: dbRes.rows.map((row: any) => row.cards),
    lastplayed: dbRes.rows.map((row: any) => Date.parse(row.lastplayed)),
  }
}
