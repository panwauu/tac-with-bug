ALTER TABLE
    users DROP COLUMN freelicense;

ALTER TABLE
    games
ADD
    COLUMN bots INT ARRAY [6] NOT NULL DEFAULT '{NULL,NULL,NULL,NULL,NULL,NULL}' CHECK (
        (
            (
                bots [1] IS NOT NULL
                AND public_tournament_id IS NULL
                AND private_tournament_id IS NULL
            )
            OR bots [1] IS NULL
        )
        AND (
            (
                bots [2] IS NOT NULL
                AND public_tournament_id IS NULL
                AND private_tournament_id IS NULL
            )
            OR bots [2] IS NULL
        )
        AND (
            (
                bots [3] IS NOT NULL
                AND public_tournament_id IS NULL
                AND private_tournament_id IS NULL
            )
            OR bots [3] IS NULL
        )
        AND (
            (
                bots [4] IS NOT NULL
                AND public_tournament_id IS NULL
                AND private_tournament_id IS NULL
            )
            OR bots [4] IS NULL
        )
        AND (
            (
                bots [5] IS NOT NULL
                AND public_tournament_id IS NULL
                AND private_tournament_id IS NULL
                AND n_players = 6
            )
            OR bots [5] IS NULL
        )
        AND (
            (
                bots [6] IS NOT NULL
                AND public_tournament_id IS NULL
                AND private_tournament_id IS NULL
                AND n_players = 6
            )
            OR bots [6] IS NULL
        )
    );

DROP TABLE waitingGames;

CREATE TABLE waitingGames (
    id SERIAL PRIMARY KEY,
    gameid INT,
    nPlayers INT NOT NULL CHECK(
        nPlayers = 4
        OR nPlayers = 6
    ),
    nTeams INT NOT NULL CHECK(
        nTeams = 1
        OR nTeams = 2
        OR (
            nTeams = 3
            AND nPlayers = 6
        )
    ),
    meister Boolean NOT NULL,
    private Boolean NOT NULL,
    adminPlayer INT NOT NULL REFERENCES users (id) CHECK (
        adminPlayer = player0
        OR adminPlayer = player1
        OR adminPlayer = player2
        OR adminPlayer = player3
        OR adminPlayer = player4
        OR adminPlayer = player5
    ),
    bots INT ARRAY [6] NOT NULL DEFAULT '{NULL,NULL,NULL,NULL,NULL,NULL}' CHECK (
        (
            bots [1] IS NULL
            OR (
                bots [1] IS NOT NULL
                AND player0 IS NULL
            )
        )
        AND (
            bots [2] IS NULL
            OR (
                bots [2] IS NOT NULL
                AND player1 IS NULL
            )
        )
        AND (
            bots [3] IS NULL
            OR (
                bots [3] IS NOT NULL
                AND player2 IS NULL
            )
        )
        AND (
            bots [4] IS NULL
            OR (
                bots [4] IS NOT NULL
                AND player3 IS NULL
            )
        )
        AND (
            bots [5] IS NULL
            OR (
                bots [5] IS NOT NULL
                AND player4 IS NULL
            )
        )
        AND (
            bots [6] IS NULL
            OR (
                bots [6] IS NOT NULL
                AND player5 IS NULL
            )
        )
    ),
    player0 INT REFERENCES users (id),
    player1 INT REFERENCES users (id),
    player2 INT REFERENCES users (id),
    player3 INT REFERENCES users (id),
    player4 INT REFERENCES users (id),
    player5 INT REFERENCES users (id),
    balls0 varchar(30) CHECK (
        (
            balls0 IS NULL
            AND player0 IS NULL
            AND bots [1] IS NULL
        )
        OR (
            balls0 IS NOT NULL
            AND bots [1] IS NOT NULL
        )
        OR (
            balls0 IS NOT NULL
            AND player0 IS NOT NULL
        )
    ),
    balls1 varchar(30) CHECK (
        (
            balls1 IS NULL
            AND player1 IS NULL
            AND bots [2] IS NULL
        )
        OR (
            balls1 IS NOT NULL
            AND bots [2] IS NOT NULL
        )
        OR (
            balls1 IS NOT NULL
            AND player1 IS NOT NULL
        )
    ),
    balls2 varchar(30) CHECK (
        (
            balls2 IS NULL
            AND player2 IS NULL
            AND bots [3] IS NULL
        )
        OR (
            balls2 IS NOT NULL
            AND bots [3] IS NOT NULL
        )
        OR (
            balls2 IS NOT NULL
            AND player2 IS NOT NULL
        )
    ),
    balls3 varchar(30) CHECK (
        (
            balls3 IS NULL
            AND player3 IS NULL
            AND bots [4] IS NULL
        )
        OR (
            balls3 IS NOT NULL
            AND bots [4] IS NOT NULL
        )
        OR (
            balls3 IS NOT NULL
            AND player3 IS NOT NULL
        )
    ),
    balls4 varchar(30) CHECK (
        (
            balls4 IS NULL
            AND player4 IS NULL
            AND bots [5] IS NULL
        )
        OR (
            balls4 IS NOT NULL
            AND bots [5] IS NOT NULL
        )
        OR (
            balls4 IS NOT NULL
            AND player4 IS NOT NULL
        )
    ),
    balls5 varchar(30) CHECK (
        (
            balls5 IS NULL
            AND player5 IS NULL
            AND bots [6] IS NULL
        )
        OR (
            balls5 IS NOT NULL
            AND bots [6] IS NOT NULL
        )
        OR (
            balls5 IS NOT NULL
            AND player5 IS NOT NULL
        )
    ),
    ready0 boolean NOT NULL DEFAULT false CHECK(
        ready0 = false
        OR player0 IS NOT NULL
    ),
    ready1 boolean NOT NULL DEFAULT false CHECK(
        ready1 = false
        OR player1 IS NOT NULL
    ),
    ready2 boolean NOT NULL DEFAULT false CHECK(
        ready2 = false
        OR player2 IS NOT NULL
    ),
    ready3 boolean NOT NULL DEFAULT false CHECK(
        ready3 = false
        OR player3 IS NOT NULL
    ),
    ready4 boolean NOT NULL DEFAULT false CHECK(
        ready4 = false
        OR player4 IS NOT NULL
    ),
    ready5 boolean NOT NULL DEFAULT false CHECK(
        ready5 = false
        OR player5 IS NOT NULL
    ),
    CONSTRAINT unique_players CHECK (
        (
            player0 IS NULL
            OR (
                player0 != player1
                AND player0 != player2
                AND player0 != player3
                AND player0 != player4
                AND player0 != player5
            )
        )
        AND (
            player1 IS NULL
            OR (
                player1 != player0
                AND player1 != player2
                AND player1 != player3
                AND player1 != player4
                AND player1 != player5
            )
        )
        AND (
            player2 IS NULL
            OR (
                player2 != player0
                AND player2 != player1
                AND player2 != player3
                AND player2 != player4
                AND player2 != player5
            )
        )
        AND (
            player3 IS NULL
            OR (
                player3 != player0
                AND player3 != player1
                AND player3 != player2
                AND player3 != player4
                AND player3 != player5
            )
        )
        AND (
            player4 IS NULL
            OR (
                player4 != player0
                AND player4 != player1
                AND player4 != player2
                AND player4 != player3
                AND player4 != player5
            )
        )
        AND (
            player5 IS NULL
            OR (
                player5 != player0
                AND player5 != player1
                AND player5 != player2
                AND player5 != player3
                AND player5 != player4
            )
        )
    ),
    CONSTRAINT unique_balls CHECK (
        (
            balls0 IS NULL
            OR (
                balls0 != balls1
                AND balls0 != balls2
                AND balls0 != balls3
                AND balls0 != balls4
                AND balls0 != balls5
            )
        )
        AND (
            balls1 IS NULL
            OR (
                balls1 != balls0
                AND balls1 != balls2
                AND balls1 != balls3
                AND balls1 != balls4
                AND balls1 != balls5
            )
        )
        AND (
            balls2 IS NULL
            OR (
                balls2 != balls0
                AND balls2 != balls1
                AND balls2 != balls3
                AND balls2 != balls4
                AND balls2 != balls5
            )
        )
        AND (
            balls3 IS NULL
            OR (
                balls3 != balls0
                AND balls3 != balls1
                AND balls3 != balls2
                AND balls3 != balls4
                AND balls3 != balls5
            )
        )
        AND (
            balls4 IS NULL
            OR (
                balls4 != balls0
                AND balls4 != balls1
                AND balls4 != balls2
                AND balls4 != balls3
                AND balls4 != balls5
            )
        )
        AND (
            balls5 IS NULL
            OR (
                balls5 != balls0
                AND balls5 != balls1
                AND balls5 != balls2
                AND balls5 != balls3
                AND balls5 != balls4
            )
        )
    ),
    CONSTRAINT correct_number_of_players CHECK(
        nPlayers = 6
        OR (
            nPlayers = 4
            AND player4 IS NULL
            AND player5 IS NULL
            AND balls4 IS NULL
            AND balls5 IS NULL
            AND ready4 = false
            AND ready5 = false
            AND bots [5] IS NULL
            AND bots [6] IS NULL
        )
    )
);