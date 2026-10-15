import type pg from 'pg'

export interface LeaderBoardType {
  username: string[]
  wins: number[]
  winshare: string[]
  nPlayers: number
}
export async function queryLeaderboardByWins(sqlClient: pg.Pool, limit: number, offset: number, startDate: Date, endDate: Date): Promise<LeaderBoardType> {
  // Read from game_results (one short row per finished game, see init_db_tac.sql), never from the game JSON.
  // A player wins a game if the seat is in winning_seats; substitutes who left keep a seat beyond the players.
  const query = `
    SELECT users.username, t2.wins, t2.ngames, t2.full_count FROM (
        SELECT userid, SUM(t.win) as wins, SUM(t.ngames) as ngames, count(*) OVER() AS full_count FROM (
            SELECT
                users_to_games.userid,
                CASE WHEN users_to_games.player_index = ANY (game_results.winning_seats) THEN 1 ELSE 0 END as win,
                1 as ngames
            FROM game_results JOIN users_to_games ON users_to_games.gameid = game_results.gameid
            WHERE game_results.coop = FALSE AND game_results.created >= $3 AND game_results.created <= $4
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
  // Read from game_results (cards = sum of the cards of all players, see init_db_tac.sql), never from the game JSON.
  // Equal cards are ordered by the last move and then by game id, so that every page is well defined.
  const query = `
    SELECT games.id, max(games.cards) as cards, array_agg(users.username ORDER BY users_to_games.player_index) as team, max(games.lastplayed) as lastplayed, max(games.full_count) as full_count FROM (
        SELECT gameid AS id, lastplayed, cards, count(*) OVER() AS full_count
        FROM game_results
        WHERE coop = TRUE AND n_players = $3 AND created >= $4 AND created <= $5
        ORDER BY cards, lastplayed, gameid LIMIT $1 OFFSET $2
    ) as games
    LEFT JOIN users_to_games ON users_to_games.gameid = games.id
    LEFT JOIN users ON users_to_games.userid = users.id
    GROUP BY games.id ORDER BY cards, lastplayed, games.id;`
  const dbRes = await sqlClient.query(query, [limit, offset, nPlayers, startDate, endDate])

  return {
    nGames: dbRes.rowCount === 0 ? 0 : dbRes.rows?.[0].full_count,
    team: dbRes.rows.map((row: any) => row.team),
    count: dbRes.rows.map((row: any) => row.cards),
    lastplayed: dbRes.rows.map((row: any) => Date.parse(row.lastplayed)),
  }
}
