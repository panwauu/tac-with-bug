CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username varchar(20) UNIQUE,
  email varchar(255) UNIQUE,
  password varchar(255) NOT NULL,
  registered timestamptz NOT NULL DEFAULT current_timestamp,
  lastlogin timestamptz NOT NULL DEFAULT current_timestamp,
  activated boolean NOT NULL DEFAULT false,
  token varchar(50) NOT NULL,
  profilepic bytea,
  tutorial JSONB NOT NULL DEFAULT '[[false,false,false,false,false,false,false,false,false,false,false]]' :: jsonb,
  CONSTRAINT tutorialCheck CHECK (
    jsonb_typeof(tutorial) = 'array'
    AND jsonb_array_length(tutorial) = 1
    AND jsonb_typeof(tutorial -> 0) = 'array'
    AND jsonb_array_length(tutorial -> 0) = 11
  ),
  currentsubscription int,
  freelicense boolean NOT NULL DEFAULT false,
  locale VARCHAR(2) NOT NULL DEFAULT 'de',
  color_blindness_flag BOOLEAN NOT NULL DEFAULT false,
  admin BOOLEAN NOT NULL DEFAULT FALSE,
  game_default_position INTEGER [2] NOT NULL DEFAULT '{1, 0}',
  user_description VARCHAR(200) NOT NULL DEFAULT ''
);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  userid int NOT NULL REFERENCES users (id),
  subscriptionid varchar(40) NOT NULL UNIQUE,
  status varchar(20) NOT NULL CHECK(
    status = 'running'
    OR status = 'cancelled'
    OR status = 'expiring'
  ),
  validuntil timestamptz NOT NULL
);

ALTER TABLE
  users
ADD
  FOREIGN KEY (currentsubscription) REFERENCES subscriptions(id);

CREATE TABLE friendships(
  userid1 int NOT NULL REFERENCES users (id),
  userid2 int NOT NULL REFERENCES users (id) CHECK(userid1 < userid2),
  pending_user int REFERENCES users (id) CHECK(
    pending_user = userid1
    OR pending_user = userid2
  ),
  PRIMARY KEY (userid1, userid2),
  date timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE TABLE tournaments (
  id SERIAL PRIMARY KEY,
  title varchar(50) NOT NULL,
  status varchar(25) NOT NULL CHECK(
    status = 'signUpWaiting'
    OR status = 'signUp'
    OR status = 'signUpEnded'
    OR status = 'signUpFailed'
    OR status = 'running'
    OR status = 'ended'
  ),
  signup_begin timestamptz NOT NULL,
  signup_deadline timestamptz NOT NULL CHECK(signup_begin < signup_deadline),
  creation_dates timestamptz [] NOT NULL,
  creation_phase INTEGER NOT NULL DEFAULT 1,
  time_per_game interval NOT NULL,
  n_teams INTEGER NOT NULL,
  players_per_team INTEGER NOT NULL CHECK(
    players_per_team = 2
    OR players_per_team = 3
  ) DEFAULT 2,
  teams_per_match INTEGER NOT NULL CHECK(
    teams_per_match = 2
    OR teams_per_match = 3
  ) DEFAULT 2,
  tournament_type varchar(50) NOT NULL CHECK(tournament_type = 'KO') DEFAULT 'KO',
  data JSON
);

CREATE TABLE users_to_tournaments (
  userid INTEGER NOT NULL REFERENCES users (id),
  tournamentid INTEGER NOT NULL REFERENCES tournaments (id),
  UNIQUE (userid, tournamentid),
  team_number INTEGER NOT NULL,
  team_name varchar(50) NOT NULL
);

CREATE type users_to_tournaments_type AS (
  userid INT,
  tournamentid INT,
  team_number INT,
  team_name varchar(50)
);

CREATE TABLE tournaments_register (
  userid INTEGER NOT NULL REFERENCES users (id),
  tournamentid INTEGER NOT NULL REFERENCES tournaments (id),
  team_name varchar(50) NOT NULL,
  activated Boolean DEFAULT(false)
);

CREATE TABLE private_tournaments (
  id SERIAL PRIMARY KEY,
  title varchar(50) NOT NULL,
  status varchar(25) NOT NULL CHECK(
    (
      status = ANY(ARRAY ['planned', 'running', 'ended', 'aborted'])
    )
  ) DEFAULT 'planned',
  admin_player INTEGER NOT NULL REFERENCES users (id),
  n_teams INTEGER NOT NULL,
  players_per_team INTEGER NOT NULL CHECK(players_per_team IN (2, 3)) DEFAULT 2,
  teams_per_match INTEGER NOT NULL CHECK(teams_per_match IN (2, 3)) DEFAULT 2,
  tournament_type varchar(50) NOT NULL CHECK(tournament_type = 'KO') DEFAULT 'KO',
  created timestamptz NOT NULL DEFAULT current_timestamp,
  data JSON
);

CREATE TABLE users_to_private_tournaments (
  userid INTEGER NOT NULL REFERENCES users (id),
  tournamentid INTEGER NOT NULL REFERENCES private_tournaments (id),
  UNIQUE (userid, tournamentid),
  team_number INTEGER NOT NULL,
  team_name varchar(50) NOT NULL
);

CREATE TABLE private_tournaments_register (
  userid INTEGER NOT NULL REFERENCES users (id),
  tournamentid INTEGER NOT NULL REFERENCES private_tournaments (id),
  UNIQUE (userid, tournamentid),
  team_name varchar(50) NOT NULL,
  activated Boolean DEFAULT(false)
);

CREATE SEQUENCE game_id_seq;

CREATE TABLE games (
  id INT PRIMARY KEY DEFAULT nextval('game_id_seq'),
  running BOOLEAN NOT NULL DEFAULT TRUE,
  n_players int NOT NULL CHECK (
    n_players = 4
    OR n_players = 6
  ),
  n_teams int NOT NULL CHECK(
    n_teams = 2
    OR (
      n_teams = 3
      AND n_players = 6
    )
  ),
  created timestamptz NOT NULL DEFAULT current_timestamp,
  lastPlayed timestamptz NOT NULL DEFAULT current_timestamp,
  game jsonb NOT NULL,
  public_tournament_id INT REFERENCES tournaments(id),
  private_tournament_id INT REFERENCES private_tournaments(id),
  CONSTRAINT only_one_tournament CHECK(
    public_tournament_id IS NULL
    OR private_tournament_id IS NULL
  ),
  rematch_open BOOLEAN NOT NULL DEFAULT FALSE,
  colors json
);

CREATE TABLE users_to_games (
  id SERIAL PRIMARY KEY,
  userid INT NOT NULL REFERENCES users(id),
  gameid INT NOT NULL REFERENCES games(id),
  player_index INT NOT NULL CHECK (player_index >= 0),
  CONSTRAINT unique_game_user_combination UNIQUE(userid, gameid),
  CONSTRAINT unique_game_player_index_combination UNIQUE(gameid, player_index)
);

CREATE TABLE saveGames (
  id SERIAL PRIMARY KEY,
  gameid INT NOT NULL,
  game jsonb NOT NULL
);

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
  adminPlayer INT NOT NULL REFERENCES users (id),
  player0 INT REFERENCES users (id) CHECK(
    player0 IS NULL
    OR (
      player0 != player1
      AND player0 != player2
      AND player0 != player3
      AND player0 != player4
      AND player0 != player5
    )
  ),
  player1 INT REFERENCES users (id) CHECK(
    player1 IS NULL
    OR (
      player1 != player0
      AND player1 != player2
      AND player1 != player3
      AND player1 != player4
      AND player1 != player5
    )
  ),
  player2 INT REFERENCES users (id) CHECK(
    player2 IS NULL
    OR (
      player2 != player0
      AND player2 != player1
      AND player2 != player3
      AND player2 != player4
      AND player2 != player5
    )
  ),
  player3 INT REFERENCES users (id) CHECK(
    player3 IS NULL
    OR (
      player3 != player0
      AND player3 != player1
      AND player3 != player2
      AND player3 != player4
      AND player3 != player5
    )
  ),
  player4 INT REFERENCES users (id) CHECK(
    player4 IS NULL
    OR (
      player4 != player0
      AND player4 != player1
      AND player4 != player2
      AND player4 != player3
      AND player4 != player5
      AND nPlayers = 6
    )
  ),
  player5 INT REFERENCES users (id) CHECK(
    player5 IS NULL
    OR (
      player5 != player0
      AND player5 != player1
      AND player5 != player2
      AND player5 != player3
      AND player5 != player4
      AND nPlayers = 6
    )
  ),
  balls0 varchar(30) CHECK (
    (
      balls0 IS NULL
      AND player0 IS NULL
    )
    OR (
      balls0 IS NOT NULL
      AND player0 IS NOT NULL
      AND balls0 != balls1
      AND balls0 != balls2
      AND balls0 != balls3
      AND balls0 != balls4
      AND balls0 != balls5
    )
  ),
  balls1 varchar(30) CHECK (
    (
      balls1 IS NULL
      AND player1 IS NULL
    )
    OR (
      balls1 IS NOT NULL
      AND player1 IS NOT NULL
      AND balls1 != balls0
      AND balls1 != balls2
      AND balls1 != balls3
      AND balls1 != balls4
      AND balls1 != balls5
    )
  ),
  balls2 varchar(30) CHECK (
    (
      balls2 IS NULL
      AND player2 IS NULL
    )
    OR (
      balls2 IS NOT NULL
      AND player2 IS NOT NULL
      AND balls2 != balls0
      AND balls2 != balls1
      AND balls2 != balls3
      AND balls2 != balls4
      AND balls2 != balls5
    )
  ),
  balls3 varchar(30) CHECK (
    (
      balls3 IS NULL
      AND player3 IS NULL
    )
    OR (
      balls3 IS NOT NULL
      AND player3 IS NOT NULL
      AND balls3 != balls0
      AND balls3 != balls1
      AND balls3 != balls2
      AND balls3 != balls4
      AND balls3 != balls5
    )
  ),
  balls4 varchar(30) CHECK (
    (
      balls4 IS NULL
      AND player4 IS NULL
    )
    OR (
      balls4 IS NOT NULL
      AND player4 IS NOT NULL
      AND balls4 != balls0
      AND balls4 != balls1
      AND balls4 != balls2
      AND balls4 != balls3
      AND balls4 != balls5
      AND nPlayers = 6
    )
  ),
  balls5 varchar(30) CHECK (
    (
      balls5 IS NULL
      AND player5 IS NULL
    )
    OR (
      balls5 IS NOT NULL
      AND player5 IS NOT NULL
      AND balls5 != balls0
      AND balls5 != balls1
      AND balls5 != balls2
      AND balls5 != balls3
      AND balls5 != balls4
      AND nPlayers = 6
    )
  ),
  ready0 boolean NOT NULL DEFAULT false CHECK(
    ready0 = false
    OR (
      ready0 = true
      AND player0 IS NOT NULL
    )
  ),
  ready1 boolean NOT NULL DEFAULT false CHECK(
    ready1 = false
    OR (
      ready1 = true
      AND player1 IS NOT NULL
    )
  ),
  ready2 boolean NOT NULL DEFAULT false CHECK(
    ready2 = false
    OR (
      ready2 = true
      AND player2 IS NOT NULL
    )
  ),
  ready3 boolean NOT NULL DEFAULT false CHECK(
    ready3 = false
    OR (
      ready3 = true
      AND player3 IS NOT NULL
    )
  ),
  ready4 boolean NOT NULL DEFAULT false CHECK(
    ready4 = false
    OR (
      ready4 = true
      AND player4 IS NOT NULL
    )
  ),
  ready5 boolean NOT NULL DEFAULT false CHECK(
    ready5 = false
    OR (
      ready5 = true
      AND player5 IS NOT NULL
    )
  )
);

CREATE TABLE tutorials (id int PRIMARY KEY, data JSONB);

CREATE TABLE hof (
  id SERIAL PRIMARY KEY,
  userid INT NOT NULL REFERENCES users (id),
  status VARCHAR(20) NOT NULL CHECK(
    status = 'verlag'
    OR status = 'spende'
    OR status = 'translation'
    OR status = 'family'
  )
);

CREATE TABLE user_agent_data (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  counter INT NOT NULL DEFAULT(1)
);

CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  group_chat Boolean DEFAULT(false),
  group_name VARCHAR(25),
  created timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  sender INTEGER REFERENCES users (id) ON DELETE SET NULL,
  chatid INTEGER NOT NULL REFERENCES chats (id),
  body TEXT NOT NULL,
  created timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE TABLE users_to_chats (
  id SERIAL PRIMARY KEY,
  userid INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  chatid INTEGER NOT NULL REFERENCES chats (id),
  UNIQUE (userid, chatid)
);

CREATE TABLE chat_messages_unread (
  id SERIAL PRIMARY KEY,
  messageid INTEGER NOT NULL REFERENCES chat_messages (id) ON DELETE CASCADE,
  users_to_chats_id INTEGER NOT NULL REFERENCES users_to_chats (id) ON DELETE CASCADE
);

CREATE TABLE channel_messages (
  id SERIAL PRIMARY KEY,
  channel VARCHAR(25) NOT NULL,
  sender INTEGER REFERENCES users (id) ON DELETE
  SET
    NULL,
    body TEXT NOT NULL,
    created timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE TABLE logs (
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    meta JSONB,
    timestamp timestamptz NOT NULL DEFAULT current_timestamp
);
